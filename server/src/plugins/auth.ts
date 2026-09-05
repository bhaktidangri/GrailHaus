import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { InvalidTokenError, verifyAccessToken } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * fastify-plugin bypasses Fastify's default encapsulation — without it, the
 * `authenticate` decorator and `userId` request property would only be
 * visible inside this plugin's own scope, not to the sibling route modules
 * (profile, packs, ...) that need to reference `app.authenticate`.
 */
export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("userId", undefined);

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      reply.code(401).send({ error: "Missing bearer token" });
      return;
    }
    try {
      req.userId = await verifyAccessToken(token);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        reply.code(401).send({ error: err.message });
        return;
      }
      throw err;
    }
  });
});
