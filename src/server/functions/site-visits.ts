/**
 * Site Visit Server Functions
 *
 * Server-side functions for site visit domain operations.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/jobs/site-visits.ts for validation schemas
 * @see drizzle/schema/jobs/site-visits.ts for database schema
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gte, lte, lt, inArray, desc, asc, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteVisits, projects } from "drizzle/schema";
import {
  siteVisitIdSchema,
  createSiteVisitSchema,
  updateSiteVisitSchema,
  rescheduleSiteVisitSchema,
  siteVisitListQuerySchema,
  checkInSchema,
  checkOutSchema,
  customerSignOffSchema,
} from "@/lib/schemas/jobs/site-visits";
import type { SiteVisitItem, SiteVisitListResult } from "@/lib/schemas/jobs/site-visits";
import { withAuth } from "@/lib/server/protected";
import { NotFoundError, ValidationError } from "@/lib/server/errors";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createActivityLoggerWithContext } from "@/server/middleware/activity-context";
import { computeChanges } from "@/lib/activity-logger";

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const SITE_VISIT_EXCLUDED_FIELDS: string[] = [
  "updatedAt",
  "updatedBy",
  "createdAt",
  "createdBy",
  "deletedAt",
  "version",
  "organizationId",
];

// ============================================================================
// SITE VISIT CRUD
// ============================================================================

/**
 * Get site visits with filtering and pagination
 */
export const getSiteVisits = createServerFn({ method: "GET" })
  .inputValidator(siteVisitListQuerySchema)
  .handler(async ({ data }): Promise<SiteVisitListResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      projectId,
      installerId,
      status,
      visitType,
      dateFrom,
      dateTo,
    } = data;

    // Build where conditions
    const conditions = [eq(siteVisits.organizationId, ctx.organizationId)];

    if (projectId) {
      conditions.push(eq(siteVisits.projectId, projectId));
    }
    if (installerId) {
      conditions.push(eq(siteVisits.installerId, installerId));
    }
    if (status) {
      conditions.push(eq(siteVisits.status, status));
    }
    if (visitType) {
      conditions.push(eq(siteVisits.visitType, visitType));
    }
    if (dateFrom) {
      conditions.push(gte(siteVisits.scheduledDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(siteVisits.scheduledDate, dateTo));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countRow] = await db
      .select({ count: count() })
      .from(siteVisits)
      .where(whereClause);
    const totalItems = countRow?.count ?? 0;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderColumn =
      sortBy === "scheduledDate"
        ? siteVisits.scheduledDate
        : sortBy === "status"
          ? siteVisits.status
          : siteVisits.createdAt;
    const orderDirection = sortOrder === "asc" ? asc : desc;

    // Get visits with project titles
    const items = await db
      .select({
        visit: siteVisits,
        projectTitle: projects.title,
        projectNumber: projects.projectNumber,
      })
      .from(siteVisits)
      .leftJoin(projects, eq(siteVisits.projectId, projects.id))
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    // Flatten the results
    const flattenedItems = items.map(({ visit, projectTitle, projectNumber }) => ({
      ...visit,
      projectTitle: projectTitle || 'Unknown Project',
      projectNumber: projectNumber || '-',
    }));

    return {
      items: flattenedItems as SiteVisitItem[],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get site visit by ID
 */
export const getSiteVisit = createServerFn({ method: "GET" })
  .inputValidator(siteVisitIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const siteVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!siteVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    return siteVisit;
  });

/**
 * Create a new site visit
 */
export const createSiteVisit = createServerFn({ method: "POST" })
  .inputValidator(createSiteVisitSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify project exists and belongs to organization
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!project) {
      throw new NotFoundError("Project not found", "project");
    }

    // Generate visit number (VXXX format)
    const visitNumber = await generateVisitNumber(ctx.organizationId, data.projectId);

    // Use provided installer or fall back to current user
    const installerId = data.installerId ?? ctx.user.id;

    const [siteVisit] = await db
      .insert(siteVisits)
      .values({
        organizationId: ctx.organizationId,
        projectId: data.projectId,
        visitNumber,
        visitType: data.visitType,
        status: "scheduled",
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        estimatedDuration: data.estimatedDuration,
        installerId,
        notes: data.notes,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Log site visit creation
    logger.logAsync({
      entityType: "site_visit",
      entityId: siteVisit.id,
      action: "created",
      description: `Created site visit: ${visitNumber}`,
      changes: computeChanges({
        before: null,
        after: siteVisit,
        excludeFields: SITE_VISIT_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: project.customerId ?? undefined,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectTitle: project.title,
        visitNumber,
        visitType: data.visitType,
        scheduledDate: data.scheduledDate,
        installerId: data.installerId ?? undefined,
        status: "scheduled",
      },
    });

    return siteVisit;
  });

/**
 * Reschedule a site visit (scheduled/in_progress only)
 * Dedicated function for activity logging and validation.
 */
export const rescheduleSiteVisit = createServerFn({ method: "POST" })
  .inputValidator(rescheduleSiteVisitSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    if (!["scheduled", "in_progress"].includes(existingVisit.status)) {
      throw new ValidationError(
        `Cannot reschedule visit with status "${existingVisit.status}". Only scheduled or in-progress visits can be rescheduled.`,
        { status: ["Visit must be scheduled or in progress to reschedule"] }
      );
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingVisit.projectId),
      columns: { customerId: true },
    });

    const before = existingVisit;
    const updates = {
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime ?? existingVisit.scheduledTime,
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
      version: sql`${siteVisits.version} + 1`,
    };

    const [updatedVisit] = await db
      .update(siteVisits)
      .set(updates)
      .where(eq(siteVisits.id, data.siteVisitId))
      .returning();

    logger.logAsync({
      entityType: "site_visit",
      entityId: updatedVisit.id,
      action: "updated",
      description: `Rescheduled visit ${existingVisit.visitNumber} from ${before.scheduledDate} to ${data.scheduledDate}`,
      changes: computeChanges({
        before,
        after: updatedVisit,
        excludeFields: SITE_VISIT_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: project?.customerId ?? undefined,
        projectId: updatedVisit.projectId,
        visitNumber: updatedVisit.visitNumber,
        visitType: updatedVisit.visitType,
        previousScheduledDate: before.scheduledDate,
        newScheduledDate: data.scheduledDate,
      },
    });

    return updatedVisit;
  });

/**
 * Get past-due site visits (scheduled before today, not completed)
 * Used for the "Needs rescheduling" sidebar in the schedule calendar.
 */
export const getPastDueSiteVisits = createServerFn({ method: "GET" })
  .handler(async (): Promise<SiteVisitListResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

    const items = await db
      .select({
        visit: siteVisits,
        projectTitle: projects.title,
        projectNumber: projects.projectNumber,
      })
      .from(siteVisits)
      .leftJoin(projects, eq(siteVisits.projectId, projects.id))
      .where(
        and(
          eq(siteVisits.organizationId, ctx.organizationId),
          lt(siteVisits.scheduledDate, today),
          inArray(siteVisits.status, ["scheduled", "in_progress"])
        )
      )
      .orderBy(asc(siteVisits.scheduledDate))
      .limit(100);

    const flattenedItems = items.map(({ visit, projectTitle, projectNumber }) => ({
      ...visit,
      projectTitle: projectTitle || "Unknown Project",
      projectNumber: projectNumber || "-",
    }));

    return {
      items: flattenedItems as SiteVisitItem[],
      pagination: {
        page: 1,
        pageSize: flattenedItems.length,
        totalItems: flattenedItems.length,
        totalPages: flattenedItems.length > 0 ? 1 : 0,
      },
    };
  });

/**
 * Update a site visit
 */
export const updateSiteVisit = createServerFn({ method: "POST" })
  .inputValidator(updateSiteVisitSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    const { siteVisitId, ...updates } = data;

    // Verify site visit exists and belongs to organization
    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    // Fetch project customerId upfront (before mutation) to avoid extra query after
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingVisit.projectId),
      columns: { customerId: true },
    });

    const before = existingVisit;

    const [updatedVisit] = await db
      .update(siteVisits)
      .set({
        ...updates,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
        version: sql`${siteVisits.version} + 1`,
      })
      .where(eq(siteVisits.id, siteVisitId))
      .returning();

    // Log site visit update
    const changes = computeChanges({
      before,
      after: updatedVisit,
      excludeFields: SITE_VISIT_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: "site_visit",
        entityId: updatedVisit.id,
        action: "updated",
        description: `Updated site visit: ${updatedVisit.visitNumber}`,
        changes,
        metadata: {
          customerId: project?.customerId ?? undefined,
          projectId: updatedVisit.projectId,
          visitNumber: updatedVisit.visitNumber,
          visitType: updatedVisit.visitType,
          changedFields: changes.fields,
          ...(before.status !== updatedVisit.status && {
            previousStatus: before.status,
            newStatus: updatedVisit.status,
          }),
        },
      });
    }

    return updatedVisit;
  });

/**
 * Delete a site visit
 */
export const deleteSiteVisit = createServerFn({ method: "POST" })
  .inputValidator(siteVisitIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify site visit exists and belongs to organization
    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    // Only allow deletion of scheduled visits
    if (existingVisit.status !== "scheduled") {
      throw new ValidationError("Cannot delete a visit that has already started or completed", {
        status: ["Visit must be in 'scheduled' status to delete"],
      });
    }

    // Fetch project customerId upfront (before mutation) to avoid extra query after
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingVisit.projectId),
      columns: { customerId: true },
    });

    await db
      .delete(siteVisits)
      .where(eq(siteVisits.id, data.siteVisitId));

    // Log site visit deletion
    logger.logAsync({
      entityType: "site_visit",
      entityId: existingVisit.id,
      action: "deleted",
      description: `Deleted site visit: ${existingVisit.visitNumber}`,
      changes: computeChanges({
        before: existingVisit,
        after: null,
        excludeFields: SITE_VISIT_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: project?.customerId ?? undefined,
        projectId: existingVisit.projectId,
        visitNumber: existingVisit.visitNumber,
        visitType: existingVisit.visitType,
        scheduledDate: existingVisit.scheduledDate ?? undefined,
        status: existingVisit.status,
      },
    });

    return { success: true };
  });

/**
 * Cancel a site visit (status-based cancellation)
 */
export const cancelSiteVisit = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    siteVisitId: z.string().uuid(),
    reason: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });
    const logger = createActivityLoggerWithContext(ctx);

    const existing = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existing) {
      throw new NotFoundError('Site visit not found', 'siteVisit');
    }

    // Only allow cancellation from scheduled status
    if (existing.status !== 'scheduled') {
      throw new ValidationError('Can only cancel scheduled site visits', {
        status: ["Visit must be in 'scheduled' status to cancel"],
      });
    }

    const [updated] = await db
      .update(siteVisits)
      .set({
        status: 'cancelled',
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(siteVisits.id, data.siteVisitId))
      .returning();

    logger.logAsync({
      entityType: 'site_visit',
      entityId: existing.id,
      action: 'updated',
      description: `Cancelled site visit: ${existing.visitNumber}${data.reason ? ` - ${data.reason}` : ''}`,
      metadata: {
        projectId: existing.projectId,
        visitNumber: existing.visitNumber,
        previousStatus: existing.status,
        newStatus: 'cancelled',
        reason: data.reason,
      },
    });

    return updated;
  });

// ============================================================================
// CHECK-IN / CHECK-OUT
// ============================================================================

/**
 * Check in to a site visit
 */
export const checkIn = createServerFn({ method: "POST" })
  .inputValidator(checkInSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    if (existingVisit.status !== "scheduled") {
      throw new ValidationError("Can only check in to scheduled visits", {
        status: ["Visit must be in 'scheduled' status to check in"],
      });
    }

    // Fetch project customerId upfront (before mutation) to avoid extra query after
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingVisit.projectId),
      columns: { customerId: true },
    });

    const [updatedVisit] = await db
      .update(siteVisits)
      .set({
        status: "in_progress",
        actualStartTime: new Date().toISOString(),
        startLocation: data.location,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(siteVisits.id, data.siteVisitId))
      .returning();

    // Log check-in
    logger.logAsync({
      entityType: "site_visit",
      entityId: updatedVisit.id,
      action: "updated",
      description: `Checked in to site visit: ${updatedVisit.visitNumber}`,
      changes: {
        before: { status: "scheduled" },
        after: { status: "in_progress" },
        fields: ["status", "actualStartTime", "startLocation"],
      },
      metadata: {
        customerId: project?.customerId ?? undefined,
        projectId: updatedVisit.projectId,
        visitNumber: updatedVisit.visitNumber,
        visitType: updatedVisit.visitType,
        previousStatus: "scheduled",
        newStatus: "in_progress",
        installerId: updatedVisit.installerId ?? undefined,
      },
    });

    return updatedVisit;
  });

/**
 * Check out from a site visit
 */
export const checkOut = createServerFn({ method: "POST" })
  .inputValidator(checkOutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    if (existingVisit.status !== "in_progress") {
      throw new ValidationError("Can only check out from visits in progress", {
        status: ["Visit must be in 'in_progress' status to check out"],
      });
    }

    // Fetch project customerId upfront (before mutation) to avoid extra query after
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingVisit.projectId),
      columns: { customerId: true },
    });

    const [updatedVisit] = await db
      .update(siteVisits)
      .set({
        status: "completed",
        actualEndTime: new Date().toISOString(),
        completeLocation: data.location,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(siteVisits.id, data.siteVisitId))
      .returning();

    // Log check-out
    logger.logAsync({
      entityType: "site_visit",
      entityId: updatedVisit.id,
      action: "updated",
      description: `Checked out from site visit: ${updatedVisit.visitNumber}`,
      changes: {
        before: { status: "in_progress" },
        after: { status: "completed" },
        fields: ["status", "actualEndTime", "completeLocation"],
      },
      metadata: {
        customerId: project?.customerId ?? undefined,
        projectId: updatedVisit.projectId,
        visitNumber: updatedVisit.visitNumber,
        visitType: updatedVisit.visitType,
        previousStatus: "in_progress",
        newStatus: "completed",
        installerId: updatedVisit.installerId ?? undefined,
      },
    });

    return updatedVisit;
  });

// ============================================================================
// CUSTOMER SIGN-OFF
// ============================================================================

/**
 * Record customer sign-off for a completed visit
 */
export const recordCustomerSignOff = createServerFn({ method: "POST" })
  .inputValidator(customerSignOffSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });
    const logger = createActivityLoggerWithContext(ctx);

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new NotFoundError("Site visit not found", "siteVisit");
    }

    if (existingVisit.status !== "completed") {
      throw new ValidationError("Can only sign off completed visits", {
        status: ["Visit must be in 'completed' status to sign off"],
      });
    }

    // Fetch project customerId upfront (before mutation) to avoid extra query after
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, existingVisit.projectId),
      columns: { customerId: true },
    });

    const [updatedVisit] = await db
      .update(siteVisits)
      .set({
        customerSignOffName: data.customerName,
        customerSignOffDate: new Date().toISOString().split("T")[0],
        customerSignOffConfirmed: true,
        customerRating: data.customerRating,
        customerFeedback: data.customerFeedback,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(siteVisits.id, data.siteVisitId))
      .returning();

    // Log customer sign-off
    logger.logAsync({
      entityType: "site_visit",
      entityId: updatedVisit.id,
      action: "updated",
      description: `Customer signed off on site visit: ${updatedVisit.visitNumber}`,
      changes: {
        before: { customerSignOffConfirmed: false },
        after: { customerSignOffConfirmed: true },
        fields: ["customerSignOffName", "customerSignOffDate", "customerSignOffConfirmed", "customerRating", "customerFeedback"],
      },
      metadata: {
        customerId: project?.customerId ?? undefined,
        projectId: updatedVisit.projectId,
        visitNumber: updatedVisit.visitNumber,
        visitType: updatedVisit.visitType,
        customFields: {
          signedByName: data.customerName,
          customerRating: data.customerRating ?? null,
        },
      },
    });

    return updatedVisit;
  });

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a unique visit number for a project
 */
async function generateVisitNumber(
  organizationId: string,
  projectId: string
): Promise<string> {
  // Count existing visits for this project
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(siteVisits)
    .where(
      and(
        eq(siteVisits.organizationId, organizationId),
        eq(siteVisits.projectId, projectId)
      )
    );

  const visitCount = Number(result[0]?.count ?? 0);
  const nextNum = visitCount + 1;

  return `V${nextNum.toString().padStart(3, "0")}`;
}
