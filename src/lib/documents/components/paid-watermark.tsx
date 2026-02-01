/**
 * PDF Paid Badge Component - Apple/Linear Style
 *
 * Displays a subtle "PAID" badge instead of an overlay watermark.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import {
  fontSize,
  spacing,
  pageMargins,
  borderRadius,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";
import { formatDateForPdf } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Subtle badge in corner
  badge: {
    position: "absolute",
    top: pageMargins.top + 8,
    right: pageMargins.right,
    backgroundColor: "#E8F5E9",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: "#2E7D32",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeDate: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: "#4CAF50",
  },

  // Alternative: Stamp style
  stamp: {
    position: "absolute",
    top: "40%",
    right: "10%",
    transform: "rotate(-12deg)",
    borderWidth: 2,
    borderColor: "#34C759",
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  stampText: {
    fontSize: 24,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: "#34C759",
    letterSpacing: 2,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface PaidWatermarkProps {
  show: boolean;
  paidAt?: Date | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PaidWatermark({ show, paidAt }: PaidWatermarkProps) {
  const { locale } = useOrgDocument();

  if (!show) {
    return null;
  }

  // Using subtle badge in corner instead of large watermark
  return (
    <View style={styles.badge} fixed>
      <Text style={styles.badgeText}>Paid</Text>
      {paidAt && (
        <Text style={styles.badgeDate}>
          {formatDateForPdf(paidAt, locale, "short")}
        </Text>
      )}
    </View>
  );
}
