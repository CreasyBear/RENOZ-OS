/**
 * Dispatch Note PDF Template
 *
 * Shipment-scoped operational document generated once the included shipment items
 * are fully picked and ready for dispatch.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  PageNumber,
  DocumentFixedHeader,
  DocumentBodyText,
  DocumentDetailStrip,
  DocumentInfoPanel,
  DocumentMasthead,
  DocumentPanelGrid,
  DocumentSectionCard,
  SerialNumbersSummary,
  type DetailStripItem,
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

export interface DispatchNoteLineItem {
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

export interface DispatchNoteDocumentData {
  documentNumber: string;
  orderNumber: string;
  issueDate: Date;
  dispatchDate: Date;
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
  lineItems: DispatchNoteLineItem[];
  carrier?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
}

export interface DispatchNotePdfTemplateProps {
  data: DispatchNoteDocumentData;
}

export interface DispatchNotePdfDocumentProps extends DispatchNotePdfTemplateProps {
  organization: DocumentOrganization;
}

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
  detailRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 20,
    marginBottom: 20,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  detailItem: {
    minWidth: 80,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: 4,
  },
  detailValue: {
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
  colItem: { width: 30 },
  colSku: { flex: 1 },
  colDescription: { flex: 2.5 },
  colQty: { width: 50, textAlign: "center" },
  notesSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
});

function DispatchNoteContent({ data }: DispatchNotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const hasSerials = data.lineItems.some((item) => (item.serialNumbers?.length ?? 0) > 0);
  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;
  const fromAddressLines = formatAddressLines(organization.address);
  const toAddressLines = formatAddressLines(data.shippingAddress);
  const detailItems = [
    {
      label: "Dispatch Date",
      value: formatDateForPdf(data.dispatchDate, locale, "short"),
      weight: 1.4,
      emphasis: "strong" as const,
    },
    data.carrier ? { label: "Carrier", value: data.carrier, weight: 1 } : null,
    data.trackingNumber
      ? { label: "Tracking", value: data.trackingNumber, weight: 1, emphasis: "subtle" as const }
      : null,
  ].filter(Boolean) as DetailStripItem[];

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Dispatch Note"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        <DocumentMasthead
          title="Dispatch Note"
          meta={[
            { label: "Note", value: data.documentNumber },
            { label: "Order", value: data.orderNumber },
            { label: "Issued", value: formatDateForPdf(data.issueDate, locale, "short") },
          ]}
          callout={{
            eyebrow: "Ready for Dispatch",
            title: formatDateForPdf(data.dispatchDate, locale, "short"),
            detail: data.trackingNumber ? `Tracking ${data.trackingNumber}` : "Awaiting carrier handoff.",
            tone: "info",
          }}
          logoUrl={logoUrl}
        />

        <DocumentPanelGrid
          left={
            <DocumentInfoPanel
              label="From"
              name={organization.name}
              lines={[...fromAddressLines, ...(organization.phone ? [organization.phone] : [])]}
            />
          }
          right={
            <DocumentInfoPanel
              label="Ship To"
              name={data.customer.name}
              lines={toAddressLines}
              mutedLines={[
                ...(data.shippingAddress?.contactName ? [`Attn: ${data.shippingAddress.contactName}`] : []),
                ...(data.shippingAddress?.contactPhone ? [data.shippingAddress.contactPhone] : []),
              ]}
            />
          }
        />

        <DocumentDetailStrip items={detailItems} />

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          </View>

          {data.lineItems.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap>
              <Text style={[styles.tableCell, styles.colItem]}>{String(index + 1)}</Text>
              <Text style={[styles.tableCell, styles.colSku]}>{item.sku || "-"}</Text>
              <View style={styles.colDescription}>
                <Text style={styles.tableCell}>{item.description || "-"}</Text>
                {item.notes ? (
                  <Text style={styles.tableCellMuted}>{item.notes}</Text>
                ) : null}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity)}</Text>
            </View>
          ))}
        </View>

        {hasSerials ? (
          <SerialNumbersSummary
            title="Serialized Items Ready for Dispatch"
            items={data.lineItems}
          />
        ) : null}

        {data.notes ? (
          <DocumentSectionCard title="Dispatch Notes">
            <DocumentBodyText>{data.notes}</DocumentBodyText>
          </DocumentSectionCard>
        ) : null}
      </View>

      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

export function DispatchNotePdfDocument({
  organization,
  data,
}: DispatchNotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Dispatch Note ${data.documentNumber}`}
        author={organization.name}
        subject={`Dispatch Note for Order ${data.orderNumber}`}
        language="en-AU"
        keywords={`dispatch note, ${data.documentNumber}, ${data.orderNumber}`}
        creator="Renoz"
      >
        <DispatchNoteContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function DispatchNotePdfTemplate({ data }: DispatchNotePdfTemplateProps) {
  return <DispatchNoteContent data={data} />;
}
