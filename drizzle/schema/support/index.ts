/**
 * Support Domain Schema Barrel Export
 *
 * Exports all support-related schema including:
 * - Issues (support tickets)
 * - SLA configurations and tracking (unified engine)
 * - SLA configurations and tracking (unified engine)
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json
 */

// SLA unified engine tables
export * from "./sla-configurations";
export * from "./sla-tracking";
export * from "./sla-events";

// Issues
export * from "./issues";

// Escalation
export * from "./escalation-rules";

// Return Authorizations (RMA)
export * from "./return-authorizations";

// Issue Templates
export * from "./issue-templates";

// CSAT (Customer Satisfaction)
export * from "./csat-responses";

// Knowledge Base
export * from "./knowledge-base";
