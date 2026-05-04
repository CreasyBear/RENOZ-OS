/**
 * Warranty Schema Exports
 *
 * Warranty management tables, entitlements, claims, extensions, and policies.
 */

// --- Core Warranty Tables ---
export * from "./warranties";
export * from "./warranty-entitlements";
export * from "./warranty-owner-records";
export * from "./warranty-items";

// --- Claims And Extensions ---
export * from "./warranty-claims";
export * from "./warranty-extensions";

// --- Policy Configuration ---
export * from "./warranty-policies";
