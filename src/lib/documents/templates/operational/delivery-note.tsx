/**
 * Delivery Note PDF Template - Accounting Style
 *
 * Practical, dense layout focused on delivery confirmation.
 * Clear item list with checkboxes for recipient verification.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  PageNumber,
  QRCode,
  FixedDocumentHeader,
  pageMargins,
  fixedHeaderClearance,
  fontSize,
  spacing,
  colors,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { DocumentOrganization } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface DeliveryNoteLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  notes?: string | null;
  isFragile?: boolean;
  weight?: number | null;
  dimensions?: string | null;
  serialNumbers?: string[];
}

export interface DeliveryNoteDocumentData {
  documentNumber: string;
  orderNumber: string;
  issueDate: Date;
  deliveryDate: Date;
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  shippingAddress?: {
    name?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
  lineItems: DeliveryNoteLineItem[];
  carrier?: string | null;
  trackingNumber?: string | null;
  specialInstructions?: string | null;
  notes?: string | null;
}

export interface DeliveryNotePdfTemplateProps {
  data: DeliveryNoteDocumentData;
  qrCodeDataUrl?: string;
}

export interface DeliveryNotePdfDocumentProps extends DeliveryNotePdfTemplateProps {
  organization: DocumentOrganization;
}

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

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
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
  noteInfo: {
    alignItems: "flex-end",
  },
  noteTitle: {
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
    width: 100,
    textAlign: "right",
    marginRight: spacing.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    width: 120,
  },

  // Deliver To
  deliverToSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  deliverToLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  deliverToName: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  deliverToDetail: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

  // Delivery Details
  deliveryDetails: {
    flexDirection: "row",
    gap: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.subtle,
    borderRadius: 4,
  },
  deliveryItem: {
    minWidth: 80,
  },
  deliveryLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: 2,
  },
  deliveryValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },

  // Table
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
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: colors.border.medium,
    marginRight: spacing.sm,
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
  serialNumberRow: {
    flexDirection: "row" as const,
    paddingLeft: 44, // checkbox (30) + item col (14 approx)
    paddingVertical: 2,
  },
  serialNumberLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginRight: 4,
  },
  serialNumberValues: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    flex: 1,
  },
  colCheckbox: { width: 30 },
  colItem: { width: 30 },
  colSku: { flex: 1.2 },
  colDescription: { flex: 3 },
  colQty: { width: 50, textAlign: "center" },

  // Acknowledgment
  acknowledgmentSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  acknowledgmentTitle: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  acknowledgmentText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
    marginBottom: spacing.md,
  },
  signatureRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
    height: 40,
    marginBottom: spacing.xs,
  },
  signatureLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  dateBlock: {
    width: 100,
  },

  // QR Code
  qrSection: {
    position: "absolute",
    top: 32,
    right: 40,
  },
});

// ============================================================================
// COMPONENT
// ============================================================================

function DeliveryNoteContent({ data, qrCodeDataUrl }: DeliveryNotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Delivery Note"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* QR Code */}
        {qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <QRCode dataUrl={qrCodeDataUrl} size={80} />
          </View>
        )}

        {/* Header */}
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
              </>
            )}
          </View>

          <View style={styles.noteInfo}>
            <Text style={styles.noteTitle}>Delivery Note</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Note #</Text>
              <Text style={styles.infoValue}>{data.documentNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order #</Text>
              <Text style={styles.infoValue}>{data.orderNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Delivery Date</Text>
              <Text style={styles.infoValue}>
                {new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(data.deliveryDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Deliver To */}
        <View style={styles.deliverToSection}>
          <Text style={styles.deliverToLabel}>Deliver To</Text>
          <Text style={styles.deliverToName}>{data.customer.name}</Text>
          {data.shippingAddress && (
            <>
              {data.shippingAddress.contactName && (
                <Text style={styles.deliverToDetail}>{`Attn: ${data.shippingAddress.contactName}`}</Text>
              )}
              <Text style={styles.deliverToDetail}>
                {data.shippingAddress.addressLine1}
                {data.shippingAddress.addressLine2 ? `, ${data.shippingAddress.addressLine2}` : ""}
              </Text>
              <Text style={styles.deliverToDetail}>
                {`${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}`}
              </Text>
              {data.shippingAddress.contactPhone && (
                <Text style={styles.deliverToDetail}>{data.shippingAddress.contactPhone}</Text>
              )}
            </>
          )}
        </View>

        {/* Delivery Details */}
        <View style={styles.deliveryDetails}>
          {data.carrier && (
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryLabel}>Carrier</Text>
              <Text style={styles.deliveryValue}>{data.carrier}</Text>
            </View>
          )}
          {data.trackingNumber && (
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryLabel}>Tracking #</Text>
              <Text style={styles.deliveryValue}>{data.trackingNumber}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colCheckbox} />
            <Text style={[styles.tableHeaderCell, styles.colItem]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          </View>

          {data.lineItems.map((item, index) => (
            <View key={item.id} wrap={true}>
              <View style={styles.tableRow}>
                <View style={styles.colCheckbox}>
                  <View style={styles.checkbox} />
                </View>
                <Text style={[styles.tableCell, styles.colItem]}>{String(index + 1)}</Text>
                <Text style={[styles.tableCell, styles.colSku]}>{item.sku || "-"}</Text>
                <View style={styles.colDescription}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                  {item.notes && <Text style={styles.tableCellMuted}>{item.notes}</Text>}
                </View>
                <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity)}</Text>
              </View>
              {item.serialNumbers && item.serialNumbers.length > 0 && (
                <View style={styles.serialNumberRow}>
                  <Text style={styles.serialNumberLabel}>Serial Numbers:</Text>
                  <Text style={styles.serialNumberValues}>
                    {item.serialNumbers.join(", ")}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Acknowledgment */}
        <View style={styles.acknowledgmentSection}>
          <Text style={styles.acknowledgmentTitle}>Delivery Acknowledgment</Text>
          <Text style={styles.acknowledgmentText}>
            I confirm that the above items have been received in good condition. 
            I understand that any damage or shortages must be reported within 24 hours of delivery.
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Recipient Signature</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Print Name</Text>
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

export function DeliveryNotePdfDocument({
  organization,
  data,
  qrCodeDataUrl,
}: DeliveryNotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Delivery Note ${data.documentNumber}`}
        author={organization.name}
        subject={`Delivery Note for Order ${data.orderNumber}`}
        language="en-AU"
        keywords={`delivery note, ${data.documentNumber}, ${data.orderNumber}`}
        creator="Renoz"
      >
        <DeliveryNoteContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function DeliveryNotePdfTemplate({
  data,
  qrCodeDataUrl,
}: DeliveryNotePdfTemplateProps) {
  return <DeliveryNoteContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}
