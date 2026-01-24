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
  usePendingApprovals,
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
