/**
 * Pro Forma Invoice PDF Template
 *
 * 20pt margins, two-column From/Bill To, 9pt typography,
 * black borders, 21pt total. "NOT A TAX INVOICE" disclaimer.
 * Fixed header on all pages.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  buildFinancialSummaryRows,
  buildFinancialTableRows,
  getFinancialDocumentRecipientName,
  resolveFinancialDocumentAddresses,
} from "../../financial-presentation";
import {
  PageNumber,
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
import type {
  DocumentCustomer,
  DocumentLineItem,
  DocumentOrder,
  DocumentOrganization,
  ProFormaDocumentData as SharedProFormaDocumentData,
} from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export type ProFormaLineItem = DocumentLineItem;
export type ProFormaCustomer = DocumentCustomer;
export type ProFormaOrder = DocumentOrder;
export type ProFormaDocumentData = SharedProFormaDocumentData;

export interface ProFormaPdfTemplateProps {
  data: ProFormaDocumentData;
}

export interface ProFormaPdfDocumentProps extends ProFormaPdfTemplateProps {
  organization: DocumentOrganization;
}

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

  disclaimerBanner: {
    borderWidth: 0.5,
    borderColor: DOCUMENT_BORDER_COLOR,
    padding: 12,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  disclaimerSubtext: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

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
  logoWrapper: {
    maxWidth: DOCUMENT_LOGO_MAX_WIDTH,
  },
  logo: {
    height: DOCUMENT_LOGO_HEIGHT,
    objectFit: "contain",
  },

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
    fontSize: 10,
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
  colTotal: { flex: 1.2, textAlign: "right" },

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
// COMPONENT
// ============================================================================

function ProFormaContent({ data }: ProFormaPdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const { order } = data;

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;
  const fromAddressLines = formatAddressLines(organization.address);
  const { billTo, shipTo, showShipTo } = resolveFinancialDocumentAddresses(order);
  const billToAddressLines = formatAddressLines(billTo);
  const shipToAddressLines = formatAddressLines(shipTo);
  const billToName = getFinancialDocumentRecipientName(billTo, order.customer.name);
  const shipToName = getFinancialDocumentRecipientName(shipTo, order.customer.name);
  const summaryRows = buildFinancialSummaryRows(order);
  const tableRows = buildFinancialTableRows(order);
  const resolvedNotes = data.notes ?? order.customerNotes;
  const summaryCardRows = summaryRows.map((row) => ({
    key: row.key,
    label: row.label,
    value: formatCurrencyForPdf(row.amount, organization.currency, locale),
    emphasized: row.emphasized,
  }));
  const paymentLines = [
    data.paymentDetails?.bankName ? `Bank: ${data.paymentDetails.bankName}` : null,
    data.paymentDetails?.accountName ? `Account: ${data.paymentDetails.accountName}` : null,
    data.paymentDetails?.bsb ? `BSB: ${data.paymentDetails.bsb}` : null,
    data.paymentDetails?.accountNumber ? `Account #: ${data.paymentDetails.accountNumber}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Pro Forma"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* NOT A TAX INVOICE disclaimer */}
        <DocumentSectionCard title="Not a Tax Invoice" variant="formal">
          <DocumentBodyText>
            A formal tax invoice will be issued upon order confirmation.
          </DocumentBodyText>
        </DocumentSectionCard>

        <DocumentMasthead
          title="Pro Forma"
          variant="formal"
          meta={[
            { label: "Pro Forma", value: data.documentNumber },
            { label: "Issue Date", value: formatDateForPdf(data.issueDate, locale, "short") },
            { label: "Customer", value: order.customer.name },
          ]}
          callout={{
            eyebrow: "Valid Until",
            title: formatDateForPdf(data.validUntil, locale, "short"),
            detail: "A tax invoice will be issued after confirmation.",
            tone: "warning",
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
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount ex GST</Text>
          </View>

          {tableRows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDescription]}>—</Text>
              <Text style={[styles.tableCell, styles.colQty]}>—</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>—</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>—</Text>
            </View>
          ) : (
            tableRows.map((item) => (
            <View key={item.key} style={styles.tableRow} wrap={true}>
              <View style={styles.colDescription}>
                <Text style={styles.tableCell}>{item.description || "—"}</Text>
                {item.sku && <Text style={styles.tableCellMuted}>{item.sku}</Text>}
                {item.notes && <Text style={styles.tableCellMuted}>{item.notes}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.tableCellNumeric, styles.colQty]}>
                {String(item.quantity)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellNumeric, styles.colPrice]}>
                {formatCurrencyForPdf(item.unitPrice, organization.currency, locale)}
              </Text>
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
              {resolvedNotes ? (
                <DocumentSectionCard title="Notes" variant="formal">
                  <DocumentBodyText>{resolvedNotes}</DocumentBodyText>
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

      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED
// ============================================================================

export function ProFormaPdfDocument({
  organization,
  data,
}: ProFormaPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Pro Forma Invoice ${data.documentNumber}`}
        author={organization.name}
        subject={`Pro Forma Invoice for ${data.order.customer.name}`}
        creator="Renoz"
        language="en-AU"
        keywords={`pro forma, ${data.documentNumber}, ${data.order.customer.name}`}
      >
        <ProFormaContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function ProFormaPdfTemplate({ data }: ProFormaPdfTemplateProps) {
  return <ProFormaContent data={data} />;
}
