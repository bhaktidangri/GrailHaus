import { pool } from "../../db/pool.js";
import type { ItemDetailRow } from "../items/items.types.js";

export interface OwnedItemRow {
  owned_item_id: string;
  pack_id: string;
  purchase_id: string | null;
  acquired_at: string;
  item: ItemDetailRow;
}

interface OwnedItemQueryRow extends ItemDetailRow {
  owned_item_id: string;
  owned_pack_id: string;
  purchase_id: string | null;
  acquired_at: string;
}

export async function findOwnedItems(userId: string, limit: number, offset: number): Promise<OwnedItemRow[]> {
  const { rows } = await pool.query<OwnedItemQueryRow>(
    `select
       o.id as owned_item_id, o.pack_id as owned_pack_id, o.purchase_id, o.acquired_at,
       i.id, i.pack_id, p.category, i.name, i.rarity_tier_level, i.texture_url, i.base_value_cents,
       i.collection, i.tagline, i.traits,
       i.pokemon_name, i.card_title, i.pokemon_type, i.generation, i.pokedex_number,
       i.watch_name, i.model_name, i.brand, i.style, i.case_material, i.dial_color, i.movement, i.case_size
     from public.owned_items o
     join public.items i on i.id = o.item_id
     join public.packs p on p.id = i.pack_id
     where o.user_id = $1
     order by o.acquired_at desc
     limit $2 offset $3`,
    [userId, limit, offset]
  );

  return rows.map((row) => ({
    owned_item_id: row.owned_item_id,
    pack_id: row.owned_pack_id,
    purchase_id: row.purchase_id,
    acquired_at: row.acquired_at,
    item: row,
  }));
}
