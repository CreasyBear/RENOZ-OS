/**
 * PDF Paid Watermark Component
 *
 * Displays a "PAID" watermark overlay for paid invoices.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import { formatDateForPdf } from "./theme";
import { FONT_FAMILY, FONT_WEIGHTS } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "35%",
    left: "15%",
    transform: "rotate(-30deg)",
  },
  text: {
    fontSize: 72,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: "rgba(22, 163, 74, 0.15)", // Green at 15% opacity
    letterSpacing: 8,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: "rgba(22, 163, 74, 0.25)",
    marginTop: 8,
    textAlign: "center",
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface PaidWatermarkProps {
  /** Whether to show the watermark */
  show: boolean;
  /** Date payment was received */
  paidAt?: Date | null;
  /** Custom text (default "PAID") */
  text?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PAID watermark overlay for invoices
 *
 * @example
 * <PaidWatermark show={invoice.isPaid} paidAt={invoice.paidAt} />
 */
export function PaidWatermark({
  show,
  paidAt,
  text = "PAID",
}: PaidWatermarkProps) {
  const { locale } = useOrgDocument();

  if (!show) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
      {paidAt && (
        <Text style={styles.dateText}>{formatDateForPdf(paidAt, locale)}</Text>
      )}
    </View>
  );
}
