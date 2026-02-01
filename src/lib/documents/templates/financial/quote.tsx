/**
 * Quote PDF Template - Accounting Style
 *
 * Practical, dense layout that fits on one page.
 * Clear, professional quote presentation.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  PageNumber,
  fontSize,
  spacing,
  colors,
  FONT_FAMILY,
  FONT_WEIGHTS,
  formatCurrencyForPdf,
  formatDateForPdf,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { QuoteDocumentData, DocumentOrganization } from "../../types";

// ============================================================================
// STYLES - Dense, Practical
// ============================================================================

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: colors.background.white,
  },
  content: {
    flex: 1,
  },

  // Header
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
  quoteInfo: {
    alignItems: "flex-end",
  },
  quoteTitle: {
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
  expiryBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#FFF3E0",
  },
  expiryText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: "#E65100",
  },

  // Quote To
  quoteToSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  quoteToLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  quoteToName: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  quoteToDetail: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

  // Table
  table: {
    marginTop: spacing.md,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  tableHeaderCell: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.secondary,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  tableCell: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  tableCellMuted: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  colDescription: { flex: 4 },
  colQty: { flex: 0.8, textAlign: "center" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },

  // Summary
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

  // Terms
  termsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  termsLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  termsText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

  // Acceptance
  acceptanceSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  acceptanceTitle: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  acceptanceText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
    marginBottom: spacing.md,
  },
  signatureRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
    height: 40,
    marginBottom: spacing.xs,
  },
  signatureLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  dateBlock: {
    width: 100,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface QuotePdfTemplateProps {
  data: QuoteDocumentData;
  qrCodeDataUrl?: string;
}

export interface QuotePdfDocumentProps extends QuotePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// COMPONENT
// ============================================================================

function QuoteContent({ data }: QuotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const { order } = data;

  const daysUntilExpiry = Math.ceil(
    (new Date(data.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header */}
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
                  {organization.address.city}, {organization.address.state} {organization.address.postalCode}
                </Text>
                {organization.phone && (
                  <Text style={styles.companyDetail}>{organization.phone}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.quoteInfo}>
            <Text style={styles.quoteTitle}>Quote</Text>
            
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
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valid Until</Text>
              <Text style={styles.infoValue}>
                {formatDateForPdf(data.validUntil, locale, "short")}
              </Text>
            </View>

            {daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
              <View style={styles.expiryBadge}>
                <Text style={styles.expiryText}>Expires in {daysUntilExpiry} days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quote To */}
        <View style={styles.quoteToSection}>
          <Text style={styles.quoteToLabel}>Quote To</Text>
          <Text style={styles.quoteToName}>{order.customer.name}</Text>
          {order.billingAddress && (
            <>
              <Text style={styles.quoteToDetail}>
                {order.billingAddress.addressLine1}
                {order.billingAddress.addressLine2 ? `, ${order.billingAddress.addressLine2}` : ""}
              </Text>
              <Text style={styles.quoteToDetail}>
                {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
              </Text>
            </>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
          </View>

          {order.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={true}>
              <View style={styles.colDescription}>
                <Text style={styles.tableCell}>{item.description}</Text>
                {item.sku && <Text style={styles.tableCellMuted}>{item.sku}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrencyForPdf(item.unitPrice, organization.currency, locale)}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrencyForPdf(item.total, organization.currency, locale)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyForPdf(order.subtotal, organization.currency, locale)}
              </Text>
            </View>
            
            {order.discount && order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={styles.summaryValue}>
                  -{formatCurrencyForPdf(order.discount, organization.currency, locale)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({order.taxRate || 0}%)</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyForPdf(order.taxAmount, organization.currency, locale)}
              </Text>
            </View>

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrencyForPdf(order.total, organization.currency, locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {data.terms && (
          <View style={styles.termsSection}>
            <Text style={styles.termsLabel}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{data.terms}</Text>
          </View>
        )}

        {/* Acceptance */}
        <View style={styles.acceptanceSection}>
          <Text style={styles.acceptanceTitle}>Acceptance</Text>
          <Text style={styles.acceptanceText}>
            Please sign below to accept this quote. By accepting, you agree to the terms and conditions outlined above. 
            Work will commence upon receipt of signed acceptance and any required deposit.
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Authorized Signature</Text>
            </View>
            <View style={styles.dateBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Date</Text>
            </View>
          </View>
        </View>
      </View>

      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED
// ============================================================================

export function QuotePdfDocument({
  organization,
  data,
}: QuotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Quote ${data.documentNumber}`}
        author={organization.name}
        subject={`Quote for ${data.order.customer.name}`}
        creator="Renoz"
      >
        <QuoteContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function QuotePdfTemplate({ data }: QuotePdfTemplateProps) {
  return <QuoteContent data={data} />;
}
