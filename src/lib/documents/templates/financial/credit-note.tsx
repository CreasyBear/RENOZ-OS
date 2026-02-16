/**
 * Credit Note PDF Template - Accounting Style
 *
 * Similar to invoice template but for credit notes/refunds.
 * Shows credit amount, reason, and related order/invoice reference.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  PageNumber,
  FixedDocumentHeader,
  pageMargins,
  fixedHeaderClearance,
  colors,
  spacing,
  fontSize,
  FONT_FAMILY,
  FONT_WEIGHTS,
  formatCurrencyForPdf,
  formatDateForPdf,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { DocumentOrganization } from "../../types";

// ============================================================================
// STYLES - Reuse invoice styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    paddingTop: pageMargins.top,
    paddingBottom: pageMargins.bottom,
    paddingLeft: pageMargins.left,
    paddingRight: pageMargins.right,
    backgroundColor: colors.background.white,
  },
  content: {
    flex: 1,
    marginTop: fixedHeaderClearance,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  companySection: {
    flex: 1,
  },
  companyName: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  companyDetail: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
  creditNoteInfo: {
    alignItems: "flex-end",
  },
  creditNoteTitle: {
    fontSize: fontSize["2xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    width: 80,
    textAlign: "right",
    marginRight: spacing.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    width: 100,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  statusApplied: {
    backgroundColor: colors.status.successLight,
  },
  statusIssued: {
    backgroundColor: colors.status.infoLight,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: "uppercase",
  },
  statusTextApplied: {
    color: colors.status.success,
  },
  statusTextIssued: {
    color: colors.status.info,
  },
  billToSection: {
    marginBottom: spacing.lg,
  },
  billToLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  billToName: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  billToDetail: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
  summarySection: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: 240,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "right",
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border.medium,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    textAlign: "right",
  },
  creditAmount: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.status.successLight,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: 4,
  },
  creditAmountLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.status.success,
  },
  creditAmountValue: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.status.success,
    textAlign: "right",
  },
  reasonSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  reasonLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
  qrSection: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface CreditNoteDocumentData {
  documentNumber: string; // e.g., "CN-2024-001"
  issueDate: Date;
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: {
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null;
  };
  amount: number; // Credit amount (positive number)
  gstAmount: number; // GST included in credit
  reason: string;
  relatedOrderNumber?: string | null;
  relatedOrderId?: string | null;
  status: "draft" | "issued" | "applied" | "voided";
  appliedToOrderId?: string | null;
  appliedAt?: Date | null;
}

export interface CreditNotePdfTemplateProps {
  data: CreditNoteDocumentData;
}

export interface CreditNotePdfDocumentProps extends CreditNotePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// COMPONENT
// ============================================================================

function CreditNoteContent({ data }: CreditNotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const isApplied = data.status === "applied";
  const isIssued = data.status === "issued";

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Credit Note"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header - Company left, Credit Note info right */}
        <View style={styles.headerRow}>
          <View style={styles.companySection}>
            <Text style={styles.companyName}>{organization.name}</Text>
            {organization.address && (
              <>
                <Text style={styles.companyDetail}>
                  {organization.address.addressLine1}
                  {organization.address.addressLine2 ? `, ${organization.address.addressLine2}` : ""}
                </Text>
                <Text style={styles.companyDetail}>
                  {`${organization.address.city}, ${organization.address.state} ${organization.address.postalCode}`}
                </Text>
                {organization.phone && (
                  <Text style={styles.companyDetail}>{organization.phone}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.creditNoteInfo}>
            <Text style={styles.creditNoteTitle}>Credit Note</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Number</Text>
              <Text style={styles.infoValue}>{data.documentNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {formatDateForPdf(data.issueDate, locale, "short")}
              </Text>
            </View>

            {data.relatedOrderNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Invoice</Text>
                <Text style={styles.infoValue}>{data.relatedOrderNumber}</Text>
              </View>
            )}

            {isApplied && (
              <View style={[styles.statusBadge, styles.statusApplied]}>
                <Text style={[styles.statusText, styles.statusTextApplied]}>Applied</Text>
              </View>
            )}
            {isIssued && !isApplied && (
              <View style={[styles.statusBadge, styles.statusIssued]}>
                <Text style={[styles.statusText, styles.statusTextIssued]}>Issued</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToLabel}>Credit To</Text>
          <Text style={styles.billToName}>{data.customer.name}</Text>
          {data.customer.address && (
            <>
              <Text style={styles.billToDetail}>
                {data.customer.address.addressLine1}
                {data.customer.address.addressLine2 ? `, ${data.customer.address.addressLine2}` : ""}
              </Text>
              <Text style={styles.billToDetail}>
                {`${data.customer.address.city}, ${data.customer.address.state} ${data.customer.address.postalCode}`}
              </Text>
            </>
          )}
        </View>

        {/* Summary - unbreakable */}
        <View style={styles.summarySection} wrap={false}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Credit Amount</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyForPdf(data.amount, organization.currency, locale)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (10%)</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyForPdf(data.gstAmount, organization.currency, locale)}
              </Text>
            </View>

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total Credit</Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrencyForPdf(data.amount + data.gstAmount, organization.currency, locale)}
              </Text>
            </View>

            <View style={styles.creditAmount}>
              <Text style={styles.creditAmountLabel}>Credit Amount</Text>
              <Text style={styles.creditAmountValue}>
                {formatCurrencyForPdf(data.amount + data.gstAmount, organization.currency, locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reason - allow orphans/widows for long text */}
        <View style={styles.reasonSection}>
          <Text style={styles.reasonLabel}>Reason for Credit</Text>
          <Text style={styles.reasonText} orphans={2} widows={2}>{data.reason}</Text>
        </View>

      </View>

      {/* Page Number */}
      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED
// ============================================================================

export function CreditNotePdfDocument({
  organization,
  data,
}: CreditNotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Credit Note ${data.documentNumber}`}
        author={organization.name}
        subject={`Credit Note for ${data.customer.name}`}
        creator="Renoz"
        language="en-AU"
        keywords={`credit note, ${data.documentNumber}, ${data.customer.name}`}
      >
        <CreditNoteContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function CreditNotePdfTemplate({ data }: CreditNotePdfTemplateProps) {
  return <CreditNoteContent data={data} />;
}
