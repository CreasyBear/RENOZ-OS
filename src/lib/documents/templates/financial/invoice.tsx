/**
 * Invoice PDF Template
 *
 * Tighter margins (20pt), two-column From/To, 9pt typography,
 * black borders, 21pt total. Fixed header on all pages.
 */

import { useMemo } from "react";
import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  buildFinancialSummaryRows,
  buildFinancialTableRows,
  getFinancialDocumentRecipientName,
  resolveFinancialDocumentAddresses,
} from "../../financial-presentation";
import {
  PageNumber,
  PaidWatermark,
  DocumentFixedHeader,
  DocumentBodyText,
  DocumentInfoPanel,
  DocumentMasthead,
  DocumentPanelGrid,
  DocumentSectionCard,
  DocumentSplitRow,
  DocumentSummaryCard,
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
  secondaryAddressSection: {
    marginTop: 12,
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
  dataTable: {
    marginTop: 12,
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
  const tableRows = buildFinancialTableRows(order);
  const hasPerItemTax = tableRows.some(item => item.taxRate != null);

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;

  const fromAddressLines = formatAddressLines(organization.address);
  const { billTo, shipTo, showShipTo } = resolveFinancialDocumentAddresses(order);
  const billToAddressLines = formatAddressLines(billTo);
  const shipToAddressLines = formatAddressLines(shipTo);
  const billToName = getFinancialDocumentRecipientName(billTo, order.customer.name);
  const shipToName = getFinancialDocumentRecipientName(shipTo, order.customer.name);
  const summaryRows = buildFinancialSummaryRows(order, { includeBalanceDue: !isPaid }).map((row) =>
    row.key === "balanceDue" ? { ...row, emphasized: false } : row
  );
  const balanceDue = order.balanceDue ?? order.total;
  const paymentLines = [
    data.paymentDetails?.bankName ? `Bank: ${data.paymentDetails.bankName}` : null,
    data.paymentDetails?.accountName ? `Account: ${data.paymentDetails.accountName}` : null,
    data.paymentDetails?.bsb ? `BSB: ${data.paymentDetails.bsb}` : null,
    data.paymentDetails?.accountNumber ? `Account #: ${data.paymentDetails.accountNumber}` : null,
  ].filter((line): line is string => Boolean(line));
  const dueLabel = isPaid
    ? "Paid in full"
    : data.dueDate
      ? formatDateForPdf(data.dueDate, locale, "short")
      : "On receipt";
  const dueDetail = isPaid
    ? data.paidAt
      ? `Paid ${formatDateForPdf(data.paidAt, locale, "short")}`
      : "No balance outstanding"
    : `Balance due ${formatCurrencyForPdf(balanceDue, organization.currency, locale)}`;
  const summaryCardRows = summaryRows.map((row) => ({
    key: row.key,
    label: row.label,
    value: formatCurrencyForPdf(row.amount, organization.currency, locale),
    emphasized: row.emphasized,
  }));

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Invoice"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        <DocumentMasthead
          title="Invoice"
          variant="formal"
          meta={[
            { label: "Invoice", value: data.documentNumber },
            { label: "Issue Date", value: formatDateForPdf(data.issueDate, locale, "short") },
            { label: "Customer", value: order.customer.name },
          ]}
          callout={{
            eyebrow: isPaid ? "Paid" : "Pay By",
            title: dueLabel,
            detail: dueDetail,
            tone: isPaid ? "success" : isOverdue ? "warning" : "info",
          }}
          logoUrl={logoUrl}
        />

        <DocumentPanelGrid
          left={
            <DocumentInfoPanel
              label="From"
              variant="formal"
              name={organization.name}
              lines={[
                ...(organization.taxId ? [`ABN: ${organization.taxId}`] : []),
                ...fromAddressLines,
                ...(organization.phone ? [organization.phone] : []),
              ]}
            />
          }
          right={
            showShipTo ? (
              <View>
                <DocumentInfoPanel
                  label="Bill To"
                  variant="formal"
                  name={billToName}
                  lines={billToAddressLines}
                />
                <View style={{ marginTop: 12 }}>
                  <DocumentInfoPanel
                    label="Ship To"
                    variant="formal"
                    name={shipToName}
                    lines={shipToAddressLines}
                  />
                </View>
              </View>
            ) : (
              <DocumentInfoPanel
                label="Bill To"
                variant="formal"
                name={billToName}
                lines={billToAddressLines}
              />
            )
          }
        />

        {/* Line Items Table */}
        <View style={[styles.table, styles.dataTable]}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, hasPerItemTax ? styles.colDescriptionWithTax : styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            {hasPerItemTax && (
              <Text style={[styles.tableHeaderCell, styles.colTax]}>GST %</Text>
            )}
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount ex GST</Text>
          </View>

          {/* Rows */}
          {tableRows.length === 0 ? (
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
            tableRows.map((item) => (
            <View key={item.key} style={styles.tableRow} wrap={true}>
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
                {formatCurrencyForPdf(item.amount, organization.currency, locale)}
              </Text>
            </View>
            ))
          )}
        </View>

        <DocumentSplitRow
          left={
            <View>
              {paymentLines.length > 0 ? (
                <DocumentSectionCard title="Payment Details" variant="formal">
                  <>
                    {paymentLines.map((line) => (
                      <DocumentBodyText key={line}>{line}</DocumentBodyText>
                    ))}
                  </>
                </DocumentSectionCard>
              ) : null}
              {data.notes ? (
                <DocumentSectionCard title="Notes" variant="formal">
                  <DocumentBodyText>{data.notes}</DocumentBodyText>
                </DocumentSectionCard>
              ) : null}
              {data.terms ? (
                <DocumentSectionCard title="Terms" variant="formal">
                  <DocumentBodyText>{data.terms}</DocumentBodyText>
                </DocumentSectionCard>
              ) : null}
            </View>
          }
          right={<DocumentSummaryCard rows={summaryCardRows} variant="formal" />}
        />


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
