import { pool } from "@/lib/db";
import { updateOwnershipWeights } from "@/lib/actions";
import { Button, Card, CardTitle, PageHeader, Table, TableInput, Td, Th, Thead } from "@/components/ui";

/** copies_owned = 3 is the floor row — "3 or more," not exactly 3. */
const COPIES_LABEL: Record<number, string> = {
  0: "Never owned",
  1: "Own 1 copy",
  2: "Own 2 copies",
  3: "Own 3+ copies",
};

async function getWeights() {
  const res = await pool.query<{ category: string; copies_owned: number; weight_percent: string }>(
    "select category, copies_owned, weight_percent from public.ownership_weight_tiers order by category, copies_owned"
  );
  const byCategory = new Map<string, typeof res.rows>();
  for (const row of res.rows) byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), row]);
  return [...byCategory.entries()];
}

export default async function OwnershipWeightsPage() {
  const weights = await getWeights();

  return (
    <div>
      <PageHeader
        title="Duplicate Weights"
        info="When a pull's rarity is decided, the specific item is chosen by weighted random selection from that rarity's pool — nothing is ever removed from the pool, and a duplicate is never blocked, even twice in the same pack. Owning more copies of an item just makes it progressively less likely to be picked again. 100 means full odds (as if you owned zero); 15 means 15% of full odds. This only affects which specific item you get, never which rarity tier."
        description="How much less likely an item is to be re-selected the more copies of it a user already owns."
      />

      <form action={updateOwnershipWeights} className="flex flex-col gap-6">
        {weights.map(([category, rows]) => (
          <Card key={category}>
            <CardTitle>{category}</CardTitle>
            <Table>
              <Thead>
                <tr>
                  <Th>Copies owned</Th>
                  <Th info="The item's selection weight as a percentage of its normal (never-owned) odds. Lower means rarer to see again.">
                    Weight %
                  </Th>
                </tr>
              </Thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.copies_owned}>
                    <Td className="font-medium text-text">{COPIES_LABEL[row.copies_owned] ?? row.copies_owned}</Td>
                    <Td>
                      <TableInput
                        name={`${category}_${row.copies_owned}`}
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        defaultValue={row.weight_percent}
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
