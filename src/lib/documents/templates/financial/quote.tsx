/**
 * Quote PDF Template
 *
 * Generates professional quote documents with organization branding.
 * Uses comprehensive document types for full data support.
 */

import { Document, Page, StyleSheet, View } from "@react-pdf/renderer";
import {
  DocumentHeader,
  AddressColumns,
  LineItems,
  Summary,
  DocumentFooter,
  PageNumber,
  QRCode,
  pageMargins,
  colors,
  spacing,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { QuoteDocumentData, DocumentOrganization } from "../../types";

// ============================================================================
// STYLES
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
  },
  qrSection: {
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface QuotePdfTemplateProps {
  /** Quote document data */
  data: QuoteDocumentData;
  /** Optional QR code data URL (pre-generated) */
  qrCodeDataUrl?: string;
}

export interface QuotePdfDocumentProps extends QuotePdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function QuoteContent({ data, qrCodeDataUrl }: QuotePdfTemplateProps) {
  const { organization } = useOrgDocument();

  const { order } = data;

  // Build "from" address from organization
  const fromAddress = {
    name: organization.name,
    addressLine1: organization.address?.addressLine1,
    addressLine2: organization.address?.addressLine2,
    city: organization.address?.city,
    state: organization.address?.state,
    postalCode: organization.address?.postalCode,
    country: organization.address?.country,
    phone: organization.phone,
    email: organization.email,
    website: organization.website,
    taxId: organization.taxId,
  };

  // Build "to" address from billing address (preferred) or customer address (fallback)
  const customerAddress = order.billingAddress ?? order.customer.address;
  const toAddress = {
    name: order.customer.name,
    addressLine1: customerAddress?.addressLine1,
    addressLine2: customerAddress?.addressLine2,
    city: customerAddress?.city,
    state: customerAddress?.state,
    postalCode: customerAddress?.postalCode,
    country: customerAddress?.country,
    email: order.customer.email,
    phone: order.customer.phone,
    taxId: order.customer.taxId,
    // Include contact name from address if different from customer name
    contactName: customerAddress?.contactName,
    contactPhone: customerAddress?.contactPhone,
  };

  // Resolve notes: document notes take precedence, fall back to order customer notes
  const resolvedNotes = data.notes ?? order.customerNotes;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header with logo and document info */}
        <DocumentHeader
          title="QUOTE"
          documentNumber={data.documentNumber}
          date={data.issueDate}
          validUntil={data.validUntil}
        />

        {/* From/To addresses */}
        <AddressColumns from={fromAddress} to={toAddress} />

        {/* Line items table - pass full DocumentLineItem objects */}
        <LineItems
          lineItems={order.lineItems}
          showSku={order.lineItems.some((item) => item.sku)}
          showNotes={order.lineItems.some((item) => item.notes)}
          alternateRows
        />

        {/* Totals summary with all financial details */}
        <Summary
          subtotal={order.subtotal}
          discountAmount={order.discount}
          discountPercent={order.discountPercent}
          taxRate={order.taxRate}
          taxAmount={order.taxAmount}
          shippingAmount={order.shippingAmount}
          total={order.total}
        />

        {/* Footer with terms and notes */}
        <DocumentFooter terms={data.terms} notes={resolvedNotes} />

        {/* QR Code for quick access */}
        {qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <QRCode dataUrl={qrCodeDataUrl} size={60} />
          </View>
        )}
      </View>

      {/* Page numbers */}
      <PageNumber />
    </Page>
  );
}

// ============================================================================
// EXPORTED COMPONENT
// ============================================================================

/**
 * Quote PDF Template
 *
 * Renders a complete quote document with organization branding.
 * Must be used with renderPdfToBuffer or similar PDF rendering function.
 *
 * @example
 * const qrCode = await generateQRCode(`https://app.example.com/quotes/${quoteId}`);
 * const { buffer } = await renderPdfToBuffer(
 *   <QuotePdfDocument organization={org} data={quoteData} qrCodeDataUrl={qrCode} />
 * );
 */
export function QuotePdfDocument({
  organization,
  data,
  qrCodeDataUrl,
}: QuotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Quote ${data.documentNumber}`}
        author={organization.name}
        subject={`Quote for ${data.order.customer.name}`}
        creator="Renoz CRM"
      >
        <QuoteContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Quote PDF Template (for use within existing Document/Provider)
 *
 * Use this when you need to control the Document wrapper yourself,
 * or when rendering multiple quotes in a single PDF.
 */
export function QuotePdfTemplate({ data, qrCodeDataUrl }: QuotePdfTemplateProps) {
  return <QuoteContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}
