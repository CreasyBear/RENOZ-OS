/**
 * PDF Font Registration
 *
 * Registers fonts for @react-pdf/renderer to use in PDF generation.
 * Uses ESM imports so fonts are bundled and work on Vercel (process.cwd()
 * does not resolve to project root in serverless).
 *
 * Fonts live in ./fonts/ (copied from public/fonts/inter via fonts:download).
 *
 * @see https://react-pdf.org/fonts
 */
import { Font } from "@react-pdf/renderer";

// Import fonts so they're bundled — works on Vercel (no process.cwd() path)
import InterRegular from "./fonts/Inter-Regular.ttf";
import InterItalic from "./fonts/Inter-Italic.ttf";
import InterMedium from "./fonts/Inter-Medium.ttf";
import InterMediumItalic from "./fonts/Inter-MediumItalic.ttf";
import InterSemiBold from "./fonts/Inter-SemiBold.ttf";
import InterSemiBoldItalic from "./fonts/Inter-SemiBoldItalic.ttf";
import InterBold from "./fonts/Inter-Bold.ttf";
import InterBoldItalic from "./fonts/Inter-BoldItalic.ttf";

/**
 * Register Inter font family
 *
 * Weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
 */
Font.register({
  family: "Inter",
  fonts: [
    { src: InterRegular, fontWeight: 400 },
    { src: InterItalic, fontWeight: 400, fontStyle: "italic" },
    { src: InterMedium, fontWeight: 500 },
    { src: InterMediumItalic, fontWeight: 500, fontStyle: "italic" },
    { src: InterSemiBold, fontWeight: 600 },
    { src: InterSemiBoldItalic, fontWeight: 600, fontStyle: "italic" },
    { src: InterBold, fontWeight: 700 },
    { src: InterBoldItalic, fontWeight: 700, fontStyle: "italic" },
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
