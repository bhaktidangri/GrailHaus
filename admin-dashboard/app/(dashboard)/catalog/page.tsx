import { pool } from "@/lib/db";
import { Card, CardTitle, PageHeader, Table, Td, TdNum, TdStrong, Th, Thead } from "@/components/ui";

interface ItemRow {
  id: string;
  pack_id: string;
  name: string;
  rarity_tier_level: number;
  base_value_cents: string;
  collection: string | null;
  tagline: string | null;
  external_ref: string | null;
  traits: string | null;
  pokemon_name: string | null;
  card_title: string | null;
  pokemon_type: string | null;
  generation: string | null;
  pokedex_number: string | null;
  watch_name: string | null;
  model_name: string | null;
  brand: string | null;
  style: string | null;
  case_material: string | null;
  dial_color: string | null;
  movement: string | null;
  case_size: string | null;
  rarity_name: string | null;
}

interface PackGroup {
  pack_name: string;
  category: string;
  price_cents: number;
  rows: ItemRow[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function flavorInfo(item: ItemRow) {
  return [item.tagline, item.traits].filter(Boolean).join(" — ") || undefined;
}

async function getCatalog(): Promise<[string, PackGroup][]> {
  const res = await pool.query<ItemRow & { pack_name: string; category: string; price_cents: string }>(`
    select
      i.id, i.pack_id, i.name, i.rarity_tier_level, i.base_value_cents,
      i.collection, i.tagline, i.external_ref, i.traits,
      i.pokemon_name, i.card_title, i.pokemon_type, i.generation, i.pokedex_number,
      i.watch_name, i.model_name, i.brand, i.style, i.case_material, i.dial_color, i.movement, i.case_size,
      p.name as pack_name, p.category, p.price_cents,
      rt.name as rarity_name
    from public.items i
    join public.packs p on p.id = i.pack_id
    left join public.rarity_tiers rt on rt.category = p.category and rt.tier_level = i.rarity_tier_level
    order by p.category, p.price_cents, i.rarity_tier_level, i.base_value_cents
  `);

  const byPack = new Map<string, PackGroup>();
  for (const row of res.rows) {
    const entry = byPack.get(row.pack_id) ?? {
      pack_name: row.pack_name,
      category: row.category,
      price_cents: Number(row.price_cents),
      rows: [],
    };
    entry.rows.push(row);
    byPack.set(row.pack_id, entry);
  }
  return [...byPack.entries()];
}

function CardsTable({ rows }: { rows: ItemRow[] }) {
  return (
    <Table>
      <Thead>
        <tr>
          <Th>Pokémon</Th>
          <Th>Card Title</Th>
          <Th>Type</Th>
          <Th>Gen</Th>
          <Th>Pokédex #</Th>
          <Th>Rarity</Th>
          <Th>Value</Th>
          <Th info="The catalog's own collection name and reference code.">Collection</Th>
        </tr>
      </Thead>
      <tbody>
        {rows.map((item) => (
          <tr key={item.id}>
            <TdStrong info={flavorInfo(item)}>{item.pokemon_name}</TdStrong>
            <Td>{item.card_title}</Td>
            <Td>{item.pokemon_type}</Td>
            <Td>{item.generation}</Td>
            <Td className="font-mono">{item.pokedex_number}</Td>
            <Td>{item.rarity_name ?? item.rarity_tier_level}</Td>
            <TdNum>{fmt(Number(item.base_value_cents))}</TdNum>
            <Td className="text-xs">
              {item.collection}
              {item.external_ref ? ` · ${item.external_ref}` : ""}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function WatchesTable({ rows }: { rows: ItemRow[] }) {
  return (
    <Table>
      <Thead>
        <tr>
          <Th>Brand</Th>
          <Th>Watch</Th>
          <Th>Edition</Th>
          <Th>Style</Th>
          <Th>Case Material</Th>
          <Th>Dial Color</Th>
          <Th>Movement</Th>
          <Th>Size</Th>
          <Th>Rarity</Th>
          <Th>Value</Th>
          <Th info="The catalog's own collection name and reference code.">Collection</Th>
        </tr>
      </Thead>
      <tbody>
        {rows.map((item) => (
          <tr key={item.id}>
            <TdStrong info={flavorInfo(item)}>{item.brand}</TdStrong>
            <Td>{item.watch_name}</Td>
            <Td>{item.model_name}</Td>
            <Td>{item.style}</Td>
            <Td>{item.case_material}</Td>
            <Td>{item.dial_color}</Td>
            <Td>{item.movement}</Td>
            <Td>{item.case_size}</Td>
            <Td>{item.rarity_name ?? item.rarity_tier_level}</Td>
            <TdNum>{fmt(Number(item.base_value_cents))}</TdNum>
            <Td className="text-xs">
              {item.collection}
              {item.external_ref ? ` · ${item.external_ref}` : ""}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default async function CatalogPage() {
  const packs = await getCatalog();
  const total = packs.reduce((sum, [, p]) => sum + p.rows.length, 0);

  return (
    <div>
      <PageHeader
        title="Catalog"
        info="Every individual item that can be pulled from a pack, with every field from the source spreadsheets — the real card/watch data, split into each pack's own reward pool. Collector tagline and traits (long prose, not a fixed value) show on hover over the item's name rather than as their own columns — a table cell isn't a good place for a paragraph. Display-only for now: renaming an item or changing its value isn't wired up yet."
        description={`${total} items across ${packs.length} packs, every column from the source catalog.`}
      />

      <div className="flex flex-col gap-8">
        {packs.map(([packId, pack]) => (
          <Card key={packId}>
            <CardTitle info="Items are grouped by rarity tier, cheapest first — this is exactly the pool this pack draws from when a user rips it.">
              {pack.pack_name}
              <span className="ml-2 text-xs font-normal normal-case text-text-mute">
                {fmt(pack.price_cents)} · {pack.rows.length} items
              </span>
            </CardTitle>
            {pack.category === "cards" ? <CardsTable rows={pack.rows} /> : <WatchesTable rows={pack.rows} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
