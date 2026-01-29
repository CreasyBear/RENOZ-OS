/**
 * Email Templates Server Functions
 *
 * CRUD operations for custom email templates with versioning.
 *
 * @see DOM-COMMS-007
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  emailTemplates,
  emailTemplateVersions,
} from '../../../../drizzle/schema/communications'
import {
  createTemplateSchema,
  updateTemplateSchema,
  getTemplatesSchema,
  getTemplateSchema,
  deleteTemplateSchema,
  cloneTemplateSchema,
  getVersionHistorySchema,
  restoreVersionSchema,
  type TemplateVariable,
} from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new email template
 */
export const createEmailTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    const [template] = await db
      .insert(emailTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        category: data.category,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        variables: data.variables as TemplateVariable[],
        isActive: true,
        version: 1,
        createdBy: ctx.user.id,
      })
      .returning()

    // Create initial version
    await db.insert(emailTemplateVersions).values({
      organizationId: ctx.organizationId,
      templateId: template.id,
      version: 1,
      name: template.name,
      description: template.description,
      category: template.category,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      variables: template.variables,
      createdBy: ctx.user.id,
    })

    return template
  })

/**
 * Get all templates for the organization
 */
export const getEmailTemplates = createServerFn({ method: 'GET' })
  .inputValidator(getTemplatesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read })

    const conditions = [eq(emailTemplates.organizationId, ctx.organizationId)]

    if (data.category) {
      conditions.push(eq(emailTemplates.category, data.category))
    }

    if (data.activeOnly) {
      conditions.push(eq(emailTemplates.isActive, true))
    }

    const results = await db
      .select()
      .from(emailTemplates)
      .where(and(...conditions))
      .orderBy(desc(emailTemplates.updatedAt))

    return results
  })

/**
 * Get a single template by ID
 */
export const getEmailTemplate = createServerFn({ method: 'GET' })
  .inputValidator(getTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read })

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    return template ?? null
  })

/**
 * Update an email template
 */
export const updateEmailTemplate = createServerFn({ method: 'POST' })
  .inputValidator(updateTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new Error('Template not found')
    }

    const updateData = {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      category: data.category ?? existing.category,
      subject: data.subject ?? existing.subject,
      bodyHtml: data.bodyHtml ?? existing.bodyHtml,
      variables: (data.variables ?? existing.variables) as TemplateVariable[],
      isActive: data.isActive ?? existing.isActive,
      version: data.createVersion ? existing.version + 1 : existing.version,
      updatedBy: ctx.user.id,
    }

    const [updated] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, data.id))
      .returning()

    if (data.createVersion) {
      await db.insert(emailTemplateVersions).values({
        organizationId: ctx.organizationId,
        templateId: updated.id,
        version: updated.version,
        name: updated.name,
        description: updated.description,
        category: updated.category,
        subject: updated.subject,
        bodyHtml: updated.bodyHtml,
        variables: updated.variables,
        createdBy: ctx.user.id,
      })
    }

    return updated
  })

/**
 * Delete an email template
 */
export const deleteEmailTemplate = createServerFn({ method: 'POST' })
  .inputValidator(deleteTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    const [deleted] = await db
      .delete(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId),
        ),
      )
      .returning()

    if (!deleted) {
      throw new Error('Template not found')
    }

    return { success: true }
  })

/**
 * Clone an existing template
 */
export const cloneEmailTemplate = createServerFn({ method: 'POST' })
  .inputValidator(cloneTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!template) {
      throw new Error('Template not found')
    }

    const [cloned] = await db
      .insert(emailTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.newName,
        description: template.description,
        category: template.category,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        variables: template.variables as TemplateVariable[],
        isActive: template.isActive,
        version: 1,
        createdBy: ctx.user.id,
      })
      .returning()

    // Create initial version for clone
    await db.insert(emailTemplateVersions).values({
      organizationId: ctx.organizationId,
      templateId: cloned.id,
      version: 1,
      name: cloned.name,
      description: cloned.description,
      category: cloned.category,
      subject: cloned.subject,
      bodyHtml: cloned.bodyHtml,
      variables: cloned.variables,
      createdBy: ctx.user.id,
    })

    return cloned
  })

/**
 * Get version history for a template
 */
export const getTemplateVersionHistory = createServerFn({ method: 'GET' })
  .inputValidator(getVersionHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read })

    const results = await db
      .select()
      .from(emailTemplateVersions)
      .where(
        and(
          eq(emailTemplateVersions.templateId, data.templateId),
          eq(emailTemplateVersions.organizationId, ctx.organizationId),
        ),
      )
      .orderBy(desc(emailTemplateVersions.createdAt))

    return results
  })

/**
 * Restore a previous template version
 */
export const restoreTemplateVersion = createServerFn({ method: 'POST' })
  .inputValidator(restoreVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    const [version] = await db
      .select()
      .from(emailTemplateVersions)
      .where(
        and(
          eq(emailTemplateVersions.id, data.versionId),
          eq(emailTemplateVersions.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!version) {
      throw new Error('Version not found')
    }

    const [updated] = await db
      .update(emailTemplates)
      .set({
        name: version.name,
        description: version.description,
        category: version.category,
        subject: version.subject,
        bodyHtml: version.bodyHtml,
        variables: version.variables as TemplateVariable[],
        version: version.version,
        updatedBy: ctx.user.id,
      })
      .where(eq(emailTemplates.id, version.templateId))
      .returning()

    return updated
  })

/**
 * Substitute template variables in a string
 */
export function substituteTemplateVariables(
  content: string,
  variables: Record<string, unknown>,
): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, path) => {
    const value = resolveTemplateValue(variables, path)
    return value == null ? '' : String(value)
  })
}

function resolveTemplateValue(variables: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = variables

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Get sample template data for previews
 */
export function getSampleTemplateData() {
  return {
    customer: {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      phone: '+61 400 000 000',
    },
    order: {
      number: 'ORD-1234',
      total: '$1,250.00',
      status: 'Confirmed',
      dueDate: '2026-02-15',
    },
    company: {
      name: 'Renoz',
      email: 'support@renoz.com',
      phone: '+61 2 1234 5678',
    },
  }
}
