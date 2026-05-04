/**
 * Credit Note PDF Template
 *
 * 20pt margins, two-column From/Credit To, 9pt typography,
 * black borders, 21pt total. Fixed header on all pages.
 */

import { Document, Page, StyleSheet, View } from "@react-pdf/renderer";
import {
  PageNumber,
  DocumentFixedHeader,
  DocumentBodyText,
  DocumentInfoPanel,
  DocumentMasthead,
  DocumentPanelGrid,
  DocumentSectionCard,
  DocumentSummaryCard,
  formatAddressLines,
  colors,
  tabularNums,
  FONT_FAMILY,
  FONT_WEIGHTS,
  formatCurrencyForPdf,
  formatDateForPdf,
  DOCUMENT_PAGE_MARGINS,
  DOCUMENT_FIXED_HEADER_CLEARANCE,
  DOCUMENT_BORDER_COLOR,
  DOCUMENT_LOGO_HEIGHT,
  DOCUMENT_LOGO_MAX_WIDTH,
} from "../../components";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { DocumentOrganization } from "../../types";

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

  // Header: Meta left, Logo right
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
  statusText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginTop: 4,
  },
  logoWrapper: {
    maxWidth: DOCUMENT_LOGO_MAX_WIDTH,
  },
  logo: {
    height: DOCUMENT_LOGO_HEIGHT,
    objectFit: "contain",
  },

  // From/Credit To two-column
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

  // Summary - marginTop 60, width 250, 21pt total, plain black border
  summarySection: {
    marginTop: 60,
    marginBottom: 40,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: 250,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "right",
    ...tabularNums,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
    paddingTop: 5,
    marginTop: 5,
  },
  summaryTotalLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 21,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "right",
    ...tabularNums,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
    paddingTop: 5,
    marginTop: 5,
  },
  statusRowLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  statusRowValue: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },

  // Reason
  reasonSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: DOCUMENT_BORDER_COLOR,
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.4,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface CreditNoteDocumentData {
  documentNumber: string;
  issueDate: Date;
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: {
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null;
  };
  amount: number;
  gstAmount: number;
  reason: string;
  relatedOrderNumber?: string | null;
  relatedOrderId?: string | null;
  status: "draft" | "issued" | "applied" | "voided";
  appliedToOrderId?: string | null;
  appliedAt?: Date | null;
}

export interface CreditNotePdfTemplateProps {
  data: CreditNoteDocumentData;
}

export interface CreditNotePdfDocumentProps extends CreditNotePdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// COMPONENT
// ============================================================================

function CreditNoteContent({ data }: CreditNotePdfTemplateProps) {
  const { organization, locale } = useOrgDocument();
  const isApplied = data.status === "applied";
  const isIssued = data.status === "issued";

  const logoUrl = organization.branding?.logoDataUrl ?? organization.branding?.logoUrl;
  const fromAddressLines = formatAddressLines(organization.address);
  const toAddressLines = formatAddressLines(data.customer.address);

  const totalCredit = data.amount + data.gstAmount;
  const statusLabel = isApplied ? "Applied" : isIssued ? "Issued" : "Draft";
  const summaryRows = [
    {
      key: "credit-amount",
      label: "Credit Amount",
      value: formatCurrencyForPdf(data.amount, organization.currency, locale),
    },
    {
      key: "credit-gst",
      label: "GST (10%)",
      value: formatCurrencyForPdf(data.gstAmount, organization.currency, locale),
    },
    {
      key: "credit-total",
      label: "Total Credit",
      value: formatCurrencyForPdf(totalCredit, organization.currency, locale),
      emphasized: true,
    },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <DocumentFixedHeader
        orgName={organization.name}
        documentType="Credit Note"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        <DocumentMasthead
          title="Credit Note"
          variant="formal"
          meta={[
            { label: "Credit Note", value: data.documentNumber },
            { label: "Issue Date", value: formatDateForPdf(data.issueDate, locale, "short") },
            ...(data.relatedOrderNumber
              ? [{ label: "Reference", value: data.relatedOrderNumber }]
              : []),
          ]}
          callout={{
            eyebrow: "Total Credit",
            title: formatCurrencyForPdf(totalCredit, organization.currency, locale),
            detail: statusLabel,
            tone: isApplied ? "success" : "info",
          }}
          logoUrl={logoUrl}
        />

        <DocumentPanelGrid
          left={
            <DocumentInfoPanel
              label="From"
              variant="formal"
              name={organization.name}
              lines={[
                ...(organization.taxId ? [`ABN: ${organization.taxId}`] : []),
                ...fromAddressLines,
                ...(organization.phone ? [organization.phone] : []),
              ]}
            />
          }
          right={
            <DocumentInfoPanel
              label="Credit To"
              variant="formal"
              name={data.customer.name}
              lines={toAddressLines}
            />
          }
        />

        <DocumentPanelGrid
          left={
            <DocumentSectionCard title="Reason for Credit" variant="formal">
              <DocumentBodyText>{data.reason}</DocumentBodyText>
            </DocumentSectionCard>
          }
          right={<DocumentSummaryCard rows={summaryRows} variant="formal" />}
        />
      </View>

      <PageNumber documentNumber={data.documentNumber} />
    </Page>
  );
}

// ============================================================================
// EXPORTED
// ============================================================================

export function CreditNotePdfDocument({
  organization,
  data,
}: CreditNotePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Credit Note ${data.documentNumber}`}
        author={organization.name}
        subject={`Credit Note for ${data.customer.name}`}
        creator="Renoz"
        language="en-AU"
        keywords={`credit note, ${data.documentNumber}, ${data.customer.name}`}
      >
        <CreditNoteContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function CreditNotePdfTemplate({ data }: CreditNotePdfTemplateProps) {
  return <CreditNoteContent data={data} />;
}
