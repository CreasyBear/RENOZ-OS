/**
 * Invoice PDF Template
 *
 * Tighter margins (20pt), two-column From/To, 9pt typography,
 * black borders, 21pt total. Fixed header on all pages.
 */

import { useMemo } from "react";
import { Document, Page, StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import {
  PageNumber,
  PaidWatermark,
  DocumentFixedHeader,
  formatAddressLines,
  colors,
  tabularNums,
  FONT_FAMILY,
  FONT_WEIGHTS,
  formatCurrencyForPdf,
  formatDateForPdf,
  DOCUMENT_PAGE_MARGINS,
  DOCUMENT_FIXED_HEADER_CLEARANCE,
  DOCUMENT_BORDER_COLOR,
  DOCUMENT_LOGO_HEIGHT,
  DOCUMENT_LOGO_MAX_WIDTH,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { InvoiceDocumentData, DocumentOrganization } from "../../types";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    paddingTop: DOCUMENT_PAGE_MARGINS.top,
    paddingBottom: DOCUMENT_PAGE_MARGINS.bottom,
    paddingLeft: DOCUMENT_PAGE_MARGINS.left,
    paddingRight: DOCUMENT_PAGE_MARGINS.right,
    backgroundColor: colors.background.white,
    color: colors.text.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
  },
  content: {
    flex: 1,
    marginTop: DOCUMENT_FIXED_HEADER_CLEARANCE,
  },

  // Header: Meta left, Logo right
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  metaSection: {
    flex: 1,
  },
  metaTitle: {
    fontSize: 21,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  statusText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginTop: 4,
  },
  logoWrapper: {
    maxWidth: DOCUMENT_LOGO_MAX_WIDTH,
  },
  logo: {
    height: DOCUMENT_LOGO_HEIGHT,
    objectFit: "contain",
  },

  // From/To two-column
  fromToRow: {
    flexDirection: "row",
    marginTop: 20,
  },
  fromColumn: {
    flex: 1,
    marginRight: 10,
  },
  toColumn: {
    flex: 1,
    marginLeft: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionName: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sectionDetail: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

  // Table - 9pt, 5pt row padding, black borders
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: DOCUMENT_BORDER_COLOR,
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: DOCUMENT_BORDER_COLOR,
    alignItems: "flex-start",
  },
  tableCell: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.4,
  },
  tableCellNumeric: {
    ...tabularNums,
  },
  tableCellMuted: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  colDescription: { flex: 4 },
  colQty: { flex: 0.8, textAlign: "center" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTax: { flex: 0.8, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  colDescriptionWithTax: { flex: 3.5 },

  // Summary - marginTop 60, width 250, total 21pt
  summarySection: {
    marginTop: 60,
    marginBottom: 40,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: 250,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "right",
    ...tabularNums,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
    paddingTop: 5,
    marginTop: 5,
  },
  summaryTotalLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 21,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "right",
    ...tabularNums,
  },
  balanceDue: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
    paddingTop: 5,
    marginTop: 5,
  },
  balanceDueLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  balanceDueValue: {
    fontSize: 21,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    textAlign: "right",
    ...tabularNums,
  },

  // Payment/Notes two-column
  paymentNotesRow: {
    flexDirection: "row",
    marginTop: 20,
  },
  paymentColumn: {
    flex: 1,
    marginRight: 10,
  },
  notesColumn: {
    flex: 1,
    marginLeft: 10,
  },
  paymentTitle: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.4,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
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
}

export interface InvoicePdfDocumentProps extends InvoicePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// COMPONENT
// ============================================================================

function InvoiceContent({ data }: InvoicePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const { order } = data;

  const isPaid = data.isPaid;
  // eslint-disable-next-line react-hooks/purity -- cached "now" for PDF render is intentional
  const now = useMemo(() => Date.now(), []);
  const isOverdue = !isPaid && data.dueDate && new Date(data.dueDate).getTime() < now;

  // Check if any line items have per-item tax rates
  const hasPerItemTax = order.lineItems.some(item => item.taxRate != null);

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;

  const fromAddressLines = formatAddressLines(organization.address);
  const toAddressLines = formatAddressLines(order.billingAddress);

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Invoice"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header: Meta left, Logo right  */}
        <View style={styles.headerRow}>
          <View style={styles.metaSection}>
            <Text style={styles.metaTitle}>Invoice</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice: </Text>
              <Text style={styles.metaValue}>{data.documentNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date: </Text>
              <Text style={styles.metaValue}>
                {formatDateForPdf(data.issueDate, locale, "short")}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due: </Text>
              <Text style={styles.metaValue}>
                {data.dueDate
                  ? formatDateForPdf(data.dueDate, locale, "short")
                  : "On receipt"}
              </Text>
            </View>
            {!isPaid && !isOverdue && data.dueDate && (
              <Text style={styles.statusText}>
                Due {formatDateForPdf(data.dueDate, locale, "short")}
              </Text>
            )}
            {isPaid && <Text style={styles.statusText}>Paid</Text>}
            {isOverdue && <Text style={styles.statusText}>Overdue</Text>}
          </View>

          {logoUrl && (
            <View style={styles.logoWrapper}>
              <Image src={logoUrl} style={styles.logo} />
            </View>
          )}
        </View>

        {/* From / Bill To two-column */}
        <View style={styles.fromToRow}>
          <View style={styles.fromColumn}>
            <Text style={styles.sectionLabel}>From</Text>
            <Text style={styles.sectionName}>{organization.name}</Text>
            {organization.taxId && (
              <Text style={styles.sectionDetail}>ABN: {organization.taxId}</Text>
            )}
            {fromAddressLines.map((line) => (
              <Text key={line} style={styles.sectionDetail}>{line}</Text>
            ))}
            {organization.phone && (
              <Text style={styles.sectionDetail}>{organization.phone}</Text>
            )}
          </View>
          <View style={styles.toColumn}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.sectionName}>{order.customer.name}</Text>
            {toAddressLines.length > 0 ? (
              toAddressLines.map((line) => (
                <Text key={line} style={styles.sectionDetail}>{line}</Text>
              ))
            ) : (
              <Text style={styles.sectionDetail}>—</Text>
            )}
          </View>
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
          {order.lineItems.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDescription]}>—</Text>
              <Text style={[styles.tableCell, styles.colQty]}>—</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>—</Text>
              {hasPerItemTax && (
                <Text style={[styles.tableCell, styles.colTax]}>—</Text>
              )}
              <Text style={[styles.tableCell, styles.colTotal]}>—</Text>
            </View>
          ) : (
            order.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={true}>
              <View style={hasPerItemTax ? styles.colDescriptionWithTax : styles.colDescription}>
                <Text style={styles.tableCell}>{item.description}</Text>
                {item.sku && <Text style={styles.tableCellMuted}>{item.sku}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.tableCellNumeric, styles.colQty]}>{String(item.quantity)}</Text>
              <Text style={[styles.tableCell, styles.tableCellNumeric, styles.colPrice]}>
                {formatCurrencyForPdf(item.unitPrice, organization.currency, locale)}
              </Text>
              {hasPerItemTax && (
                <Text style={[styles.tableCell, styles.tableCellNumeric, styles.colTax]}>
                  {item.taxRate != null ? `${item.taxRate}%` : "-"}
                </Text>
              )}
              <Text style={[styles.tableCell, styles.tableCellNumeric, styles.colTotal]}>
                {formatCurrencyForPdf(item.total, organization.currency, locale)}
              </Text>
            </View>
            ))
          )}
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

        {/* Payment / Notes two-column  */}
        {(data.paymentDetails || data.notes || data.terms) && (
          <View style={styles.paymentNotesRow} wrap={false}>
            <View style={styles.paymentColumn}>
              {data.paymentDetails && (
                <>
                  <Text style={styles.paymentTitle}>Payment Details</Text>
                  {data.paymentDetails.bankName && (
                    <Text style={styles.paymentValue}>Bank: {data.paymentDetails.bankName}</Text>
                  )}
                  {data.paymentDetails.accountName && (
                    <Text style={styles.paymentValue}>Account: {data.paymentDetails.accountName}</Text>
                  )}
                  {data.paymentDetails.bsb && (
                    <Text style={styles.paymentValue}>BSB: {data.paymentDetails.bsb}</Text>
                  )}
                  {data.paymentDetails.accountNumber && (
                    <Text style={styles.paymentValue}>Account #: {data.paymentDetails.accountNumber}</Text>
                  )}
                </>
              )}
            </View>
            <View style={styles.notesColumn}>
              {data.notes && (
                <>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText} orphans={2} widows={2}>{data.notes}</Text>
                </>
              )}
              {data.terms && (
                <>
                  <Text style={[styles.notesLabel, { marginTop: data.notes ? 8 : 0 }]}>Terms</Text>
                  <Text style={styles.notesText} orphans={2} widows={2}>{data.terms}</Text>
                </>
              )}
            </View>
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
        <InvoiceContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function InvoicePdfTemplate({ data }: InvoicePdfTemplateProps) {
  return <InvoiceContent data={data} />;
}
