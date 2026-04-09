/**
 * Warranty Certificate PDF Template
 *
 * Generates formal warranty certificates showing coverage details,
 * dates, terms, and verification QR code. Used for customer-facing
 * warranty documentation and proof of coverage.
 *
 * @see drizzle/schema/warranty/warranties.ts for warranty data
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  CertificateBorder,
  CertificateDivider,
  CertificateSeal,
} from "../../components/certificate-border";
import { PageNumber } from "../../components/footer";
import {
  DocumentBodyText,
  DocumentBulletList,
  DocumentDetailStrip,
  DocumentMasthead,
  DocumentSectionCard,
} from "../../components";
import {
  colors,
  fontSize,
  spacing,
  pageMargins,
  borderRadius,
  letterSpacing,
  FONT_FAMILY,
  FONT_WEIGHTS,
  formatDateForPdf,
} from "../../components/theme";
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
    alignItems: "stretch",
    paddingVertical: spacing.lg,
  },
  // Logo area
  logoContainer: {
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  logo: {
    height: 50,
    objectFit: "contain",
  },
  orgName: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  // Title area
  titleContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize["4xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.wider,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.wide,
  },
  // Certificate number
  certificateNumber: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
  // Main content area
  mainContent: {
    width: "100%",
    paddingHorizontal: 0,
    marginVertical: spacing.md,
  },
  // Customer section
  certifyText: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: fontSize["2xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  // Product section
  productSection: {
    backgroundColor: colors.background.subtle,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: borderRadius.md,
    width: "100%",
  },
  productLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  productName: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  serialNumber: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  // Details grid
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    textAlign: "center",
  },
  // Terms section
  termsSection: {
    marginTop: spacing.xl,
    width: "100%",
    paddingHorizontal: spacing.lg,
  },
  termsTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  termsText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    lineHeight: 1.5,
  },
  // QR code section
  qrSection: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  qrLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
  // Signature area
  signatureSection: {
    marginTop: spacing["2xl"],
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing["2xl"],
  },
  signatureBlock: {
    alignItems: "center",
    width: 150,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    marginBottom: spacing.xs,
    height: 30,
  },
  signatureLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  // Footer
  footer: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  issuedDate: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyCertificateData {
  /** Warranty number (e.g., "WRN-2026-00001") */
  warrantyNumber: string;
  /** Customer name */
  customerName: string;
  /** Customer address (optional for display) */
  customerAddress?: string;
  /** Primary product name/description */
  productName: string;
  /** Primary product serial number (optional) */
  productSerial?: string | null;
  /** Covered items for multi-product certificates */
  items?: Array<{
    id: string;
    productName: string | null;
    productSku: string | null;
    productSerial: string | null;
    warrantyStartDate: string;
    warrantyEndDate: string;
    warrantyPeriodMonths: number;
    installationNotes: string | null;
  }>;
  /** Registration/start date */
  registrationDate: Date;
  /** Expiry date */
  expiryDate: Date;
  /** Warranty duration (e.g., "10 Years") */
  warrantyDuration: string;
  /** Coverage type (e.g., "Parts & Labor", "Parts Only") */
  coverageType?: string;
  /** Warranty terms summary */
  terms?: string;
  /** Current status */
  status: "active" | "expiring_soon" | "expired" | "voided" | "transferred";
  /** Cycle limit for battery warranties */
  cycleLimit?: number | null;
  /** Current cycle count for battery warranties */
  currentCycleCount?: number | null;
}

export interface WarrantyCertificatePdfTemplateProps {
  /** Warranty certificate data */
  data: WarrantyCertificateData;
}

export interface WarrantyCertificatePdfDocumentProps
  extends WarrantyCertificatePdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function WarrantyCertificateContent({ data }: WarrantyCertificatePdfTemplateProps) {
  const { organization, primaryColor, locale } = useOrgDocument();

  // Determine status display
  const getStatusDisplay = (status: WarrantyCertificateData["status"]): string => {
    const statusMap: Record<WarrantyCertificateData["status"], string> = {
      active: "ACTIVE",
      expiring_soon: "EXPIRING SOON",
      expired: "EXPIRED",
      voided: "VOIDED",
      transferred: "TRANSFERRED",
    };
    return statusMap[status] || status.toUpperCase();
  };
  const logoUrl = organization.branding?.logoDataUrl ?? null;
  const detailItems = [
    { label: "Registration", value: formatDateForPdf(data.registrationDate, locale) },
    { label: "Expiry", value: formatDateForPdf(data.expiryDate, locale) },
    { label: "Duration", value: data.warrantyDuration },
    ...(data.coverageType ? [{ label: "Coverage", value: data.coverageType }] : []),
  ];
  const cycleItems = [
    ...(data.cycleLimit ? [{ label: "Cycle Limit", value: `${data.cycleLimit.toLocaleString()} cycles` }] : []),
    ...(data.currentCycleCount !== null && data.currentCycleCount !== undefined
      ? [{ label: "Current Cycles", value: `${data.currentCycleCount.toLocaleString()} cycles` }]
      : []),
  ];
  const coveredItems = data.items?.map((item) =>
    [
      item.productName ?? "Unknown Product",
      item.productSku ? `SKU ${item.productSku}` : null,
      item.productSerial ? `Serial ${item.productSerial}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
  ) ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <CertificateBorder primaryColor={primaryColor} variant="classic">
        <View style={styles.content}>
          <DocumentMasthead
            title="Warranty Certificate"
            subtitle={data.productName}
            variant="certificate"
            meta={[
              { label: "Certificate", value: data.warrantyNumber },
              { label: "Customer", value: data.customerName },
              { label: "Issued By", value: organization.name },
            ]}
            callout={{
              eyebrow: "Status",
              title: getStatusDisplay(data.status),
              detail: data.coverageType ?? "Coverage details shown below.",
              tone: data.status === "active" ? "success" : data.status === "expiring_soon" ? "warning" : "info",
            }}
            logoUrl={logoUrl}
          />

          <CertificateDivider primaryColor={primaryColor} />

          <View style={styles.mainContent}>
            <DocumentSectionCard title="Covered Customer" variant="formal">
              <DocumentBodyText>{data.customerName}</DocumentBodyText>
            </DocumentSectionCard>

            <DocumentSectionCard title="Covered Product" variant="formal">
              <>
                <DocumentBodyText>{data.productName}</DocumentBodyText>
                {data.productSerial ? (
                  <DocumentBodyText>{`Serial Number: ${data.productSerial}`}</DocumentBodyText>
                ) : null}
                {coveredItems.length > 0 ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <DocumentBulletList items={coveredItems} />
                  </View>
                ) : null}
              </>
            </DocumentSectionCard>

            <DocumentDetailStrip items={detailItems} variant="formal" />
            {cycleItems.length > 0 ? <DocumentDetailStrip items={cycleItems} variant="formal" /> : null}
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          {data.terms && (
            <DocumentSectionCard title="Warranty Terms" variant="formal">
              <DocumentBodyText>{data.terms}</DocumentBodyText>
            </DocumentSectionCard>
          )}

          {/* QR Code */}

          {/* Seal */}
          <CertificateSeal primaryColor={primaryColor} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.issuedDate}>
              Issued by {organization.name} on{" "}
              {formatDateForPdf(new Date(), locale)}
            </Text>
          </View>
        </View>
      </CertificateBorder>

      <PageNumber />
    </Page>
  );
}

// ============================================================================
// EXPORTED COMPONENTS
// ============================================================================

/**
 * Warranty Certificate PDF Document
 *
 * Renders a complete warranty certificate with organization branding.
 * Must be used with renderPdfToBuffer or similar PDF rendering function.
 *
 * @example
 * const qrCode = await generateQRCode(`https://app.example.com/warranty/${warrantyId}`);
 * const { buffer } = await renderPdfToBuffer(
 *   <WarrantyCertificatePdfDocument
 *     organization={org}
 *     data={certificateData}
 *     qrCodeDataUrl={qrCode}
 *   />
 * );
 */
export function WarrantyCertificatePdfDocument({
  organization,
  data,
}: WarrantyCertificatePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Warranty Certificate ${data.warrantyNumber}`}
        author={organization.name}
        subject={`Warranty Certificate for ${data.customerName}`}
        creator="Renoz CRM"
        language="en-AU"
        keywords={`warranty, ${data.warrantyNumber}, ${data.customerName}`}
      >
        <WarrantyCertificateContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Warranty Certificate PDF Template (for use within existing Document/Provider)
 *
 * Use this when you need to control the Document wrapper yourself,
 * or when rendering multiple certificates in a single PDF.
 */
export function WarrantyCertificatePdfTemplate({ data }: WarrantyCertificatePdfTemplateProps) {
  return <WarrantyCertificateContent data={data} />;
}
