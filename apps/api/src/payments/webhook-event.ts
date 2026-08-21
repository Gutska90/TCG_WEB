import { Prisma } from "@prisma/client";

/**
 * Claims a webhook row under UNIQUE(provider, provider_event_id).
 * Concurrent deliveries wait on FOR UPDATE instead of a TOCTOU find+create.
 */
export async function claimWebhookEvent(
  tx: Prisma.TransactionClient,
  provider: string,
  providerEventId: string,
  payload: Prisma.InputJsonValue,
): Promise<{ id: string; alreadyProcessed: boolean }> {
  const json = JSON.stringify(payload);
  await tx.$executeRaw`
    INSERT INTO webhook_events (id, provider, provider_event_id, payload)
    VALUES (gen_random_uuid(), ${provider}, ${providerEventId}, ${json}::jsonb)
    ON CONFLICT (provider, provider_event_id) DO NOTHING
  `;

  const rows = await tx.$queryRaw<Array<{ id: string; processed_at: Date | null }>>`
    SELECT id, processed_at
    FROM webhook_events
    WHERE provider = ${provider}
      AND provider_event_id = ${providerEventId}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("webhook_events claim returned no row");
  }
  return { id: row.id, alreadyProcessed: row.processed_at != null };
}
