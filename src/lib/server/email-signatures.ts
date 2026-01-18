/**
 * Email Signatures Server Functions
 *
 * CRUD operations for personal and company email signatures.
 *
 * @see DOM-COMMS-006
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailSignatures } from "../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const createSignatureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  isDefault: z.boolean().default(false),
  isCompanyWide: z.boolean().default(false),
});

const updateSignatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

const getSignaturesSchema = z.object({
  includeCompanyWide: z.boolean().default(true),
});

const getSignatureSchema = z.object({
  id: z.string().uuid(),
});

const deleteSignatureSchema = z.object({
  id: z.string().uuid(),
});

const setDefaultSignatureSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new email signature
 */
export const createEmailSignature = createServerFn({ method: "POST" })
  .inputValidator(createSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // If setting as default, clear existing default
    if (data.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(
          and(
            eq(emailSignatures.organizationId, ctx.organizationId),
            eq(emailSignatures.userId, ctx.user.id),
            eq(emailSignatures.isDefault, true)
          )
        );
    }

    const [signature] = await db
      .insert(emailSignatures)
      .values({
        organizationId: ctx.organizationId,
        userId: data.isCompanyWide ? null : ctx.user.id,
        name: data.name,
        content: data.content,
        isDefault: data.isDefault,
        isCompanyWide: data.isCompanyWide,
        createdBy: ctx.user.id,
      })
      .returning();

    return signature;
  });

/**
 * Get all signatures for the current user (including company-wide)
 */
export const getEmailSignatures = createServerFn({ method: "GET" })
  .inputValidator(getSignaturesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });

    const conditions = [eq(emailSignatures.organizationId, ctx.organizationId)];

    if (data.includeCompanyWide) {
      // User's own signatures OR company-wide signatures
      conditions.push(
        or(
          eq(emailSignatures.userId, ctx.user.id),
          isNull(emailSignatures.userId),
          eq(emailSignatures.isCompanyWide, true)
        )!
      );
    } else {
      // Only user's own signatures
      conditions.push(eq(emailSignatures.userId, ctx.user.id));
    }

    const results = await db
      .select()
      .from(emailSignatures)
      .where(and(...conditions));

    return results;
  });

/**
 * Get a single signature by ID
 */
export const getEmailSignature = createServerFn({ method: "GET" })
  .inputValidator(getSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });

    const [signature] = await db
      .select()
      .from(emailSignatures)
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
          or(
            eq(emailSignatures.userId, ctx.user.id),
            isNull(emailSignatures.userId),
            eq(emailSignatures.isCompanyWide, true)
          )
        )
      )
      .limit(1);

    return signature ?? null;
  });

/**
 * Update a signature
 */
export const updateEmailSignature = createServerFn({ method: "POST" })
  .inputValidator(updateSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Verify ownership
    const [existing] = await db
      .select()
      .from(emailSignatures)
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
          eq(emailSignatures.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Signature not found or you don't have permission to edit it");
    }

    // If setting as default, clear existing default
    if (data.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(
          and(
            eq(emailSignatures.organizationId, ctx.organizationId),
            eq(emailSignatures.userId, ctx.user.id),
            eq(emailSignatures.isDefault, true)
          )
        );
    }

    const updateData: Partial<typeof emailSignatures.$inferInsert> = {
      updatedBy: ctx.user.id,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const [updated] = await db
      .update(emailSignatures)
      .set(updateData)
      .where(eq(emailSignatures.id, data.id))
      .returning();

    return updated;
  });

/**
 * Delete a signature
 */
export const deleteEmailSignature = createServerFn({ method: "POST" })
  .inputValidator(deleteSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Verify ownership
    const [existing] = await db
      .select()
      .from(emailSignatures)
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
          eq(emailSignatures.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Signature not found or you don't have permission to delete it");
    }

    await db.delete(emailSignatures).where(eq(emailSignatures.id, data.id));

    return { success: true };
  });

/**
 * Set a signature as the default
 */
export const setDefaultSignature = createServerFn({ method: "POST" })
  .inputValidator(setDefaultSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Clear existing default for this user
    await db
      .update(emailSignatures)
      .set({ isDefault: false })
      .where(
        and(
          eq(emailSignatures.organizationId, ctx.organizationId),
          eq(emailSignatures.userId, ctx.user.id),
          eq(emailSignatures.isDefault, true)
        )
      );

    // Set new default
    const [updated] = await db
      .update(emailSignatures)
      .set({ isDefault: true, updatedBy: ctx.user.id })
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
          eq(emailSignatures.userId, ctx.user.id)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Signature not found or you don't have permission to update it");
    }

    return updated;
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the user's default signature
 */
export async function getDefaultSignature(
  userId: string,
  organizationId: string
): Promise<typeof emailSignatures.$inferSelect | null> {
  // Try user's personal default first
  const [personal] = await db
    .select()
    .from(emailSignatures)
    .where(
      and(
        eq(emailSignatures.organizationId, organizationId),
        eq(emailSignatures.userId, userId),
        eq(emailSignatures.isDefault, true)
      )
    )
    .limit(1);

  if (personal) return personal;

  // Fall back to company-wide default
  const [company] = await db
    .select()
    .from(emailSignatures)
    .where(
      and(
        eq(emailSignatures.organizationId, organizationId),
        eq(emailSignatures.isCompanyWide, true),
        eq(emailSignatures.isDefault, true)
      )
    )
    .limit(1);

  return company ?? null;
}

/**
 * Get the company's default signature
 */
export async function getCompanyDefaultSignature(
  organizationId: string
): Promise<typeof emailSignatures.$inferSelect | null> {
  const [signature] = await db
    .select()
    .from(emailSignatures)
    .where(
      and(
        eq(emailSignatures.organizationId, organizationId),
        eq(emailSignatures.isCompanyWide, true),
        eq(emailSignatures.isDefault, true)
      )
    )
    .limit(1);

  return signature ?? null;
}
