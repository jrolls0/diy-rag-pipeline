import { Env, KnowledgeBase } from "./types";
import { generateId } from "./utils";

/**
 * GET /api/kbs
 * Returns all knowledge bases ordered most-recent first.
 */
export async function handleListKbs(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, name, owner_id, created_at FROM knowledge_bases ORDER BY created_at DESC`,
  ).all<KnowledgeBase>();

  return Response.json({ success: true, kbs: result.results });
}

/**
 * POST /api/kbs  { name: string }
 * Creates a new knowledge base owned by the authenticated user.
 */
export async function handleCreateKb(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return Response.json({ success: false, error: "Name is required." }, { status: 400 });
  }
  if (name.length > 80) {
    return Response.json(
      { success: false, error: "Name must be 80 characters or fewer." },
      { status: 400 },
    );
  }

  const id = "kb_" + generateId();
  await env.DB.prepare(
    `INSERT INTO knowledge_bases (id, name, owner_id) VALUES (?, ?, ?)`,
  )
    .bind(id, name, userId)
    .run();

  return Response.json({ success: true, kb: { id, name, owner_id: userId } as KnowledgeBase });
}
