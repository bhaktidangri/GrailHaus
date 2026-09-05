import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { authPlugin } from "./plugins/auth.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { profileRoutes } from "./modules/profile/profile.routes.js";
import { packsRoutes } from "./modules/packs/packs.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
  });
  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  await app.register(corsPlugin);
  await app.register(swaggerPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);

  // Public — browsable without a session.
  await app.register(healthRoutes);
  await app.register(packsRoutes);

  // Requires a valid Supabase session.
  await app.register(profileRoutes);

  return app;
}
