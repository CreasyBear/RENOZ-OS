/**
 * SPRINT-03: Data Migration Script
 *
 * Transforms legacy job_assignments → projects + site_visits
 *
 * IMPORTANT: Run this AFTER deploying the new schema tables.
 * This script is DESTRUCTIVE - backup your database first!
 *
 * Migration Plan:
 * 1. Create projects from job_assignments (customer, order link)
 * 2. Create site_visits from job_assignments (installer, scheduled date, status)
 * 3. Update job_tasks with site_visit_id references
 * 4. Create default workstreams for each project
 *
 * Prerequisites:
 * - New schema tables must exist (projects, site_visits, project_workstreams, etc.)
 * - job_assignments.migrated_to_project_id column must exist
 *
 * Usage:
 *   DRY_RUN=true bun run scripts/migrate-jobs-to-projects.ts
 *   bun run scripts/migrate-jobs-to-projects.ts
 *
 * @requires DATABASE_URL environment variable
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  projects,
  projectMembers,
  siteVisits,
  siteVisitPhotos,
  projectWorkstreams,
  projectBom,
  jobMaterials,
  jobTimeEntries,
  jobPhotos,
  type ProjectStatus,
  type ProjectType,
  type SiteVisitStatus,
  type SiteVisitType,
} from "../drizzle/schema/jobs";
import { jobAssignments, jobTasks } from "../drizzle/schema/jobs";
import { addresses } from "../drizzle/schema/customers";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.env.DRY_RUN === "true";
const ORG_ID = process.env.ORGANIZATION_ID; // Optional: migrate specific org only
const BATCH_SIZE = 100;

// ============================================================================
// MAPPING CONSTANTS
// ============================================================================

/**
 * Maps legacy job assignment status to project status
 */
const jobStatusToProjectStatus: Record<string, ProjectStatus> = {
  scheduled: "quoting",
  "in-progress": "in_progress",
  completed: "completed",
  cancelled: "cancelled",
  "on-hold": "on_hold",
};

/**
 * Maps legacy job assignment status to site visit status
 */
const jobStatusToVisitStatus: Record<string, SiteVisitStatus> = {
  scheduled: "scheduled",
  "in-progress": "in_progress",
  completed: "completed",
  cancelled: "cancelled",
  "on-hold": "rescheduled",
};

/**
 * Maps legacy job type to project type
 */
const jobTypeToProjectType: Record<string, ProjectType> = {
  installation: "solar_battery",
  service: "service",
  warranty: "warranty",
  inspection: "inspection",
  commissioning: "commissioning",
};

/**
 * Maps legacy job type to site visit type
 */
const jobTypeToVisitType: Record<string, SiteVisitType> = {
  installation: "installation",
  service: "service",
  warranty: "warranty",
  inspection: "inspection",
  commissioning: "commissioning",
};

/**
 * Default workstreams for new projects
 */
const DEFAULT_WORKSTREAMS = [
  { name: "Site Assessment", description: "Initial site evaluation and measurements", position: 0 },
  { name: "Pre-Installation", description: "Permits, materials, and preparation", position: 1 },
  { name: "Installation", description: "Physical installation work", position: 2 },
  { name: "Commissioning", description: "System testing and activation", position: 3 },
  { name: "Handover", description: "Customer training and documentation", position: 4 },
];

// ============================================================================
// TYPES
// ============================================================================

interface JobToMigrate {
  id: string;
  organizationId: string;
  jobNumber: string;
  customerId: string;
  orderId: string | null;
  title: string;
  description: string | null;
  jobType: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedDuration: number | null;
  installerId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

interface MigrationStats {
  projectsCreated: number;
  siteVisitsCreated: number;
  workstreamsCreated: number;
  tasksUpdated: number;
  bomsCreated: number;
  materialsUpdated: number;
  timeEntriesUpdated: number;
  photosMigrated: number;
  errors: Array<{ jobId: string; error: string }>;
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

async function getJobsToMigrate(
  db: ReturnType<typeof drizzle>,
  batchSize: number,
  offset: number
): Promise<JobToMigrate[]> {
  const baseQuery = db
    .select({
      id: jobAssignments.id,
      organizationId: jobAssignments.organizationId,
      jobNumber: jobAssignments.jobNumber,
      customerId: jobAssignments.customerId,
      orderId: jobAssignments.orderId,
      title: jobAssignments.title,
      description: jobAssignments.description,
      jobType: jobAssignments.jobType,
      status: jobAssignments.status,
      scheduledDate: jobAssignments.scheduledDate,
      scheduledTime: jobAssignments.scheduledTime,
      estimatedDuration: jobAssignments.estimatedDuration,
      installerId: jobAssignments.installerId,
      createdAt: jobAssignments.createdAt,
      updatedAt: jobAssignments.updatedAt,
      createdBy: jobAssignments.createdBy,
      updatedBy: jobAssignments.updatedBy,
    })
    .from(jobAssignments)
    .limit(batchSize)
    .offset(offset);

  const conditions = [isNull(jobAssignments.migratedToProjectId)];
  if (ORG_ID) {
    conditions.push(eq(jobAssignments.organizationId, ORG_ID));
  }

  return await baseQuery.where(and(...conditions));
}

async function getTotalJobsToMigrate(db: ReturnType<typeof drizzle>): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobAssignments)
    .where(isNull(jobAssignments.migratedToProjectId));

  return result[0]?.count ?? 0;
}

async function getCustomerAddress(
  db: ReturnType<typeof drizzle>,
  customerId: string
): Promise<{ street: string; city: string; state: string; postalCode: string; country: string } | null> {
  const result = await db
    .select({
      street: addresses.street1,
      city: addresses.city,
      state: addresses.state,
      postalCode: addresses.postcode,
      country: addresses.country,
    })
    .from(addresses)
    .where(and(eq(addresses.customerId, customerId), eq(addresses.type, "billing")))
    .orderBy(desc(addresses.isPrimary), desc(addresses.createdAt))
    .limit(1);

  const customer = result[0];
  if (!customer) return null;

  return {
    street: customer.street || "",
    city: customer.city || "",
    state: customer.state || "",
    postalCode: customer.postalCode || "",
    country: customer.country || "Australia",
  };
}

async function migrateSingleJob(
  db: ReturnType<typeof drizzle>,
  job: JobToMigrate,
  stats: MigrationStats
) {
  console.log(`  📝 Migrating job ${job.jobNumber} (${job.id.slice(0, 8)}...)`);

  // Get customer address for site address
  const siteAddress = await getCustomerAddress(db, job.customerId);
  if (!siteAddress) {
    throw new Error(`Customer ${job.customerId} not found`);
  }

  if (DRY_RUN) {
    console.log(`     [DRY RUN] Would create project, site visit, workstreams, BOM`);
    stats.projectsCreated++;
    stats.siteVisitsCreated++;
    stats.workstreamsCreated += DEFAULT_WORKSTREAMS.length;
    stats.bomsCreated++;
    return;
  }

  // 1. Create Project
  const projectResult = await db
    .insert(projects)
    .values({
      organizationId: job.organizationId,
      projectNumber: job.jobNumber.replace(/^JOB/, "PRJ"),
      title: job.title,
      description: job.description,
      projectType: jobTypeToProjectType[job.jobType] || "solar_battery",
      status: jobStatusToProjectStatus[job.status] || "quoting",
      priority: "medium", // Default priority
      customerId: job.customerId,
      orderId: job.orderId,
      siteAddress,
      scope: { inScope: [], outOfScope: [] },
      outcomes: [],
      keyFeatures: { p0: [], p1: [], p2: [] },
      progressPercent: job.status === "completed" ? 100 : job.status === "in_progress" ? 50 : 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      createdBy: job.createdBy,
      updatedBy: job.updatedBy,
    })
    .returning({ id: projects.id });

  const projectId = projectResult[0].id;

  // 2. Create Site Visit
  const siteVisitResult = await db
    .insert(siteVisits)
    .values({
      organizationId: job.organizationId,
      projectId: projectId,
      visitNumber: "V001",
      visitType: jobTypeToVisitType[job.jobType] || "installation",
      status: jobStatusToVisitStatus[job.status] || "scheduled",
      scheduledDate: job.scheduledDate,
      scheduledTime: job.scheduledTime,
      estimatedDuration: job.estimatedDuration,
      installerId: job.installerId,
      notes: job.description,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      createdBy: job.createdBy,
      updatedBy: job.updatedBy,
    })
    .returning({ id: siteVisits.id });

  const siteVisitId = siteVisitResult[0].id;

  // 3. Add installer as project member
  await db
    .insert(projectMembers)
    .values({
      organizationId: job.organizationId,
      projectId: projectId,
      userId: job.installerId,
      role: "member",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })
    .onConflictDoNothing();

  // 4. Create default workstreams
  const workstreamIds: string[] = [];
  for (const ws of DEFAULT_WORKSTREAMS) {
    const wsResult = await db
      .insert(projectWorkstreams)
      .values({
        organizationId: job.organizationId,
        projectId: projectId,
        name: ws.name,
        description: ws.description,
        position: ws.position,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })
      .returning({ id: projectWorkstreams.id });
    workstreamIds.push(wsResult[0].id);
  }

  // 5. Create default BOM
  await db.insert(projectBom).values({
    organizationId: job.organizationId,
    projectId: projectId,
    bomNumber: `${job.jobNumber.replace(/^JOB/, "BOM")}-001`,
    title: `${job.title} - Materials`,
    status: "draft",
    revision: 1,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    createdBy: job.createdBy,
    updatedBy: job.updatedBy,
  });

  // 6. Update job_tasks to link to site_visit, project, and first workstream
  const tasksResult = await db
    .update(jobTasks)
    .set({
      siteVisitId: siteVisitId,
      projectId: projectId,
      workstreamId: workstreamIds[1] || workstreamIds[0],
    })
    .where(eq(jobTasks.jobId, job.id))
    .returning({ id: jobTasks.id });

  // 7. Update job_materials to link to project and first task
  const firstTaskId = tasksResult[0]?.id ?? null;
  const materialsResult = await db
    .update(jobMaterials)
    .set({
      projectId: projectId,
      taskId: firstTaskId,
    })
    .where(eq(jobMaterials.jobId, job.id))
    .returning({ id: jobMaterials.id });

  // 8. Update job_time_entries to link to project and site visit
  const timeEntriesResult = await db
    .update(jobTimeEntries)
    .set({
      projectId: projectId,
      siteVisitId: siteVisitId,
    })
    .where(eq(jobTimeEntries.jobId, job.id))
    .returning({ id: jobTimeEntries.id });

  // 9. Migrate job_photos to site_visit_photos (use first site visit)
  const legacyPhotos = await db
    .select()
    .from(jobPhotos)
    .where(eq(jobPhotos.jobAssignmentId, job.id));

  if (legacyPhotos.length > 0) {
    await db.insert(siteVisitPhotos).values(
      legacyPhotos.map((photo) => ({
        organizationId: photo.organizationId,
        siteVisitId: siteVisitId,
        projectId: projectId,
        type: photo.type,
        photoUrl: photo.photoUrl,
        thumbnailUrl: null,
        caption: photo.caption,
        location: photo.location,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
        createdBy: photo.createdBy,
        updatedBy: photo.updatedBy,
      }))
    );
  }

  // 10. Mark job as migrated
  await db
    .update(jobAssignments)
    .set({
      migratedToProjectId: projectId,
    })
    .where(eq(jobAssignments.id, job.id));

  // Update stats
  stats.projectsCreated++;
  stats.siteVisitsCreated++;
  stats.workstreamsCreated += DEFAULT_WORKSTREAMS.length;
  stats.bomsCreated++;
  stats.tasksUpdated += tasksResult.length;
  stats.materialsUpdated += materialsResult.length;
  stats.timeEntriesUpdated += timeEntriesResult.length;
  stats.photosMigrated += legacyPhotos.length;

  console.log(
    `     ✅ Project ${projectId.slice(0, 8)}..., ` +
    `Visit ${siteVisitId.slice(0, 8)}..., ` +
    `${tasksResult.length} tasks, ${materialsResult.length} materials`
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     SPRINT-03: Jobs to Projects Migration                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (DRY_RUN) {
    console.log("🏃 DRY RUN MODE - No changes will be made\n");
  } else {
    console.log("⚠️  LIVE MODE - Changes will be written to database!\n");
    console.log("Press Ctrl+C within 3 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);

  const stats: MigrationStats = {
    projectsCreated: 0,
    siteVisitsCreated: 0,
    workstreamsCreated: 0,
    tasksUpdated: 0,
    bomsCreated: 0,
    materialsUpdated: 0,
    timeEntriesUpdated: 0,
    photosMigrated: 0,
    errors: [],
  };

  try {
    const totalJobs = await getTotalJobsToMigrate(db);
    console.log(`📋 Found ${totalJobs} jobs to migrate\n`);

    if (totalJobs === 0) {
      console.log("✅ No jobs to migrate");
      return;
    }

    // Process in batches
    let offset = 0;
    let batchNum = 1;
    const totalBatches = Math.ceil(totalJobs / BATCH_SIZE);

    while (offset < totalJobs) {
      const jobs = await getJobsToMigrate(db, BATCH_SIZE, offset);
      if (jobs.length === 0) break;

      console.log(`\n🔄 Processing batch ${batchNum}/${totalBatches} (${jobs.length} jobs)`);

      for (const job of jobs) {
        try {
          await migrateSingleJob(db, job, stats);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Failed to migrate job ${job.id}: ${errorMsg}`);
          stats.errors.push({ jobId: job.id, error: errorMsg });
        }
      }

      offset += jobs.length;
      batchNum++;
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Projects created:     ${stats.projectsCreated}`);
    console.log(`✅ Site visits created:  ${stats.siteVisitsCreated}`);
    console.log(`✅ Workstreams created:  ${stats.workstreamsCreated}`);
    console.log(`✅ BOMs created:         ${stats.bomsCreated}`);
    console.log(`✅ Tasks updated:        ${stats.tasksUpdated}`);
    console.log(`✅ Materials updated:    ${stats.materialsUpdated}`);
    console.log(`✅ Time entries updated: ${stats.timeEntriesUpdated}`);
    console.log(`✅ Photos migrated:      ${stats.photosMigrated}`);
    console.log(`❌ Errors:               ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n⚠️  ERRORS:");
      for (const err of stats.errors.slice(0, 10)) {
        console.log(`   - Job ${err.jobId}: ${err.error}`);
      }
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more`);
      }
    }

    console.log("\n✨ Migration complete!");
  } catch (error) {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
