/**
 * Approval Workflow Utilities
 *
 * Helper functions for purchase order approval workflow,
 * rule evaluation, and escalation management.
 *
 * @see SUPP-INTEGRATION-API story
 */

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'ordered'
  | 'partial_received'
  | 'received'
  | 'cancelled'
  | 'closed';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface ApprovalRule {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  requiresApproval: boolean;
  approverRoles: string[];
  escalationHours: number;
  autoApproveUnder: number | null;
  isActive: boolean;
}

export interface ApprovalDecision {
  status: ApprovalStatus;
  approverId: string;
  approverName: string;
  comments?: string;
  decidedAt: string;
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Get status display configuration
 */
export function getPOStatusConfig(status: PurchaseOrderStatus): {
  label: string;
  color: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  canEdit: boolean;
} {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: 'text-gray-600', variant: 'secondary', canEdit: true };
    case 'pending_approval':
      return {
        label: 'Pending Approval',
        color: 'text-yellow-600',
        variant: 'outline',
        canEdit: false,
      };
    case 'approved':
      return { label: 'Approved', color: 'text-blue-600', variant: 'default', canEdit: false };
    case 'ordered':
      return { label: 'Ordered', color: 'text-purple-600', variant: 'default', canEdit: false };
    case 'partial_received':
      return {
        label: 'Partial Received',
        color: 'text-orange-600',
        variant: 'outline',
        canEdit: false,
      };
    case 'received':
      return { label: 'Received', color: 'text-green-600', variant: 'default', canEdit: false };
    case 'cancelled':
      return { label: 'Cancelled', color: 'text-red-600', variant: 'destructive', canEdit: false };
    case 'closed':
      return { label: 'Closed', color: 'text-gray-600', variant: 'secondary', canEdit: false };
  }
}

/**
 * Check if PO can be submitted for approval
 */
export function canSubmitForApproval(status: PurchaseOrderStatus): boolean {
  return status === 'draft';
}

/**
 * Check if PO can be approved/rejected
 */
export function canMakeApprovalDecision(status: PurchaseOrderStatus): boolean {
  return status === 'pending_approval';
}

/**
 * Check if PO can be marked as ordered
 */
export function canMarkAsOrdered(status: PurchaseOrderStatus): boolean {
  return status === 'approved';
}

/**
 * Check if PO can receive goods
 */
export function canReceiveGoods(status: PurchaseOrderStatus): boolean {
  return status === 'ordered' || status === 'partial_received';
}

/**
 * Check if PO can be cancelled
 */
export function canCancel(status: PurchaseOrderStatus): boolean {
  return ['draft', 'pending_approval', 'approved'].includes(status);
}

/**
 * Check if PO can be closed
 */
export function canClose(status: PurchaseOrderStatus): boolean {
  return status === 'received';
}

// ============================================================================
// APPROVAL RULE EVALUATION
// ============================================================================

/**
 * Find applicable approval rule for order value
 */
export function findApplicableRule(orderValue: number, rules: ApprovalRule[]): ApprovalRule | null {
  // Sort by minAmount descending to find the most specific rule
  const sortedRules = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => b.minAmount - a.minAmount);

  return (
    sortedRules.find((rule) => {
      const meetsMin = orderValue >= rule.minAmount;
      const meetsMax = rule.maxAmount === null || orderValue <= rule.maxAmount;
      return meetsMin && meetsMax;
    }) ?? null
  );
}

/**
 * Check if order requires approval
 */
export function requiresApproval(orderValue: number, rules: ApprovalRule[]): boolean {
  const rule = findApplicableRule(orderValue, rules);

  if (!rule) {
    // No rule found - default to requiring approval for safety
    return true;
  }

  // Check auto-approve threshold
  if (rule.autoApproveUnder && orderValue < rule.autoApproveUnder) {
    return false;
  }

  return rule.requiresApproval;
}

/**
 * Get required approver roles for order value
 */
export function getRequiredApprovers(orderValue: number, rules: ApprovalRule[]): string[] {
  const rule = findApplicableRule(orderValue, rules);
  return rule?.approverRoles ?? ['manager'];
}

/**
 * Check if user can approve order
 */
export function canUserApprove(
  userRoles: string[],
  orderValue: number,
  rules: ApprovalRule[]
): boolean {
  const requiredRoles = getRequiredApprovers(orderValue, rules);
  return requiredRoles.some((role) => userRoles.includes(role));
}

// ============================================================================
// ESCALATION UTILITIES
// ============================================================================

/**
 * Check if approval is overdue for escalation
 */
export function isOverdueForEscalation(submittedAt: Date, escalationHours: number): boolean {
  const now = new Date();
  const hoursSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSubmission > escalationHours;
}

/**
 * Calculate time until escalation
 */
export function getTimeUntilEscalation(
  submittedAt: Date,
  escalationHours: number
): { hours: number; minutes: number; isOverdue: boolean } {
  const now = new Date();
  const hoursSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = escalationHours - hoursSinceSubmission;

  if (hoursRemaining <= 0) {
    return { hours: 0, minutes: 0, isOverdue: true };
  }

  return {
    hours: Math.floor(hoursRemaining),
    minutes: Math.floor((hoursRemaining % 1) * 60),
    isOverdue: false,
  };
}

/**
 * Get escalation urgency level
 */
export function getEscalationUrgency(
  submittedAt: Date,
  escalationHours: number
): 'normal' | 'warning' | 'critical' {
  const { hours, isOverdue } = getTimeUntilEscalation(submittedAt, escalationHours);

  if (isOverdue) return 'critical';
  if (hours < 4) return 'warning';
  return 'normal';
}

// ============================================================================
// WORKFLOW STATE MACHINE
// ============================================================================

/**
 * Get valid next statuses from current status
 */
export function getValidTransitions(currentStatus: PurchaseOrderStatus): PurchaseOrderStatus[] {
  switch (currentStatus) {
    case 'draft':
      return ['pending_approval', 'cancelled'];
    case 'pending_approval':
      return ['approved', 'cancelled'];
    case 'approved':
      return ['ordered', 'cancelled'];
    case 'ordered':
      return ['partial_received', 'received', 'cancelled'];
    case 'partial_received':
      return ['received'];
    case 'received':
      return ['closed'];
    case 'cancelled':
    case 'closed':
      return [];
  }
}

/**
 * Check if status transition is valid
 */
export function isValidTransition(
  fromStatus: PurchaseOrderStatus,
  toStatus: PurchaseOrderStatus
): boolean {
  const validTransitions = getValidTransitions(fromStatus);
  return validTransitions.includes(toStatus);
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(status: PurchaseOrderStatus): number {
  const progressMap: Record<PurchaseOrderStatus, number> = {
    draft: 10,
    pending_approval: 25,
    approved: 40,
    ordered: 55,
    partial_received: 75,
    received: 90,
    closed: 100,
    cancelled: 0,
  };
  return progressMap[status];
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format approval decision for display
 */
export function formatApprovalDecision(decision: ApprovalDecision): string {
  const date = new Date(decision.decidedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const action =
    decision.status === 'approved'
      ? 'approved'
      : decision.status === 'rejected'
        ? 'rejected'
        : 'escalated';

  return `${decision.approverName} ${action} on ${date}`;
}
