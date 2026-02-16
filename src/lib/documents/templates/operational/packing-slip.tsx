/**
 * Packing Slip PDF Template - Accounting Style
 *
 * Practical, dense layout focused on warehouse efficiency.
 * Clear item list with checkboxes for picking verification.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  PageNumber,
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

export interface PackingSlipLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  notes?: string | null;
  location?: string | null;
  isFragile?: boolean;
  weight?: number | null;
  serialNumbers?: string[];
}

export interface PackingSlipDocumentData {
  documentNumber: string;
  orderNumber: string;
  issueDate: Date;
  shipDate?: Date | null;
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
  lineItems: PackingSlipLineItem[];
  carrier?: string | null;
  shippingMethod?: string | null;
  packageCount?: number | null;
  totalWeight?: number | null;
  specialInstructions?: string | null;
  notes?: string | null;
}

export interface PackingSlipPdfTemplateProps {
  data: PackingSlipDocumentData;
}

export interface PackingSlipPdfDocumentProps extends PackingSlipPdfTemplateProps {
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
  slipInfo: {
    alignItems: "flex-end",
  },
  slipTitle: {
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
    width: 80,
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

  // Ship To
  shipToSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  shipToLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  shipToName: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  shipToDetail: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },

  // Shipping Details
  shippingDetails: {
    flexDirection: "row",
    gap: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.subtle,
    borderRadius: 4,
  },
  shippingItem: {
    minWidth: 80,
  },
  shippingLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: 2,
  },
  shippingValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },

  // Table - With checkboxes
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
  colCheckbox: { width: 30 },
  colSku: { flex: 1.5 },
  colDescription: { flex: 3 },
  colQty: { width: 50, textAlign: "center" },
  colLocation: { width: 80, textAlign: "center" },
  serialNumberRow: {
    flexDirection: "row" as const,
    paddingLeft: 48,
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

  // Summary
  summarySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
  summaryItem: {
    flexDirection: "row",
    gap: spacing.sm,
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
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
  },

  // Instructions
  instructionsSection: {
    marginTop: spacing.md,
  },
  instructionsLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
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

function PackingSlipContent({ data }: PackingSlipPdfTemplateProps) {
  const { organization, locale } = useOrgDocument();

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Packing Slip"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
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

          <View style={styles.slipInfo}>
            <Text style={styles.slipTitle}>Packing Slip</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Slip #</Text>
              <Text style={styles.infoValue}>{data.documentNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order #</Text>
              <Text style={styles.infoValue}>{data.orderNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(data.issueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Ship To */}
        <View style={styles.shipToSection}>
          <Text style={styles.shipToLabel}>Ship To</Text>
          <Text style={styles.shipToName}>{data.customer.name}</Text>
          {data.shippingAddress && (
            <>
              {data.shippingAddress.contactName && (
                <Text style={styles.shipToDetail}>{`Attn: ${data.shippingAddress.contactName}`}</Text>
              )}
              <Text style={styles.shipToDetail}>
                {data.shippingAddress.addressLine1}
                {data.shippingAddress.addressLine2 ? `, ${data.shippingAddress.addressLine2}` : ""}
              </Text>
              <Text style={styles.shipToDetail}>
                {`${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}`}
              </Text>
              {data.shippingAddress.contactPhone && (
                <Text style={styles.shipToDetail}>{data.shippingAddress.contactPhone}</Text>
              )}
            </>
          )}
        </View>

        {/* Shipping Details */}
        <View style={styles.shippingDetails}>
          {data.carrier && (
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Carrier</Text>
              <Text style={styles.shippingValue}>{data.carrier}</Text>
            </View>
          )}
          {data.shippingMethod && (
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Method</Text>
              <Text style={styles.shippingValue}>{data.shippingMethod}</Text>
            </View>
          )}
          {data.shipDate && (
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Ship Date</Text>
              <Text style={styles.shippingValue}>
                {new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(data.shipDate)}
              </Text>
            </View>
          )}
          {data.packageCount && (
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Packages</Text>
              <Text style={styles.shippingValue}>{String(data.packageCount)}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colCheckbox} />
            <Text style={[styles.tableHeaderCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
          </View>

          {data.lineItems.map((item) => (
            <View key={item.id} wrap={true}>
              <View style={styles.tableRow}>
                <View style={styles.colCheckbox}>
                  <View style={styles.checkbox} />
                </View>
                <Text style={[styles.tableCell, styles.colSku]}>{item.sku || "-"}</Text>
                <View style={styles.colDescription}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                  {item.notes && <Text style={styles.tableCellMuted}>{item.notes}</Text>}
                </View>
                <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity)}</Text>
                <Text style={[styles.tableCell, styles.colLocation]}>{item.location || "-"}</Text>
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

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Items:</Text>
              <Text style={styles.summaryValue}>
                {String(data.lineItems.reduce((sum, item) => sum + item.quantity, 0))}
              </Text>
            </View>
            {data.totalWeight && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Weight:</Text>
                <Text style={styles.summaryValue}>{`${data.totalWeight} kg`}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        {data.specialInstructions && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsLabel}>Special Instructions</Text>
            <Text style={styles.instructionsText}>{data.specialInstructions}</Text>
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

export function PackingSlipPdfDocument({
  organization,
  data,
}: PackingSlipPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Packing Slip ${data.documentNumber}`}
        author={organization.name}
        subject={`Packing Slip for Order ${data.orderNumber}`}
        language="en-AU"
        keywords={`packing slip, ${data.documentNumber}, ${data.orderNumber}`}
        creator="Renoz"
      >
        <PackingSlipContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function PackingSlipPdfTemplate({ data }: PackingSlipPdfTemplateProps) {
  return <PackingSlipContent data={data} />;
}
