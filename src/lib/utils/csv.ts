/**
 * CSV Export Utilities
 *
 * Reusable functions for generating and downloading CSV files.
 *
 * @example
 * ```typescript
 * const csv = generateCSV({
 *   headers: ['Name', 'Email', 'Status'],
 *   rows: users.map(u => [u.name, u.email, u.status])
 * });
 * downloadCSV(csv, `users-${formatDate(new Date())}.csv`);
 * ```
 */

export interface CSVOptions {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Escape a CSV cell value to handle quotes, commas, and newlines
 */
function escapeCell(value: string): string {
  // If value contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV content from headers and rows
 */
export function generateCSV(options: CSVOptions): string {
  const { headers, rows } = options;

  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => escapeCell(String(cell ?? '')))
        .join(',')
    ),
  ];

  return csvRows.join('\n');
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format a date for CSV filenames (YYYY-MM-DD)
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate CSV with automatic type conversion
 */
export function generateCSVFromObjects<T extends Record<string, unknown>>(
  objects: T[],
  columns: {
    key: keyof T;
    header: string;
    format?: (value: unknown) => string;
  }[]
): string {
  const headers = columns.map((c) => c.header);

  const rows = objects.map((obj) =>
    columns.map((col) => {
      const value = obj[col.key];
      if (col.format) {
        return col.format(value);
      }
      return String(value ?? '');
    })
  );

  return generateCSV({ headers, rows });
}
