/**
 * Drizzle Schema Barrel Export
 *
 * All table schemas organized by domain.
 * Domain PRDs will add their schemas as they're implemented.
 *
 * @see drizzle/schema/README.md for conventions
 */

// Foundation patterns and enums
export * from "./_shared";

// Core entity schemas
export * from "./customers";

// Products domain (full catalog management)
export * from "./products";

// Orders domain
export * from "./orders";

// Financial domain
export * from "./financial";

// Pipeline and inventory
export * from "./pipeline";
export * from "./inventory";

// Auth and multi-tenancy
export * from "./settings";

// User management domain
export * from "./users";

// Activity audit trail
export * from "./activities";

// Notifications and communication
export * from "./communications";

// Integrations
export * from "./oauth";

// Automation jobs (background job tracking)
// Note: We export both naming conventions for backward compatibility
export {
  automationJobs,
  automationJobsRelations,
  jobs,
  jobsRelations,
  type AutomationJob,
  type NewAutomationJob,
  type AutomationJobMetadata,
  type AutomationJobStatus,
  type AutomationJobType,
  type Job,
  type NewJob,
  type JobMetadata,
  type JobStatus,
  type JobType,
} from "./automation-jobs";

// Jobs domain (field work assignments)
export * from "./jobs";

// File storage
export * from "./files";

// Support domain (SLA, issues, knowledge base)
export * from "./support";

// Warranty domain
export * from "./warranty";

// Suppliers domain (procurement)
export * from "./suppliers";

// Search domain
export * from "./search";

// Reports domain (custom reports, favorites)
export * from "./reports";

// Dashboard domain (targets, scheduled-reports, layouts)
export * from "./dashboard";

// Portal domain
export * from "./portal";

// AI Infrastructure domain
export * from "./_ai";
