/**
 * Escalation Validation Schemas
 *
 * Types for escalation workflows and history.
 *
 * @see src/server/functions/support/escalation.ts
 */

export interface EscalationHistoryItem {
  id: string;
  action: 'escalate' | 'de_escalate';
  reason: string | null;
  createdAt: Date;
  performedByUserId: string;
  escalatedToUserId: string | null;
  previousAssigneeId: string | null;
  escalationRuleId: string | null;
  performedByUser?: { name: string | null; email: string } | null;
  escalatedToUser?: { name: string | null; email: string } | null;
}
