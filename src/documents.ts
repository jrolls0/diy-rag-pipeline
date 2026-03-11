import { Env, DocumentRow } from "./types";

/**
 * Handle GET /api/documents
 * Returns a list of all uploaded documents ordered by most recent first.
 */
export async function handleListDocuments(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, filename, r2_key, size_bytes, mime_type, chunk_count, created_at
     FROM documents
     ORDER BY created_at DESC`,
  ).all<DocumentRow>();

  return Response.json({ success: true, documents: result.results });
}

/**
 * Handle DELETE /api/documents/:id
 *
 * Removes:
 *  1. Vectors from Vectorize (by chunk IDs)
 *  2. Chunks from D1
 *  3. Document row from D1
 *  4. Raw file from R2
 */
export async function handleDeleteDocument(
  docId: string,
  env: Env,
): Promise<Response> {
  // Look up the document first
  const doc = await env.DB.prepare(
    `SELECT id, r2_key FROM documents WHERE id = ?`,
  )
    .bind(docId)
    .first<DocumentRow>();

  if (!doc) {
    return Response.json(
      { success: false, error: "Document not found." },
      { status: 404 },
    );
  }

  // Get all chunk IDs so we can delete their vectors
  const chunks = await env.DB.prepare(
    `SELECT id FROM chunks WHERE document_id = ?`,
  )
    .bind(docId)
    .all<{ id: string }>();

  const chunkIds = chunks.results.map((c) => c.id);

  // 1. Delete vectors from Vectorize (batch of 100)
  for (let i = 0; i < chunkIds.length; i += 100) {
    await env.VECTORIZE.deleteByIds(chunkIds.slice(i, i + 100));
  }

  // 2 + 3. Delete chunks and document from D1 (CASCADE handles chunks via FK)
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM chunks WHERE document_id = ?`).bind(docId),
    env.DB.prepare(`DELETE FROM documents WHERE id = ?`).bind(docId),
  ]);

  // 4. Delete raw file from R2
  await env.R2.delete(doc.r2_key);

  return Response.json({ success: true });
}
