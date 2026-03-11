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

      // ── Step 4: Question embedded by Workers AI ───────────────────
      let questionVector!: number[];
      await step("Workers AI", "Convert question to vector via CF AI", "Question text converted into a semantic search vector using bge-base-en-v1.5 on CF Workers AI.", async () => {
        const embeddingResult: any = await env.AI.run("@cf/baai/bge-base-en-v1.5" as any, { text: [question] }, { gateway: { id: "rag-gateway" } });
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

      // ── Step 7: Grounded answer generated ─────────────────────────
      const contextBlock = rankedChunks
        .map((r, i) => `[Source ${i + 1} — ${r.chunk.filename}, chunk ${r.chunk.chunk_index}]\n${r.chunk.text}`)
        .join("\n\n---\n\n");

      const systemPrompt = `You are a helpful document assistant. Answer the user's question based ONLY on the provided context excerpts. If the context does not contain enough information to answer, say so honestly. Always reference which source(s) you used.`;
      // Include the last few history turns so the LLM has conversational context
      const historyMessages = history.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const userPrompt = `Context:\n${contextBlock}\n\n---\n\nQuestion: ${question}`;

      let answer = "";
      await step("Workers AI", "Generate AI response at the edge", "Retrieved context sent to Llama 3.1 8B on CF Workers AI to produce a grounded answer.", async () => {
        const llmResult: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1024,
        }, { gateway: { id: "rag-gateway" } });
        answer = llmResult.response ?? llmResult.result?.response ?? "Sorry, I could not generate an answer.";
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
