/**
 * Zod Schemas Barrel Export
 *
 * All validation schemas should be exported from here.
 * Domain PRDs will add their schemas as they're implemented.
 *
 * @see src/lib/schemas/README.md for conventions
 */

// Foundation patterns
export * from "./patterns";

// Core entity schemas
export * from "./customers";
export * from "./products";
export * from "./orders";
export * from "./order-amendments";
export * from "./order-templates";
export * from "./shipments";

// Pipeline and inventory
export * from "./pipeline";
export * from "./inventory";

// Auth and multi-tenancy
export * from "./auth";

// Activity audit trail
export * from "./activities";

// Notifications and communication
export * from "./notifications";
export * from "./email-history";
