/**
 * PDF Document Footer Component
 *
 * Displays terms, notes, and page numbers.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSize, spacing, FONT_FAMILY, FONT_WEIGHTS } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  content: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
});

// ============================================================================
// TERMS COMPONENT
// ============================================================================

export interface TermsProps {
  /** Terms and conditions text */
  terms: string;
  /** Section label */
  label?: string;
}

/**
 * Terms and conditions section
 */
export function Terms({ terms, label = "Terms & Conditions" }: TermsProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.content}>{terms}</Text>
    </View>
  );
}

// ============================================================================
// NOTES COMPONENT
// ============================================================================

export interface NotesProps {
  /** Notes text */
  notes: string;
  /** Section label */
  label?: string;
}

/**
 * Notes section
 */
export function Notes({ notes, label = "Notes" }: NotesProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.content}>{notes}</Text>
    </View>
  );
}

// ============================================================================
// PAYMENT DETAILS COMPONENT
// ============================================================================

const paymentStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    width: 100,
  },
  value: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    flex: 1,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
});

export interface PaymentDetailsProps {
  /** Bank name */
  bankName?: string | null;
  /** Account name */
  accountName?: string | null;
  /** Account number */
  accountNumber?: string | null;
  /** BSB (for Australian banks) */
  bsb?: string | null;
  /** SWIFT code (for international) */
  swift?: string | null;
  /** Payment instructions text */
  paymentInstructions?: string | null;
  /** Section label */
  label?: string;
}

/**
 * Payment details section for invoices
 */
export function PaymentDetails({
  bankName,
  accountName,
  accountNumber,
  bsb,
  swift,
  paymentInstructions,
  label = "Payment Details",
}: PaymentDetailsProps) {
  const hasDetails = bankName || accountName || accountNumber || bsb || swift;

  if (!hasDetails && !paymentInstructions) {
    return null;
  }

  return (
    <View style={paymentStyles.container}>
      <Text style={paymentStyles.sectionLabel}>{label}</Text>

      {bankName && (
        <View style={paymentStyles.row}>
          <Text style={paymentStyles.label}>Bank:</Text>
          <Text style={paymentStyles.value}>{bankName}</Text>
        </View>
      )}

      {accountName && (
        <View style={paymentStyles.row}>
          <Text style={paymentStyles.label}>Account Name:</Text>
          <Text style={paymentStyles.value}>{accountName}</Text>
        </View>
      )}

      {bsb && (
        <View style={paymentStyles.row}>
          <Text style={paymentStyles.label}>BSB:</Text>
          <Text style={paymentStyles.value}>{bsb}</Text>
        </View>
      )}

      {accountNumber && (
        <View style={paymentStyles.row}>
          <Text style={paymentStyles.label}>Account No:</Text>
          <Text style={paymentStyles.value}>{accountNumber}</Text>
        </View>
      )}

      {swift && (
        <View style={paymentStyles.row}>
          <Text style={paymentStyles.label}>SWIFT:</Text>
          <Text style={paymentStyles.value}>{swift}</Text>
        </View>
      )}

      {paymentInstructions && (
        <Text style={[styles.content, { marginTop: spacing.sm }]}>
          {paymentInstructions}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// PAGE NUMBER COMPONENT
// ============================================================================

/**
 * Page number display (use in Page fixed position)
 *
 * @example
 * <Page>
 *   <PageNumber />
 * </Page>
 */
export function PageNumber() {
  return (
    <Text
      style={styles.pageNumber}
      render={({ pageNumber, totalPages }) =>
        `Page ${pageNumber} of ${totalPages}`
      }
      fixed
    />
  );
}

// ============================================================================
// DOCUMENT FOOTER COMPONENT
// ============================================================================

export interface DocumentFooterProps {
  /** Terms text */
  terms?: string | null;
  /** Notes text */
  notes?: string | null;
  /** Payment details (for invoices) */
  paymentDetails?: PaymentDetailsProps | null;
  /** Whether to show divider above footer */
  showDivider?: boolean;
}

/**
 * Complete document footer with terms, notes, and payment details
 */
export function DocumentFooter({
  terms,
  notes,
  paymentDetails,
  showDivider = true,
}: DocumentFooterProps) {
  const hasContent = terms || notes || paymentDetails;

  if (!hasContent) {
    return null;
  }

  return (
    <View style={styles.container} wrap={false}>
      {showDivider && <View style={styles.divider} />}

      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1, marginRight: spacing.lg }}>
          {paymentDetails && <PaymentDetails {...paymentDetails} />}
        </View>
        <View style={{ flex: 1 }}>
          {notes && <Notes notes={notes} />}
        </View>
      </View>

      {terms && <Terms terms={terms} />}
    </View>
  );
}
