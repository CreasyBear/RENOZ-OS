/**
 * Unified Activity Schema
 *
 * Types for combining audit trail activities with planned activities
 * into a single timeline view.
 *
 * NOTE: These types are client-safe duplicates of the drizzle schema types.
 * They must be kept in sync with drizzle/schema/activities/activities.ts
 * and drizzle/schema/customers/customers.ts
 *
 * @see STANDARDS.md - Schema files must be client-safe (no drizzle imports)
 */

// ============================================================================
// CLIENT-SAFE TYPE DEFINITIONS
// (Duplicated from drizzle schema to avoid client/server bundling issues)
// ============================================================================

/**
 * Change details for audit trail activities.
 * Client-safe version of ActivityChanges from drizzle/schema.
 */
export interface ActivityChanges {
  before?: Record<string, string | number | boolean | null | string[] | number[]>;
  after?: Record<string, string | number | boolean | null | string[] | number[]>;
  fields?: string[];
}

/**
 * Additional metadata for activities.
 * Client-safe version of ActivityMetadata from drizzle/schema.
 * Only includes fields used by UI components.
 */
export interface ActivityMetadata {
  requestId?: string;
  reason?: string;
  assignedTo?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  opportunityId?: string;
  opportunityTitle?: string;
  emailId?: string;
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  eventType?: string;
  clickedUrl?: string;
  callId?: string;
  purpose?: string;
  direction?: 'inbound' | 'outbound';
  durationMinutes?: number;
  notes?: string;
  noteId?: string;
  contentPreview?: string;
  logType?: string;
  status?: string;
  changedFields?: string[];
  previousStage?: string;
  newStage?: string;
  stage?: string;
  value?: number;
  probability?: number;
  projectId?: string;
  projectNumber?: string;
  projectTitle?: string;
  taskId?: string;
  taskTitle?: string;
  warrantyId?: string;
  warrantyNumber?: string;
  claimId?: string;
  claimNumber?: string;
  amount?: number;
  quantity?: number;
  productId?: string;
  productName?: string;
  supplierId?: string;
  supplierName?: string;
  customFields?: Record<string, string | number | boolean | null>;
}

/**
 * Audit trail activity record.
 * Client-safe version of Activity from drizzle/schema.
 */
export interface Activity {
  id: string;
  organizationId: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: ActivityChanges | null;
  metadata: ActivityMetadata | null;
  ipAddress: string | null;
  userAgent: string | null;
  description: string | null;
  entityName: string | null;
  source: 'manual' | 'email' | 'webhook' | 'system' | 'import';
  sourceRef: string | null;
  createdAt: string | Date;
  createdBy: string | null;
}

/**
 * Customer activity (planned activity) record.
 * Client-safe version of CustomerActivity from drizzle/schema.
 */
export interface CustomerActivity {
  id: string;
  organizationId: string;
  customerId: string;
  contactId: string | null;
  activityType: string;
  direction: 'inbound' | 'outbound' | 'internal' | null;
  subject: string | null;
  description: string;
  outcome: string | null;
  duration: number | null;
  scheduledAt: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  metadata: Record<string, string | number | boolean | null | undefined> | null;
  createdAt: string;
  createdBy: string;
}

// ============================================================================
// UNIFIED ACTIVITY TYPE
// ============================================================================

/**
 * Source of the activity - determines styling and behavior
 */
export type ActivitySource = 'audit' | 'planned';

/**
 * Unified activity that combines both audit trail and planned activities
 */
export interface UnifiedActivity {
  // Core identification
  id: string;
  source: ActivitySource;

  // Entity reference
  entityType: string;
  entityId: string;

  // Activity details
  type: string; // 'created', 'updated', 'call', 'email', 'meeting', etc.
  action?: string; // For audit activities
  activityType?: string; // For planned activities

  // Content
  description: string;
  subject?: string | null;

  // User attribution
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;

  // Timing
  createdAt: string;
  scheduledAt?: string | null;
  completedAt?: string | null;

  // For planned activities
  direction?: 'inbound' | 'outbound' | 'internal' | null;
  duration?: number | null; // in minutes
  outcome?: string | null;

  // For audit activities - using Drizzle schema types
  changes?: ActivityChanges | null;
  metadata?: ActivityMetadata | null;

  // Status (for planned activities)
  isCompleted?: boolean;
  isOverdue?: boolean;
}

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Parameters for fetching unified activities
 */
export interface UnifiedActivityQuery {
  entityType: string;
  entityId: string;
  cursor?: string;
  pageSize?: number;
  filters?: {
    types?: string[];
    sources?: ActivitySource[];
    dateFrom?: string;
    dateTo?: string;
    users?: string[];
  };
}

/**
 * Response from unified activity query
 */
export interface UnifiedActivityResponse {
  activities: UnifiedActivity[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Transform an audit trail activity to unified format
 */
import type { ActivityWithUser } from '@/lib/schemas/activities';

/**
 * Transform an audit trail activity to unified format.
 * Accepts ActivityWithUser which extends Activity and has compatible user structure.
 */
export function transformAuditActivity(
  activity: ActivityWithUser
): UnifiedActivity {
  return {
    id: activity.id,
    source: 'audit',
    entityType: activity.entityType,
    entityId: activity.entityId,
    type: activity.action,
    action: activity.action,
    description: activity.description || `${activity.action} ${activity.entityType}`,
    userId: activity.userId,
    userName: activity.user?.name,
    userEmail: activity.user?.email,
    createdAt: activity.createdAt instanceof Date ? activity.createdAt.toISOString() : activity.createdAt,
    changes: activity.changes,
    metadata: activity.metadata,
    isCompleted: true, // Audit activities are always "completed" (they happened)
    isOverdue: false,
  };
}

/**
 * Raw opportunity activity from getActivityTimeline (opportunity_activities table)
 */
export interface OpportunityActivityRaw {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'follow_up';
  description: string;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  createdBy: string;
}

/**
 * Transform an opportunity activity to unified format
 */
export function transformOpportunityActivity(
  activity: OpportunityActivityRaw,
  opportunityId: string
): UnifiedActivity {
  const isCompleted = !!activity.completedAt;
  const isOverdue =
    !isCompleted &&
    !!activity.scheduledAt &&
    new Date(activity.scheduledAt) < new Date();

  return {
    id: activity.id,
    source: 'planned',
    entityType: 'opportunity',
    entityId: opportunityId,
    type: activity.type,
    description: activity.description,
    userId: activity.createdBy,
    createdAt:
      activity.createdAt instanceof Date
        ? activity.createdAt.toISOString()
        : String(activity.createdAt),
    scheduledAt: activity.scheduledAt
      ? activity.scheduledAt instanceof Date
        ? activity.scheduledAt.toISOString()
        : String(activity.scheduledAt)
      : undefined,
    completedAt: activity.completedAt
      ? activity.completedAt instanceof Date
        ? activity.completedAt.toISOString()
        : String(activity.completedAt)
      : undefined,
    outcome: activity.outcome ?? undefined,
    isCompleted,
    isOverdue: isOverdue || undefined,
  };
}

/**
 * Transform a planned customer activity to unified format
 */
export function transformPlannedActivity(
  activity: CustomerActivity & { user?: { id: string; name: string | null } | null }
): UnifiedActivity {
  const isCompleted = !!activity.completedAt;
  const isOverdue =
    !isCompleted &&
    !!activity.scheduledAt &&
    new Date(activity.scheduledAt) < new Date();

  return {
    id: activity.id,
    source: 'planned',
    entityType: 'customer',
    entityId: activity.customerId,
    type: activity.activityType,
    activityType: activity.activityType,
    description: activity.description,
    subject: activity.subject,
    userId: activity.createdBy,
    userName: activity.user?.name,
    createdAt: activity.createdAt,
    scheduledAt: activity.scheduledAt ?? undefined,
    completedAt: activity.completedAt ?? undefined,
    direction: activity.direction,
    duration: activity.duration ?? undefined,
    outcome: activity.outcome ?? undefined,
    isCompleted,
    isOverdue: isOverdue || undefined,
  };
}

// ============================================================================
// ACTIVITY TYPE CONFIGURATION
// ============================================================================

/**
 * Configuration for displaying different activity types
 */
export interface ActivityTypeConfig {
  label: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  bgColor: string; // Tailwind bg class
}

/**
 * Default configurations for activity types
 */
export const ACTIVITY_TYPE_CONFIG: Record<string, ActivityTypeConfig> = {
  // Audit actions
  created: {
    label: 'Created',
    icon: 'Plus',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  updated: {
    label: 'Updated',
    icon: 'Pencil',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  deleted: {
    label: 'Deleted',
    icon: 'Trash',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  viewed: {
    label: 'Viewed',
    icon: 'Eye',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  exported: {
    label: 'Exported',
    icon: 'Download',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  assigned: {
    label: 'Assigned',
    icon: 'UserPlus',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  // Communication actions
  email_sent: {
    label: 'Email Sent',
    icon: 'Mail',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  email_opened: {
    label: 'Email Opened',
    icon: 'MailOpen',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  email_clicked: {
    label: 'Link Clicked',
    icon: 'MousePointer',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  call_logged: {
    label: 'Call',
    icon: 'Phone',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  note_added: {
    label: 'Note Added',
    icon: 'FileText',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  // Planned activity types
  call: {
    label: 'Call',
    icon: 'Phone',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  meeting: {
    label: 'Meeting',
    icon: 'Calendar',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  note: {
    label: 'Note',
    icon: 'MessageSquare',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  quote: {
    label: 'Quote',
    icon: 'FileText',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  order: {
    label: 'Order',
    icon: 'ShoppingCart',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  complaint: {
    label: 'Complaint',
    icon: 'AlertCircle',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  feedback: {
    label: 'Feedback',
    icon: 'ThumbsUp',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  website_visit: {
    label: 'Website Visit',
    icon: 'Globe',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  social_interaction: {
    label: 'Social',
    icon: 'Share2',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  follow_up: {
    label: 'Follow-up',
    icon: 'Clock',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
};

/**
 * Get config for an activity type
 */
export function getActivityTypeConfig(type: string): ActivityTypeConfig {
  return (
    ACTIVITY_TYPE_CONFIG[type] || {
      label: type,
      icon: 'Activity',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    }
  );
}
