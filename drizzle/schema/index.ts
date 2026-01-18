/**
 * Drizzle Schema Barrel Export
 *
 * All table schemas should be exported from here.
 * Domain PRDs will add their schemas as they're implemented.
 *
 * @see drizzle/schema/README.md for conventions
 */

// Foundation patterns and enums
export * from "./enums";
export * from "./patterns";

// Core entity schemas
export * from "./customers";

// Products domain (full catalog management)
export * from "./categories";
export * from "./products";
export * from "./product-pricing";
export * from "./product-bundles";
export * from "./product-images";
export * from "./product-attributes";
export * from "./product-relations";

// Orders
export * from "./orders";
export * from "./order-shipments";
export * from "./order-templates";
export * from "./order-amendments";

// Pipeline and inventory
export * from "./pipeline";
export * from "./inventory";
export * from "./warehouse-locations";

// Auth and multi-tenancy
export * from "./organizations";
export * from "./users";
export * from "./api-tokens";

// Activity audit trail
export * from "./activities";

// Notifications and communication
export * from "./notifications";
export * from "./email-history";
export * from "./scheduled-emails";
export * from "./email-campaigns";
export * from "./scheduled-calls";
export * from "./email-signatures";
export * from "./email-templates";

// Background jobs
export * from "./jobs";

// File storage
export * from "./files";
