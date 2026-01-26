/**
 * Tool Output Formatters
 *
 * Utilities for formatting AI tool outputs as markdown tables and values.
 * Implements ARCH-008 from helicopter review for better UX.
 *
 * @see patterns/04-tool-patterns.md
 */

// ============================================================================
// TABLE FORMATTING
// ============================================================================

/**
 * Column definition for formatAsTable.
 */
export interface TableColumn<T> {
  /** Key to extract from the data object */
  key: keyof T;
  /** Header text to display */
  header: string;
  /** Optional formatter function */
  format?: (value: unknown) => string;
}

/**
 * Format data as a markdown table.
 *
 * @param data - Array of objects to format
 * @param columns - Column definitions
 * @returns Formatted markdown table string
 *
 * @example
 * ```typescript
 * const table = formatAsTable(customers, [
 *   { key: 'name', header: 'Name' },
 *   { key: 'status', header: 'Status', format: formatStatus },
 * ]);
 * ```
 */
export function formatAsTable<T extends Record<string, unknown>>(
  data: T[],
  columns: TableColumn<T>[]
): string {
  if (data.length === 0) return 'No data found.';

  const headers = columns.map((c) => c.header);
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `|${columns.map(() => '------').join('|')}|`;

  const rows = data
    .map(
      (item) =>
        `| ${columns
          .map((c) => {
            const value = item[c.key];
            return c.format ? c.format(value) : String(value ?? 'N/A');
          })
          .join(' | ')} |`
    )
    .join('\n');

  return `${headerRow}\n${separator}\n${rows}`;
}

// ============================================================================
// VALUE FORMATTERS
// ============================================================================

/**
 * Format currency value.
 *
 * @param value - Amount (can be number, string, or null)
 * @param currency - Currency code (default: AUD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null,
  currency = 'AUD'
): string {
  if (value === null || value === undefined) return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}

/**
 * Format date value.
 *
 * @param date - Date to format (Date object, ISO string, or null)
 * @returns Formatted date string (e.g., "26 Jan 2026")
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate ID for display.
 *
 * @param id - UUID or other ID string
 * @param length - Number of characters to show (default: 8)
 * @returns Truncated ID with ellipsis hint
 */
export function truncateId(id: string | null, length = 8): string {
  if (!id) return 'N/A';
  return id.slice(0, length);
}

/**
 * Format percentage value.
 *
 * @param value - Number to format as percentage
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(0)}%`;
}

/**
 * Format status with emoji indicator.
 *
 * @param status - Status string
 * @returns Status with emoji prefix
 */
export function formatStatus(status: string | null): string {
  if (!status) return 'N/A';

  const statusEmoji: Record<string, string> = {
    // Customer statuses
    active: '🟢',
    inactive: '⚪',
    prospect: '🟡',
    suspended: '🟠',
    blacklisted: '⛔',
    // Payment statuses
    paid: '✅',
    pending: '🟡',
    partial: '🔵',
    overdue: '🔴',
    refunded: '↩️',
    // Order statuses
    draft: '📝',
    confirmed: '✅',
    picking: '📦',
    picked: '✔️',
    shipped: '🚚',
    delivered: '✅',
    cancelled: '❌',
  };

  const emoji = statusEmoji[status.toLowerCase()] || '•';
  return `${emoji} ${status}`;
}

/**
 * Format days overdue.
 *
 * @param days - Number of days overdue
 * @returns Formatted string with severity indicator
 */
export function formatDaysOverdue(days: number | null): string {
  if (days === null || days === undefined || days === 0) return '-';
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `⚠️ ${days}d`;
  return `🔴 ${days}d`;
}

/**
 * Format number with thousand separators.
 *
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-AU');
}

// ============================================================================
// SUMMARY HELPERS
// ============================================================================

/**
 * Create a summary line for results.
 *
 * @param count - Number of results
 * @param entity - Entity name (singular, e.g., "customer")
 * @param qualifier - Optional qualifier (e.g., "matching \"John\"")
 * @returns Summary string
 */
export function formatResultSummary(
  count: number,
  entity: string,
  qualifier?: string
): string {
  const plural = count === 1 ? entity : `${entity}s`;
  const base = `**${count} ${plural}**`;
  return qualifier ? `${base} ${qualifier}` : base;
}
