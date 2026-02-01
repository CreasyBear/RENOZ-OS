/**
 * Purchase Orders Components Barrel Export
 */

// Legacy components (for backward compatibility)
export { POTable } from './po-table';
export type { POTableProps } from './po-table';

export { PODirectory } from './po-directory';
export type { PODirectoryProps } from './po-directory';

// New DataTable infrastructure pattern components
export { PO_STATUS_CONFIG, canReceiveGoods, canEditPO, canDeletePO } from './po-status-config';
export { createPOColumns, type CreatePOColumnsOptions } from './po-columns';
export { POMobileCards, type POMobileCardsProps } from './po-mobile-cards';
export { POTablePresenter, type POTablePresenterProps } from './po-table-presenter';
export { POListPresenter, type POListPresenterProps } from './po-list-presenter';
export { POListContainer, type POListContainerProps } from './po-list-container';

// Container/Presenter pattern for detail view (Gold Standard)
export { PODetailContainer, type PODetailContainerProps, type PODetailContainerRenderProps } from './containers/po-detail-container';
export { PODetailView, type PODetailViewProps, type PurchaseOrderWithDetails, type PurchaseOrderItem } from './views/po-detail-view';

// Re-export types from schemas
export type { PurchaseOrderTableData, PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  PO_FILTER_CONFIG,
  PO_STATUS_OPTIONS,
  DEFAULT_PO_FILTERS,
  createPOFilterConfig,
  type POFiltersState,
} from './po-filter-config';
