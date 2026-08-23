#!/usr/bin/env node
/**
 * Local EXPLAIN for marketplace hot paths. Needs DATABASE_URL and seeded data.
 *   pnpm db:explain
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function explain(label, sql) {
  console.log(`\n== ${label} ==`);
  const rows = await prisma.$queryRawUnsafe(sql);
  for (const row of rows) {
    console.log(Object.values(row).join(" | "));
  }
}

async function main() {
  await explain(
    "listings ACTIVE by price",
    `EXPLAIN (ANALYZE, BUFFERS)
     SELECT id, price_clp FROM listings
     WHERE status = 'ACTIVE' AND quantity > 0
     ORDER BY price_clp ASC
     LIMIT 20`,
  );
  await explain(
    "card prices last 90 days",
    `EXPLAIN (ANALYZE, BUFFERS)
     SELECT variant_id, source, price_clp, captured_on
     FROM card_prices
     WHERE captured_on >= CURRENT_DATE - INTERVAL '90 days'
     ORDER BY captured_on DESC
     LIMIT 50`,
  );
  await explain(
    "wishlist notify scan",
    `EXPLAIN (ANALYZE, BUFFERS)
     SELECT id FROM wishlist_items
     WHERE notify_below = true
     LIMIT 50`,
  );
  await explain(
    "collection items by collection",
    `EXPLAIN (ANALYZE, BUFFERS)
     SELECT id, variant_id, quantity FROM collection_items
     ORDER BY created_at DESC
     LIMIT 50`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
