import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { updatePack } from "@/lib/actions";
import { computeRealEvCents } from "@/lib/ev";
import { Button, Card, CardTitle, Field, Info, Input, PageHeader, Pill, Table, TableInput, Td, Th, Thead } from "@/components/ui";

/** Generalizes the spec's own pacing language ("Cards 1-2 establish rhythm... Card 5 becomes
 * the major tension point") to any slot count, including the single-slot watch case. */
function describeSlot(position: number, totalSlots: number) {
  if (totalSlots === 1) return "The only pull — for watches, this is the entire reveal.";
  if (position === 1) return "Opening pull — establishes rhythm before the odds start shifting.";
  if (position === totalSlots)
    return "Final pull — the major tension point. This is also where most Pressure Rule guarantees land (see the Pressure Rules page).";
  return "Escalating pull — odds shift further toward the higher tiers than earlier slots.";
}

async function getPack(id: string) {
  const packRes = await pool.query<{
    id: string;
    category: string;
    tier: string;
    name: string;
    price_cents: string;
    item_count: number;
  }>("select id, category, tier, name, price_cents, item_count from public.packs where id = $1", [id]);
  const pack = packRes.rows[0];
  if (!pack) return null;

  const rarityRes = await pool.query<{
    tier_level: number;
    name: string;
    value_min_cents: string;
    value_max_cents: string;
  }>(
    "select tier_level, name, value_min_cents, value_max_cents from public.rarity_tiers where category = $1 order by tier_level",
    [pack.category]
  );

  const slotRes = await pool.query<{ slot_position: number; rarity_tier_level: number; probability_percent: string }>(
    "select slot_position, rarity_tier_level, probability_percent from public.slot_probabilities where pack_id = $1 order by slot_position, rarity_tier_level",
    [id]
  );

  const slotsByPosition = new Map<number, Record<number, number>>();
  for (const row of slotRes.rows) {
    const slot = slotsByPosition.get(row.slot_position) ?? {};
    slot[row.rarity_tier_level] = Number(row.probability_percent);
    slotsByPosition.set(row.slot_position, slot);
  }

  return {
    pack,
    rarityTiers: rarityRes.rows,
    slots: [...slotsByPosition.entries()].sort((a, b) => a[0] - b[0]),
  };
}

export default async function PackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPack(id);
  if (!data) notFound();
  const { pack, rarityTiers, slots } = data;

  const evCents = await computeRealEvCents(pack.id);
  const priceCents = Number(pack.price_cents);
  const returnPct = (evCents / priceCents) * 100;
  const tone = returnPct >= 85 && returnPct <= 100 ? "good" : returnPct > 100 && returnPct <= 120 ? "warn" : returnPct < 85 && returnPct >= 70 ? "warn" : "danger";

  const updateWithId = updatePack.bind(null, pack.id);

  return (
    <div>
      <PageHeader
        title={pack.name}
        description={`${pack.category} · ${pack.tier}`}
        info="One pack SKU — its price, how many items it delivers per pull, and the exact odds at each pull position. Saving here immediately changes this pack's Est. EV shown on the Overview page."
      />

      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-text-soft">
          Est. EV {`$${(evCents / 100).toFixed(2)}`} on {`$${(priceCents / 100).toFixed(2)}`}
        </span>
        <Pill tone={tone}>{returnPct.toFixed(1)}% return</Pill>
      </div>

      <form action={updateWithId} className="flex flex-col gap-6">
        <Card className="flex gap-4">
          <Field label="Price (USD)" info="What a user pays for one rip of this pack.">
            <Input name="priceDollars" type="number" step="0.01" defaultValue={(priceCents / 100).toFixed(2)} />
          </Field>
          <Field
            label="Items per pull"
            info="How many items come out of one rip — 5–7 for card packs, 1 for watch cases. Changing this doesn't add or remove slot rows below automatically; edit the migration/seed if you need a different row count."
          >
            <Input name="itemCount" type="number" defaultValue={pack.item_count} />
          </Field>
        </Card>

        <Card>
          <CardTitle info="Cards don't use one flat probability for the whole pack — each pull position (1st card, 2nd, ...) has its own odds, escalating toward the final slot. This is the 'Progressive Slot Probability' system from the spec. Watches have a single slot, so this table is one row.">
            Slot probabilities (% per position)
          </CardTitle>
          <Table>
            <Thead>
              <tr>
                <Th info="The pull's position in the pack — 1 is the first item revealed, the highest number is the final, most-tense pull.">
                  Slot
                </Th>
                {rarityTiers.map((t) => (
                  <Th
                    key={t.tier_level}
                    info={`The odds (%) that this position lands on ${t.name}. Every row must add up to 100.`}
                  >
                    {t.name}
                  </Th>
                ))}
              </tr>
            </Thead>
            <tbody>
              {slots.map(([slotPosition, probs]) => (
                <tr key={slotPosition}>
                  <Td className="font-medium text-text">
                    <span className="inline-flex items-center">
                      {slotPosition}
                      <Info>{describeSlot(slotPosition, slots.length)}</Info>
                    </span>
                  </Td>
                  {rarityTiers.map((t) => (
                    <Td key={t.tier_level}>
                      <TableInput
                        name={`slot_${slotPosition}_tier_${t.tier_level}`}
                        type="number"
                        step="0.01"
                        defaultValue={probs[t.tier_level] ?? 0}
                        className="w-20"
                      />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-3 text-xs text-text-mute">Each row should sum to 100.</p>
        </Card>

        <Button type="submit" className="self-start">
          Save
        </Button>
      </form>
    </div>
  );
}
