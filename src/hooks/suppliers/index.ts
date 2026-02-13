/**
 * Supplier Hooks
 *
 * Barrel export for supplier-related React hooks.
 * @see SUPP-INTEGRATION-API story
 */

export {
  useSuppliers,
  useSupplier,
  usePriceLists,
  useSupplierPerformance,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useUpdateSupplierRating,
  useDeletePriceList,
  useDeletePriceAgreement,
  useCancelPriceChangeRequest,
} from './use-suppliers';
export type { UseSuppliersOptions, UsePriceListsOptions } from './use-suppliers';

export {
  usePurchaseOrders,
  usePurchaseOrderStatusCounts,
  usePendingApprovals as usePendingPurchaseOrders, // Alias: POs pending approval
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useBulkDeletePurchaseOrders,
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

export { useBulkPurchaseOrders } from './use-bulk-purchase-orders';
export type { UseBulkPurchaseOrdersOptions } from './use-bulk-purchase-orders';

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

// PO costs hooks
export {
  usePurchaseOrderCosts,
  useAllocatedCosts,
  useAddPurchaseOrderCost,
  useUpdatePurchaseOrderCost,
  useDeletePurchaseOrderCost,
} from './use-po-costs';

// Goods receipt hooks
export {
  useReceiveGoods,
  usePurchaseOrderReceipts,
} from './use-goods-receipt';

export { useBulkReceiveGoods } from './use-bulk-receive-goods';
export type { BulkReceiveGoodsInput, BulkReceiveGoodsResult } from './use-bulk-receive-goods';

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
