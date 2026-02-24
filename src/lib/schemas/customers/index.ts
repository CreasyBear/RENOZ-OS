/**
 * Customer Schemas
 *
 * Provides validation schemas for customer operations.
 */

// --- Core Customer Types ---
export * from './customers';

// --- Customer Wizard ---
export * from './customer-wizard';

// --- Detail Extended Types ---
export * from './customer-detail-extended';

// --- Action Plans ---
export * from './action-plans';

// --- Rollback ---
export * from './rollback';

// --- Saved Filters ---
export * from './saved-filters';

// --- Route Search Schemas ---
export * from './customer-detail-search';

// --- Triage ---
export * from './customer-triage';

// --- Re-export key types for convenience ---
export type {
  Customer,
  CreateCustomer,
  UpdateCustomer,
  CustomerFilter,
  CustomerListQuery,
  CustomerCursorQuery,
} from './customers';
export type { CustomerWithRelations } from './customer-detail-extended';
