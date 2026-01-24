/**
 * Supplier Utilities
 *
 * Barrel export for supplier-related utilities.
 * @see SUPP-INTEGRATION-API story
 */

export {
  calculateOverallRating,
  getRatingTier,
  getRatingColor,
  getRatingBadgeVariant,
  getStatusConfig,
  canPlaceOrders,
  getTypeLabel,
  getPaymentTermsLabel,
  getPaymentDays,
  calculatePerformanceScore,
  getPerformanceTier,
  getDeliveryStatus,
  generateSupplierCode,
  validateSupplierForOrdering,
  validateOrderValue,
} from './supplier-utils';
export type {
  SupplierStatus,
  SupplierType,
  PaymentTerms,
  SupplierRatings,
  PerformanceMetrics,
} from './supplier-utils';

export {
  getPOStatusConfig,
  canSubmitForApproval,
  canMakeApprovalDecision,
  canMarkAsOrdered,
  canReceiveGoods,
  canCancel,
  canClose,
  findApplicableRule,
  requiresApproval,
  getRequiredApprovers,
  canUserApprove,
  isOverdueForEscalation,
  getTimeUntilEscalation,
  getEscalationUrgency,
  getValidTransitions,
  isValidTransition,
  getWorkflowProgress,
  formatApprovalDecision,
} from './approval-workflow';
export type {
  PurchaseOrderStatus,
  ApprovalStatus,
  ApprovalRule,
  ApprovalDecision,
} from './approval-workflow';
