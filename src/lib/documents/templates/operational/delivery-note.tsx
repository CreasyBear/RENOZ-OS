/**
 * Delivery Note PDF Template
 *
 * 20pt margins, two-column From/Deliver To, 9pt typography,
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
}

export interface DeliveryNotePdfDocumentProps extends DeliveryNotePdfTemplateProps {
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

  deliveryDetails: {
    flexDirection: "row",
    gap: 20,
    marginTop: 20,
    marginBottom: 20,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  deliveryItem: {
    minWidth: 80,
  },
  deliveryLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: 4,
  },
  deliveryValue: {
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
  colItem: { width: 30 },
  colSku: { flex: 1 },
  colDescription: { flex: 2.5 },
  colQty: { width: 50, textAlign: "center" },
  colSerial: { width: 70 },

  serialSummarySection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  serialSummaryTitle: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 8,
  },
  serialSummaryRow: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 8,
  },
  serialSummarySerial: {
    fontSize: 9,
    fontFamily: "Courier",
    color: colors.text.primary,
    minWidth: 70,
  },
  serialSummaryProduct: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    flex: 1,
  },

  acknowledgmentSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  acknowledgmentTitle: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  acknowledgmentText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 20,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: DOCUMENT_BORDER_COLOR,
    height: 32,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  dateBlock: {
    width: 100,
  },
});

// ============================================================================
// COMPONENT
// ============================================================================

function DeliveryNoteContent({ data }: DeliveryNotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const hasSerials = data.lineItems.some((i) => (i.serialNumbers?.length ?? 0) > 0);

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;
  const fromAddressLines = formatAddressLines(organization.address);
  const toAddressLines = formatAddressLines(data.shippingAddress);

  const serialSummaryRows = hasSerials
    ? data.lineItems.flatMap((item) =>
        (item.serialNumbers ?? []).map((serial) => ({
          serial,
          description: item.description,
          quantity: item.quantity,
        }))
      )
    : [];

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Delivery Note"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header: Meta left, Logo right */}
        <View style={styles.headerRow}>
          <View style={styles.metaSection}>
            <Text style={styles.metaTitle}>Delivery Note</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Note #: </Text>
              <Text style={styles.metaValue}>{data.documentNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order #: </Text>
              <Text style={styles.metaValue}>{data.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue: </Text>
              <Text style={styles.metaValue}>
                {formatDateForPdf(data.issueDate, locale, "short")}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Delivery: </Text>
              <Text style={styles.metaValue}>
                {formatDateForPdf(data.deliveryDate, locale, "short")}
              </Text>
            </View>
          </View>

          {logoUrl && (
            <View style={styles.logoWrapper}>
              <Image src={logoUrl} style={styles.logo} />
            </View>
          )}
        </View>

        {/* From / Deliver To two-column */}
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
            <Text style={styles.sectionLabel}>Deliver To</Text>
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

        {/* Delivery Details */}
        {(data.carrier || data.trackingNumber) && (
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
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colCheckbox} />
            <Text style={[styles.tableHeaderCell, styles.colItem]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            {hasSerials && (
              <Text style={[styles.tableHeaderCell, styles.colSerial]}>Serials</Text>
            )}
          </View>

          {data.lineItems.length === 0 ? (
            <View style={styles.tableRow}>
              <View style={styles.colCheckbox}>
                <View style={styles.checkbox} />
              </View>
              <Text style={[styles.tableCell, styles.colItem]}>—</Text>
              <Text style={[styles.tableCell, styles.colSku]}>—</Text>
              <Text style={[styles.tableCell, styles.colDescription]}>—</Text>
              <Text style={[styles.tableCell, styles.colQty]}>—</Text>
              {hasSerials && (
                <View style={styles.colSerial}>
                  <Text style={styles.tableCell}>—</Text>
                </View>
              )}
            </View>
          ) : (
            data.lineItems.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={true}>
              <View style={styles.colCheckbox}>
                <View style={styles.checkbox} />
              </View>
              <Text style={[styles.tableCell, styles.colItem]}>{String(index + 1)}</Text>
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
            </View>
            ))
          )}
        </View>

        {/* Serial Summary */}
        {hasSerials && serialSummaryRows.length > 0 && (
          <View style={styles.serialSummarySection}>
            <Text style={styles.serialSummaryTitle}>Serial Numbers on This Delivery</Text>
            {serialSummaryRows.map((row, idx) => (
              <View key={`${row.serial}-${idx}`} style={styles.serialSummaryRow}>
                <Text style={styles.serialSummarySerial}>
                  {idx + 1}. {row.serial}
                </Text>
                <Text style={styles.serialSummaryProduct}>
                  {row.description} (Qty {row.quantity})
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Acknowledgment */}
        <View style={styles.acknowledgmentSection} wrap={false}>
          <Text style={styles.acknowledgmentTitle}>Delivery Acknowledgment</Text>
          <Text style={styles.acknowledgmentText}>
            I confirm receipt of the above items in good condition. Any damage or shortages must be reported within 24 hours of delivery.
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
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
        <DeliveryNoteContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function DeliveryNotePdfTemplate({ data }: DeliveryNotePdfTemplateProps) {
  return <DeliveryNoteContent data={data} />;
}
