import { Env, KnowledgeBase } from "./types";
import { generateId } from "./utils";

/**
 * GET /api/kbs
 * Returns all knowledge bases. Auto-creates a personal KB for the user
 * on their first visit so they always land in an editable space.
 */
export async function handleListKbs(env: Env, userId: string): Promise<Response> {
  // Check if this user already has a personal KB
  const existing = await env.DB.prepare(
    `SELECT id FROM knowledge_bases WHERE owner_id = ? AND is_personal = 1`,
  ).bind(userId).first<{ id: string }>();

  if (!existing) {
    // First visit — create their private personal KB
    const personalId = "kb_" + generateId();
    const displayName = userId.includes("@")
      ? userId.split("@")[0] + "'s Personal KB"
      : userId + "'s Personal KB";
    await env.DB.prepare(
      `INSERT INTO knowledge_bases (id, name, owner_id, is_personal) VALUES (?, ?, ?, 1)`,
    ).bind(personalId, displayName, userId).run();
  }

  // Return: this user's personal KB + all shared (non-personal) KBs
  // Other users' personal KBs are intentionally excluded.
  const result = await env.DB.prepare(
    `SELECT id, name, owner_id, is_personal, created_at
     FROM knowledge_bases
     WHERE is_personal = 0 OR owner_id = ?
     ORDER BY is_personal DESC, created_at DESC`,
  ).bind(userId).all<KnowledgeBase>();

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
