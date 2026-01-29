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
import {
  installerListQuerySchema,
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
    const conditions = [eq(installerProfiles.organizationId, ctx.organizationId)];

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
      .select({ count: sql<number>`count(*)` })
      .from(installerProfiles)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Build order by
    const orderColumn =
      sortBy === 'status'
        ? installerProfiles.status
        : sortBy === 'yearsExperience'
          ? installerProfiles.yearsExperience
          : sortBy === 'createdAt'
            ? installerProfiles.createdAt
            : installerProfiles.createdAt; // Default
    const orderDirection = sortOrder === 'asc' ? asc : desc;

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
      .orderBy(orderDirection(orderColumn))
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
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (!installerResult) {
      throw new Error('Installer not found');
    }

    // Get certifications
    const certifications = await db
      .select()
      .from(installerCertifications)
      .where(eq(installerCertifications.installerId, data.id))
      .orderBy(desc(installerCertifications.expiryDate));

    // Get skills
    const skills = await db
      .select()
      .from(installerSkills)
      .where(eq(installerSkills.installerId, data.id))
      .orderBy(desc(installerSkills.proficiencyLevel));

    // Get territories
    const territories = await db
      .select()
      .from(installerTerritories)
      .where(eq(installerTerritories.installerId, data.id))
      .orderBy(asc(installerTerritories.priority));

    // Get upcoming blockouts
    const today = new Date().toISOString().split('T')[0];
    const blockouts = await db
      .select()
      .from(installerBlockouts)
      .where(
        and(
          eq(installerBlockouts.installerId, data.id),
          gte(installerBlockouts.endDate, today)
        )
      )
      .orderBy(asc(installerBlockouts.startDate));

    return {
      ...installerResult.installer,
      user: installerResult.user,
      certifications,
      skills,
      territories,
      blockouts,
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
      throw new Error('User not found in organization');
    }

    // Check if profile already exists
    const [existing] = await db
      .select({ id: installerProfiles.id })
      .from(installerProfiles)
      .where(
        and(
          eq(installerProfiles.userId, data.userId),
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (existing) {
      throw new Error('Installer profile already exists for this user');
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
      throw new Error('Installer not found');
    }

    return profile;
  });

/**
 * Delete installer profile (soft delete by setting status to inactive)
 */
export const deleteInstallerProfile = createServerFn({ method: 'POST' })
  .inputValidator(installerIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [profile] = await db
      .update(installerProfiles)
      .set({
        status: 'inactive',
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(installerProfiles.id, data.id),
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!profile) {
      throw new Error('Installer not found');
    }

    return { success: true };
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
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (!installer) {
      throw new Error('Installer not found');
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
      throw new Error('Certification not found');
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
      throw new Error('Certification not found');
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
      throw new Error('Certification not found');
    }

    return { success: true };
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
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (!installer) {
      throw new Error('Installer not found');
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
      throw new Error('Skill not found');
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
      throw new Error('Skill not found');
    }

    return { success: true };
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
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (!installer) {
      throw new Error('Installer not found');
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
      throw new Error('Territory not found');
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
      throw new Error('Territory not found');
    }

    return { success: true };
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
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (!installer) {
      throw new Error('Installer not found');
    }

    const [blockout] = await db
      .insert(installerBlockouts)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return blockout;
  });

export const updateBlockout = createServerFn({ method: 'POST' })
  .inputValidator(updateBlockoutSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updateData } = data;

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

    if (!blockout) {
      throw new Error('Blockout not found');
    }

    return blockout;
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
      throw new Error('Blockout not found');
    }

    return { success: true };
  });

// ============================================================================
// AVAILABILITY & SUGGESTIONS
// ============================================================================

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
          eq(installerProfiles.organizationId, ctx.organizationId)
        )
      );

    if (!installer) {
      throw new Error('Installer not found');
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
        count: sql<number>`count(*)`,
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

    // Get active projects count
    const [activeProjectsResult] = await db
      .select({ count: sql<number>`count(distinct ${siteVisits.projectId})` })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.installerId, data.id),
          eq(siteVisits.organizationId, ctx.organizationId),
          eq(siteVisits.status, 'scheduled'),
          gte(siteVisits.scheduledDate, today)
        )
      );

    // Get upcoming visits count
    const [upcomingVisitsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.installerId, data.id),
          eq(siteVisits.organizationId, ctx.organizationId),
          eq(siteVisits.status, 'scheduled'),
          gte(siteVisits.scheduledDate, today)
        )
      );

    // Get this week's visits
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const [weekVisitsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.installerId, data.id),
          eq(siteVisits.organizationId, ctx.organizationId),
          eq(siteVisits.status, 'scheduled'),
          gte(siteVisits.scheduledDate, today),
          lte(siteVisits.scheduledDate, weekEnd.toISOString().split('T')[0])
        )
      );

    return {
      installerId: data.id,
      activeProjects: activeProjectsResult?.count ?? 0,
      upcomingVisits: upcomingVisitsResult?.count ?? 0,
      thisWeekVisits: weekVisitsResult?.count ?? 0,
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

    // Base conditions: active installers in organization
    const conditions = [
      eq(installerProfiles.organizationId, ctx.organizationId),
      eq(installerProfiles.status, 'active'),
    ];

    // Filter by territory (postcode)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${installerTerritories}
        WHERE ${installerTerritories.installerId} = ${installerProfiles.id}
        AND ${installerTerritories.postcode} = ${postcode}
      )`
    );

    // Filter by required skills
    if (requiredSkills && requiredSkills.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${installerSkills}
          WHERE ${installerSkills.installerId} = ${installerProfiles.id}
          AND ${inArray(installerSkills.skill, requiredSkills)}
        )`
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

    // Get skills and territories for scoring
    const installerIds = installers.map((i) => i.installer.id);

    const skills = await db
      .select()
      .from(installerSkills)
      .where(inArray(installerSkills.installerId, installerIds));

    const territories = await db
      .select()
      .from(installerTerritories)
      .where(inArray(installerTerritories.installerId, installerIds));

    // Score and rank installers
    const scoredInstallers = installers.map(({ installer, user }) => {
      const installerSkills = skills.filter((s) => s.installerId === installer.id);
      const installerTerritories = territories.filter((t) => t.installerId === installer.id);

      let score = 0;
      const reasons: string[] = [];

      // Score for required skills
      if (requiredSkills) {
        const requiredCount = installerSkills.filter((s) =>
          requiredSkills.includes(s.skill as typeof requiredSkills[number])
        ).length;
        score += requiredCount * 10;
      }

      // Score for preferred skills
      if (preferredSkills) {
        const preferredCount = installerSkills.filter((s) =>
          preferredSkills.includes(s.skill as typeof preferredSkills[number])
        ).length;
        score += preferredCount * 5;
      }

      // Score for territory priority
      const territory = installerTerritories.find((t) => t.postcode === postcode);
      if (territory) {
        score += (territory.priority || 1) * 2;
        reasons.push('Serves this area');
      }

      // Score for experience
      score += (installer.yearsExperience ?? 0) * 0.5;

      // Score for lower workload (prefer less busy installers)
      score += (5 - Math.min(installer.maxJobsPerDay, 5)) * 2;

      return {
        installer: { ...installer, user },
        score,
        skills: installerSkills,
        territory,
        reasons,
      };
    });

    // Sort by score and return top results
    scoredInstallers.sort((a, b) => b.score - a.score);

    return {
      suggestions: scoredInstallers.slice(0, limit).map((s) => ({
        installerId: s.installer.id,
        name: s.installer.user?.name || s.installer.user?.email || 'Unknown',
        score: s.score,
        skills: s.skills,
        yearsExperience: s.installer.yearsExperience,
        reasons: s.reasons,
        warnings: [], // TODO: Add warnings for capacity, expired certs, etc.
      })),
      totalMatches: installers.length,
    };
  });
