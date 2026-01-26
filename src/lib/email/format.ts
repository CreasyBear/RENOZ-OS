/**
 * Email Formatting Utilities
 *
 * Type-safe, null-safe formatting helpers for email templates.
 * All helpers gracefully handle null/undefined values and return
 * appropriate placeholders.
 *
 * @see EMAIL-TPL-008
 */

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

export interface FormatCurrencyOptions {
  /** Currency code (default: "USD") */
  currency?: string;
  /** Placeholder when value is null/undefined (default: "$0.00") */
  placeholder?: string;
  /** Locale for formatting (default: "en-US") */
  locale?: string;
}

/**
 * Format currency for email display.
 * Null-safe with configurable placeholder.
 *
 * @example
 * formatCurrency(299.99)           // "$299.99"
 * formatCurrency(null)             // "$0.00"
 * formatCurrency(100, { currency: "EUR" }) // "€100.00"
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const {
    currency = "USD",
    placeholder = "$0.00",
    locale = "en-US",
  } = options;

  if (amount == null) return placeholder;
  if (typeof amount !== "number" || isNaN(amount)) return placeholder;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

export interface FormatDateOptions {
  /** Date style: "short", "medium", or "long" (default: "medium") */
  style?: "short" | "medium" | "long";
  /** Placeholder when date is null/invalid (default: "N/A") */
  placeholder?: string;
  /** Locale for formatting (default: "en-US") */
  locale?: string;
  /** Include time (default: false) */
  includeTime?: boolean;
}

/**
 * Format date for email display.
 * Null-safe with configurable placeholder.
 *
 * @example
 * formatDate(new Date("2024-03-15"))  // "Mar 15, 2024"
 * formatDate("2024-03-15")            // "Mar 15, 2024"
 * formatDate(null)                    // "N/A"
 * formatDate(new Date(), { style: "long" }) // "March 15, 2024"
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: FormatDateOptions = {}
): string {
  const {
    style = "medium",
    placeholder = "N/A",
    locale = "en-US",
    includeTime = false,
  } = options;

  if (date == null) return placeholder;

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return placeholder;

  const dateStyles: Record<
    string,
    Intl.DateTimeFormatOptions
  > = {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
  };

  const formatOptions: Intl.DateTimeFormatOptions = {
    ...dateStyles[style],
    ...(includeTime && { hour: "numeric", minute: "2-digit" }),
  };

  return d.toLocaleDateString(locale, formatOptions);
}

/**
 * Format date as relative time (e.g., "3 days ago", "in 2 weeks").
 */
export function formatRelativeDate(
  date: Date | string | null | undefined,
  placeholder = "N/A"
): string {
  if (date == null) return placeholder;

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return placeholder;

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return formatDate(d);
}

// ============================================================================
// PHONE FORMATTING
// ============================================================================

/**
 * Format phone number for display.
 * Supports US format (10 digits) and international.
 *
 * @example
 * formatPhone("5551234567")      // "(555) 123-4567"
 * formatPhone("+15551234567")    // "+1 (555) 123-4567"
 * formatPhone(null)              // ""
 */
export function formatPhone(
  phone: string | null | undefined,
  placeholder = ""
): string {
  if (!phone) return placeholder;

  // Strip non-digits
  const digits = phone.replace(/\D/g, "");

  // US format: (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // US with country code: +1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return as-is for other formats
  return phone;
}

// ============================================================================
// ADDRESS FORMATTING
// ============================================================================

export interface Address {
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

/**
 * Format address for email display.
 * Creates a properly formatted multiline address string.
 *
 * @example
 * formatAddress({
 *   street: "123 Main St",
 *   city: "San Francisco",
 *   state: "CA",
 *   zip: "94102"
 * })
 * // "123 Main St\nSan Francisco, CA 94102"
 */
export function formatAddress(
  address: Address | null | undefined,
  placeholder = ""
): string {
  if (!address) return placeholder;

  const lines: string[] = [];

  // Street lines
  if (address.street) lines.push(address.street);
  if (address.street2) lines.push(address.street2);

  // City, State ZIP
  const cityStateZip: string[] = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) {
    if (cityStateZip.length > 0) {
      cityStateZip[cityStateZip.length - 1] += ",";
    }
    cityStateZip.push(address.state);
  }
  if (address.zip) cityStateZip.push(address.zip);

  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(" "));
  }

  // Country (if provided and not US)
  if (address.country && address.country !== "US" && address.country !== "USA") {
    lines.push(address.country);
  }

  return lines.length > 0 ? lines.join("\n") : placeholder;
}

/**
 * Format address as a single line (for inline display).
 */
export function formatAddressInline(
  address: Address | null | undefined,
  placeholder = ""
): string {
  const multiline = formatAddress(address, placeholder);
  return multiline.replace(/\n/g, ", ");
}

// ============================================================================
// NAME FORMATTING
// ============================================================================

/**
 * Format customer name with fallback.
 * Returns a default if name is null/empty.
 *
 * @example
 * formatName("John Doe")           // "John Doe"
 * formatName(null)                 // "Valued Customer"
 * formatName("", "Friend")         // "Friend"
 */
export function formatName(
  name: string | null | undefined,
  fallback = "Valued Customer"
): string {
  if (!name || name.trim() === "") return fallback;
  return name.trim();
}

/**
 * Get first name from full name.
 *
 * @example
 * getFirstName("John Doe")   // "John"
 * getFirstName(null)         // "there"
 */
export function getFirstName(
  fullName: string | null | undefined,
  fallback = "there"
): string {
  if (!fullName) return fallback;
  const firstName = fullName.trim().split(" ")[0];
  return firstName || fallback;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a number with thousands separators.
 *
 * @example
 * formatNumber(1234567)    // "1,234,567"
 * formatNumber(null)       // "0"
 */
export function formatNumber(
  value: number | null | undefined,
  placeholder = "0"
): string {
  if (value == null || isNaN(value)) return placeholder;
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Format a percentage.
 *
 * @example
 * formatPercent(0.756)     // "76%"
 * formatPercent(75.6)      // "76%" (assumes already percentage)
 */
export function formatPercent(
  value: number | null | undefined,
  placeholder = "0%"
): string {
  if (value == null || isNaN(value)) return placeholder;

  // If value is between 0 and 1, treat as decimal
  const percent = value <= 1 && value >= 0 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

// ============================================================================
// ORDER/REFERENCE FORMATTING
// ============================================================================

/**
 * Format an order number or reference.
 *
 * @example
 * formatOrderNumber("123")          // "ORD-123"
 * formatOrderNumber("ORD-456")      // "ORD-456"
 * formatOrderNumber(null)           // "N/A"
 */
export function formatOrderNumber(
  orderNumber: string | null | undefined,
  prefix = "ORD",
  placeholder = "N/A"
): string {
  if (!orderNumber) return placeholder;

  // If already has prefix, return as-is
  if (orderNumber.startsWith(`${prefix}-`)) return orderNumber;

  // Add prefix
  return `${prefix}-${orderNumber}`;
}
