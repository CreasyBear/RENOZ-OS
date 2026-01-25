/**
 * Suppliers Server Functions Barrel Export
 *
 * All supplier-related server functions organized by domain.
 * Includes supplier CRUD, purchase orders, approvals, and analytics.
 */

// ============================================================================
// SUPPLIER MANAGEMENT
// ============================================================================

export * from './suppliers';

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export * from './purchase-orders';

// ============================================================================
// PRICING MANAGEMENT
// ============================================================================

export * from './pricing';
export * from './price-history';
export * from './price-imports';

// ============================================================================
// APPROVALS & WORKFLOW
// ============================================================================

export * from './approvals';

// ============================================================================
// RECEIVING & QUALITY
// ============================================================================

// TODO: Add receipts.ts for goods receipt functions

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

// TODO: Add supplier-analytics.ts for performance analytics
