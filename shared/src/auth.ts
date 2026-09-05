import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export class InvalidTokenError extends Error {}

const jwksCache = new Map<string, JWTVerifyGetKey>();

function getJwks(supabaseUrl: string): JWTVerifyGetKey {
  let jwks = jwksCache.get(supabaseUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    jwksCache.set(supabaseUrl, jwks);
  }
  return jwks;
}

/**
 * Verifies a Supabase-issued access token against a project's JWKS and
 * returns the user id (`sub`). Shared between the Fastify server and the
 * admin dashboard so both apps enforce auth identically, not via a copy —
 * `jose` is Edge- and Node-compatible, which matters since Next.js
 * middleware/edge runtimes can't use a raw `pg`/Node-only verifier.
 */
export async function verifyAccessToken(token: string, supabaseUrl: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, getJwks(supabaseUrl), {
      issuer: `${supabaseUrl}/auth/v1`,
    });
    if (typeof payload.sub !== "string") {
      throw new InvalidTokenError("Token has no subject");
    }
    return payload.sub;
  } catch {
    throw new InvalidTokenError("Invalid or expired token");
  }
}
