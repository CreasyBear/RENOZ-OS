/**
 * Invoice PDF Template - Apple/Linear Style
 *
 * Clean, minimal invoice with pill-style badges and card-based layout.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
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
  borderRadius,
  fontSize,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { InvoiceDocumentData, DocumentOrganization } from "../../types";

// ============================================================================
// STYLES - Clean, Minimal
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

  // Addresses - Clean layout
  addressesSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },

  // Payment info card
  paymentInfoCard: {
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  paymentInfoTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  paymentInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  paymentInfoItem: {
    minWidth: 120,
  },
  paymentInfoLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  paymentInfoValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },

  // QR Code
  qrSection: {
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  qrBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  qrText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface InvoicePdfTemplateProps {
  data: InvoiceDocumentData;
  qrCodeDataUrl?: string;
}

export interface InvoicePdfDocumentProps extends InvoicePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT
// ============================================================================

function InvoiceContent({ data, qrCodeDataUrl }: InvoicePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const { order } = data;

  // Build addresses
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
    contactName: customerAddress?.contactName,
    contactPhone: customerAddress?.contactPhone,
  };

  const resolvedNotes = data.notes ?? order.customerNotes;

  // Determine status
  const isPaid = data.isPaid;
  const isOverdue = !isPaid && data.dueDate && new Date(data.dueDate).getTime() < Date.now();
  
  const status = isPaid ? "paid" : isOverdue ? "overdue" : "pending";
  const statusDate = isPaid ? data.paidAt : data.dueDate;

  const paymentDetails = data.paymentDetails
    ? {
        bankName: data.paymentDetails.bankName,
        accountName: data.paymentDetails.accountName,
        accountNumber: data.paymentDetails.accountNumber,
        bsb: data.paymentDetails.bsb,
        swift: data.paymentDetails.swift,
        paymentInstructions: data.paymentDetails.paymentInstructions,
      }
    : null;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header with pill status */}
        <DocumentHeader
          title="Invoice"
          documentNumber={data.documentNumber}
          date={data.issueDate}
          dueDate={data.dueDate}
          reference={data.reference}
          status={status}
          statusDate={statusDate}
        />

        {/* Addresses */}
        <View style={styles.addressesSection}>
          <AddressColumns
            from={fromAddress}
            to={toAddress}
            labels={{ from: "From", to: "Bill To" }}
          />
        </View>

        {/* Line Items */}
        <LineItems
          lineItems={order.lineItems}
          showSku={order.lineItems.some((item) => item.sku)}
          showNotes={order.lineItems.some((item) => item.notes)}
        />

        {/* Summary */}
        <Summary
          subtotal={order.subtotal}
          discountAmount={order.discount}
          discountPercent={order.discountPercent}
          taxRate={order.taxRate}
          taxAmount={order.taxAmount}
          taxRegistrationNumber={organization.taxId}
          shippingAmount={order.shippingAmount}
          total={order.total}
          paidAmount={order.paidAmount}
          balanceDue={order.balanceDue}
          showBalance={!isPaid}
        />

        {/* Payment Info Card (for unpaid) */}
        {!isPaid && (
          <View style={styles.paymentInfoCard}>
            <Text style={styles.paymentInfoTitle}>Payment Details</Text>
            <View style={styles.paymentInfoGrid}>
              <View style={styles.paymentInfoItem}>
                <Text style={styles.paymentInfoLabel}>Invoice Number</Text>
                <Text style={styles.paymentInfoValue}>{data.documentNumber}</Text>
              </View>
              <View style={styles.paymentInfoItem}>
                <Text style={styles.paymentInfoLabel}>Amount Due</Text>
                <Text style={styles.paymentInfoValue}>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: organization.currency,
                  }).format(order.balanceDue || order.total)}
                </Text>
              </View>
              {data.dueDate && (
                <View style={styles.paymentInfoItem}>
                  <Text style={styles.paymentInfoLabel}>Due Date</Text>
                  <Text style={styles.paymentInfoValue}>
                    {formatDateForPdf(data.dueDate, locale, "medium")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* QR Code */}
        {qrCodeDataUrl && !isPaid && (
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <QRCode dataUrl={qrCodeDataUrl} size={80} />
              <Text style={styles.qrText}>Scan to pay</Text>
            </View>
          </View>
        )}
      </View>

      {/* Watermark (rendered after content) */}
      <PaidWatermark show={isPaid} paidAt={data.paidAt} />

      {/* Footer */}
      <DocumentFooter
        paymentDetails={paymentDetails}
        notes={resolvedNotes}
        terms={data.terms}
        showThankYou={isPaid}
        thankYouMessage="Thank you for your business"
      />

      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED COMPONENTS
// ============================================================================

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
        creator="Renoz"
      >
        <InvoiceContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function InvoicePdfTemplate({
  data,
  qrCodeDataUrl,
}: InvoicePdfTemplateProps) {
  return <InvoiceContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}

// Helper
function formatDateForPdf(date: Date, locale: string, format: "short" | "medium" | "long"): string {
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: "numeric", month: "short", day: "numeric" },
    medium: { year: "numeric", month: "long", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
  };
  return new Intl.DateTimeFormat(locale, options[format]).format(date);
}
