/**
 * Quote PDF Template - Apple/Linear Style
 *
 * Clean, minimal quote with elegant acceptance section.
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
  pageMargins,
  colors,
  spacing,
  borderRadius,
  fontSize,
  FONT_FAMILY,
  FONT_WEIGHTS,
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

  addressesSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },

  // Validity card
  validityCard: {
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  validityLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
  },
  validityValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },

  // Acceptance section
  acceptanceSection: {
    marginTop: spacing["2xl"],
    paddingTop: spacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.light,
  },
  acceptanceTitle: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  acceptanceText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.5,
    marginBottom: spacing.lg,
  },
  signatureRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.dark,
    height: 48,
    marginBottom: spacing.xs,
  },
  signatureLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
  },
  dateBlock: {
    width: 100,
  },

  // QR Section
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

export interface QuotePdfTemplateProps {
  data: QuoteDocumentData;
  qrCodeDataUrl?: string;
}

export interface QuotePdfDocumentProps extends QuotePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT
// ============================================================================

function QuoteContent({ data, qrCodeDataUrl }: QuotePdfTemplateProps) {
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

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(data.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header */}
        <DocumentHeader
          title="Quote"
          documentNumber={data.documentNumber}
          date={data.issueDate}
          validUntil={data.validUntil}
          reference={data.reference}
        />

        {/* Addresses */}
        <View style={styles.addressesSection}>
          <AddressColumns
            from={fromAddress}
            to={toAddress}
            labels={{ from: "From", to: "Quote To" }}
          />
        </View>

        {/* Validity Card */}
        <View style={styles.validityCard}>
          <Text style={styles.validityLabel}>Quote valid until</Text>
          <Text style={styles.validityValue}>
            {new Intl.DateTimeFormat(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(data.validUntil))}
            {daysUntilExpiry <= 7 && daysUntilExpiry >= 0 &&
              ` · ${daysUntilExpiry} days left`}
          </Text>
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
        />

        {/* Acceptance Section */}
        <View style={styles.acceptanceSection}>
          <Text style={styles.acceptanceTitle}>Acceptance</Text>
          <Text style={styles.acceptanceText}>
            Please sign below to accept this quote. By accepting, you agree to
            the terms and conditions. Work will commence upon receipt of signed
            acceptance and any required deposit.
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

        {/* QR Code */}
        {qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <QRCode dataUrl={qrCodeDataUrl} size={80} />
              <Text style={styles.qrText}>Scan to view</Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <DocumentFooter
        terms={data.terms}
        notes={resolvedNotes}
      />

      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED COMPONENTS
// ============================================================================

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
        creator="Renoz"
      >
        <QuoteContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function QuotePdfTemplate({
  data,
  qrCodeDataUrl,
}: QuotePdfTemplateProps) {
  return <QuoteContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}
