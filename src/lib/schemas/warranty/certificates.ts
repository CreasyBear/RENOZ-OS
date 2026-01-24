/**
 * Warranty Certificate Validation Schemas
 *
 * Zod schemas for warranty certificate generation operations.
 *
 * @see src/server/functions/warranty-certificates.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004b
 */

import { z } from 'zod';

// ============================================================================
// GENERATE WARRANTY CERTIFICATE
// ============================================================================

/**
 * Input schema for generating a warranty certificate.
 */
export const generateWarrantyCertificateSchema = z.object({
  /** Warranty ID to generate certificate for */
  warrantyId: z.string().uuid('Invalid warranty ID'),
  /** Force regeneration even if certificate already exists */
  forceRegenerate: z.boolean().optional().default(false),
});

export type GenerateWarrantyCertificateInput = z.infer<typeof generateWarrantyCertificateSchema>;

// ============================================================================
// GET WARRANTY CERTIFICATE
// ============================================================================

/**
 * Input schema for getting an existing warranty certificate.
 */
export const getWarrantyCertificateSchema = z.object({
  /** Warranty ID to get certificate for */
  warrantyId: z.string().uuid('Invalid warranty ID'),
});

export type GetWarrantyCertificateInput = z.infer<typeof getWarrantyCertificateSchema>;

// ============================================================================
// REGENERATE WARRANTY CERTIFICATE
// ============================================================================

/**
 * Input schema for regenerating a warranty certificate.
 * Used after warranty data changes (e.g., ownership transfer).
 */
export const regenerateWarrantyCertificateSchema = z.object({
  /** Warranty ID to regenerate certificate for */
  warrantyId: z.string().uuid('Invalid warranty ID'),
  /** Reason for regeneration (for audit log) */
  reason: z.string().max(500).optional(),
});

export type RegenerateWarrantyCertificateInput = z.infer<
  typeof regenerateWarrantyCertificateSchema
>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Response from certificate generation operations.
 */
export interface CertificateGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** URL to download the certificate */
  certificateUrl: string | null;
  /** Certificate filename */
  filename: string;
  /** Whether this was a regeneration */
  wasRegenerated: boolean;
  /** Timestamp of generation */
  generatedAt: string;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Response from get certificate operation.
 */
export interface GetCertificateResult {
  /** Whether certificate exists */
  exists: boolean;
  /** URL to download the certificate */
  certificateUrl: string | null;
  /** Warranty details for display */
  warranty: {
    id: string;
    warrantyNumber: string;
    customerName: string;
    productName: string;
    expiryDate: string;
  } | null;
}
