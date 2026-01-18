/**
 * Product Attributes Server Functions
 *
 * Attribute definitions and values management.
 * Supports dynamic attributes with type validation.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, asc, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  products,
  productAttributes,
  productAttributeValues,
  type AttributeOptions,
} from "../../../../drizzle/schema";
import { withAuth } from "../protected";
import { NotFoundError, ValidationError } from "../errors";

// ============================================================================
// TYPES
// ============================================================================

type ProductAttribute = typeof productAttributes.$inferSelect;

// Attribute types from schema
const ATTRIBUTE_TYPES = [
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
  "date",
] as const;

type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

// Value type based on attribute type
type AttributeValueType =
  | string
  | number
  | boolean
  | string[]
  | null;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate an attribute value against its definition.
 */
function validateAttributeValue(
  value: unknown,
  attributeType: AttributeType,
  options?: AttributeOptions,
  isRequired?: boolean
): { valid: boolean; error?: string; normalizedValue?: AttributeValueType } {
  // Check required
  if (value === null || value === undefined || value === "") {
    if (isRequired) {
      return { valid: false, error: "This attribute is required" };
    }
    return { valid: true, normalizedValue: null };
  }

  switch (attributeType) {
    case "text": {
      if (typeof value !== "string") {
        return { valid: false, error: "Value must be text" };
      }
      return { valid: true, normalizedValue: value };
    }

    case "number": {
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (typeof num !== "number" || isNaN(num)) {
        return { valid: false, error: "Value must be a number" };
      }
      if (options?.min !== undefined && num < options.min) {
        return { valid: false, error: `Value must be at least ${options.min}` };
      }
      if (options?.max !== undefined && num > options.max) {
        return { valid: false, error: `Value must be at most ${options.max}` };
      }
      return { valid: true, normalizedValue: num };
    }

    case "boolean": {
      if (typeof value === "boolean") {
        return { valid: true, normalizedValue: value };
      }
      if (value === "true" || value === "1") {
        return { valid: true, normalizedValue: true };
      }
      if (value === "false" || value === "0") {
        return { valid: true, normalizedValue: false };
      }
      return { valid: false, error: "Value must be true or false" };
    }

    case "select": {
      if (typeof value !== "string") {
        return { valid: false, error: "Value must be a string" };
      }
      const choices = options?.choices?.map((c) => c.value) ?? [];
      if (choices.length > 0 && !choices.includes(value)) {
        return { valid: false, error: `Value must be one of: ${choices.join(", ")}` };
      }
      return { valid: true, normalizedValue: value };
    }

    case "multiselect": {
      let values: string[];
      if (Array.isArray(value)) {
        values = value;
      } else if (typeof value === "string") {
        values = value.split(",").map((v) => v.trim());
      } else {
        return { valid: false, error: "Value must be an array or comma-separated string" };
      }

      const choices = options?.choices?.map((c) => c.value) ?? [];
      if (choices.length > 0) {
        const invalid = values.filter((v) => !choices.includes(v));
        if (invalid.length > 0) {
          return { valid: false, error: `Invalid values: ${invalid.join(", ")}` };
        }
      }
      return { valid: true, normalizedValue: values };
    }

    case "date": {
      if (typeof value !== "string") {
        return { valid: false, error: "Date must be a string" };
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: "Invalid date format" };
      }
      return { valid: true, normalizedValue: value };
    }

    default:
      return { valid: false, error: "Unknown attribute type" };
  }
}

// ============================================================================
// ATTRIBUTE DEFINITION CRUD
// ============================================================================

/**
 * List all attribute definitions.
 */
export const listAttributes = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        activeOnly: z.boolean().default(true),
        categoryId: z.string().uuid().optional(),
      })
      .optional()
  )
  .handler(async ({ data }): Promise<ProductAttribute[]> => {
    const ctx = await withAuth();

    let query = db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.organizationId, ctx.organizationId))
      .orderBy(asc(productAttributes.sortOrder));

    const results = await query;

    // Filter by active status
    let filtered = results;
    if (data?.activeOnly !== false) {
      filtered = filtered.filter((a) => a.isActive);
    }

    // Filter by category if provided
    if (data?.categoryId) {
      filtered = filtered.filter((a) => {
        const categoryIds = a.categoryIds as string[];
        // Empty array means applies to all categories
        return categoryIds.length === 0 || categoryIds.includes(data.categoryId!);
      });
    }

    return filtered;
  });

/**
 * Get a single attribute by ID.
 */
export const getAttribute = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductAttribute> => {
    const ctx = await withAuth();

    const [attribute] = await db
      .select()
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.id, data.id),
          eq(productAttributes.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!attribute) {
      throw new NotFoundError("Attribute not found", "productAttribute");
    }

    return attribute;
  });

/**
 * Create a new attribute definition.
 */
export const createAttribute = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100),
      attributeType: z.enum(ATTRIBUTE_TYPES),
      description: z.string().max(500).optional(),
      options: z
        .object({
          choices: z
            .array(
              z.object({
                value: z.string(),
                label: z.string(),
                sortOrder: z.number().optional(),
              })
            )
            .optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          step: z.number().optional(),
          placeholder: z.string().optional(),
        })
        .optional(),
      isRequired: z.boolean().default(false),
      isFilterable: z.boolean().default(false),
      isSearchable: z.boolean().default(false),
      categoryIds: z.array(z.string().uuid()).default([]),
      sortOrder: z.number().int().default(0),
    })
  )
  .handler(async ({ data }): Promise<ProductAttribute> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Validate choices for select/multiselect
    if (
      (data.attributeType === "select" || data.attributeType === "multiselect") &&
      (!data.options?.choices || data.options.choices.length === 0)
    ) {
      throw new ValidationError("Select attributes require at least one choice", {
        options: ["At least one choice is required"],
      });
    }

    const [attribute] = await db
      .insert(productAttributes)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        attributeType: data.attributeType,
        description: data.description,
        options: (data.options ?? {}) as AttributeOptions,
        isRequired: data.isRequired,
        isFilterable: data.isFilterable,
        isSearchable: data.isSearchable,
        categoryIds: data.categoryIds,
        sortOrder: data.sortOrder,
        createdBy: ctx.user.id,
      })
      .returning();

    return attribute;
  });

/**
 * Update an attribute definition.
 */
export const updateAttribute = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      options: z
        .object({
          choices: z
            .array(
              z.object({
                value: z.string(),
                label: z.string(),
                sortOrder: z.number().optional(),
              })
            )
            .optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          step: z.number().optional(),
          placeholder: z.string().optional(),
        })
        .optional(),
      isRequired: z.boolean().optional(),
      isFilterable: z.boolean().optional(),
      isSearchable: z.boolean().optional(),
      categoryIds: z.array(z.string().uuid()).optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .handler(async ({ data }): Promise<ProductAttribute> => {
    const ctx = await withAuth({ permission: "product.update" });
    const { id, ...updateData } = data;

    // Verify attribute exists
    const [existing] = await db
      .select()
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.id, id),
          eq(productAttributes.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Attribute not found", "productAttribute");
    }

    // Build update object
    const updates: Partial<typeof productAttributes.$inferInsert> = {};

    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.options !== undefined) updates.options = updateData.options as AttributeOptions;
    if (updateData.isRequired !== undefined) updates.isRequired = updateData.isRequired;
    if (updateData.isFilterable !== undefined) updates.isFilterable = updateData.isFilterable;
    if (updateData.isSearchable !== undefined) updates.isSearchable = updateData.isSearchable;
    if (updateData.categoryIds !== undefined) updates.categoryIds = updateData.categoryIds;
    if (updateData.sortOrder !== undefined) updates.sortOrder = updateData.sortOrder;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    const [updated] = await db
      .update(productAttributes)
      .set(updates)
      .where(eq(productAttributes.id, id))
      .returning();

    return updated;
  });

/**
 * Delete an attribute definition.
 * Also deletes all values for this attribute.
 */
export const deleteAttribute = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean; valuesDeleted: number }> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Verify attribute exists
    const [existing] = await db
      .select()
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.id, data.id),
          eq(productAttributes.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Attribute not found", "productAttribute");
    }

    // Delete all values for this attribute
    const deletedValues = await db
      .delete(productAttributeValues)
      .where(
        and(
          eq(productAttributeValues.attributeId, data.id),
          eq(productAttributeValues.organizationId, ctx.organizationId)
        )
      )
      .returning();

    // Delete the attribute
    await db.delete(productAttributes).where(eq(productAttributes.id, data.id));

    return { success: true, valuesDeleted: deletedValues.length };
  });

// ============================================================================
// ATTRIBUTE VALUES CRUD
// ============================================================================

/**
 * Get all attribute values for a product.
 */
export const getProductAttributeValues = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      Array<{
        attributeId: string;
        attributeName: string;
        attributeType: string;
        value: AttributeValueType;
        isRequired: boolean;
      }>
    > => {
      const ctx = await withAuth();

      // Get product's category
      const [product] = await db
        .select({ categoryId: products.categoryId })
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

      // Get applicable attributes
      const attributes = await db
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.organizationId, ctx.organizationId),
            eq(productAttributes.isActive, true)
          )
        )
        .orderBy(asc(productAttributes.sortOrder));

      // Filter by category
      const applicableAttributes = attributes.filter((a) => {
        const categoryIds = a.categoryIds as string[];
        if (categoryIds.length === 0) return true; // Applies to all
        return product.categoryId && categoryIds.includes(product.categoryId);
      });

      // Get existing values
      const values = await db
        .select()
        .from(productAttributeValues)
        .where(
          and(
            eq(productAttributeValues.productId, data.productId),
            eq(productAttributeValues.organizationId, ctx.organizationId)
          )
        );

      // Map values to attributes
      const valueMap = new Map(values.map((v) => [v.attributeId, v.value]));

      return applicableAttributes.map((attr) => ({
        attributeId: attr.id,
        attributeName: attr.name,
        attributeType: attr.attributeType,
        value: (valueMap.get(attr.id) as AttributeValueType) ?? null,
        isRequired: attr.isRequired,
      }));
    }
  );

/**
 * Set a single attribute value for a product.
 */
export const setProductAttribute = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      attributeId: z.string().uuid(),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
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

    // Get attribute definition
    const [attribute] = await db
      .select()
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.id, data.attributeId),
          eq(productAttributes.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!attribute) {
      throw new NotFoundError("Attribute not found", "productAttribute");
    }

    // Validate value
    const validation = validateAttributeValue(
      data.value,
      attribute.attributeType as AttributeType,
      attribute.options as AttributeOptions,
      attribute.isRequired
    );

    if (!validation.valid) {
      throw new ValidationError(validation.error!, {
        value: [validation.error!],
      });
    }

    // If value is null and not required, delete the value record
    if (validation.normalizedValue === null) {
      await db
        .delete(productAttributeValues)
        .where(
          and(
            eq(productAttributeValues.productId, data.productId),
            eq(productAttributeValues.attributeId, data.attributeId),
            eq(productAttributeValues.organizationId, ctx.organizationId)
          )
        );
      return { success: true };
    }

    // Upsert the value
    await db
      .insert(productAttributeValues)
      .values({
        organizationId: ctx.organizationId,
        productId: data.productId,
        attributeId: data.attributeId,
        value: validation.normalizedValue as typeof productAttributeValues.$inferInsert.value,
      })
      .onConflictDoUpdate({
        target: [
          productAttributeValues.organizationId,
          productAttributeValues.productId,
          productAttributeValues.attributeId,
        ],
        set: {
          value: validation.normalizedValue as typeof productAttributeValues.$inferInsert.value,
          updatedAt: new Date(),
        },
      });

    return { success: true };
  });

/**
 * Set multiple attribute values for a product at once.
 */
export const setProductAttributes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      values: z.array(
        z.object({
          attributeId: z.string().uuid(),
          value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
        })
      ),
    })
  )
  .handler(
    async ({ data }): Promise<{ success: boolean; errors: Record<string, string> }> => {
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

      // Get all referenced attributes
      const attributeIds = data.values.map((v) => v.attributeId);
      const attributes = await db
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.organizationId, ctx.organizationId),
            inArray(productAttributes.id, attributeIds)
          )
        );

      const attributeMap = new Map(attributes.map((a) => [a.id, a]));

      // Validate all values
      const errors: Record<string, string> = {};
      const validValues: Array<{
        attributeId: string;
        value: AttributeValueType;
      }> = [];

      for (const item of data.values) {
        const attribute = attributeMap.get(item.attributeId);
        if (!attribute) {
          errors[item.attributeId] = "Attribute not found";
          continue;
        }

        const validation = validateAttributeValue(
          item.value,
          attribute.attributeType as AttributeType,
          attribute.options as AttributeOptions,
          attribute.isRequired
        );

        if (!validation.valid) {
          errors[item.attributeId] = validation.error!;
        } else {
          validValues.push({
            attributeId: item.attributeId,
            value: validation.normalizedValue ?? null,
          });
        }
      }

      // If there are errors, return them
      if (Object.keys(errors).length > 0) {
        return { success: false, errors };
      }

      // Apply all valid values in a transaction with batch operations
      await db.transaction(async (tx) => {
        // Separate null and non-null values
        const nullAttributeIds = validValues
          .filter((item) => item.value === null)
          .map((item) => item.attributeId);

        const nonNullValues = validValues.filter((item) => item.value !== null);

        // Batch delete null values
        if (nullAttributeIds.length > 0) {
          await tx
            .delete(productAttributeValues)
            .where(
              and(
                eq(productAttributeValues.productId, data.productId),
                inArray(productAttributeValues.attributeId, nullAttributeIds),
                eq(productAttributeValues.organizationId, ctx.organizationId)
              )
            );
        }

        // Batch upsert non-null values
        if (nonNullValues.length > 0) {
          await tx
            .insert(productAttributeValues)
            .values(
              nonNullValues.map((item) => ({
                organizationId: ctx.organizationId,
                productId: data.productId,
                attributeId: item.attributeId,
                value: item.value as typeof productAttributeValues.$inferInsert.value,
              }))
            )
            .onConflictDoUpdate({
              target: [
                productAttributeValues.organizationId,
                productAttributeValues.productId,
                productAttributeValues.attributeId,
              ],
              set: {
                value: sql`EXCLUDED.value`,
                updatedAt: new Date(),
              },
            });
        }
      });

      return { success: true, errors: {} };
    }
  );

/**
 * Delete a single attribute value from a product.
 */
export const deleteProductAttribute = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      attributeId: z.string().uuid(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: "product.update" });

    await db
      .delete(productAttributeValues)
      .where(
        and(
          eq(productAttributeValues.productId, data.productId),
          eq(productAttributeValues.attributeId, data.attributeId),
          eq(productAttributeValues.organizationId, ctx.organizationId)
        )
      );

    return { success: true };
  });

// ============================================================================
// VALIDATION & UTILITIES
// ============================================================================

/**
 * Check if a product has all required attributes filled.
 */
export const checkRequiredAttributes = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<{
      complete: boolean;
      missing: Array<{ attributeId: string; attributeName: string }>;
    }> => {
      const ctx = await withAuth();

      // Get product's category
      const [product] = await db
        .select({ categoryId: products.categoryId })
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

      // Get required attributes for this product's category
      const attributes = await db
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.organizationId, ctx.organizationId),
            eq(productAttributes.isActive, true),
            eq(productAttributes.isRequired, true)
          )
        );

      // Filter by category
      const requiredAttributes = attributes.filter((a) => {
        const categoryIds = a.categoryIds as string[];
        if (categoryIds.length === 0) return true;
        return product.categoryId && categoryIds.includes(product.categoryId);
      });

      if (requiredAttributes.length === 0) {
        return { complete: true, missing: [] };
      }

      // Get existing values
      const values = await db
        .select({ attributeId: productAttributeValues.attributeId })
        .from(productAttributeValues)
        .where(
          and(
            eq(productAttributeValues.productId, data.productId),
            eq(productAttributeValues.organizationId, ctx.organizationId),
            inArray(
              productAttributeValues.attributeId,
              requiredAttributes.map((a) => a.id)
            )
          )
        );

      const filledIds = new Set(values.map((v) => v.attributeId));

      // Find missing required attributes
      const missing = requiredAttributes
        .filter((a) => !filledIds.has(a.id))
        .map((a) => ({ attributeId: a.id, attributeName: a.name }));

      return {
        complete: missing.length === 0,
        missing,
      };
    }
  );

/**
 * Get filterable attributes with their possible values.
 * Useful for building filter interfaces.
 */
export const getFilterableAttributes = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        categoryId: z.string().uuid().optional(),
      })
      .optional()
  )
  .handler(
    async ({
      data,
    }): Promise<
      Array<{
        id: string;
        name: string;
        attributeType: string;
        options: AttributeOptions;
      }>
    > => {
      const ctx = await withAuth();

      const attributes = await db
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.organizationId, ctx.organizationId),
            eq(productAttributes.isActive, true),
            eq(productAttributes.isFilterable, true)
          )
        )
        .orderBy(asc(productAttributes.sortOrder));

      // Filter by category if provided
      const filtered = data?.categoryId
        ? attributes.filter((a) => {
            const categoryIds = a.categoryIds as string[];
            return categoryIds.length === 0 || categoryIds.includes(data.categoryId!);
          })
        : attributes;

      return filtered.map((a) => ({
        id: a.id,
        name: a.name,
        attributeType: a.attributeType,
        options: a.options as AttributeOptions,
      }));
    }
  );
