/**
 * Job Templates Server Functions
 *
 * Server-side functions for job template CRUD and job creation from templates.
 * All functions use withAuth for authentication and filter by organizationId.
 *
 * @see src/lib/schemas/job-templates.ts for validation schemas
 * @see drizzle/schema/job-templates.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-007b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, inArray, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  jobTemplates,
  jobAssignments,
  jobTasks,
  jobMaterials,
  jobChecklists,
  jobChecklistItems,
  checklistTemplates,
  products,
  customers,
  users,
  slaConfigurations,
  slaTracking,
  type JobTemplateTask,
  type JobTemplateBOMItem,
  type ChecklistTemplateItem,
} from '@/../drizzle/schema';
import {
  listJobTemplatesSchema,
  createJobTemplateSchema,
  updateJobTemplateSchema,
  deleteJobTemplateSchema,
  getJobTemplateSchema,
  createJobFromTemplateSchema,
  type JobTemplateResponse,
  type ListJobTemplatesResponse,
  type CreateJobFromTemplateResponse,
} from '@/lib/schemas';
import { calendarExportSchema } from '@/lib/schemas/jobs/job-templates';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique job number.
 * Format: JOB-YYYYMMDD-XXXX (where XXXX is random hex)
 */
function generateJobNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `JOB-${datePart}-${randomPart}`;
}

/**
 * Verify template belongs to the user's organization.
 */
async function verifyTemplateAccess(templateId: string, organizationId: string) {
  const [template] = await db
    .select({
      id: jobTemplates.id,
      name: jobTemplates.name,
      description: jobTemplates.description,
      checklistTemplateId: jobTemplates.checklistTemplateId,
      slaConfigurationId: jobTemplates.slaConfigurationId,
      defaultTasks: jobTemplates.defaultTasks,
      defaultBOM: jobTemplates.defaultBOM,
      estimatedDuration: jobTemplates.estimatedDuration,
    })
    .from(jobTemplates)
    .where(and(eq(jobTemplates.id, templateId), eq(jobTemplates.organizationId, organizationId)))
    .limit(1);

  if (!template) {
    throw new NotFoundError('Job template not found');
  }

  return template;
}

/**
 * Transform template row to response.
 */
function toTemplateResponse(row: {
  id: string;
  name: string;
  description: string | null;
  defaultTasks: JobTemplateTask[];
  defaultBOM: JobTemplateBOMItem[];
  checklistTemplateId: string | null;
  checklistTemplateName?: string | null;
  estimatedDuration: number;
  slaConfigurationId: string | null;
  slaConfigurationName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}): JobTemplateResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    defaultTasks: row.defaultTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      position: task.position,
    })),
    defaultBOM: row.defaultBOM.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantityRequired: item.quantityRequired,
      notes: item.notes,
    })),
    checklistTemplateId: row.checklistTemplateId,
    checklistTemplateName: row.checklistTemplateName ?? null,
    estimatedDuration: row.estimatedDuration,
    slaConfigurationId: row.slaConfigurationId,
    slaConfigurationName: row.slaConfigurationName ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

// ============================================================================
// LIST JOB TEMPLATES
// ============================================================================

/**
 * Get all job templates for the organization.
 */
export const listJobTemplates = createServerFn({ method: 'GET' })
  .inputValidator(listJobTemplatesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Build conditions
    const conditions = [eq(jobTemplates.organizationId, ctx.organizationId)];

    if (!data.includeInactive) {
      conditions.push(eq(jobTemplates.isActive, true));
    }

    // Query templates with related names
    const templates = await db
      .select({
        id: jobTemplates.id,
        name: jobTemplates.name,
        description: jobTemplates.description,
        defaultTasks: jobTemplates.defaultTasks,
        defaultBOM: jobTemplates.defaultBOM,
        checklistTemplateId: jobTemplates.checklistTemplateId,
        checklistTemplateName: checklistTemplates.name,
        estimatedDuration: jobTemplates.estimatedDuration,
        slaConfigurationId: jobTemplates.slaConfigurationId,
        slaConfigurationName: slaConfigurations.name,
        isActive: jobTemplates.isActive,
        createdAt: jobTemplates.createdAt,
        updatedAt: jobTemplates.updatedAt,
        createdBy: jobTemplates.createdBy,
        updatedBy: jobTemplates.updatedBy,
      })
      .from(jobTemplates)
      .leftJoin(checklistTemplates, eq(jobTemplates.checklistTemplateId, checklistTemplates.id))
      .leftJoin(slaConfigurations, eq(jobTemplates.slaConfigurationId, slaConfigurations.id))
      .where(and(...conditions))
      .orderBy(jobTemplates.name);

    return {
      templates: templates.map(toTemplateResponse),
      total: templates.length,
    } satisfies ListJobTemplatesResponse;
  });

// ============================================================================
// GET JOB TEMPLATE
// ============================================================================

/**
 * Get a single job template by ID.
 */
export const getJobTemplate = createServerFn({ method: 'GET' })
  .inputValidator(getJobTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [template] = await db
      .select({
        id: jobTemplates.id,
        name: jobTemplates.name,
        description: jobTemplates.description,
        defaultTasks: jobTemplates.defaultTasks,
        defaultBOM: jobTemplates.defaultBOM,
        checklistTemplateId: jobTemplates.checklistTemplateId,
        checklistTemplateName: checklistTemplates.name,
        estimatedDuration: jobTemplates.estimatedDuration,
        slaConfigurationId: jobTemplates.slaConfigurationId,
        slaConfigurationName: slaConfigurations.name,
        isActive: jobTemplates.isActive,
        createdAt: jobTemplates.createdAt,
        updatedAt: jobTemplates.updatedAt,
        createdBy: jobTemplates.createdBy,
        updatedBy: jobTemplates.updatedBy,
      })
      .from(jobTemplates)
      .leftJoin(checklistTemplates, eq(jobTemplates.checklistTemplateId, checklistTemplates.id))
      .leftJoin(slaConfigurations, eq(jobTemplates.slaConfigurationId, slaConfigurations.id))
      .where(
        and(
          eq(jobTemplates.id, data.templateId),
          eq(jobTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Job template not found');
    }

    return { template: toTemplateResponse(template) };
  });

// ============================================================================
// CREATE JOB TEMPLATE
// ============================================================================

/**
 * Create a new job template.
 */
export const createJobTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createJobTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate checklist template exists if provided
    if (data.checklistTemplateId) {
      const [checklist] = await db
        .select({ id: checklistTemplates.id })
        .from(checklistTemplates)
        .where(
          and(
            eq(checklistTemplates.id, data.checklistTemplateId),
            eq(checklistTemplates.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!checklist) {
        throw new ValidationError('Checklist template not found');
      }
    }

    // Validate SLA configuration exists if provided
    if (data.slaConfigurationId) {
      const [slaConfig] = await db
        .select({ id: slaConfigurations.id })
        .from(slaConfigurations)
        .where(
          and(
            eq(slaConfigurations.id, data.slaConfigurationId),
            eq(slaConfigurations.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!slaConfig) {
        throw new ValidationError('SLA configuration not found');
      }
    }

    // Validate products in BOM exist
    if (data.defaultBOM.length > 0) {
      const productIds = data.defaultBOM.map((item) => item.productId);
      const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            sql`${products.id} = ANY(${productIds})`,
            eq(products.organizationId, ctx.organizationId)
          )
        );

      if (existingProducts.length !== productIds.length) {
        throw new ValidationError('One or more products in BOM not found');
      }
    }

    // Create template
    const [newTemplate] = await db
      .insert(jobTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description ?? null,
        defaultTasks: data.defaultTasks,
        defaultBOM: data.defaultBOM,
        checklistTemplateId: data.checklistTemplateId ?? null,
        estimatedDuration: data.estimatedDuration,
        slaConfigurationId: data.slaConfigurationId ?? null,
        isActive: data.isActive,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { template: toTemplateResponse(newTemplate as any) };
  });

// ============================================================================
// UPDATE JOB TEMPLATE
// ============================================================================

/**
 * Update an existing job template.
 */
export const updateJobTemplate = createServerFn({ method: 'POST' })
  .inputValidator(updateJobTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify template exists
    await verifyTemplateAccess(data.templateId, ctx.organizationId);

    // Validate checklist template if being updated
    if (data.checklistTemplateId !== undefined && data.checklistTemplateId !== null) {
      const [checklist] = await db
        .select({ id: checklistTemplates.id })
        .from(checklistTemplates)
        .where(
          and(
            eq(checklistTemplates.id, data.checklistTemplateId),
            eq(checklistTemplates.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!checklist) {
        throw new ValidationError('Checklist template not found');
      }
    }

    // Validate SLA configuration if being updated
    if (data.slaConfigurationId !== undefined && data.slaConfigurationId !== null) {
      const [slaConfig] = await db
        .select({ id: slaConfigurations.id })
        .from(slaConfigurations)
        .where(
          and(
            eq(slaConfigurations.id, data.slaConfigurationId),
            eq(slaConfigurations.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!slaConfig) {
        throw new ValidationError('SLA configuration not found');
      }
    }

    // Validate products in BOM if being updated
    if (data.defaultBOM && data.defaultBOM.length > 0) {
      const productIds = data.defaultBOM.map((item) => item.productId);
      const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            sql`${products.id} = ANY(${productIds})`,
            eq(products.organizationId, ctx.organizationId)
          )
        );

      if (existingProducts.length !== productIds.length) {
        throw new ValidationError('One or more products in BOM not found');
      }
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
    };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.defaultTasks !== undefined) updateValues.defaultTasks = data.defaultTasks;
    if (data.defaultBOM !== undefined) updateValues.defaultBOM = data.defaultBOM;
    if (data.checklistTemplateId !== undefined)
      updateValues.checklistTemplateId = data.checklistTemplateId;
    if (data.estimatedDuration !== undefined)
      updateValues.estimatedDuration = data.estimatedDuration;
    if (data.slaConfigurationId !== undefined)
      updateValues.slaConfigurationId = data.slaConfigurationId;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;

    // Update template
    const [updatedTemplate] = await db
      .update(jobTemplates)
      .set(updateValues)
      .where(eq(jobTemplates.id, data.templateId))
      .returning();

    return { template: toTemplateResponse(updatedTemplate as any) };
  });

// ============================================================================
// DELETE JOB TEMPLATE
// ============================================================================

/**
 * Soft-delete a job template by marking it inactive.
 */
export const deleteJobTemplate = createServerFn({ method: 'POST' })
  .inputValidator(deleteJobTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify template exists
    await verifyTemplateAccess(data.templateId, ctx.organizationId);

    // Soft delete by marking inactive
    await db
      .update(jobTemplates)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(jobTemplates.id, data.templateId));

    return { success: true };
  });

// ============================================================================
// CREATE JOB FROM TEMPLATE
// ============================================================================

/**
 * Create a new job assignment from a template.
 * This creates the job and populates tasks, materials, and checklist from the template.
 * If the template has an SLA configuration, SLA tracking is started.
 */
export const createJobFromTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createJobFromTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify template exists and get its config
    const template = await verifyTemplateAccess(data.templateId, ctx.organizationId);

    // Verify customer exists
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(eq(customers.id, data.customerId), eq(customers.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!customer) {
      throw new ValidationError('Customer not found');
    }

    // Verify installer exists
    const [installer] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, data.installerId), eq(users.organizationId, ctx.organizationId)))
      .limit(1);

    if (!installer) {
      throw new ValidationError('Installer not found');
    }

    // Generate unique job number
    const jobNumber = generateJobNumber();

    // Start SLA tracking if template has SLA configuration
    let slaTrackingId: string | null = null;

    if (template.slaConfigurationId) {
      // Create SLA tracking record
      const [slaRecord] = await db
        .insert(slaTracking)
        .values({
          organizationId: ctx.organizationId,
          domain: 'jobs',
          entityType: 'job_assignment',
          entityId: jobNumber, // Will update after job creation
          slaConfigurationId: template.slaConfigurationId,
          startedAt: new Date(),
          status: 'active',
        })
        .returning();

      slaTrackingId = slaRecord.id;
    }

    // Create job assignment
    const [newJob] = await db
      .insert(jobAssignments)
      .values({
        organizationId: ctx.organizationId,
        customerId: data.customerId,
        installerId: data.installerId,
        orderId: data.orderId ?? null,
        jobNumber,
        title: template.name,
        description: template.description ?? null,
        jobType: 'installation', // Default to installation type
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime ?? null,
        estimatedDuration: template.estimatedDuration,
        status: 'scheduled',
        slaTrackingId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Update SLA tracking with actual job ID
    if (slaTrackingId) {
      await db
        .update(slaTracking)
        .set({ entityId: newJob.id })
        .where(eq(slaTracking.id, slaTrackingId));
    }

    // Create tasks from template
    let tasksCreated = 0;
    if (template.defaultTasks && template.defaultTasks.length > 0) {
      const taskValues = template.defaultTasks.map((task) => ({
        organizationId: ctx.organizationId,
        jobId: newJob.id,
        title: task.title,
        description: task.description ?? null,
        status: 'pending' as const,
        position: task.position,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      }));

      await db.insert(jobTasks).values(taskValues);
      tasksCreated = taskValues.length;
    }

    // Create materials from template BOM
    let materialsAdded = 0;
    if (template.defaultBOM && template.defaultBOM.length > 0) {
      // Get product prices
      const productIds = template.defaultBOM.map((item) => item.productId);
      const productData = await db
        .select({
          id: products.id,
          basePrice: products.basePrice,
        })
        .from(products)
        .where(sql`${products.id} = ANY(${productIds})`);

      const priceMap = new Map(productData.map((p) => [p.id, Number(p.basePrice)]));

      const materialValues = template.defaultBOM.map((item) => ({
        organizationId: ctx.organizationId,
        jobId: newJob.id,
        productId: item.productId,
        quantityRequired: item.quantityRequired,
        quantityUsed: 0,
        unitCost: priceMap.get(item.productId) ?? 0,
        notes: item.notes ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      }));

      await db.insert(jobMaterials).values(materialValues);
      materialsAdded = materialValues.length;
    }

    // Apply checklist from template if configured
    let checklistApplied = false;
    if (template.checklistTemplateId) {
      // Get checklist template
      const [checklistTemplate] = await db
        .select({
          id: checklistTemplates.id,
          name: checklistTemplates.name,
          items: checklistTemplates.items,
        })
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, template.checklistTemplateId))
        .limit(1);

      if (checklistTemplate) {
        // Create job checklist
        const [newChecklist] = await db
          .insert(jobChecklists)
          .values({
            organizationId: ctx.organizationId,
            jobId: newJob.id,
            templateId: checklistTemplate.id,
            templateName: checklistTemplate.name,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        // Create checklist items
        if (checklistTemplate.items && checklistTemplate.items.length > 0) {
          const items = checklistTemplate.items as ChecklistTemplateItem[];
          const itemValues = items.map((item) => ({
            organizationId: ctx.organizationId,
            checklistId: newChecklist.id,
            itemText: item.text,
            itemDescription: item.description ?? null,
            requiresPhoto: item.requiresPhoto ?? false,
            position: item.position,
            isCompleted: false,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          }));

          await db.insert(jobChecklistItems).values(itemValues);
        }

        checklistApplied = true;
      }
    }

    return {
      success: true,
      jobId: newJob.id,
      jobNumber: newJob.jobNumber,
      tasksCreated,
      materialsAdded,
      checklistApplied,
      slaTrackingId,
    } satisfies CreateJobFromTemplateResponse;
  });

// ============================================================================
// CALENDAR EXPORT
// ============================================================================

/**
 * Export calendar data in various formats (ICS, CSV, JSON)
 */
export const exportCalendarData = createServerFn({ method: 'POST' })
  .inputValidator(calendarExportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get calendar data
    const conditions = [
      eq(jobAssignments.organizationId, ctx.organizationId),
      gte(jobAssignments.scheduledDate, data.startDate),
      lte(jobAssignments.scheduledDate, data.endDate),
    ];

    if (data.installerIds?.length) {
      conditions.push(inArray(jobAssignments.installerId, data.installerIds));
    }

    if (data.statuses?.length) {
      conditions.push(inArray(jobAssignments.status, data.statuses));
    }

    const jobs = await db
      .select({
        job: jobAssignments,
        installer: { id: users.id, name: users.name, email: users.email },
        customer: { id: customers.id, name: customers.name },
      })
      .from(jobAssignments)
      .innerJoin(users, eq(jobAssignments.installerId, users.id))
      .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
      .where(and(...conditions));

    // Format based on export type
    if (data.format === 'ics') {
      const icsContent = generateICSCalendar(jobs, data);
      return {
        content: icsContent,
        filename: `jobs-calendar-${data.startDate}-to-${data.endDate}.ics`,
        mimeType: 'text/calendar',
      };
    } else if (data.format === 'csv') {
      const csvContent = generateCSVCalendar(jobs, data);
      return {
        content: csvContent,
        filename: `jobs-calendar-${data.startDate}-to-${data.endDate}.csv`,
        mimeType: 'text/csv',
      };
    } else {
      // JSON format
      const jsonContent = JSON.stringify(jobs, null, 2);
      return {
        content: jsonContent,
        filename: `jobs-calendar-${data.startDate}-to-${data.endDate}.json`,
        mimeType: 'application/json',
      };
    }
  });

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Generate ICS calendar format
 */
function generateICSCalendar(jobs: any[], _config: any): string {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jobs Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];

  jobs.forEach((row) => {
    const job = row.job;
    const startDate = new Date(job.scheduledDate);
    if (job.scheduledTime) {
      const [hours, minutes] = job.scheduledTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
    }

    const duration = job.estimatedDuration ?? 120;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${job.id}@jobs-calendar`,
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${job.title}`,
      `DESCRIPTION:${job.description || ''}`,
      `LOCATION:${row.customer.name}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

/**
 * Generate CSV calendar format
 */
function generateCSVCalendar(jobs: any[], _config: any): string {
  const headers = [
    'Date',
    'Time',
    'Job Number',
    'Title',
    'Customer',
    'Technician',
    'Status',
    'Duration (hours)',
    'Priority',
  ];

  const rows = jobs.map((row) => {
    const job = row.job;
    return [
      job.scheduledDate,
      job.scheduledTime || '',
      job.jobNumber,
      `"${job.title}"`,
      `"${row.customer.name}"`,
      `"${row.installer.name || row.installer.email}"`,
      job.status,
      ((job.estimatedDuration ?? 120) / 60).toFixed(1),
      job.priority || 'medium',
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
