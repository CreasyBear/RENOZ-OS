/**
 * Pro Forma Invoice PDF Template
 *
 * Generates pro forma invoice documents with organization branding.
 * Includes "PRO FORMA INVOICE" header and "NOT A TAX INVOICE" designation.
 * Same structure as invoice but clearly marked as non-binding estimate.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  DocumentHeader,
  FixedDocumentHeader,
  AddressColumns,
  LineItems,
  Summary,
  DocumentFooter,
  PageNumber,
  pageMargins,
  fixedHeaderClearance,
  colors,
  spacing,
  fontSize,
} from "../../components";
import { FONT_FAMILY, FONT_WEIGHTS } from "../../fonts";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import type { DocumentOrganization, DocumentPaymentDetails } from "../../types";

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
    position: "relative",
  },
  content: {
    flex: 1,
    marginTop: fixedHeaderClearance,
  },
  qrSection: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
  // Pro forma disclaimer banner
  disclaimerBanner: {
    backgroundColor: colors.background.subtle,
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  disclaimerText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimerSubtext: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Pro forma invoice line item
 */
export interface ProFormaLineItem {
  id: string;
  lineNumber?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  total: number;
  notes?: string | null;
}

/**
 * Pro forma invoice customer data
 */
export interface ProFormaCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
}

/**
 * Pro forma invoice order data
 */
export interface ProFormaOrder {
  id: string;
  orderNumber: string;
  orderDate?: Date | null;
  customer: ProFormaCustomer;
  lineItems: ProFormaLineItem[];
  billingAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
  subtotal: number;
  discount?: number | null;
  discountPercent?: number | null;
  taxRate?: number | null;
  taxAmount: number;
  shippingAmount?: number | null;
  total: number;
  customerNotes?: string | null;
}

/**
 * Pro forma invoice document data
 */
export interface ProFormaDocumentData {
  type: "pro-forma";
  /** Document number (e.g., PF-2024-001) */
  documentNumber: string;
  /** Issue date */
  issueDate: Date;
  /** Validity period end date */
  validUntil: Date;
  /** Order data with line items */
  order: ProFormaOrder;
  /** Terms and conditions text */
  terms?: string | null;
  /** Notes for customer */
  notes?: string | null;
  /** Reference number (e.g., PO number, quote reference) */
  reference?: string | null;
  /** Payment details (bank info, terms) */
  paymentDetails?: DocumentPaymentDetails | null;
  /** When the document was generated */
  generatedAt?: Date | null;
}

export interface ProFormaPdfTemplateProps {
  /** Pro forma invoice document data */
  data: ProFormaDocumentData;
}

export interface ProFormaPdfDocumentProps extends ProFormaPdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function ProFormaContent({ data }: ProFormaPdfTemplateProps) {
  const { organization } = useOrgDocument();

  const { order } = data;

  // Build "from" address from organization
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
    // Include ABN/Tax ID for reference (though not a tax invoice)
    taxId: organization.taxId,
  };

  // Build "to" address from billing address (preferred) or customer address (fallback)
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

  // Resolve notes: document notes take precedence, fall back to order customer notes
  const resolvedNotes = data.notes ?? order.customerNotes;

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Pro Forma"
        documentNumber={data.documentNumber}
      />
      <View style={styles.content}>
        {/* Header with logo and document info */}
        <DocumentHeader
          title="PRO FORMA INVOICE"
          documentNumber={data.documentNumber}
          date={data.issueDate}
          validUntil={data.validUntil}
        />

        {/* NOT A TAX INVOICE disclaimer banner */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerText}>
            This is NOT a Tax Invoice
          </Text>
          <Text style={styles.disclaimerSubtext}>
            This pro forma invoice is for customs, banking, or informational purposes only.
            A formal tax invoice will be issued upon order confirmation.
          </Text>
        </View>

        {/* From/To addresses */}
        <AddressColumns from={fromAddress} to={toAddress} />

        {/* Line items table */}
        <LineItems
          lineItems={order.lineItems}
          showSku={order.lineItems.some((item) => item.sku)}
          showNotes={order.lineItems.some((item) => item.notes)}
        />

        {/* Totals summary - unbreakable */}
        <View wrap={false}>
        <Summary
          subtotal={order.subtotal}
          discountAmount={order.discount}
          discountPercent={order.discountPercent}
          taxRate={order.taxRate}
          taxAmount={order.taxAmount}
          shippingAmount={order.shippingAmount}
          total={order.total}
          balanceDue={null}
        />
        </View>

        {/* Footer with payment details, terms, and notes - unbreakable */}
        <View wrap={false}>
        <DocumentFooter
          paymentDetails={
            data.paymentDetails
              ? {
                  bankName: data.paymentDetails.bankName,
                  accountName: data.paymentDetails.accountName,
                  accountNumber: data.paymentDetails.accountNumber,
                  bsb: data.paymentDetails.bsb,
                  swift: data.paymentDetails.swift,
                  paymentInstructions: data.paymentDetails.paymentInstructions,
                }
              : null
          }
          terms={data.terms}
          notes={resolvedNotes}
        />
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
 * Pro Forma Invoice PDF Document
 *
 * Renders a complete pro forma invoice with organization branding.
 * Clearly marked as "NOT A TAX INVOICE" for customs, banking, or informational use.
 *
 * @example
 * const { buffer } = await renderPdfToBuffer(
 *   <ProFormaPdfDocument organization={org} data={proFormaData} />
 * );
 */
export function ProFormaPdfDocument({
  organization,
  data,
}: ProFormaPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Pro Forma Invoice ${data.documentNumber}`}
        author={organization.name}
        subject={`Pro Forma Invoice for ${data.order.customer.name}`}
        creator="Renoz CRM"
        language="en-AU"
        keywords={`pro forma, ${data.documentNumber}, ${data.order.customer.name}`}
      >
        <ProFormaContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Pro Forma Invoice PDF Template (for use within existing Document/Provider)
 *
 * Use this when you need to control the Document wrapper yourself,
 * or when rendering multiple documents in a single PDF.
 */
export function ProFormaPdfTemplate({ data }: ProFormaPdfTemplateProps) {
  return <ProFormaContent data={data} />;
}
