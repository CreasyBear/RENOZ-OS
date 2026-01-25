/**
 * Email Domain Verification Schemas
 *
 * Zod validation schemas for domain verification status.
 *
 * @see INT-RES-005
 */

import { z } from "zod";

// ============================================================================
// RECORD STATUS SCHEMA
// ============================================================================

export const dnsRecordStatusSchema = z.enum([
  "verified",
  "pending",
  "failed",
  "not_started",
]);
export type DnsRecordStatus = z.infer<typeof dnsRecordStatusSchema>;

export const dnsRecordTypeSchema = z.enum(["SPF", "DKIM", "DMARC", "MX"]);
export type DnsRecordType = z.infer<typeof dnsRecordTypeSchema>;

// ============================================================================
// DNS RECORD SCHEMA
// ============================================================================

export const dnsRecordSchema = z.object({
  type: dnsRecordTypeSchema,
  name: z.string(),
  value: z.string(),
  status: dnsRecordStatusSchema,
  lastChecked: z.string().optional(),
});
export type DnsRecord = z.infer<typeof dnsRecordSchema>;

// ============================================================================
// DOMAIN STATUS SCHEMA
// ============================================================================

export const domainStatusSchema = z.enum([
  "verified",
  "pending",
  "failed",
  "not_configured",
]);
export type DomainStatus = z.infer<typeof domainStatusSchema>;

export const domainVerificationStatusSchema = z.object({
  domain: z.string(),
  status: domainStatusSchema,
  records: z.array(dnsRecordSchema),
  createdAt: z.string().optional(),
  lastVerifiedAt: z.string().optional(),
});
export type DomainVerificationStatus = z.infer<
  typeof domainVerificationStatusSchema
>;

// ============================================================================
// RESULT SCHEMA
// ============================================================================

export const domainVerificationResultSchema = z.object({
  configured: z.boolean(),
  domain: domainVerificationStatusSchema.nullable(),
  error: z.string().optional(),
});
export type DomainVerificationResult = z.infer<
  typeof domainVerificationResultSchema
>;
