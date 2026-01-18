/**
 * Product Bundles Server Functions
 *
 * Bundle CRUD, component management, price calculation, and expansion.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, asc, isNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, productBundles } from "../../../../drizzle/schema";
import { withAuth } from "../protected";
import { NotFoundError, ValidationError } from "../errors";
import { bundleComponentSchema, createBundleSchema } from "@/lib/schemas/products";

// ============================================================================
// TYPES
// ============================================================================

type ProductBundle = typeof productBundles.$inferSelect;
type Product = typeof products.$inferSelect;

interface BundleComponent extends ProductBundle {
  componentProduct: Pick<Product, "id" | "sku" | "name" | "basePrice" | "type" | "status">;
}

interface BundleWithComponents {
  bundleProduct: Pick<Product, "id" | "sku" | "name" | "basePrice" | "type" | "status" | "description">;
  components: BundleComponent[];
  calculatedPrice: number;
  componentCount: number;
}

interface ExpandedBundleItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  isOptional: boolean;
}

// ============================================================================
// BUNDLE CRUD
// ============================================================================

/**
 * Get all components of a bundle product.
 */
export const getBundleComponents = createServerFn({ method: "GET" })
  .inputValidator(z.object({ bundleProductId: z.string().uuid() }))
  .handler(async ({ data }): Promise<BundleWithComponents> => {
    const ctx = await withAuth();

    // Get the bundle product
    const [bundleProduct] = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        basePrice: products.basePrice,
        type: products.type,
        status: products.status,
        description: products.description,
      })
      .from(products)
      .where(
        and(
          eq(products.id, data.bundleProductId),
          eq(products.organizationId, ctx.organizationId),
          eq(products.type, "bundle"),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!bundleProduct) {
      throw new NotFoundError("Bundle product not found", "bundleProduct");
    }

    // Get bundle components with product details
    const bundleComponents = await db
      .select({
        id: productBundles.id,
        organizationId: productBundles.organizationId,
        bundleProductId: productBundles.bundleProductId,
        componentProductId: productBundles.componentProductId,
        quantity: productBundles.quantity,
        isOptional: productBundles.isOptional,
        sortOrder: productBundles.sortOrder,
        createdAt: productBundles.createdAt,
      })
      .from(productBundles)
      .where(
        and(
          eq(productBundles.organizationId, ctx.organizationId),
          eq(productBundles.bundleProductId, data.bundleProductId)
        )
      )
      .orderBy(asc(productBundles.sortOrder));

    // Get component product details
    const componentIds = bundleComponents.map((c) => c.componentProductId);
    const componentProducts =
      componentIds.length > 0
        ? await db
            .select({
              id: products.id,
              sku: products.sku,
              name: products.name,
              basePrice: products.basePrice,
              type: products.type,
              status: products.status,
            })
            .from(products)
            .where(
              and(
                inArray(products.id, componentIds),
                eq(products.organizationId, ctx.organizationId),
                isNull(products.deletedAt)
              )
            )
        : [];

    const productMap = new Map(componentProducts.map((p) => [p.id, p]));

    const components: BundleComponent[] = bundleComponents.map((bc) => ({
      ...bc,
      componentProduct: productMap.get(bc.componentProductId) ?? {
        id: bc.componentProductId,
        sku: "UNKNOWN",
        name: "Unknown Product",
        basePrice: 0,
        type: "physical" as const,
        status: "inactive" as const,
      },
    }));

    // Calculate total component price
    const calculatedPrice = components.reduce((sum, c) => {
      if (!c.isOptional) {
        return sum + (c.componentProduct.basePrice ?? 0) * c.quantity;
      }
      return sum;
    }, 0);

    return {
      bundleProduct,
      components,
      calculatedPrice,
      componentCount: components.length,
    };
  });

/**
 * Set bundle components (replaces all existing).
 */
export const setBundleComponents = createServerFn({ method: "POST" })
  .inputValidator(createBundleSchema)
  .handler(async ({ data }): Promise<BundleComponent[]> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Verify bundle product exists and is a bundle type
    const [bundleProduct] = await db
      .select({ id: products.id, type: products.type })
      .from(products)
      .where(
        and(
          eq(products.id, data.bundleProductId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!bundleProduct) {
      throw new NotFoundError("Product not found", "bundleProduct");
    }

    if (bundleProduct.type !== "bundle") {
      throw new ValidationError("Product is not a bundle type", {
        bundleProductId: ["Product must have type 'bundle'"],
      });
    }

    // Verify all component products exist
    const componentIds = data.components.map((c) => c.componentProductId);
    const validProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          inArray(products.id, componentIds),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      );

    const validIds = new Set(validProducts.map((p) => p.id));
    const invalidIds = componentIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new ValidationError("Some component products not found", {
        components: [`Invalid product IDs: ${invalidIds.join(", ")}`],
      });
    }

    // Check for self-reference
    if (componentIds.includes(data.bundleProductId)) {
      throw new ValidationError("Bundle cannot contain itself", {
        components: ["A bundle cannot include itself as a component"],
      });
    }

    // Delete existing components
    await db
      .delete(productBundles)
      .where(
        and(
          eq(productBundles.organizationId, ctx.organizationId),
          eq(productBundles.bundleProductId, data.bundleProductId)
        )
      );

    if (data.components.length === 0) {
      return [];
    }

    // Insert new components
    const newComponents = await db
      .insert(productBundles)
      .values(
        data.components.map((c, index) => ({
          organizationId: ctx.organizationId,
          bundleProductId: data.bundleProductId,
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          isOptional: c.isOptional ?? false,
          sortOrder: index,
        }))
      )
      .returning();

    // Get component product details
    const componentProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        basePrice: products.basePrice,
        type: products.type,
        status: products.status,
      })
      .from(products)
      .where(inArray(products.id, componentIds));

    const productMap = new Map(componentProducts.map((p) => [p.id, p]));

    return newComponents.map((bc) => ({
      ...bc,
      componentProduct: productMap.get(bc.componentProductId)!,
    }));
  });

/**
 * Add a component to a bundle.
 */
export const addBundleComponent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      bundleProductId: z.string().uuid(),
      component: bundleComponentSchema,
    })
  )
  .handler(async ({ data }): Promise<BundleComponent> => {
    const ctx = await withAuth({ permission: "product.update" });

    // Verify bundle product
    const [bundleProduct] = await db
      .select({ id: products.id, type: products.type })
      .from(products)
      .where(
        and(
          eq(products.id, data.bundleProductId),
          eq(products.organizationId, ctx.organizationId),
          eq(products.type, "bundle"),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!bundleProduct) {
      throw new NotFoundError("Bundle product not found", "bundleProduct");
    }

    // Verify component product
    const [componentProduct] = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        basePrice: products.basePrice,
        type: products.type,
        status: products.status,
      })
      .from(products)
      .where(
        and(
          eq(products.id, data.component.componentProductId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!componentProduct) {
      throw new NotFoundError("Component product not found", "componentProduct");
    }

    // Check for self-reference
    if (data.component.componentProductId === data.bundleProductId) {
      throw new ValidationError("Bundle cannot contain itself", {
        componentProductId: ["A bundle cannot include itself"],
      });
    }

    // Check if component already exists
    const [existing] = await db
      .select({ id: productBundles.id })
      .from(productBundles)
      .where(
        and(
          eq(productBundles.organizationId, ctx.organizationId),
          eq(productBundles.bundleProductId, data.bundleProductId),
          eq(productBundles.componentProductId, data.component.componentProductId)
        )
      )
      .limit(1);

    if (existing) {
      throw new ValidationError("Component already in bundle", {
        componentProductId: ["This product is already a component of this bundle"],
      });
    }

    // Get max sort order
    const [maxSort] = await db
      .select({ max: productBundles.sortOrder })
      .from(productBundles)
      .where(
        and(
          eq(productBundles.organizationId, ctx.organizationId),
          eq(productBundles.bundleProductId, data.bundleProductId)
        )
      )
      .limit(1);

    const sortOrder = (maxSort?.max ?? -1) + 1;

    // Insert component
    const [newComponent] = await db
      .insert(productBundles)
      .values({
        organizationId: ctx.organizationId,
        bundleProductId: data.bundleProductId,
        componentProductId: data.component.componentProductId,
        quantity: data.component.quantity,
        isOptional: data.component.isOptional ?? false,
        sortOrder,
      })
      .returning();

    return {
      ...newComponent,
      componentProduct,
    };
  });

/**
 * Update a bundle component.
 */
export const updateBundleComponent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      quantity: z.number().int().positive().optional(),
      isOptional: z.boolean().optional(),
      sortOrder: z.number().int().min(0).optional(),
    })
  )
  .handler(async ({ data }): Promise<ProductBundle> => {
    const ctx = await withAuth({ permission: "product.update" });
    const { id, ...updateData } = data;

    const [existing] = await db
      .select()
      .from(productBundles)
      .where(
        and(
          eq(productBundles.id, id),
          eq(productBundles.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Bundle component not found", "bundleComponent");
    }

    const [updated] = await db
      .update(productBundles)
      .set(updateData)
      .where(eq(productBundles.id, id))
      .returning();

    return updated;
  });

/**
 * Remove a component from a bundle.
 */
export const removeBundleComponent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: "product.update" });

    const [existing] = await db
      .select({ id: productBundles.id })
      .from(productBundles)
      .where(
        and(
          eq(productBundles.id, data.id),
          eq(productBundles.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Bundle component not found", "bundleComponent");
    }

    await db.delete(productBundles).where(eq(productBundles.id, data.id));

    return { success: true };
  });

// ============================================================================
// BUNDLE PRICE CALCULATION
// ============================================================================

/**
 * Calculate the total price of a bundle based on components.
 */
export const calculateBundlePrice = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      bundleProductId: z.string().uuid(),
      includeOptional: z.boolean().default(false),
    })
  )
  .handler(
    async ({
      data,
    }): Promise<{
      bundlePrice: number;
      componentTotal: number;
      savings: number;
      savingsPercent: number;
      breakdown: Array<{
        productId: string;
        sku: string;
        name: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        isOptional: boolean;
      }>;
    }> => {
      const ctx = await withAuth();

      // Get bundle product and its base price
      const [bundleProduct] = await db
        .select({ id: products.id, basePrice: products.basePrice })
        .from(products)
        .where(
          and(
            eq(products.id, data.bundleProductId),
            eq(products.organizationId, ctx.organizationId),
            eq(products.type, "bundle"),
            isNull(products.deletedAt)
          )
        )
        .limit(1);

      if (!bundleProduct) {
        throw new NotFoundError("Bundle product not found", "bundleProduct");
      }

      // Get components
      const bundleComponents = await db
        .select()
        .from(productBundles)
        .where(
          and(
            eq(productBundles.organizationId, ctx.organizationId),
            eq(productBundles.bundleProductId, data.bundleProductId)
          )
        )
        .orderBy(asc(productBundles.sortOrder));

      const componentIds = bundleComponents.map((c) => c.componentProductId);
      const componentProducts =
        componentIds.length > 0
          ? await db
              .select({
                id: products.id,
                sku: products.sku,
                name: products.name,
                basePrice: products.basePrice,
              })
              .from(products)
              .where(inArray(products.id, componentIds))
          : [];

      const productMap = new Map(componentProducts.map((p) => [p.id, p]));

      const breakdown = bundleComponents
        .filter((c) => data.includeOptional || !c.isOptional)
        .map((c) => {
          const product = productMap.get(c.componentProductId);
          const unitPrice = product?.basePrice ?? 0;
          return {
            productId: c.componentProductId,
            sku: product?.sku ?? "UNKNOWN",
            name: product?.name ?? "Unknown",
            quantity: c.quantity,
            unitPrice,
            lineTotal: unitPrice * c.quantity,
            isOptional: c.isOptional,
          };
        });

      const componentTotal = breakdown.reduce((sum, item) => sum + item.lineTotal, 0);
      const bundlePrice = bundleProduct.basePrice ?? componentTotal;
      const savings = componentTotal - bundlePrice;
      const savingsPercent = componentTotal > 0 ? (savings / componentTotal) * 100 : 0;

      return {
        bundlePrice,
        componentTotal,
        savings,
        savingsPercent,
        breakdown,
      };
    }
  );

// ============================================================================
// BUNDLE EXPANSION (FOR ORDERS)
// ============================================================================

/**
 * Expand a bundle into its individual components for order processing.
 * This is used when an order includes a bundle to determine what
 * inventory to allocate.
 */
export const expandBundle = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      bundleProductId: z.string().uuid(),
      quantity: z.number().int().positive().default(1),
      excludeOptional: z.boolean().default(true),
    })
  )
  .handler(async ({ data }): Promise<{ items: ExpandedBundleItem[]; totalItems: number }> => {
    const ctx = await withAuth();

    // Get components
    const bundleComponents = await db
      .select()
      .from(productBundles)
      .where(
        and(
          eq(productBundles.organizationId, ctx.organizationId),
          eq(productBundles.bundleProductId, data.bundleProductId)
        )
      )
      .orderBy(asc(productBundles.sortOrder));

    if (bundleComponents.length === 0) {
      throw new ValidationError("Bundle has no components", {
        bundleProductId: ["This bundle has no component products defined"],
      });
    }

    // Filter by optional flag if needed
    const filteredComponents = data.excludeOptional
      ? bundleComponents.filter((c) => !c.isOptional)
      : bundleComponents;

    // Get product details
    const componentIds = filteredComponents.map((c) => c.componentProductId);
    const componentProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        basePrice: products.basePrice,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, componentIds),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      );

    const productMap = new Map(componentProducts.map((p) => [p.id, p]));

    const items: ExpandedBundleItem[] = filteredComponents.map((c) => {
      const product = productMap.get(c.componentProductId);
      return {
        productId: c.componentProductId,
        sku: product?.sku ?? "UNKNOWN",
        name: product?.name ?? "Unknown Product",
        quantity: c.quantity * data.quantity, // Multiply by bundle quantity
        unitPrice: product?.basePrice ?? 0,
        isOptional: c.isOptional,
      };
    });

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return { items, totalItems };
  });

// ============================================================================
// BUNDLE VALIDATION
// ============================================================================

/**
 * Validate a bundle configuration.
 * Checks for circular references, missing products, inventory availability.
 */
export const validateBundle = createServerFn({ method: "GET" })
  .inputValidator(z.object({ bundleProductId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<{
      valid: boolean;
      errors: string[];
      warnings: string[];
    }> => {
      const ctx = await withAuth();
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get bundle product
      const [bundleProduct] = await db
        .select({ id: products.id, type: products.type, status: products.status })
        .from(products)
        .where(
          and(
            eq(products.id, data.bundleProductId),
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt)
          )
        )
        .limit(1);

      if (!bundleProduct) {
        return { valid: false, errors: ["Bundle product not found"], warnings };
      }

      if (bundleProduct.type !== "bundle") {
        return { valid: false, errors: ["Product is not a bundle type"], warnings };
      }

      // Get components
      const bundleComponents = await db
        .select()
        .from(productBundles)
        .where(
          and(
            eq(productBundles.organizationId, ctx.organizationId),
            eq(productBundles.bundleProductId, data.bundleProductId)
          )
        );

      if (bundleComponents.length === 0) {
        errors.push("Bundle has no components defined");
      }

      // Check component products
      const componentIds = bundleComponents.map((c) => c.componentProductId);
      const componentProducts = await db
        .select({ id: products.id, status: products.status, type: products.type })
        .from(products)
        .where(
          and(
            inArray(products.id, componentIds),
            eq(products.organizationId, ctx.organizationId)
          )
        );

      const productMap = new Map(componentProducts.map((p) => [p.id, p]));

      for (const component of bundleComponents) {
        const product = productMap.get(component.componentProductId);

        if (!product) {
          errors.push(`Component product ${component.componentProductId} not found`);
          continue;
        }

        if (product.status === "discontinued") {
          warnings.push(`Component ${component.componentProductId} is discontinued`);
        }

        if (product.status === "inactive") {
          warnings.push(`Component ${component.componentProductId} is inactive`);
        }

        // Check for nested bundles (potential circular reference)
        if (product.type === "bundle") {
          warnings.push(`Component ${component.componentProductId} is itself a bundle (nested bundles)`);
        }
      }

      // Check bundle status
      if (bundleProduct.status === "inactive") {
        warnings.push("Bundle is currently inactive");
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }
  );

/**
 * Find all bundles that contain a specific product.
 */
export const findBundlesContaining = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      Array<{
        bundleId: string;
        bundleSku: string;
        bundleName: string;
        quantity: number;
        isOptional: boolean;
      }>
    > => {
      const ctx = await withAuth();

      // Find bundle components that include this product
      const components = await db
        .select({
          bundleProductId: productBundles.bundleProductId,
          quantity: productBundles.quantity,
          isOptional: productBundles.isOptional,
        })
        .from(productBundles)
        .where(
          and(
            eq(productBundles.organizationId, ctx.organizationId),
            eq(productBundles.componentProductId, data.productId)
          )
        );

      if (components.length === 0) {
        return [];
      }

      // Get bundle product details
      const bundleIds = components.map((c) => c.bundleProductId);
      const bundleProducts = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
        })
        .from(products)
        .where(
          and(
            inArray(products.id, bundleIds),
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt)
          )
        );

      const productMap = new Map(bundleProducts.map((p) => [p.id, p]));

      return components
        .map((c) => {
          const bundle = productMap.get(c.bundleProductId);
          if (!bundle) return null;
          return {
            bundleId: c.bundleProductId,
            bundleSku: bundle.sku,
            bundleName: bundle.name,
            quantity: c.quantity,
            isOptional: c.isOptional,
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
    }
  );
