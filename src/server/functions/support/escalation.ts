/**
 * Escalation Server Functions
 *
 * Server functions for manual escalation/de-escalation of issues
 * and management of escalation rules.
 *
 * @see drizzle/schema/support/escalation-rules.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-002a
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, asc, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { escalationRules, escalationHistory, issues, slaTracking, customers } from 'drizzle/schema';
import type {
  EscalationCondition,
  EscalationAction,
} from 'drizzle/schema/support/escalation-rules';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError, ServerError } from '@/lib/server/errors';

// ============================================================================
// SCHEMAS
// ============================================================================

const escalateIssueSchema = z.object({
  issueId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
  escalateToUserId: z.string().uuid().optional(),
});

const deEscalateIssueSchema = z.object({
  issueId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
  assignToUserId: z.string().uuid().optional(),
});

const createEscalationRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  condition: z.object({
    type: z.enum([
      'sla_breach',
      'sla_at_risk',
      'priority',
      'age_hours',
      'reopen_count',
      'customer_vip',
    ]),
    params: z
      .object({
        target: z.enum(['response', 'resolution', 'any']).optional(),
        minPriority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        hours: z.number().int().positive().optional(),
        count: z.number().int().positive().optional(),
      })
      .optional(),
  }),
  action: z.object({
    type: z.enum(['assign_user', 'notify_user', 'change_priority', 'add_tag']),
    params: z
      .object({
        userId: z.string().uuid().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        tag: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
  }),
  escalateToUserId: z.string().uuid().optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const getEscalationHistorySchema = z.object({
  issueId: z.string().uuid(),
});

const listEscalationRulesSchema = z.object({
  activeOnly: z.boolean().default(true),
});

// ============================================================================
// ESCALATE ISSUE
// ============================================================================

/**
 * Manually escalate an issue
 */
export const escalateIssue = createServerFn({ method: 'POST' })
  .inputValidator(escalateIssueSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get the issue
    const [issue] = await db
      .select()
      .from(issues)
      .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
      .limit(1);

    if (!issue) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    const now = new Date();

    // Update issue status to escalated
    await db
      .update(issues)
      .set({
        status: 'escalated',
        escalatedAt: now,
        assignedToUserId: data.escalateToUserId ?? issue.assignedToUserId,
        updatedBy: ctx.user.id,
      })
      .where(eq(issues.id, data.issueId));

    // Create escalation history record
    const [historyRecord] = await db
      .insert(escalationHistory)
      .values({
        organizationId: ctx.organizationId,
        issueId: data.issueId,
        action: 'escalate',
        performedByUserId: ctx.user.id,
        reason: data.reason,
        escalatedToUserId: data.escalateToUserId,
        previousAssigneeId: issue.assignedToUserId,
      })
      .returning();

    return {
      success: true,
      historyId: historyRecord.id,
      escalatedAt: now,
    };
  });

// ============================================================================
// DE-ESCALATE ISSUE
// ============================================================================

/**
 * De-escalate an issue (return to normal workflow)
 */
export const deEscalateIssue = createServerFn({ method: 'POST' })
  .inputValidator(deEscalateIssueSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get the issue
    const [issue] = await db
      .select()
      .from(issues)
      .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
      .limit(1);

    if (!issue) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    if (issue.status !== 'escalated') {
      throw new ValidationError('Issue is not currently escalated');
    }

    // Update issue status back to in_progress
    await db
      .update(issues)
      .set({
        status: 'in_progress',
        escalatedAt: null,
        assignedToUserId: data.assignToUserId ?? issue.assignedToUserId,
        updatedBy: ctx.user.id,
      })
      .where(eq(issues.id, data.issueId));

    // Create de-escalation history record
    const [historyRecord] = await db
      .insert(escalationHistory)
      .values({
        organizationId: ctx.organizationId,
        issueId: data.issueId,
        action: 'de_escalate',
        performedByUserId: ctx.user.id,
        reason: data.reason,
        escalatedToUserId: data.assignToUserId,
        previousAssigneeId: issue.assignedToUserId,
      })
      .returning();

    return {
      success: true,
      historyId: historyRecord.id,
    };
  });

// ============================================================================
// GET ESCALATION HISTORY
// ============================================================================

/**
 * Get escalation history for an issue
 */
export const getEscalationHistory = createServerFn({ method: 'GET' })
  .inputValidator(getEscalationHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify issue access
    const [issue] = await db
      .select({ id: issues.id })
      .from(issues)
      .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
      .limit(1);

    if (!issue) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    // Get history with user details
    const history = await db
      .select()
      .from(escalationHistory)
      .where(eq(escalationHistory.issueId, data.issueId))
      .orderBy(desc(escalationHistory.createdAt));

    return history;
  });

// ============================================================================
// ESCALATION RULES CRUD
// ============================================================================

/**
 * Create a new escalation rule
 */
export const createEscalationRule = createServerFn({ method: 'POST' })
  .inputValidator(createEscalationRuleSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [rule] = await db
      .insert(escalationRules)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description ?? null,
        condition: data.condition,
        action: data.action,
        escalateToUserId: data.escalateToUserId ?? null,
        priority: data.priority,
        isActive: data.isActive,
      })
      .returning();

    return rule;
  });

/**
 * List escalation rules for the organization
 */
export const listEscalationRules = createServerFn({ method: 'GET' })
  .inputValidator(listEscalationRulesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(escalationRules.organizationId, ctx.organizationId)];

    if (data.activeOnly) {
      conditions.push(eq(escalationRules.isActive, true));
    }

    const rules = await db
      .select()
      .from(escalationRules)
      .where(and(...conditions))
      .orderBy(asc(escalationRules.priority));

    return rules;
  });

/**
 * Update an escalation rule
 */
export const updateEscalationRule = createServerFn({ method: 'POST' })
  .inputValidator(
    createEscalationRuleSchema.partial().extend({
      ruleId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { ruleId, ...updates } = data;

    const [rule] = await db
      .update(escalationRules)
      .set(updates)
      .where(
        and(eq(escalationRules.id, ruleId), eq(escalationRules.organizationId, ctx.organizationId))
      )
      .returning();

    if (!rule) {
      throw new NotFoundError('Escalation rule not found', 'escalationRule');
    }

    return rule;
  });

/**
 * Delete an escalation rule
 */
export const deleteEscalationRule = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ ruleId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    await db
      .delete(escalationRules)
      .where(
        and(
          eq(escalationRules.id, data.ruleId),
          eq(escalationRules.organizationId, ctx.organizationId)
        )
      );

    return { success: true };
  });

// ============================================================================
// AUTOMATIC ESCALATION ENGINE
// ============================================================================

/**
 * Check if an issue matches a rule condition
 */
async function checkRuleCondition(
  issue: typeof issues.$inferSelect,
  slaData: typeof slaTracking.$inferSelect | null,
  customerData: { isVip: boolean } | null,
  condition: EscalationCondition
): Promise<boolean> {
  switch (condition.type) {
    case 'sla_breach': {
      if (!slaData) return false;
      const target = condition.params?.target ?? 'any';
      if (target === 'response') return slaData.responseBreached;
      if (target === 'resolution') return slaData.resolutionBreached;
      return slaData.responseBreached || slaData.resolutionBreached;
    }

    case 'sla_at_risk': {
      if (!slaData) return false;
      // At-risk is determined by checking if we're past the at-risk threshold
      // For simplicity, check if we're within 25% of due date
      const now = new Date();
      const target = condition.params?.target ?? 'any';

      if (target === 'response' || target === 'any') {
        if (slaData.responseDueAt && !slaData.respondedAt && !slaData.responseBreached) {
          const totalTime = slaData.responseDueAt.getTime() - slaData.startedAt.getTime();
          const elapsed = now.getTime() - slaData.startedAt.getTime();
          if (elapsed / totalTime > 0.75) return true;
        }
      }

      if (target === 'resolution' || target === 'any') {
        if (slaData.resolutionDueAt && !slaData.resolvedAt && !slaData.resolutionBreached) {
          const totalTime = slaData.resolutionDueAt.getTime() - slaData.startedAt.getTime();
          const elapsed = now.getTime() - slaData.startedAt.getTime();
          if (elapsed / totalTime > 0.75) return true;
        }
      }

      return false;
    }

    case 'priority': {
      const minPriority = condition.params?.minPriority ?? 'high';
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      return (
        priorityOrder[issue.priority] >= priorityOrder[minPriority as keyof typeof priorityOrder]
      );
    }

    case 'age_hours': {
      const hours = condition.params?.hours ?? 24;
      const ageMs = Date.now() - issue.createdAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      return ageHours >= hours;
    }

    case 'customer_vip': {
      return customerData?.isVip ?? false;
    }

    case 'reopen_count': {
      // Would need to track reopen count - skip for now
      return false;
    }

    default:
      return false;
  }
}

/**
 * Apply an escalation action to an issue
 */
async function applyEscalationAction(
  organizationId: string,
  issue: typeof issues.$inferSelect,
  rule: typeof escalationRules.$inferSelect,
  action: EscalationAction,
  systemUserId?: string
): Promise<void> {
  const now = new Date();
  // Determine performer: prefer systemUserId, then rule owner, then issue creator
  // For auto-escalation, we need a valid performer for audit trail
  const performedBy = systemUserId ?? rule.escalateToUserId ?? issue.createdBy;
  if (!performedBy) {
    throw new ServerError('Cannot apply escalation: no valid performer user ID available');
  }

  switch (action.type) {
    case 'assign_user': {
      if (action.params?.userId) {
        await db
          .update(issues)
          .set({
            status: 'escalated',
            escalatedAt: now,
            assignedToUserId: action.params.userId,
          })
          .where(eq(issues.id, issue.id));

        // Create history record
        await db.insert(escalationHistory).values({
          organizationId,
          issueId: issue.id,
          action: 'escalate',
          performedByUserId: performedBy,
          reason: `Auto-escalated by rule: ${rule.name}`,
          escalationRuleId: rule.id,
          escalatedToUserId: action.params.userId,
          previousAssigneeId: issue.assignedToUserId,
        });
      }
      break;
    }

    case 'change_priority': {
      if (action.params?.priority) {
        await db
          .update(issues)
          .set({
            priority: action.params.priority,
          })
          .where(eq(issues.id, issue.id));
      }
      break;
    }

    case 'add_tag': {
      if (action.params?.tag) {
        const currentTags = issue.tags ?? [];
        if (!currentTags.includes(action.params.tag)) {
          await db
            .update(issues)
            .set({
              tags: [...currentTags, action.params.tag],
            })
            .where(eq(issues.id, issue.id));
        }
      }
      break;
    }

    case 'notify_user': {
      // TODO: Integrate with notification system
      // For now, just log the action
      console.log(
        `[Auto-Escalation] Would notify user ${action.params?.userId} about issue ${issue.id}`
      );
      break;
    }
  }
}

/**
 * Process automatic escalations for an organization
 * This should be called by a scheduled job (e.g., Trigger.dev)
 */
export const processAutoEscalations = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      organizationId: z.string().uuid(),
      systemUserId: z.string().uuid().optional(),
      dryRun: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    // Get active escalation rules for the organization
    const rules = await db
      .select()
      .from(escalationRules)
      .where(
        and(
          eq(escalationRules.organizationId, data.organizationId),
          eq(escalationRules.isActive, true)
        )
      )
      .orderBy(asc(escalationRules.priority));

    if (rules.length === 0) {
      return { processed: 0, escalated: 0, rules: 0 };
    }

    // Get open issues that are not already escalated
    const openIssues = await db
      .select({
        issue: issues,
        sla: slaTracking,
        customer: customers,
      })
      .from(issues)
      .leftJoin(slaTracking, eq(issues.slaTrackingId, slaTracking.id))
      .leftJoin(customers, eq(issues.customerId, customers.id))
      .where(
        and(
          eq(issues.organizationId, data.organizationId),
          ne(issues.status, 'resolved'),
          ne(issues.status, 'closed'),
          ne(issues.status, 'escalated')
        )
      );

    let escalatedCount = 0;

    for (const { issue, sla, customer } of openIssues) {
      // Check each rule in priority order
      for (const rule of rules) {
        // Determine VIP status from customer tags (since there's no dedicated isVip field)
        const isVip = customer?.tags?.includes('vip') ?? false;
        const matched = await checkRuleCondition(
          issue,
          sla,
          customer ? { isVip } : null,
          rule.condition
        );

        if (matched) {
          if (!data.dryRun) {
            await applyEscalationAction(
              data.organizationId,
              issue,
              rule,
              rule.action,
              data.systemUserId
            );
          }
          escalatedCount++;
          break; // Only apply first matching rule
        }
      }
    }

    return {
      processed: openIssues.length,
      escalated: escalatedCount,
      rules: rules.length,
      dryRun: data.dryRun,
    };
  });

/**
 * Get escalation summary for dashboard
 */
export const getEscalationSummary = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth();

    // Count escalated issues
    const [escalatedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(and(eq(issues.organizationId, ctx.organizationId), eq(issues.status, 'escalated')));

    // Count active rules
    const [rulesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(escalationRules)
      .where(
        and(
          eq(escalationRules.organizationId, ctx.organizationId),
          eq(escalationRules.isActive, true)
        )
      );

    // Recent escalations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEscalations = await db
      .select()
      .from(escalationHistory)
      .where(
        and(
          eq(escalationHistory.organizationId, ctx.organizationId),
          eq(escalationHistory.action, 'escalate')
        )
      )
      .orderBy(desc(escalationHistory.createdAt))
      .limit(10);

    return {
      currentlyEscalated: Number(escalatedCount.count),
      activeRules: Number(rulesCount.count),
      recentEscalations: recentEscalations.length,
    };
  });
