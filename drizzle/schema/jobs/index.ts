/**
 * Jobs Schema Exports
 * Project-centric domain: projects, site visits, tasks, materials, time entries
 */

// Legacy exports (will be deprecated)
export * from "./job-assignments";
export * from "./job-materials";
export * from "./job-tasks";
export * from "./job-templates";
export * from "./job-time-entries";
export * from "./checklists";

// New SPRINT-03 domain exports
export * from "./projects";
export * from "./site-visits";
export * from "./workstreams-notes";
export * from "./installers";
export * from "./project-bom";
