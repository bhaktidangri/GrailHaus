import type { FastifyInstance } from "fastify";
import { getPurchaseByIdempotencyKey, purchase } from "./purchase.service.js";
import { itemDetailSchema } from "../items/items.schema.js";

const purchaseResponseSchema = {
  type: "object",
  properties: {
    purchaseId: { type: "string" },
    status: { type: "string", enum: ["completed", "failed", "pending"] },
    packId: { type: "string" },
    quantity: { type: "number" },
    totalPriceCents: { type: ["number", "null"] },
    failureReason: { type: ["string", "null"] },
    items: {
      type: "array",
      description: "Full catalog detail per pulled item — same shape as GET /items/:id",
      items: itemDetailSchema,
    },
  },
};

export async function purchaseRoutes(app: FastifyInstance) {
  app.post(
    "/purchase",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["purchase"],
        summary: "Buy a pack — single or bulk, evergreen or drop, all one atomic path",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["idempotencyKey", "packId", "quantity"],
          properties: {
            idempotencyKey: {
              type: "string",
              description: "Client-generated once per purchase attempt (e.g. Crypto.randomUUID()); reuse the exact same value on every retry of that attempt, never on a new one.",
            },
            packId: { type: "string" },
            quantity: { type: "number", enum: [1, 10], description: "1 for a single pack, 10 for the bulk buy — no other value is a real purchase mode" },
          },
        },
        response: { 200: purchaseResponseSchema },
      },
    },
    async (req) => {
      const { idempotencyKey, packId, quantity } = req.body as {
        idempotencyKey: string;
        packId: string;
        quantity: number;
      };
      return purchase(req.userId!, idempotencyKey, packId, quantity);
    }
  );

  app.get(
    "/purchases/:idempotencyKey",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["purchase"],
        summary: "Reconcile a purchase after a lost response — same key, no re-execution",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["idempotencyKey"],
          properties: { idempotencyKey: { type: "string" } },
        },
        response: { 200: purchaseResponseSchema },
      },
    },
    async (req) => {
      const { idempotencyKey } = req.params as { idempotencyKey: string };
      return getPurchaseByIdempotencyKey(req.userId!, idempotencyKey);
    }
  );
}
