/**
 * Email Signatures Server Functions
 *
 * CRUD operations for personal and company email signatures.
 *
 * @see DOM-COMMS-006
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, or, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { emailSignatures } from '../../../../drizzle/schema/communications'
import {
  createSignatureSchema,
  updateSignatureSchema,
  getSignaturesSchema,
  getSignatureSchema,
  deleteSignatureSchema,
  setDefaultSignatureSchema,
} from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new email signature
 */
export const createEmailSignature = createServerFn({ method: 'POST' })
  .inputValidator(createSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    // If setting as default, clear existing default
    if (data.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(
          and(
            eq(emailSignatures.organizationId, ctx.organizationId),
            eq(emailSignatures.userId, ctx.user.id),
            eq(emailSignatures.isDefault, true),
          ),
        )
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
      .returning()

    return signature
  })

/**
 * Get all signatures for the current user (including company-wide)
 */
export const getEmailSignatures = createServerFn({ method: 'GET' })
  .inputValidator(getSignaturesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read })

    const conditions = [eq(emailSignatures.organizationId, ctx.organizationId)]

    if (data.includeCompanyWide) {
      // User's own signatures OR company-wide signatures
      conditions.push(
        or(
          eq(emailSignatures.userId, ctx.user.id),
          isNull(emailSignatures.userId),
          eq(emailSignatures.isCompanyWide, true),
        )!,
      )
    } else {
      // Only user's own signatures
      conditions.push(eq(emailSignatures.userId, ctx.user.id))
    }

    const results = await db
      .select()
      .from(emailSignatures)
      .where(and(...conditions))

    return results
  })

/**
 * Get a single signature by ID
 */
export const getEmailSignature = createServerFn({ method: 'GET' })
  .inputValidator(getSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read })

    const [signature] = await db
      .select()
      .from(emailSignatures)
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    return signature ?? null
  })

/**
 * Update an email signature
 */
export const updateEmailSignature = createServerFn({ method: 'POST' })
  .inputValidator(updateSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    // If setting as default, clear existing default
    if (data.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(
          and(
            eq(emailSignatures.organizationId, ctx.organizationId),
            eq(emailSignatures.userId, ctx.user.id),
            eq(emailSignatures.isDefault, true),
          ),
        )
    }

    const [updated] = await db
      .update(emailSignatures)
      .set({
        name: data.name,
        content: data.content,
        isDefault: data.isDefault,
      })
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
        ),
      )
      .returning()

    if (!updated) {
      throw new Error('Signature not found')
    }

    return updated
  })

/**
 * Delete an email signature
 */
export const deleteEmailSignature = createServerFn({ method: 'POST' })
  .inputValidator(deleteSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    const [deleted] = await db
      .delete(emailSignatures)
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
        ),
      )
      .returning()

    if (!deleted) {
      throw new Error('Signature not found')
    }

    return { success: true }
  })

/**
 * Set a signature as default for the current user
 */
export const setDefaultSignature = createServerFn({ method: 'POST' })
  .inputValidator(setDefaultSignatureSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update })

    // Clear existing default
    await db
      .update(emailSignatures)
      .set({ isDefault: false })
      .where(
        and(
          eq(emailSignatures.organizationId, ctx.organizationId),
          eq(emailSignatures.userId, ctx.user.id),
          eq(emailSignatures.isDefault, true),
        ),
      )

    // Set new default
    const [updated] = await db
      .update(emailSignatures)
      .set({ isDefault: true })
      .where(
        and(
          eq(emailSignatures.id, data.id),
          eq(emailSignatures.organizationId, ctx.organizationId),
          eq(emailSignatures.userId, ctx.user.id),
        ),
      )
      .returning()

    if (!updated) {
      throw new Error('Signature not found')
    }

    return updated
  })
