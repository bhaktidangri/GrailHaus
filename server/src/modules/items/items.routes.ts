import type { FastifyInstance } from "fastify";
import { getItemDetail } from "./items.service.js";
import { itemDetailSchema } from "./items.schema.js";

export async function itemsRoutes(app: FastifyInstance) {
  app.get(
    "/items/:id",
    {
      schema: {
        tags: ["items"],
        summary: "Full catalog detail for one item — public, same as /packs",
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        response: { 200: itemDetailSchema },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      return getItemDetail(id);
    }
  );
}
