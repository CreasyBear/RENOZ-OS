/**
 * Delivery Note PDF Template
 *
 * Generates operational delivery documents showing items without prices.
 * Designed for warehouse/shipping use with focus on item descriptions,
 * quantities, and SKUs.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  DocumentHeader,
  AddressColumns,
  PageNumber,
  DeliveryAcknowledgment,
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
    paddingTop: pageMargins.top,
    paddingBottom: pageMargins.bottom,
    paddingLeft: pageMargins.left,
    paddingRight: pageMargins.right,
    backgroundColor: colors.background.white,
  },
  content: {
    flex: 1,
  },
  // Delivery info section
  deliveryInfo: {
    flexDirection: "row",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.light,
    padding: spacing.md,
    borderRadius: 4,
  },
  deliveryInfoItem: {
    flex: 1,
  },
  deliveryInfoLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  deliveryInfoValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  // Items table
  tableContainer: {
    marginTop: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
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
  // Column widths for delivery note (no price columns)
  colItem: {
    flex: 0.5,
    paddingRight: spacing.xs,
  },
  colSku: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  colDescription: {
    flex: 3,
    paddingRight: spacing.md,
  },
  colQuantity: {
    flex: 0.8,
    textAlign: "center",
  },
  colCheck: {
    flex: 0.5,
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
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
  },
  notesText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    fontStyle: "italic",
    marginTop: 2,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.border.medium,
    marginLeft: "auto",
    marginRight: "auto",
  },
  // Summary
  summarySection: {
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    backgroundColor: colors.background.light,
    padding: spacing.md,
    minWidth: 150,
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
  // Notes section
  notesSection: {
    marginTop: spacing.xl,
  },
  notesSectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  notesContent: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
  // Special instructions
  specialInstructions: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.status.warning,
    backgroundColor: "#FFFBEB", // Warning yellow background
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
 * Line item for delivery note (no pricing)
 */
export interface DeliveryNoteLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  notes?: string | null;
  /** Whether item is fragile/special handling */
  isFragile?: boolean;
  /** Weight in kg */
  weight?: number | null;
  /** Dimensions */
  dimensions?: string | null;
}

/**
 * Delivery note document data
 */
export interface DeliveryNoteDocumentData {
  /** Document number (e.g., DN-2024-001) */
  documentNumber: string;
  /** Reference order number */
  orderNumber: string;
  /** Issue date */
  issueDate: Date;
  /** Expected delivery date */
  deliveryDate?: Date | null;
  /** Delivery time window */
  deliveryTimeWindow?: string | null;
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
  /** Line items to deliver */
  lineItems: DeliveryNoteLineItem[];
  /** Carrier/shipping method */
  carrier?: string | null;
  /** Tracking number */
  trackingNumber?: string | null;
  /** Special delivery instructions */
  specialInstructions?: string | null;
  /** General notes */
  notes?: string | null;
}

export interface DeliveryNotePdfTemplateProps {
  /** Delivery note document data */
  data: DeliveryNoteDocumentData;
  /** Show checkbox column for picking/packing */
  showCheckboxes?: boolean;
  /** Show weight/dimensions if available */
  showDimensions?: boolean;
}

export interface DeliveryNotePdfDocumentProps extends DeliveryNotePdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

function DeliveryItems({
  lineItems,
  showCheckboxes = true,
  showDimensions = false,
}: {
  lineItems: DeliveryNoteLineItem[];
  showCheckboxes?: boolean;
  showDimensions?: boolean;
}) {
  return (
    <View style={styles.tableContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.colItem}>
          <Text style={styles.headerText}>#</Text>
        </View>
        <View style={styles.colSku}>
          <Text style={styles.headerText}>SKU</Text>
        </View>
        <View style={styles.colDescription}>
          <Text style={styles.headerText}>Description</Text>
        </View>
        <View style={styles.colQuantity}>
          <Text style={[styles.headerText, { textAlign: "center" }]}>Qty</Text>
        </View>
        {showCheckboxes && (
          <View style={styles.colCheck}>
            <Text style={[styles.headerText, { textAlign: "center" }]}>Check</Text>
          </View>
        )}
      </View>

      {/* Data Rows */}
      {lineItems.map((item, index) => (
        <View key={item.id} wrap={false} style={styles.row}>
          <View style={styles.colItem}>
            <Text style={styles.cellText}>{item.lineNumber || index + 1}</Text>
          </View>
          <View style={styles.colSku}>
            <Text style={styles.skuText}>{item.sku || "-"}</Text>
          </View>
          <View style={styles.colDescription}>
            <Text style={styles.cellText}>{item.description}</Text>
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
            {showDimensions && (item.weight || item.dimensions) && (
              <Text style={styles.notesText}>
                {[
                  item.weight ? `${item.weight}kg` : null,
                  item.dimensions,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </Text>
            )}
            {item.isFragile && (
              <Text style={[styles.notesText, { color: colors.status.warning }]}>
                FRAGILE - Handle with care
              </Text>
            )}
          </View>
          <View style={styles.colQuantity}>
            <Text style={[styles.cellText, { textAlign: "center" }]}>
              {item.quantity}
            </Text>
          </View>
          {showCheckboxes && (
            <View style={styles.colCheck}>
              <View style={styles.checkbox} />
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

function DeliveryNoteContent({
  data,
  showCheckboxes = true,
  showDimensions = false,
}: DeliveryNotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();

  // Build "from" address from organization
  const fromAddress = {
    name: organization.name,
    street1: organization.address?.addressLine1,
    street2: organization.address?.addressLine2,
    city: organization.address?.city,
    state: organization.address?.state,
    postalCode: organization.address?.postalCode,
    country: organization.address?.country,
    phone: organization.phone,
    email: organization.email,
  };

  // Build "to" address from shipping address
  const toAddress = {
    name: data.shippingAddress?.name || data.customer.name,
    street1: data.shippingAddress?.addressLine1,
    street2: data.shippingAddress?.addressLine2,
    city: data.shippingAddress?.city,
    state: data.shippingAddress?.state,
    postalCode: data.shippingAddress?.postalCode,
    country: data.shippingAddress?.country,
    phone: data.shippingAddress?.contactPhone || data.customer.phone,
    email: data.customer.email,
  };

  // Calculate total items
  const totalItems = data.lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalLines = data.lineItems.length;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header with logo and document info */}
        <DocumentHeader
          title="DELIVERY NOTE"
          documentNumber={data.documentNumber}
          date={data.issueDate}
          labels={{
            documentNumber: "DN Number:",
            date: "Date:",
          }}
        />

        {/* From/To addresses */}
        <AddressColumns
          from={fromAddress}
          to={toAddress}
          labels={{ from: "Ship From", to: "Ship To" }}
        />

        {/* Delivery Info Bar */}
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryInfoItem}>
            <Text style={styles.deliveryInfoLabel}>Order Reference</Text>
            <Text style={styles.deliveryInfoValue}>{data.orderNumber}</Text>
          </View>
          {data.deliveryDate && (
            <View style={styles.deliveryInfoItem}>
              <Text style={styles.deliveryInfoLabel}>Delivery Date</Text>
              <Text style={styles.deliveryInfoValue}>
                {formatDateForPdf(data.deliveryDate, locale)}
              </Text>
            </View>
          )}
          {data.deliveryTimeWindow && (
            <View style={styles.deliveryInfoItem}>
              <Text style={styles.deliveryInfoLabel}>Time Window</Text>
              <Text style={styles.deliveryInfoValue}>
                {data.deliveryTimeWindow}
              </Text>
            </View>
          )}
          {data.carrier && (
            <View style={styles.deliveryInfoItem}>
              <Text style={styles.deliveryInfoLabel}>Carrier</Text>
              <Text style={styles.deliveryInfoValue}>{data.carrier}</Text>
            </View>
          )}
          {data.trackingNumber && (
            <View style={styles.deliveryInfoItem}>
              <Text style={styles.deliveryInfoLabel}>Tracking #</Text>
              <Text style={styles.deliveryInfoValue}>{data.trackingNumber}</Text>
            </View>
          )}
        </View>

        {/* Special Instructions */}
        {data.specialInstructions && (
          <View style={styles.specialInstructions}>
            <Text style={styles.specialInstructionsTitle}>
              SPECIAL INSTRUCTIONS
            </Text>
            <Text style={styles.specialInstructionsText}>
              {data.specialInstructions}
            </Text>
          </View>
        )}

        {/* Items Table */}
        <DeliveryItems
          lineItems={data.lineItems}
          showCheckboxes={showCheckboxes}
          showDimensions={showDimensions}
        />

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Lines:</Text>
              <Text style={styles.summaryValue}>{totalLines}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items:</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionTitle}>Notes</Text>
            <Text style={styles.notesContent}>{data.notes}</Text>
          </View>
        )}

        {/* Signature Section */}
        <DeliveryAcknowledgment
          recipientName={data.shippingAddress?.contactName || null}
          deliveryDate={data.deliveryDate}
        />
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
 * Delivery Note PDF Document
 *
 * Renders a complete delivery note with organization branding.
 * Designed for warehouse/shipping use with item descriptions, quantities, and SKUs.
 * Does NOT include pricing information.
 *
 * @example
 * const { buffer } = await renderPdfToBuffer(
 *   <DeliveryNotePdfDocument
 *     organization={org}
 *     data={deliveryNoteData}
 *     showCheckboxes={true}
 *   />
 * );
 */
export function DeliveryNotePdfDocument({
  organization,
  data,
  showCheckboxes = true,
  showDimensions = false,
}: DeliveryNotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Delivery Note ${data.documentNumber}`}
        author={organization.name}
        subject={`Delivery Note for ${data.customer.name}`}
        creator="Renoz CRM"
      >
        <DeliveryNoteContent
          data={data}
          showCheckboxes={showCheckboxes}
          showDimensions={showDimensions}
        />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Delivery Note PDF Template (for use within existing Document/Provider)
 */
export function DeliveryNotePdfTemplate({
  data,
  showCheckboxes = true,
  showDimensions = false,
}: DeliveryNotePdfTemplateProps) {
  return (
    <DeliveryNoteContent
      data={data}
      showCheckboxes={showCheckboxes}
      showDimensions={showDimensions}
    />
  );
}
