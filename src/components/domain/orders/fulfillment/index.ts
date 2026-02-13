/**
 * Order Fulfillment Components
 *
 * Container/Presenter Pattern:
 * - Containers handle data fetching via centralized hooks
 * - Presenters are pure UI components receiving data via props
 * - Use *Container components in routes and parent components
 * - Legacy names exported for backwards compatibility
 */

// ============================================================================
// DIALOGS
// ============================================================================
export { ConfirmDeliveryDialog } from './confirm-delivery-dialog';
export { ShipOrderDialog } from './ship-order-dialog';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
export { SerialPicker } from './serial-picker';

// ============================================================================
// LISTS
// ============================================================================
export { ShipmentList } from './shipment-list';

// ============================================================================
// DASHBOARD - Container
// ============================================================================
export { FulfillmentDashboardContainer } from './fulfillment-dashboard-container';

// ============================================================================
// DASHBOARD - Presenter (for backwards compatibility)
// ============================================================================
export {
  FulfillmentDashboard,
  FulfillmentDashboardPresenter,
  type FulfillmentDashboardProps,
  type FulfillmentDashboardContainerProps,
  type FulfillmentDashboardPresenterProps,
} from './fulfillment-dashboard';

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
export { FulfillmentErrorBoundary } from './fulfillment-error-boundary';

// ============================================================================
// FILTER CONFIG (FILTER-STANDARDS compliant)
// ============================================================================
export {
  FULFILLMENT_FILTER_CONFIG,
  FULFILLMENT_PRIORITY_OPTIONS,
  FULFILLMENT_STATUS_OPTIONS,
  FULFILLMENT_DATE_RANGE_OPTIONS,
  DEFAULT_FULFILLMENT_FILTERS,
  createFulfillmentFilterConfig,
  type FulfillmentFiltersState,
  type FulfillmentPriority,
  type FulfillmentStatus,
  type FulfillmentDateRange,
} from './fulfillment-filter-config';
