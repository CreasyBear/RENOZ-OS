/**
 * Handover Pack PDF Template
 *
 * Project completion summary document with project details, system specs,
 * warranty info, and customer handover acknowledgment.
 *
 * @see docs/pre_deployment_audit/2026-02-10-handover-pack-implementation-plan.md
 * @see drizzle/schema/jobs/projects.ts for project data
 */

import { Document, Page, StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import {
  CertificateBorder,
  CertificateDivider,
  CertificateSeal,
} from "../../components/certificate-border";
import { PageNumber } from "../../components/footer";
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
    alignItems: "center",
    paddingVertical: spacing["2xl"],
  },
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
  projectNumber: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
  mainContent: {
    width: "100%",
    paddingHorizontal: spacing["2xl"],
    marginVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  sectionText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: 1.5,
  },
  projectSection: {
    backgroundColor: colors.background.subtle,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: borderRadius.md,
    width: "100%",
  },
  projectTitle: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  projectNumberLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  listBullet: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  listText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    flex: 1,
  },
  addressSection: {
    width: "100%",
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

export interface HandoverPackData {
  projectNumber: string;
  title: string;
  description?: string;
  projectType: string;
  customerName: string;
  siteAddress?: string;
  startDate: Date;
  completionDate: Date;
  /** Key deliverables / outcomes */
  outcomes?: string[];
  /** Must-have features */
  keyFeatures?: string[];
  /** System specs / scope summary */
  systemSpecs?: string[];
  /** Warranty information */
  warrantyInfo?: string;
}

export interface HandoverPackPdfTemplateProps {
  data: HandoverPackData;
}

export interface HandoverPackPdfDocumentProps extends HandoverPackPdfTemplateProps {
  organization: DocumentOrganization;
}

// ============================================================================
// INTERNAL COMPONENT
// ============================================================================

function HandoverPackContent({ data }: HandoverPackPdfTemplateProps) {
  const { organization, primaryColor, locale } = useOrgDocument();

  const formatProjectType = (type: string) =>
    type
      ? String(type)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Project";

  return (
    <Page size="A4" style={styles.page}>
      <CertificateBorder primaryColor={primaryColor} variant="classic">
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            {organization.branding?.logoDataUrl ? (
              <Image
                src={organization.branding.logoDataUrl}
                style={styles.logo}
              />
            ) : (
              <Text style={[styles.orgName, { color: primaryColor }]}>
                {organization.name}
              </Text>
            )}
          </View>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: primaryColor }]}>
              PROJECT HANDOVER PACK
            </Text>
            <Text style={styles.subtitle}>
              {formatProjectType(data.projectType)}
            </Text>
            <Text style={styles.projectNumber}>
              Project Reference: {data.projectNumber}
            </Text>
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          <View style={styles.mainContent}>
            <Text style={styles.sectionText}>
              This handover pack confirms completion of the following project for
            </Text>
            <Text style={[styles.projectTitle, { textAlign: "center", marginVertical: spacing.sm }]}>
              {data.customerName}
            </Text>

            <View style={styles.projectSection}>
              <Text style={styles.projectTitle}>{data.title}</Text>
              <Text style={styles.projectNumberLabel}>
                Project No: {data.projectNumber}
              </Text>
              {data.description && (
                <Text style={styles.sectionText}>{data.description}</Text>
              )}
            </View>

            {data.siteAddress && (
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Site Address</Text>
                <Text style={styles.addressText}>{data.siteAddress}</Text>
              </View>
            )}

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Start Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForPdf(data.startDate, locale)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Completion Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForPdf(data.completionDate, locale)}
                </Text>
              </View>
            </View>

            {data.outcomes && data.outcomes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project Outcomes</Text>
                {data.outcomes.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.listBullet}>•</Text>
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.keyFeatures && data.keyFeatures.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Features Delivered</Text>
                {data.keyFeatures.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.listBullet}>•</Text>
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.systemSpecs && data.systemSpecs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>System Specifications</Text>
                {data.systemSpecs.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.listBullet}>•</Text>
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.warrantyInfo && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Warranty Information</Text>
                <Text style={styles.sectionText}>{data.warrantyInfo}</Text>
              </View>
            )}
          </View>

          <CertificateDivider primaryColor={primaryColor} />

          <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Customer Acknowledgment</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>
                {organization.name} Authorized Representative
              </Text>
            </View>
          </View>

          <CertificateSeal primaryColor={primaryColor} />

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

export function HandoverPackPdfDocument({
  organization,
  data,
}: HandoverPackPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Handover Pack ${data.projectNumber}`}
        author={organization.name}
        subject={`Project Handover Pack for ${data.customerName}`}
        creator="Renoz CRM"
        language="en-AU"
        keywords={`handover pack, ${data.projectNumber}, ${data.customerName}`}
      >
        <HandoverPackContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

export function HandoverPackPdfTemplate({ data }: HandoverPackPdfTemplateProps) {
  return <HandoverPackContent data={data} />;
}
