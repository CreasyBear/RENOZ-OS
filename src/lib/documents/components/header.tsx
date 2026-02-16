/**
 * PDF Document Header Component - Apple/Linear Style
 *
 * Clean, minimal header with subtle branding and clear hierarchy.
 * No accent bars - just typography and spacing.
 */

import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import {
  colors,
  fontSize,
  spacing,
  letterSpacing,
  borderRadius,
  pageMargins,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";
import { formatDateForPdf } from "./theme";

// ============================================================================
// STYLES - Clean, Minimal
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing["2xl"],
  },

  // Logo section
  logoSection: {
    flex: 1,
  },
  logo: {
    height: 40,
    objectFit: "contain",
  },
  logoPlaceholder: {
    fontSize: fontSize.xl,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },

  // Document meta section
  metaSection: {
    alignItems: "flex-end",
  },
  documentType: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: letterSpacing.wide,
    marginBottom: spacing.xs,
  },
  documentNumber: {
    fontSize: fontSize["2xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.tight,
    marginBottom: spacing.sm,
  },

  // Meta rows
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    textAlign: "right",
  },
  metaValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    minWidth: 100,
    textAlign: "right",
  },

  // Status pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  pillSuccess: {
    backgroundColor: "#E8F5E9",
  },
  pillWarning: {
    backgroundColor: "#FFF3E0",
  },
  pillError: {
    backgroundColor: "#FFEBEE",
  },
  pillText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  pillTextSuccess: {
    color: "#2E7D32",
  },
  pillTextWarning: {
    color: "#E65100",
  },
  pillTextError: {
    color: "#C62828",
  },

  // Fixed header (repeats on every page)
  fixedHeader: {
    position: "absolute" as const,
    top: pageMargins.top - 8,
    left: pageMargins.left,
    right: pageMargins.right,
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  fixedHeaderOrg: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
  fixedHeaderDoc: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface FixedDocumentHeaderProps {
  /** Organization name */
  orgName: string;
  /** Document type (e.g. "Quote", "Invoice") */
  documentType: string;
  /** Document number (e.g. "Q-2024-001") */
  documentNumber: string;
}

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
  /** Optional reference number (PO number, etc.) */
  reference?: string | null;
  /** Optional status indicator */
  status?: "draft" | "sent" | "paid" | "overdue" | "pending";
  /** Status date (paid date, due date, etc.) */
  statusDate?: Date | null;
}

// ============================================================================
// FIXED DOCUMENT HEADER (repeats on every page)
// ============================================================================

export function FixedDocumentHeader({
  orgName,
  documentType,
  documentNumber,
}: FixedDocumentHeaderProps) {
  return (
    <View fixed style={styles.fixedHeader}>
      <Text style={styles.fixedHeaderOrg}>{orgName}</Text>
      <Text style={styles.fixedHeaderDoc}>
        {documentType} {documentNumber}
      </Text>
    </View>
  );
}

// ============================================================================
// DOCUMENT HEADER (flowing, full meta)
// ============================================================================

export function DocumentHeader({
  title,
  documentNumber,
  date,
  validUntil,
  dueDate,
  reference,
  status,
  statusDate,
}: DocumentHeaderProps) {
  const { organization, locale } = useOrgDocument();

  // Status pill config
  const statusConfig = {
    paid: { bg: styles.pillSuccess, text: styles.pillTextSuccess, label: "Paid" },
    overdue: { bg: styles.pillError, text: styles.pillTextError, label: "Overdue" },
    pending: { bg: styles.pillWarning, text: styles.pillTextWarning, label: "Payment Due" },
    sent: { bg: styles.pillSuccess, text: styles.pillTextSuccess, label: "Sent" },
    draft: { bg: styles.pillWarning, text: styles.pillTextWarning, label: "Draft" },
  };

  return (
    <View style={styles.container}>
      {/* Logo Section - prefer logoDataUrl (pre-fetched) over logoUrl */}
      <View style={styles.logoSection}>
        {organization.branding?.logoDataUrl ? (
          <Image
            src={organization.branding.logoDataUrl}
            style={styles.logo}
          />
        ) : (
          <Text style={styles.logoPlaceholder}>
            {organization.name}
          </Text>
        )}
      </View>

      {/* Meta Section */}
      <View style={styles.metaSection}>
        {/* Document Type */}
        <Text style={styles.documentType}>{title}</Text>

        {/* Document Number - Prominent */}
        <Text style={styles.documentNumber}>{documentNumber}</Text>

        {/* Date */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>
            {formatDateForPdf(date, locale, "medium")}
          </Text>
        </View>

        {/* Due Date */}
        {dueDate && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Due</Text>
            <Text style={styles.metaValue}>
              {formatDateForPdf(dueDate, locale, "medium")}
            </Text>
          </View>
        )}

        {/* Valid Until */}
        {validUntil && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Valid until</Text>
            <Text style={styles.metaValue}>
              {formatDateForPdf(validUntil, locale, "medium")}
            </Text>
          </View>
        )}

        {/* Reference */}
        {reference && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Reference</Text>
            <Text style={styles.metaValue}>{reference}</Text>
          </View>
        )}

        {/* Status Pill */}
        {status && statusConfig[status] && (
          <View style={[styles.pill, statusConfig[status].bg]}>
            <Text style={[styles.pillText, statusConfig[status].text]}>
              {statusConfig[status].label}
            </Text>
            {statusDate && (
              <Text style={[styles.pillText, statusConfig[status].text]}>
                {formatDateForPdf(statusDate, locale, "short")}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
