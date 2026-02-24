/**
 * Activities Schema
 *
 * Central audit trail for all entity changes.
 * Table category: appendOnly (per column-patterns.json)
 *
 * Uses polymorphic references (entityType + entityId) for flexible
 * audit tracking across all entity types.
 *
 * NOTE: PostgreSQL partitioning by createdAt (monthly) should be set up
 * at the database level via migration, as Drizzle doesn't support native
 * table partitioning syntax. See migration 0010_activities_rls.sql.
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { pgTable, uuid, text, jsonb, index, inet, pgPolicy } from "drizzle-orm/pg-core";
import { activityActionEnum, activityEntityTypeEnum, activitySourceEnum } from "../_shared/enums";
import {
  timestampColumns,
  organizationRlsUsing,
  organizationRlsWithCheck,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Change details stored in JSONB for audit trail.
 * Captures before/after values for updates.
 * Uses JSON-serializable types (not unknown) for type safety.
 */
export interface ActivityChanges {
  before?: Record<string, string | number | boolean | null | string[] | number[]>;
  after?: Record<string, string | number | boolean | null | string[] | number[]>;
  fields?: string[]; // List of changed field names
}

/**
 * Additional metadata for the activity.
 * Type-safe context data per action type.
 *
 * Examples:
 * - For 'assigned': { assignedTo: userId, reason: 'Reassigned due to vacation' }
 * - For 'exported': { format: 'csv', recordCount: 500 }
 * - For 'shared': { sharedWith: [userId1, userId2], permission: 'read' }
 * - For 'email_sent': { emailId, recipientEmail, subject }
 * - For 'call_logged': { callId, purpose, direction, durationMinutes }
 * - For 'note_added': { noteId, contentPreview }
 */
export interface ActivityMetadata {
  // ============================================
  // GENERAL FIELDS
  // ============================================
  /** Request ID for correlation/tracing */
  requestId?: string;
  /** Idempotency key for status/destructive mutations */
  idempotencyKey?: string;
  /** Reason for the action (if applicable) */
  reason?: string;
  /** Assigned to user ID */
  assignedTo?: string;
  /** Export format */
  format?: string;
  /** Record count for bulk operations */
  recordCount?: number;
  /** Users shared with */
  sharedWith?: string[];
  /** Permission level */
  permission?: string;

  // ============================================
  // ENTITY CONTEXT FIELDS (cross-entity relationships)
  // ============================================
  /** Related customer ID */
  customerId?: string;
  /** Customer display name (denormalized for display) */
  customerName?: string;
  /** Related order ID */
  orderId?: string;
  /** Order number (denormalized for display) */
  orderNumber?: string;
  /** Shipment number (for order shipment activities) */
  shipmentNumber?: string;
  /** Related opportunity ID */
  opportunityId?: string;
  /** Opportunity title (denormalized for display) */
  opportunityTitle?: string;

  // ============================================
  // EMAIL ACTIVITY FIELDS (email_sent, email_opened, email_clicked)
  // ============================================
  /** Reference to the email_history record */
  emailId?: string;
  /** Recipient email address */
  recipientEmail?: string;
  /** Recipient display name */
  recipientName?: string;
  /** Email subject line */
  subject?: string;
  /** Email event type (delivered, opened, clicked) */
  eventType?: string;
  /** Clicked link URL (for email_clicked) */
  clickedUrl?: string;
  /** Link ID (for email_clicked) */
  linkId?: string;

  // ============================================
  // CALL ACTIVITY FIELDS (call_logged)
  // ============================================
  /** Reference to the call record */
  callId?: string;
  /** Call purpose/reason */
  purpose?: string;
  /** Call direction */
  direction?: "inbound" | "outbound";
  /** Call duration in minutes */
  durationMinutes?: number;
  /** Call notes */
  notes?: string;

  // ============================================
  // NOTE ACTIVITY FIELDS (note_added)
  // ============================================
  /** Reference to the note record */
  noteId?: string;
  /** Truncated content preview */
  contentPreview?: string;

  // ============================================
  // COMMUNICATIONS FIELDS
  // ============================================
  /** Type of communication log (call, email, meeting, etc.) */
  logType?: string;
  /** Full notes text */
  fullNotes?: string;
  /** Campaign ID for email campaigns */
  campaignId?: string;
  /** Campaign name (denormalized for display) */
  campaignName?: string;
  /** Original call ID when rescheduling */
  originalCallId?: string;
  /** Reschedule reason */
  rescheduleReason?: string;
  /** Original scheduled time (for rescheduling) */
  originalScheduledAt?: string;
  /** Scheduled at timestamp */
  scheduledAt?: string;
  /** New scheduled at timestamp (for rescheduling) */
  newScheduledAt?: string;
  /** Assignee ID for scheduled items */
  assigneeId?: string;
  /** Assignee name (denormalized) */
  assigneeName?: string;
  /** Template type for email templates */
  templateType?: string;
  /** Number of recipients */
  recipientCount?: number;

  // ============================================
  // FINANCIAL FIELDS
  // ============================================
  /** Credit note number */
  creditNoteNumber?: string;
  /** Credit note ID */
  creditNoteId?: string;
  /** Payment plan type */
  planType?: string;
  /** Payment schedule ID */
  scheduleId?: string;
  /** Revenue recognition ID */
  recognitionId?: string;
  /** Deferred revenue ID */
  deferredRevenueId?: string;
  /** Amount for financial operations */
  amount?: number;
  /** Invoice ID */
  invoiceId?: string;
  /** Invoice number */
  invoiceNumber?: string;
  /** Number of installments */
  installmentCount?: number;
  /** Installment ID */
  installmentId?: string;
  /** Installment number */
  installmentNo?: number;
  /** Revenue recognition type */
  recognitionType?: string;
  /** Expected recognition date */
  expectedRecognitionDate?: string;
  /** Released amount */
  releasedAmount?: number;
  /** Remaining amount (after release) */
  remainingAmount?: number;
  /** Milestone name */
  milestoneName?: string;
  /** Paid amount */
  paidAmount?: number;
  /** Recognized amount */
  recognizedAmount?: number;
  /** Recognition date */
  recognitionDate?: string;
  /** Number of deleted records */
  deletedCount?: number;

  // ============================================
  // SITE VISIT RESCHEDULING FIELDS
  // ============================================
  /** Previous scheduled date (for rescheduling) */
  previousScheduledDate?: string;
  /** New scheduled date (for rescheduling) */
  newScheduledDate?: string;

  // ============================================
  // SUPPLIER FIELDS
  // ============================================
  /** Supplier ID */
  supplierId?: string;
  /** Supplier name (denormalized for display) */
  supplierName?: string;
  /** Supplier code */
  supplierCode?: string;
  /** Supplier type */
  supplierType?: string;
  /** Previous rating (for rating changes) */
  previousRating?: number;
  /** New rating (for rating changes) */
  newRating?: number;
  /** Rating notes */
  ratingNotes?: string;
  /** Quality rating */
  qualityRating?: number;
  /** Delivery rating */
  deliveryRating?: number;
  /** Communication rating */
  communicationRating?: number;
  /** Purchase order ID */
  purchaseOrderId?: string;
  /** Purchase order number */
  poNumber?: string;
  /** Supplier reference */
  supplierReference?: string;
  /** Line item total */
  lineTotal?: number;

  // ============================================
  // CUSTOMER FIELDS (merge operations)
  // ============================================
  /** Number of records merged */
  mergedCount?: number;
  /** Target customer ID when a customer was merged */
  mergedIntoCustomerId?: string;
  /** List of customer IDs that were merged */
  mergedCustomerIds?: string[];
  /** Reason for the merge */
  mergeReason?: string;

  // ============================================
  // INVENTORY FIELDS
  // ============================================
  /** Reference to inventory movement */
  movementId?: string;
  /** Type of inventory movement */
  movementType?: string;
  /** Type of reference (order, purchase_order, etc.) */
  referenceType?: string;
  /** Reference ID (order ID, PO ID, etc.) */
  referenceId?: string;
  /** Product ID for inventory movements */
  productId?: string;
  /** Warehouse location ID for inventory movements */
  locationId?: string;
  /** Unit cost for inventory operations */
  unitCost?: number;
  /** Quantity for inventory operations */
  quantity?: number;

  // ============================================
  // ORDER FIELDS
  // ============================================
  /** Order total amount */
  total?: number;
  /** List of fields that changed */
  changedFields?: string[];
  /** Status value (for status change activities) */
  status?: string;
  /** Number of line items */
  lineItemCount?: number;

  // ============================================
  // PIPELINE/OPPORTUNITY FIELDS
  // ============================================
  /** Opportunity value */
  value?: number;
  /** Current stage */
  stage?: string;
  /** Previous stage (for stage changes) */
  previousStage?: string;
  /** New stage after change */
  newStage?: string;
  /** Win probability percentage */
  probability?: number;

  // ============================================
  // SUPPORT FIELDS
  // ============================================
  /** Type of escalation */
  escalationType?: string;
  /** Timestamp when escalated */
  escalatedAt?: string;

  // ============================================
  // JOBS/PROJECTS DOMAIN FIELDS
  // ============================================
  /** Related project ID */
  projectId?: string;
  /** Project number (denormalized for display) */
  projectNumber?: string;
  /** Project title (denormalized for display) */
  projectTitle?: string;
  /** Project type */
  projectType?: string;
  /** Priority level */
  priority?: string;
  /** Task ID */
  taskId?: string;
  /** Task title */
  taskTitle?: string;
  /** Site visit ID */
  siteVisitId?: string;
  /** Visit number */
  visitNumber?: string;
  /** Visit type */
  visitType?: string;
  /** Job assignment ID */
  jobAssignmentId?: string;
  /** Job number */
  jobNumber?: string;
  /** Job title */
  jobTitle?: string;
  /** Installer ID */
  installerId?: string;
  /** Installer name */
  installerName?: string;
  /** Scheduled date */
  scheduledDate?: string;
  /** Material ID */
  materialId?: string;
  /** Product name (denormalized for display) */
  productName?: string;
  /** Previous status (for status changes) */
  previousStatus?: string;
  /** New status after change */
  newStatus?: string;

  // ============================================
  // WARRANTY DOMAIN FIELDS
  // ============================================
  /** Warranty ID */
  warrantyId?: string;
  /** Warranty number */
  warrantyNumber?: string;
  /** Warranty policy ID */
  warrantyPolicyId?: string;
  /** Policy name */
  policyName?: string;
  /** Policy type */
  policyType?: string;
  /** Warranty claim ID */
  claimId?: string;
  /** Claim number */
  claimNumber?: string;
  /** Claim type */
  claimType?: string;
  /** Claim status */
  claimStatus?: string;
  /** Whether this activity was a request-for-info action */
  requestInfoRequest?: boolean;
  /** Extension ID */
  extensionId?: string;
  /** Extension type */
  extensionType?: string;
  /** Extension months */
  extensionMonths?: number;
  /** Previous expiry date */
  previousExpiryDate?: string;
  /** New expiry date */
  newExpiryDate?: string;
  /** Resolution type */
  resolutionType?: string;
  /** Denial reason */
  denialReason?: string;

  // ============================================
  // USERS/SETTINGS DOMAIN FIELDS
  // ============================================
  /** API token ID */
  tokenId?: string;
  /** API token name */
  tokenName?: string;
  /** API token prefix (for display) */
  tokenPrefix?: string;
  /** Token scopes */
  scopes?: string[];
  /** Token expiration date */
  expiresAt?: string | null;
  /** User who revoked the token */
  revokedBy?: string;
  /** Owner of the token */
  tokenOwnerId?: string;
  /** User group ID */
  groupId?: string;
  /** User group name */
  groupName?: string;
  /** User group color */
  color?: string;
  /** Member count in a group */
  memberCount?: number;
  /** Member role in a group */
  memberRole?: string;
  /** Previous role before change */
  previousRole?: string;
  /** New role after change */
  newRole?: string;
  /** User ID (for group membership, delegation, etc.) */
  userId?: string;
  /** User name (denormalized for display) */
  userName?: string;
  /** User email (denormalized for display) */
  userEmail?: string;
  /** Delegation ID */
  delegationId?: string;
  /** Delegator user ID */
  delegatorId?: string;
  /** Delegator name */
  delegatorName?: string;
  /** Delegate user ID */
  delegateId?: string;
  /** Delegate name */
  delegateName?: string;
  /** Delegate email */
  delegateEmail?: string;
  /** Delegation start date */
  startDate?: string;
  /** Delegation end date */
  endDate?: string;

  // ============================================
  // DOCUMENT GENERATION FIELDS (exported action)
  // ============================================
  /** Type of document generated (quote, invoice, packing-slip, etc.) */
  documentType?: string;
  /** Generated document filename */
  filename?: string;
  /** Generated file size in bytes */
  fileSize?: number;
  /** Whether this is a regeneration (vs first generation) */
  isRegeneration?: boolean;
  /** Number of times document has been regenerated */
  regenerationCount?: number;
  /** Quote version ID (for opportunity quotes) */
  quoteVersionId?: string;

  // ============================================
  // CUSTOM EXTENSION
  // ============================================
  /** Additional custom fields - use explicit types, not unknown */
  customFields?: Record<string, string | number | boolean | null>;
}

// ============================================================================
// ACTIVITIES TABLE
// ============================================================================

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // User who performed the action (nullable for system actions)
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }), // References users.id - the actor

    // Polymorphic reference to the entity
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    // Action performed
    action: activityActionEnum("action").notNull(),

    // Change details: { fieldName: { old: previousValue, new: newValue } }
    changes: jsonb("changes").$type<ActivityChanges>(),

    // Additional metadata (free-form context per action type)
    metadata: jsonb("metadata").$type<ActivityMetadata>().default({}),

    // Request context for audit trail
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),

    // Human-readable description
    description: text("description"),

    // Denormalized entity name for display without joins
    // Populated at write time to avoid N+1 queries in activity feeds
    entityName: text("entity_name"),

    // Computed columns from metadata (for efficient queries without JSONB extraction)
    // These are GENERATED ALWAYS AS STORED columns created via migration 0009
    // Defined as regular columns here since they're already created by migration
    // Drizzle doesn't need to know they're computed - they behave like regular columns
    customerIdFromMetadata: uuid("customer_id_from_metadata"),
    movementIdFromMetadata: uuid("movement_id_from_metadata"),

    // Source tracking: how the activity was created (COMMS-AUTO-002)
    source: activitySourceEnum("source").notNull().default("manual"),
    sourceRef: uuid("source_ref"), // Reference to source record (email_id, webhook_id, etc.)

    // Timestamp only (activities are append-only, no updates)
    createdAt: timestampColumns.createdAt,

    // Creator reference (same as userId in most cases, but kept for pattern consistency)
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }), // References users.id
  },
  (table) => ({
    // Primary query pattern: activities for a specific entity
    entityIdx: index("idx_activities_org_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId
    ),

    // Activity feed chronological listing (org + createdAt DESC)
    orgCreatedIdx: index("idx_activities_org_created").on(
      table.organizationId,
      table.createdAt.desc()
    ),

    // User-specific activity history (userId + createdAt DESC)
    userIdx: index("idx_activities_user").on(
      table.userId,
      table.createdAt.desc()
    ),

    // Filter by action type (e.g., all 'deleted' actions)
    actionIdx: index("idx_activities_action").on(
      table.organizationId,
      table.action,
      table.createdAt.desc()
    ),

    // Filter by entity type (e.g., all 'customer' activities)
    entityTypeIdx: index("idx_activities_entity_type").on(
      table.organizationId,
      table.entityType,
      table.createdAt.desc()
    ),

    // Filter by source (e.g., all 'email' activities for analytics)
    sourceIdx: index("idx_activities_source").on(
      table.organizationId,
      table.source,
      table.createdAt.desc()
    ),

    // RLS Policies (append-only: select + insert only)
    selectPolicy: pgPolicy("activities_select_policy", {
      for: "select",
      to: "authenticated",
      using: organizationRlsUsing(),
    }),
    insertPolicy: pgPolicy("activities_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: organizationRlsWithCheck(),
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

// ============================================================================
// ACTIVITY HELPER TYPES
// ============================================================================

/**
 * Activity action values for type-safe usage.
 */
export const activityActions = [
  "created",
  "updated",
  "deleted",
  "viewed",
  "exported",
  "shared",
  "assigned",
  "commented",
  "email_sent",
  "email_opened",
  "email_clicked",
  "call_logged",
  "note_added",
] as const;

export type ActivityAction = (typeof activityActions)[number];

/**
 * Activity entity type values for type-safe usage.
 */
export const activityEntityTypes = [
  "customer",
  "contact",
  "order",
  "opportunity",
  "product",
  "inventory",
  "supplier",
  "warranty",
  "issue",
  "user",
  "email",
  "call",
  "project",
  "workstream",
  "task",
  "purchase_order",
  "shipment",
  "quote",
] as const;

export type ActivityEntityType = (typeof activityEntityTypes)[number];

/**
 * Activity source values for type-safe usage.
 * Tracks how the activity was created.
 */
export const activitySources = [
  "manual",
  "email",
  "webhook",
  "system",
  "import",
] as const;

export type ActivitySource = (typeof activitySources)[number];
