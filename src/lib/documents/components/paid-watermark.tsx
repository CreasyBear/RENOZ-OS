/**
 * PDF Paid Badge Component
 *
 * Uses org branding primaryColor. Plain text, no decorative fills.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import {
  fontSize,
  spacing,
  pageMargins,
  FONT_FAMILY,
  FONT_WEIGHTS,
  letterSpacing,
} from "./theme";
import { formatDateForPdf } from "./theme";

// ============================================================================
// STYLES - Color applied via primaryColor from context
// ============================================================================

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: pageMargins.top + spacing.sm,
    right: pageMargins.right,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: "uppercase",
    letterSpacing: letterSpacing.wide,
  },
  badgeDate: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
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
  const { locale, primaryColor } = useOrgDocument();

  if (!show) {
    return null;
  }

  return (
    <View style={styles.badge} fixed>
      <Text style={[styles.badgeText, { color: primaryColor }]}>Paid</Text>
      {paidAt && (
        <Text style={[styles.badgeDate, { color: primaryColor }]}>
          {formatDateForPdf(paidAt, locale, "short")}
        </Text>
      )}
    </View>
  );
}
