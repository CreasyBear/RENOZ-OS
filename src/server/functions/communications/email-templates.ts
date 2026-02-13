/**
 * Email Templates Server Functions
 *
 * CRUD operations for custom email templates with versioning.
 *
 * @see DOM-COMMS-007
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
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
  templateVariableSchema,
} from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NotFoundError } from '@/lib/server/errors'

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

    // Wrap template INSERT + version INSERT in transaction for atomicity
    const template = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(emailTemplates)
        .values({
          organizationId: ctx.organizationId,
          name: data.name,
          description: data.description,
          category: data.category,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          variables: data.variables, // Zod schema validates array of TemplateVariable
          isActive: true,
          version: 1,
          createdBy: ctx.user.id,
        })
        .returning()

      // Create initial version
      await tx.insert(emailTemplateVersions).values({
        organizationId: ctx.organizationId,
        templateId: created.id,
        version: 1,
        name: created.name,
        description: created.description,
        category: created.category,
        subject: created.subject,
        bodyHtml: created.bodyHtml,
        variables: created.variables,
        createdBy: ctx.user.id,
      })

      return created
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
      .limit(100)

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

    // Wrap SELECT + UPDATE + version INSERT in transaction for atomicity
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
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
        throw new NotFoundError('Template not found', 'email_template')
      }

      const updatePayload = {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        category: data.category ?? existing.category,
        subject: data.subject ?? existing.subject,
        bodyHtml: data.bodyHtml ?? existing.bodyHtml,
        // Parse JSONB variables with Zod schema per SCHEMA-TRACE.md
        // If updating, use new variables; otherwise parse existing from DB
        variables: data.variables
          ? data.variables // Already validated by Zod input schema
          : z.array(templateVariableSchema).parse(existing.variables),
        isActive: data.isActive ?? existing.isActive,
        version: data.createVersion ? existing.version + 1 : existing.version,
        updatedBy: ctx.user.id,
      }

      // C06: Add orgId to UPDATE WHERE for tenant isolation
      const [result] = await tx
        .update(emailTemplates)
        .set(updatePayload)
        .where(
          and(
            eq(emailTemplates.id, data.id),
            eq(emailTemplates.organizationId, ctx.organizationId),
          ),
        )
        .returning()

      if (data.createVersion) {
        await tx.insert(emailTemplateVersions).values({
          organizationId: ctx.organizationId,
          templateId: result.id,
          version: result.version,
          name: result.name,
          description: result.description,
          category: result.category,
          subject: result.subject,
          bodyHtml: result.bodyHtml,
          variables: result.variables,
          createdBy: ctx.user.id,
        })
      }

      return result
    })

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
      throw new NotFoundError('Template not found', 'email_template')
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

    // Wrap SELECT + INSERT + version INSERT in transaction for atomicity
    const cloned = await db.transaction(async (tx) => {
      const [template] = await tx
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
        throw new NotFoundError('Template not found', 'email_template')
      }

      const [result] = await tx
        .insert(emailTemplates)
        .values({
          organizationId: ctx.organizationId,
          name: data.newName,
          description: template.description,
          category: template.category,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          // Parse JSONB variables with Zod schema per SCHEMA-TRACE.md
          variables: z.array(templateVariableSchema).parse(template.variables),
          isActive: template.isActive,
          version: 1,
          createdBy: ctx.user.id,
        })
        .returning()

      // Create initial version for clone
      await tx.insert(emailTemplateVersions).values({
        organizationId: ctx.organizationId,
        templateId: result.id,
        version: 1,
        name: result.name,
        description: result.description,
        category: result.category,
        subject: result.subject,
        bodyHtml: result.bodyHtml,
        variables: result.variables,
        createdBy: ctx.user.id,
      })

      return result
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
      .limit(50)

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
      throw new NotFoundError('Version not found', 'email_template_version')
    }

    // C05: Add orgId to UPDATE WHERE for tenant isolation
    const [updated] = await db
      .update(emailTemplates)
      .set({
        name: version.name,
        description: version.description,
        category: version.category,
        subject: version.subject,
        bodyHtml: version.bodyHtml,
        // Parse JSONB variables with Zod schema per SCHEMA-TRACE.md
        variables: z.array(templateVariableSchema).parse(version.variables),
        version: version.version,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(emailTemplates.id, version.templateId),
          eq(emailTemplates.organizationId, ctx.organizationId),
        ),
      )
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
