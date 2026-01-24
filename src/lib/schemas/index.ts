/**
 * Zod Schemas Barrel Export
 *
 * All validation schemas are organized in domain subdirectories.
 * Import from this file or from domain barrels (e.g., @/lib/schemas/customers).
 *
 * @see docs/solutions/codebase-organization/consolidate-duplicate-zod-schemas.md
 */

// Foundation patterns (shared across domains)
export * from "./_shared";

// Core entity schemas
export * from "./customers";
export * from "./products";
export * from "./orders";

// Pipeline and inventory
export * from "./pipeline";
export * from "./inventory";

// Auth and multi-tenancy
export * from "./auth";
export * from "./users";

// Activity audit trail
export * from "./activities";

// Files and storage
export * from "./files";

// Jobs domain (field work assignments)
export * from "./jobs";

// Communications
export * from "./communications";

// Financial
export * from "./financial";

// Reports and analytics
export * from "./reports";
export * from "./analytics";
export * from "./dashboard";

// Settings
export * from "./settings";

// Suppliers and procurement
export * from "./suppliers";
export * from "./purchase-orders";
export * from "./pricing";

// Portal
export * from "./portal";

// Receipts
export * from "./receipts";

// Search
export * from "./search";

// Support
export * from "./support";

// Warranty
export * from "./warranty";

// Approvals
export * from "./approvals";

// Standalone utilities
export * from "./automation-jobs";
