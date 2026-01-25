/**
 * Supplier Hooks
 *
 * Barrel export for supplier-related React hooks.
 * @see SUPP-INTEGRATION-API story
 */

export {
  useSuppliers,
  useSupplier,
  useSupplierPerformance,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useUpdateSupplierRating,
} from './use-suppliers';
export type { UseSuppliersOptions } from './use-suppliers';

export {
  usePurchaseOrders,
  usePendingApprovals as usePendingPurchaseOrders, // Alias: POs pending approval
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useSubmitForApproval,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useMarkAsOrdered,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useAddPurchaseOrderItem,
  useRemovePurchaseOrderItem,
} from './use-purchase-orders';
export type { UsePurchaseOrdersOptions } from './use-purchase-orders';

// Approval workflow hooks
export {
  usePendingApprovals,
  useApprovalDetails,
  useApprovalHistory,
  useMyApprovalStats,
  useApproveItem,
  useRejectItem,
  useBulkApprove,
  useBulkReject,
  useEscalateApproval,
  useDelegateApproval,
  useRevokeDelegation,
  useEvaluateApprovalRules,
} from './use-approvals';
export type { UsePendingApprovalsOptions, UseApprovalDetailsOptions } from './use-approvals';

// Procurement analytics hooks
export {
  useSpendMetrics,
  useOrderMetrics,
  useSupplierMetrics,
  useProcurementAlerts,
  useProcurementDashboard,
} from './use-procurement-analytics';
export type {
  UseSpendMetricsOptions,
  UseOrderMetricsOptions,
  UseSupplierMetricsOptions,
  UseProcurementAlertsOptions,
  UseProcurementDashboardOptions,
} from './use-procurement-analytics';
