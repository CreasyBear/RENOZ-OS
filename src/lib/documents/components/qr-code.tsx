/* eslint-disable react-refresh/only-export-components -- Component exports component + styles */
/**
 * PDF QR Code Component
 *
 * Generates and displays QR codes in PDF documents.
 * Uses the qrcode library to generate data URLs.
 */

import { Image, View, StyleSheet } from "@react-pdf/renderer";
import QRCodeUtil from "qrcode";
import { spacing } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  image: {
    width: 80,
    height: 80,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface QRCodeProps {
  /** Data URL of the QR code image */
  dataUrl: string;
  /** Size in points (default 80) */
  size?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * QR Code display component
 *
 * Note: The QR code must be pre-generated as a data URL before
 * passing to this component (PDF rendering is sync).
 *
 * @example
 * const qrDataUrl = await generateQRCode('https://example.com');
 * <QRCode dataUrl={qrDataUrl} />
 */
export function QRCode({ dataUrl, size = 80 }: QRCodeProps) {
  return (
    <View style={styles.container}>
      <Image
        src={dataUrl}
        style={{
          width: size,
          height: size,
        }}
      />
    </View>
  );
}

// ============================================================================
// UTILITY FUNCTION
// ============================================================================

export interface GenerateQRCodeOptions {
  /** Size of the QR code in pixels (default 240 for 80pt at 3x) */
  width?: number;
  /** Margin around QR code (default 0) */
  margin?: number;
  /** Error correction level (default 'M') */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generate a QR code as a data URL
 *
 * This is an async function that must be called before rendering
 * the PDF document.
 *
 * @param content - Content to encode in the QR code (URL, text, etc.)
 * @param options - QR code generation options
 * @returns Data URL string for use with Image component
 *
 * @example
 * const qrDataUrl = await generateQRCode('https://app.example.com/quote/123');
 */
export async function generateQRCode(
  content: string,
  options: GenerateQRCodeOptions = {},
): Promise<string> {
  const {
    width = 240, // 80pt * 3 for retina quality
    margin = 0,
    errorCorrectionLevel = "M",
  } = options;

  return QRCodeUtil.toDataURL(content, {
    width,
    margin,
    errorCorrectionLevel,
  });
}
