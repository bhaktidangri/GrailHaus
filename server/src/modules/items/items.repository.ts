import { pool } from "../../db/pool.js";
import type { ItemDetailRow } from "./items.types.js";

const SELECT_ITEM_DETAIL = `
  select
    i.id, i.pack_id, p.category, i.name, i.rarity_tier_level, i.texture_url, i.base_value_cents,
    i.collection, i.tagline, i.traits,
    i.pokemon_name, i.card_title, i.pokemon_type, i.generation, i.pokedex_number,
    i.watch_name, i.model_name, i.brand, i.style, i.case_material, i.dial_color, i.movement, i.case_size
  from public.items i
  join public.packs p on p.id = i.pack_id
`;

export async function findItemDetailById(itemId: string): Promise<ItemDetailRow | null> {
  const { rows } = await pool.query<ItemDetailRow>(`${SELECT_ITEM_DETAIL} where i.id = $1`, [itemId]);
  return rows[0] ?? null;
}

export async function findItemDetailsByIds(itemIds: string[]): Promise<ItemDetailRow[]> {
  if (itemIds.length === 0) return [];
  const { rows } = await pool.query<ItemDetailRow>(`${SELECT_ITEM_DETAIL} where i.id = any($1)`, [itemIds]);
  return rows;
}
