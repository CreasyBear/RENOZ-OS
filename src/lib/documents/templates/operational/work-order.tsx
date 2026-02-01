/**
 * Work Order PDF Template
 *
 * Generates operational work order documents for field technicians.
 * Includes job details, customer info, checklist items, and sign-off sections.
 */

import { Document, Page, StyleSheet, View, Text } from "@react-pdf/renderer";
import {
  DocumentHeader,
  AddressBlock,
  PageNumber,
  WorkOrderSignOff,
  pageMargins,
  colors,
  spacing,
  fontSize,
  formatDateForPdf,
} from "../../components";
import { FONT_FAMILY, FONT_WEIGHTS } from "../../fonts";
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
  },
  // Two-column layout for customer and job info
  twoColumn: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  column: {
    flex: 1,
  },
  leftColumn: {
    marginRight: spacing.lg,
  },
  // Job info section
  jobInfoSection: {
    backgroundColor: colors.background.subtle,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing.xs,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  // Priority badge
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.inverse,
  },
  // Job description
  descriptionSection: {
    marginTop: spacing.lg,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.6,
  },
  // Checklist section
  checklistSection: {
    marginTop: spacing.xl,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: colors.border.medium,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  checklistDescription: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    marginTop: 2,
  },
  checklistRequired: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.status.error,
    marginTop: 2,
  },
  // Materials section
  materialsSection: {
    marginTop: spacing.xl,
  },
  materialRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  materialHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
    backgroundColor: colors.background.subtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  materialName: {
    flex: 3,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  materialQty: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "center",
  },
  materialHeaderText: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
  // Notes section
  notesSection: {
    marginTop: spacing.xl,
  },
  notesBox: {
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    minHeight: 80,
  },
  notesText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
  // Internal notes (different styling)
  internalNotesSection: {
    marginTop: spacing.lg,
    backgroundColor: "#FEF9C3", // Yellow background
    padding: spacing.md,
    borderRadius: 4,
  },
  internalNotesTitle: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.status.warning,
    marginBottom: spacing.xs,
  },
  internalNotesText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  // Safety section
  safetySection: {
    marginTop: spacing.lg,
    backgroundColor: "#FEE2E2", // Red background
    padding: spacing.md,
    borderRadius: 4,
  },
  safetyTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.status.error,
    marginBottom: spacing.xs,
  },
  safetyText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Checklist item for work order
 */
export interface WorkOrderChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  isRequired?: boolean;
  isCompleted?: boolean;
  order?: number;
}

/**
 * Material/part needed for work order
 */
export interface WorkOrderMaterial {
  id: string;
  name: string;
  sku?: string | null;
  quantity: number;
  notes?: string | null;
}

/**
 * Priority levels for work orders
 */
export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

/**
 * Work order document data
 */
export interface WorkOrderDocumentData {
  /** Document number (e.g., WO-2024-001) */
  documentNumber: string;
  /** Related order/job number */
  orderNumber?: string | null;
  /** Work order title */
  title: string;
  /** Detailed description */
  description?: string | null;
  /** Issue/creation date */
  issueDate: Date;
  /** Scheduled date */
  scheduledDate?: Date | null;
  /** Scheduled time window */
  scheduledTimeWindow?: string | null;
  /** Estimated duration (e.g., "2-3 hours") */
  estimatedDuration?: string | null;
  /** Priority level */
  priority?: WorkOrderPriority | null;
  /** Job type/category */
  jobType?: string | null;
  /** Customer information */
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  /** Site/job address */
  siteAddress?: {
    name?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    accessInstructions?: string | null;
  } | null;
  /** Assigned technician */
  assignedTechnician?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  /** Checklist items */
  checklist?: WorkOrderChecklistItem[];
  /** Required materials/parts */
  materials?: WorkOrderMaterial[];
  /** Safety notes */
  safetyNotes?: string | null;
  /** Notes visible to technician */
  technicianNotes?: string | null;
  /** Internal notes (not shown to customer) */
  internalNotes?: string | null;
  /** Notes for customer */
  customerNotes?: string | null;
}

export interface WorkOrderPdfTemplateProps {
  /** Work order document data */
  data: WorkOrderDocumentData;
  /** Show checklist section */
  showChecklist?: boolean;
  /** Show materials section */
  showMaterials?: boolean;
  /** Show customer signature section */
  showCustomerSignature?: boolean;
}

export interface WorkOrderPdfDocumentProps extends WorkOrderPdfTemplateProps {
  /** Organization data for branding */
  organization: DocumentOrganization;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPriorityColor(priority: WorkOrderPriority | null | undefined): string {
  switch (priority) {
    case "urgent":
      return colors.status.error;
    case "high":
      return "#EA580C"; // Orange-600
    case "medium":
      return colors.status.warning;
    case "low":
    default:
      return colors.status.success;
  }
}

function getPriorityLabel(priority: WorkOrderPriority | null | undefined): string {
  switch (priority) {
    case "urgent":
      return "URGENT";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
    default:
      return "LOW";
  }
}

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

function ChecklistSection({ items }: { items: WorkOrderChecklistItem[] }) {
  // Sort by order if available
  const sortedItems = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <View style={styles.checklistSection}>
      <Text style={styles.sectionTitle}>Checklist</Text>
      {sortedItems.map((item) => (
        <View key={item.id} wrap={false} style={styles.checklistItem}>
          <View
            style={
              item.isCompleted
                ? [styles.checkbox, styles.checkboxChecked]
                : styles.checkbox
            }
          />
          <View style={styles.checklistContent}>
            <Text style={styles.checklistTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.checklistDescription}>{item.description}</Text>
            )}
            {item.isRequired && !item.isCompleted && (
              <Text style={styles.checklistRequired}>* Required</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function MaterialsSection({ materials }: { materials: WorkOrderMaterial[] }) {
  return (
    <View style={styles.materialsSection}>
      <Text style={styles.sectionTitle}>Materials / Parts Required</Text>
      {/* Header */}
      <View style={[styles.materialRow, styles.materialHeader]}>
        <Text style={[styles.materialName, styles.materialHeaderText]}>Item</Text>
        <Text style={[styles.materialQty, styles.materialHeaderText]}>Qty</Text>
      </View>
      {/* Items */}
      {materials.map((material) => (
        <View key={material.id} wrap={false} style={styles.materialRow}>
          <View style={{ flex: 3 }}>
            <Text style={styles.materialName}>{material.name}</Text>
            {material.sku && (
              <Text style={{ fontSize: fontSize.xs, color: colors.text.muted }}>
                SKU: {material.sku}
              </Text>
            )}
            {material.notes && (
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.muted,
                  fontStyle: "italic",
                }}
              >
                {material.notes}
              </Text>
            )}
          </View>
          <Text style={styles.materialQty}>{material.quantity}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// INTERNAL COMPONENT (uses context)
// ============================================================================

function WorkOrderContent({
  data,
  showChecklist = true,
  showMaterials = true,
  showCustomerSignature = true,
}: WorkOrderPdfTemplateProps) {
  const { locale } = useOrgDocument();

  // Build site address
  const siteAddress = data.siteAddress
    ? {
        name: data.siteAddress.name || data.customer.name,
        street1: data.siteAddress.addressLine1,
        street2: data.siteAddress.addressLine2,
        city: data.siteAddress.city,
        state: data.siteAddress.state,
        postalCode: data.siteAddress.postalCode,
        country: data.siteAddress.country,
        phone: data.customer.phone,
      }
    : {
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email,
      };

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.content}>
        {/* Header with logo and document info */}
        <DocumentHeader
          title="WORK ORDER"
          documentNumber={data.documentNumber}
          date={data.issueDate}
        />

        {/* Two-column: Customer/Site info and Job Info */}
        <View style={styles.twoColumn}>
          <View style={[styles.column, styles.leftColumn]}>
            <AddressBlock
              label="Customer / Site"
              address={siteAddress}
              showContact
            />
            {data.siteAddress?.accessInstructions && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.infoLabel}>Access Instructions</Text>
                <Text style={styles.infoValue}>
                  {data.siteAddress.accessInstructions}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.column}>
            {/* Assigned Technician */}
            {data.assignedTechnician && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.sectionTitle}>Assigned To</Text>
                <Text style={styles.infoValue}>{data.assignedTechnician.name}</Text>
                {data.assignedTechnician.phone && (
                  <Text
                    style={[styles.infoValue, { fontSize: fontSize.xs, color: colors.text.secondary }]}
                  >
                    {data.assignedTechnician.phone}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Job Info Section */}
        <View style={styles.jobInfoSection}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.infoGrid}>
            {data.orderNumber && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Order Reference</Text>
                <Text style={styles.infoValue}>{data.orderNumber}</Text>
              </View>
            )}
            {data.jobType && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Job Type</Text>
                <Text style={styles.infoValue}>{data.jobType}</Text>
              </View>
            )}
            {data.scheduledDate && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Scheduled Date</Text>
                <Text style={styles.infoValue}>
                  {formatDateForPdf(data.scheduledDate, locale)}
                </Text>
              </View>
            )}
            {data.scheduledTimeWindow && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Time Window</Text>
                <Text style={styles.infoValue}>{data.scheduledTimeWindow}</Text>
              </View>
            )}
            {data.estimatedDuration && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Est. Duration</Text>
                <Text style={styles.infoValue}>{data.estimatedDuration}</Text>
              </View>
            )}
            {data.priority && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Priority</Text>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(data.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>
                    {getPriorityLabel(data.priority)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Job Description */}
        {(data.title || data.description) && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>{data.title || "Work Description"}</Text>
            {data.description && (
              <Text style={styles.descriptionText}>{data.description}</Text>
            )}
          </View>
        )}

        {/* Safety Notes */}
        {data.safetyNotes && (
          <View style={styles.safetySection}>
            <Text style={styles.safetyTitle}>SAFETY NOTES</Text>
            <Text style={styles.safetyText}>{data.safetyNotes}</Text>
          </View>
        )}

        {/* Checklist */}
        {showChecklist && data.checklist && data.checklist.length > 0 && (
          <ChecklistSection items={data.checklist} />
        )}

        {/* Materials */}
        {showMaterials && data.materials && data.materials.length > 0 && (
          <MaterialsSection materials={data.materials} />
        )}

        {/* Technician Notes */}
        {data.technicianNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Technician Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{data.technicianNotes}</Text>
            </View>
          </View>
        )}

        {/* Internal Notes */}
        {data.internalNotes && (
          <View style={styles.internalNotesSection}>
            <Text style={styles.internalNotesTitle}>INTERNAL NOTES</Text>
            <Text style={styles.internalNotesText}>{data.internalNotes}</Text>
          </View>
        )}

        {/* Signature Section */}
        <WorkOrderSignOff
          technicianName={data.assignedTechnician?.name || null}
          completionDate={null} // Leave blank for field completion
          showCustomerSignature={showCustomerSignature}
        />
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
 * Work Order PDF Document
 *
 * Renders a complete work order with organization branding.
 * Designed for field technicians with job details, customer info,
 * checklist items, materials, and sign-off sections.
 *
 * @example
 * const { buffer } = await renderPdfToBuffer(
 *   <WorkOrderPdfDocument
 *     organization={org}
 *     data={workOrderData}
 *     showChecklist={true}
 *     showMaterials={true}
 *   />
 * );
 */
export function WorkOrderPdfDocument({
  organization,
  data,
  showChecklist = true,
  showMaterials = true,
  showCustomerSignature = true,
}: WorkOrderPdfDocumentProps) {
  return (
    <OrgDocumentProvider organization={organization}>
      <Document
        title={`Work Order ${data.documentNumber}`}
        author={organization.name}
        subject={`Work Order for ${data.customer.name}`}
        creator="Renoz CRM"
      >
        <WorkOrderContent
          data={data}
          showChecklist={showChecklist}
          showMaterials={showMaterials}
          showCustomerSignature={showCustomerSignature}
        />
      </Document>
    </OrgDocumentProvider>
  );
}

/**
 * Work Order PDF Template (for use within existing Document/Provider)
 */
export function WorkOrderPdfTemplate({
  data,
  showChecklist = true,
  showMaterials = true,
  showCustomerSignature = true,
}: WorkOrderPdfTemplateProps) {
  return (
    <WorkOrderContent
      data={data}
      showChecklist={showChecklist}
      showMaterials={showMaterials}
      showCustomerSignature={showCustomerSignature}
    />
  );
}
