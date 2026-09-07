import type { FastifyInstance } from "fastify";
import { getPortfolio } from "./portfolio.service.js";

const ownedItemSchema = {
  type: "object",
  properties: {
    ownedItemId: { type: "string" },
    packId: { type: "string" },
    purchaseId: { type: ["string", "null"] },
    acquiredAt: { type: "string" },
    item: {
      type: "object",
      description: "Full catalog detail — same shape as GET /items/:id",
      additionalProperties: true,
    },
  },
};

export async function portfolioRoutes(app: FastifyInstance) {
  app.get(
    "/me/portfolio",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["portfolio"],
        summary: "The signed-in user's owned items, newest first",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 200, default: 50 },
            offset: { type: "number", minimum: 0, default: 0 },
          },
        },
        response: { 200: { type: "array", items: ownedItemSchema } },
      },
    },
    async (req) => {
      const { limit, offset } = req.query as { limit?: number; offset?: number };
      return getPortfolio(req.userId!, limit, offset);
    }
  );
}
