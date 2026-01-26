/**
 * PDF Font Registration
 *
 * Registers fonts for @react-pdf/renderer to use in PDF generation.
 * Using Google Fonts CDN for Inter font family.
 *
 * @see https://react-pdf.org/fonts
 *
 * Note: For production reliability, consider bundling fonts locally
 * in public/fonts/ to avoid CDN failures.
 */
import { Font } from "@react-pdf/renderer";

// ============================================================================
// FONT REGISTRATION
// ============================================================================

/**
 * Register Inter font family from Google Fonts CDN
 *
 * Weights registered:
 * - 400 (Regular) - Body text
 * - 500 (Medium) - Subtitles, labels
 * - 600 (SemiBold) - Section headers
 * - 700 (Bold) - Document titles, emphasis
 */
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
      fontWeight: 700,
    },
  ],
});

// ============================================================================
// HYPHENATION
// ============================================================================

/**
 * Disable hyphenation for cleaner PDFs
 *
 * By default, react-pdf hyphenates words at line breaks.
 * This can look unprofessional in business documents,
 * so we disable it by returning words as-is.
 */
Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// FONT CONSTANTS
// ============================================================================

/**
 * Font family name for use in styles
 */
export const FONT_FAMILY = "Inter";

/**
 * Font weights as constants for type safety
 */
export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type FontWeight = (typeof FONT_WEIGHTS)[keyof typeof FONT_WEIGHTS];
