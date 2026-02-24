/**
 * PDF Document Theme - Apple/Linear Inspired Design
 *
 * Ultra-minimal, premium aesthetic with:
 * - Generous white space
 * - Rounded corners (8-12px)
 * - Subtle borders instead of harsh lines
 * - Pill-style badges
 * - Soft grey palette
 *
 * @see https://linear.app/design for inspiration
 */
import { StyleSheet } from "@react-pdf/renderer";
import { FONT_FAMILY, FONT_WEIGHTS } from "../fonts";

// Re-export font constants
export { FONT_FAMILY, FONT_WEIGHTS };

// ============================================================================
// COLOR TOKENS - Soft, Sophisticated Palette
// ============================================================================

export const colors = {
  // Primary - Almost black, not harsh
  primary: {
    900: "#1C1C1E", // Soft black
    800: "#2C2C2E", // Dark grey
    700: "#3A3A3C", // Medium dark
    600: "#48484A", // Medium
  },

  // Text colors - Softer than pure black
  text: {
    primary: "#1C1C1E", // Soft black for headings
    secondary: "#636366", // Medium grey for body
    muted: "#8E8E93", // Light grey for captions
    inverse: "#FFFFFF", // White
    placeholder: "#C7C7CC", // Very light grey
  },

  // Background colors
  background: {
    white: "#FFFFFF",
    subtle: "#F2F2F7", // iOS system grey6
    muted: "#E5E5EA", // iOS system grey5
    card: "#FAFAFA", // Nearly white for cards
  },

  // Border colors - Hairline, subtle
  border: {
    light: "#E5E5EA", // iOS grey5
    medium: "#D1D1D6", // iOS grey4
    dark: "#C7C7CC", // iOS grey3
  },

  // Semantic - iOS-style colors
  status: {
    success: "#34C759", // iOS green
    successLight: "#E8F5E9",
    warning: "#FF9500", // iOS orange
    warningLight: "#FFF3E0",
    error: "#FF3B30", // iOS red
    errorLight: "#FFEBEE",
    info: "#007AFF", // iOS blue
    infoLight: "#E3F2FD",
  },
} as const;

// ============================================================================
// SPACING - Generous but Intentional
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

// Modern page margins
export const pageMargins = {
  top: 40,
  bottom: 40,
  left: 48,
  right: 48,
} as const;

/**
 * Clearance for fixed header on document pages.
 * Use as marginTop on main content to avoid overlap with fixed header.
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */
export const fixedHeaderClearance = 56;

// ============================================================================
// TYPOGRAPHY - Clean, Modern
// ============================================================================

export const fontSize = {
  xs: 9,
  sm: 10,
  base: 11,
  md: 12,
  lg: 14,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  "4xl": 32,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.6,
} as const;

export const letterSpacing = {
  tight: -0.01,
  normal: 0,
  wide: 0.02,
  /** Display titles (e.g. certificate headings) */
  wider: 0.05,
} as const;

/**
 * Tabular figures for aligned number columns.
 * Use with number cells (qty, price, amount) for clean alignment.
 */
export const tabularNums = {
  fontVariantNumeric: "tabular-nums" as const,
};

// ============================================================================
// BORDER RADIUS - Very rounded
// ============================================================================

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ============================================================================
// COMMON STYLES
// ============================================================================

export const commonStyles = StyleSheet.create({
  // Page foundation
  page: {
    paddingTop: pageMargins.top,
    paddingBottom: pageMargins.bottom,
    paddingLeft: pageMargins.left,
    paddingRight: pageMargins.right,
    backgroundColor: colors.background.white,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: fontSize.base,
  },

  // Typography
  display: {
    fontSize: fontSize["4xl"],
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.tight,
  },

  h1: {
    fontSize: fontSize["3xl"],
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },

  h2: {
    fontSize: fontSize["2xl"],
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    lineHeight: lineHeight.normal,
  },

  h3: {
    fontSize: fontSize.xl,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    lineHeight: lineHeight.normal,
  },

  body: {
    fontSize: fontSize.base,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: lineHeight.relaxed,
  },

  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    lineHeight: lineHeight.normal,
  },

  label: {
    fontSize: fontSize.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: letterSpacing.wide,
  },

  // Cards
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border.light,
  },

  cardSubtle: {
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },

  // Divider - Hairline
  divider: {
    height: 0.5,
    backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },

  // Table styles - Clean
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },

  tableRowLast: {
    borderBottomWidth: 0,
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

export function formatDateForPdf(
  date: Date | string,
  locale: string,
  format: "short" | "medium" | "long" | "full" = "medium",
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: "numeric", month: "short", day: "numeric" },
    medium: { year: "numeric", month: "long", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    full: { year: "numeric", month: "long", day: "numeric", weekday: "long" },
  };

  return new Intl.DateTimeFormat(locale, options[format]).format(dateObj);
}

export function formatNumberForPdf(
  value: number,
  locale: string,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(value);
}
