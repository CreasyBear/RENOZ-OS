/**
 * Issue Template Server Functions
 *
 * Server functions for managing issue templates including
 * CRUD operations and usage tracking.
 *
 * @see drizzle/schema/support/issue-templates.ts
 * @see src/lib/schemas/support/issue-templates.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql, ilike, count, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { issueTemplates } from 'drizzle/schema/support/issue-templates';
import { users } from 'drizzle/schema/users';
import { withAuth } from '@/lib/server/protected';
import {
  createIssueTemplateSchema,
  updateIssueTemplateSchema,
  getIssueTemplateSchema,
  listIssueTemplatesSchema,
  deleteIssueTemplateSchema,
  incrementTemplateUsageSchema,
  type IssueTemplateResponse,
  type ListIssueTemplatesResponse,
} from '@/lib/schemas/support/issue-templates';
import { NotFoundError } from '@/lib/server/errors';

// ============================================================================
// HELPERS
// ============================================================================

function toTemplateResponse(row: {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: string;
  defaultPriority: string | null;
  defaultAssigneeId: string | null;
  titleTemplate: string | null;
  descriptionPrompt: string | null;
  requiredFields: unknown;
  defaults: unknown;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
}): IssueTemplateResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    type: row.type as IssueTemplateResponse['type'],
    defaultPriority: (row.defaultPriority ?? 'medium') as IssueTemplateResponse['defaultPriority'],
    defaultAssigneeId: row.defaultAssigneeId,
    titleTemplate: row.titleTemplate,
    descriptionPrompt: row.descriptionPrompt,
    requiredFields: row.requiredFields as IssueTemplateResponse['requiredFields'],
    defaults: row.defaults as IssueTemplateResponse['defaults'],
    usageCount: row.usageCount,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    defaultAssignee: row.defaultAssigneeId
      ? {
          id: row.defaultAssigneeId,
          name: row.assigneeName ?? null,
          email: row.assigneeEmail ?? '',
        }
      : null,
  };
}

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

export const createIssueTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createIssueTemplateSchema)
  .handler(async ({ data }): Promise<IssueTemplateResponse> => {
    const ctx = await withAuth();

    const [template] = await db
      .insert(issueTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        defaultPriority: data.defaultPriority ?? 'medium',
        defaultAssigneeId: data.defaultAssigneeId ?? null,
        titleTemplate: data.titleTemplate ?? null,
        descriptionPrompt: data.descriptionPrompt ?? null,
        requiredFields: data.requiredFields ?? null,
        defaults: data.defaults ?? null,
        isActive: data.isActive ?? true,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Get assignee details if needed
    let assigneeName: string | null = null;
    let assigneeEmail: string | null = null;
    if (template.defaultAssigneeId) {
      const [assignee] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, template.defaultAssigneeId))
        .limit(1);
      if (assignee) {
        assigneeName = assignee.name;
        assigneeEmail = assignee.email;
      }
    }

    return toTemplateResponse({
      ...template,
      assigneeName,
      assigneeEmail,
    });
  });

// ============================================================================
// GET TEMPLATE
// ============================================================================

export const getIssueTemplate = createServerFn({ method: 'GET' })
  .inputValidator(getIssueTemplateSchema)
  .handler(async ({ data }): Promise<IssueTemplateResponse> => {
    const ctx = await withAuth();

    const [result] = await db
      .select({
        id: issueTemplates.id,
        organizationId: issueTemplates.organizationId,
        name: issueTemplates.name,
        description: issueTemplates.description,
        type: issueTemplates.type,
        defaultPriority: issueTemplates.defaultPriority,
        defaultAssigneeId: issueTemplates.defaultAssigneeId,
        titleTemplate: issueTemplates.titleTemplate,
        descriptionPrompt: issueTemplates.descriptionPrompt,
        requiredFields: issueTemplates.requiredFields,
        defaults: issueTemplates.defaults,
        usageCount: issueTemplates.usageCount,
        isActive: issueTemplates.isActive,
        createdAt: issueTemplates.createdAt,
        updatedAt: issueTemplates.updatedAt,
        createdBy: issueTemplates.createdBy,
        updatedBy: issueTemplates.updatedBy,
        assigneeName: users.name,
        assigneeEmail: users.email,
      })
      .from(issueTemplates)
      .leftJoin(users, eq(issueTemplates.defaultAssigneeId, users.id))
      .where(
        and(
          eq(issueTemplates.id, data.templateId),
          eq(issueTemplates.organizationId, ctx.organizationId),
          isNull(issueTemplates.deletedAt)
        )
      )
      .limit(1);

    if (!result) {
      throw new NotFoundError('Template not found', 'issueTemplate');
    }

    return toTemplateResponse(result);
  });

// ============================================================================
// LIST TEMPLATES
// ============================================================================

export const listIssueTemplates = createServerFn({ method: 'GET' })
  .inputValidator(listIssueTemplatesSchema)
  .handler(async ({ data }): Promise<ListIssueTemplatesResponse> => {
    const ctx = await withAuth();

    // Build conditions
    const conditions = [
      eq(issueTemplates.organizationId, ctx.organizationId),
      isNull(issueTemplates.deletedAt),
    ];

    if (data.type) {
      conditions.push(eq(issueTemplates.type, data.type));
    }

    if (data.isActive !== undefined) {
      conditions.push(eq(issueTemplates.isActive, data.isActive));
    }

    if (data.search) {
      conditions.push(ilike(issueTemplates.name, containsPattern(data.search)));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(issueTemplates)
      .where(and(...conditions));

    const totalCount = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalCount / data.pageSize);

    // Build order by
    const orderColumn =
      data.sortBy === 'name'
        ? issueTemplates.name
        : data.sortBy === 'usageCount'
          ? issueTemplates.usageCount
          : issueTemplates.createdAt;

    const orderFn = data.sortOrder === 'asc' ? asc : desc;

    // Get templates
    const templates = await db
      .select({
        id: issueTemplates.id,
        organizationId: issueTemplates.organizationId,
        name: issueTemplates.name,
        description: issueTemplates.description,
        type: issueTemplates.type,
        defaultPriority: issueTemplates.defaultPriority,
        defaultAssigneeId: issueTemplates.defaultAssigneeId,
        titleTemplate: issueTemplates.titleTemplate,
        descriptionPrompt: issueTemplates.descriptionPrompt,
        requiredFields: issueTemplates.requiredFields,
        defaults: issueTemplates.defaults,
        usageCount: issueTemplates.usageCount,
        isActive: issueTemplates.isActive,
        createdAt: issueTemplates.createdAt,
        updatedAt: issueTemplates.updatedAt,
        createdBy: issueTemplates.createdBy,
        updatedBy: issueTemplates.updatedBy,
        assigneeName: users.name,
        assigneeEmail: users.email,
      })
      .from(issueTemplates)
      .leftJoin(users, eq(issueTemplates.defaultAssigneeId, users.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize);

    return {
      data: templates.map(toTemplateResponse),
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        totalCount,
        totalPages,
      },
    };
  });

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================

export const updateIssueTemplate = createServerFn({ method: 'POST' })
  .inputValidator(updateIssueTemplateSchema)
  .handler(async ({ data }): Promise<IssueTemplateResponse> => {
    const ctx = await withAuth();

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.defaultPriority !== undefined) updateData.defaultPriority = data.defaultPriority;
    if (data.defaultAssigneeId !== undefined) updateData.defaultAssigneeId = data.defaultAssigneeId;
    if (data.titleTemplate !== undefined) updateData.titleTemplate = data.titleTemplate;
    if (data.descriptionPrompt !== undefined) updateData.descriptionPrompt = data.descriptionPrompt;
    if (data.requiredFields !== undefined) updateData.requiredFields = data.requiredFields;
    if (data.defaults !== undefined) updateData.defaults = data.defaults;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [template] = await db
      .update(issueTemplates)
      .set(updateData)
      .where(
        and(
          eq(issueTemplates.id, data.templateId),
          eq(issueTemplates.organizationId, ctx.organizationId),
          isNull(issueTemplates.deletedAt)
        )
      )
      .returning();

    if (!template) {
      throw new NotFoundError('Template not found', 'issueTemplate');
    }

    // Get assignee details
    let assigneeName: string | null = null;
    let assigneeEmail: string | null = null;
    if (template.defaultAssigneeId) {
      const [assignee] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, template.defaultAssigneeId))
        .limit(1);
      if (assignee) {
        assigneeName = assignee.name;
        assigneeEmail = assignee.email;
      }
    }

    return toTemplateResponse({
      ...template,
      assigneeName,
      assigneeEmail,
    });
  });

// ============================================================================
// DELETE TEMPLATE (Soft Delete)
// ============================================================================

export const deleteIssueTemplate = createServerFn({ method: 'POST' })
  .inputValidator(deleteIssueTemplateSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    const [template] = await db
      .update(issueTemplates)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(issueTemplates.id, data.templateId),
          eq(issueTemplates.organizationId, ctx.organizationId),
          isNull(issueTemplates.deletedAt)
        )
      )
      .returning({ id: issueTemplates.id });

    if (!template) {
      throw new NotFoundError('Template not found', 'issueTemplate');
    }

    return { success: true };
  });

// ============================================================================
// INCREMENT USAGE
// ============================================================================

export const incrementTemplateUsage = createServerFn({ method: 'POST' })
  .inputValidator(incrementTemplateUsageSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    await db
      .update(issueTemplates)
      .set({
        usageCount: sql`${issueTemplates.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(issueTemplates.id, data.templateId),
          eq(issueTemplates.organizationId, ctx.organizationId)
        )
      );

    return { success: true };
  });

// ============================================================================
// GET POPULAR TEMPLATES (for quick create)
// ============================================================================

export const getPopularTemplates = createServerFn({ method: 'GET' })
  .inputValidator(listIssueTemplatesSchema.pick({ pageSize: true }))
  .handler(async ({ data }): Promise<IssueTemplateResponse[]> => {
    const ctx = await withAuth();

    const templates = await db
      .select({
        id: issueTemplates.id,
        organizationId: issueTemplates.organizationId,
        name: issueTemplates.name,
        description: issueTemplates.description,
        type: issueTemplates.type,
        defaultPriority: issueTemplates.defaultPriority,
        defaultAssigneeId: issueTemplates.defaultAssigneeId,
        titleTemplate: issueTemplates.titleTemplate,
        descriptionPrompt: issueTemplates.descriptionPrompt,
        requiredFields: issueTemplates.requiredFields,
        defaults: issueTemplates.defaults,
        usageCount: issueTemplates.usageCount,
        isActive: issueTemplates.isActive,
        createdAt: issueTemplates.createdAt,
        updatedAt: issueTemplates.updatedAt,
        createdBy: issueTemplates.createdBy,
        updatedBy: issueTemplates.updatedBy,
        assigneeName: users.name,
        assigneeEmail: users.email,
      })
      .from(issueTemplates)
      .leftJoin(users, eq(issueTemplates.defaultAssigneeId, users.id))
      .where(
        and(
          eq(issueTemplates.organizationId, ctx.organizationId),
          eq(issueTemplates.isActive, true),
          isNull(issueTemplates.deletedAt)
        )
      )
      .orderBy(desc(issueTemplates.usageCount))
      .limit(data.pageSize ?? 5);

    return templates.map(toTemplateResponse);
  });
