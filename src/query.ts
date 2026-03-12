import { Env, ChunkRow, SourceCitation, PipelineStep, RequestMeta, UserContext } from "./types";
import type { Message } from "./session";

/** How many nearest-neighbour chunks to retrieve */
const TOP_K = 5;

/**
 * Query handler using SSE so each pipeline step streams to the client
 * as it completes, enabling real-time activity panel updates.
 */
export async function handleQuery(request: Request, env: Env, meta: RequestMeta, user: UserContext): Promise<Response> {
  const body = (await request.json()) as { question?: string; kb_id?: string };
  const question = body.question?.trim();
  const kbId = body.kb_id?.trim() || "kb_general";

  if (!question) {
    return Response.json({ success: false, error: "No question provided." }, { status: 400 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function send(event: string, data: unknown) {
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  }

  async function step<T>(service: string, title: string, detail: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    const result = await fn();
    send("step", { service, title, detail, durationMs: Math.round(performance.now() - t0) } satisfies PipelineStep);
    return result;
  }

  const pipeline = (async () => {
    try {
      const t0 = performance.now();

      // ── Step 1: Question sent to Worker ────────────────────────────
      send("meta", meta);
      send("step", { service: "Worker", title: `Request received at ${meta.colo} PoP`, detail: `Request handled by a serverless function at the nearest edge node.`, durationMs: Math.round(performance.now() - t0) });

      // ── Step 2: Session loaded from Durable Object ─────────────────
      // Each user×KB pair gets its own DO instance for isolated history.
      let history: Message[] = [];
      await step("Durable Object", "Load session state", "Conversation history loaded from a persistent, single-threaded session object.", async () => {
        const sessionName = `${user.userId}::${kbId}`;
        const doId = env.USER_SESSION.idFromName(sessionName);
        const session = env.USER_SESSION.get(doId);
        const res = await session.fetch("https://do/history");
        history = (await res.json()) as Message[];
      });

      // ── Step 3: Routed through AI Gateway ─────────────────────────
      send("step", { service: "AI Gateway", title: "Route AI request", detail: "AI request passed through CF AI Gateway for logging, caching, and rate limiting.", durationMs: 0 });

      // ── Step 3.5: Rewrite follow-up into standalone query ─────────
      // Follow-up questions like "what do you mean by that?" are too vague
      // to retrieve relevant chunks on their own. If there's prior history,
      // ask the LLM to expand the question into a self-contained retrieval query.
      // The original question is still used in the final answer prompt.
      let retrievalQuery = question;
      if (history.length > 0) {
        await step("Workers AI", "Rewrite follow-up for retrieval", "Follow-up question rewritten into a standalone query using conversation context so vector search finds the right documents.", async () => {
          const rewriteResult: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
            messages: [
              {
                role: "system",
                content: "Given the conversation history and a follow-up question, rewrite the follow-up into a fully self-contained question that includes all necessary context. Return ONLY the rewritten question — no explanation, no preamble, no quotes.",
              },
              ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
              {
                role: "user",
                content: `Follow-up question: ${question}\n\nRewritten standalone question:`,
              },
            ],
            max_tokens: 128,
          }, { gateway: { id: "rag-gateway" } });
          const rewritten = (rewriteResult.response ?? "").trim().replace(/^["']|["']$/g, "");
          if (rewritten.length > 5) retrievalQuery = rewritten;
        });
      }

      // ── Step 4: Question embedded by Workers AI ───────────────────
      let questionVector!: number[];
      await step("Workers AI", "Convert question to vector via CF AI", "Question text converted into a semantic search vector using bge-base-en-v1.5 on CF Workers AI.", async () => {
        const embeddingResult: any = await env.AI.run("@cf/baai/bge-base-en-v1.5" as any, { text: [retrievalQuery] }, { gateway: { id: "rag-gateway" } });
        questionVector = Array.from(embeddingResult.data[0] as number[]);
      });

      // ── Step 5: Semantic search in Vectorize ──────────────────────
      let rankedChunks: RankedChunk[] = [];

      const vecResult = await step("Vectorize", "Search CF vector database", "Question vector compared against all stored document vectors to find the most relevant content.", async () => {
        return tryVectorize(questionVector, kbId, env);
      });

      if (vecResult.length > 0) {
        rankedChunks = vecResult;
      } else {
        rankedChunks = await step("D1", "Search CF database (fallback)", "Cosine similarity computed directly across stored embeddings.", async () => {
          return d1CosineFallback(questionVector, kbId, env);
        });
      }

      if (rankedChunks.length === 0) {
        send("done", {
          success: true,
          answer: "I don't have any relevant information to answer that question. Please upload some documents first.",
          sources: [],
        });
        writer.close();
        return;
      }

      // ── Step 6: Chunk text fetched from D1 ────────────────────────
      send("step", { service: "D1", title: "Fetch source text from CF database", detail: `Full text of ${rankedChunks.length} matching chunk${rankedChunks.length > 1 ? "s" : ""} retrieved from CF D1 edge database.`, durationMs: 0 });

      // ── Step 7: Grounded answer generated (streamed token-by-token) ──
      const contextBlock = rankedChunks
        .map((r, i) => `[${i + 1}]\n${r.chunk.text}`)
        .join("\n\n---\n\n");

      const systemPrompt = `You are a helpful document assistant. Answer the user's question based ONLY on the provided context excerpts. Be concise and direct. Write naturally — do NOT mention filenames, chunk numbers, or "Source N" labels. When you use information from a specific excerpt, place a small inline citation like [1] or [2] immediately after that sentence. Do NOT add a References or Sources section at the end. If the context does not contain enough information, say so briefly.`;
      // Include the last few history turns so the LLM has conversational context
      const historyMessages = history.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const userPrompt = `Context:\n${contextBlock}\n\n---\n\nQuestion: ${question}`;

      let answer = "";
      await step("Workers AI", "Stream AI response at the edge", "Llama 3.1 8B streams the answer token-by-token from CF Workers AI back to the browser.", async () => {
        const llmStream: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1024,
          stream: true,
        }, { gateway: { id: "rag-gateway" } });

        // Workers AI returns a ReadableStream of SSE-formatted lines when stream:true
        const reader = (llmStream as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        let remainder = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Decode and split on newlines; keep any incomplete line as remainder
          const chunk = remainder + decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          remainder = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload) as { response?: string };
              if (parsed.response) {
                answer += parsed.response;
                send("token", { token: parsed.response });
              }
            } catch { /* incomplete JSON in this line, skip */ }
          }
        }

        if (!answer) answer = "Sorry, I could not generate an answer.";
      });

      // Persist the new exchange to the session DO (fire-and-forget is fine)
      const sessionName = `${user.userId}::${kbId}`;
      const doId = env.USER_SESSION.idFromName(sessionName);
      const session = env.USER_SESSION.get(doId);
      void session.fetch("https://do/message", { method: "POST", body: JSON.stringify({ role: "user", content: question }) });
      void session.fetch("https://do/message", { method: "POST", body: JSON.stringify({ role: "assistant", content: answer }) });

      // ── Step 8: Answer + sources returned ─────────────────────────
      send("step", { service: "Worker", title: "Return response to browser", detail: "Final answer and source citations sent back to the user.", durationMs: 0 });

      const sources: SourceCitation[] = rankedChunks.map((r) => ({
        document_id: r.chunk.document_id,
        filename: r.chunk.filename,
        chunk_index: r.chunk.chunk_index,
        text_snippet: r.chunk.text.slice(0, 200) + (r.chunk.text.length > 200 ? "…" : ""),
        score: r.score,
      }));

      send("done", { success: true, answer, sources });
    } catch (err) {
      send("error", { error: (err as Error).message ?? "Internal server error" });
    } finally {
      writer.close();
    }
  })();

  void pipeline;

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── Vectorize path ──────────────────────────────────────────────────────

interface RankedChunk {
  chunk: ChunkRow & { filename: string };
  score: number;
}

async function tryVectorize(
  questionVector: number[],
  kbId: string,
  env: Env,
): Promise<RankedChunk[]> {
  try {
    // Fetch extra matches so we still hit TOP_K after filtering by KB
    const vectorMatches = await env.VECTORIZE.query(questionVector, {
      topK: TOP_K * 3,
      returnMetadata: "all",
    });

    if (!vectorMatches.matches || vectorMatches.matches.length === 0) {
      return [];
    }

    const chunkIds = vectorMatches.matches.map((m) => m.id);
    const placeholders = chunkIds.map(() => "?").join(", ");

    // Filter by kb_id in the JOIN so results are scoped to the selected KB
    const chunkResults = await env.DB.prepare(
      `SELECT c.id, c.document_id, c.chunk_index, c.text, d.filename
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.id IN (${placeholders})
         AND d.kb_id = ?`,
    )
      .bind(...chunkIds, kbId)
      .all<ChunkRow & { filename: string }>();

    const chunkMap = new Map(chunkResults.results.map((r) => [r.id, r]));

    const ranked = vectorMatches.matches
      .map((m) => ({ chunk: chunkMap.get(m.id), score: m.score }))
      .filter((x) => x.chunk !== undefined) as RankedChunk[];

    // If all matches were orphaned, clean them up
    if (ranked.length === 0) {
      const orphanIds = vectorMatches.matches.map((m) => m.id);
      try { await env.VECTORIZE.deleteByIds(orphanIds); } catch (_) {}
    }

    return ranked;
  } catch {
    // Vectorize unavailable — fall through to D1 fallback
    return [];
  }
}

// ── D1 cosine-similarity fallback ───────────────────────────────────────

/**
 * Fetch ALL chunk embeddings from D1, compute cosine similarity in-Worker,
 * and return the top-K.  This is O(n) over all chunks but guarantees
 * immediate results for freshly uploaded documents.
 *
 * For small-to-medium corpora (< 10 000 chunks) this is fast enough.
 */
async function d1CosineFallback(
  questionVector: number[],
  kbId: string,
  env: Env,
): Promise<RankedChunk[]> {
  const rows = await env.DB.prepare(
    `SELECT c.id, c.document_id, c.chunk_index, c.text, c.embedding, d.filename
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE c.embedding IS NOT NULL
       AND d.kb_id = ?`,
  ).bind(kbId).all<ChunkRow & { filename: string; embedding: string }>();

  if (!rows.results || rows.results.length === 0) return [];

  // Score each chunk by cosine similarity with the question vector
  const scored: RankedChunk[] = [];
  for (const row of rows.results) {
    let emb: number[];
    try {
      emb = JSON.parse(row.embedding);
    } catch {
      continue;
    }
    const score = cosineSimilarity(questionVector, emb);
    scored.push({
      chunk: row,
      score,
    });
  }

  // Sort descending by score and take top-K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TOP_K);
}

/** Cosine similarity between two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
