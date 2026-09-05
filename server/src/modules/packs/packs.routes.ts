import type { FastifyInstance } from "fastify";
import type { Category } from "@grailhaus/shared";
import { listPacks } from "./packs.service.js";

const packItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    rarityTierLevel: { type: "number", enum: [1, 2, 3] },
    textureUrl: { type: ["string", "null"] },
    baseValueCents: { type: "number" },
  },
};

const rarityTierSchema = {
  type: "object",
  properties: {
    level: { type: "number", enum: [1, 2, 3] },
    name: { type: "string", description: "Admin-configurable display name, e.g. Core / Heritage" },
    colorHex: { type: "string" },
    valueMinCents: { type: "number" },
    valueMaxCents: { type: "number" },
  },
};

const packSkuSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    category: { type: "string", enum: ["cards", "watches"] },
    tier: { type: "string", description: "Slug, e.g. street_rip" },
    name: { type: "string", description: "Display name, e.g. Street Rip" },
    priceCents: { type: "number" },
    itemCount: { type: "number", description: "Slots per pull — 5-7 for cards, 1 for watches" },
    slotProbabilities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slotPosition: { type: "number" },
          probabilities: {
            type: "object",
            description: "Percentage points per rarity tier level, sums to 100",
          },
        },
      },
    },
    pressureRules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          qualifyingMinTier: { type: "number" },
          stepsWithoutQualifying: { type: "number" },
          effectType: { type: "string", enum: ["bonus_percent", "guarantee_min_tier"] },
          targetTierLevel: { type: "number" },
          effectValue: { type: ["number", "null"] },
          appliesToFinalSlotOnly: { type: "boolean" },
        },
      },
    },
    rarityTiers: { type: "array", items: rarityTierSchema },
    itemsByTier: {
      type: "object",
      description: "Keyed by tier level (1/2/3)",
      additionalProperties: { type: "array", items: packItemSchema },
    },
  },
};

export async function packsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { category?: Category } }>(
    "/packs",
    {
      schema: {
        tags: ["packs"],
        summary: "The catalog — pack SKUs with their full reward-engine config",
        querystring: {
          type: "object",
          properties: { category: { type: "string", enum: ["cards", "watches"] } },
        },
        response: { 200: { type: "array", items: packSkuSchema } },
      },
    },
    async (req) => listPacks(req.query.category)
  );
}
