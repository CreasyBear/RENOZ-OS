/**
 * Report Summary PDF Template
 *
 * Generates a branded summary report with key metrics.
 */
import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import {
  DocumentBodyText,
  DocumentDetailStrip,
  DocumentMasthead,
  DocumentSectionCard,
  FixedDocumentHeader,
  PageNumber,
} from "../../components";
import {
  colors,
  pageMargins,
  fixedHeaderClearance,
  spacing,
  borderRadius,
  fontSize,
  lineHeight,
  tabularNums,
  FONT_FAMILY,
  FONT_WEIGHTS,
  formatDateForPdf,
} from "../../components/theme";
import type { DocumentOrganization } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface ReportSummaryMetric {
  label: string;
  value: string;
}

export interface ReportSummaryDocumentData {
  reportName: string;
  dateFrom: Date;
  dateTo: Date;
  metrics: ReportSummaryMetric[];
  generatedAt?: Date;
}

export interface ReportSummaryPdfDocumentProps {
  organization: DocumentOrganization;
  data: ReportSummaryDocumentData;
}

export interface ActivityExportRow {
  timestamp: Date;
  action: string;
  entity: string;
  actor: string;
  description: string;
}

export interface ActivityExportDocumentData {
  reportName: string;
  generatedAt: Date;
  filterSummary: string[];
  totalCount: number;
  activities: ActivityExportRow[];
}

export interface ActivityExportPdfDocumentProps {
  organization: DocumentOrganization;
  data: ActivityExportDocumentData;
}

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
    fontSize: fontSize.base,
  },
  content: {
    flex: 1,
    marginTop: fixedHeaderClearance,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize["2xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: FONT_FAMILY,
    color: colors.text.muted,
    fontSize: fontSize.base,
    lineHeight: lineHeight.relaxed,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    backgroundColor: colors.background.white,
  },
  heroMetricCard: {
    borderWidth: 0.75,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    backgroundColor: colors.background.card,
    marginBottom: spacing.md,
  },
  heroMetricLabel: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  heroMetricValue: {
    fontSize: fontSize["4xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    ...tabularNums,
  },
  heroMetricCaption: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  supportingMetricsRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  supportingMetricCard: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.background.white,
    marginRight: spacing.sm,
  },
  supportingMetricCardLast: {
    marginRight: 0,
  },
  supportingMetricLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  supportingMetricValue: {
    fontSize: fontSize.xl,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    ...tabularNums,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  cellLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
    lineHeight: lineHeight.relaxed,
  },
  cellValue: {
    width: 140,
    fontFamily: FONT_FAMILY,
    textAlign: "right",
    color: colors.text.primary,
    fontWeight: FONT_WEIGHTS.semibold,
    ...tabularNums,
  },
  footer: {
    marginTop: spacing.lg,
    fontFamily: FONT_FAMILY,
    color: colors.text.muted,
    fontSize: fontSize.sm,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  filterList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  filterItem: {
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
    fontSize: fontSize.sm,
  },
  activityHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  activityRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  timeCell: {
    width: 90,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
  },
  actionCell: {
    width: 70,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
  },
  entityCell: {
    width: 120,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
  },
  actorCell: {
    width: 110,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
  },
  descriptionCell: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    color: colors.text.primary,
  },
});

// ============================================================================
// INTERNAL COMPONENT
// ============================================================================

function ReportSummaryContent({ data }: { data: ReportSummaryDocumentData }) {
  const { organization, locale } = useOrgDocument();
  const generatedAt = data.generatedAt ?? new Date();
  const [primaryMetric, ...secondaryMetrics] = data.metrics;
  const detailItems = [
    { label: "From", value: formatDateForPdf(data.dateFrom, locale) },
    { label: "To", value: formatDateForPdf(data.dateTo, locale) },
    { label: "Generated", value: formatDateForPdf(generatedAt, locale) },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Report"
        documentNumber={data.reportName}
      />
      <View style={styles.content}>
        <DocumentMasthead
          title={data.reportName}
          meta={[
            { label: "Organization", value: organization.name },
            { label: "Metrics", value: String(data.metrics.length) },
          ]}
          callout={{
            eyebrow: "Reporting Window",
            title: `${formatDateForPdf(data.dateFrom, locale)} - ${formatDateForPdf(data.dateTo, locale)}`,
            detail: "Key metrics are summarized below.",
            tone: "info",
          }}
        />

        <DocumentDetailStrip items={detailItems} />

        {primaryMetric ? (
          <>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>{primaryMetric.label}</Text>
              <Text style={styles.heroMetricValue}>{primaryMetric.value}</Text>
              <Text style={styles.heroMetricCaption}>
                Primary headline metric for this reporting window.
              </Text>
            </View>

            {secondaryMetrics.length > 0 ? (
              <View style={styles.supportingMetricsRow}>
                {secondaryMetrics.slice(0, 3).map((metric, index, metrics) => (
                  <View
                    key={metric.label}
                    style={index === metrics.length - 1 ? [styles.supportingMetricCard, styles.supportingMetricCardLast] : styles.supportingMetricCard}
                  >
                    <Text style={styles.supportingMetricLabel}>{metric.label}</Text>
                    <Text style={styles.supportingMetricValue}>{metric.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {secondaryMetrics.slice(3).length > 0 ? (
              <DocumentSectionCard title="Metric Breakdown">
                <View style={styles.tableHeader}>
                  <Text style={styles.cellLabel}>Metric</Text>
                  <Text style={styles.cellValue}>Value</Text>
                </View>
                {secondaryMetrics.slice(3).map((metric) => (
                  <View key={metric.label} style={styles.tableRow}>
                    <Text style={styles.cellLabel}>{metric.label}</Text>
                    <Text style={styles.cellValue}>{metric.value}</Text>
                  </View>
                ))}
              </DocumentSectionCard>
            ) : null}
          </>
        ) : (
          <View style={styles.card}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellLabel}>Metric</Text>
              <Text style={styles.cellValue}>Value</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          This report was generated by Renoz CRM.
        </Text>
      </View>

      <PageNumber documentNumber={data.reportName} />
    </Page>
  );
}

// ============================================================================
// EXPORTED COMPONENT
// ============================================================================

export function ReportSummaryPdfDocument({
  organization,
  data,
}: ReportSummaryPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={data.reportName}
        author={organization.name}
        subject={`${data.reportName} summary`}
        creator="Renoz CRM"
        language="en-AU"
        keywords={`report, ${data.reportName}`}
      >
        <ReportSummaryContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}

function ActivityExportContent({ data }: { data: ActivityExportDocumentData }) {
  const { organization, locale } = useOrgDocument();
  const detailItems = [
    { label: "Generated", value: formatDateForPdf(data.generatedAt, locale), weight: 1 },
    { label: "Total Records", value: String(data.totalCount), weight: 1.2, emphasis: "strong" as const },
    { label: "Filters", value: String(data.filterSummary.length), weight: 0.8, emphasis: "subtle" as const },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Activity Export"
        documentNumber={data.reportName}
      />
      <View style={styles.content}>
        <DocumentMasthead
          title={data.reportName}
          meta={[{ label: "Organization", value: organization.name }]}
          callout={{
            eyebrow: "Activity Export",
            title: `${data.totalCount} records`,
            detail: "Filters and exported activities are listed below.",
            tone: "info",
          }}
        />

        <DocumentDetailStrip items={detailItems} />

        <DocumentSectionCard title="Filters">
          <>
            {data.filterSummary.map((filter) => (
              <DocumentBodyText key={filter}>{filter}</DocumentBodyText>
            ))}
          </>
        </DocumentSectionCard>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.activityHeader}>
            <Text style={styles.timeCell}>Timestamp</Text>
            <Text style={styles.actionCell}>Action</Text>
            <Text style={styles.entityCell}>Entity</Text>
            <Text style={styles.actorCell}>Actor</Text>
            <Text style={styles.descriptionCell}>Description</Text>
          </View>
          {data.activities.map((activity, index) => (
            <View key={`${activity.timestamp.toISOString()}-${index}`} style={styles.activityRow} wrap={false}>
              <Text style={styles.timeCell}>{formatDateForPdf(activity.timestamp, locale)}</Text>
              <Text style={styles.actionCell}>{activity.action}</Text>
              <Text style={styles.entityCell}>{activity.entity}</Text>
              <Text style={styles.actorCell}>{activity.actor}</Text>
              <Text style={styles.descriptionCell}>{activity.description}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>This activity export was generated by Renoz CRM.</Text>
      </View>

      <PageNumber documentNumber={data.reportName} />
    </Page>
  );
}

export function ActivityExportPdfDocument({
  organization,
  data,
}: ActivityExportPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={data.reportName}
        author={organization.name}
        subject="Activity export"
        creator="Renoz CRM"
        language="en-AU"
        keywords="activities, export, audit"
      >
        <ActivityExportContent data={data} />
      </Document>
    </OrgDocumentProvider>
  );
}
