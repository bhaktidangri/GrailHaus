"use server";

import { revalidatePath } from "next/cache";
import { pool } from "./db";

export async function updatePack(packId: string, formData: FormData) {
  const priceCents = Math.round(Number(formData.get("priceDollars")) * 100);
  const itemCount = Number(formData.get("itemCount"));

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update public.packs set price_cents = $1, item_count = $2 where id = $3", [
      priceCents,
      itemCount,
      packId,
    ]);

    for (const [key, value] of formData.entries()) {
      const match = /^slot_(\d+)_tier_(\d)$/.exec(key);
      if (!match) continue;
      const [, slotPosition, tierLevel] = match;
      await client.query(
        `insert into public.slot_probabilities (pack_id, slot_position, rarity_tier_level, probability_percent)
         values ($1, $2, $3, $4)
         on conflict (pack_id, slot_position, rarity_tier_level)
         do update set probability_percent = excluded.probability_percent`,
        [packId, Number(slotPosition), Number(tierLevel), Number(value)]
      );
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  revalidatePath("/");
  revalidatePath(`/packs/${packId}`);
}

export async function updateRarityTiers(formData: FormData) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const [key, value] of formData.entries()) {
      const match = /^(cards|watches)_(\d)_(name|color|min|max)$/.exec(key);
      if (!match) continue;
      const [, category, tierLevel, field] = match;
      const column = { name: "name", color: "color_hex", min: "value_min_cents", max: "value_max_cents" }[field]!;
      const parsed = field === "min" || field === "max" ? Math.round(Number(value) * 100) : value;
      await client.query(
        `update public.rarity_tiers set ${column} = $1 where category = $2 and tier_level = $3`,
        [parsed, category, Number(tierLevel)]
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  revalidatePath("/");
  revalidatePath("/rarity-tiers");
}

export async function updatePlatformConfig(formData: FormData) {
  await pool.query(
    `update public.platform_config set
       starting_balance_cents = $1,
       price_drift_interval_seconds = $2,
       cards_drift_min_pct = $3,
       cards_drift_max_pct = $4,
       watches_drift_min_pct = $5,
       watches_drift_max_pct = $6
     where id = true`,
    [
      Math.round(Number(formData.get("startingBalanceDollars")) * 100),
      Number(formData.get("driftIntervalSeconds")),
      Number(formData.get("cardsDriftMin")),
      Number(formData.get("cardsDriftMax")),
      Number(formData.get("watchesDriftMin")),
      Number(formData.get("watchesDriftMax")),
    ]
  );
  revalidatePath("/platform-config");
}

export async function updateMarketplaceFees(formData: FormData) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const [key, value] of formData.entries()) {
      const match = /^(cards|watches)_(\d)$/.exec(key);
      if (!match) continue;
      const [, category, tierLevel] = match;
      await client.query(
        "update public.marketplace_fee_tiers set fee_percent = $1 where category = $2 and rarity_tier_level = $3",
        [Number(value), category, Number(tierLevel)]
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
  revalidatePath("/marketplace-fees");
}

export async function updatePressureRule(ruleId: string, formData: FormData) {
  await pool.query(
    `update public.pressure_rules set
       steps_without_qualifying = $1,
       effect_value = $2
     where id = $3`,
    [Number(formData.get("steps")), formData.get("effectValue") ? Number(formData.get("effectValue")) : null, ruleId]
  );
  revalidatePath("/pressure-rules");
}
