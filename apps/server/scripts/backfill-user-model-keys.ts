/**
 * One-time backfill: attach existing user-model rows to the first healthy provider key.
 *
 * WHY: before the `providerKeyId` column existed, user_models rows had no key association.
 * This script infers the most likely key for each unkeyed catalog row:
 *   1. Look up the model's providerId.
 *   2. Find the first healthy key for (userId, providerId).
 *   3. If found, set providerKeyId.
 *
 * Rows that cannot be matched (no model, no key, deleted key) keep providerKeyId = null
 * and are handled as legacy/unkeyed in routing and UI.
 *
 * Usage:
 *   pnpm --filter server tsx scripts/backfill-user-model-keys.ts
 */
import { createDb } from '../src/database/connection.js';
import { userModels } from '../src/database/schema/user-models.js';
import { models } from '../src/database/schema/models.js';
import { userProviderKeys } from '../src/database/schema/user-provider-keys.js';
import { eq, and, isNull, isNotNull, inArray } from 'drizzle-orm';

async function backfill(): Promise<void> {
  const db = createDb();

  // 1. Find all unkeyed catalog model rows
  const unkeyed = await db
    .select({
      id: userModels.id,
      userId: userModels.userId,
      modelId: userModels.modelId,
    })
    .from(userModels)
    .where(and(isNull(userModels.providerKeyId), eq(userModels.isCustom, false), isNotNull(userModels.modelId)));

  if (unkeyed.length === 0) {
    console.log('No unkeyed user model rows to backfill.');
    return;
  }

  console.log(`Found ${unkeyed.length} unkeyed user model rows.`);

  // 2. Build a modelId → providerId map
  const modelIds = [...new Set(unkeyed.map((r) => r.modelId).filter(Boolean))] as number[];
  const modelRows = await db
    .select({ id: models.id, providerId: models.providerId })
    .from(models)
    .where(inArray(models.id, modelIds));

  const modelProviderMap = new Map(modelRows.map((m) => [m.id, m.providerId]));

  // 3. For each unkeyed row, find and set the first healthy key
  let updated = 0;
  let skipped = 0;

  for (const row of unkeyed) {
    if (row.modelId === null) {
      skipped++;
      continue;
    }
    const providerId = modelProviderMap.get(row.modelId);
    if (providerId === undefined) {
      skipped++;
      continue;
    }

    // Find the first healthy key for (userId, providerId)
    const key = await db
      .select({ id: userProviderKeys.id })
      .from(userProviderKeys)
      .where(
        and(
          eq(userProviderKeys.userId, row.userId),
          eq(userProviderKeys.providerId, providerId),
          eq(userProviderKeys.status, 'healthy'),
          eq(userProviderKeys.isDeleted, false),
        ),
      )
      .limit(1);

    if (key.length === 0) {
      // Try any key (not just healthy) for completeness
      const anyKey = await db
        .select({ id: userProviderKeys.id })
        .from(userProviderKeys)
        .where(
          and(
            eq(userProviderKeys.userId, row.userId),
            eq(userProviderKeys.providerId, providerId),
            eq(userProviderKeys.isDeleted, false),
          ),
        )
        .limit(1);

      if (anyKey.length === 0) {
        skipped++;
        continue;
      }
      await db
        .update(userModels)
        .set({ providerKeyId: anyKey[0].id })
        .where(eq(userModels.id, row.id));
      updated++;
    } else {
      await db
        .update(userModels)
        .set({ providerKeyId: key[0].id })
        .where(eq(userModels.id, row.id));
      updated++;
    }
  }

  console.log(`Backfill complete: ${updated} updated, ${skipped} skipped (no matching key found).`);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
