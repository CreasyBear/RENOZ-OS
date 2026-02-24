/**
 * Serial Numbers Cell - PDF Component
 *
 * Comma-separated inline display. No chips, no decorative styling.
 * Courier for scannability. Black text only (branding-compliant).
 */

import { Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSize } from "./theme";

// ============================================================================
// STYLES - Plain text, no fills
// ============================================================================

const styles = StyleSheet.create({
  text: {
    fontSize: fontSize.xs,
    fontFamily: "Courier",
    color: colors.text.primary,
  },
  empty: {
    fontSize: fontSize.xs,
    fontFamily: "Courier",
    color: colors.text.muted,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface SerialNumbersCellProps {
  serialNumbers: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SerialNumbersCell({ serialNumbers }: SerialNumbersCellProps) {
  if (!serialNumbers || serialNumbers.length === 0) {
    return <Text style={styles.empty}>—</Text>;
  }

  return <Text style={styles.text}>{serialNumbers.join(", ")}</Text>;
}
