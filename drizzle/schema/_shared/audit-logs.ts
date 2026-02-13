/**
 * Audit Logs Schema
 *
 * Comprehensive audit trail for all user-related changes.
 * Immutable log entries for compliance and security tracking.
 * Table category: system (per column-patterns.json)
 *
 * Note: This is different from the activities table which tracks
 * business entity activity. Audit logs track user actions for
 * security and compliance purposes.
 *
 * @see _Initiation/_prd/2-domains/users/users.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

// ============================================================================
// INTERFACES
// ============================================================================

export interface AuditLogMetadata {
  /** Request ID for correlation */
  requestId?: string;
  /** Session ID */
  sessionId?: string;
  /** Device/browser info */
  deviceInfo?: string;
  /** Geographic location (if available) */
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  /** Duration of the action in milliseconds */
  durationMs?: number;
  /** Affected record count */
  affectedCount?: number;
  /** Previous values (for updates) */
  previousValues?: Record<string, string | number | boolean | null>;
  /** New values (for creates/updates) */
  newValues?: Record<string, string | number | boolean | null>;
  /** Operation type for bulk operations */
  operationType?: string;
  /** Reason for the operation */
  reason?: string;
  /** Audit log ID that was rolled back */
  rolledBackAuditLogId?: string;
  /** Original action that was rolled back */
  originalAction?: string;
  /** Number of records restored in rollback */
  restoredCount?: number;
}

// ============================================================================
// AUDIT LOGS TABLE
// ============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Actor (who performed the action)
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // Action details
    action: varchar("action", { length: 100 }).notNull(), // e.g., "user.create", "login.success"
    entityType: varchar("entity_type", { length: 50 }).notNull(), // e.g., "user", "group", "invitation"
    entityId: uuid("entity_id"), // ID of the affected entity

    // Change tracking
    oldValues: jsonb("old_values"), // Previous state (for updates/deletes)
    newValues: jsonb("new_values"), // New state (for creates/updates)

    // Request context
    ipAddress: text("ip_address"), // Using text to support IPv6
    userAgent: text("user_agent"),

    // Timestamp (immutable)
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Additional metadata
    metadata: jsonb("metadata").$type<AuditLogMetadata>().default({}),
  },
  (table) => ({
    // Organization queries
    orgIdx: index("idx_audit_logs_org").on(table.organizationId),

    // User activity lookup
    userIdx: index("idx_audit_logs_user").on(table.userId),

    // Entity-specific audit trail
    entityIdx: index("idx_audit_logs_entity").on(
      table.entityType,
      table.entityId
    ),

    // Time-based queries (most common access pattern)
    timestampIdx: index("idx_audit_logs_timestamp").on(table.timestamp),

    // Organization + timestamp for dashboard queries
    orgTimestampIdx: index("idx_audit_logs_org_timestamp").on(
      table.organizationId,
      table.timestamp
    ),

    // Action-based filtering
    orgActionIdx: index("idx_audit_logs_org_action").on(
      table.organizationId,
      table.action
    ),

    // User activity within org (common query pattern)
    orgUserTimestampIdx: index("idx_audit_logs_org_user_timestamp").on(
      table.organizationId,
      table.userId,
      table.timestamp
    ),

    // RLS Policies - audit logs are read-only via policy
    selectPolicy: pgPolicy("audit_logs_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    // No update/delete policies - audit logs are immutable
    insertPolicy: pgPolicy("audit_logs_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// AUDIT ACTION CONSTANTS
// ============================================================================

/**
 * Standard audit actions for the users domain.
 * Use these constants for consistency in logging.
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILURE: "auth.login.failure",
  LOGOUT: "auth.logout",
  PASSWORD_RESET_REQUEST: "auth.password_reset.request",
  PASSWORD_RESET_COMPLETE: "auth.password_reset.complete",
  PASSWORD_CHANGE: "auth.password.change",
  MFA_ENABLE: "auth.mfa.enable",
  MFA_DISABLE: "auth.mfa.disable",
  EMAIL_VERIFY: "auth.email.verify",

  // User lifecycle
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  USER_SUSPEND: "user.suspend",
  USER_ACTIVATE: "user.activate",
  USER_ROLE_CHANGE: "user.role.change",

  // Invitations
  INVITATION_SEND: "invitation.send",
  INVITATION_ACCEPT: "invitation.accept",
  INVITATION_CANCEL: "invitation.cancel",
  INVITATION_RESEND: "invitation.resend",

  // Groups
  GROUP_CREATE: "group.create",
  GROUP_UPDATE: "group.update",
  GROUP_DELETE: "group.delete",
  GROUP_MEMBER_ADD: "group.member.add",
  GROUP_MEMBER_REMOVE: "group.member.remove",
  GROUP_MEMBER_ROLE_CHANGE: "group.member.role.change",

  // Delegations
  DELEGATION_CREATE: "delegation.create",
  DELEGATION_UPDATE: "delegation.update",
  DELEGATION_CANCEL: "delegation.cancel",

  // Sessions
  SESSION_CREATE: "session.create",
  SESSION_TERMINATE: "session.terminate",
  SESSION_TERMINATE_ALL: "session.terminate.all",

  // Preferences
  PREFERENCE_UPDATE: "preference.update",
  PREFERENCE_RESET: "preference.reset",

  // Data export
  DATA_EXPORT: "data.export",
  BULK_EXPORT: "data.bulk_export",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

/**
 * Entity types for audit logging.
 */
export const AUDIT_ENTITY_TYPES = {
  USER: "user",
  GROUP: "group",
  INVITATION: "invitation",
  DELEGATION: "delegation",
  SESSION: "session",
  PREFERENCE: "preference",
  ORGANIZATION: "organization",
} as const;

export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[keyof typeof AUDIT_ENTITY_TYPES];
