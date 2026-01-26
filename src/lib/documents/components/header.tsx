/**
 * PDF Document Header Component
 *
 * Displays organization logo, document title, and metadata (number, dates).
 */

import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import { colors, fontSize, spacing, FONT_FAMILY, FONT_WEIGHTS } from "./theme";
import { formatDateForPdf } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  logoContainer: {
    maxWidth: 200,
  },
  logo: {
    height: 60,
    objectFit: "contain",
  },
  metaContainer: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: fontSize["3xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginRight: spacing.sm,
    width: 80,
    textAlign: "right",
  },
  metaValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    width: 100,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentHeaderProps {
  /** Document title (e.g., "QUOTE", "INVOICE") */
  title: string;
  /** Document number (e.g., "Q-2024-001") */
  documentNumber: string;
  /** Document date */
  date: Date;
  /** Optional validity date (for quotes) */
  validUntil?: Date | null;
  /** Optional due date (for invoices) */
  dueDate?: Date | null;
  /** Labels for the header fields */
  labels?: {
    documentNumber?: string;
    date?: string;
    validUntil?: string;
    dueDate?: string;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Document header with logo and metadata
 *
 * @example
 * <DocumentHeader
 *   title="QUOTE"
 *   documentNumber="Q-2024-001"
 *   date={new Date()}
 *   validUntil={validUntilDate}
 * />
 */
export function DocumentHeader({
  title,
  documentNumber,
  date,
  validUntil,
  dueDate,
  labels = {},
}: DocumentHeaderProps) {
  const { organization, locale, primaryColor } = useOrgDocument();

  const {
    documentNumber: numberLabel = "Number:",
    date: dateLabel = "Date:",
    validUntil: validUntilLabel = "Valid Until:",
    dueDate: dueDateLabel = "Due Date:",
  } = labels;

  return (
    <View style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        {organization.branding?.logoUrl ? (
          <Image src={organization.branding.logoUrl} style={styles.logo} />
        ) : (
          <Text
            style={[
              styles.title,
              { fontSize: fontSize["2xl"], color: primaryColor },
            ]}
          >
            {organization.name}
          </Text>
        )}
      </View>

      {/* Meta Section */}
      <View style={styles.metaContainer}>
        <Text style={[styles.title, { color: primaryColor }]}>{title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{numberLabel}</Text>
          <Text style={styles.metaValue}>{documentNumber}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{dateLabel}</Text>
          <Text style={styles.metaValue}>{formatDateForPdf(date, locale)}</Text>
        </View>

        {validUntil && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{validUntilLabel}</Text>
            <Text style={styles.metaValue}>
              {formatDateForPdf(validUntil, locale)}
            </Text>
          </View>
        )}

        {dueDate && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{dueDateLabel}</Text>
            <Text style={styles.metaValue}>
              {formatDateForPdf(dueDate, locale)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
