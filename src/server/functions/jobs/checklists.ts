/**
 * Checklists Server Functions
 *
 * Server-side functions for checklist template and job checklist operations.
 * All functions use withAuth for authentication and filter by organizationId.
 *
 * @see src/lib/schemas/jobs/checklists.ts for validation schemas
 * @see drizzle/schema/jobs/checklists.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  checklistTemplates,
  jobChecklists,
  jobChecklistItems,
  jobAssignments,
  users,
  type ChecklistTemplateItem,
} from 'drizzle/schema';
import {
  listChecklistTemplatesSchema,
  createChecklistTemplateSchema,
  updateChecklistTemplateSchema,
  deleteChecklistTemplateSchema,
  getChecklistTemplateSchema,
  applyChecklistToJobSchema,
  updateChecklistItemSchema,
  getJobChecklistSchema,
  getChecklistItemSchema,
  type ChecklistTemplateResponse,
  type ChecklistItemResponse,
  type JobChecklistResponse,
} from '@/lib/schemas';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify template belongs to the user's organization.
 */
async function verifyTemplateAccess(templateId: string, organizationId: string) {
  const [template] = await db
    .select({ id: checklistTemplates.id })
    .from(checklistTemplates)
    .where(
      and(
        eq(checklistTemplates.id, templateId),
        eq(checklistTemplates.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!template) {
    throw new NotFoundError('Checklist template not found');
  }

  return template;
}

/**
 * Verify job belongs to the user's organization.
 */
async function verifyJobAccess(jobId: string, organizationId: string) {
  const [job] = await db
    .select({ id: jobAssignments.id })
    .from(jobAssignments)
    .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, organizationId)))
    .limit(1);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

/**
 * Verify checklist item belongs to the user's organization.
 */
async function verifyItemAccess(itemId: string, organizationId: string) {
  const [item] = await db
    .select({
      id: jobChecklistItems.id,
      checklistId: jobChecklistItems.checklistId,
    })
    .from(jobChecklistItems)
    .where(
      and(eq(jobChecklistItems.id, itemId), eq(jobChecklistItems.organizationId, organizationId))
    )
    .limit(1);

  if (!item) {
    throw new NotFoundError('Checklist item not found');
  }

  return item;
}

/**
 * Transform template row to response.
 */
function toTemplateResponse(row: {
  id: string;
  name: string;
  description: string | null;
  items: ChecklistTemplateItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}): ChecklistTemplateResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    // Normalize items to ensure requiresPhoto has a default value
    items: row.items.map((item) => ({
      id: item.id,
      text: item.text,
      description: item.description,
      requiresPhoto: item.requiresPhoto ?? false,
      position: item.position,
    })),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

// ============================================================================
// LIST CHECKLIST TEMPLATES
// ============================================================================

/**
 * Get all checklist templates for the organization.
 */
export const listChecklistTemplates = createServerFn({ method: 'GET' })
  .inputValidator(listChecklistTemplatesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const conditions = [eq(checklistTemplates.organizationId, ctx.organizationId)];

    if (!data.includeInactive) {
      conditions.push(eq(checklistTemplates.isActive, true));
    }

    const templates = await db
      .select({
        id: checklistTemplates.id,
        name: checklistTemplates.name,
        description: checklistTemplates.description,
        items: checklistTemplates.items,
        isActive: checklistTemplates.isActive,
        createdAt: checklistTemplates.createdAt,
        updatedAt: checklistTemplates.updatedAt,
        createdBy: checklistTemplates.createdBy,
        updatedBy: checklistTemplates.updatedBy,
      })
      .from(checklistTemplates)
      .where(and(...conditions))
      .orderBy(checklistTemplates.name);

    return {
      templates: templates.map(toTemplateResponse),
    };
  });

// ============================================================================
// GET CHECKLIST TEMPLATE
// ============================================================================

/**
 * Get a single checklist template by ID.
 */
export const getChecklistTemplate = createServerFn({ method: 'GET' })
  .inputValidator(getChecklistTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const [template] = await db
      .select({
        id: checklistTemplates.id,
        name: checklistTemplates.name,
        description: checklistTemplates.description,
        items: checklistTemplates.items,
        isActive: checklistTemplates.isActive,
        createdAt: checklistTemplates.createdAt,
        updatedAt: checklistTemplates.updatedAt,
        createdBy: checklistTemplates.createdBy,
        updatedBy: checklistTemplates.updatedBy,
      })
      .from(checklistTemplates)
      .where(
        and(
          eq(checklistTemplates.id, data.templateId),
          eq(checklistTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Checklist template not found');
    }

    return { template: toTemplateResponse(template) };
  });

// ============================================================================
// CREATE CHECKLIST TEMPLATE
// ============================================================================

/**
 * Create a new checklist template.
 */
export const createChecklistTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createChecklistTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.create ?? 'customer.create',
    });

    const [template] = await db
      .insert(checklistTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description ?? null,
        items: data.items,
        isActive: data.isActive ?? true,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { template: toTemplateResponse(template) };
  });

// ============================================================================
// UPDATE CHECKLIST TEMPLATE
// ============================================================================

/**
 * Update a checklist template.
 */
export const updateChecklistTemplate = createServerFn({ method: 'POST' })
  .inputValidator(updateChecklistTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify access
    await verifyTemplateAccess(data.templateId, ctx.organizationId);

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
      version: sql`${checklistTemplates.version} + 1`,
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.items !== undefined) {
      updateData.items = data.items;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const [template] = await db
      .update(checklistTemplates)
      .set(updateData)
      .where(eq(checklistTemplates.id, data.templateId))
      .returning();

    return { template: toTemplateResponse(template) };
  });

// ============================================================================
// DELETE CHECKLIST TEMPLATE
// ============================================================================

/**
 * Delete a checklist template (soft delete by setting isActive to false).
 */
export const deleteChecklistTemplate = createServerFn({ method: 'POST' })
  .inputValidator(deleteChecklistTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.delete ?? 'customer.delete',
    });

    // Verify access
    await verifyTemplateAccess(data.templateId, ctx.organizationId);

    // Soft delete by setting isActive to false
    await db
      .update(checklistTemplates)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${checklistTemplates.version} + 1`,
      })
      .where(eq(checklistTemplates.id, data.templateId));

    return { success: true };
  });

// ============================================================================
// APPLY CHECKLIST TO JOB
// ============================================================================

/**
 * Apply a checklist template to a job.
 * Creates a job checklist with items from the template.
 */
export const applyChecklistToJob = createServerFn({ method: 'POST' })
  .inputValidator(applyChecklistToJobSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get the template
    const [template] = await db
      .select({
        id: checklistTemplates.id,
        name: checklistTemplates.name,
        items: checklistTemplates.items,
      })
      .from(checklistTemplates)
      .where(
        and(
          eq(checklistTemplates.id, data.templateId),
          eq(checklistTemplates.organizationId, ctx.organizationId),
          eq(checklistTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Checklist template not found or inactive');
    }

    // Check if job already has a checklist
    const [existing] = await db
      .select({ id: jobChecklists.id })
      .from(jobChecklists)
      .where(
        and(
          eq(jobChecklists.jobId, data.jobId),
          eq(jobChecklists.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (existing) {
      throw new ValidationError('Job already has a checklist applied');
    }

    // Create the job checklist
    const [checklist] = await db
      .insert(jobChecklists)
      .values({
        organizationId: ctx.organizationId,
        jobId: data.jobId,
        templateId: template.id,
        templateName: template.name,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Create checklist items from template
    const items = template.items as ChecklistTemplateItem[];
    if (items.length > 0) {
      await db.insert(jobChecklistItems).values(
        items.map((item) => ({
          organizationId: ctx.organizationId,
          checklistId: checklist.id,
          itemText: item.text,
          itemDescription: item.description ?? null,
          requiresPhoto: item.requiresPhoto ?? false,
          position: item.position,
          isCompleted: false,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        }))
      );
    }

    // Return the full checklist with items
    return getJobChecklistById(checklist.id, ctx.organizationId);
  });

// ============================================================================
// UPDATE CHECKLIST ITEM
// ============================================================================

/**
 * Update a checklist item (mark complete, add notes/photo).
 */
export const updateChecklistItem = createServerFn({ method: 'POST' })
  .inputValidator(updateChecklistItemSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify access
    await verifyItemAccess(data.itemId, ctx.organizationId);

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
      version: sql`${jobChecklistItems.version} + 1`,
    };

    if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted;
      if (data.isCompleted) {
        updateData.completedAt = new Date();
        updateData.completedBy = ctx.user.id;
      } else {
        updateData.completedAt = null;
        updateData.completedBy = null;
      }
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.photoUrl !== undefined) {
      updateData.photoUrl = data.photoUrl;
    }

    const [updated] = await db
      .update(jobChecklistItems)
      .set(updateData)
      .where(eq(jobChecklistItems.id, data.itemId))
      .returning();

    // Get user details for completedBy
    let completedByUser = null;
    if (updated.completedBy) {
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, updated.completedBy))
        .limit(1);
      if (user) {
        completedByUser = user;
      }
    }

    const response: ChecklistItemResponse = {
      id: updated.id,
      checklistId: updated.checklistId,
      itemText: updated.itemText,
      itemDescription: updated.itemDescription,
      requiresPhoto: updated.requiresPhoto,
      position: updated.position,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt,
      completedBy: updated.completedBy,
      completedByUser,
      notes: updated.notes,
      photoUrl: updated.photoUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return { item: response };
  });

// ============================================================================
// GET JOB CHECKLIST
// ============================================================================

/**
 * Get a job's checklist with all items.
 */
export const getJobChecklist = createServerFn({ method: 'GET' })
  .inputValidator(getJobChecklistSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get the checklist
    const [checklist] = await db
      .select({
        id: jobChecklists.id,
        jobId: jobChecklists.jobId,
        templateId: jobChecklists.templateId,
        templateName: jobChecklists.templateName,
        createdAt: jobChecklists.createdAt,
        updatedAt: jobChecklists.updatedAt,
        createdBy: jobChecklists.createdBy,
        updatedBy: jobChecklists.updatedBy,
      })
      .from(jobChecklists)
      .where(
        and(
          eq(jobChecklists.jobId, data.jobId),
          eq(jobChecklists.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!checklist) {
      return { checklist: null };
    }

    return getJobChecklistById(checklist.id, ctx.organizationId);
  });

/**
 * Internal helper to get a checklist by ID with items.
 */
async function getJobChecklistById(
  checklistId: string,
  organizationId: string
): Promise<{ checklist: JobChecklistResponse }> {
  // Get the checklist
  const [checklist] = await db
    .select({
      id: jobChecklists.id,
      jobId: jobChecklists.jobId,
      templateId: jobChecklists.templateId,
      templateName: jobChecklists.templateName,
      createdAt: jobChecklists.createdAt,
      updatedAt: jobChecklists.updatedAt,
      createdBy: jobChecklists.createdBy,
      updatedBy: jobChecklists.updatedBy,
    })
    .from(jobChecklists)
    .where(and(eq(jobChecklists.id, checklistId), eq(jobChecklists.organizationId, organizationId)))
    .limit(1);

  if (!checklist) {
    throw new NotFoundError('Checklist not found');
  }

  // Get items with user details
  const items = await db
    .select({
      id: jobChecklistItems.id,
      checklistId: jobChecklistItems.checklistId,
      itemText: jobChecklistItems.itemText,
      itemDescription: jobChecklistItems.itemDescription,
      requiresPhoto: jobChecklistItems.requiresPhoto,
      position: jobChecklistItems.position,
      isCompleted: jobChecklistItems.isCompleted,
      completedAt: jobChecklistItems.completedAt,
      completedBy: jobChecklistItems.completedBy,
      notes: jobChecklistItems.notes,
      photoUrl: jobChecklistItems.photoUrl,
      createdAt: jobChecklistItems.createdAt,
      updatedAt: jobChecklistItems.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(jobChecklistItems)
    .leftJoin(users, eq(jobChecklistItems.completedBy, users.id))
    .where(eq(jobChecklistItems.checklistId, checklistId))
    .orderBy(jobChecklistItems.position);

  // Calculate stats
  const total = items.length;
  const completed = items.filter((i) => i.isCompleted).length;
  const remaining = total - completed;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Transform items
  const responseItems: ChecklistItemResponse[] = items.map((item) => ({
    id: item.id,
    checklistId: item.checklistId,
    itemText: item.itemText,
    itemDescription: item.itemDescription,
    requiresPhoto: item.requiresPhoto,
    position: item.position,
    isCompleted: item.isCompleted,
    completedAt: item.completedAt,
    completedBy: item.completedBy,
    completedByUser: item.completedBy
      ? {
          id: item.completedBy,
          name: item.userName,
          email: item.userEmail ?? '',
        }
      : null,
    notes: item.notes,
    photoUrl: item.photoUrl,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  const response: JobChecklistResponse = {
    id: checklist.id,
    jobId: checklist.jobId,
    templateId: checklist.templateId,
    templateName: checklist.templateName,
    items: responseItems,
    stats: {
      total,
      completed,
      remaining,
      percentComplete,
    },
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    createdBy: checklist.createdBy,
    updatedBy: checklist.updatedBy,
  };

  return { checklist: response };
}

// ============================================================================
// GET CHECKLIST ITEM
// ============================================================================

/**
 * Get a single checklist item by ID.
 */
export const getChecklistItem = createServerFn({ method: 'GET' })
  .inputValidator(getChecklistItemSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const [item] = await db
      .select({
        id: jobChecklistItems.id,
        checklistId: jobChecklistItems.checklistId,
        itemText: jobChecklistItems.itemText,
        itemDescription: jobChecklistItems.itemDescription,
        requiresPhoto: jobChecklistItems.requiresPhoto,
        position: jobChecklistItems.position,
        isCompleted: jobChecklistItems.isCompleted,
        completedAt: jobChecklistItems.completedAt,
        completedBy: jobChecklistItems.completedBy,
        notes: jobChecklistItems.notes,
        photoUrl: jobChecklistItems.photoUrl,
        createdAt: jobChecklistItems.createdAt,
        updatedAt: jobChecklistItems.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(jobChecklistItems)
      .leftJoin(users, eq(jobChecklistItems.completedBy, users.id))
      .where(
        and(
          eq(jobChecklistItems.id, data.itemId),
          eq(jobChecklistItems.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!item) {
      throw new NotFoundError('Checklist item not found');
    }

    const response: ChecklistItemResponse = {
      id: item.id,
      checklistId: item.checklistId,
      itemText: item.itemText,
      itemDescription: item.itemDescription,
      requiresPhoto: item.requiresPhoto,
      position: item.position,
      isCompleted: item.isCompleted,
      completedAt: item.completedAt,
      completedBy: item.completedBy,
      completedByUser: item.completedBy
        ? {
            id: item.completedBy,
            name: item.userName,
            email: item.userEmail ?? '',
          }
        : null,
      notes: item.notes,
      photoUrl: item.photoUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    return { item: response };
  });
