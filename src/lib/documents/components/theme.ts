/**
 * PDF Document Theme
 *
 * Centralized styling tokens for PDF documents.
 * Provides consistent colors, spacing, and typography across all templates.
 *
 * @see src/lib/email/context.tsx for the email equivalent
 */
import { StyleSheet } from "@react-pdf/renderer";
import { FONT_FAMILY, FONT_WEIGHTS } from "../fonts";

// Re-export font constants for convenience
export { FONT_FAMILY, FONT_WEIGHTS };

// ============================================================================
// COLOR TOKENS
// ============================================================================

/**
 * Color palette for PDF documents
 *
 * Using a neutral palette that works well in print and digital formats.
 * Brand colors are applied through the OrgDocumentProvider context.
 */
export const colors = {
  // Text colors
  text: {
    primary: "#18181B", // Zinc-900
    secondary: "#52525B", // Zinc-600
    muted: "#71717A", // Zinc-500
    inverse: "#FFFFFF",
  },

  // Background colors
  background: {
    white: "#FFFFFF",
    light: "#F4F4F5", // Zinc-100
    muted: "#E4E4E7", // Zinc-200
  },

  // Border colors
  border: {
    light: "#E4E4E7", // Zinc-200
    medium: "#A1A1AA", // Zinc-400
    dark: "#18181B", // Zinc-900
  },

  // Status colors
  status: {
    success: "#16A34A", // Green-600
    warning: "#CA8A04", // Yellow-600
    error: "#DC2626", // Red-600
    info: "#2563EB", // Blue-600
  },

  // Watermark color (semi-transparent)
  watermark: "rgba(22, 163, 74, 0.15)", // Green at 15% opacity
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

/**
 * Spacing scale for consistent layouts
 * Based on 4px grid
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

/**
 * Page margins for standard documents
 */
export const pageMargins = {
  top: 40,
  bottom: 60,
  left: 40,
  right: 40,
  // Alternative sizing presets
  default: 40,
  compact: 30,
  comfortable: 50,
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

/**
 * Font size scale
 */
export const fontSize = {
  xs: 8,
  sm: 9,
  base: 10,
  md: 11,
  lg: 12,
  xl: 14,
  "2xl": 16,
  "3xl": 20,
  "4xl": 24,
} as const;

/**
 * Line height multipliers
 */
export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

// ============================================================================
// COMMON STYLES
// ============================================================================

/**
 * Pre-defined reusable styles
 */
export const commonStyles = StyleSheet.create({
  // Page styles
  page: {
    padding: pageMargins.default,
    backgroundColor: colors.background.white,
    color: colors.text.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: fontSize.base,
  },

  // Typography styles
  title: {
    fontSize: fontSize["3xl"],
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  subtitle: {
    fontSize: fontSize.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  heading: {
    fontSize: fontSize.lg,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  label: {
    fontSize: fontSize.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  body: {
    fontSize: fontSize.base,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: lineHeight.normal,
  },

  small: {
    fontSize: fontSize.sm,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },

  // Layout styles
  row: {
    flexDirection: "row",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  rowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  column: {
    flexDirection: "column",
  },

  flex1: {
    flex: 1,
  },

  // Divider
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.dark,
    marginVertical: spacing.sm,
  },

  // Table header row
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.dark,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },

  // Table row
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    alignItems: "flex-start",
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for PDF display
 *
 * @param amount - Numeric amount
 * @param currency - Currency code (e.g., "AUD", "USD")
 * @param locale - Locale for formatting (e.g., "en-AU")
 * @param maximumFractionDigits - Decimal places (default 2)
 */
export function formatCurrencyForPdf(
  amount: number,
  currency: string,
  locale: string,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Format date for PDF display
 *
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDateForPdf(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format number for PDF display
 *
 * @param value - Number to format
 * @param locale - Locale for formatting
 * @param maximumFractionDigits - Decimal places
 */
export function formatNumberForPdf(
  value: number,
  locale: string,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(value);
}
