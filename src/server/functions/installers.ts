/**
 * Installer Management Server Functions
 *
 * Server-side functions for installer domain operations including:
 * - Profile CRUD
 * - Certifications, skills, territories management
 * - Availability checking and smart assignment
 * - Workload tracking
 *
 * @see src/lib/schemas/jobs/installers.ts for validation schemas
 * @see drizzle/schema/jobs/installers.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import {
  eq,
  and,
  ilike,
  desc,
  asc,
  sql,
  inArray,
  gte,
  lte,
  count,
  ne,
  isNull,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import {
  installerProfiles,
  installerCertifications,
  installerSkills,
  installerTerritories,
  installerBlockouts,
  users,
  siteVisits,
} from 'drizzle/schema';
import { z } from 'zod';
import {
  installerListQuerySchema,
  installerStatusSchema,
  installerIdSchema,
  createInstallerProfileSchema,
  updateInstallerProfileSchema,
  createCertificationSchema,
  updateCertificationSchema,
  verifyCertificationSchema,
  certificationIdSchema,
  createSkillSchema,
  updateSkillSchema,
  skillIdSchema,
  createTerritorySchema,
  updateTerritorySchema,
  territoryIdSchema,
  createBlockoutSchema,
  updateBlockoutSchema,
  blockoutIdSchema,
  checkAvailabilitySchema,
  suggestInstallersSchema,
} from '@/lib/schemas/jobs/installers';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ConflictError } from '@/lib/server/errors';

// ============================================================================
// INSTALLER PROFILE CRUD
// ============================================================================

/**
 * List installers with filtering and pagination
 */
export const listInstallers = createServerFn({ method: 'GET' })
  .inputValidator(installerListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      status,
      skills,
      postcode,
      availableFrom,
      availableTo,
    } = data;

    // Build base conditions
    const conditions = [
      eq(installerProfiles.organizationId, ctx.organizationId),
      isNull(installerProfiles.deletedAt), // Soft delete filter
    ];

    if (status) {
      conditions.push(eq(installerProfiles.status, status));
    }

    // Search by user name/email
    if (search) {
      // We'll filter after the join
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${users}
          WHERE ${users.id} = ${installerProfiles.userId}
          AND (
            ${ilike(users.name ?? '', containsPattern(search))}
            OR ${ilike(users.email, containsPattern(search))}
          )
        )`
      );
    }

    // Filter by skills
    if (skills && skills.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${installerSkills}
          WHERE ${installerSkills.installerId} = ${installerProfiles.id}
          AND ${inArray(installerSkills.skill, skills)}
        )`
      );
    }

    // Filter by territory/postcode
    if (postcode) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${installerTerritories}
          WHERE ${installerTerritories.installerId} = ${installerProfiles.id}
          AND ${installerTerritories.postcode} = ${postcode}
        )`
      );
    }

    // Filter by availability (exclude those with blockouts in range)
    if (availableFrom && availableTo) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${installerBlockouts}
          WHERE ${installerBlockouts.installerId} = ${installerProfiles.id}
          AND ${installerBlockouts.startDate} <= ${availableTo}
          AND ${installerBlockouts.endDate} >= ${availableFrom}
        )`
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(installerProfiles)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Build order by - handle sorting by joined column (name)
    // Get paginated results with user info
    const items = await db
      .select({
        installer: installerProfiles,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(installerProfiles)
      .leftJoin(users, eq(users.id, installerProfiles.userId))
      .where(whereClause)
      .orderBy(
        sortBy === 'name'
          ? // Sort by users.name via join - handle NULLs explicitly (NULLS LAST)
            sortOrder === 'asc'
            ? sql`${users.name} ASC NULLS LAST`
            : sql`${users.name} DESC NULLS LAST`
          : // Other sort fields use standard column sorting
            sortOrder === 'asc'
            ? asc(
                sortBy === 'status'
                  ? installerProfiles.status
                  : sortBy === 'yearsExperience'
                    ? installerProfiles.yearsExperience
                    : installerProfiles.createdAt
              )
            : desc(
                sortBy === 'status'
                  ? installerProfiles.status
                  : sortBy === 'yearsExperience'
                    ? installerProfiles.yearsExperience
                    : installerProfiles.createdAt
              )
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: items.map(({ installer, user }) => ({
        ...installer,
        user,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get single installer with full profile including certifications, skills, territories
 */
export const getInstaller = createServerFn({ method: 'GET' })
  .inputValidator(installerIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    // Get installer profile with user
    const [installerResult] = await db
      .select({
        installer: installerProfiles,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(installerProfiles)
      .leftJoin(users, eq(users.id, installerProfiles.userId))
      .where(
        and(
          eq(installerProfiles.id, data.id),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (!installerResult) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    // Parallelize all independent queries for better performance
    const today = new Date().toISOString().split('T')[0];
    const [certifications, skills, territories, blockouts, performance] = await Promise.all([
      // Get certifications
      db
        .select()
        .from(installerCertifications)
        .where(
          and(
            eq(installerCertifications.installerId, data.id),
            eq(installerCertifications.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(installerCertifications.expiryDate)),

      // Get skills
      db
        .select()
        .from(installerSkills)
        .where(
          and(
            eq(installerSkills.installerId, data.id),
            eq(installerSkills.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(installerSkills.proficiencyLevel)),

      // Get territories
      db
        .select()
        .from(installerTerritories)
        .where(
          and(
            eq(installerTerritories.installerId, data.id),
            eq(installerTerritories.organizationId, ctx.organizationId)
          )
        )
        .orderBy(asc(installerTerritories.priority)),

      // Get upcoming blockouts
      db
        .select()
        .from(installerBlockouts)
        .where(
          and(
            eq(installerBlockouts.installerId, data.id),
            eq(installerBlockouts.organizationId, ctx.organizationId),
            gte(installerBlockouts.endDate, today)
          )
        )
        .orderBy(asc(installerBlockouts.startDate)),

      // Get performance metrics (completed visits for on-time rate calculation)
      // On-time means completed on or before scheduled date
      // Using actualEndTime if available (parsed from ISO text), otherwise updatedAt
      db
        .select({
          totalCompleted: sql<number>`COUNT(*) FILTER (WHERE ${siteVisits.status} = 'completed')`,
          completedOnTime: sql<number>`COUNT(*) FILTER (
            WHERE ${siteVisits.status} = 'completed' 
            AND (
              CASE 
                WHEN ${siteVisits.actualEndTime} IS NOT NULL AND ${siteVisits.actualEndTime} != ''
                THEN DATE((${siteVisits.actualEndTime})::timestamp) <= ${siteVisits.scheduledDate}
                ELSE DATE(${siteVisits.updatedAt}) <= ${siteVisits.scheduledDate}
              END
            )
          )`,
        })
        .from(siteVisits)
        .where(
          and(
            eq(siteVisits.installerId, data.id),
            eq(siteVisits.organizationId, ctx.organizationId)
          )
        ),
    ]);

    // Calculate on-time completion rate
    const totalCompleted = Number(performance[0]?.totalCompleted ?? 0);
    const completedOnTime = Number(performance[0]?.completedOnTime ?? 0);
    const onTimeRate = totalCompleted > 0 ? (completedOnTime / totalCompleted) * 100 : 0;

    return {
      ...installerResult.installer,
      user: installerResult.user,
      certifications,
      skills,
      territories,
      blockouts,
      performance: {
        onTimeCompletionRate: Math.round(onTimeRate),
        totalCompleted,
        completedOnTime,
      },
    };
  });

/**
 * Create installer profile
 */
export const createInstallerProfile = createServerFn({ method: 'POST' })
  .inputValidator(createInstallerProfileSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });

    // Verify user exists and is in same organization
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, data.userId), eq(users.organizationId, ctx.organizationId))
      );

    if (!user) {
      throw new NotFoundError('User not found in organization', 'User');
    }

    // Check if profile already exists (excluding soft-deleted)
    const [existing] = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.userId, data.userId),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (existing) {
      throw new ConflictError('Installer profile already exists for this user');
    }

    const [profile] = await db
      .insert(installerProfiles)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return profile;
  });

/**
 * Update installer profile
 */
export const updateInstallerProfile = createServerFn({ method: 'POST' })
  .inputValidator(updateInstallerProfileSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updateData } = data;

    const [profile] = await db
      .update(installerProfiles)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
        version: sql`${installerProfiles.version} + 1`,
      })
      .where(
        and(
          eq(installerProfiles.id, id),
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!profile) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    return profile;
  });

/**
 * Delete installer profile (soft delete using deletedAt)
 */
export const deleteInstallerProfile = createServerFn({ method: 'POST' })
  .inputValidator(installerIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [profile] = await db
      .update(installerProfiles)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(installerProfiles.id, data.id),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt) // Only delete if not already deleted
        )
      )
      .returning();

    if (!profile) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    return { success: true };
  });

/**
 * List all active installers (for dropdowns, small datasets)
 * Returns all active installers without pagination
 */
export const listAllActiveInstallers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const items = await db
      .select({
        installer: installerProfiles,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(installerProfiles)
      .leftJoin(users, eq(users.id, installerProfiles.userId))
      .where(
        and(
          eq(installerProfiles.organizationId, ctx.organizationId),
          eq(installerProfiles.status, 'active'),
          isNull(installerProfiles.deletedAt)
        )
      )
      .orderBy(sql`COALESCE(${users.name}, ${users.email}) ASC NULLS LAST`);

    return items.map((item) => ({
      id: item.installer.id,
      userId: item.installer.userId,
      name: item.user?.name || item.user?.email || 'Unknown',
      email: item.user?.email || '',
      status: item.installer.status,
      yearsExperience: item.installer.yearsExperience,
      vehicleType: item.installer.vehicleType,
      maxJobsPerDay: item.installer.maxJobsPerDay,
      createdAt: item.installer.createdAt,
      updatedAt: item.installer.updatedAt,
    }));
  });

/**
 * Bulk update installer statuses (server-side batch operation)
 */
export const updateInstallerStatusBatch = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      installerIds: z.array(z.string().uuid()),
      status: installerStatusSchema,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // Verify all installers belong to organization (excluding soft-deleted)
    const existingInstallers = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.organizationId, ctx.organizationId),
          inArray(installerProfiles.id, data.installerIds),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (existingInstallers.length !== data.installerIds.length) {
      throw new NotFoundError('Some installers not found or access denied', 'InstallerProfile');
    }

    // Perform bulk update
    const result = await db
      .update(installerProfiles)
      .set({
        status: data.status,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
        version: sql`${installerProfiles.version} + 1`,
      })
      .where(
        and(
          eq(installerProfiles.organizationId, ctx.organizationId),
          inArray(installerProfiles.id, data.installerIds)
        )
      )
      .returning({ id: installerProfiles.id });

    return {
      success: true,
      updatedCount: result.length,
      installerIds: result.map((r) => r.id),
    };
  });

// ============================================================================
// CERTIFICATIONS
// ============================================================================

export const createCertification = createServerFn({ method: 'POST' })
  .inputValidator(createCertificationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // Verify installer exists
    const [installer] = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.id, data.installerId),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (!installer) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    const [cert] = await db
      .insert(installerCertifications)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return cert;
  });

export const updateCertification = createServerFn({ method: 'POST' })
  .inputValidator(updateCertificationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updateData } = data;

    const [cert] = await db
      .update(installerCertifications)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(installerCertifications.id, id),
          eq(installerCertifications.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!cert) {
      throw new NotFoundError('Certification not found', 'InstallerCertification');
    }

    return cert;
  });

export const verifyCertification = createServerFn({ method: 'POST' })
  .inputValidator(verifyCertificationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [cert] = await db
      .update(installerCertifications)
      .set({
        isVerified: data.isVerified,
        verifiedBy: data.isVerified ? ctx.user.id : null,
        verifiedAt: data.isVerified ? new Date() : null,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(installerCertifications.id, data.id),
          eq(installerCertifications.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!cert) {
      throw new NotFoundError('Certification not found', 'InstallerCertification');
    }

    return cert;
  });

export const deleteCertification = createServerFn({ method: 'POST' })
  .inputValidator(certificationIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [cert] = await db
      .delete(installerCertifications)
      .where(
        and(
          eq(installerCertifications.id, data.id),
          eq(installerCertifications.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!cert) {
      throw new NotFoundError('Certification not found', 'InstallerCertification');
    }

    return cert;
  });

// ============================================================================
// SKILLS
// ============================================================================

export const createSkill = createServerFn({ method: 'POST' })
  .inputValidator(createSkillSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [installer] = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.id, data.installerId),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (!installer) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    const [skill] = await db
      .insert(installerSkills)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .returning();

    return skill;
  });

export const updateSkill = createServerFn({ method: 'POST' })
  .inputValidator(updateSkillSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updateData } = data;

    const [skill] = await db
      .update(installerSkills)
      .set({
        ...updateData,
      })
      .where(
        and(
          eq(installerSkills.id, id),
          eq(installerSkills.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!skill) {
      throw new NotFoundError('Skill not found', 'InstallerSkill');
    }

    return skill;
  });

export const deleteSkill = createServerFn({ method: 'POST' })
  .inputValidator(skillIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [skill] = await db
      .delete(installerSkills)
      .where(
        and(
          eq(installerSkills.id, data.id),
          eq(installerSkills.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!skill) {
      throw new NotFoundError('Skill not found', 'InstallerSkill');
    }

    return skill;
  });

// ============================================================================
// TERRITORIES
// ============================================================================

export const createTerritory = createServerFn({ method: 'POST' })
  .inputValidator(createTerritorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [installer] = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.id, data.installerId),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (!installer) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    const [territory] = await db
      .insert(installerTerritories)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .returning();

    return territory;
  });

export const updateTerritory = createServerFn({ method: 'POST' })
  .inputValidator(updateTerritorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updateData } = data;

    const [territory] = await db
      .update(installerTerritories)
      .set(updateData)
      .where(
        and(
          eq(installerTerritories.id, id),
          eq(installerTerritories.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!territory) {
      throw new NotFoundError('Territory not found', 'InstallerTerritory');
    }

    return territory;
  });

export const deleteTerritory = createServerFn({ method: 'POST' })
  .inputValidator(territoryIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [territory] = await db
      .delete(installerTerritories)
      .where(
        and(
          eq(installerTerritories.id, data.id),
          eq(installerTerritories.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!territory) {
      throw new NotFoundError('Territory not found', 'InstallerTerritory');
    }

    return territory;
  });

// ============================================================================
// BLOCKOUTS
// ============================================================================

export const createBlockout = createServerFn({ method: 'POST' })
  .inputValidator(createBlockoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [installer] = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.id, data.installerId),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (!installer) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    // Check for overlapping blockouts (server-side validation)
    // Date ranges overlap: newStart <= existingEnd AND newEnd >= existingStart
    const overlappingBlockouts = await db
      .select({ id: installerBlockouts.id })
      .from(installerBlockouts)
      .where(
        and(
          eq(installerBlockouts.installerId, data.installerId),
          eq(installerBlockouts.organizationId, ctx.organizationId),
          sql`${installerBlockouts.startDate} <= ${data.endDate} AND ${installerBlockouts.endDate} >= ${data.startDate}`
        )
      )
      .limit(1);

    if (overlappingBlockouts.length > 0) {
      throw new ConflictError('Blockout dates overlap with an existing blockout for this installer');
    }

    // Check for conflicting site visits (warn but don't block)
    const conflictingVisits = await db
      .select({
        id: siteVisits.id,
        visitNumber: siteVisits.visitNumber,
        scheduledDate: siteVisits.scheduledDate,
        status: siteVisits.status,
      })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.installerId, data.installerId),
          eq(siteVisits.organizationId, ctx.organizationId),
          gte(siteVisits.scheduledDate, data.startDate),
          lte(siteVisits.scheduledDate, data.endDate),
          eq(siteVisits.status, 'scheduled')
        )
      );

    const [blockout] = await db
      .insert(installerBlockouts)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return {
      ...blockout,
      conflicts: conflictingVisits.length > 0 ? conflictingVisits : undefined,
    };
  });

export const updateBlockout = createServerFn({ method: 'POST' })
  .inputValidator(updateBlockoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updateData } = data;

    // Get existing blockout to use current dates if not updating
    const [existing] = await db
      .select()
      .from(installerBlockouts)
      .where(
        and(
          eq(installerBlockouts.id, id),
          eq(installerBlockouts.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Blockout not found', 'InstallerBlockout');
    }

    // Determine final dates (use updated or existing)
    const finalStartDate = updateData.startDate ?? existing.startDate;
    const finalEndDate = updateData.endDate ?? existing.endDate;

    // Check for overlapping blockouts (excluding current one)
    if (updateData.startDate || updateData.endDate) {
      // Date ranges overlap: finalStart <= existingEnd AND finalEnd >= existingStart
      const overlappingBlockouts = await db
        .select({ id: installerBlockouts.id })
        .from(installerBlockouts)
        .where(
          and(
            eq(installerBlockouts.installerId, existing.installerId),
            eq(installerBlockouts.organizationId, ctx.organizationId),
            ne(installerBlockouts.id, id), // Exclude current blockout
            sql`${installerBlockouts.startDate} <= ${finalEndDate} AND ${installerBlockouts.endDate} >= ${finalStartDate}`
          )
        )
        .limit(1);

      if (overlappingBlockouts.length > 0) {
        throw new ConflictError('Updated blockout dates overlap with another existing blockout');
      }
    }

    // Check for conflicting site visits if dates are being updated
    let conflictingVisits: Array<{
      id: string;
      visitNumber: string;
      scheduledDate: string;
      status: string;
    }> = [];

    if (updateData.startDate || updateData.endDate) {
      conflictingVisits = await db
        .select({
          id: siteVisits.id,
          visitNumber: siteVisits.visitNumber,
          scheduledDate: siteVisits.scheduledDate,
          status: siteVisits.status,
        })
        .from(siteVisits)
        .where(
          and(
            eq(siteVisits.installerId, existing.installerId),
            eq(siteVisits.organizationId, ctx.organizationId),
            gte(siteVisits.scheduledDate, finalStartDate),
            lte(siteVisits.scheduledDate, finalEndDate),
            eq(siteVisits.status, 'scheduled')
          )
        );
    }

    const [blockout] = await db
      .update(installerBlockouts)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(installerBlockouts.id, id),
          eq(installerBlockouts.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return {
      ...blockout,
      conflicts: conflictingVisits.length > 0 ? conflictingVisits : undefined,
    };
  });

export const deleteBlockout = createServerFn({ method: 'POST' })
  .inputValidator(blockoutIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [blockout] = await db
      .delete(installerBlockouts)
      .where(
        and(
          eq(installerBlockouts.id, data.id),
          eq(installerBlockouts.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!blockout) {
      throw new NotFoundError('Blockout not found', 'InstallerBlockout');
    }

    return blockout;
  });

// ============================================================================
// AVAILABILITY & SUGGESTIONS
// ============================================================================

/**
 * Check installer availability for a date range (batch endpoint)
 */
export const getInstallerAvailabilityBatch = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      installerIds: z.array(z.string().uuid()),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const { installerIds, startDate, endDate } = data;

    if (installerIds.length === 0) {
      return {};
    }

    // Verify all installers exist and belong to organization
    const installers = await db
      .select({
        id: installerProfiles.id,
        maxJobsPerDay: installerProfiles.maxJobsPerDay,
      })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.organizationId, ctx.organizationId),
          inArray(installerProfiles.id, installerIds),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (installers.length !== installerIds.length) {
      throw new NotFoundError('Some installers not found', 'InstallerProfile');
    }

    // Fetch blockouts and visits in parallel for all installers
    const [blockouts, existingVisits] = await Promise.all([
      // Get all blockouts for these installers
      db
        .select()
        .from(installerBlockouts)
        .where(
          and(
            inArray(installerBlockouts.installerId, installerIds),
            eq(installerBlockouts.organizationId, ctx.organizationId),
            gte(installerBlockouts.endDate, startDate),
            lte(installerBlockouts.startDate, endDate)
          )
        ),

      // Get existing visits grouped by installer and date
      db
        .select({
          installerId: siteVisits.installerId,
          count: count(),
          date: siteVisits.scheduledDate,
        })
        .from(siteVisits)
        .where(
          and(
            inArray(siteVisits.installerId, installerIds),
            eq(siteVisits.organizationId, ctx.organizationId),
            gte(siteVisits.scheduledDate, startDate),
            lte(siteVisits.scheduledDate, endDate),
            eq(siteVisits.status, 'scheduled')
          )
        )
        .groupBy(siteVisits.installerId, siteVisits.scheduledDate),
    ]);

    // Build availability map per installer
    const result: Record<
      string,
      Record<string, { available: boolean; reason?: string; existingJobs: number }>
    > = {};

    // Initialize installer map
    for (const installer of installers) {
      result[installer.id] = {};
    }

    // Initialize all dates as available for all installers
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      for (const installer of installers) {
        result[installer.id][dateStr] = { available: true, existingJobs: 0 };
      }
    }

    // Mark blockouts as unavailable
    for (const blockout of blockouts) {
      const blockStart = new Date(blockout.startDate);
      const blockEnd = new Date(blockout.endDate);
      for (let d = new Date(blockStart); d <= blockEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (result[blockout.installerId]?.[dateStr]) {
          result[blockout.installerId][dateStr].available = false;
          result[blockout.installerId][dateStr].reason = `Blockout: ${blockout.reason || blockout.blockoutType || 'Unavailable'}`;
        }
      }
    }

    // Mark days with max jobs as unavailable
    for (const visit of existingVisits) {
      const dateStr = visit.date;
      const installer = installers.find((i) => i.id === visit.installerId);
      if (installer && result[visit.installerId]?.[dateStr]) {
        result[visit.installerId][dateStr].existingJobs = visit.count;
        if (visit.count >= installer.maxJobsPerDay) {
          result[visit.installerId][dateStr].available = false;
          result[visit.installerId][dateStr].reason = 'At capacity';
        }
      }
    }

    return result;
  });

/**
 * Check installer availability for a date range
 */
export const checkAvailability = createServerFn({ method: 'GET' })
  .inputValidator(checkAvailabilitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const { installerId, startDate, endDate } = data;

    // Verify installer exists
    const [installer] = await db
      .select({
        id: installerProfiles.id,
        maxJobsPerDay: installerProfiles.maxJobsPerDay,
      })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.id, installerId),
          eq(installerProfiles.organizationId, ctx.organizationId),
          isNull(installerProfiles.deletedAt)
        )
      );

    if (!installer) {
      throw new NotFoundError('Installer not found', 'InstallerProfile');
    }

    // Check for blockouts
    const blockouts = await db
      .select()
      .from(installerBlockouts)
      .where(
        and(
          eq(installerBlockouts.installerId, installerId),
          gte(installerBlockouts.endDate, startDate),
          lte(installerBlockouts.startDate, endDate)
        )
      );

    // Get existing visits in range
    const existingVisits = await db
      .select({
        count: count(),
        date: siteVisits.scheduledDate,
      })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.installerId, installerId),
          gte(siteVisits.scheduledDate, startDate),
          lte(siteVisits.scheduledDate, endDate),
          eq(siteVisits.status, 'scheduled')
        )
      )
      .groupBy(siteVisits.scheduledDate);

    // Build availability map
    const availability: Record<string, { available: boolean; reason?: string; existingJobs: number }> = {};

    // Initialize all dates as available
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      availability[dateStr] = { available: true, existingJobs: 0 };
    }

    // Mark blockouts as unavailable
    for (const blockout of blockouts) {
      const blockStart = new Date(blockout.startDate);
      const blockEnd = new Date(blockout.endDate);
      for (let d = new Date(blockStart); d <= blockEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (availability[dateStr]) {
          availability[dateStr].available = false;
          availability[dateStr].reason = `Blockout: ${blockout.reason || blockout.blockoutType || 'Unavailable'}`;
        }
      }
    }

    // Mark days with max jobs as unavailable
    for (const visit of existingVisits) {
      const dateStr = visit.date;
      if (availability[dateStr]) {
        availability[dateStr].existingJobs = visit.count;
        if (visit.count >= installer.maxJobsPerDay) {
          availability[dateStr].available = false;
          availability[dateStr].reason = 'At capacity';
        }
      }
    }

    return {
      installerId,
      dateRange: { startDate, endDate },
      availability,
      maxJobsPerDay: installer.maxJobsPerDay,
    };
  });

/**
 * Get installer workload (current assignments)
 */
export const getInstallerWorkload = createServerFn({ method: 'GET' })
  .inputValidator(installerIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Parallelize all independent queries for better performance
    const [activeProjectsResult, upcomingVisitsResult, weekVisitsResult] = await Promise.all([
      // Get active projects count (distinct projects)
      db
        .select({ count: sql<number>`count(distinct ${siteVisits.projectId})` })
        .from(siteVisits)
        .where(
          and(
            eq(siteVisits.installerId, data.id),
            eq(siteVisits.organizationId, ctx.organizationId),
            eq(siteVisits.status, 'scheduled'),
            gte(siteVisits.scheduledDate, today)
          )
        ),

      // Get upcoming visits count
      db
        .select({ count: count() })
        .from(siteVisits)
        .where(
          and(
            eq(siteVisits.installerId, data.id),
            eq(siteVisits.organizationId, ctx.organizationId),
            eq(siteVisits.status, 'scheduled'),
            gte(siteVisits.scheduledDate, today)
          )
        ),

      // Get this week's visits
      db
        .select({ count: count() })
        .from(siteVisits)
        .where(
          and(
            eq(siteVisits.installerId, data.id),
            eq(siteVisits.organizationId, ctx.organizationId),
            eq(siteVisits.status, 'scheduled'),
            gte(siteVisits.scheduledDate, today),
            lte(siteVisits.scheduledDate, weekEndStr)
          )
        ),
    ]);

    return {
      installerId: data.id,
      activeProjects: activeProjectsResult[0]?.count ?? 0,
      upcomingVisits: upcomingVisitsResult[0]?.count ?? 0,
      thisWeekVisits: weekVisitsResult[0]?.count ?? 0,
    };
  });

/**
 * Suggest installers for a job based on territory, skills, and availability
 */
export const suggestInstallers = createServerFn({ method: 'GET' })
  .inputValidator(suggestInstallersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const { postcode, requiredSkills, preferredSkills, date, limit } = data;

    // Base conditions: active installers in organization (not soft-deleted)
    const conditions = [
      eq(installerProfiles.organizationId, ctx.organizationId),
      eq(installerProfiles.status, 'active'),
      isNull(installerProfiles.deletedAt),
    ];

    // Filter by territory (postcode)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${installerTerritories}
        WHERE ${installerTerritories.installerId} = ${installerProfiles.id}
        AND ${installerTerritories.postcode} = ${postcode}
      )`
    );

    // Filter by required skills - must have ALL required skills (not just ANY)
    if (requiredSkills && requiredSkills.length > 0) {
      conditions.push(
        sql`(
          SELECT COUNT(DISTINCT ${installerSkills.skill})
          FROM ${installerSkills}
          WHERE ${installerSkills.installerId} = ${installerProfiles.id}
          AND ${inArray(installerSkills.skill, requiredSkills)}
        ) = ${requiredSkills.length}`
      );
    }

    // Exclude if date provided and has blockout
    if (date) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${installerBlockouts}
          WHERE ${installerBlockouts.installerId} = ${installerProfiles.id}
          AND ${installerBlockouts.startDate} <= ${date}
          AND ${installerBlockouts.endDate} >= ${date}
        )`
      );
    }

    // Get matching installers with their data for scoring
    const installers = await db
      .select({
        installer: installerProfiles,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(installerProfiles)
      .leftJoin(users, eq(users.id, installerProfiles.userId))
      .where(and(...conditions))
      .limit(limit * 2); // Get more for scoring

    // Get skills, territories, certifications, and workload for scoring
    const installerIds = installers.map((i) => i.installer.id);

    const [skills, territories, certifications, workloadData] = await Promise.all([
      db
        .select()
        .from(installerSkills)
        .where(
          and(
            inArray(installerSkills.installerId, installerIds),
            eq(installerSkills.organizationId, ctx.organizationId)
          )
        ),

      db
        .select()
        .from(installerTerritories)
        .where(
          and(
            inArray(installerTerritories.installerId, installerIds),
            eq(installerTerritories.organizationId, ctx.organizationId)
          )
        ),

      // Get certifications for expiry checking
      db
        .select()
        .from(installerCertifications)
        .where(
          and(
            inArray(installerCertifications.installerId, installerIds),
            eq(installerCertifications.organizationId, ctx.organizationId)
          )
        ),

      // Get real-time workload (active project counts) for each installer
      date
        ? db
            .select({
              installerId: siteVisits.installerId,
              activeJobs: sql<number>`COUNT(DISTINCT ${siteVisits.projectId})`,
            })
            .from(siteVisits)
            .where(
              and(
                inArray(siteVisits.installerId, installerIds),
                eq(siteVisits.organizationId, ctx.organizationId),
                eq(siteVisits.status, 'scheduled'),
                gte(siteVisits.scheduledDate, date)
              )
            )
            .groupBy(siteVisits.installerId)
        : Promise.resolve([]),
    ]);

    // Build lookup maps for efficient access
    const skillsByInstaller = new Map<string, typeof skills>();
    for (const skill of skills) {
      const existing = skillsByInstaller.get(skill.installerId) ?? [];
      existing.push(skill);
      skillsByInstaller.set(skill.installerId, existing);
    }

    const territoriesByInstaller = new Map<string, typeof territories>();
    for (const territory of territories) {
      const existing = territoriesByInstaller.get(territory.installerId) ?? [];
      existing.push(territory);
      territoriesByInstaller.set(territory.installerId, existing);
    }

    const certsByInstaller = new Map<string, typeof certifications>();
    for (const cert of certifications) {
      const existing = certsByInstaller.get(cert.installerId) ?? [];
      existing.push(cert);
      certsByInstaller.set(cert.installerId, existing);
    }
    const workloadByInstaller = new Map(
      workloadData.map((w) => [w.installerId, Number(w.activeJobs ?? 0)])
    );

    // Define scoring weights
    const weights = {
      requiredSkill: 10,
      preferredSkill: 5,
      territoryPriority: 2,
      experience: 0.5,
      workload: 2,
    };

    // Calculate max possible score for normalization
    const maxPossibleScore =
      (requiredSkills?.length ?? 0) * weights.requiredSkill +
      (preferredSkills?.length ?? 0) * weights.preferredSkill +
      5 * weights.territoryPriority + // Max priority is typically 5
      (installers.reduce((max, i) => Math.max(max, i.installer.yearsExperience ?? 0), 0) *
        weights.experience) +
      5 * weights.workload; // Max workload score

    // Score and rank installers
    const scoredInstallers = installers
      .map(({ installer, user }) => {
        const installerSkills = skillsByInstaller.get(installer.id) ?? [];
        const installerTerritories = territoriesByInstaller.get(installer.id) ?? [];
        const installerCerts = certsByInstaller.get(installer.id) ?? [];
        const activeJobs = workloadByInstaller.get(installer.id) ?? 0;

        // Filter out installers with expired required certifications
        if (date && requiredSkills && requiredSkills.length > 0) {
          const requiredCertTypes = installerCerts.filter((c: typeof certifications[number]) =>
            requiredSkills.some((skill) => {
              // Map skills to certification types (simplified - may need refinement)
              const skillToCertMap: Record<string, string[]> = {
                solar_panels: ['solar_accredited'],
                electrical_work: ['electrical_license'],
                battery_systems: ['battery_certified'],
                roof_work: ['roofing_certified'],
              };
              return skillToCertMap[skill]?.includes(c.certificationType);
            })
          );

          const hasExpiredRequiredCert = requiredCertTypes.some(
            (c: typeof certifications[number]) => c.expiryDate && new Date(c.expiryDate) < new Date(date)
          );

          if (hasExpiredRequiredCert) {
            return null; // Exclude this installer
          }
        }

        let rawScore = 0;
        const reasons: string[] = [];
        const warnings: string[] = [];

        // Score for required skills (all are required, so full points if all present)
        if (requiredSkills && requiredSkills.length > 0) {
          const requiredCount = installerSkills.filter((s: typeof skills[number]) =>
            requiredSkills.includes(s.skill as typeof requiredSkills[number])
          ).length;
          rawScore += requiredCount * weights.requiredSkill;
        }

        // Score for preferred skills (ANY-match, additive)
        if (preferredSkills) {
          const preferredCount = installerSkills.filter((s: typeof skills[number]) =>
            preferredSkills.includes(s.skill as typeof preferredSkills[number])
          ).length;
          rawScore += preferredCount * weights.preferredSkill;
        }

        // Score for territory priority
        const territory = installerTerritories.find((t: typeof territories[number]) => t.postcode === postcode);
        if (territory) {
          rawScore += (territory.priority || 1) * weights.territoryPriority;
          reasons.push('Serves this area');
        }

        // Score for experience
        rawScore += (installer.yearsExperience ?? 0) * weights.experience;

        // Score for workload (real-time active jobs vs capacity)
        // Lower workload = higher score
        // Protect against division by zero (maxJobsPerDay should never be 0, but defensive)
        const maxJobsPerDay = installer.maxJobsPerDay || 1;
        const capacityUsed = activeJobs / maxJobsPerDay;
        const workloadScore = (1 - Math.min(capacityUsed, 1)) * weights.workload * 5; // Scale to max 5
        rawScore += workloadScore;

        // Add capacity warnings
        if (capacityUsed >= 0.8) {
          warnings.push(
            capacityUsed >= 1.0
              ? 'At capacity'
              : `Near capacity (${Math.round(capacityUsed * 100)}% utilized)`
          );
        }

        // Check for certifications expiring within 30 days
        if (date) {
          const thirtyDaysFromDate = new Date(date);
          thirtyDaysFromDate.setDate(thirtyDaysFromDate.getDate() + 30);
          const expiringCerts = installerCerts.filter(
            (c: typeof certifications[number]) =>
              c.expiryDate &&
              new Date(c.expiryDate) >= new Date(date) &&
              new Date(c.expiryDate) <= thirtyDaysFromDate
          );
          if (expiringCerts.length > 0) {
            warnings.push(
              `${expiringCerts.length} certification(s) expiring within 30 days`
            );
          }
        }

        // Normalize score to 0-100
        const normalizedScore = maxPossibleScore > 0 ? (rawScore / maxPossibleScore) * 100 : 0;

        return {
          installer: { ...installer, user },
          score: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
          rawScore,
          skills: installerSkills,
          territory,
          reasons,
          warnings,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null); // Remove nulls (excluded installers)

    // Sort by score and return top results
    scoredInstallers.sort((a, b) => b.score - a.score);

    return {
      suggestions: scoredInstallers.slice(0, limit).map((s) => ({
        installerId: s.installer.id,
        name: s.installer.user?.name || s.installer.user?.email || 'Unknown',
        score: s.score, // Already normalized to 0-100
        skills: s.skills,
        yearsExperience: s.installer.yearsExperience,
        reasons: s.reasons,
        warnings: s.warnings,
      })),
      totalMatches: scoredInstallers.length,
    };
  });
