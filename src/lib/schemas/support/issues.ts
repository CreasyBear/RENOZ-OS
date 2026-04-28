/**
 * Issue Validation Schemas
 *
 * Zod schemas for issue CRUD operations.
 *
 * @see drizzle/schema/support/issues.ts
 */

import { z } from 'zod';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import { normalizeObjectInput } from '../_shared/patterns';

// ============================================================================
// ENUMS
// ============================================================================

export const issueTypeSchema = z.enum([
  'hardware_fault',
  'software_firmware',
  'installation_defect',
  'performance_degradation',
  'connectivity',
  'other',
]);
export type IssueType = z.infer<typeof issueTypeSchema>;

export const issuePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type IssuePriority = z.infer<typeof issuePrioritySchema>;

export const issueStatusSchema = z.enum([
  'open',
  'in_progress',
  'pending',
  'on_hold',
  'escalated',
  'resolved',
  'closed',
]);
export type IssueStatus = z.infer<typeof issueStatusSchema>;

export const issueResolutionCategorySchema = z.enum([
  'hardware_fault',
  'shipping_damage',
  'fulfillment_error',
  'installation_issue',
  'software_or_firmware',
  'usage_guidance',
  'no_fault_found',
  'other',
]);
export type IssueResolutionCategory = z.infer<typeof issueResolutionCategorySchema>;

export const issueNextActionTypeSchema = z.enum([
  'create_rma',
  'warranty_claim',
  'field_service',
  'customer_follow_up',
  'monitor',
  'no_action',
]);
export type IssueNextActionType = z.infer<typeof issueNextActionTypeSchema>;

export const issueRmaStateSchema = z.enum(['any', 'ready', 'blocked', 'linked']);
export type IssueRmaState = z.infer<typeof issueRmaStateSchema>;

export const issueRmaBlockedReasonCodeSchema = z.enum([
  'issue_not_resolved',
  'next_action_not_rma',
  'source_order_missing',
  'no_shipped_items',
  'no_returnable_quantity',
  'serial_already_on_active_rma',
  'issue_rma_exists',
  'order_mismatch',
]);
export type IssueRmaBlockedReasonCode = z.infer<typeof issueRmaBlockedReasonCodeSchema>;

// ============================================================================
// METADATA SCHEMA
// ============================================================================

export const issueMetadataSchema = z
  .object({
    warrantyId: z.string().uuid().optional(),
    warrantyEntitlementId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    shipmentId: z.string().uuid().optional(),
    serializedItemId: z.string().uuid().optional(),
    serviceSystemId: z.string().uuid().optional(),
    serialNumber: z.string().optional(),
    batteryModel: z.string().optional(),
    installedDate: z.string().optional(),
    sohReading: z.number().min(0).max(100).optional(), // State of Health percentage
    inverterErrorCode: z.string().optional(),
    inverterModel: z.string().optional(),
  })
  .passthrough(); // Allow additional properties

export const issueAnchorFieldsSchema = z.object({
  warrantyId: z.string().uuid().nullable().optional(),
  warrantyEntitlementId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  shipmentId: z.string().uuid().nullable().optional(),
  serializedItemId: z.string().uuid().nullable().optional(),
  serviceSystemId: z.string().uuid().nullable().optional(),
  serialNumber: z.string().trim().min(1).max(255).nullable().optional(),
});
export type IssueAnchorFields = z.infer<typeof issueAnchorFieldsSchema>;

export const issueLineageStateSchema = z.enum(['any', 'present', 'missing']);
export type IssueLineageState = z.infer<typeof issueLineageStateSchema>;

export const issueIntakeAnchorSchema = z.enum(['serial', 'warranty', 'order', 'customer']);
export type IssueIntakeAnchor = z.infer<typeof issueIntakeAnchorSchema>;

export interface IssueAnchorConflict {
  field: string;
  expected?: string | null;
  actual?: string | null;
  reason: string;
}

// ============================================================================
// CREATE ISSUE
// ============================================================================

export const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  type: issueTypeSchema.default('other'),
  priority: issuePrioritySchema.default('medium'),
  customerId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  slaConfigurationId: z.string().uuid().nullable().optional(),
  metadata: issueMetadataSchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
}).merge(issueAnchorFieldsSchema);

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// ============================================================================
// UPDATE ISSUE
// ============================================================================

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: issueTypeSchema.optional(),
  priority: issuePrioritySchema.optional(),
  status: issueStatusSchema.optional(),
  customerId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  holdReason: z.string().max(500).nullable().optional(),
  resolutionCategory: issueResolutionCategorySchema.nullable().optional(),
  resolutionNotes: z.string().max(5000).nullable().optional(),
  diagnosisNotes: z.string().max(5000).nullable().optional(),
  nextActionType: issueNextActionTypeSchema.nullable().optional(),
  metadata: issueMetadataSchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
}).merge(issueAnchorFieldsSchema);

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const getIssuesSchema = normalizeObjectInput(
  z.object({
    status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
    priority: z.union([issuePrioritySchema, z.array(issuePrioritySchema)]).optional(),
    type: issueTypeSchema.optional(),
    customerId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    /** Resolved client-side: 'me' = current user, 'unassigned' = null assignee */
    assignedToFilter: z.enum(['me', 'unassigned']).optional(),
    search: z.string().optional(),
    slaStatus: z.enum(['breached', 'at_risk']).optional(),
    escalated: z.boolean().optional(),
    nextActionType: issueNextActionTypeSchema.optional(),
    rmaState: issueRmaStateSchema.optional(),
    serialState: issueLineageStateSchema.optional(),
    warrantyState: issueLineageStateSchema.optional(),
    orderState: issueLineageStateSchema.optional(),
    serviceSystemState: issueLineageStateSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  })
);

export const getIssuesCursorSchema = normalizeObjectInput(
  cursorPaginationSchema.merge(
    z.object({
      status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
      priority: z.union([issuePrioritySchema, z.array(issuePrioritySchema)]).optional(),
      type: issueTypeSchema.optional(),
      customerId: z.string().uuid().optional(),
      assignedToUserId: z.string().uuid().optional(),
      assignedToFilter: z.enum(['me', 'unassigned']).optional(),
      search: z.string().optional(),
      slaStatus: z.enum(['breached', 'at_risk']).optional(),
      escalated: z.boolean().optional(),
      nextActionType: issueNextActionTypeSchema.optional(),
      rmaState: issueRmaStateSchema.optional(),
      serialState: issueLineageStateSchema.optional(),
      warrantyState: issueLineageStateSchema.optional(),
      orderState: issueLineageStateSchema.optional(),
      serviceSystemState: issueLineageStateSchema.optional(),
    })
  )
);

export type GetIssuesCursorInput = z.infer<typeof getIssuesCursorSchema>;

export const getIssueByIdSchema = z.object({
  issueId: z.string().uuid(),
});

export const newIssueSearchSchema = normalizeObjectInput(
  z.object({
    intakeAnchor: issueIntakeAnchorSchema.optional(),
    customerId: z.string().uuid().optional(),
    warrantyId: z.string().uuid().optional(),
    warrantyEntitlementId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    serializedItemId: z.string().uuid().optional(),
    serviceSystemId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    shipmentId: z.string().uuid().optional(),
    serialNumber: z.string().optional(),
  })
);

export type NewIssueSearch = z.infer<typeof newIssueSearchSchema>;

// ============================================================================
// UI / COMPONENT TYPES (per SCHEMA-TRACE.md - types in schemas, not components)
// ============================================================================

/** SLA metrics returned by server for issue list/kanban views */
export interface IssueSlaMetrics {
  responseDueAt?: Date | string | null;
  resolutionDueAt?: Date | string | null;
  responseBreached?: boolean;
  resolutionBreached?: boolean;
  isResponseAtRisk?: boolean;
  isResolutionAtRisk?: boolean;
}

export interface IssueFiltersState extends Record<string, unknown> {
  search: string;
  status: IssueStatus[];
  priority: IssuePriority[];
  assignedTo: string | null;
  customerId: string | null;
  nextActionType: IssueNextActionType | null;
  rmaState: IssueRmaState;
  serialState: IssueLineageState;
  warrantyState: IssueLineageState;
  orderState: IssueLineageState;
  serviceSystemState: IssueLineageState;
}

export interface IssueResolution {
  category: IssueResolutionCategory;
  summary: string;
  diagnosisNotes: string | null;
  nextActionType: IssueNextActionType;
  resolvedAt: Date | string | null;
  resolvedByUserId: string | null;
}

export interface IssueRmaReadiness {
  state: 'ready' | 'blocked' | 'linked';
  blockedReasonCode: IssueRmaBlockedReasonCode | null;
  blockedReason: string | null;
  sourceOrder: {
    id: string;
    orderNumber: string | null;
    customerId: string | null;
    customerName: string | null;
  } | null;
  eligibleLineItems: Array<{
    orderLineItemId: string;
    description: string;
    shippedQuantity: number;
    activeClaimedQuantity: number;
    remainingReturnableQuantity: number;
    isSerialized: boolean;
  }>;
  existingRmas: Array<{
    id: string;
    rmaNumber: string;
    status: string;
    executionStatus?: string | null;
    reason: string;
    creditNoteId?: string | null;
    replacementOrderId?: string | null;
    refundPaymentId?: string | null;
    createdAt: Date | string;
  }>;
  suggestedReason:
    | 'defective'
    | 'damaged_in_shipping'
    | 'wrong_item'
    | 'performance_issue'
    | 'installation_failure'
    | 'other'
    | null;
}

export interface IssueRelatedContext {
  linkedWarranty: {
    id: string;
    warrantyNumber: string;
    status: string;
    productSerial: string | null;
  } | null;
  linkedOrder: {
    id: string;
    orderNumber: string | null;
    customerId: string | null;
    customerName: string | null;
  } | null;
  linkedShipment: {
    id: string;
    shipmentNumber: string | null;
  } | null;
  relatedSerials: Array<{
    serializedItemId: string | null;
    serialNumber: string;
    productName: string | null;
    orderLineItemId: string | null;
    orderLineDescription: string | null;
    shipmentId: string | null;
    shipmentNumber: string | null;
    source: 'shipment' | 'allocation' | 'order_line';
  }>;
  linkedRmas: Array<{
    id: string;
    rmaNumber: string;
    status: string;
    executionStatus?: string | null;
    reason: string;
    creditNoteId?: string | null;
    replacementOrderId?: string | null;
    refundPaymentId?: string | null;
    createdAt: Date | string;
  }>;
  sameServiceSystemIssues: Array<{
    id: string;
    issueNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date | string;
  }>;
  sameSerializedItemIssues: Array<{
    id: string;
    issueNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date | string;
  }>;
  customerContext: {
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      orderDate: string | null;
      status: string;
    }>;
    warranties: Array<{
      id: string;
      productName: string | null;
      productSerial: string | null;
      status: string;
    }>;
    otherIssues: Array<{
      id: string;
      title: string;
      createdAt: Date | string;
      status: string;
    }>;
  } | null;
}

export interface IssueIntakePreview {
  state: 'resolved' | 'partial' | 'unresolved' | 'conflict';
  summary: string;
  conflicts: IssueAnchorConflict[];
  commercialCustomerId: string | null;
  anchors: IssueAnchorFields;
  supportContext: NonNullable<IssueDetail['supportContext']>;
}

export interface IssueDetail {
  id: string;
  issueNumber: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt?: Date | string | null;
  customer?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  slaMetrics?: {
    responseDueAt?: Date | string | null;
    resolutionDueAt?: Date | string | null;
    responseBreached?: boolean;
    resolutionBreached?: boolean;
    isResponseAtRisk?: boolean;
    isResolutionAtRisk?: boolean;
  } | null;
  escalatedAt?: Date | string | null;
  escalationReason?: string | null;
  customerId?: string | null;
  warrantyId?: string | null;
  warrantyEntitlementId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  productId?: string | null;
  serializedItemId?: string | null;
  serviceSystemId?: string | null;
  serialNumber?: string | null;
  supportContext?: {
    resolutionSource: 'warranty' | 'entitlement' | 'order' | 'shipment' | 'serial' | 'unresolved';
    commercialCustomer?: { id: string; name: string | null } | null;
    warranty?: {
      id: string;
      warrantyNumber: string;
      status: string;
      productSerial: string | null;
    } | null;
    shipment?: {
      id: string;
      shipmentNumber: string | null;
    } | null;
    serializedItem?: {
      id: string;
      serialNumber: string;
    } | null;
    serviceSystem?: { id: string; displayName: string } | null;
    currentOwner?: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
    } | null;
    order?: {
      id: string;
      orderNumber: string | null;
      customerId: string | null;
      customerName: string | null;
    } | null;
  } | null;
  resolution?: IssueResolution | null;
  rmaReadiness?: IssueRmaReadiness | null;
  relatedContext?: IssueRelatedContext | null;
}

export interface IssueListItem {
  id: string;
  issueNumber: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  createdAt: Date | string;
  customer?: { name: string } | null;
  assignedTo?: { name: string } | null;
  warrantyId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  serviceSystemId?: string | null;
  serializedItemId?: string | null;
  serialNumber?: string | null;
  resolutionCategory?: IssueResolutionCategory | null;
  nextActionType?: IssueNextActionType | null;
  rmaState?: Exclude<IssueRmaState, 'any'> | null;
  linkedRmaCount?: number;
  serviceSystem?: { id: string; displayName: string } | null;
  slaMetrics?: {
    responseBreached?: boolean;
    resolutionBreached?: boolean;
    isResponseAtRisk?: boolean;
    isResolutionAtRisk?: boolean;
  } | null;
}

export interface IssueKanbanItem {
  id: string;
  issueNumber: string;
  title: string;
  priority: IssuePriority;
  status: IssueStatus;
  type: IssueType;
  customerId?: string | null;
  customer?: { name: string } | null;
  assignedTo?: { name: string | null; email: string } | null;
  createdAt: Date | string;
  /** SLA metrics from server (board may transform to flat slaStatus/slaResponseDue/slaResolutionDue) */
  slaMetrics?: IssueSlaMetrics | null;
  slaStatus?: 'on_track' | 'at_risk' | 'breached' | null;
  slaResponseDue?: Date | string | null;
  slaResolutionDue?: Date | string | null;
}

export type BulkAction =
  | 'assign'
  | 'change_priority'
  | 'change_status'
  | 'close'
  | 'delete';

export interface BulkActionEvent {
  action: BulkAction;
  issueIds: string[];
  value?: string;
}

export interface StatusChangeResult {
  confirmed: boolean;
  note: string;
  skipPromptForSession: boolean;
  resolutionCategory?: IssueResolutionCategory;
  diagnosisNotes?: string;
  nextActionType?: IssueNextActionType;
}

export type RelationType =
  | 'blocks'
  | 'blocked_by'
  | 'duplicates'
  | 'duplicated_by'
  | 'relates_to';

export interface RelatedIssue {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
  priority: string;
  relationType: RelationType;
}

export interface PotentialDuplicate {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
  createdAt: Date | string;
  similarity: number;
}

/** Kanban column config for issue board */
export interface KanbanColumn {
  id: IssueStatus;
  title: string;
  color: string;
}

/** Event when issue status changes via drag-drop */
export interface StatusChangeEvent {
  issueId: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
}

// ============================================================================
// BARREL EXPORT
// ============================================================================

export * from './sla';
