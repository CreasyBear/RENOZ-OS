/**
 * Project Notes Server Functions
 *
 * Server-side functions for project notes with audio transcript support.
 *
 * SPRINT-03: Real implementation replacing stubs
 *
 * @see src/lib/schemas/jobs/workstreams-notes.ts for validation schemas
 * @see drizzle/schema/jobs/workstreams-notes.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectNotes, type AudioNoteData } from 'drizzle/schema';
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  notesListQuerySchema,
} from '@/lib/schemas/jobs/workstreams-notes';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// NOTE CRUD
// ============================================================================

/**
 * List notes for a project
 */
export const listNotes = createServerFn({ method: 'GET' })
  .inputValidator(notesListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const { projectId, siteVisitId, noteType, page, pageSize } = data;

    // Build conditions
    const conditions = [
      eq(projectNotes.organizationId, ctx.organizationId),
      eq(projectNotes.projectId, projectId),
    ];

    if (siteVisitId) {
      conditions.push(eq(projectNotes.siteVisitId, siteVisitId));
    }
    if (noteType) {
      conditions.push(eq(projectNotes.noteType, noteType));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectNotes)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const notes = await db
      .select()
      .from(projectNotes)
      .where(whereClause)
      .orderBy(desc(projectNotes.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      data: notes,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get a single note by ID
 */
export const getNote = createServerFn({ method: 'GET' })
  .inputValidator(noteIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const [note] = await db
      .select()
      .from(projectNotes)
      .where(
        and(
          eq(projectNotes.id, data.id),
          eq(projectNotes.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!note) {
      throw new Error('Note not found');
    }

    return {
      success: true,
      data: note,
    };
  });

/**
 * Create a new note
 */
export const createNote = createServerFn({ method: 'POST' })
  .inputValidator(createNoteSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });

    const [note] = await db
      .insert(projectNotes)
      .values({
        organizationId: ctx.organizationId,
        projectId: data.projectId,
        siteVisitId: data.siteVisitId ?? null,
        title: data.title,
        content: data.content ?? null,
        noteType: data.noteType,
        status: data.status,
        audioData: data.audioData ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return {
      success: true,
      data: note,
    };
  });

/**
 * Update an existing note
 */
export const updateNote = createServerFn({ method: 'POST' })
  .inputValidator(updateNoteSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updates } = data;

    const [note] = await db
      .update(projectNotes)
      .set({
        ...updates,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectNotes.id, id),
          eq(projectNotes.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!note) {
      throw new Error('Note not found');
    }

    return {
      success: true,
      data: note,
    };
  });

/**
 * Delete a note
 */
export const deleteNote = createServerFn({ method: 'POST' })
  .inputValidator(noteIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    await db
      .delete(projectNotes)
      .where(
        and(
          eq(projectNotes.id, data.id),
          eq(projectNotes.organizationId, ctx.organizationId)
        )
      );

    return {
      success: true,
    };
  });

/**
 * Get notes statistics for a project
 */
export const getProjectNotesStats = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const stats = await db
      .select({
        noteType: projectNotes.noteType,
        count: sql<number>`count(*)`,
      })
      .from(projectNotes)
      .where(
        and(
          eq(projectNotes.projectId, data.projectId),
          eq(projectNotes.organizationId, ctx.organizationId)
        )
      )
      .groupBy(projectNotes.noteType);

    const total = stats.reduce((acc, s) => acc + s.count, 0);

    return {
      success: true,
      data: {
        total,
        byType: stats,
      },
    };
  });

// ============================================================================
// AUDIO PROCESSING
// ============================================================================

/**
 * Process audio upload and generate transcript
 * This is a placeholder for AI transcription integration
 */
export const processAudioNote = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      noteId: z.string().uuid(),
      audioFileUrl: z.string().url(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // TODO: Integrate with AI transcription service
    // For now, just update the note with placeholder audio data
    const audioData: AudioNoteData = {
      fileUrl: data.audioFileUrl,
      fileName: 'audio-recording.mp3',
      duration: '00:00:00',
      transcript: [],
      aiSummary: 'Transcription pending...',
      keyPoints: [],
      insights: [],
    };
    
    const [note] = await db
      .update(projectNotes)
      .set({
        audioData,
        status: 'processing',
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectNotes.id, data.noteId),
          eq(projectNotes.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!note) {
      throw new Error('Note not found');
    }

    return {
      success: true,
      data: note,
    };
  });

// Import z for input schemas
import { z } from 'zod';
