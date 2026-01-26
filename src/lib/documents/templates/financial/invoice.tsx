/**
 * Invoice PDF Template
 *
 * Generates professional invoice documents with organization branding,
 * payment details, balance due, and PAID watermark support.
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
  PaidWatermark,
  pageMargins,
  colors,
  spacing,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { InvoiceDocumentData, DocumentOrganization } from "../../types";

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
    position: "relative",
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

export interface InvoicePdfTemplateProps {
  /** Invoice document data */
  data: InvoiceDocumentData;
  /** Optional QR code data URL (pre-generated) */
  qrCodeDataUrl?: string;
}

export interface InvoicePdfDocumentProps extends InvoicePdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function InvoiceContent({ data, qrCodeDataUrl }: InvoicePdfTemplateProps) {
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
    // Include ABN/Tax ID for invoices (required for GST)
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

  // Determine if we should show balance section
  const showBalance = !data.isPaid && (order.paidAmount != null || order.balanceDue != null);

  return (
    <Page size="A4" style={styles.page}>
      {/* PAID watermark overlay */}
      <PaidWatermark show={data.isPaid} paidAt={data.paidAt} />

      <View style={styles.content}>
        {/* Header with logo and document info */}
        <DocumentHeader
          title="INVOICE"
          documentNumber={data.documentNumber}
          date={data.issueDate}
          dueDate={data.dueDate}
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

        {/* Totals summary with all financial details including balance */}
        <Summary
          subtotal={order.subtotal}
          discountAmount={order.discount}
          discountPercent={order.discountPercent}
          taxRate={order.taxRate}
          taxAmount={order.taxAmount}
          shippingAmount={order.shippingAmount}
          total={order.total}
          paidAmount={order.paidAmount}
          balanceDue={order.balanceDue}
          showBalance={showBalance}
        />

        {/* Footer with payment details, terms, and notes */}
        <DocumentFooter
          paymentDetails={
            data.paymentDetails
              ? {
                  bankName: data.paymentDetails.bankName,
                  accountName: data.paymentDetails.accountName,
                  accountNumber: data.paymentDetails.accountNumber,
                  bsb: data.paymentDetails.bsb,
                  swift: data.paymentDetails.swift,
                  paymentInstructions: data.paymentDetails.paymentInstructions,
                }
              : null
          }
          terms={data.terms}
          notes={resolvedNotes}
        />

        {/* QR Code for quick payment/access */}
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
 * Invoice PDF Template
 *
 * Renders a complete invoice document with organization branding,
 * payment details, balance due tracking, and optional PAID watermark.
 *
 * @example
 * const qrCode = await generateQRCode(`https://app.example.com/invoices/${invoiceId}/pay`);
 * const { buffer } = await renderPdfToBuffer(
 *   <InvoicePdfDocument organization={org} data={invoiceData} qrCodeDataUrl={qrCode} />
 * );
 */
export function InvoicePdfDocument({
  organization,
  data,
  qrCodeDataUrl,
}: InvoicePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Invoice ${data.documentNumber}`}
        author={organization.name}
        subject={`Invoice for ${data.order.customer.name}`}
        creator="Renoz CRM"
      >
        <InvoiceContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Invoice PDF Template (for use within existing Document/Provider)
 *
 * Use this when you need to control the Document wrapper yourself,
 * or when rendering multiple invoices in a single PDF.
 */
export function InvoicePdfTemplate({
  data,
  qrCodeDataUrl,
}: InvoicePdfTemplateProps) {
  return <InvoiceContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}
