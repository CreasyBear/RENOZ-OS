/**
 * Product Bulk Operations Server Functions
 *
 * CSV/Excel import, bulk updates, and export functionality.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, categories } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ValidationError } from '@/lib/server/errors';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BATCH_SIZE = 500;
const MAX_IMPORT_SIZE = 1000;

// ============================================================================
// TYPES
// ============================================================================

interface ImportRow {
  sku: string;
  name: string;
  description?: string;
  categoryName?: string;
  type?: 'physical' | 'service' | 'digital' | 'bundle';
  status?: 'active' | 'inactive' | 'discontinued';
  basePrice: number;
  costPrice?: number;
  weight?: number;
  barcode?: string;
  tags?: string[];
}

interface ImportResult {
  row: number;
  sku: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
  productId?: string;
}

// Removed unused _BulkUpdateField interface

// ============================================================================
// IMPORT SCHEMA
// ============================================================================

const importRowSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  categoryName: z.string().max(100).optional(),
  type: z.enum(['physical', 'service', 'digital', 'bundle']).optional().default('physical'),
  status: z.enum(['active', 'inactive', 'discontinued']).optional().default('active'),
  basePrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  barcode: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV content into rows.
 * Simple parser - handles basic CSV with quoted fields.
 */
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() ?? '';
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Map CSV column names to internal field names.
 */
function normalizeFieldName(name: string): string {
  const mappings: Record<string, string> = {
    sku: 'sku',
    'product sku': 'sku',
    'item sku': 'sku',
    name: 'name',
    'product name': 'name',
    title: 'name',
    description: 'description',
    desc: 'description',
    category: 'categoryName',
    'category name': 'categoryName',
    type: 'type',
    'product type': 'type',
    status: 'status',
    price: 'basePrice',
    'base price': 'basePrice',
    'sell price': 'basePrice',
    cost: 'costPrice',
    'cost price': 'costPrice',
    weight: 'weight',
    barcode: 'barcode',
    upc: 'barcode',
    ean: 'barcode',
    tags: 'tags',
  };

  return mappings[name.toLowerCase()] || name;
}

// ============================================================================
// IMPORT OPERATIONS
// ============================================================================

/**
 * Parse and validate CSV content before import.
 * Returns validated rows and any parsing errors.
 */
export const parseImportFile = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      content: z.string(),
      hasHeaders: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    await withAuth();

    const rawRows = parseCSV(data.content);
    const validatedRows: Array<{
      row: number;
      data: ImportRow;
      isValid: boolean;
      errors: string[];
    }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const normalizedRow: Record<string, unknown> = {};

      // Normalize field names
      for (const [key, value] of Object.entries(rawRow)) {
        const normalizedKey = normalizeFieldName(key);
        if (normalizedKey === 'tags' && value) {
          normalizedRow[normalizedKey] = value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          normalizedRow[normalizedKey] = value || undefined;
        }
      }

      // Validate
      const result = importRowSchema.safeParse(normalizedRow);

      if (result.success) {
        validatedRows.push({
          row: i + 2, // 1-indexed, plus header row
          data: result.data as ImportRow,
          isValid: true,
          errors: [],
        });
      } else {
        validatedRows.push({
          row: i + 2,
          data: normalizedRow as unknown as ImportRow,
          isValid: false,
          errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
    }

    const validCount = validatedRows.filter((r) => r.isValid).length;
    const invalidCount = validatedRows.filter((r) => !r.isValid).length;

    return {
      totalRows: validatedRows.length,
      validCount,
      invalidCount,
      rows: validatedRows,
      headers: rawRows.length > 0 ? Object.keys(rawRows[0]) : [],
    };
  });

/**
 * Import products from validated data.
 * Supports create and update modes.
 */
export const importProducts = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      rows: z.array(importRowSchema),
      mode: z.enum(['create_only', 'update_only', 'create_or_update']).default('create_or_update'),
      skipErrors: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate batch size
    if (data.rows.length > MAX_IMPORT_SIZE) {
      throw new ValidationError(
        `Batch size exceeds limit of ${MAX_IMPORT_SIZE} items. Please split into smaller batches.`,
        { rows: [`Maximum ${MAX_IMPORT_SIZE} rows allowed, received ${data.rows.length}`] }
      );
    }

    const results: ImportResult[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Pre-fetch categories for lookup
    const categoryNames = [
      ...new Set(data.rows.filter((r) => r.categoryName).map((r) => r.categoryName!)),
    ];
    const existingCategories =
      categoryNames.length > 0
        ? await db
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(
              and(
                eq(categories.organizationId, ctx.organizationId),
                inArray(categories.name, categoryNames)
              )
            )
        : [];
    const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

    // Pre-fetch existing products by SKU
    const skus = data.rows.map((r) => r.sku);
    const existingProducts = await db
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          inArray(products.sku, skus),
          isNull(products.deletedAt)
        )
      );
    const productMap = new Map(existingProducts.map((p) => [p.sku, p.id]));

    // Process each row
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const existingProductId = productMap.get(row.sku);

      try {
        // Resolve category
        let categoryId: string | null = null;
        if (row.categoryName) {
          categoryId = categoryMap.get(row.categoryName.toLowerCase()) ?? null;
          if (!categoryId) {
            // Create category if doesn't exist
            const [newCategory] = await db
              .insert(categories)
              .values({
                organizationId: ctx.organizationId,
                name: row.categoryName,
                isActive: true,
              })
              .returning({ id: categories.id });
            categoryId = newCategory.id;
            categoryMap.set(row.categoryName.toLowerCase(), categoryId);
          }
        }

        if (existingProductId) {
          // Update existing product
          if (data.mode === 'create_only') {
            results.push({
              row: i + 1,
              sku: row.sku,
              status: 'skipped',
              message: 'Product already exists (create_only mode)',
            });
            skipped++;
            continue;
          }

          await db
            .update(products)
            .set({
              name: row.name,
              description: row.description,
              categoryId,
              type: row.type,
              status: row.status,
              basePrice: row.basePrice,
              costPrice: row.costPrice ?? null,
              weight: row.weight ?? null,
              barcode: row.barcode,
              tags: row.tags ?? [],
              updatedBy: ctx.user.id,
              updatedAt: new Date(),
            })
            .where(eq(products.id, existingProductId));

          results.push({
            row: i + 1,
            sku: row.sku,
            status: 'updated',
            productId: existingProductId,
          });
          updated++;
        } else {
          // Create new product
          if (data.mode === 'update_only') {
            results.push({
              row: i + 1,
              sku: row.sku,
              status: 'skipped',
              message: 'Product not found (update_only mode)',
            });
            skipped++;
            continue;
          }

          const [newProduct] = await db
            .insert(products)
            .values({
              organizationId: ctx.organizationId,
              sku: row.sku,
              name: row.name,
              description: row.description,
              categoryId,
              type: row.type ?? 'physical',
              status: row.status ?? 'active',
              basePrice: row.basePrice,
              costPrice: row.costPrice ?? null,
              weight: row.weight ?? null,
              barcode: row.barcode,
              tags: row.tags ?? [],
              isSellable: true,
              isPurchasable: true,
              trackInventory: true,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            })
            .returning({ id: products.id });

          results.push({
            row: i + 1,
            sku: row.sku,
            status: 'created',
            productId: newProduct.id,
          });
          created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          row: i + 1,
          sku: row.sku,
          status: 'error',
          message,
        });
        errors++;

        if (!data.skipErrors) {
          throw new ValidationError(`Import failed at row ${i + 1}: ${message}`, {
            import: [`Row ${i + 1}: ${message}`],
          });
        }
      }
    }

    return {
      success: errors === 0,
      totalProcessed: data.rows.length,
      created,
      updated,
      skipped,
      errors,
      results,
    };
  });

// ============================================================================
// BULK UPDATE OPERATIONS
// ============================================================================

/**
 * Bulk update multiple products with the same field values.
 */
export const bulkUpdateProducts = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productIds: z.array(z.string().uuid()).min(1),
      updates: z.object({
        status: z.enum(['active', 'inactive', 'discontinued']).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        isSellable: z.boolean().optional(),
        isPurchasable: z.boolean().optional(),
        trackInventory: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate batch size
    if (data.productIds.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size exceeds limit of ${MAX_BATCH_SIZE} items. Please split into smaller batches.`,
        {
          productIds: [
            `Maximum ${MAX_BATCH_SIZE} products allowed, received ${data.productIds.length}`,
          ],
        }
      );
    }

    // Verify all products exist and belong to organization
    const existingProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          inArray(products.id, data.productIds),
          isNull(products.deletedAt)
        )
      );

    if (existingProducts.length !== data.productIds.length) {
      throw new ValidationError('Some products not found', {
        productIds: ['One or more products not found or already deleted'],
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (data.updates.status !== undefined) {
      updateData.status = data.updates.status;
    }
    if (data.updates.categoryId !== undefined) {
      updateData.categoryId = data.updates.categoryId;
    }
    if (data.updates.isSellable !== undefined) {
      updateData.isSellable = data.updates.isSellable;
    }
    if (data.updates.isPurchasable !== undefined) {
      updateData.isPurchasable = data.updates.isPurchasable;
    }
    if (data.updates.trackInventory !== undefined) {
      updateData.trackInventory = data.updates.trackInventory;
    }
    if (data.updates.tags !== undefined) {
      updateData.tags = data.updates.tags;
    }

    await db
      .update(products)
      .set(updateData)
      .where(
        and(eq(products.organizationId, ctx.organizationId), inArray(products.id, data.productIds))
      );

    return {
      success: true,
      updatedCount: data.productIds.length,
    };
  });

/**
 * Bulk update product prices with optional percentage adjustment.
 */
export const bulkUpdatePrices = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productIds: z.array(z.string().uuid()).min(1),
      adjustment: z.discriminatedUnion('type', [
        z.object({
          type: z.literal('percentage'),
          value: z.number().min(-100).max(1000), // -100% to +1000%
          applyTo: z.enum(['basePrice', 'costPrice', 'both']).default('basePrice'),
        }),
        z.object({
          type: z.literal('fixed'),
          basePrice: z.number().min(0).optional(),
          costPrice: z.number().min(0).optional(),
        }),
      ]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate batch size
    if (data.productIds.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size exceeds limit of ${MAX_BATCH_SIZE} items. Please split into smaller batches.`,
        {
          productIds: [
            `Maximum ${MAX_BATCH_SIZE} products allowed, received ${data.productIds.length}`,
          ],
        }
      );
    }

    // Fetch current prices
    const currentProducts = await db
      .select({
        id: products.id,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          inArray(products.id, data.productIds),
          isNull(products.deletedAt)
        )
      );

    if (currentProducts.length !== data.productIds.length) {
      throw new ValidationError('Some products not found', {
        productIds: ['One or more products not found'],
      });
    }

    let updatedCount = 0;

    if (data.adjustment.type === 'percentage') {
      const multiplier = 1 + data.adjustment.value / 100;
      const applyToBase =
        data.adjustment.applyTo === 'basePrice' || data.adjustment.applyTo === 'both';
      const applyToCost =
        data.adjustment.applyTo === 'costPrice' || data.adjustment.applyTo === 'both';

      // Single UPDATE using CASE/WHEN for percentage adjustments
      await db.execute(sql`
        UPDATE products
        SET
          base_price = CASE
            WHEN ${applyToBase}
            THEN ROUND(CAST(base_price AS numeric) * ${multiplier}, 2)::text
            ELSE base_price
          END,
          cost_price = CASE
            WHEN ${applyToCost} AND cost_price IS NOT NULL AND CAST(cost_price AS numeric) > 0
            THEN ROUND(CAST(cost_price AS numeric) * ${multiplier}, 2)::text
            ELSE cost_price
          END,
          updated_by = ${ctx.user.id},
          updated_at = NOW()
        WHERE id = ANY(${data.productIds}::uuid[])
          AND organization_id = ${ctx.organizationId}
          AND deleted_at IS NULL
      `);

      updatedCount = currentProducts.length;
    } else {
      // Fixed price update
      const updates: Record<string, unknown> = {
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      };

      if (data.adjustment.basePrice !== undefined) {
        updates.basePrice = String(data.adjustment.basePrice);
      }
      if (data.adjustment.costPrice !== undefined) {
        updates.costPrice = String(data.adjustment.costPrice);
      }

      await db
        .update(products)
        .set(updates)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            inArray(products.id, data.productIds)
          )
        );

      updatedCount = data.productIds.length;
    }

    return {
      success: true,
      updatedCount,
    };
  });

/**
 * Bulk delete (soft) products.
 */
export const bulkDeleteProducts = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productIds: z.array(z.string().uuid()).min(1),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate batch size
    if (data.productIds.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size exceeds limit of ${MAX_BATCH_SIZE} items. Please split into smaller batches.`,
        {
          productIds: [
            `Maximum ${MAX_BATCH_SIZE} products allowed, received ${data.productIds.length}`,
          ],
        }
      );
    }

    // Soft delete
    await db
      .update(products)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          inArray(products.id, data.productIds),
          isNull(products.deletedAt)
        )
      );

    return {
      success: true,
      deletedCount: data.productIds.length,
    };
  });

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

/**
 * Export products to CSV format.
 */
export const exportProducts = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      categoryId: z.string().uuid().optional(),
      status: z.enum(['active', 'inactive', 'discontinued']).optional(),
      type: z.enum(['physical', 'service', 'digital', 'bundle']).optional(),
      productIds: z.array(z.string().uuid()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
    ];

    if (data.categoryId) {
      conditions.push(eq(products.categoryId, data.categoryId));
    }
    if (data.status) {
      conditions.push(eq(products.status, data.status));
    }
    if (data.type) {
      conditions.push(eq(products.type, data.type));
    }
    if (data.productIds && data.productIds.length > 0) {
      conditions.push(inArray(products.id, data.productIds));
    }

    const exportProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        description: products.description,
        type: products.type,
        status: products.status,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
        weight: products.weight,
        barcode: products.barcode,
        tags: products.tags,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions));

    // Build CSV content
    const headers = [
      'SKU',
      'Name',
      'Description',
      'Category',
      'Type',
      'Status',
      'Base Price',
      'Cost Price',
      'Weight',
      'Barcode',
      'Tags',
    ];

    const rows = exportProducts.map((p) => [
      escapeCSV(p.sku),
      escapeCSV(p.name),
      escapeCSV(p.description ?? ''),
      escapeCSV(p.categoryName ?? ''),
      escapeCSV(p.type),
      escapeCSV(p.status),
      p.basePrice,
      p.costPrice ?? '',
      p.weight ?? '',
      escapeCSV(p.barcode ?? ''),
      escapeCSV((p.tags ?? []).join(', ')),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return {
      content: csvContent,
      filename: `products-export-${new Date().toISOString().split('T')[0]}.csv`,
      rowCount: exportProducts.length,
    };
  });

/**
 * Escape a value for CSV output.
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// HELPER OPERATIONS
// ============================================================================

/**
 * Get import template CSV.
 */
export const getImportTemplate = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    await withAuth();

    const headers = [
      'SKU',
      'Name',
      'Description',
      'Category',
      'Type',
      'Status',
      'Base Price',
      'Cost Price',
      'Weight',
      'Barcode',
      'Tags',
    ];

    const exampleRow = [
      'PROD-001',
      'Example Product',
      'Product description here',
      'Category Name',
      'physical',
      'active',
      '99.99',
      '49.99',
      '1.5',
      '1234567890123',
      'tag1, tag2, tag3',
    ];

    const content = [headers.join(','), exampleRow.join(',')].join('\n');

    return {
      content,
      filename: 'product-import-template.csv',
    };
  });
