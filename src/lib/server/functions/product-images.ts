/**
 * Product Images Server Functions
 *
 * Image upload, metadata management, ordering, and bulk operations.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, asc, isNull, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, productImages } from "../../../../drizzle/schema";
import { withAuth } from "../protected";
import { NotFoundError, ValidationError } from "../errors";

// ============================================================================
// TYPES
// ============================================================================

type ProductImage = typeof productImages.$inferSelect;

// Allowed image types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_PRODUCT = 20;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate image file before upload.
 */
function validateImageFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

// ============================================================================
// IMAGE CRUD
// ============================================================================

/**
 * List images for a product.
 */
export const listProductImages = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductImage[]> => {
    const ctx = await withAuth();

    return db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, data.productId)
        )
      )
      .orderBy(asc(productImages.sortOrder));
  });

/**
 * Get the primary image for a product.
 */
export const getPrimaryImage = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductImage | null> => {
    const ctx = await withAuth();

    const [primary] = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, data.productId),
          eq(productImages.isPrimary, true)
        )
      )
      .limit(1);

    if (primary) return primary;

    // Fall back to first image if no primary set
    const [first] = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, data.productId)
        )
      )
      .orderBy(asc(productImages.sortOrder))
      .limit(1);

    return first ?? null;
  });

/**
 * Add an image to a product.
 * Note: Actual file upload to Supabase Storage should happen on the client,
 * this function records the metadata after successful upload.
 */
export const addProductImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      imageUrl: z.string().url(),
      altText: z.string().max(255).optional(),
      caption: z.string().max(1000).optional(),
      fileSize: z.number().int().positive().optional(),
      dimensions: z
        .object({
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
      mimeType: z.string().optional(),
      setAsPrimary: z.boolean().default(false),
    })
  )
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError("Product not found", "product");
    }

    // Validate file if mime type provided
    if (data.mimeType && data.fileSize) {
      const validation = validateImageFile(data.mimeType, data.fileSize);
      if (!validation.valid) {
        throw new ValidationError(validation.error!, {
          imageUrl: [validation.error!],
        });
      }
    }

    // Check image count limit
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, data.productId)
        )
      );

    if ((countResult?.count ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
      throw new ValidationError(`Maximum ${MAX_IMAGES_PER_PRODUCT} images per product`, {
        imageUrl: [`Product already has maximum number of images`],
      });
    }

    // Get max sort order
    const [maxSort] = await db
      .select({ max: productImages.sortOrder })
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, data.productId)
        )
      )
      .limit(1);

    const sortOrder = (maxSort?.max ?? -1) + 1;

    // If setting as primary, unset current primary
    if (data.setAsPrimary) {
      await db
        .update(productImages)
        .set({ isPrimary: false })
        .where(
          and(
            eq(productImages.organizationId, ctx.organizationId),
            eq(productImages.productId, data.productId),
            eq(productImages.isPrimary, true)
          )
        );
    }

    // Check if this is the first image (auto-set as primary)
    const isFirstImage = (countResult?.count ?? 0) === 0;

    // Insert image
    const [image] = await db
      .insert(productImages)
      .values({
        organizationId: ctx.organizationId,
        productId: data.productId,
        imageUrl: data.imageUrl,
        altText: data.altText,
        caption: data.caption,
        fileSize: data.fileSize,
        dimensions: data.dimensions,
        sortOrder,
        isPrimary: data.setAsPrimary || isFirstImage,
        uploadedBy: ctx.user.id,
      })
      .returning();

    return image;
  });

/**
 * Update image metadata.
 */
export const updateProductImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      altText: z.string().max(255).optional(),
      caption: z.string().max(1000).optional(),
    })
  )
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: "product.update" });
    const { id, ...updateData } = data;

    const [existing] = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, id),
          eq(productImages.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Image not found", "productImage");
    }

    const [updated] = await db
      .update(productImages)
      .set(updateData)
      .where(eq(productImages.id, id))
      .returning();

    return updated;
  });

/**
 * Delete a product image.
 * Note: This only removes the database record.
 * Actual file deletion from Supabase Storage should be handled separately.
 */
export const deleteProductImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean; wassPrimary: boolean }> => {
    const ctx = await withAuth({ permission: "product.update" });

    const [existing] = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, data.id),
          eq(productImages.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Image not found", "productImage");
    }

    const wasPrimary = existing.isPrimary;

    await db.delete(productImages).where(eq(productImages.id, data.id));

    // If was primary, set next image as primary
    if (wasPrimary) {
      const [nextImage] = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(
          and(
            eq(productImages.organizationId, ctx.organizationId),
            eq(productImages.productId, existing.productId)
          )
        )
        .orderBy(asc(productImages.sortOrder))
        .limit(1);

      if (nextImage) {
        await db
          .update(productImages)
          .set({ isPrimary: true })
          .where(eq(productImages.id, nextImage.id));
      }
    }

    return { success: true, wassPrimary: wasPrimary };
  });

// ============================================================================
// PRIMARY IMAGE
// ============================================================================

/**
 * Set an image as the primary image for a product.
 */
export const setPrimaryImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: "product.update" });

    const [image] = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, data.id),
          eq(productImages.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!image) {
      throw new NotFoundError("Image not found", "productImage");
    }

    // Unset current primary
    await db
      .update(productImages)
      .set({ isPrimary: false })
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, image.productId),
          eq(productImages.isPrimary, true)
        )
      );

    // Set new primary
    const [updated] = await db
      .update(productImages)
      .set({ isPrimary: true })
      .where(eq(productImages.id, data.id))
      .returning();

    return updated;
  });

// ============================================================================
// IMAGE ORDERING
// ============================================================================

/**
 * Reorder images for a product.
 */
export const reorderProductImages = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      imageIds: z.array(z.string().uuid()).min(1),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Verify all images belong to this product
    const images = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          eq(productImages.productId, data.productId),
          inArray(productImages.id, data.imageIds)
        )
      );

    if (images.length !== data.imageIds.length) {
      throw new ValidationError("Some images not found or don't belong to this product", {
        imageIds: ["Invalid image IDs provided"],
      });
    }

    // Update sort orders
    for (let i = 0; i < data.imageIds.length; i++) {
      await db
        .update(productImages)
        .set({ sortOrder: i })
        .where(eq(productImages.id, data.imageIds[i]));
    }

    return { success: true };
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Delete multiple images at once.
 */
export const bulkDeleteImages = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      imageIds: z.array(z.string().uuid()).min(1).max(50),
    })
  )
  .handler(async ({ data }): Promise<{ deleted: number; primaryReassigned: boolean }> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Get images to delete
    const images = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          inArray(productImages.id, data.imageIds)
        )
      );

    if (images.length === 0) {
      return { deleted: 0, primaryReassigned: false };
    }

    // Get product IDs where primary image was deleted
    const primaryImageProductIds = images.filter((i) => i.isPrimary).map((i) => i.productId);

    // Delete images
    await db
      .delete(productImages)
      .where(inArray(productImages.id, data.imageIds));

    // Reassign primary images where needed
    let primaryReassigned = false;
    for (const productId of primaryImageProductIds) {
      const [nextImage] = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(
          and(
            eq(productImages.organizationId, ctx.organizationId),
            eq(productImages.productId, productId)
          )
        )
        .orderBy(asc(productImages.sortOrder))
        .limit(1);

      if (nextImage) {
        await db
          .update(productImages)
          .set({ isPrimary: true })
          .where(eq(productImages.id, nextImage.id));
        primaryReassigned = true;
      }
    }

    return { deleted: images.length, primaryReassigned };
  });

/**
 * Update alt text for multiple images.
 */
export const bulkUpdateAltText = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      updates: z.array(
        z.object({
          id: z.string().uuid(),
          altText: z.string().max(255),
        })
      ).min(1).max(50),
    })
  )
  .handler(async ({ data }): Promise<{ updated: number }> => {
    const ctx = await withAuth({ permission: "product.update" });

    let updated = 0;

    for (const update of data.updates) {
      const result = await db
        .update(productImages)
        .set({ altText: update.altText })
        .where(
          and(
            eq(productImages.id, update.id),
            eq(productImages.organizationId, ctx.organizationId)
          )
        );

      // Check if row was updated (drizzle returns the result)
      if (result) updated++;
    }

    return { updated };
  });

// ============================================================================
// IMAGE STATISTICS
// ============================================================================

/**
 * Get image statistics for a product.
 */
export const getImageStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<{
      totalImages: number;
      totalSize: number;
      hasPrimary: boolean;
      missingAltText: number;
    }> => {
      const ctx = await withAuth();

      const images = await db
        .select()
        .from(productImages)
        .where(
          and(
            eq(productImages.organizationId, ctx.organizationId),
            eq(productImages.productId, data.productId)
          )
        );

      return {
        totalImages: images.length,
        totalSize: images.reduce((sum, i) => sum + (i.fileSize ?? 0), 0),
        hasPrimary: images.some((i) => i.isPrimary),
        missingAltText: images.filter((i) => !i.altText).length,
      };
    }
  );
