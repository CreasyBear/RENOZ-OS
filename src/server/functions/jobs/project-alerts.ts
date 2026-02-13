/**
 * Project Alerts Server Function
 *
 * Computes project health alerts based on current project state.
 * Alerts are computed server-side for freshness and consistency.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 2.1 Alert Conditions
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.0 Blocker 1
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, jobTasks, projectBomItems } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';
import {
  getProjectAlertsInputSchema,
  type ProjectAlert,
  ALERT_TYPE_SEVERITY,
  ALERT_MESSAGES,
  ALERT_SEVERITY_ORDER,
} from '@/lib/schemas/jobs/project-alerts';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Creates a deterministic alert ID for deduplication and dismissal tracking.
 */
function createAlertId(projectId: string, type: string): string {
  return `project:${projectId}:${type}`;
}

/**
 * Days ago helper for date comparison
 */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Get computed alerts for a project.
 *
 * Alert Conditions:
 * - CRITICAL: schedule_overdue, budget_exceeded
 * - WARNING: blocked_tasks, stale_project, bom_items_pending
 * - INFO: completion_pending
 */
export const getProjectAlerts = createServerFn({ method: 'GET' })
  .inputValidator(getProjectAlertsInputSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });
    const { projectId } = data;

    // Get project with necessary fields
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'project');
    }

    const alerts: ProjectAlert[] = [];
    const today = new Date();

    // ========================================================================
    // CRITICAL ALERTS
    // ========================================================================

    // Schedule Overdue: Target date passed without completion
    if (
      project.targetCompletionDate &&
      new Date(project.targetCompletionDate) < today &&
      !project.actualCompletionDate
    ) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(project.targetCompletionDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: createAlertId(projectId, 'schedule_overdue'),
        type: 'schedule_overdue',
        severity: ALERT_TYPE_SEVERITY.schedule_overdue,
        message: ALERT_MESSAGES.schedule_overdue({ days: daysOverdue }),
        metadata: { days: daysOverdue },
        actionLabel: 'Review Timeline',
        actionUrl: `/projects/${projectId}?tab=schedule`,
      });
    }

    // Budget Exceeded: Actual cost exceeds estimate
    const estimatedValue = project.estimatedTotalValue
      ? parseFloat(project.estimatedTotalValue)
      : 0;
    const actualCost = project.actualTotalCost
      ? parseFloat(project.actualTotalCost)
      : 0;

    if (estimatedValue > 0 && actualCost > estimatedValue) {
      const percentOver = Math.round(
        ((actualCost - estimatedValue) / estimatedValue) * 100
      );

      alerts.push({
        id: createAlertId(projectId, 'budget_exceeded'),
        type: 'budget_exceeded',
        severity: ALERT_TYPE_SEVERITY.budget_exceeded,
        message: ALERT_MESSAGES.budget_exceeded({ percent: percentOver }),
        metadata: {
          percent: percentOver,
          estimated: estimatedValue,
          actual: actualCost,
        },
        actionLabel: 'Review Budget',
        actionUrl: `/projects/${projectId}?tab=bom`,
      });
    }

    // ========================================================================
    // WARNING ALERTS
    // ========================================================================

    // Blocked Tasks: Any tasks with status 'blocked'
    const [blockedRow] = await db
      .select({ count: count() })
      .from(jobTasks)
      .where(
        and(
          eq(jobTasks.projectId, projectId),
          eq(jobTasks.organizationId, ctx.organizationId),
          eq(jobTasks.status, 'blocked')
        )
      );

    const blockedCount = blockedRow?.count ?? 0;
    if (blockedCount > 0) {
      alerts.push({
        id: createAlertId(projectId, 'blocked_tasks'),
        type: 'blocked_tasks',
        severity: ALERT_TYPE_SEVERITY.blocked_tasks,
        message: ALERT_MESSAGES.blocked_tasks({ count: blockedCount }),
        metadata: { count: blockedCount },
        actionLabel: 'View Blocked',
        actionUrl: `/projects/${projectId}?tab=tasks&filter=blocked`,
      });
    }

    // Stale Project: No activity in 14+ days (for active projects)
    const activeStatuses = ['approved', 'in_progress'];
    if (
      activeStatuses.includes(project.status) &&
      project.updatedAt &&
      new Date(project.updatedAt) < daysAgo(14)
    ) {
      const daysSinceActivity = Math.floor(
        (today.getTime() - new Date(project.updatedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: createAlertId(projectId, 'stale_project'),
        type: 'stale_project',
        severity: ALERT_TYPE_SEVERITY.stale_project,
        message: ALERT_MESSAGES.stale_project({ days: daysSinceActivity }),
        metadata: { days: daysSinceActivity },
        actionLabel: 'Check Status',
        actionUrl: `/projects/${projectId}`,
      });
    }

    // BOM Items Pending: Items not yet ordered
    const [pendingBomRow] = await db
      .select({ count: count() })
      .from(projectBomItems)
      .where(
        and(
          eq(projectBomItems.projectId, projectId),
          eq(projectBomItems.organizationId, ctx.organizationId),
          sql`COALESCE(${projectBomItems.quantityOrdered}, 0) = 0`,
          sql`COALESCE(${projectBomItems.quantityEstimated}, 0) > 0`
        )
      );

    const pendingBomCount = pendingBomRow?.count ?? 0;
    if (pendingBomCount > 0) {
      alerts.push({
        id: createAlertId(projectId, 'bom_items_pending'),
        type: 'bom_items_pending',
        severity: ALERT_TYPE_SEVERITY.bom_items_pending,
        message: ALERT_MESSAGES.bom_items_pending({ count: pendingBomCount }),
        metadata: { count: pendingBomCount },
        actionLabel: 'Order Materials',
        actionUrl: `/projects/${projectId}?tab=bom`,
      });
    }

    // ========================================================================
    // INFO ALERTS
    // ========================================================================

    // Completion Pending: Progress at 100% but still in_progress
    if (
      project.status === 'in_progress' &&
      project.progressPercent !== null &&
      project.progressPercent >= 100
    ) {
      alerts.push({
        id: createAlertId(projectId, 'completion_pending'),
        type: 'completion_pending',
        severity: ALERT_TYPE_SEVERITY.completion_pending,
        message: ALERT_MESSAGES.completion_pending(),
        metadata: { progressPercent: project.progressPercent },
        actionLabel: 'Complete Project',
        actionUrl: `/projects/${projectId}`,
      });
    }

    // Sort by severity (critical first)
    alerts.sort(
      (a, b) => ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]
    );

    return alerts;
  });
