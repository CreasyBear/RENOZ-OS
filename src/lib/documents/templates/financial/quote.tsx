/**
 * Quote PDF Template
 *
 * 20pt margins, two-column From/Quote To, 9pt typography,
 * black borders, 21pt total. Fixed header on all pages.
 */

import { Document, Page, StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import {
  PageNumber,
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
import type { QuoteDocumentData, DocumentOrganization } from "../../types";

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
  validityText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    marginTop: 4,
  },
  logoWrapper: {
    maxWidth: DOCUMENT_LOGO_MAX_WIDTH,
  },
  logo: {
    height: DOCUMENT_LOGO_HEIGHT,
    objectFit: "contain",
  },

  // From/Quote To two-column
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

  // Validity - plain text
  validitySection: {
    marginTop: 8,
  },
  validityLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  validityValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },

  // Terms
  termsSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  termsLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

  // Acceptance
  acceptanceSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  acceptanceTitle: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  acceptanceText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 20,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: DOCUMENT_BORDER_COLOR,
    height: 32,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
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

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;
  const fromAddressLines = formatAddressLines(organization.address);
  const toAddressLines = formatAddressLines(order.billingAddress);

  const hasPerItemTax = order.lineItems.some(item => item.taxRate != null);

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Quote"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header: Meta left, Logo right */}
        <View style={styles.headerRow}>
          <View style={styles.metaSection}>
            <Text style={styles.metaTitle}>Quote</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Quote: </Text>
              <Text style={styles.metaValue}>{data.documentNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date: </Text>
              <Text style={styles.metaValue}>
                {formatDateForPdf(data.issueDate, locale, "short")}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Valid Until: </Text>
              <Text style={styles.metaValue}>
                {formatDateForPdf(data.validUntil, locale, "short")}
              </Text>
            </View>
            <Text style={styles.validityText}>
              Valid until {formatDateForPdf(data.validUntil, locale, "short")}
            </Text>
          </View>

          {logoUrl && (
            <View style={styles.logoWrapper}>
              <Image src={logoUrl} style={styles.logo} />
            </View>
          )}
        </View>

        {/* From / Quote To two-column */}
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
            <Text style={styles.sectionLabel}>Quote To</Text>
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
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, hasPerItemTax ? styles.colDescriptionWithTax : styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
            {hasPerItemTax && (
              <Text style={[styles.tableHeaderCell, styles.colTax]}>Tax %</Text>
            )}
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
          </View>

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
                <Text style={styles.tableCell}>{item.description || "—"}</Text>
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

        {/* Summary */}
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
          </View>
        </View>

        {/* Terms */}
        {data.terms && (
          <View style={styles.termsSection}>
            <Text style={styles.termsLabel}>Terms & Conditions</Text>
            <Text style={styles.termsText} orphans={2} widows={2}>
              {data.terms}
            </Text>
          </View>
        )}

        {/* Acceptance */}
        <View style={styles.acceptanceSection} wrap={false}>
          <Text style={styles.acceptanceTitle}>Acceptance</Text>
          <Text style={styles.acceptanceText}>
            By signing below, the customer agrees to the terms above. Work will commence upon receipt of signed acceptance and any required deposit.
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Authorised signature</Text>
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
        language="en-AU"
        keywords={`quote, ${data.documentNumber}, ${data.order.customer.name}`}
      >
        <QuoteContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function QuotePdfTemplate({ data }: QuotePdfTemplateProps) {
  return <QuoteContent data={data} />;
}
