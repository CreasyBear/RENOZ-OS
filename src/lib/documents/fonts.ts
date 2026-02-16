/**
 * PDF Font Registration
 *
 * Registers fonts for @react-pdf/renderer to use in PDF generation.
 * Uses ?arraybuffer imports so fonts are inlined as data URLs — avoids
 * ENOENT on Vercel where Vite's /assets/ URLs don't exist on the server FS.
 *
 * Fonts live in ./fonts/ (copied from public/fonts/inter via fonts:download).
 *
 * @see https://react-pdf.org/fonts
 */
import { Font } from "@react-pdf/renderer";

// Import as ArrayBuffer and convert to data URL — react-pdf accepts data URLs
// and reads font data in-memory (no filesystem path needed on Vercel)
import InterRegularBuf from "./fonts/Inter-Regular.ttf?arraybuffer";
import InterItalicBuf from "./fonts/Inter-Italic.ttf?arraybuffer";
import InterMediumBuf from "./fonts/Inter-Medium.ttf?arraybuffer";
import InterMediumItalicBuf from "./fonts/Inter-MediumItalic.ttf?arraybuffer";
import InterSemiBoldBuf from "./fonts/Inter-SemiBold.ttf?arraybuffer";
import InterSemiBoldItalicBuf from "./fonts/Inter-SemiBoldItalic.ttf?arraybuffer";
import InterBoldBuf from "./fonts/Inter-Bold.ttf?arraybuffer";
import InterBoldItalicBuf from "./fonts/Inter-BoldItalic.ttf?arraybuffer";

function toDataUrl(buf: ArrayBuffer): string {
  const base64 = Buffer.from(buf).toString("base64");
  return `data:font/ttf;base64,${base64}`;
}

const InterRegular = toDataUrl(InterRegularBuf);
const InterItalic = toDataUrl(InterItalicBuf);
const InterMedium = toDataUrl(InterMediumBuf);
const InterMediumItalic = toDataUrl(InterMediumItalicBuf);
const InterSemiBold = toDataUrl(InterSemiBoldBuf);
const InterSemiBoldItalic = toDataUrl(InterSemiBoldItalicBuf);
const InterBold = toDataUrl(InterBoldBuf);
const InterBoldItalic = toDataUrl(InterBoldItalicBuf);

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
