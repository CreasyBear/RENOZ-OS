/**
 * Product Images Server Functions
 *
 * Image upload, metadata management, ordering, and bulk operations.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc, isNull, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { products, productImages } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ServerError, ValidationError } from '@/lib/server/errors';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  extractStoragePathFromPublicUrl,
  isOurStorageUrl,
} from '@/lib/storage/storage-url-utils';

// ============================================================================
// TYPES
// ============================================================================

type ProductImage = typeof productImages.$inferSelect;

// Allowed image types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_PRODUCT = 20;
const PRODUCT_IMAGE_STORAGE_BUCKET = 'public';

const productImageDimensionsSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .optional();

interface ProductImageRecordInput {
  productId: string;
  imageUrl: string;
  altText?: string;
  caption?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  mimeType?: string;
  setAsPrimary?: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate image file before upload.
 */
function validateImageFile(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
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

function getImageExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

function createStorageObjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function decodeBase64ToArrayBuffer(base64Content: string): ArrayBuffer {
  const buffer = Buffer.from(base64Content, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function createProductImageRecord(params: {
  organizationId: string;
  userId: string;
  data: ProductImageRecordInput;
}): Promise<ProductImage> {
  const { organizationId, userId, data } = params;

  // Verify product exists
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.id, data.productId),
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      )
    )
    .limit(1);

  if (!product) {
    throw new NotFoundError('Product not found', 'product');
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
        eq(productImages.organizationId, organizationId),
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
        eq(productImages.organizationId, organizationId),
        eq(productImages.productId, data.productId)
      )
    )
    .limit(1);

  const sortOrder = (maxSort?.max ?? -1) + 1;

  return db.transaction(async (tx) => {
    // If setting as primary, unset current primary
    if (data.setAsPrimary) {
      await tx
        .update(productImages)
        .set({ isPrimary: false })
        .where(
          and(
            eq(productImages.organizationId, organizationId),
            eq(productImages.productId, data.productId),
            eq(productImages.isPrimary, true)
          )
        );
    }

    // Check if this is the first image (auto-set as primary)
    const isFirstImage = (countResult?.count ?? 0) === 0;

    // Insert image
    const [image] = await tx
      .insert(productImages)
      .values({
        organizationId,
        productId: data.productId,
        imageUrl: data.imageUrl,
        altText: data.altText,
        caption: data.caption,
        fileSize: data.fileSize,
        dimensions: data.dimensions,
        sortOrder,
        isPrimary: data.setAsPrimary || isFirstImage,
        uploadedBy: userId,
      })
      .returning();

    return image;
  });
}

async function removeProductImageStorageObjects(imageUrls: Array<string | null | undefined>) {
  const storagePaths = Array.from(
    new Set(
      imageUrls
        .filter((url): url is string => isOurStorageUrl(url))
        .map((url) => extractStoragePathFromPublicUrl(url, PRODUCT_IMAGE_STORAGE_BUCKET))
        .filter((path): path is string => Boolean(path))
    )
  );

  if (storagePaths.length === 0) {
    return;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_STORAGE_BUCKET)
      .remove(storagePaths);

    if (error) {
      logger.error('[productImages] Failed to remove product image storage objects', error, {
        storageObjectCount: storagePaths.length,
      });
    }
  } catch (error) {
    logger.error('[productImages] Error removing product image storage objects', error, {
      storageObjectCount: storagePaths.length,
    });
  }
}

// ============================================================================
// IMAGE CRUD
// ============================================================================

/**
 * List images for a product.
 */
export const listProductImages = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ productId: z.string().uuid() })))
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
export const getPrimaryImage = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ productId: z.string().uuid() })))
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
export const addProductImage = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      imageUrl: z.string().url(),
      altText: z.string().max(255).optional(),
      caption: z.string().max(1000).optional(),
      fileSize: z.number().int().positive().optional(),
      dimensions: productImageDimensionsSchema,
      mimeType: z.string().optional(),
      setAsPrimary: z.boolean().default(false),
    })
  )
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    return createProductImageRecord({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
    });
  });

/**
 * Upload an image file to Supabase Storage and record product image metadata.
 */
export const uploadProductImageFile = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      filename: z.string().min(1),
      base64Content: z.string().min(1),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
      dimensions: productImageDimensionsSchema,
      altText: z.string().max(255).optional(),
      caption: z.string().max(1000).optional(),
      setAsPrimary: z.boolean().default(false),
    })
  )
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });
    const validation = validateImageFile(data.mimeType, data.sizeBytes);
    if (!validation.valid) {
      throw new ValidationError(validation.error!, {
        imageUrl: [validation.error!],
      });
    }

    const supabase = await createClient();
    const extension = getImageExtension(data.mimeType);
    const storagePath = `products/${ctx.organizationId}/${data.productId}/${createStorageObjectId()}.${extension}`;
    const fileBody = decodeBase64ToArrayBuffer(data.base64Content);

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_STORAGE_BUCKET)
      .upload(storagePath, fileBody, {
        contentType: data.mimeType,
        upsert: false,
      });

    if (uploadError) {
      logger.error('[uploadProductImageFile] Failed to upload product image', uploadError, {
        productId: data.productId,
      });
      throw new ServerError(
        'Product image upload is temporarily unavailable. Please refresh and try again.',
        500,
        'UPLOAD_ERROR'
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGE_STORAGE_BUCKET).getPublicUrl(storagePath);

    try {
      return await createProductImageRecord({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        data: {
          productId: data.productId,
          imageUrl: publicUrl,
          altText: data.altText,
          caption: data.caption,
          fileSize: data.sizeBytes,
          dimensions: data.dimensions,
          mimeType: data.mimeType,
          setAsPrimary: data.setAsPrimary,
        },
      });
    } catch (error) {
      const { error: removeError } = await supabase.storage
        .from(PRODUCT_IMAGE_STORAGE_BUCKET)
        .remove([storagePath]);

      if (removeError) {
        logger.error('[uploadProductImageFile] Failed to remove orphaned product image', removeError, {
          productId: data.productId,
        });
      }

      throw error;
    }
  });

/**
 * Update image metadata.
 */
export const updateProductImage = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      altText: z.string().max(255).optional(),
      caption: z.string().max(1000).optional(),
    })
  )
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });
    const { id, ...updateData } = data;

    const [existing] = await db
      .select()
      .from(productImages)
      .where(and(eq(productImages.id, id), eq(productImages.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Image not found', 'productImage');
    }

    const [updated] = await db
      .update(productImages)
      .set(updateData)
      .where(eq(productImages.id, id))
      .returning();

    return updated;
  });

/**
 * Delete a product image and best-effort remove the backing storage object.
 */
export const deleteProductImage = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean; wassPrimary: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    const [existing] = await db
      .select()
      .from(productImages)
      .where(
        and(eq(productImages.id, data.id), eq(productImages.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Image not found', 'productImage');
    }

    const wasPrimary = existing.isPrimary;

    const result = await db.transaction(async (tx) => {
      await tx.delete(productImages).where(eq(productImages.id, data.id));

      // If was primary, set next image as primary
      if (wasPrimary) {
        const [nextImage] = await tx
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
          await tx
            .update(productImages)
            .set({ isPrimary: true })
            .where(eq(productImages.id, nextImage.id));
        }
      }

      return { success: true, wassPrimary: wasPrimary };
    });

    await removeProductImageStorageObjects([existing.imageUrl]);
    return result;
  });

// ============================================================================
// PRIMARY IMAGE
// ============================================================================

/**
 * Set an image as the primary image for a product.
 */
export const setPrimaryImage = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductImage> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    const [image] = await db
      .select()
      .from(productImages)
      .where(
        and(eq(productImages.id, data.id), eq(productImages.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!image) {
      throw new NotFoundError('Image not found', 'productImage');
    }

    return db.transaction(async (tx) => {
      // Unset current primary
      await tx
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
      const [updated] = await tx
        .update(productImages)
        .set({ isPrimary: true })
        .where(eq(productImages.id, data.id))
        .returning();

      return updated;
    });
  });

// ============================================================================
// IMAGE ORDERING
// ============================================================================

/**
 * Reorder images for a product.
 */
export const reorderProductImages = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      imageIds: z.array(z.string().uuid()).min(1),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

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
        imageIds: ['Invalid image IDs provided'],
      });
    }

    // RAW SQL (Phase 11 Keep): Dynamic CASE for bulk sort order. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    if (data.imageIds.length > 0) {
      const sortOrderCase = sql`CASE ${productImages.id}
        ${sql.join(
          data.imageIds.map((id, index) => sql`WHEN ${id} THEN ${index}`),
          sql` `
        )}
        ELSE ${productImages.sortOrder}
      END`;

      await db
        .update(productImages)
        .set({ sortOrder: sortOrderCase })
        .where(
          and(
            eq(productImages.organizationId, ctx.organizationId),
            eq(productImages.productId, data.productId),
            inArray(productImages.id, data.imageIds)
          )
        );
    }

    return { success: true };
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Delete multiple images at once.
 */
export const bulkDeleteImages = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      imageIds: z.array(z.string().uuid()).min(1).max(50),
    })
  )
  .handler(async ({ data }): Promise<{ deleted: number; primaryReassigned: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

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

    const result = await db.transaction(async (tx) => {
      // Delete images
      await tx.delete(productImages).where(inArray(productImages.id, data.imageIds));

      // Reassign primary images where needed
    // PERFORMANCE: Batch fetch all next images in parallel instead of N sequential queries
      let primaryReassigned = false;
      if (primaryImageProductIds.length > 0) {
        const nextImagesPromises = primaryImageProductIds.map((productId) =>
          tx
            .select({ id: productImages.id, productId: productImages.productId })
            .from(productImages)
            .where(
              and(
                eq(productImages.organizationId, ctx.organizationId),
                eq(productImages.productId, productId)
              )
            )
            .orderBy(asc(productImages.sortOrder))
            .limit(1)
            .then((results) => results[0] || null)
        );

      const nextImages = (await Promise.all(nextImagesPromises)).filter(
        (img): img is NonNullable<typeof img> => img !== null
      );

        if (nextImages.length > 0) {
          // Batch update all primary images
          const nextImageIds = nextImages.map((img) => img.id);
          await tx
            .update(productImages)
            .set({ isPrimary: true })
            .where(
              and(
                eq(productImages.organizationId, ctx.organizationId),
                inArray(productImages.id, nextImageIds)
              )
            );
          primaryReassigned = true;
        }
      }

      return { deleted: images.length, primaryReassigned };
    });

    await removeProductImageStorageObjects(images.map((image) => image.imageUrl));
    return result;
  });

/**
 * Update alt text for multiple images.
 */
export const bulkUpdateAltText = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      updates: z
        .array(
          z.object({
            id: z.string().uuid(),
            altText: z.string().max(255),
          })
        )
        .min(1)
        .max(50),
    })
  )
  .handler(async ({ data }): Promise<{ updated: number }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    if (data.updates.length === 0) {
      return { updated: 0 };
    }

    // PERFORMANCE: Use batch update with CASE statements instead of N sequential queries
    const updateIds = data.updates.map((u) => u.id);
    const altTextCase = sql`CASE ${productImages.id}
      ${sql.join(
        data.updates.map((u) => sql`WHEN ${u.id} THEN ${u.altText ?? sql`NULL`}`),
        sql` `
      )}
      ELSE ${productImages.altText}
    END`;

    await db
      .update(productImages)
      .set({ altText: altTextCase })
      .where(
        and(
          eq(productImages.organizationId, ctx.organizationId),
          inArray(productImages.id, updateIds)
        )
      );

    return { updated: data.updates.length };
  });

// ============================================================================
// IMAGE STATISTICS
// ============================================================================

/**
 * Get image statistics for a product.
 */
export const getImageStats = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ productId: z.string().uuid() })))
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
