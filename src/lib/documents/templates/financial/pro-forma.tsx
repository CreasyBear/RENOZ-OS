/**
 * Pro Forma Invoice PDF Template
 *
 * 20pt margins, two-column From/Bill To, 9pt typography,
 * black borders, 21pt total. "NOT A TAX INVOICE" disclaimer.
 * Fixed header on all pages.
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
import type { DocumentOrganization, DocumentPaymentDetails } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface ProFormaLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  total: number;
  notes?: string | null;
}

export interface ProFormaCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
}

export interface ProFormaOrder {
  id: string;
  orderNumber: string;
  orderDate?: Date | null;
  customer: ProFormaCustomer;
  lineItems: ProFormaLineItem[];
  billingAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
  subtotal: number;
  discount?: number | null;
  discountPercent?: number | null;
  taxRate?: number | null;
  taxAmount: number;
  shippingAmount?: number | null;
  total: number;
  customerNotes?: string | null;
}

export interface ProFormaDocumentData {
  type: "pro-forma";
  documentNumber: string;
  issueDate: Date;
  validUntil: Date;
  order: ProFormaOrder;
  terms?: string | null;
  notes?: string | null;
  reference?: string | null;
  paymentDetails?: DocumentPaymentDetails | null;
  generatedAt?: Date | null;
}

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
  const toAddress = order.billingAddress ?? order.customer.address;
  const toAddressLines = formatAddressLines(toAddress);
  const resolvedNotes = data.notes ?? order.customerNotes;

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Pro Forma"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* NOT A TAX INVOICE disclaimer */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerText}>NOT A TAX INVOICE</Text>
          <Text style={styles.disclaimerSubtext}>
            A formal tax invoice will be issued upon order confirmation.
          </Text>
        </View>

        {/* Header: Meta left, Logo right */}
        <View style={styles.headerRow}>
          <View style={styles.metaSection}>
            <Text style={styles.metaTitle}>Pro Forma</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pro Forma: </Text>
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
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
          </View>

          {order.lineItems.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDescription]}>—</Text>
              <Text style={[styles.tableCell, styles.colQty]}>—</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>—</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>—</Text>
            </View>
          ) : (
            order.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={true}>
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

            {order.shippingAmount && order.shippingAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyForPdf(order.shippingAmount, organization.currency, locale)}
                </Text>
              </View>
            )}

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrencyForPdf(order.total, organization.currency, locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment / Notes two-column */}
        {(data.paymentDetails || resolvedNotes || data.terms) && (
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
              {resolvedNotes && (
                <>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText} orphans={2} widows={2}>{resolvedNotes}</Text>
                </>
              )}
              {data.terms && (
                <>
                  <Text style={[styles.notesLabel, { marginTop: resolvedNotes ? 8 : 0 }]}>Terms</Text>
                  <Text style={styles.notesText} orphans={2} widows={2}>{data.terms}</Text>
                </>
              )}
            </View>
          </View>
        )}
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
