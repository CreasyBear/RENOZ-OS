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
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteVisits, projects } from "drizzle/schema";
import {
  siteVisitIdSchema,
  createSiteVisitSchema,
  updateSiteVisitSchema,
  siteVisitListQuerySchema,
  checkInSchema,
  checkOutSchema,
  customerSignOffSchema,
} from "@/lib/schemas/jobs/site-visits";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";

// ============================================================================
// SITE VISIT CRUD
// ============================================================================

/**
 * Get site visits with filtering and pagination
 */
export const getSiteVisits = createServerFn({ method: "GET" })
  .inputValidator(siteVisitListQuerySchema)
  .handler(async ({ data }) => {
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
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(siteVisits)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

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
      items: flattenedItems,
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
      throw new Error("Site visit not found");
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

    // Verify project exists and belongs to organization
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, ctx.organizationId)
      ),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Generate visit number (VXXX format)
    const visitNumber = await generateVisitNumber(ctx.organizationId, data.projectId);

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
        installerId: data.installerId,
        notes: data.notes,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return siteVisit;
  });

/**
 * Update a site visit
 */
export const updateSiteVisit = createServerFn({ method: "POST" })
  .inputValidator(updateSiteVisitSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { siteVisitId, ...updates } = data;

    // Verify site visit exists and belongs to organization
    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new Error("Site visit not found");
    }

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

    return updatedVisit;
  });

/**
 * Delete a site visit
 */
export const deleteSiteVisit = createServerFn({ method: "POST" })
  .inputValidator(siteVisitIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    // Verify site visit exists and belongs to organization
    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new Error("Site visit not found");
    }

    // Only allow deletion of scheduled visits
    if (existingVisit.status !== "scheduled") {
      throw new Error("Cannot delete a visit that has already started or completed");
    }

    await db
      .delete(siteVisits)
      .where(eq(siteVisits.id, data.siteVisitId));

    return { success: true };
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

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new Error("Site visit not found");
    }

    if (existingVisit.status !== "scheduled") {
      throw new Error("Can only check in to scheduled visits");
    }

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

    return updatedVisit;
  });

/**
 * Check out from a site visit
 */
export const checkOut = createServerFn({ method: "POST" })
  .inputValidator(checkOutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new Error("Site visit not found");
    }

    if (existingVisit.status !== "in_progress") {
      throw new Error("Can only check out from visits in progress");
    }

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

    const existingVisit = await db.query.siteVisits.findFirst({
      where: and(
        eq(siteVisits.id, data.siteVisitId),
        eq(siteVisits.organizationId, ctx.organizationId)
      ),
    });

    if (!existingVisit) {
      throw new Error("Site visit not found");
    }

    if (existingVisit.status !== "completed") {
      throw new Error("Can only sign off completed visits");
    }

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
