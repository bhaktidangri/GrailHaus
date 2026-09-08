import type { FastifyInstance } from "fastify";
import { itemDetailSchema } from "../items/items.schema.js";
import { getRecentPulls } from "./activity.service.js";

export async function activityRoutes(app: FastifyInstance) {
  app.get(
    "/activity/recent",
    {
      schema: {
        tags: ["activity"],
        summary: "Recent pack pulls across every user — public, same access model as /packs",
        querystring: {
          type: "object",
          properties: { limit: { type: "number", minimum: 1, maximum: 50, default: 20 } },
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ownedItemId: { type: "string" },
                item: itemDetailSchema,
                username: { type: ["string", "null"] },
                acquiredAt: { type: "string" },
              },
            },
          },
        },
      },
    },
    async (req) => {
      const { limit } = req.query as { limit?: number };
      return getRecentPulls(limit);
    }
  );
}
