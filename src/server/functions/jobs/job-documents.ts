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

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobAssignments, jobPhotos } from '@/../drizzle/schema';
import { withAuth } from '@/lib/server/protected';
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
  if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
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

// ============================================================================
// DOCUMENT UPLOAD
// ============================================================================

export const uploadJobDocument = createServerFn({ method: 'POST' })
  .inputValidator((input: any) => {
    // First validate with Zod schema
    const validated = uploadJobDocumentSchema.parse(input);

    // Additional file validation
    const validation = validateDocumentFile(validated.file.type, validated.file.size);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return validated;
  })
  .handler(async ({ data }: { data: UploadJobDocumentInput }) => {
    const ctx = await withAuth();

    try {
      // Verify job assignment exists and user has access
      const [jobAssignment] = await db
        .select({
          id: jobAssignments.id,
          organizationId: jobAssignments.organizationId,
        })
        .from(jobAssignments)
        .where(eq(jobAssignments.id, data.jobAssignmentId))
        .limit(1);

      if (!jobAssignment) {
        throw new Error('Job assignment not found');
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
          // This would integrate with midday document loader
          // For now, we'll skip OCR/text extraction and just use filename
          extractedJobNumber = extractJobNumberFromDocument(data.file.name, format);
        } catch (error) {
          console.warn('Failed to extract job number from document:', error);
        }
      }

      // Generate unique filename
      const fileExtension = data.file.name.split('.').pop() || 'unknown';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const filename = `${data.jobAssignmentId}_${timestamp}_${randomId}.${fileExtension}`;

      // In a real implementation, this would upload to cloud storage (Supabase, S3, etc.)
      // For now, we'll simulate the upload and store metadata
      const photoUrl = `/api/files/job-documents/${filename}`; // Placeholder URL

      // Create job photo record
      const [newPhoto] = await db
        .insert(jobPhotos)
        .values({
          organizationId: jobAssignment.organizationId,
          jobAssignmentId: data.jobAssignmentId,
          type: data.type as any,
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
          fileData,
          mimeType: data.file.type,
          filename: data.file.name,
          format,
        });
      } catch (processingError) {
        console.warn('Document processing failed, but upload succeeded:', processingError);
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
      console.error('Failed to upload job document:', error);
      const response: UploadJobDocumentResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      };
      return response;
    }
  });

// ============================================================================
// LIST DOCUMENTS
// ============================================================================

export const listJobDocuments = createServerFn({ method: 'GET' })
  .inputValidator(listJobDocumentsSchema.parse)
  .handler(async ({ data }: { data: ListJobDocumentsInput }) => {
    await withAuth();

    try {
      // Verify job assignment access
      const [jobAssignment] = await db
        .select({ organizationId: jobAssignments.organizationId })
        .from(jobAssignments)
        .where(eq(jobAssignments.id, data.jobAssignmentId))
        .limit(1);

      if (!jobAssignment) {
        throw new Error('Job assignment not found');
      }

      // Get all photos for this job assignment
      const photos = await db
        .select()
        .from(jobPhotos)
        .where(eq(jobPhotos.jobAssignmentId, data.jobAssignmentId))
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
      console.error('Failed to list job documents:', error);
      throw error;
    }
  });

// ============================================================================
// DELETE DOCUMENT
// ============================================================================

export const deleteJobDocument = createServerFn({ method: 'POST' })
  .inputValidator(deleteJobDocumentSchema.parse)
  .handler(async ({ data }: { data: DeleteJobDocumentInput }) => {
    await withAuth();

    try {
      // Delete the photo record (this would also need to delete the actual file)
      const [deletedPhoto] = await db
        .delete(jobPhotos)
        .where(
          and(
            eq(jobPhotos.id, data.documentId),
            eq(jobPhotos.jobAssignmentId, data.jobAssignmentId)
          )
        )
        .returning();

      if (!deletedPhoto) {
        throw new Error('Document not found');
      }

      // In a real implementation, also delete the file from storage
      // await deleteFileFromStorage(deletedPhoto.photoUrl);

      const response: DeleteJobDocumentResponse = { success: true };
      return response;
    } catch (error) {
      console.error('Failed to delete job document:', error);
      const response: DeleteJobDocumentResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
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
      .where(eq(jobPhotos.id, params.photoId));

    // Following midday pattern:
    // 1. Handle HEIC conversion (if needed)
    if (params.mimeType === 'image/heic') {
      // Convert HEIC to JPG (would implement conversion logic)
      console.log('Converting HEIC image for job document:', params.photoId);
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
      console.log(`Extracted job number ${extractedJobNumber} from document ${params.photoId}`);
    }
  } catch (error) {
    console.error('Document processing failed:', error);
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
  // This would integrate with AI/ML classification service
  // For now, use filename-based classification from our existing utility
  console.log(`Classified image ${params.photoId} as: ${params.format.classification}`);

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
    // Extract text content (would use midday document loader)
    let extractedText: string | undefined;

    if (params.mimeType === 'text/plain') {
      extractedText = new TextDecoder().decode(params.fileData);
    } else {
      // For PDFs and other documents, would use document processing library
      // extractedText = await extractTextFromDocument(params.fileData, params.mimeType);
      extractedText = 'Sample extracted text'; // Placeholder
    }

    if (extractedText) {
      // Classify document based on content
      console.log(`Classified document ${params.photoId} as: ${params.format.classification}`);

      // Could store extracted text and classification
      // await db.update(jobPhotos).set({
      //   extractedText: sample,
      //   classification: params.format.classification
      // }).where(eq(jobPhotos.id, params.photoId));
    }
  } catch (error) {
    console.error('Document classification failed:', error);
  }
}

// Removed unused function _getContentSample - reserved for future OCR/text extraction enhancement
