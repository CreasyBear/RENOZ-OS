/**
 * Serial number presentation helpers for PDF documents.
 *
 * Includes an inline cell renderer plus a shared summary block for
 * shipping documents that need a consolidated serialized-items section.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSize, spacing, borderRadius, FONT_FAMILY, FONT_WEIGHTS } from "./theme";
import {
  buildSerialManifestGroups,
  type SerialManifestLineItem,
} from "./serial-number-manifest";

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
  summarySection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.medium,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  summaryGroup: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 0.75,
    borderColor: colors.border.light,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
  },
  summaryGroupTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  summaryGroupMeta: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  summarySerialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summarySerialChip: {
    borderWidth: 0.5,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.white,
    borderRadius: borderRadius.sm,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  summarySerialText: {
    fontSize: fontSize.xs,
    fontFamily: "Courier",
    color: colors.text.primary,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface SerialNumbersCellProps {
  serialNumbers: string[];
}

export interface SerialNumbersSummaryProps {
  items: SerialManifestLineItem[];
  title?: string;
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

export function SerialNumbersSummary({
  items,
  title = "Serialized Items",
}: SerialNumbersSummaryProps) {
  const groups = buildSerialManifestGroups(items);

  if (groups.length === 0) {
    return null;
  }

  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>{title}</Text>
      {groups.map((group) => (
        <View key={group.itemKey} style={styles.summaryGroup}>
          <Text style={styles.summaryGroupTitle}>{group.title}</Text>
          <Text style={styles.summaryGroupMeta}>{group.meta}</Text>
          <View style={styles.summarySerialGrid}>
            {group.serials.map((serial) => (
              <View key={`${group.itemKey}-${serial}`} style={styles.summarySerialChip}>
                <Text style={styles.summarySerialText}>{serial}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
