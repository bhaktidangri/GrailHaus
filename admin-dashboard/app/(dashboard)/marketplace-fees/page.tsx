import { pool } from "@/lib/db";
import { updateMarketplaceFees } from "@/lib/actions";
import { Button, Card, CardTitle, Info, PageHeader, Table, TableInput, Td, Th, Thead } from "@/components/ui";

/** Why the fee is proposed to differ by tier — from the PRD's Money Mechanics section. */
const FEE_RATIONALE: Record<number, string> = {
  1: "Lowest tier gets the lowest fee — keeps the long tail liquid instead of stagnant.",
  2: "Middle tier — a moderate fee, between the long-tail and the chase items.",
  3: "Highest tier gets the highest fee — demand and urgency are greatest here, and the seller still clears a premium.",
};

async function getFees() {
  const res = await pool.query<{ category: string; rarity_tier_level: number; fee_percent: string; name: string }>(
    `select f.category, f.rarity_tier_level, f.fee_percent, r.name
     from public.marketplace_fee_tiers f
     join public.rarity_tiers r on r.category = f.category and r.tier_level = f.rarity_tier_level
     order by f.category, f.rarity_tier_level`
  );
  return res.rows;
}

export default async function MarketplaceFeesPage() {
  const fees = await getFees();
  const byCategory = new Map<string, typeof fees>();
  for (const f of fees) byCategory.set(f.category, [...(byCategory.get(f.category) ?? []), f]);

  return (
    <div>
      <PageHeader
        title="Marketplace Fees"
        info="The cut the platform takes on every peer-to-peer sale on the marketplace (not on pack purchases — those are a separate revenue engine). Structurally tiered by rarity, so a Grail-tier sale can charge a different fee than a Core-tier one, even though every row is set to the same flat value today."
        description="Structurally tiered by rarity per category, even though today every row is set to the same flat value."
      />

      <form action={updateMarketplaceFees} className="flex flex-col gap-6">
        {[...byCategory.entries()].map(([category, rows]) => (
          <Card key={category}>
            <CardTitle>{category}</CardTitle>
            <Table>
              <Thead>
                <tr>
                  <Th>Tier</Th>
                  <Th info="The percentage of the sale price the platform keeps when an item at this rarity sells. E.g. 8 means the seller receives 92% of the listing price.">
                    Fee %
                  </Th>
                </tr>
              </Thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.rarity_tier_level}>
                    <Td className="font-medium text-text">
                      <span className="inline-flex items-center">
                        {f.name}
                        <Info>{FEE_RATIONALE[f.rarity_tier_level]}</Info>
                      </span>
                    </Td>
                    <Td>
                      <TableInput
                        name={`${category}_${f.rarity_tier_level}`}
                        type="number"
                        step="0.01"
                        defaultValue={f.fee_percent}
                        className="w-24"
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ))}
        <Button type="submit" className="self-start">
          Save
        </Button>
      </form>
    </div>
  );
}
