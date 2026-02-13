/**
 * Invoice PDF Template - Accounting Style
 *
 * Practical, dense layout that fits on one page.
 * Inspired by Xero, QuickBooks, FreshBooks - not "designed", just clear.
 */

import { useMemo } from "react";
import { Document, Page, StyleSheet, View, Text, Link } from "@react-pdf/renderer";
import {
  PageNumber,
  PaidWatermark,
  QRCode,
  ExternalLinkIcon,
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
import type { InvoiceDocumentData, DocumentOrganization } from "../../types";

// ============================================================================
// STYLES - Dense, Practical
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

  // Header row - Tight
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  
  // Company info left
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

  // Invoice info right
  invoiceInfo: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
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
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPaid: {
    backgroundColor: "#E8F5E9",
  },
  statusOverdue: {
    backgroundColor: "#FFEBEE",
  },
  statusPending: {
    backgroundColor: "#FFF3E0",
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: "uppercase",
  },
  statusTextPaid: { color: "#2E7D32" },
  statusTextOverdue: { color: "#C62828" },
  statusTextPending: { color: "#E65100" },

  // Bill to section
  billToSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  billToLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  billToName: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
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

  // Table - Dense
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
  colTax: { flex: 0.8, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  // When tax column is shown, adjust description width
  colDescriptionWithTax: { flex: 3.5 },

  // Summary section
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
  balanceDue: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.text.primary,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: 4,
  },
  balanceDueLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.background.white,
  },
  balanceDueValue: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.background.white,
    textAlign: "right",
  },

  // Payment section
  paymentSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  paymentTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  paymentItem: {
    minWidth: 120,
  },
  paymentLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    marginBottom: 2,
  },
  paymentValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },

  // Footer notes
  notesSection: {
    marginTop: spacing.md,
  },
  qrSection: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
  notesLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface InvoicePdfTemplateProps {
  data: InvoiceDocumentData;
  qrCodeDataUrl?: string;
  viewOnlineUrl?: string;
}

export interface InvoicePdfDocumentProps extends InvoicePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// COMPONENT
// ============================================================================

function InvoiceContent({ data, qrCodeDataUrl, viewOnlineUrl }: InvoicePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const { order } = data;

  const isPaid = data.isPaid;
  // eslint-disable-next-line react-hooks/purity -- cached "now" for PDF render is intentional
  const now = useMemo(() => Date.now(), []);
  const isOverdue = !isPaid && data.dueDate && new Date(data.dueDate).getTime() < now;

  // Check if any line items have per-item tax rates
  const hasPerItemTax = order.lineItems.some(item => item.taxRate != null);

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Invoice"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header - Company left, Invoice info right */}
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

          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            
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
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={styles.infoValue}>
                {data.dueDate
                  ? formatDateForPdf(data.dueDate, locale, "short")
                  : "On receipt"}
              </Text>
            </View>

            {isPaid && (
              <View style={[styles.statusBadge, styles.statusPaid]}>
                <Text style={[styles.statusText, styles.statusTextPaid]}>Paid</Text>
              </View>
            )}
            {isOverdue && (
              <View style={[styles.statusBadge, styles.statusOverdue]}>
                <Text style={[styles.statusText, styles.statusTextOverdue]}>Overdue</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>{order.customer.name}</Text>
          {order.billingAddress && (
            <>
              <Text style={styles.billToDetail}>
                {order.billingAddress.addressLine1}
                {order.billingAddress.addressLine2 ? `, ${order.billingAddress.addressLine2}` : ""}
              </Text>
              <Text style={styles.billToDetail}>
                {`${order.billingAddress.city}, ${order.billingAddress.state} ${order.billingAddress.postalCode}`}
              </Text>
            </>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, hasPerItemTax ? styles.colDescriptionWithTax : styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
            {hasPerItemTax && (
              <Text style={[styles.tableHeaderCell, styles.colTax]}>Tax %</Text>
            )}
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
          </View>

          {/* Rows */}
          {order.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={true}>
              <View style={hasPerItemTax ? styles.colDescriptionWithTax : styles.colDescription}>
                <Text style={styles.tableCell}>{item.description}</Text>
                {item.sku && <Text style={styles.tableCellMuted}>{item.sku}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity)}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrencyForPdf(item.unitPrice, organization.currency, locale)}
              </Text>
              {hasPerItemTax && (
                <Text style={[styles.tableCell, styles.colTax]}>
                  {item.taxRate != null ? `${item.taxRate}%` : "-"}
                </Text>
              )}
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrencyForPdf(item.total, organization.currency, locale)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary - unbreakable */}
        <View style={styles.summarySection} wrap={false}>
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
              <Text style={styles.summaryLabel}>{`Tax (${order.taxRate || 0}%)`}</Text>
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

            {!isPaid && order.balanceDue && order.balanceDue > 0 && (
              <View style={styles.balanceDue}>
                <Text style={styles.balanceDueLabel}>Balance Due</Text>
                <Text style={styles.balanceDueValue}>
                  {formatCurrencyForPdf(order.balanceDue, organization.currency, locale)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Details - unbreakable */}
        {data.paymentDetails && (
          <View style={styles.paymentSection} wrap={false}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            <View style={styles.paymentGrid}>
              {data.paymentDetails.bankName && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Bank</Text>
                  <Text style={styles.paymentValue}>{data.paymentDetails.bankName}</Text>
                </View>
              )}
              {data.paymentDetails.accountName && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Account Name</Text>
                  <Text style={styles.paymentValue}>{data.paymentDetails.accountName}</Text>
                </View>
              )}
              {data.paymentDetails.bsb && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>BSB</Text>
                  <Text style={styles.paymentValue}>{data.paymentDetails.bsb}</Text>
                </View>
              )}
              {data.paymentDetails.accountNumber && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Account Number</Text>
                  <Text style={styles.paymentValue}>{data.paymentDetails.accountNumber}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Terms/Notes - allow orphans/widows for long text */}
        {data.terms && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Terms</Text>
            <Text style={styles.notesText} orphans={2} widows={2}>{data.terms}</Text>
          </View>
        )}

        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText} orphans={2} widows={2}>{data.notes}</Text>
          </View>
        )}

        {/* QR Code and View online link */}
        {(qrCodeDataUrl || viewOnlineUrl) && (
          <View style={styles.qrSection}>
            {qrCodeDataUrl && <QRCode dataUrl={qrCodeDataUrl} size={80} />}
            {viewOnlineUrl && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <ExternalLinkIcon size={10} color={colors.status.info} />
                <Link src={viewOnlineUrl} style={{ fontSize: fontSize.sm, color: colors.status.info }}>
                  <Text>View online</Text>
                </Link>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Paid Badge */}
      {isPaid && <PaidWatermark show={true} paidAt={data.paidAt} />}

      {/* Page Number */}
      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED
// ============================================================================

export function InvoicePdfDocument({
  organization,
  data,
  qrCodeDataUrl,
  viewOnlineUrl,
}: InvoicePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Invoice ${data.documentNumber}`}
        author={organization.name}
        subject={`Invoice for ${data.order.customer.name}`}
        creator="Renoz"
        language="en-AU"
        keywords={`invoice, ${data.documentNumber}, ${data.order.customer.name}`}
      >
        <InvoiceContent data={data} qrCodeDataUrl={qrCodeDataUrl} viewOnlineUrl={viewOnlineUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function InvoicePdfTemplate({
  data,
  qrCodeDataUrl,
  viewOnlineUrl,
}: InvoicePdfTemplateProps) {
  return <InvoiceContent data={data} qrCodeDataUrl={qrCodeDataUrl} viewOnlineUrl={viewOnlineUrl} />;
}
