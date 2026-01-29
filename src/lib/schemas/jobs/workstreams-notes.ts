/**
 * Workstreams, Notes, and Files Zod Schemas
 *
 * Validation schemas for project workstreams, notes, and files.
 *
 * @see drizzle/schema/jobs/workstreams-notes.ts for database schema
 */

import { z } from 'zod';

// ============================================================================
// WORKSTREAM SCHEMAS
// ============================================================================

export const createWorkstreamSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  position: z.number().int().min(0).default(0),
  defaultVisitType: z.enum([
    'assessment',
    'installation',
    'commissioning',
    'service',
    'warranty',
    'inspection',
    'maintenance',
  ]).optional(),
});

export const updateWorkstreamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
  defaultVisitType: z.enum([
    'assessment',
    'installation',
    'commissioning',
    'service',
    'warranty',
    'inspection',
    'maintenance',
  ]).optional(),
});

export const workstreamIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateWorkstreamInput = z.infer<typeof createWorkstreamSchema>;
export type UpdateWorkstreamInput = z.infer<typeof updateWorkstreamSchema>;

// ============================================================================
// NOTE SCHEMAS
// ============================================================================

export const noteTypeSchema = z.enum([
  'general',
  'meeting',
  'audio',
  'site_visit',
  'client_feedback',
]);

export const noteStatusSchema = z.enum(['draft', 'completed', 'processing']);

export type NoteType = z.infer<typeof noteTypeSchema>;
export type NoteStatus = z.infer<typeof noteStatusSchema>;

export const transcriptSegmentSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  timestamp: z.string(),
  text: z.string(),
});

export const audioNoteDataSchema = z.object({
  duration: z.string(), // "00:02:21"
  fileName: z.string(),
  fileUrl: z.string(),
  aiSummary: z.string().optional(),
  keyPoints: z.array(z.string()).default([]),
  insights: z.array(z.string()).default([]),
  transcript: z.array(transcriptSegmentSchema).default([]),
});

export const createNoteSchema = z.object({
  projectId: z.string().uuid(),
  siteVisitId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  noteType: noteTypeSchema.default('general'),
  status: noteStatusSchema.default('completed'),
  audioData: audioNoteDataSchema.optional(),
});

export const updateNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  noteType: noteTypeSchema.optional(),
  status: noteStatusSchema.optional(),
  audioData: audioNoteDataSchema.optional(),
});

export const noteIdSchema = z.object({
  id: z.string().uuid(),
});

export const notesListQuerySchema = z.object({
  projectId: z.string().uuid(),
  siteVisitId: z.string().uuid().optional(),
  noteType: noteTypeSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NotesListQuery = z.infer<typeof notesListQuerySchema>;
export type AudioNoteData = z.infer<typeof audioNoteDataSchema>;
export type NoteTranscriptSegment = z.infer<typeof transcriptSegmentSchema>;

// ============================================================================
// FILE SCHEMAS
// ============================================================================

export const projectFileTypeSchema = z.enum([
  'proposal',
  'contract',
  'specification',
  'drawing',
  'photo',
  'report',
  'warranty',
  'other',
]);

export type ProjectFileType = z.infer<typeof projectFileTypeSchema>;

export const createFileSchema = z.object({
  projectId: z.string().uuid(),
  siteVisitId: z.string().uuid().optional(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
  fileType: projectFileTypeSchema.default('other'),
  description: z.string().optional(),
  position: z.number().int().min(0).default(0),
});

export const updateFileSchema = z.object({
  id: z.string().uuid(),
  fileType: projectFileTypeSchema.optional(),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

export const fileIdSchema = z.object({
  id: z.string().uuid(),
});

export const filesListQuerySchema = z.object({
  projectId: z.string().uuid(),
  siteVisitId: z.string().uuid().optional(),
  fileType: projectFileTypeSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type FilesListQuery = z.infer<typeof filesListQuerySchema>;
