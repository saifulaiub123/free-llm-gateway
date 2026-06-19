import { getActiveDialect } from '../dialects/registry.js';

export type { AuditExtras, AuditOwnershipColumns } from '../dialects/sqlite/audit.js';

/**
 * The active dialect's audit FK/index helper, re-exported so entities import it from `schema/`
 * alongside the column sets. Emits the real `createdBy`/`modifiedBy` FK (`ON DELETE SET NULL`) +
 * indexes for whichever database is configured (GUD-010).
 */
export const auditTableExtras = getActiveDialect().auditExtras;
