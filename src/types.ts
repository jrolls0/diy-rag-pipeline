/**
 * Cloudflare Worker environment bindings.
 * Each property maps to a binding declared in wrangler.toml.
 */
export interface Env {
  R2: R2Bucket;
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  /** Durable Object namespace for per-user-per-KB conversation sessions. */
  USER_SESSION: DurableObjectNamespace;
}

/** A named collection of documents that users can create and share. */
export interface KnowledgeBase {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

/** The authenticated user extracted from the Cloudflare Access JWT. */
export interface UserContext {
  userId: string;
  email: string;
}

/** Row shape returned from the `documents` table in D1 */
export interface DocumentRow {
  id: string;
  filename: string;
  r2_key: string;
  size_bytes: number;
  mime_type: string;
  chunk_count: number;
  created_at: string;
}

/** Row shape returned from the `chunks` table in D1 */
export interface ChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  token_count: number;
  created_at: string;
}

/** Shape of each source citation returned alongside a chat answer */
export interface SourceCitation {
  document_id: string;
  filename: string;
  chunk_index: number;
  text_snippet: string;
  score: number;
}

/** Payload returned by the /api/query endpoint */
export interface QueryResponse {
  answer: string;
  sources: SourceCitation[];
}

/** A single step in the pipeline activity feed */
export interface PipelineStep {
  service: string;      // e.g. "Worker", "R2", "Workers AI", "D1", "Vectorize", "AI Gateway"
  title: string;        // short action label
  detail: string;       // one-line explanation for non-CF audience
  durationMs: number;   // wall-clock time for this step
}

/** CF request metadata extracted from the incoming request */
export interface RequestMeta {
  colo: string;         // 3-letter IATA code of the Cloudflare PoP
  country: string;
  city: string;
  ray: string;          // CF-Ray ID
}
