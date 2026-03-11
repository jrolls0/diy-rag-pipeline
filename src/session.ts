/**
 * UserSession Durable Object — one instance per (user × knowledge-base) pair.
 *
 * Stores the last MAX_HISTORY messages so the LLM has conversational context.
 * The instance is named "${userId}::${kbId}" to keep sessions isolated per KB.
 */

export interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 20; // 10 exchanges (user + assistant pairs)

export class UserSession {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // GET /history → return stored messages
    if (url.pathname === "/history" && request.method === "GET") {
      const history = (await this.state.storage.get<Message[]>("history")) ?? [];
      return Response.json(history);
    }

    // POST /message  { role, content } → append and persist
    if (url.pathname === "/message" && request.method === "POST") {
      const msg = (await request.json()) as Message;
      const history = (await this.state.storage.get<Message[]>("history")) ?? [];
      history.push(msg);
      // Trim to keep the context window manageable
      if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
      await this.state.storage.put("history", history);
      return new Response("ok");
    }

    // DELETE /clear → wipe the session
    if (url.pathname === "/clear" && request.method === "DELETE") {
      await this.state.storage.delete("history");
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }
}
