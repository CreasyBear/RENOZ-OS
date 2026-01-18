/**
 * CSV Sanitization Utilities
 *
 * Prevents CSV injection attacks by sanitizing values before export.
 * Values starting with dangerous characters are prefixed to prevent
 * formula execution in spreadsheet applications.
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Characters that trigger formula execution in spreadsheets.
 * - `=` : Formula prefix in Excel/Sheets
 * - `+` : Can start formulas
 * - `-` : Can start formulas
 * - `@` : Can invoke functions in Excel
 * - `\t` : Tab character (DDE attacks)
 * - `\r` : Carriage return (row injection)
 */
const DANGEROUS_CHARS = ["=", "+", "-", "@", "\t", "\r"];

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Sanitize a value for safe CSV export.
 * Prefixes dangerous characters with single quote to prevent formula execution.
 *
 * @example
 * sanitizeCSVValue("=SUM(A1:A10)") // "'=SUM(A1:A10)"
 * sanitizeCSVValue("Hello")        // "Hello"
 * sanitizeCSVValue(null)           // ""
 */
export function sanitizeCSVValue(value: string | number | null | undefined): string {
  if (value == null) return "";

  const str = String(value);

  // If starts with dangerous character, prefix with single quote
  if (DANGEROUS_CHARS.some((char) => str.startsWith(char))) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escape a value for CSV format (handle quotes, commas, newlines).
 * Standard CSV escaping without security sanitization.
 */
export function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Escape AND sanitize a value for safe CSV output.
 * Combines injection prevention with standard CSV escaping.
 *
 * @example
 * escapeAndSanitizeCSV("=HYPERLINK(...)") // "'=HYPERLINK(...)"
 * escapeAndSanitizeCSV('Hello, "World"')  // '"Hello, ""World"""'
 */
export function escapeAndSanitizeCSV(value: string | number | null | undefined): string {
  const sanitized = sanitizeCSVValue(value);
  return escapeCSV(sanitized);
}

// ============================================================================
// CSV BUILDING
// ============================================================================

/**
 * Build a complete CSV string from headers and rows.
 * Automatically sanitizes all values for security.
 *
 * @example
 * ```ts
 * const csv = buildSafeCSV(
 *   ["Name", "Email", "Notes"],
 *   [
 *     ["John", "john@example.com", "=malicious()"],
 *     ["Jane", "jane@example.com", "Normal notes"],
 *   ]
 * );
 * // Downloads as safe CSV
 * ```
 */
export function buildSafeCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const safeHeaders = headers.map(escapeAndSanitizeCSV);
  const safeRows = rows.map((row) => row.map(escapeAndSanitizeCSV));

  return [safeHeaders, ...safeRows].map((row) => row.join(",")).join("\n");
}

/**
 * Trigger download of CSV content as a file.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
