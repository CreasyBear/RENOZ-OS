/**
 * PDF Font Registration
 *
 * Registers fonts for @react-pdf/renderer to use in PDF generation.
 * Uses local font files per react-pdf skill: remote URLs do NOT work.
 *
 * Fonts are stored in public/fonts/inter/ and downloaded via:
 *   node scripts/download-pdf-fonts.mjs
 *
 * @see https://react-pdf.org/fonts
 */
import path from "path";
import { Font } from "@react-pdf/renderer";

// ============================================================================
// FONT PATHS (local files required — remote URLs do not work with react-pdf)
// ============================================================================

const FONTS_BASE = path.join(process.cwd(), "public", "fonts", "inter");

/**
 * Register Inter font family from local TTF files
 *
 * Weights registered:
 * - 400 (Regular) - Body text
 * - 500 (Medium) - Subtitles, labels
 * - 600 (SemiBold) - Section headers
 * - 700 (Bold) - Document titles, emphasis
 * - Italic variants for all weights
 */
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONTS_BASE, "Inter-Regular.ttf"), fontWeight: 400 },
    {
      src: path.join(FONTS_BASE, "Inter-Italic.ttf"),
      fontWeight: 400,
      fontStyle: "italic",
    },
    { src: path.join(FONTS_BASE, "Inter-Medium.ttf"), fontWeight: 500 },
    {
      src: path.join(FONTS_BASE, "Inter-MediumItalic.ttf"),
      fontWeight: 500,
      fontStyle: "italic",
    },
    { src: path.join(FONTS_BASE, "Inter-SemiBold.ttf"), fontWeight: 600 },
    {
      src: path.join(FONTS_BASE, "Inter-SemiBoldItalic.ttf"),
      fontWeight: 600,
      fontStyle: "italic",
    },
    { src: path.join(FONTS_BASE, "Inter-Bold.ttf"), fontWeight: 700 },
    {
      src: path.join(FONTS_BASE, "Inter-BoldItalic.ttf"),
      fontWeight: 700,
      fontStyle: "italic",
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
