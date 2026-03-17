/**
 * Report Summary PDF Template
 *
 * Generates a branded summary report with key metrics.
 */
import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import { OrgDocumentProvider, useOrgDocument } from "../../context";
import { FixedDocumentHeader, PageNumber } from "../../components";
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

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Report"
        documentNumber={data.reportName}
      />
      <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.reportName}</Text>
        <Text style={styles.subtitle}>
          {organization.name} • {formatDateForPdf(data.dateFrom, locale)} -{" "}
          {formatDateForPdf(data.dateTo, locale)}
        </Text>
        <Text style={styles.subtitle}>
          Generated: {formatDateForPdf(generatedAt, locale)}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.cellLabel}>Metric</Text>
          <Text style={styles.cellValue}>Value</Text>
        </View>
        {data.metrics.map((metric) => (
          <View key={metric.label} style={styles.tableRow}>
            <Text style={styles.cellLabel}>{metric.label}</Text>
            <Text style={styles.cellValue}>{metric.value}</Text>
          </View>
        ))}
      </View>

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

  return (
    <Page size="A4" style={styles.page}>
      <FixedDocumentHeader
        orgName={organization.name}
        documentType="Activity Export"
        documentNumber={data.reportName}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.reportName}</Text>
          <Text style={styles.subtitle}>{organization.name}</Text>
          <Text style={styles.subtitle}>
            Generated: {formatDateForPdf(data.generatedAt, locale)}
          </Text>
          <Text style={styles.subtitle}>Total records: {data.totalCount}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterList}>
            {data.filterSummary.map((filter) => (
              <Text key={filter} style={styles.filterItem}>
                • {filter}
              </Text>
            ))}
          </View>
        </View>

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
