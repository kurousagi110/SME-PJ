// ─────────────────────────────────────────────────────────────────────────────
// Shared formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a number as Vietnamese Dong currency.
 * @example formatVND(1500000) → "1.500.000 ₫"
 */
export function formatVND(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats an ISO date string to a localised Vietnamese date.
 * @example formatDate("2026-04-02T10:00:00Z") → "02/04/2026"
 */
export function formatDate(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", opts).format(date);
}

/**
 * Formats an ISO date string including time.
 * @example formatDateTime("2026-04-02T10:30:00Z") → "02/04/2026, 17:30"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns a relative time label, falling back to formatDate for older dates.
 * @example formatRelativeTime("2026-04-02T09:00:00Z") → "3 giờ trước"
 */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return formatDate(date);
}

/**
 * Truncates a string and appends an ellipsis.
 */
export function truncate(str: string | undefined | null, maxLen = 40): string {
  if (!str) return "";
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}
