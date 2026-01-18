/**
 * Email Templates Server Functions
 *
 * CRUD operations for custom email templates with versioning.
 *
 * @see DOM-COMMS-007
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailTemplates, type TemplateVariable } from "../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const templateVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  defaultValue: z.string().optional(),
  type: z.enum(["text", "date", "number", "currency"]).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum([
    "quotes",
    "orders",
    "installations",
    "warranty",
    "support",
    "marketing",
    "follow_up",
    "custom",
  ]),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Body is required"),
  variables: z.array(templateVariableSchema).default([]),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z
    .enum([
      "quotes",
      "orders",
      "installations",
      "warranty",
      "support",
      "marketing",
      "follow_up",
      "custom",
    ])
    .optional(),
  subject: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  variables: z.array(templateVariableSchema).optional(),
  isActive: z.boolean().optional(),
  createVersion: z.boolean().default(false), // If true, creates a new version instead of updating in place
});

const getTemplatesSchema = z.object({
  category: z
    .enum([
      "quotes",
      "orders",
      "installations",
      "warranty",
      "support",
      "marketing",
      "follow_up",
      "custom",
    ])
    .optional(),
  activeOnly: z.boolean().default(true),
});

const getTemplateSchema = z.object({
  id: z.string().uuid(),
});

const deleteTemplateSchema = z.object({
  id: z.string().uuid(),
});

const cloneTemplateSchema = z.object({
  id: z.string().uuid(),
  newName: z.string().min(1, "Name is required"),
});

const getVersionHistorySchema = z.object({
  templateId: z.string().uuid(),
});

const restoreVersionSchema = z.object({
  versionId: z.string().uuid(),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new email template
 */
export const createEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(createTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

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
        version: 1,
        isActive: true,
        createdBy: ctx.user.id,
      })
      .returning();

    return template;
  });

/**
 * Get all templates for the organization
 */
export const getEmailTemplates = createServerFn({ method: "GET" })
  .inputValidator(getTemplatesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });

    // Build conditions array
    const conditions = [
      eq(emailTemplates.organizationId, ctx.organizationId),
      // Only get root templates (not versions) - parentTemplateId is null
    ];

    if (data.category) {
      conditions.push(eq(emailTemplates.category, data.category));
    }

    if (data.activeOnly) {
      conditions.push(eq(emailTemplates.isActive, true));
    }

    const results = await db
      .select()
      .from(emailTemplates)
      .where(and(...conditions))
      .orderBy(desc(emailTemplates.updatedAt));

    // Filter out versions (where parentTemplateId is not null)
    return results.filter((t) => t.parentTemplateId === null);
  });

/**
 * Get a single template by ID
 */
export const getEmailTemplate = createServerFn({ method: "GET" })
  .inputValidator(getTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    return template ?? null;
  });

/**
 * Update a template (optionally creating a new version)
 */
export const updateEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(updateTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Verify ownership
    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Template not found");
    }

    // If creating a new version, insert as a child and update the parent reference
    if (data.createVersion) {
      // Create a version snapshot of the current state
      await db.insert(emailTemplates).values({
        organizationId: ctx.organizationId,
        parentTemplateId: existing.id,
        name: existing.name,
        description: existing.description,
        category: existing.category,
        subject: existing.subject,
        bodyHtml: existing.bodyHtml,
        variables: existing.variables,
        version: existing.version,
        isActive: false, // Versions are not active
        createdBy: existing.createdBy,
        updatedBy: existing.updatedBy,
      });
    }

    // Build update data
    const updateData: Partial<typeof emailTemplates.$inferInsert> = {
      updatedBy: ctx.user.id,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.bodyHtml !== undefined) updateData.bodyHtml = data.bodyHtml;
    if (data.variables !== undefined) updateData.variables = data.variables as TemplateVariable[];
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.createVersion) {
      updateData.version = existing.version + 1;
    }

    const [updated] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, data.id))
      .returning();

    return updated;
  });

/**
 * Delete a template
 */
export const deleteEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(deleteTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Verify ownership
    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Template not found");
    }

    // Delete template and all its versions (CASCADE should handle this)
    await db.delete(emailTemplates).where(eq(emailTemplates.id, data.id));

    return { success: true };
  });

/**
 * Clone an existing template
 */
export const cloneEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(cloneTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Get the source template
    const [source] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.id),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!source) {
      throw new Error("Template not found");
    }

    // Create a clone
    const [clone] = await db
      .insert(emailTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.newName,
        description: source.description,
        category: source.category,
        subject: source.subject,
        bodyHtml: source.bodyHtml,
        variables: source.variables,
        version: 1,
        isActive: true,
        createdBy: ctx.user.id,
      })
      .returning();

    return clone;
  });

/**
 * Get version history for a template
 */
export const getTemplateVersionHistory = createServerFn({ method: "GET" })
  .inputValidator(getVersionHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });

    // Verify the template exists and belongs to this org
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.templateId),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      throw new Error("Template not found");
    }

    // Get all versions (children of this template)
    const versions = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.parentTemplateId, data.templateId))
      .orderBy(desc(emailTemplates.version));

    return versions;
  });

/**
 * Restore a previous version
 */
export const restoreTemplateVersion = createServerFn({ method: "POST" })
  .inputValidator(restoreVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Get the version to restore
    const [version] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.versionId),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!version || !version.parentTemplateId) {
      throw new Error("Version not found");
    }

    // Get the parent template
    const [parent] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, version.parentTemplateId))
      .limit(1);

    if (!parent) {
      throw new Error("Parent template not found");
    }

    // Create a version snapshot of the current parent state
    await db.insert(emailTemplates).values({
      organizationId: ctx.organizationId,
      parentTemplateId: parent.id,
      name: parent.name,
      description: parent.description,
      category: parent.category,
      subject: parent.subject,
      bodyHtml: parent.bodyHtml,
      variables: parent.variables,
      version: parent.version,
      isActive: false,
      createdBy: parent.createdBy,
      updatedBy: parent.updatedBy,
    });

    // Update the parent with the version's content
    const [restored] = await db
      .update(emailTemplates)
      .set({
        name: version.name,
        description: version.description,
        category: version.category,
        subject: version.subject,
        bodyHtml: version.bodyHtml,
        variables: version.variables,
        version: parent.version + 1,
        updatedBy: ctx.user.id,
      })
      .where(eq(emailTemplates.id, parent.id))
      .returning();

    return restored;
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Available template variables for different contexts
 */
export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
  customer: [
    { name: "customer.name", description: "Customer's company name", type: "text" },
    { name: "customer.contactName", description: "Primary contact name", type: "text" },
    { name: "customer.email", description: "Primary contact email", type: "text" },
    { name: "customer.phone", description: "Primary contact phone", type: "text" },
  ],
  quote: [
    { name: "quote.number", description: "Quote reference number", type: "text" },
    { name: "quote.total", description: "Quote total amount", type: "currency" },
    { name: "quote.validUntil", description: "Quote validity date", type: "date" },
    { name: "quote.items", description: "List of quoted items", type: "text" },
  ],
  order: [
    { name: "order.number", description: "Order reference number", type: "text" },
    { name: "order.total", description: "Order total amount", type: "currency" },
    { name: "order.status", description: "Order status", type: "text" },
    { name: "order.estimatedDelivery", description: "Estimated delivery date", type: "date" },
  ],
  installation: [
    { name: "installation.date", description: "Scheduled installation date", type: "date" },
    { name: "installation.technician", description: "Assigned technician name", type: "text" },
    { name: "installation.address", description: "Installation address", type: "text" },
  ],
  support: [
    { name: "ticket.number", description: "Support ticket number", type: "text" },
    { name: "ticket.subject", description: "Ticket subject", type: "text" },
    { name: "ticket.status", description: "Ticket status", type: "text" },
  ],
  general: [
    { name: "company.name", description: "Your company name", type: "text" },
    { name: "company.phone", description: "Your company phone", type: "text" },
    { name: "company.email", description: "Your company email", type: "text" },
    { name: "user.name", description: "Sender's name", type: "text" },
    { name: "user.title", description: "Sender's job title", type: "text" },
  ],
};

/**
 * Substitute variables in template content
 */
export function substituteTemplateVariables(
  content: string,
  data: Record<string, unknown>
): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return match; // Keep original if path not found
      }
    }

    return String(value ?? match);
  });
}

/**
 * Get sample data for template preview
 */
export function getSampleTemplateData(): Record<string, unknown> {
  return {
    customer: {
      name: "ACME Solar Solutions",
      contactName: "John Smith",
      email: "john@acmesolar.com",
      phone: "(555) 123-4567",
    },
    quote: {
      number: "QT-2026-001234",
      total: "$12,500.00",
      validUntil: "February 28, 2026",
      items: "2x Tesla Powerwall 3, Installation Kit, 5-Year Warranty",
    },
    order: {
      number: "ORD-2026-005678",
      total: "$12,500.00",
      status: "Processing",
      estimatedDelivery: "January 25, 2026",
    },
    installation: {
      date: "January 30, 2026",
      technician: "Mike Johnson",
      address: "123 Solar Lane, Brisbane QLD 4000",
    },
    ticket: {
      number: "TKT-2026-000123",
      subject: "Battery not charging",
      status: "In Progress",
    },
    company: {
      name: "Renoz Battery Systems",
      phone: "1800 BATTERY",
      email: "support@renoz.com.au",
    },
    user: {
      name: "Sarah Williams",
      title: "Sales Manager",
    },
  };
}
