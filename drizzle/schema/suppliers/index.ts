/**
 * Suppliers Domain Schema Exports
 *
 * Complete supplier relationship and procurement management database schemas.
 * Includes suppliers, purchase orders, approvals, receipts, amendments, costs, and pricing.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for full specification
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

export * from "./suppliers";

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export * from "./purchase-orders";
export * from "./purchase-order-items";

// ============================================================================
// APPROVALS & WORKFLOW
// ============================================================================

export * from "./purchase-order-approvals";

// ============================================================================
// GOODS RECEIPT & QUALITY CONTROL
// ============================================================================

export * from "./purchase-order-receipts";

// ============================================================================
// AMENDMENTS & CHANGE TRACKING
// ============================================================================

export * from "./purchase-order-amendments";

// ============================================================================
// COSTS & PRICING
// ============================================================================

export * from "./purchase-order-costs";
export * from "./supplier-price-lists";
export * from "./price-agreements";
export * from "./price-change-history";

// ============================================================================
// ALIASES (for backward compatibility with server functions)
// ============================================================================

// Re-export with aliases to match server function expectations
export { supplierPriceLists as priceLists } from "./supplier-price-lists";

// Note: products is NOT part of suppliers schema
// - products: Should be imported from 'drizzle/schema/products'
