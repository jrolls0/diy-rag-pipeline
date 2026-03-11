import { Env, PipelineStep, RequestMeta, UserContext } from "./types";
import { generateId, extractTextFromFile, chunkText, estimateTokens } from "./utils";

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/markdown",
]);

/**
 * Upload handler using SSE so each pipeline step streams to the client
 * as it completes, enabling real-time activity panel updates.
 */
export async function handleUpload(request: Request, env: Env, meta: RequestMeta, user: UserContext): Promise<Response> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Helper: send an SSE event
  function send(event: string, data: unknown) {
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  }

  // Helper: time + stream a step
  async function step<T>(service: string, title: string, detail: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    const result = await fn();
    send("step", { service, title, detail, durationMs: Math.round(performance.now() - t0) } satisfies PipelineStep);
    return result;
  }

  // Run the pipeline in the background so SSE events stream as they happen
  const pipeline = (async () => {
    try {
      // ── 1. Parse + validate ───────────────────────────────────────
      const t0 = performance.now();
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) { send("error", { error: "No file provided." }); writer.close(); return; }

      // ── Resolve target knowledge base ─────────────────────────────
      const kbId = (formData.get("kb_id") as string | null)?.trim() || "kb_general";

      // Verify the knowledge base exists and the user owns it
      const kb = await env.DB.prepare(
        `SELECT id, owner_id FROM knowledge_bases WHERE id = ?`,
      ).bind(kbId).first<{ id: string; owner_id: string }>();

      if (!kb) {
        send("error", { error: "Knowledge base not found." });
        writer.close(); return;
      }
      if (kb.owner_id !== user.userId && kb.owner_id !== "system") {
        send("error", { error: "You can only upload to knowledge bases you own." });
        writer.close(); return;
      }

      let mimeType = file.type || "text/plain";
      if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) mimeType = "text/markdown";

      if (!ALLOWED_TYPES.has(mimeType)) {
        send("error", { error: `Unsupported file type "${mimeType}". Allowed: .txt, .md` });
        writer.close(); return;
      }

      const docId = generateId();
      const r2Key = `documents/${docId}/${file.name}`;
      const fileBuffer = await file.arrayBuffer();

      // ── Step 1: File sent to Worker ─────────────────────────────
      send("meta", meta);
      send("step", { service: "Worker", title: `File received at ${meta.colo} PoP`, detail: `Browser sent ${file.name} (${(fileBuffer.byteLength / 1024).toFixed(1)} KB) to a serverless function at the nearest edge node.`, durationMs: Math.round(performance.now() - t0) });

      // ── Step 2: Raw file stored in R2 ──────────────────────────
      await step("R2", "Store document in CF object storage", "Original file bytes saved to CF R2 globally-distributed object storage before any processing begins.", async () => {
        await env.R2.put(r2Key, fileBuffer, { customMetadata: { filename: file.name, docId } });
      });

      // Extract text + chunk (internal work, not a visible step)
      let text: string;
      try {
        text = await extractTextFromFile(fileBuffer, mimeType);
      } catch (err) {
        await env.R2.delete(r2Key);
        send("error", { error: `Failed to extract text: ${(err as Error).message}` });
        writer.close(); return;
      }

      if (!text.trim()) {
        await env.R2.delete(r2Key);
        send("error", { error: "The uploaded file contains no extractable text." });
        writer.close(); return;
      }

      const chunks = chunkText(text, 500, 50);
      const EMBED_BATCH = 100;
      const chunkRows: { id: string; index: number; text: string; tokenCount: number; embedding: number[] }[] = [];
      const rawChunks = chunks.map((c) => ({ id: generateId(), index: c.index, text: c.text, tokenCount: c.tokenCount }));

      // ── Step 3: Metadata + chunks saved in D1 ─────────────────
      await step("D1", "Save metadata + chunks to CF database", `Document metadata and ${chunks.length} text chunk${chunks.length > 1 ? "s" : ""} written to CF D1 edge SQL database.`, async () => {
        await env.DB.prepare(
          `INSERT INTO documents (id, filename, r2_key, size_bytes, mime_type, chunk_count, user_id, kb_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(docId, file.name, r2Key, fileBuffer.byteLength, mimeType, chunks.length, user.userId, kbId).run();

        // We'll update embeddings after they're generated
        const chunkStmts = rawChunks.map((c) =>
          env.DB.prepare(
            `INSERT INTO chunks (id, document_id, chunk_index, text, token_count) VALUES (?, ?, ?, ?, ?)`,
          ).bind(c.id, docId, c.index, c.text, c.tokenCount),
        );
        for (let i = 0; i < chunkStmts.length; i += 100) {
          await env.DB.batch(chunkStmts.slice(i, i + 100));
        }
      });

      // ── Step 4: Routed through AI Gateway ──────────────────────
      send("step", { service: "AI Gateway", title: "Route AI request", detail: "AI request passed through CF AI Gateway for logging, caching, and rate limiting.", durationMs: 0 });

      // ── Step 5: Embeddings created by Workers AI ───────────────
      await step("Workers AI", "Convert text to vectors via CF AI", `Each text chunk converted into a semantic search vector using bge-base-en-v1.5 on CF Workers AI.`, async () => {
        for (let i = 0; i < rawChunks.length; i += EMBED_BATCH) {
          const batch = rawChunks.slice(i, i + EMBED_BATCH);
          const embeddingResult: any = await env.AI.run("@cf/baai/bge-base-en-v1.5" as any, { text: batch.map((c) => c.text) }, { gateway: { id: "rag-gateway" } });
          for (let j = 0; j < batch.length; j++) {
            chunkRows.push({ ...batch[j], embedding: Array.from(embeddingResult.data[j] as number[]) });
          }
        }
      });

      // Save embeddings back to D1 for the fallback cosine search
      const embStmts = chunkRows.map((c) =>
        env.DB.prepare(`UPDATE chunks SET embedding = ? WHERE id = ?`).bind(JSON.stringify(c.embedding), c.id),
      );
      for (let i = 0; i < embStmts.length; i += 100) {
        await env.DB.batch(embStmts.slice(i, i + 100));
      }

      // ── Step 6: Vectors indexed in Vectorize ───────────────────
      await step("Vectorize", "Index in CF vector database", "Embedding vectors inserted into CF Vectorize so documents can be found by meaning, not just keywords.", async () => {
        const allVectors: VectorizeVector[] = chunkRows.map((c) => ({
          id: c.id, values: c.embedding, metadata: { document_id: docId, chunk_index: c.index, kb_id: kbId },
        }));
        for (let i = 0; i < allVectors.length; i += 100) {
          await env.VECTORIZE.upsert(allVectors.slice(i, i + 100));
        }
      });

      // ── 8. Done ───────────────────────────────────────────────────
      send("done", {
        success: true,
        document: { id: docId, filename: file.name, size_bytes: fileBuffer.byteLength, mime_type: mimeType, chunk_count: chunks.length },
      });
    } catch (err) {
      send("error", { error: (err as Error).message ?? "Internal server error" });
    } finally {
      writer.close();
    }
  })();

  // Don't await the pipeline — let the stream start immediately
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
