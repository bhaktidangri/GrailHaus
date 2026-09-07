import "dotenv/config";
import { randomUUID } from "node:crypto";
import { pool } from "../src/db/pool.js";
import { purchase } from "../src/modules/purchase/purchase.service.js";

/**
 * Concurrency harness (PRD §26 / instructions.md's "you must ship a concurrency harness").
 * Fires N concurrent purchases at a real pack, temporarily pinned to a small finite stock,
 * and verifies inventory reconciles exactly afterward.
 *
 * All N attempts run as the same seeded test profile rather than N fabricated identities —
 * `profiles.id` has a real FK to `auth.users` (the Supabase signup trigger), so minting
 * throwaway buyers would mean writing directly into Supabase's auth schema, which is more
 * invasive than this needs. What's actually under test — whether concurrent transactions
 * racing on the *pack's* stock lock can ever oversell — doesn't depend on the buyers being
 * distinct people; the pack-row lock is what's contended, and a purchase's own user_id has
 * no bearing on whether another concurrent purchase can slip past it. Every row this script
 * touches (balance, stock, pressure state) is restored to its original value on exit.
 *
 * Calls `purchase()` directly rather than over HTTP: what's actually under test is the
 * transaction/locking logic in purchase.service.ts (the thing that can oversell or
 * double-spend), not the JWT-verification layer in front of it, which is a separate,
 * already-covered concern.
 *
 * Usage: npm run hammer -- [concurrency] [startingStock]
 */

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const CONCURRENCY = Number(process.argv[2] ?? 20);
const STARTING_STOCK = Number(process.argv[3] ?? 5);

async function main() {
  const { rows: packRows } = await pool.query<{
    id: string;
    price_cents: string;
    item_count: number;
    stock_remaining: number | null;
  }>("select id, price_cents, item_count, stock_remaining from public.packs where tier = 'street_rip'");
  const pack = packRows[0];
  if (!pack) throw new Error("Seed data missing: no 'street_rip' pack found — run against a seeded database.");

  const { rows: profileRows } = await pool.query<{ balance_cents: string }>(
    "select balance_cents from public.profiles where id = $1",
    [TEST_USER_ID]
  );
  if (!profileRows[0]) {
    throw new Error(`Seed data missing: test profile ${TEST_USER_ID} not found — run against a seeded database.`);
  }

  const originalStock = pack.stock_remaining;
  const originalBalance = Number(profileRows[0].balance_cents);
  const priceCents = Number(pack.price_cents);

  const { rows: pressureRows } = await pool.query<{ consecutive_without_qualifying: number }>(
    "select consecutive_without_qualifying from public.user_pressure_state where user_id = $1 and pack_id = $2",
    [TEST_USER_ID, pack.id]
  );
  const hadPressureRow = pressureRows.length > 0;
  const originalPressure = pressureRows[0]?.consecutive_without_qualifying ?? 0;

  // Everything from here on mutates real rows, so it's all inside one try/finally — if setup
  // itself throws partway through (as it did once, mid-development: the stock write landed,
  // the very next write threw, and nothing had restored it), the finally block below still
  // runs and puts the pack and profile back exactly as found.
  let exitCode = 0;
  const purchaseIds: string[] = [];
  try {
    await pool.query("update public.packs set stock_remaining = $1 where id = $2", [STARTING_STOCK, pack.id]);
    await pool.query("update public.profiles set balance_cents = $1 where id = $2", [
      priceCents * CONCURRENCY * 2,
      TEST_USER_ID,
    ]);

    console.log(
      `Hammering ${pack.id} (street_rip): stock=${STARTING_STOCK}, ${CONCURRENCY} concurrent buyers, $${(
        priceCents / 100
      ).toFixed(2)}/pack\n`
    );

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () => purchase(TEST_USER_ID, randomUUID(), pack.id, 1))
    );

    for (const r of results) {
      if (r.status === "fulfilled") purchaseIds.push(r.value.purchaseId);
    }

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.status === "completed");
    const failed = results.filter((r) => !(r.status === "fulfilled" && r.value.status === "completed"));

    console.log(`Succeeded: ${succeeded.length}`);
    console.log(`Failed:    ${failed.length}`);
    for (const [i, r] of failed.entries()) {
      if (r.status === "rejected") console.log(`  buyer ${i}: threw — ${r.reason}`);
      else console.log(`  buyer ${i}: ${r.value.status}${r.value.failureReason ? ` (${r.value.failureReason})` : ""}`);
    }

    const { rows: finalPack } = await pool.query<{ stock_remaining: number }>(
      "select stock_remaining from public.packs where id = $1",
      [pack.id]
    );
    const { rows: ownedCountRows } = await pool.query<{ count: string }>(
      "select count(*) from public.owned_items where purchase_id = any($1)",
      [purchaseIds]
    );

    const expectedSuccesses = Math.min(CONCURRENCY, STARTING_STOCK);
    const expectedStockLeft = STARTING_STOCK - expectedSuccesses;
    const actualStockLeft = finalPack[0].stock_remaining;
    const expectedItems = expectedSuccesses * pack.item_count;
    const actualItems = Number(ownedCountRows[0].count);

    console.log(`\nExpected successes: ${expectedSuccesses}   Actual: ${succeeded.length}`);
    console.log(`Expected stock left: ${expectedStockLeft}   Actual: ${actualStockLeft}`);
    console.log(`Expected owned_items: ${expectedItems}   Actual: ${actualItems}`);

    const ok =
      succeeded.length === expectedSuccesses && actualStockLeft === expectedStockLeft && actualItems === expectedItems;

    console.log(ok ? "\nPASS — no oversell, no undersell, exact accounting." : "\nFAIL — inventory does not reconcile.");
    exitCode = ok ? 0 : 1;
  } finally {
    await pool.query("delete from public.owned_items where purchase_id = any($1)", [purchaseIds]);
    await pool.query("delete from public.purchases where id = any($1)", [purchaseIds]);
    if (hadPressureRow) {
      await pool.query(
        "update public.user_pressure_state set consecutive_without_qualifying = $1 where user_id = $2 and pack_id = $3",
        [originalPressure, TEST_USER_ID, pack.id]
      );
    } else {
      await pool.query("delete from public.user_pressure_state where user_id = $1 and pack_id = $2", [
        TEST_USER_ID,
        pack.id,
      ]);
    }
    await pool.query("update public.profiles set balance_cents = $1 where id = $2", [originalBalance, TEST_USER_ID]);
    await pool.query("update public.packs set stock_remaining = $1 where id = $2", [originalStock, pack.id]);
    await pool.end();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
