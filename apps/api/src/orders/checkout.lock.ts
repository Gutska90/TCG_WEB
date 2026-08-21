import { Prisma } from "@prisma/client";
import { checkoutInclude } from "./order.mapper";

/**
 * Lock order for money/stock transitions (must stay consistent to avoid deadlocks):
 *
 * 1. Checkout row (`checkouts.id`)
 * 2. Orders of that checkout (`orders.id` ASC)
 * 3. Listings referenced by those orders (`listings.id` ASC)
 *
 * Never lock listings before checkout when a checkout id is known.
 * `createCheckout` only locks listings (no checkout row yet).
 */
export const MONEY_TX = {
  maxWait: 5_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

export type LockedCheckoutGraph = Prisma.CheckoutGetPayload<{ include: typeof checkoutInclude }>;

export async function lockListings(
  tx: Prisma.TransactionClient,
  listingIds: string[],
): Promise<void> {
  const ids = [...new Set(listingIds)].sort();
  if (ids.length === 0) return;
  await tx.$queryRaw`
    SELECT id
    FROM listings
    WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY id
    FOR UPDATE
  `;
}

export async function lockCheckoutGraph(
  tx: Prisma.TransactionClient,
  checkoutId: string,
): Promise<LockedCheckoutGraph | null> {
  const checkoutLock = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM checkouts
    WHERE id = ${checkoutId}::uuid
    FOR UPDATE
  `;
  if (checkoutLock.length === 0) {
    return null;
  }

  await tx.$queryRaw`
    SELECT id
    FROM orders
    WHERE checkout_id = ${checkoutId}::uuid
    ORDER BY id
    FOR UPDATE
  `;

  await tx.$queryRaw`
    SELECT l.id
    FROM listings l
    WHERE l.id IN (
      SELECT oi.listing_id
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.checkout_id = ${checkoutId}::uuid
    )
    ORDER BY l.id
    FOR UPDATE
  `;

  return tx.checkout.findUnique({
    where: { id: checkoutId },
    include: checkoutInclude,
  });
}
