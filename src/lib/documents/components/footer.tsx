/**
 * PDF Document Footer Component - Premium Design
 *
 * Displays terms, notes, payment details, and page numbers
 * with professional styling and clear visual hierarchy.
 *
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  colors,
  fontSize,
  spacing,
  lineHeight,
  letterSpacing,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";

// ============================================================================
// STYLES - Premium Footer Design
// ============================================================================

const styles = StyleSheet.create({
  // Main container
  container: {
    marginTop: spacing.xl,
  },

  // Divider
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginBottom: spacing.lg,
  },

  // Two-column layout
  twoColumn: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  column: {
    flex: 1,
  },
  columnLeft: {
    marginRight: spacing.lg,
  },
  columnRight: {
    marginLeft: spacing.lg,
  },

  // Section styles
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: letterSpacing.wide,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: lineHeight.relaxed,
  },

  // Payment details grid
  paymentRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  paymentLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    width: 100,
  },
  paymentValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    flex: 1,
  },

  // Terms section
  termsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.light,
  },
  termsText: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: lineHeight.normal,
  },

  // Page number
  pageNumber: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    textAlign: "center",
  },
  pageNumberText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
  },

  // QR Code section
  qrSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.md,
  },
  qrLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },

  // Thank you message
  thankYou: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  thankYouText: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    fontStyle: "italic",
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
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionContent}>{terms}</Text>
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
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionContent}>{notes}</Text>
    </View>
  );
}

// ============================================================================
// PAYMENT DETAILS COMPONENT
// ============================================================================

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
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>

      {bankName && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Bank</Text>
          <Text style={styles.paymentValue}>{bankName}</Text>
        </View>
      )}

      {accountName && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Account Name</Text>
          <Text style={styles.paymentValue}>{accountName}</Text>
        </View>
      )}

      {bsb && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>BSB</Text>
          <Text style={styles.paymentValue}>{bsb}</Text>
        </View>
      )}

      {accountNumber && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Account Number</Text>
          <Text style={styles.paymentValue}>{accountNumber}</Text>
        </View>
      )}

      {swift && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>SWIFT</Text>
          <Text style={styles.paymentValue}>{swift}</Text>
        </View>
      )}

      {paymentInstructions && (
        <Text style={[styles.sectionContent, { marginTop: spacing.sm }]}>
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
export interface PageNumberProps {
  /** Optional document number to show on every page */
  documentNumber?: string;
}

export function PageNumber({ documentNumber }: PageNumberProps = {}) {
  return (
    <View style={styles.pageNumber}>
      <Text
        style={styles.pageNumberText}
        render={({ pageNumber, totalPages }) =>
          documentNumber
            ? `${documentNumber} · Page ${pageNumber} of ${totalPages}`
            : `Page ${pageNumber} of ${totalPages}`
        }
        fixed
      />
    </View>
  );
}

// ============================================================================
// THANK YOU COMPONENT
// ============================================================================

export interface ThankYouProps {
  /** Custom message */
  message?: string;
}

/**
 * Thank you message for document footer
 */
export function ThankYou({ message = "Thank you for your business" }: ThankYouProps) {
  return (
    <View style={styles.thankYou}>
      <Text style={styles.thankYouText}>{message}</Text>
    </View>
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
  /** Show thank you message */
  showThankYou?: boolean;
  /** Custom thank you message */
  thankYouMessage?: string;
  /** QR code element */
  qrCode?: React.ReactNode;
  /** QR code label */
  qrCodeLabel?: string;
}

/**
 * Complete document footer with terms, notes, payment details
 */
export function DocumentFooter({
  terms,
  notes,
  paymentDetails,
  showDivider = true,
  showThankYou = false,
  thankYouMessage,
  qrCode,
  qrCodeLabel = "Scan to view online",
}: DocumentFooterProps) {
  const hasContent = terms || notes || paymentDetails;
  const hasTwoColumn = paymentDetails && notes;

  if (!hasContent && !showThankYou && !qrCode) {
    return null;
  }

  return (
    <View style={styles.container} wrap={false}>
      {showDivider && <View style={styles.divider} />}

      {/* Two-column layout for payment details and notes */}
      {hasTwoColumn ? (
        <View style={styles.twoColumn}>
          <View style={[styles.column, styles.columnLeft]}>
            {paymentDetails && <PaymentDetails {...paymentDetails} />}
          </View>
          <View style={[styles.column, styles.columnRight]}>
            {notes && <Notes notes={notes} />}
          </View>
        </View>
      ) : (
        <>
          {paymentDetails && <PaymentDetails {...paymentDetails} />}
          {notes && <Notes notes={notes} />}
        </>
      )}

      {/* Terms (full width) */}
      {terms && (
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>{terms}</Text>
        </View>
      )}

      {/* QR Code */}
      {qrCode && (
        <View style={styles.qrSection}>
          {qrCode}
          <Text style={styles.qrLabel}>{qrCodeLabel}</Text>
        </View>
      )}

      {/* Thank You */}
      {showThankYou && <ThankYou message={thankYouMessage} />}
    </View>
  );
}
