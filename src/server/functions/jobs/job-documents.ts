/**
 * Job Documents Server Functions
 *
 * Document upload, processing, and classification for job assignments.
 * Integrates midday document processing patterns with job workflow.
 *
 * @see drizzle/schema/jobs/job-assignments.ts for jobPhotos table
 * @see src/lib/job-document-processing.ts for processing utilities
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001a/b
 */

import { randomUUID } from 'node:crypto';
import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { jobAssignments, jobPhotos } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { deleteFile, uploadFile } from '@/lib/storage';
import {
  buildJobDocumentPhotoUrl,
  buildJobDocumentStoragePath,
  extractJobDocumentStoragePath,
  JOB_DOCUMENT_STORAGE_BUCKET,
} from '@/lib/jobs/job-document-storage';
import {
  detectJobDocumentFormat,
  extractJobNumberFromDocument,
  type JobDocumentFormat,
} from '@/lib/job-document-processing';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/schemas/files/files';
import {
  uploadJobDocumentSchema,
  listJobDocumentsSchema,
  deleteJobDocumentSchema,
  type UploadJobDocumentInput,
  type ListJobDocumentsInput,
  type DeleteJobDocumentInput,
  type UploadJobDocumentResponse,
  type ListJobDocumentsResponse,
  type DeleteJobDocumentResponse,
} from '@/lib/schemas/jobs/job-documents';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate document file before upload.
 */
function validateDocumentFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

function formatJobDocumentFailure(error: unknown, fallbackMessage: string): string {
  if (error instanceof ValidationError || error instanceof NotFoundError) {
    return error.message;
  }

  return fallbackMessage;
}

async function removeJobDocumentStorageObject(params: {
  storagePath: string | null;
  operation: string;
  jobAssignmentId: string;
  documentId?: string;
}): Promise<void> {
  if (!params.storagePath) return;

  try {
    await deleteFile({
      path: params.storagePath,
      bucket: JOB_DOCUMENT_STORAGE_BUCKET,
    });
  } catch (error) {
    logger.error('Failed to remove job document storage object', error, {
      operation: params.operation,
      jobAssignmentId: params.jobAssignmentId,
      documentId: params.documentId,
    });
  }
}

// ============================================================================
// DOCUMENT UPLOAD
// ============================================================================

export const uploadJobDocument = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    // First validate with Zod schema
    const validated = uploadJobDocumentSchema.parse(input);

    // Additional file validation
    const validation = validateDocumentFile(validated.file.type, validated.file.size);
    if (!validation.valid) {
      throw new ValidationError(validation.error ?? 'Invalid file');
    }

    return validated;
  })
  .handler(async ({ data }: { data: UploadJobDocumentInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });
    let uploadedStoragePath: string | null = null;

    try {
      // Verify job assignment exists and user has access
      const [jobAssignment] = await db
        .select({
          id: jobAssignments.id,
          organizationId: jobAssignments.organizationId,
        })
        .from(jobAssignments)
        .where(
          and(
            eq(jobAssignments.id, data.jobAssignmentId),
            eq(jobAssignments.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!jobAssignment) {
        throw new NotFoundError('Job assignment not found', 'jobAssignment');
      }

      // Convert File to ArrayBuffer for processing
      const fileBuffer = await data.file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);

      // Detect document format and extract metadata
      const format = detectJobDocumentFormat(
        data.file.name,
        data.file.type,
        data.file.type === 'text/plain' ? new TextDecoder().decode(fileData) : undefined
      );

      // Try to extract job number from document content (for receipts/invoices)
      let extractedJobNumber: string | undefined;
      if (format.fileType === 'document' || format.fileType === 'pdf') {
        try {
          extractedJobNumber = extractJobNumberFromDocument(data.file.name, format);
        } catch (error) {
          logger.warn('Failed to extract job number from document', { error });
        }
      }

      const storagePath = buildJobDocumentStoragePath({
        organizationId: ctx.organizationId,
        jobAssignmentId: data.jobAssignmentId,
        objectId: randomUUID(),
        filename: data.file.name,
      });
      const uploadResult = await uploadFile({
        path: storagePath,
        fileBody: fileBuffer,
        contentType: data.file.type,
        bucket: JOB_DOCUMENT_STORAGE_BUCKET,
        metadata: {
          organizationId: ctx.organizationId,
          jobAssignmentId: data.jobAssignmentId,
          originalFilename: data.file.name,
          documentType: data.type,
        },
        upsert: false,
      });
      uploadedStoragePath = uploadResult.path;
      const photoUrl = buildJobDocumentPhotoUrl({
        storagePath: uploadResult.path,
        publicUrl: uploadResult.publicUrl,
      });

      // Create job photo record
      const [newPhoto] = await db
        .insert(jobPhotos)
        .values({
          organizationId: jobAssignment.organizationId,
          jobAssignmentId: data.jobAssignmentId,
          type: data.type,
          photoUrl,
          caption: data.caption,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Trigger document processing (following midday patterns)
      try {
        // This would trigger background processing for classification and OCR
        await processJobDocument({
          photoId: newPhoto.id,
          jobAssignmentId: data.jobAssignmentId,
          organizationId: ctx.organizationId,
          fileData,
          mimeType: data.file.type,
          filename: data.file.name,
          format,
        });
      } catch (processingError) {
        logger.warn('Document processing failed, but upload succeeded', { error: processingError });
        // Don't fail the upload if processing fails
      }

      const response: UploadJobDocumentResponse = {
        success: true,
        document: {
          id: newPhoto.id,
          organizationId: newPhoto.organizationId,
          jobAssignmentId: newPhoto.jobAssignmentId,
          type: newPhoto.type,
          photoUrl: newPhoto.photoUrl,
          caption: newPhoto.caption,
          location: null,
          createdAt: newPhoto.createdAt.toISOString(),
          updatedAt: newPhoto.updatedAt.toISOString(),
          format,
          extractedJobNumber,
        },
      };

      return response;
    } catch (error) {
      await removeJobDocumentStorageObject({
        storagePath: uploadedStoragePath,
        operation: 'uploadRollback',
        jobAssignmentId: data.jobAssignmentId,
      });
      logger.error('Failed to upload job document', error);
      const response: UploadJobDocumentResponse = {
        success: false,
        error: formatJobDocumentFailure(
          error,
          'Job document upload is temporarily unavailable. Please refresh and try again.'
        ),
      };
      return response;
    }
  });

// ============================================================================
// LIST DOCUMENTS
// ============================================================================

export const listJobDocuments = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(listJobDocumentsSchema))
  .handler(async ({ data }: { data: ListJobDocumentsInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    try {
      // Verify job assignment access
      const [jobAssignment] = await db
        .select({ organizationId: jobAssignments.organizationId })
        .from(jobAssignments)
        .where(
          and(
            eq(jobAssignments.id, data.jobAssignmentId),
            eq(jobAssignments.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!jobAssignment) {
        throw new NotFoundError('Job assignment not found', 'jobAssignment');
      }

      // Get all photos for this job assignment
      const photos = await db
        .select()
        .from(jobPhotos)
        .where(
          and(
            eq(jobPhotos.jobAssignmentId, data.jobAssignmentId),
            eq(jobPhotos.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(jobPhotos.createdAt));

      const response: ListJobDocumentsResponse = {
        documents: photos.map((photo) => ({
          id: photo.id,
          organizationId: photo.organizationId,
          jobAssignmentId: photo.jobAssignmentId,
          type: photo.type,
          photoUrl: photo.photoUrl,
          caption: photo.caption,
          location: photo.location,
          createdAt: photo.createdAt.toISOString(),
          updatedAt: photo.updatedAt.toISOString(),
        })),
        total: photos.length,
      };

      return response;
    } catch (error) {
      logger.error('Failed to list job documents', error);
      throw error;
    }
  });

// ============================================================================
// DELETE DOCUMENT
// ============================================================================

export const deleteJobDocument = createServerFn({ method: 'POST' })
  .inputValidator(deleteJobDocumentSchema.parse)
  .handler(async ({ data }: { data: DeleteJobDocumentInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    try {
      const [deletedPhoto] = await db
        .delete(jobPhotos)
        .where(
          and(
            eq(jobPhotos.id, data.documentId),
            eq(jobPhotos.jobAssignmentId, data.jobAssignmentId),
            eq(jobPhotos.organizationId, ctx.organizationId)
          )
        )
        .returning();

      if (!deletedPhoto) {
        throw new NotFoundError('Document not found', 'document');
      }

      await removeJobDocumentStorageObject({
        storagePath: extractJobDocumentStoragePath(deletedPhoto.photoUrl),
        operation: 'delete',
        jobAssignmentId: data.jobAssignmentId,
        documentId: data.documentId,
      });

      const response: DeleteJobDocumentResponse = { success: true };
      return response;
    } catch (error) {
      logger.error('Failed to delete job document', error);
      const response: DeleteJobDocumentResponse = {
        success: false,
        error: formatJobDocumentFailure(
          error,
          'Job document deletion is temporarily unavailable. Please refresh and try again.'
        ),
      };
      return response;
    }
  });

// ============================================================================
// DOCUMENT PROCESSING (Following Midday Patterns)
// ============================================================================

/**
 * Process job document in background (following midday patterns)
 */
async function processJobDocument(params: {
  photoId: string;
  jobAssignmentId: string;
  organizationId: string;
  fileData: Uint8Array;
  mimeType: string;
  filename: string;
  format: JobDocumentFormat;
}): Promise<void> {
  try {
    // Update processing status
    await db
      .update(jobPhotos)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(jobPhotos.id, params.photoId),
          eq(jobPhotos.organizationId, params.organizationId)
        )
      );

    // Following midday pattern:
    // 1. Handle HEIC conversion (if needed)
    if (params.mimeType === 'image/heic') {
      // Convert HEIC to JPG (would implement conversion logic)
      logger.debug('Converting HEIC image for job document', { photoId: params.photoId });
    }

    // 2. Classify image vs document
    if (params.mimeType.startsWith('image/')) {
      // Image classification
      await classifyJobImage({
        photoId: params.photoId,
        fileData: params.fileData,
        filename: params.filename,
        format: params.format,
      });
    } else {
      // Document classification and text extraction
      await classifyJobDocument({
        photoId: params.photoId,
        fileData: params.fileData,
        mimeType: params.mimeType,
        filename: params.filename,
        format: params.format,
      });
    }

    // 3. Extract job number (for receipts/invoices)
    const extractedJobNumber = extractJobNumberFromDocument(params.filename, params.format);
    if (extractedJobNumber) {
      // Store extracted job number (could link to job assignment)
      logger.debug('Extracted job number from document', {
        extractedJobNumber,
        photoId: params.photoId,
      });
    }
  } catch (error) {
    logger.error('Document processing failed', error);
    // Update status to failed (would add processing_status column)
    // await db.update(jobPhotos).set({ processingStatus: "failed" }).where(eq(jobPhotos.id, params.photoId));
  }
}

/**
 * Classify job images (following midday classify-image pattern)
 */
async function classifyJobImage(params: {
  photoId: string;
  fileData: Uint8Array;
  filename: string;
  format: JobDocumentFormat;
}): Promise<void> {
  // Uses filename/content-type classification until an OCR/ML classifier is configured.
  logger.debug('Classified image', {
    photoId: params.photoId,
    classification: params.format.classification,
  });

  // Could update metadata with classification results
  // await db.update(jobPhotos).set({ classification: params.format.classification }).where(eq(jobPhotos.id, params.photoId));
}

/**
 * Classify job documents (following midday classify-document pattern)
 */
async function classifyJobDocument(params: {
  photoId: string;
  fileData: Uint8Array;
  mimeType: string;
  filename: string;
  format: JobDocumentFormat;
}): Promise<void> {
  try {
    // Extract text content when the uploaded format already contains text.
    let extractedText: string | undefined;

    if (params.mimeType === 'text/plain') {
      extractedText = new TextDecoder().decode(params.fileData);
    } else {
      logger.debug('Skipped job document text extraction without a configured extractor', {
        photoId: params.photoId,
        mimeType: params.mimeType,
      });
    }

    if (extractedText) {
      // Classify document based on content
      logger.debug('Classified document', {
        photoId: params.photoId,
        classification: params.format.classification,
      });

      // Could store extracted text and classification
      // await db.update(jobPhotos).set({
      //   extractedText: sample,
      //   classification: params.format.classification
      // }).where(eq(jobPhotos.id, params.photoId));
    }
  } catch (error) {
    logger.error('Document classification failed', error);
  }
}

// Removed unused function _getContentSample - reserved for future OCR/text extraction enhancement
