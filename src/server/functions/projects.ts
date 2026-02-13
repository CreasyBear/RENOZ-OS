/**
 * Project Server Functions
 *
 * Server-side functions for project domain operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/projects.ts for validation schemas
 * @see drizzle/schema/jobs/projects.ts for database schema
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, ilike, desc, asc, sql, isNull, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { containsPattern } from "@/lib/db/utils";
import { projects, projectMembers } from "drizzle/schema";
import {
  projectIdSchema,
  createProjectSchema,
  updateProjectSchema,
  projectListQuerySchema,
  projectCursorQuerySchema,
  addProjectMemberSchema,
  removeProjectMemberSchema,
  completeProjectSchema,
} from "@/lib/schemas/jobs/projects";
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from "@/lib/db/pagination";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createActivityLoggerWithContext } from "@/server/middleware/activity-context";
import { computeChanges } from "@/lib/activity-logger";
import { logger as appLogger } from "@/lib/logger";
import { generateProjectHandoverPackPdf } from "@/server/functions/documents";

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const PROJECT_EXCLUDED_FIELDS: string[] = [
  "updatedAt",
  "updatedBy",
  "createdAt",
  "createdBy",
  "deletedAt",
  "version",
  "organizationId",
];

/**
 * Valid status transitions for projects.
 * Terminal states (completed, cancelled) cannot transition to other states.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 2.1 Status Lifecycle
 */
const PROJECT_STATUS_TRANSITIONS: Record<string, string[]> = {
  quoting: ["approved", "cancelled"],
  approved: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Validates that a status transition is allowed.
 * @throws Error if the transition is invalid
 */
function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): void {
  if (currentStatus === newStatus) return; // No change, always valid

  const allowedTransitions = PROJECT_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: cannot change from "${currentStatus}" to "${newStatus}". ` +
        `Allowed transitions from "${currentStatus}": ${allowedTransitions.length ? allowedTransitions.join(", ") : "none (terminal state)"}`
    );
  }
}

// ============================================================================
// PROJECT CRUD
// ============================================================================

/**
 * Get projects with offset pagination
 */
export const getProjects = createServerFn({ method: "GET" })
  .inputValidator(projectListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      status,
      projectType,
      priority,
      customerId,
    } = data;

    // Build where conditions - ALWAYS include organizationId for isolation
    const conditions = [eq(projects.organizationId, ctx.organizationId)];

    if (search) {
      conditions.push(ilike(projects.title, containsPattern(search)));
    }
    if (status) {
      conditions.push(eq(projects.status, status));
    }
    if (projectType) {
      conditions.push(eq(projects.projectType, projectType));
    }
    if (priority) {
      conditions.push(eq(projects.priority, priority));
    }
    if (customerId) {
      conditions.push(eq(projects.customerId, customerId));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countRow] = await db
      .select({ count: count() })
      .from(projects)
      .where(whereClause);
    const totalItems = countRow?.count ?? 0;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderColumn =
      sortBy === "title"
        ? projects.title
        : sortBy === "status"
          ? projects.status
          : sortBy === "priority"
            ? projects.priority
            : sortBy === "targetCompletionDate"
              ? projects.targetCompletionDate
              : projects.createdAt;
    const orderDirection = sortOrder === "asc" ? asc : desc;

    const items = await db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
        projectNumber: projects.projectNumber,
        title: projects.title,
        description: projects.description,
        projectType: projects.projectType,
        status: projects.status,
        priority: projects.priority,
        customerId: projects.customerId,
        orderId: projects.orderId,
        siteAddress: projects.siteAddress,
        scope: projects.scope,
        outcomes: projects.outcomes,
        keyFeatures: projects.keyFeatures,
        startDate: projects.startDate,
        targetCompletionDate: projects.targetCompletionDate,
        actualCompletionDate: projects.actualCompletionDate,
        progressPercent: projects.progressPercent,
        estimatedTotalValue: projects.estimatedTotalValue,
        actualTotalCost: projects.actualTotalCost,
        metadata: projects.metadata,
        customerSatisfactionRating: projects.customerSatisfactionRating,
        customerFeedback: projects.customerFeedback,
        handoverPackUrl: projects.handoverPackUrl,
        version: projects.version,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        createdBy: projects.createdBy,
        updatedBy: projects.updatedBy,
        deletedAt: projects.deletedAt,
      })
      .from(projects)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get projects with cursor pagination (recommended for large datasets)
 */
export const getProjectsCursor = createServerFn({ method: "GET" })
  .inputValidator(projectCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const {
      cursor,
      pageSize,
      sortOrder,
      search,
      status,
      projectType,
      priority,
      customerId,
    } = data;

    // Build where conditions
    const conditions = [eq(projects.organizationId, ctx.organizationId)];

    if (search) {
      conditions.push(ilike(projects.title, containsPattern(search)));
    }
    if (status) {
      conditions.push(eq(projects.status, status));
    }
    if (projectType) {
      conditions.push(eq(projects.projectType, projectType));
    }
    if (priority) {
      conditions.push(eq(projects.priority, priority));
    }
    if (customerId) {
      conditions.push(eq(projects.customerId, customerId));
    }

    // Add cursor condition if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(
            projects.createdAt,
            projects.id,
            cursorPosition,
            sortOrder
          )
        );
      }
    }

    const whereClause = and(...conditions);
    const orderDirection = sortOrder === "asc" ? asc : desc;

    const results = await db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
        projectNumber: projects.projectNumber,
        title: projects.title,
        description: projects.description,
        projectType: projects.projectType,
        status: projects.status,
        priority: projects.priority,
        customerId: projects.customerId,
        orderId: projects.orderId,
        siteAddress: projects.siteAddress,
        scope: projects.scope,
        outcomes: projects.outcomes,
        keyFeatures: projects.keyFeatures,
        startDate: projects.startDate,
        targetCompletionDate: projects.targetCompletionDate,
        actualCompletionDate: projects.actualCompletionDate,
        progressPercent: projects.progressPercent,
        estimatedTotalValue: projects.estimatedTotalValue,
        actualTotalCost: projects.actualTotalCost,
        metadata: projects.metadata,
        customerSatisfactionRating: projects.customerSatisfactionRating,
        customerFeedback: projects.customerFeedback,
        handoverPackUrl: projects.handoverPackUrl,
        version: projects.version,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        createdBy: projects.createdBy,
        updatedBy: projects.updatedBy,
        deletedAt: projects.deletedAt,
      })
      .from(projects)
      .where(whereClause)
      .orderBy(orderDirection(projects.createdAt), orderDirection(projects.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results, pageSize);
  });

/**
 * Get project by ID
 */
export const getProject = createServerFn({ method: "GET" })
  .inputValidator(projectIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  });

/**
 * Create a new project
 */
export const createProject = createServerFn({ method: "POST" })
  .inputValidator(createProjectSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });
    const logger = createActivityLoggerWithContext(ctx);

    // Generate project number (PRJ-XXXX format)
    const projectNumber = await generateProjectNumber(ctx.organizationId);

    // Create project and add owner atomically
    const project = await db.transaction(async (tx) => {
      const [newProject] = await tx
        .insert(projects)
        .values({
          organizationId: ctx.organizationId,
          projectNumber,
          title: data.title,
          description: data.description,
          projectType: data.projectType,
          priority: data.priority,
          customerId: data.customerId,
          orderId: data.orderId,
          siteAddress: data.siteAddress,
          scope: data.scope,
          outcomes: data.outcomes,
          keyFeatures: data.keyFeatures,
          startDate: data.startDate,
          targetCompletionDate: data.targetCompletionDate,
          estimatedTotalValue: data.estimatedTotalValue?.toString(),
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Add creator as project owner
      await tx.insert(projectMembers).values({
        organizationId: ctx.organizationId,
        projectId: newProject.id,
        userId: ctx.user.id,
        role: "owner",
      });

      return newProject;
    });

    // Log project creation
    logger.logAsync({
      entityType: "project",
      entityId: project.id,
      action: "created",
      description: `Created project: ${project.projectNumber} - ${project.title}`,
      changes: computeChanges({
        before: null,
        after: project,
        excludeFields: PROJECT_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        projectNumber: project.projectNumber,
        projectTitle: project.title,
        projectType: project.projectType,
        priority: project.priority ?? undefined,
        customerId: data.customerId ?? undefined,
        status: project.status,
      },
    });

    return project;
  });

/**
 * Update a project
 */
export const updateProject = createServerFn({ method: "POST" })
  .inputValidator(updateProjectSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    const { projectId, ...updates } = data;

    // Verify project exists and belongs to organization
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!existingProject) {
      throw new Error("Project not found");
    }

    // Validate status transition if status is being changed
    if (updates.status && updates.status !== existingProject.status) {
      validateStatusTransition(existingProject.status, updates.status);
    }

    const before = existingProject;

    const [updatedProject] = await db
      .update(projects)
      .set({
        ...updates,
        estimatedTotalValue: updates.estimatedTotalValue?.toString(),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
        version: sql`${projects.version} + 1`,
      })
      .where(eq(projects.id, projectId))
      .returning();

    // Log project update
    const changes = computeChanges({
      before,
      after: updatedProject,
      excludeFields: PROJECT_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: "project",
        entityId: updatedProject.id,
        action: "updated",
        description: `Updated project: ${updatedProject.projectNumber} - ${updatedProject.title}`,
        changes,
        metadata: {
          projectNumber: updatedProject.projectNumber,
          projectTitle: updatedProject.title,
          customerId: updatedProject.customerId ?? undefined,
          changedFields: changes.fields,
          ...(before.status !== updatedProject.status && {
            previousStatus: before.status,
            newStatus: updatedProject.status,
          }),
        },
      });
    }

    return updatedProject;
  });

/**
 * Delete a project (soft delete by marking as cancelled)
 */
export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator(projectIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify project exists and belongs to organization (exclude already-deleted)
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId),
        isNull(projects.deletedAt)
      ),
    });

    if (!existingProject) {
      throw new Error("Project not found");
    }

    // Soft delete by marking as cancelled
    const [updatedProject] = await db
      .update(projects)
      .set({
        status: "cancelled",
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, data.projectId))
      .returning();

    // Log project deletion (cancellation)
    logger.logAsync({
      entityType: "project",
      entityId: existingProject.id,
      action: "deleted",
      description: `Cancelled project: ${existingProject.projectNumber} - ${existingProject.title}`,
      changes: computeChanges({
        before: existingProject,
        after: null,
        excludeFields: PROJECT_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        projectNumber: existingProject.projectNumber,
        projectTitle: existingProject.title,
        customerId: existingProject.customerId ?? undefined,
        previousStatus: existingProject.status,
        newStatus: "cancelled",
      },
    });

    return updatedProject;
  });

// ============================================================================
// PROJECT MEMBERS
// ============================================================================

/**
 * Add a member to a project
 */
export const addProjectMember = createServerFn({ method: "POST" })
  .inputValidator(addProjectMemberSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify project exists and belongs to organization
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!existingProject) {
      throw new Error("Project not found");
    }

    const [member] = await db
      .insert(projectMembers)
      .values({
        organizationId: ctx.organizationId,
        projectId: data.projectId,
        userId: data.userId,
        role: data.role,
      })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { role: data.role },
      })
      .returning();

    // Log member assignment
    logger.logAsync({
      entityType: "project",
      entityId: existingProject.id,
      action: "assigned",
      description: `Added ${data.role} to project: ${existingProject.projectNumber}`,
      metadata: {
        projectNumber: existingProject.projectNumber,
        projectTitle: existingProject.title,
        assignedTo: data.userId,
        customFields: {
          memberRole: data.role,
        },
      },
    });

    return member;
  });

/**
 * Remove a member from a project
 */
export const removeProjectMember = createServerFn({ method: "POST" })
  .inputValidator(removeProjectMemberSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify project exists and belongs to organization
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!existingProject) {
      throw new Error("Project not found");
    }

    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, data.projectId),
          eq(projectMembers.userId, data.userId),
          eq(projectMembers.organizationId, ctx.organizationId)
        )
      );

    // Log member removal
    logger.logAsync({
      entityType: "project",
      entityId: existingProject.id,
      action: "updated",
      description: `Removed member from project: ${existingProject.projectNumber}`,
      metadata: {
        projectNumber: existingProject.projectNumber,
        projectTitle: existingProject.title,
        customFields: {
          removedUserId: data.userId,
        },
      },
    });

    return { success: true };
  });

// ============================================================================
// PROJECT COMPLETION
// ============================================================================

/**
 * Complete a project with final costs and customer feedback
 */
export const completeProject = createServerFn({ method: "POST" })
  .inputValidator(completeProjectSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify project exists and belongs to organization
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!existingProject) {
      throw new Error("Project not found");
    }

    const before = existingProject;

    // Build update object
    const updateData: Record<string, unknown> = {
      status: data.status,
      actualCompletionDate: data.actualCompletionDate,
      customerSatisfactionRating: data.customerSatisfactionRating,
      customerFeedback: data.customerFeedback,
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
      version: sql`${projects.version} + 1`,
    };

    if (data.actualTotalCost !== undefined) {
      updateData.actualTotalCost = data.actualTotalCost.toString();
    }

    // Generate handover pack if requested (completed status only)
    if (data.generateHandoverPack && data.status === "completed") {
      try {
        const result = await generateProjectHandoverPackPdf({
          data: { projectId: data.projectId },
        });
        updateData.handoverPackUrl = result.url;
      } catch (error) {
        // Log but don't block completion
        appLogger.error("Handover pack generation failed", error, {
          domain: "projects",
          projectId: data.projectId,
        });
      }
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, data.projectId))
      .returning();

    // Log project completion
    const changes = computeChanges({
      before,
      after: updatedProject,
      excludeFields: PROJECT_EXCLUDED_FIELDS as never[],
    });

    logger.logAsync({
      entityType: "project",
      entityId: updatedProject.id,
      action: "updated",
      description: `Completed project: ${updatedProject.projectNumber} - ${updatedProject.title}`,
      changes,
      metadata: {
        projectNumber: updatedProject.projectNumber,
        projectTitle: updatedProject.title,
        customerId: updatedProject.customerId ?? undefined,
        previousStatus: before.status,
        newStatus: updatedProject.status,
        customFields: {
          customerSatisfactionRating: data.customerSatisfactionRating ?? null,
          actualTotalCost: data.actualTotalCost ?? null,
          actualCompletionDate: data.actualCompletionDate ?? null,
        },
      },
    });

    return updatedProject;
  });

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a unique project number
 */
async function generateProjectNumber(organizationId: string): Promise<string> {
  const prefix = "PRJ";

  // Get the latest project number for this organization
  const result = await db
    .select({ projectNumber: projects.projectNumber })
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.createdAt))
    .limit(1);

  if (result.length === 0) {
    return `${prefix}-0001`;
  }

  const lastNumber = result[0].projectNumber;
  const match = lastNumber.match(/(\d+)$/);
  const lastSeq = match ? parseInt(match[1], 10) : 0;
  const nextSeq = lastSeq + 1;

  return `${prefix}-${nextSeq.toString().padStart(4, "0")}`;
}
