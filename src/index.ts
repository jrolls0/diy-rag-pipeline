import { Env, RequestMeta } from "./types";
import { handleUpload } from "./upload";
import { handleQuery } from "./query";
import { handleListDocuments, handleDeleteDocument } from "./documents";
import { handleListKbs, handleCreateKb } from "./kb";
import { getUserFromRequest } from "./auth";
import { getHtml } from "./frontend";
import { getArchitectureHtml } from "./architecture";

// Re-export the Durable Object class so Wrangler can register it
export { UserSession } from "./session";

/** Extract Cloudflare-specific metadata from the incoming request. */
function getRequestMeta(request: Request): RequestMeta {
  const cf = (request as any).cf ?? {};
  return {
    colo: cf.colo ?? "???",
    country: cf.country ?? "",
    city: cf.city ?? "",
    ray: request.headers.get("cf-ray") ?? "",
  };
}

/**
 * Main Worker entry point.
 * Routes requests to the appropriate handler based on method + pathname.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // ── CORS preflight ─────────────────────────────────────────────
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const meta = getRequestMeta(request);
    const user = getUserFromRequest(request);

    try {
      let response: Response;

      // ── API routes ────────────────────────────────────────────────
      if (pathname === "/api/upload" && method === "POST") {
        response = await handleUpload(request, env, meta, user);
      } else if (pathname === "/api/query" && method === "POST") {
        response = await handleQuery(request, env, meta, user);
      } else if (pathname === "/api/documents" && method === "GET") {
        response = await handleListDocuments(env, url.searchParams.get("kb_id") ?? undefined);
      } else if (pathname.startsWith("/api/documents/") && method === "DELETE") {
        const docId = pathname.split("/api/documents/")[1];
        response = await handleDeleteDocument(docId, env);
      } else if (pathname === "/api/kbs" && method === "GET") {
        response = await handleListKbs(env, user.userId);
      } else if (pathname === "/api/kbs" && method === "POST") {
        response = await handleCreateKb(request, env, user.userId);
      } else if (pathname === "/api/warmup" && method === "POST") {
        // Fire-and-forget: load the LLM into GPU memory on this edge node
        // so the user's first real query doesn't hit a cold start.
        void env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any,
          { messages: [{ role: "user", content: "hi" }], max_tokens: 1 },
          { gateway: { id: "rag-gateway" } },
        ).catch(() => {});
        response = new Response(null, { status: 204 });
      }
      // ── Frontend ──────────────────────────────────────────────────
      else if (pathname === "/" || pathname === "/index.html") {
        response = new Response(getHtml(user), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } else if (pathname === "/architecture") {
        response = new Response(getArchitectureHtml(), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      // ── 404 ───────────────────────────────────────────────────────
      else {
        response = Response.json(
          { success: false, error: "Not found" },
          { status: 404 },
        );
      }

      return addCors(response);
    } catch (err) {
      console.error("Unhandled error:", err);
      return addCors(
        Response.json(
          { success: false, error: (err as Error).message ?? "Internal server error" },
          { status: 500 },
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;

// ── CORS helpers ──────────────────────────────────────────────────────

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
}

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
