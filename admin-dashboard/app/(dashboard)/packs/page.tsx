import Link from "next/link";
import { pool } from "@/lib/db";
import { Card, CardTitle, PageHeader, Table, TdNum, TdStrong, Th, Thead } from "@/components/ui";

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function listPacks() {
  const { rows } = await pool.query<{
    id: string;
    category: string;
    tier: string;
    name: string;
    price_cents: string;
    item_count: number;
    stock_remaining: number | null;
    goes_live_at: string | null;
  }>(
    "select id, category, tier, name, price_cents, item_count, stock_remaining, goes_live_at from public.packs order by category, price_cents"
  );
  return rows;
}

export default async function PacksPage() {
  const packs = await listPacks();
  const cards = packs.filter((p) => p.category === "cards");
  const watches = packs.filter((p) => p.category === "watches");

  return (
    <div>
      <PageHeader
        title="Packs"
        description="Every pack SKU — price, items per pull, and stock. Open one to edit its price, item count, and slot-probability grid."
      />

      <div className="flex flex-col gap-8">
        {[
          { label: "Trading Cards", rows: cards },
          { label: "Watches", rows: watches },
        ].map((group) => (
          <Card key={group.label}>
            <CardTitle>{group.label}</CardTitle>
            <Table>
              <Thead>
                <tr>
                  <Th>Pack</Th>
                  <Th>Price</Th>
                  <Th>Items/pull</Th>
                  <Th>Stock</Th>
                  <Th>Availability</Th>
                  <Th></Th>
                </tr>
              </Thead>
              <tbody>
                {group.rows.map((pack) => (
                  <tr key={pack.id}>
                    <TdStrong>{pack.name}</TdStrong>
                    <TdNum>{usd(Number(pack.price_cents))}</TdNum>
                    <TdNum>{pack.item_count}</TdNum>
                    <TdNum>{pack.stock_remaining ?? "—"}</TdNum>
                    <TdNum>
                      {pack.goes_live_at
                        ? new Date(pack.goes_live_at) > new Date()
                          ? `Live ${new Date(pack.goes_live_at).toLocaleString()}`
                          : "Drop — live"
                        : "Evergreen"}
                    </TdNum>
                    <td className="border-t border-border px-4 py-3">
                      <Link href={`/packs/${pack.id}`} className="text-sm font-medium text-accent hover:underline">
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ))}
      </div>
    </div>
  );
}
