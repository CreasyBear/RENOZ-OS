/**
 * Supplier Domain Components
 *
 * Barrel export for supplier-related UI components.
 */

// ============================================================================
// DIRECTORY & LIST (DataTable Pattern)
// ============================================================================
/** @deprecated Use SuppliersListPresenter with DomainFilterBar instead. See suppliers-page.tsx. */
export { SupplierDirectory } from './supplier-directory';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  SUPPLIER_FILTER_CONFIG,
  SUPPLIER_STATUS_OPTIONS,
  SUPPLIER_TYPE_OPTIONS,
  DEFAULT_SUPPLIER_FILTERS,
  type SupplierFiltersState,
} from './supplier-filter-config';

// New DataTable-based components
export { SuppliersListContainer, type SuppliersListContainerProps } from './suppliers-list-container';
export { SuppliersListPresenter, type SuppliersListPresenterProps } from './suppliers-list-presenter';
export { SuppliersTablePresenter, type SuppliersTablePresenterProps } from './suppliers-table-presenter';
export { SuppliersMobileCards, type SuppliersMobileCardsProps } from './suppliers-mobile-cards';
export { createSupplierColumns, type SupplierTableItem, type CreateSupplierColumnsOptions } from './supplier-columns';
export {
  SUPPLIER_STATUS_CONFIG,
  SUPPLIER_TYPE_CONFIG,
  formatLeadTime,
  formatRating,
} from './supplier-status-config';

// Legacy table (deprecated - use SuppliersListPresenter instead)
/** @deprecated Use SuppliersListPresenter instead. See suppliers-page.tsx. */
export { SupplierTable, type SupplierTableData } from './supplier-table';

// ============================================================================
// DETAIL (Container/Presenter Pattern)
// ============================================================================
export { SupplierDetailContainer, type SupplierDetailContainerProps, type SupplierDetailContainerRenderProps } from './containers/supplier-detail-container';
export {
  SupplierDetailView,
  type SupplierDetailViewProps,
  type SupplierDetailHeaderConfig,
  type SupplierData,
} from './views/supplier-detail-view';

// Legacy detail component (deprecated - use SupplierDetailContainer instead)
/** @deprecated Use SupplierDetailContainer instead */
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
