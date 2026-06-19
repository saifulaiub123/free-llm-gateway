import { getActiveDialect } from '../dialects/registry.js';
import type { ColumnKit } from '../dialects/dialect.contract.js';

/**
 * Columns present on EVERY table: surrogate key + creation timestamp. Built from a dialect's
 * {@link ColumnKit} so the SAME definition works for SQLite and PostgreSQL (PAT-007 / PAT-009).
 *
 * WHY a factory (kit in → columns out): keeps the function pure and unit-testable with any dialect's
 * kit, while the active-dialect instances below are what entities actually spread.
 */
export const makeBaseColumns = (kit: ColumnKit) => ({
  id: kit.pk(),
  createdAt: kit.createdAt(),
});

/**
 * Audit + lifecycle columns for user-facing domain entities — the BaseEntity/BaseModel equivalent
 * for a multi-user platform. `isActive` = enable/disable toggle; `isDeleted` = soft delete.
 *
 * `createdBy`/`modifiedBy` carry no inline FK here; each entity declares the REAL FK to `users.id`
 * (`ON DELETE SET NULL`) + index via `auditTableExtras(...)` in its table builder (GUD-010).
 */
export const makeBaseEntityColumns = (kit: ColumnKit) => ({
  ...makeBaseColumns(kit),
  createdBy: kit.integer('created_by'),
  modifiedBy: kit.integer('modified_by'),
  modifiedAt: kit.timestamp('modified_at'),
  isActive: kit.boolean('is_active').notNull().default(true),
  isDeleted: kit.boolean('is_deleted').notNull().default(false),
});

// Active-dialect instances every entity spreads (`...baseColumns` / `...baseEntityColumns`).
const kit = getActiveDialect().columnKit;

/** `id` + `createdAt`, for ALL tables. */
export const baseColumns = makeBaseColumns(kit);

/** `baseColumns` + audit/lifecycle columns, for user-facing domain entities. */
export const baseEntityColumns = makeBaseEntityColumns(kit);
