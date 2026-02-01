/**
 * Warranty Certificate PDF Template
 *
 * Generates formal warranty certificates showing coverage details,
 * dates, terms, and verification QR code. Used for customer-facing
 * warranty documentation and proof of coverage.
 *
 * @see drizzle/schema/warranty/warranties.ts for warranty data
 */

import { Document, Page, StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import {
  CertificateBorder,
  CertificateDivider,
  CertificateSeal,
} from "../../components/certificate-border";
import { QRCode } from "../../components/qr-code";
import { PageNumber } from "../../components/footer";
import {
  colors,
  fontSize,
  spacing,
  pageMargins,
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
    alignItems: "center",
    paddingVertical: spacing["2xl"],
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
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    letterSpacing: 1,
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
    paddingHorizontal: spacing["2xl"],
    marginVertical: spacing.lg,
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
    borderRadius: 4,
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
  /** Optional QR code data URL (pre-generated) */
  qrCodeDataUrl?: string;
}

export interface WarrantyCertificatePdfDocumentProps
  extends WarrantyCertificatePdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function WarrantyCertificateContent({
  data,
  qrCodeDataUrl,
}: WarrantyCertificatePdfTemplateProps) {
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

  return (
    <Page size="A4" style={styles.page}>
      <CertificateBorder primaryColor={primaryColor} variant="classic">
        <View style={styles.content}>
          {/* Logo/Organization */}
          <View style={styles.logoContainer}>
            {organization.branding?.logoUrl ? (
              <Image src={organization.branding.logoUrl} style={styles.logo} />
            ) : (
              <Text style={[styles.orgName, { color: primaryColor }]}>
                {organization.name}
              </Text>
            )}
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: primaryColor }]}>
              WARRANTY CERTIFICATE
            </Text>
            <Text style={styles.subtitle}>{getStatusDisplay(data.status)}</Text>
            <Text style={styles.certificateNumber}>
              Certificate No: {data.warrantyNumber}
            </Text>
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.certifyText}>This certifies that</Text>
            <Text style={styles.customerName}>{data.customerName}</Text>

            {/* Product Information */}
            <View style={styles.productSection}>
              <Text style={styles.productLabel}>COVERED PRODUCT</Text>
              <Text style={styles.productName}>{data.productName}</Text>
              {data.productSerial && (
                <Text style={styles.serialNumber}>
                  Serial Number: {data.productSerial}
                </Text>
              )}
              {data.items && data.items.length > 0 && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={styles.productLabel}>COVERED ITEMS</Text>
                  {data.items.map((item) => (
                    <View key={item.id} style={{ marginTop: spacing.xs }}>
                      <Text style={styles.serialNumber}>
                        {item.productName ?? "Unknown Product"}
                        {item.productSku ? ` (${item.productSku})` : ""}
                      </Text>
                      {item.productSerial && (
                        <Text style={styles.serialNumber}>
                          Serial: {item.productSerial}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Coverage Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Registration Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForPdf(data.registrationDate, locale)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Expiry Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForPdf(data.expiryDate, locale)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{data.warrantyDuration}</Text>
              </View>
            </View>

            {/* Cycle information for battery warranties */}
            {data.cycleLimit && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cycle Limit</Text>
                  <Text style={styles.detailValue}>
                    {data.cycleLimit.toLocaleString()} cycles
                  </Text>
                </View>
                {data.currentCycleCount !== null && data.currentCycleCount !== undefined && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Current Cycles</Text>
                    <Text style={styles.detailValue}>
                      {data.currentCycleCount.toLocaleString()} cycles
                    </Text>
                  </View>
                )}
                {data.coverageType && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Coverage Type</Text>
                    <Text style={styles.detailValue}>{data.coverageType}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          {/* Terms */}
          {data.terms && (
            <View style={styles.termsSection}>
              <Text style={styles.termsTitle}>WARRANTY TERMS</Text>
              <Text style={styles.termsText}>{data.terms}</Text>
            </View>
          )}

          {/* QR Code */}
          {qrCodeDataUrl && (
            <View style={styles.qrSection}>
              <QRCode dataUrl={qrCodeDataUrl} size={60} />
              <Text style={styles.qrLabel}>Scan to verify warranty</Text>
            </View>
          )}

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
  qrCodeDataUrl,
}: WarrantyCertificatePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Warranty Certificate ${data.warrantyNumber}`}
        author={organization.name}
        subject={`Warranty Certificate for ${data.customerName}`}
        creator="Renoz CRM"
      >
        <WarrantyCertificateContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
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
export function WarrantyCertificatePdfTemplate({
  data,
  qrCodeDataUrl,
}: WarrantyCertificatePdfTemplateProps) {
  return <WarrantyCertificateContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}
