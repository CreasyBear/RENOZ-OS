/**
 * Document Templates Server Functions
 *
 * Server functions for managing document template customization settings.
 * Handles organization-wide branding, styling, and content for generated PDFs.
 *
 * @see drizzle/schema/document-templates.ts for database schema
 * @see PRD INT-DOC-005-A
 */

import { cache } from "react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documentTemplates,
  DOCUMENT_TYPES,
  PAPER_SIZES,
  FONT_FAMILIES,
  type DocumentTemplate,
} from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAuditEvent } from "../_shared/audit-logs";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for getting a document template.
 */
const getDocumentTemplateSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES as unknown as [string, ...string[]]),
});

/**
 * Schema for updating a document template.
 * All fields are optional - only provided fields will be updated.
 */
const updateDocumentTemplateSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES as unknown as [string, ...string[]]),
  logoUrl: z.string().url().max(2048).nullish(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #1f2937)")
    .nullish(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #6b7280)")
    .nullish(),
  fontFamily: z
    .enum(FONT_FAMILIES as unknown as [string, ...string[]])
    .nullish(),
  paperSize: z.enum(PAPER_SIZES as unknown as [string, ...string[]]).nullish(),
  includeQr: z.boolean().nullish(),
  footerText: z.string().max(1000).nullish(),
  termsText: z.string().max(10000).nullish(),
});

// ============================================================================
// GET DOCUMENT TEMPLATE
// ============================================================================

/**
 * Cached template fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getDocumentTemplateCached = cache(
  async (documentType: string, organizationId: string) => {
    const [template] = await db
      .select({
        id: documentTemplates.id,
        organizationId: documentTemplates.organizationId,
        documentType: documentTemplates.documentType,
        logoUrl: documentTemplates.logoUrl,
        primaryColor: documentTemplates.primaryColor,
        secondaryColor: documentTemplates.secondaryColor,
        fontFamily: documentTemplates.fontFamily,
        paperSize: documentTemplates.paperSize,
        includeQr: documentTemplates.includeQr,
        footerText: documentTemplates.footerText,
        termsText: documentTemplates.termsText,
        createdAt: documentTemplates.createdAt,
        updatedAt: documentTemplates.updatedAt,
      })
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.organizationId, organizationId),
          eq(documentTemplates.documentType, documentType)
        )
      )
      .limit(1);

    if (!template) {
      return {
        id: null,
        organizationId,
        documentType,
        logoUrl: null,
        primaryColor: "#1f2937",
        secondaryColor: "#6b7280",
        fontFamily: "inter",
        paperSize: "a4",
        includeQr: false,
        footerText: null,
        termsText: null,
        createdAt: null,
        updatedAt: null,
        isDefault: true,
      };
    }

    return {
      ...template,
      isDefault: false,
    };
  }
);

/**
 * Get the document template settings for a specific document type.
 * Returns defaults if no template exists for the organization.
 */
export const getDocumentTemplate = createServerFn({ method: "GET" })
  .inputValidator(getDocumentTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.read });
    return _getDocumentTemplateCached(data.documentType, ctx.organizationId);
  });

// ============================================================================
// UPDATE DOCUMENT TEMPLATE
// ============================================================================

/**
 * Update document template settings.
 * Creates the template if it doesn't exist (upsert behavior).
 * Requires: settings.update permission
 */
export const updateDocumentTemplate = createServerFn({ method: "POST" })
  .inputValidator(updateDocumentTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.update });

    const { documentType, ...updateData } = data;

    // Check if template exists
    const [existing] = await db
      .select({
        id: documentTemplates.id,
        logoUrl: documentTemplates.logoUrl,
        primaryColor: documentTemplates.primaryColor,
        secondaryColor: documentTemplates.secondaryColor,
        fontFamily: documentTemplates.fontFamily,
        paperSize: documentTemplates.paperSize,
        includeQr: documentTemplates.includeQr,
        footerText: documentTemplates.footerText,
        termsText: documentTemplates.termsText,
      })
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.organizationId, ctx.organizationId),
          eq(documentTemplates.documentType, documentType)
        )
      )
      .limit(1);

    // Build update values, filtering out undefined values
    const updateValues: Partial<DocumentTemplate> = {};
    if (updateData.logoUrl !== undefined)
      updateValues.logoUrl = updateData.logoUrl;
    if (updateData.primaryColor !== undefined)
      updateValues.primaryColor = updateData.primaryColor;
    if (updateData.secondaryColor !== undefined)
      updateValues.secondaryColor = updateData.secondaryColor;
    if (updateData.fontFamily !== undefined)
      updateValues.fontFamily = updateData.fontFamily;
    if (updateData.paperSize !== undefined)
      updateValues.paperSize = updateData.paperSize;
    if (updateData.includeQr !== undefined)
      updateValues.includeQr = updateData.includeQr;
    if (updateData.footerText !== undefined)
      updateValues.footerText = updateData.footerText;
    if (updateData.termsText !== undefined)
      updateValues.termsText = updateData.termsText;

    let result: DocumentTemplate;

    if (existing) {
      // Update existing template
      const [updated] = await db
        .update(documentTemplates)
        .set(updateValues)
        .where(eq(documentTemplates.id, existing.id))
        .returning();

      result = updated;

      // Log audit event for update
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "document_template.update",
        entityType: "setting",
        entityId: updated.id,
        oldValues: {
          documentType,
          ...existing,
        },
        newValues: {
          documentType,
          ...updateValues,
        },
      });
    } else {
      // Create new template
      const [created] = await db
        .insert(documentTemplates)
        .values({
          organizationId: ctx.organizationId,
          documentType,
          ...updateValues,
        })
        .returning();

      result = created;

      // Log audit event for create
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "document_template.create",
        entityType: "setting",
        entityId: created.id,
        newValues: {
          documentType,
          ...updateValues,
        },
      });
    }

    return {
      id: result.id,
      organizationId: result.organizationId,
      documentType: result.documentType,
      logoUrl: result.logoUrl,
      primaryColor: result.primaryColor,
      secondaryColor: result.secondaryColor,
      fontFamily: result.fontFamily,
      paperSize: result.paperSize,
      includeQr: result.includeQr,
      footerText: result.footerText,
      termsText: result.termsText,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  });

// ============================================================================
// GET ALL DOCUMENT TEMPLATES
// ============================================================================

/**
 * Get all document templates for the organization.
 * Useful for settings pages that show all template configurations.
 */
export const getAllDocumentTemplates = createServerFn({ method: "GET" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.read });

    const templates = await db
      .select({
        id: documentTemplates.id,
        organizationId: documentTemplates.organizationId,
        documentType: documentTemplates.documentType,
        logoUrl: documentTemplates.logoUrl,
        primaryColor: documentTemplates.primaryColor,
        secondaryColor: documentTemplates.secondaryColor,
        fontFamily: documentTemplates.fontFamily,
        paperSize: documentTemplates.paperSize,
        includeQr: documentTemplates.includeQr,
        footerText: documentTemplates.footerText,
        termsText: documentTemplates.termsText,
        createdAt: documentTemplates.createdAt,
        updatedAt: documentTemplates.updatedAt,
      })
      .from(documentTemplates)
      .where(eq(documentTemplates.organizationId, ctx.organizationId))
      .orderBy(documentTemplates.documentType);

    // Create a map of existing templates
    const templateMap = new Map(templates.map((t) => [t.documentType, t]));

    // Return all document types with their templates (or defaults)
    const allTemplates = DOCUMENT_TYPES.map((docType) => {
      const existing = templateMap.get(docType);
      if (existing) {
        return {
          ...existing,
          isDefault: false,
        };
      }
      // Return default values for unconfigured types
      return {
        id: null,
        organizationId: ctx.organizationId,
        documentType: docType,
        logoUrl: null,
        primaryColor: "#1f2937",
        secondaryColor: "#6b7280",
        fontFamily: "inter",
        paperSize: "a4",
        includeQr: false,
        footerText: null,
        termsText: null,
        createdAt: null,
        updatedAt: null,
        isDefault: true,
      };
    });

    return { templates: allTemplates };
  });

// ============================================================================
// RESET DOCUMENT TEMPLATE
// ============================================================================

/**
 * Reset a document template to defaults by deleting it.
 * Requires: settings.update permission
 */
export const resetDocumentTemplate = createServerFn({ method: "POST" })
  .inputValidator(getDocumentTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings?.update });

    // Find and delete the template
    const deleted = await db
      .delete(documentTemplates)
      .where(
        and(
          eq(documentTemplates.organizationId, ctx.organizationId),
          eq(documentTemplates.documentType, data.documentType)
        )
      )
      .returning({ id: documentTemplates.id });

    if (deleted.length > 0) {
      // Log audit event
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "document_template.reset",
        entityType: "setting",
        entityId: deleted[0].id,
        oldValues: { documentType: data.documentType },
      });
    }

    return {
      success: true,
      documentType: data.documentType,
      message: "Template reset to defaults",
    };
  });
