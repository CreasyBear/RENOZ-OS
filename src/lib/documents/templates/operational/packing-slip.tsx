/**
 * Packing Slip PDF Template
 *
 * 20pt margins, two-column From/Ship To, 9pt typography,
 * black borders, 5pt row padding. Fixed header on all pages.
 */

import { Document, Page, StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import {
  PageNumber,
  DocumentFixedHeader,
  SerialNumbersCell,
  formatAddressLines,
  formatDateForPdf,
  colors,
  FONT_FAMILY,
  FONT_WEIGHTS,
  DOCUMENT_PAGE_MARGINS,
  DOCUMENT_FIXED_HEADER_CLEARANCE,
  DOCUMENT_BORDER_COLOR,
  DOCUMENT_LOGO_HEIGHT,
  DOCUMENT_LOGO_MAX_WIDTH,
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

  shippingDetails: {
    flexDirection: "row",
    gap: 20,
    marginTop: 20,
    marginBottom: 20,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  shippingItem: {
    minWidth: 80,
  },
  shippingLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: 4,
  },
  shippingValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
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
    alignItems: "center",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 0.5,
    borderColor: DOCUMENT_BORDER_COLOR,
    marginRight: 8,
  },
  tableCell: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.4,
  },
  tableCellMuted: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  colCheckbox: { width: 30 },
  colSku: { flex: 1.2 },
  colDescription: { flex: 2.5 },
  colQty: { width: 50, textAlign: "center" },
  colSerial: { width: 70 },
  colLocation: { width: 80, textAlign: "center" },

  summarySection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
  },
  summaryItem: {
    flexDirection: "row",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },

  instructionsSection: {
    marginTop: 12,
  },
  instructionsLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
});

// ============================================================================
// COMPONENT
// ============================================================================

function PackingSlipContent({ data }: PackingSlipPdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const hasSerials = data.lineItems.some((i) => (i.serialNumbers?.length ?? 0) > 0);

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;
  const fromAddressLines = formatAddressLines(organization.address);
  const toAddressLines = formatAddressLines(data.shippingAddress);

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Packing Slip"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header: Meta left, Logo right */}
        <View style={styles.headerRow}>
          <View style={styles.metaSection}>
            <Text style={styles.metaTitle}>Packing Slip</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Slip #: </Text>
              <Text style={styles.metaValue}>{data.documentNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order #: </Text>
              <Text style={styles.metaValue}>{data.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date: </Text>
              <Text style={styles.metaValue}>
                {formatDateForPdf(data.issueDate, locale, "short")}
              </Text>
            </View>
          </View>

          {logoUrl && (
            <View style={styles.logoWrapper}>
              <Image src={logoUrl} style={styles.logo} />
            </View>
          )}
        </View>

        {/* From / Ship To two-column */}
        <View style={styles.fromToRow}>
          <View style={styles.fromColumn}>
            <Text style={styles.sectionLabel}>From</Text>
            <Text style={styles.sectionName}>{organization.name}</Text>
            {fromAddressLines.map((line) => (
              <Text key={line} style={styles.sectionDetail}>{line}</Text>
            ))}
            {organization.phone && (
              <Text style={styles.sectionDetail}>{organization.phone}</Text>
            )}
          </View>
          <View style={styles.toColumn}>
            <Text style={styles.sectionLabel}>Ship To</Text>
            <Text style={styles.sectionName}>{data.customer.name}</Text>
            {data.shippingAddress?.contactName && (
              <Text style={styles.sectionDetail}>Attn: {data.shippingAddress.contactName}</Text>
            )}
            {toAddressLines.length > 0 ? (
              toAddressLines.map((line) => (
                <Text key={line} style={styles.sectionDetail}>{line}</Text>
              ))
            ) : (
              <Text style={styles.sectionDetail}>—</Text>
            )}
            {data.shippingAddress?.contactPhone && (
              <Text style={styles.sectionDetail}>{data.shippingAddress.contactPhone}</Text>
            )}
          </View>
        </View>

        {/* Shipping Details */}
        {(data.carrier || data.shippingMethod || data.shipDate || data.packageCount || data.totalWeight) && (
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
                  {formatDateForPdf(data.shipDate, locale, "short")}
                </Text>
              </View>
            )}
            {data.packageCount != null && (
              <View style={styles.shippingItem}>
                <Text style={styles.shippingLabel}>Packages</Text>
                <Text style={styles.shippingValue}>{String(data.packageCount)}</Text>
              </View>
            )}
            {data.totalWeight != null && (
              <View style={styles.shippingItem}>
                <Text style={styles.shippingLabel}>Weight</Text>
                <Text style={styles.shippingValue}>{`${data.totalWeight} kg`}</Text>
              </View>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colCheckbox} />
            <Text style={[styles.tableHeaderCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            {hasSerials && (
              <Text style={[styles.tableHeaderCell, styles.colSerial]}>Serials</Text>
            )}
            <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
          </View>

          {data.lineItems.length === 0 ? (
            <View style={styles.tableRow}>
              <View style={styles.colCheckbox}>
                <View style={styles.checkbox} />
              </View>
              <Text style={[styles.tableCell, styles.colSku]}>—</Text>
              <Text style={[styles.tableCell, styles.colDescription]}>—</Text>
              <Text style={[styles.tableCell, styles.colQty]}>—</Text>
              {hasSerials && (
                <View style={styles.colSerial}>
                  <Text style={styles.tableCell}>—</Text>
                </View>
              )}
              <Text style={[styles.tableCell, styles.colLocation]}>—</Text>
            </View>
          ) : (
            data.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={true}>
              <View style={styles.colCheckbox}>
                <View style={styles.checkbox} />
              </View>
              <Text style={[styles.tableCell, styles.colSku]}>{item.sku || "—"}</Text>
              <View style={styles.colDescription}>
                <Text style={styles.tableCell}>{item.description || "—"}</Text>
                {item.notes && <Text style={styles.tableCellMuted}>{item.notes}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity)}</Text>
              {hasSerials && (
                <View style={styles.colSerial}>
                  <SerialNumbersCell serialNumbers={item.serialNumbers ?? []} />
                </View>
              )}
              <Text style={[styles.tableCell, styles.colLocation]}>{item.location || "—"}</Text>
            </View>
            ))
          )}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Package count:</Text>
              <Text style={styles.summaryValue}>
                {data.packageCount != null ? String(data.packageCount) : "1"}
              </Text>
            </View>
            {data.totalWeight != null && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total weight:</Text>
                <Text style={styles.summaryValue}>{`${data.totalWeight} kg`}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Special Instructions */}
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
