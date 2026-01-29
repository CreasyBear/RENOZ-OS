/**
 * Supplier Domain Components
 *
 * Barrel export for supplier-related UI components.
 */

// ============================================================================
// DIRECTORY & LIST
// ============================================================================
export { SupplierDirectory } from './supplier-directory';
export { SupplierTable, type SupplierTableData } from './supplier-table';
export { SupplierFilters } from './supplier-filters';

// ============================================================================
// DETAIL
// ============================================================================
export { SupplierDetail, type SupplierDetailProps, type Supplier } from './supplier-detail';

// ============================================================================
// FORMS (Container/Presenter Pattern)
// ============================================================================
export { SupplierForm, type SupplierFormData, type SupplierFormProps, type SupplierFormErrors } from './supplier-form';
export { SupplierFormSkeleton } from './supplier-form-skeleton';
export { SupplierCreateContainer } from './supplier-create-container';
export { SupplierEditContainer, type SupplierEditContainerProps } from './supplier-edit-container';

// ============================================================================
// PURCHASE ORDERS
// ============================================================================
export {
  POCreationWizard,
  type POCreationWizardProps,
  type PurchaseOrderFormData,
  type PurchaseOrderItemFormData,
  type SupplierItem,
  type ProductItem,
} from './po-creation-wizard';
