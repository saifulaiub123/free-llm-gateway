/** Shared display formatters for the dashboard. */

const numberFormat = new Intl.NumberFormat('en-US');

/** Whole-number formatting with thousands separators. */
export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

/** A USD amount with up to 4 decimals (cost-saved values are often fractions of a cent). */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/** A 0..1 ratio rendered as a percentage with one decimal. */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Milliseconds rounded to a whole number with a unit suffix. */
export function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

/** An ISO timestamp rendered in the user's locale, or a dash when absent. */
export function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
