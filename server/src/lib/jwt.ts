import { verifyAccessToken as verify, InvalidTokenError } from "@grailhaus/shared";
import { env } from "../config/env.js";

export { InvalidTokenError };

/** Thin re-export bound to this server's Supabase project — the real verification
 * logic lives in @grailhaus/shared so the admin dashboard uses the identical check. */
export function verifyAccessToken(token: string): Promise<string> {
  return verify(token, env.supabaseUrl);
}
