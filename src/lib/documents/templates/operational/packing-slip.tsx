/**
 * Packing Slip PDF Template
 *
 * Generates compact packing slip documents for warehouse use.
 * Features QR/barcode for order lookup, checkbox list for items (no prices),
 * and space-efficient layout for printing.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  DocumentHeader,
  AddressColumns,
  PageNumber,
  QRCode,
  pageMargins,
  colors,
  spacing,
  fontSize,
  formatDateForPdf,
} from "../../components";
import { FONT_FAMILY, FONT_WEIGHTS } from "../../fonts";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { DocumentOrganization } from "../../types";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    paddingTop: pageMargins.top - 10, // Slightly tighter margins for packing slip
    paddingBottom: pageMargins.bottom - 10,
    paddingLeft: pageMargins.left,
    paddingRight: pageMargins.right,
    backgroundColor: colors.background.white,
  },
  content: {
    flex: 1,
  },
  // Order info bar (compact horizontal layout)
  orderInfoBar: {
    flexDirection: "row",
    backgroundColor: colors.background.light,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 4,
    gap: spacing.xl,
  },
  orderInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  orderInfoLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
  orderInfoValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  // QR code section (prominent for scanning)
  qrSection: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.background.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 4,
  },
  qrLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  // Items table
  tableContainer: {
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: colors.border.dark,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.background.light,
    padding: spacing.xs,
  },
  row: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
    alignItems: "flex-start",
  },
  rowAlternate: {
    backgroundColor: colors.background.light,
  },
  // Column widths for packing slip (checkbox, qty, sku, description)
  colCheck: {
    width: 30,
    textAlign: "center",
  },
  colQty: {
    width: 50,
    textAlign: "center",
  },
  colSku: {
    width: 100,
    paddingRight: spacing.xs,
  },
  colDescription: {
    flex: 1,
    paddingRight: spacing.md,
  },
  colLocation: {
    width: 80,
    textAlign: "center",
  },
  // Text styles
  headerText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  cellText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  skuText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
  notesText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  locationText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  // Checkbox
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: colors.border.dark,
    marginLeft: "auto",
    marginRight: "auto",
  },
  // Summary section
  summarySection: {
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryBox: {
    backgroundColor: colors.background.light,
    padding: spacing.md,
    minWidth: 180,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  // Packed by section
  packedBySection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 4,
  },
  packedByTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  packedByRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  packedByField: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  packedByLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  packedByValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    minHeight: 16,
  },
  // Special instructions
  specialInstructions: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.status.warning,
    backgroundColor: "#FFFBEB",
    borderRadius: 4,
  },
  specialInstructionsTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.status.warning,
    marginBottom: spacing.xs,
  },
  specialInstructionsText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Line item for packing slip (no pricing)
 */
export interface PackingSlipLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  notes?: string | null;
  /** Warehouse location/bin for picking */
  location?: string | null;
  /** Whether item is fragile/special handling */
  isFragile?: boolean;
  /** Weight in kg */
  weight?: number | null;
}

/**
 * Packing slip document data
 */
export interface PackingSlipDocumentData {
  /** Document number (e.g., PS-2024-001) */
  documentNumber: string;
  /** Reference order number */
  orderNumber: string;
  /** Issue date */
  issueDate: Date;
  /** Expected ship date */
  shipDate?: Date | null;
  /** Customer information */
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  /** Shipping address */
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
  /** Line items to pack */
  lineItems: PackingSlipLineItem[];
  /** Shipping method */
  shippingMethod?: string | null;
  /** Carrier/shipping provider */
  carrier?: string | null;
  /** Special packing instructions */
  specialInstructions?: string | null;
  /** General notes */
  notes?: string | null;
  /** Number of packages/boxes */
  packageCount?: number | null;
  /** Total weight */
  totalWeight?: number | null;
}

export interface PackingSlipPdfTemplateProps {
  /** Packing slip document data */
  data: PackingSlipDocumentData;
  /** QR code data URL for order lookup */
  qrCodeDataUrl?: string;
  /** Show location/bin column */
  showLocation?: boolean;
}

export interface PackingSlipPdfDocumentProps extends PackingSlipPdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

function PackingItems({
  lineItems,
  showLocation = false,
}: {
  lineItems: PackingSlipLineItem[];
  showLocation?: boolean;
}) {
  return (
    <View style={styles.tableContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.colCheck}>
          <Text style={[styles.headerText, { textAlign: "center" }]}>✓</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={[styles.headerText, { textAlign: "center" }]}>Qty</Text>
        </View>
        <View style={styles.colSku}>
          <Text style={styles.headerText}>SKU</Text>
        </View>
        <View style={styles.colDescription}>
          <Text style={styles.headerText}>Description</Text>
        </View>
        {showLocation && (
          <View style={styles.colLocation}>
            <Text style={[styles.headerText, { textAlign: "center" }]}>Location</Text>
          </View>
        )}
      </View>

      {/* Data Rows */}
      {lineItems.map((item, index) => (
        <View
          key={item.id}
          wrap={false}
          style={
            index % 2 === 1
              ? [styles.row, styles.rowAlternate]
              : styles.row
          }
        >
          <View style={styles.colCheck}>
            <View style={styles.checkbox} />
          </View>
          <View style={styles.colQty}>
            <Text style={[styles.cellText, { textAlign: "center", fontWeight: FONT_WEIGHTS.semibold }]}>
              {item.quantity}
            </Text>
          </View>
          <View style={styles.colSku}>
            <Text style={styles.skuText}>{item.sku || "-"}</Text>
          </View>
          <View style={styles.colDescription}>
            <Text style={styles.cellText}>{item.description}</Text>
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
            {item.isFragile && (
              <Text style={[styles.notesText, { color: colors.status.warning }]}>
                ⚠ FRAGILE - Handle with care
              </Text>
            )}
            {item.weight && (
              <Text style={styles.notesText}>Weight: {item.weight}kg</Text>
            )}
          </View>
          {showLocation && (
            <View style={styles.colLocation}>
              <Text style={styles.locationText}>{item.location || "-"}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function PackingSlipContent({
  data,
  qrCodeDataUrl,
  showLocation = false,
}: PackingSlipPdfTemplateProps) {
  const { organization, locale } = useOrgDocument();

  // Build "from" address from organization (Ship From)
  const fromAddress = {
    name: organization.name,
    street1: organization.address?.addressLine1,
    street2: organization.address?.addressLine2,
    city: organization.address?.city,
    state: organization.address?.state,
    postalCode: organization.address?.postalCode,
    country: organization.address?.country,
    phone: organization.phone,
  };

  // Build "to" address from shipping address (Ship To)
  const toAddress = {
    name: data.shippingAddress?.name || data.customer.name,
    street1: data.shippingAddress?.addressLine1,
    street2: data.shippingAddress?.addressLine2,
    city: data.shippingAddress?.city,
    state: data.shippingAddress?.state,
    postalCode: data.shippingAddress?.postalCode,
    country: data.shippingAddress?.country,
    phone: data.shippingAddress?.contactPhone || data.customer.phone,
  };

  // Calculate totals
  const totalItems = data.lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalLines = data.lineItems.length;
  const hasLocations = data.lineItems.some((item) => item.location);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header with logo and document info - compact for packing slip */}
        <View style={{ position: "relative" }}>
          <DocumentHeader
            title="PACKING SLIP"
            documentNumber={data.documentNumber}
            date={data.issueDate}
            labels={{
              documentNumber: "Slip #:",
              date: "Date:",
            }}
          />

          {/* QR Code for scanning (prominent position) */}
          {qrCodeDataUrl && (
            <View style={styles.qrSection}>
              <QRCode dataUrl={qrCodeDataUrl} size={70} />
              <Text style={styles.qrLabel}>Scan for Order Details</Text>
            </View>
          )}
        </View>

        {/* Order info bar */}
        <View style={styles.orderInfoBar}>
          <View style={styles.orderInfoItem}>
            <Text style={styles.orderInfoLabel}>Order #:</Text>
            <Text style={styles.orderInfoValue}>{data.orderNumber}</Text>
          </View>
          {data.shipDate && (
            <View style={styles.orderInfoItem}>
              <Text style={styles.orderInfoLabel}>Ship Date:</Text>
              <Text style={styles.orderInfoValue}>
                {formatDateForPdf(data.shipDate, locale)}
              </Text>
            </View>
          )}
          {data.shippingMethod && (
            <View style={styles.orderInfoItem}>
              <Text style={styles.orderInfoLabel}>Method:</Text>
              <Text style={styles.orderInfoValue}>{data.shippingMethod}</Text>
            </View>
          )}
          {data.carrier && (
            <View style={styles.orderInfoItem}>
              <Text style={styles.orderInfoLabel}>Carrier:</Text>
              <Text style={styles.orderInfoValue}>{data.carrier}</Text>
            </View>
          )}
        </View>

        {/* From/To addresses */}
        <AddressColumns
          from={fromAddress}
          to={toAddress}
          labels={{ from: "Ship From", to: "Ship To" }}
        />

        {/* Special Instructions */}
        {data.specialInstructions && (
          <View style={styles.specialInstructions}>
            <Text style={styles.specialInstructionsTitle}>
              SPECIAL PACKING INSTRUCTIONS
            </Text>
            <Text style={styles.specialInstructionsText}>
              {data.specialInstructions}
            </Text>
          </View>
        )}

        {/* Items Table with checkboxes */}
        <PackingItems
          lineItems={data.lineItems}
          showLocation={showLocation || hasLocations}
        />

        {/* Summary and Packed By section */}
        <View style={styles.summarySection}>
          {/* Summary box */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Lines:</Text>
              <Text style={styles.summaryValue}>{totalLines}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items:</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
            {data.packageCount && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Packages:</Text>
                <Text style={styles.summaryValue}>{data.packageCount}</Text>
              </View>
            )}
            {data.totalWeight && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Weight:</Text>
                <Text style={styles.summaryValue}>{data.totalWeight}kg</Text>
              </View>
            )}
          </View>
        </View>

        {/* Packed By section */}
        <View style={styles.packedBySection}>
          <Text style={styles.packedByTitle}>Verification</Text>
          <View style={styles.packedByRow}>
            <View style={styles.packedByField}>
              <Text style={styles.packedByLabel}>Packed By:</Text>
              <Text style={styles.packedByValue}> </Text>
            </View>
            <View style={styles.packedByField}>
              <Text style={styles.packedByLabel}>Date/Time:</Text>
              <Text style={styles.packedByValue}> </Text>
            </View>
            <View style={styles.packedByField}>
              <Text style={styles.packedByLabel}>Verified By:</Text>
              <Text style={styles.packedByValue}> </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Page numbers */}
      <PageNumber />
    </Page>
  );
}

// ============================================================================
// EXPORTED COMPONENTS
// ============================================================================

/**
 * Packing Slip PDF Document
 *
 * Renders a compact packing slip for warehouse use with:
 * - QR code for quick order lookup
 * - Checkbox list for item verification
 * - No pricing information
 * - Packed by/verified by section
 *
 * @example
 * const qrCode = await generateQRCode(`https://app.example.com/orders/${orderId}`);
 * const { buffer } = await renderPdfToBuffer(
 *   <PackingSlipPdfDocument
 *     organization={org}
 *     data={packingSlipData}
 *     qrCodeDataUrl={qrCode}
 *   />
 * );
 */
export function PackingSlipPdfDocument({
  organization,
  data,
  qrCodeDataUrl,
  showLocation = false,
}: PackingSlipPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Packing Slip ${data.documentNumber}`}
        author={organization.name}
        subject={`Packing Slip for Order ${data.orderNumber}`}
        creator="Renoz CRM"
      >
        <PackingSlipContent
          data={data}
          qrCodeDataUrl={qrCodeDataUrl}
          showLocation={showLocation}
        />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Packing Slip PDF Template (for use within existing Document/Provider)
 */
export function PackingSlipPdfTemplate({
  data,
  qrCodeDataUrl,
  showLocation = false,
}: PackingSlipPdfTemplateProps) {
  return (
    <PackingSlipContent
      data={data}
      qrCodeDataUrl={qrCodeDataUrl}
      showLocation={showLocation}
    />
  );
}
