/**
 * Workstreams Server Functions
 *
 * Server-side functions for project workstream operations.
 * Workstreams are task groups/phases for organizing project work.
 *
 * SPRINT-03: Real implementation replacing stubs
 *
 * @see src/lib/schemas/jobs/workstreams-notes.ts for validation schemas
 * @see drizzle/schema/jobs/workstreams-notes.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { projectWorkstreams } from 'drizzle/schema';
import {
  createWorkstreamSchema,
  updateWorkstreamSchema,
  workstreamIdSchema,
} from '@/lib/schemas/jobs/workstreams-notes';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// WORKSTREAM CRUD
// ============================================================================

/**
 * List workstreams for a project
 */
export const listWorkstreams = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const workstreams = await db
      .select()
      .from(projectWorkstreams)
      .where(
        and(
          eq(projectWorkstreams.projectId, data.projectId),
          eq(projectWorkstreams.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(projectWorkstreams.position));

    return {
      success: true,
      data: workstreams,
    };
  });

/**
 * Get a single workstream by ID
 */
export const getWorkstream = createServerFn({ method: 'GET' })
  .inputValidator(workstreamIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const [workstream] = await db
      .select()
      .from(projectWorkstreams)
      .where(
        and(
          eq(projectWorkstreams.id, data.id),
          eq(projectWorkstreams.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!workstream) {
      throw new Error('Workstream not found');
    }

    return {
      success: true,
      data: workstream,
    };
  });

/**
 * Create a new workstream
 */
export const createWorkstream = createServerFn({ method: 'POST' })
  .inputValidator(createWorkstreamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });

    // Get max position for this project to append at end
    const [{ maxPosition }] = await db
      .select({ maxPosition: sql<number>`max(${projectWorkstreams.position})` })
      .from(projectWorkstreams)
      .where(
        and(
          eq(projectWorkstreams.projectId, data.projectId),
          eq(projectWorkstreams.organizationId, ctx.organizationId)
        )
      );

    const position = data.position ?? (maxPosition ?? -1) + 1;

    const [workstream] = await db
      .insert(projectWorkstreams)
      .values({
        organizationId: ctx.organizationId,
        projectId: data.projectId,
        name: data.name,
        description: data.description ?? null,
        position,
        defaultVisitType: data.defaultVisitType ?? null,
      })
      .returning();

    return {
      success: true,
      data: workstream,
    };
  });

/**
 * Update an existing workstream
 */
export const updateWorkstream = createServerFn({ method: 'POST' })
  .inputValidator(updateWorkstreamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updates } = data;

    const [workstream] = await db
      .update(projectWorkstreams)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectWorkstreams.id, id),
          eq(projectWorkstreams.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!workstream) {
      throw new Error('Workstream not found');
    }

    return {
      success: true,
      data: workstream,
    };
  });

/**
 * Delete a workstream
 */
export const deleteWorkstream = createServerFn({ method: 'POST' })
  .inputValidator(workstreamIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    // Get the workstream to find its project and position
    const [workstream] = await db
      .select()
      .from(projectWorkstreams)
      .where(
        and(
          eq(projectWorkstreams.id, data.id),
          eq(projectWorkstreams.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!workstream) {
      throw new Error('Workstream not found');
    }

    // Delete the workstream
    await db
      .delete(projectWorkstreams)
      .where(eq(projectWorkstreams.id, data.id));

    // Reorder remaining workstreams to fill the gap
    await db
      .update(projectWorkstreams)
      .set({
        position: sql`${projectWorkstreams.position} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectWorkstreams.projectId, workstream.projectId),
          eq(projectWorkstreams.organizationId, ctx.organizationId),
          sql`${projectWorkstreams.position} > ${workstream.position}`
        )
      );

    return {
      success: true,
    };
  });

/**
 * Reorder workstreams within a project
 */
export const reorderWorkstreams = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      workstreamIds: z.array(z.string().uuid()),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // Update positions based on the provided order
    const updates = data.workstreamIds.map((id, index) =>
      db
        .update(projectWorkstreams)
        .set({
          position: index,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectWorkstreams.id, id),
            eq(projectWorkstreams.projectId, data.projectId),
            eq(projectWorkstreams.organizationId, ctx.organizationId)
          )
        )
    );

    await Promise.all(updates);

    return {
      success: true,
    };
  });

// ============================================================================
// DEFAULT WORKSTREAMS
// ============================================================================

const DEFAULT_WORKSTREAMS = [
  { name: 'Site Assessment', description: 'Initial site evaluation and measurements', position: 0 },
  { name: 'Pre-Installation', description: 'Permits, materials, and preparation', position: 1 },
  { name: 'Installation', description: 'Physical installation work', position: 2 },
  { name: 'Commissioning', description: 'System testing and activation', position: 3 },
  { name: 'Handover', description: 'Customer training and documentation', position: 4 },
];

/**
 * Create default workstreams for a new project
 * Called when a project is created
 */
export const createDefaultWorkstreams = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });

    const workstreams = await db
      .insert(projectWorkstreams)
      .values(
        DEFAULT_WORKSTREAMS.map((ws) => ({
          organizationId: ctx.organizationId,
          projectId: data.projectId,
          name: ws.name,
          description: ws.description,
          position: ws.position,
        }))
      )
      .returning();

    return {
      success: true,
      data: workstreams,
    };
  });
