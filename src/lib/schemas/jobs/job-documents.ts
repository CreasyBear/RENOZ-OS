/**
 * Job Documents Zod Schemas
 *
 * Validation schemas for job document upload, processing, and classification.
 * Matches drizzle/schema/jobs/job-assignments.ts jobPhotos table
 */

import { z } from 'zod';

// ============================================================================
// ENUMS (must match drizzle schema)
// ============================================================================

export const jobDocumentTypeValues = ['before', 'during', 'after', 'issue', 'signature'] as const;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const jobDocumentTypeSchema = z.enum(jobDocumentTypeValues);

// ============================================================================
// LOCATION SCHEMA (reuse from job-assignments)
// ============================================================================

export const documentLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional(),
});

// ============================================================================
// DOCUMENT FORMAT SCHEMA
// ============================================================================

export const jobDocumentFormatSchema = z.object({
  numberFormat: z.enum(['us', 'european']),
  dateFormat: z.enum(['us', 'european', 'iso']),
  language: z.string().nullable(),
  currency: z.string().nullable(),
  fileType: z.enum(['image', 'pdf', 'document', 'unknown']),
  classification: z.enum([
    'job_photo',
    'receipt',
    'invoice',
    'permit',
    'specification',
    'contract',
    'other',
  ]),
});

// ============================================================================
// UPLOAD DOCUMENT
// ============================================================================

export const uploadJobDocumentSchema = z.object({
  jobAssignmentId: z.string().uuid(),
  file: z.instanceof(File),
  type: jobDocumentTypeSchema,
  caption: z.string().optional(),
});

export type UploadJobDocumentInput = z.infer<typeof uploadJobDocumentSchema>;

// ============================================================================
// LIST DOCUMENTS
// ============================================================================

export const listJobDocumentsSchema = z.object({
  jobAssignmentId: z.string().uuid(),
});

export type ListJobDocumentsInput = z.infer<typeof listJobDocumentsSchema>;

// ============================================================================
// DELETE DOCUMENT
// ============================================================================

export const deleteJobDocumentSchema = z.object({
  documentId: z.string().uuid(),
  jobAssignmentId: z.string().uuid(),
});

export type DeleteJobDocumentInput = z.infer<typeof deleteJobDocumentSchema>;

// ============================================================================
// DOCUMENT PROCESSING
// ============================================================================

export const processJobDocumentSchema = z.object({
  photoId: z.string().uuid(),
  jobAssignmentId: z.string().uuid(),
  fileData: z.instanceof(Uint8Array),
  mimeType: z.string(),
  filename: z.string(),
  format: jobDocumentFormatSchema,
});

export type ProcessJobDocumentInput = z.infer<typeof processJobDocumentSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export const jobDocumentResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  jobAssignmentId: z.string().uuid(),
  type: jobDocumentTypeSchema,
  photoUrl: z.string(),
  caption: z.string().nullable(),
  location: documentLocationSchema.nullable(),
  format: jobDocumentFormatSchema.optional(),
  extractedJobNumber: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JobDocumentResponse = z.infer<typeof jobDocumentResponseSchema>;

export const listJobDocumentsResponseSchema = z.object({
  documents: z.array(jobDocumentResponseSchema),
  total: z.number(),
});

export type ListJobDocumentsResponse = z.infer<typeof listJobDocumentsResponseSchema>;

export const uploadJobDocumentResponseSchema = z.object({
  success: z.boolean(),
  document: jobDocumentResponseSchema.optional(),
  error: z.string().optional(),
});

export type UploadJobDocumentResponse = z.infer<typeof uploadJobDocumentResponseSchema>;

export const deleteJobDocumentResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type DeleteJobDocumentResponse = z.infer<typeof deleteJobDocumentResponseSchema>;

// ============================================================================
// CLASSIFICATION RESULTS
// ============================================================================

export const documentClassificationResultSchema = z.object({
  documentType: z.string(),
  confidence: z.number().min(0).max(1),
  extractedData: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

export type DocumentClassificationResult = z.infer<typeof documentClassificationResultSchema>;
