/**
 * Project Alerts Schema
 *
 * Defines alert types, severities, and schemas for project health monitoring.
 * Alerts are computed server-side based on project state.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 2.1 Alert Conditions
 */

import { z } from 'zod';

// ============================================================================
// ALERT TYPES & SEVERITIES
// ============================================================================

/**
 * Alert types based on project conditions.
 *
 * Critical: Immediate action required
 * - schedule_overdue: Project past target completion date
 * - budget_exceeded: Actual cost exceeds estimate
 *
 * Warning: Attention needed
 * - blocked_tasks: Tasks are blocked and need resolution
 * - stale_project: No activity in 14+ days
 * - bom_items_pending: BOM items not yet ordered
 *
 * Info: Informational
 * - completion_pending: Project ready for sign-off
 */
export const projectAlertTypeSchema = z.enum([
  'schedule_overdue',
  'budget_exceeded',
  'blocked_tasks',
  'stale_project',
  'bom_items_pending',
  'completion_pending',
]);

export type ProjectAlertType = z.infer<typeof projectAlertTypeSchema>;

export const alertSeveritySchema = z.enum(['critical', 'warning', 'info']);

export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

// ============================================================================
// ALERT SCHEMA
// ============================================================================

export const projectAlertSchema = z.object({
  /** Deterministic ID: `project:${projectId}:${type}` */
  id: z.string(),
  /** Type of alert condition */
  type: projectAlertTypeSchema,
  /** Severity level for styling and ordering */
  severity: alertSeveritySchema,
  /** Human-readable message */
  message: z.string(),
  /** Additional context (count, days, percent, etc.) */
  metadata: z.record(z.string(), z.any()).optional(),
  /** Optional action button label */
  actionLabel: z.string().optional(),
  /** Optional action URL (relative or absolute) */
  actionUrl: z.string().optional(),
});

export type ProjectAlert = z.infer<typeof projectAlertSchema>;

export const projectAlertsResponseSchema = z.array(projectAlertSchema);

export type ProjectAlertsResponse = z.infer<typeof projectAlertsResponseSchema>;

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const getProjectAlertsInputSchema = z.object({
  projectId: z.string().uuid(),
});

export type GetProjectAlertsInput = z.infer<typeof getProjectAlertsInputSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Severity order for sorting alerts (highest severity first)
 */
export const ALERT_SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * Alert type to severity mapping
 */
export const ALERT_TYPE_SEVERITY: Record<ProjectAlertType, AlertSeverity> = {
  schedule_overdue: 'critical',
  budget_exceeded: 'critical',
  blocked_tasks: 'warning',
  stale_project: 'warning',
  bom_items_pending: 'warning',
  completion_pending: 'info',
};

/**
 * Default messages for each alert type
 */
export const ALERT_MESSAGES: Record<ProjectAlertType, (meta?: Record<string, unknown>) => string> = {
  schedule_overdue: (meta) =>
    meta?.days ? `${meta.days} days behind schedule` : 'Project is behind schedule',
  budget_exceeded: (meta) =>
    meta?.percent ? `${meta.percent}% over budget` : 'Project is over budget',
  blocked_tasks: (meta) =>
    meta?.count ? `${meta.count} task${Number(meta.count) === 1 ? '' : 's'} blocked` : 'Tasks are blocked',
  stale_project: (meta) =>
    meta?.days ? `No activity for ${meta.days} days` : 'Project has no recent activity',
  bom_items_pending: (meta) =>
    meta?.count ? `${meta.count} BOM item${Number(meta.count) === 1 ? '' : 's'} not ordered` : 'BOM items pending',
  completion_pending: () => 'Ready for completion sign-off',
};
