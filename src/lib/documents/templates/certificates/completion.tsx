/**
 * Completion Certificate PDF Template
 *
 * Generates formal job completion certificates acknowledging
 * completed work, including job details, completion date,
 * customer sign-off, and verification QR code.
 *
 * @see drizzle/schema/jobs/job-assignments.ts for job data
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
  completionText: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  // Job details section
  jobSection: {
    backgroundColor: colors.background.subtle,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: 4,
    width: "100%",
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  jobNumber: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  jobDescription: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.5,
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
  // Address section
  addressSection: {
    width: "100%",
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  addressLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
  // Work performed section
  workSection: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  workTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  workItem: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  workBullet: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  workText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    flex: 1,
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
  signatureWithImage: {
    width: "100%",
    height: 40,
    marginBottom: spacing.xs,
  },
  signatureImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  signatureLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
  signatureName: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginTop: spacing.xs,
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
  // Technician info
  technicianSection: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  technicianLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
  },
  technicianName: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface CompletionCertificateData {
  /** Job number (e.g., "JOB-2026-00001") */
  jobNumber: string;
  /** Job title */
  jobTitle: string;
  /** Job description/scope of work */
  jobDescription?: string;
  /** Customer name */
  customerName: string;
  /** Job address */
  jobAddress?: string;
  /** Scheduled date */
  scheduledDate: Date;
  /** Completion date */
  completedAt: Date;
  /** Technician/installer name */
  technicianName: string;
  /** Work performed items */
  workPerformed?: string[];
  /** Customer signature URL (if available) */
  customerSignatureUrl?: string | null;
  /** Name of person who signed off */
  signedByName?: string | null;
  /** Related order number (if applicable) */
  orderNumber?: string | null;
  /** Job type */
  jobType: "installation" | "service" | "warranty" | "inspection" | "commissioning";
}

export interface CompletionCertificatePdfTemplateProps {
  /** Completion certificate data */
  data: CompletionCertificateData;
  /** Optional QR code data URL (pre-generated) */
  qrCodeDataUrl?: string;
}

export interface CompletionCertificatePdfDocumentProps
  extends CompletionCertificatePdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function CompletionCertificateContent({
  data,
  qrCodeDataUrl,
}: CompletionCertificatePdfTemplateProps) {
  const { organization, primaryColor, locale } = useOrgDocument();

  // Format job type for display
  const getJobTypeDisplay = (type: CompletionCertificateData["jobType"]): string => {
    const typeMap: Record<CompletionCertificateData["jobType"], string> = {
      installation: "Installation",
      service: "Service",
      warranty: "Warranty Service",
      inspection: "Inspection",
      commissioning: "Commissioning",
    };
    return typeMap[type] || String(type).charAt(0).toUpperCase() + String(type).slice(1);
  };

  return (
    <Page size="A4" style={styles.page}>
      <CertificateBorder primaryColor={primaryColor} variant="classic">
        <View style={styles.content}>
          {/* Logo/Organization */}
          <View style={styles.logoContainer}>
            {(organization.branding?.logoDataUrl ?? organization.branding?.logoUrl) ? (
              <Image
                src={organization.branding.logoDataUrl ?? organization.branding.logoUrl!}
                style={styles.logo}
              />
            ) : (
              <Text style={[styles.orgName, { color: primaryColor }]}>
                {organization.name}
              </Text>
            )}
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: primaryColor }]}>
              CERTIFICATE OF COMPLETION
            </Text>
            <Text style={styles.subtitle}>
              {getJobTypeDisplay(data.jobType)}
            </Text>
            <Text style={styles.certificateNumber}>
              Job Reference: {data.jobNumber}
            </Text>
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.certifyText}>
              This is to certify that the following work has been completed for
            </Text>
            <Text style={styles.customerName}>{data.customerName}</Text>

            {/* Job Details */}
            <View style={styles.jobSection}>
              <Text style={styles.jobTitle}>{data.jobTitle}</Text>
              <Text style={styles.jobNumber}>{`Job No: ${data.jobNumber}`}</Text>
              {data.jobDescription && (
                <Text style={styles.jobDescription}>{data.jobDescription}</Text>
              )}
            </View>

            {/* Location */}
            {data.jobAddress && (
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Service Location</Text>
                <Text style={styles.addressText}>{data.jobAddress}</Text>
              </View>
            )}

            {/* Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Scheduled Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForPdf(data.scheduledDate, locale)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Completed Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForPdf(data.completedAt, locale)}
                </Text>
              </View>
              {data.orderNumber && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Order Number</Text>
                  <Text style={styles.detailValue}>{data.orderNumber}</Text>
                </View>
              )}
            </View>

            {/* Work Performed */}
            {data.workPerformed && data.workPerformed.length > 0 && (
              <View style={styles.workSection}>
                <Text style={styles.workTitle}>Work Performed</Text>
                {data.workPerformed.map((item, index) => (
                  <View key={index} style={styles.workItem}>
                    <Text style={styles.workBullet}>*</Text>
                    <Text style={styles.workText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
              {data.customerSignatureUrl ? (
                <View style={styles.signatureWithImage}>
                  <Image
                    src={data.customerSignatureUrl}
                    style={styles.signatureImage}
                  />
                </View>
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={styles.signatureLabel}>Customer Signature</Text>
              {data.signedByName && (
                <Text style={styles.signatureName}>{data.signedByName}</Text>
              )}
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Authorized Representative</Text>
            </View>
          </View>

          {/* Technician Info */}
          <View style={styles.technicianSection}>
            <Text style={styles.technicianLabel}>Work performed by:</Text>
            <Text style={styles.technicianName}>{data.technicianName}</Text>
          </View>

          {/* QR Code */}
          {qrCodeDataUrl && (
            <View style={styles.qrSection}>
              <QRCode dataUrl={qrCodeDataUrl} size={50} />
              <Text style={styles.qrLabel}>Scan to verify completion</Text>
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
 * Completion Certificate PDF Document
 *
 * Renders a complete job completion certificate with organization branding.
 * Must be used with renderPdfToBuffer or similar PDF rendering function.
 *
 * @example
 * const qrCode = await generateQRCode(`https://app.example.com/jobs/${jobId}`);
 * const { buffer } = await renderPdfToBuffer(
 *   <CompletionCertificatePdfDocument
 *     organization={org}
 *     data={certificateData}
 *     qrCodeDataUrl={qrCode}
 *   />
 * );
 */
export function CompletionCertificatePdfDocument({
  organization,
  data,
  qrCodeDataUrl,
}: CompletionCertificatePdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Completion Certificate ${data.jobNumber}`}
        author={organization.name}
        subject={`Job Completion Certificate for ${data.customerName}`}
        creator="Renoz CRM"
        language="en-AU"
        keywords={`completion certificate, ${data.jobNumber}, ${data.customerName}`}
      >
        <CompletionCertificateContent data={data} qrCodeDataUrl={qrCodeDataUrl} />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Completion Certificate PDF Template (for use within existing Document/Provider)
 *
 * Use this when you need to control the Document wrapper yourself,
 * or when rendering multiple certificates in a single PDF.
 */
export function CompletionCertificatePdfTemplate({
  data,
  qrCodeDataUrl,
}: CompletionCertificatePdfTemplateProps) {
  return <CompletionCertificateContent data={data} qrCodeDataUrl={qrCodeDataUrl} />;
}
