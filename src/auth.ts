/**
 * Extracts the authenticated user from a Cloudflare Access JWT.
 *
 * Cloudflare Access validates the JWT before the request ever reaches the
 * Worker, so we only need to decode (not re-verify) the payload to read the
 * user's email.  In a high-security context you'd verify the signature against
 * the CF Access public keys at https://<team>.cloudflareaccess.com/cdn-cgi/access/certs.
 *
 * When running locally without Access in front (e.g. `wrangler dev`), the
 * header is absent and we fall back to a deterministic dev identity.
 */

export interface UserContext {
  /** Stable user identifier — the email from the Access JWT. */
  userId: string;
  email: string;
}

export function getUserFromRequest(request: Request): UserContext {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");

  if (jwt) {
    const parts = jwt.split(".");
    if (parts.length === 3) {
      try {
        // base64url → base64 → JSON
        const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
        const email = (payload.email as string | undefined)?.toLowerCase();
        if (email) return { userId: email, email };
      } catch {
        // Malformed JWT — fall through to dev fallback
      }
    }
  }

  // Local dev / no Access in front
  return { userId: "dev@local", email: "dev@local" };
}
