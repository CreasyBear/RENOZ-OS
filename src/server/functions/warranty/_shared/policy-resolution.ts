/**
 * Shared warranty policy resolution helpers.
 *
 * Resolution order:
 * product override -> category default -> organization default -> organization fallback by type
 */
import { and, asc, eq } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import { categories, products, warrantyPolicies } from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';

export type WarrantyPolicyResolutionSource =
  | 'product'
  | 'category'
  | 'organization_default'
  | 'organization_fallback'
  | null;

interface ResolveWarrantyPolicyTxParams {
  organizationId: string;
  productId?: string;
  categoryId?: string;
  type?: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  throwIfMissing?: boolean;
}

export async function resolveWarrantyPolicyTx(
  executor: TransactionExecutor,
  params: ResolveWarrantyPolicyTxParams
): Promise<{
  policy: typeof warrantyPolicies.$inferSelect | null;
  source: WarrantyPolicyResolutionSource;
}> {
  let derivedCategoryId = params.categoryId ?? null;

  if (params.productId) {
    const [product] = await executor
      .select({
        warrantyPolicyId: products.warrantyPolicyId,
        categoryId: products.categoryId,
      })
      .from(products)
      .where(
        and(
          eq(products.id, params.productId),
          eq(products.organizationId, params.organizationId)
        )
      )
      .limit(1);

    if (!product) {
      if (params.throwIfMissing) {
        throw new NotFoundError('Product not found', 'product');
      }
      return { policy: null, source: null };
    }

    derivedCategoryId = product.categoryId;

    if (product.warrantyPolicyId) {
      const [policy] = await executor
        .select()
        .from(warrantyPolicies)
        .where(
          and(
            eq(warrantyPolicies.id, product.warrantyPolicyId),
            eq(warrantyPolicies.organizationId, params.organizationId),
            eq(warrantyPolicies.isActive, true)
          )
        )
        .limit(1);

      if (policy) {
        return { policy, source: 'product' };
      }
    }
  }

  if (derivedCategoryId) {
    const [category] = await executor
      .select({
        defaultWarrantyPolicyId: categories.defaultWarrantyPolicyId,
      })
      .from(categories)
      .where(
        and(
          eq(categories.id, derivedCategoryId),
          eq(categories.organizationId, params.organizationId)
        )
      )
      .limit(1);

    if (!category && params.categoryId && params.throwIfMissing) {
      throw new NotFoundError('Category not found', 'category');
    }

    if (category?.defaultWarrantyPolicyId) {
      const [policy] = await executor
        .select()
        .from(warrantyPolicies)
        .where(
          and(
            eq(warrantyPolicies.id, category.defaultWarrantyPolicyId),
            eq(warrantyPolicies.organizationId, params.organizationId),
            eq(warrantyPolicies.isActive, true)
          )
        )
        .limit(1);

      if (policy) {
        return { policy, source: 'category' };
      }
    }
  }

  const defaultConditions = [
    eq(warrantyPolicies.organizationId, params.organizationId),
    eq(warrantyPolicies.isDefault, true),
    eq(warrantyPolicies.isActive, true),
  ];
  if (params.type) {
    defaultConditions.push(eq(warrantyPolicies.type, params.type));
  }

  const [defaultPolicy] = await executor
    .select()
    .from(warrantyPolicies)
    .where(and(...defaultConditions))
    .orderBy(asc(warrantyPolicies.createdAt))
    .limit(1);

  if (defaultPolicy) {
    return { policy: defaultPolicy, source: 'organization_default' };
  }

  if (!params.type) {
    return { policy: null, source: null };
  }

  const [fallbackPolicy] = await executor
    .select()
    .from(warrantyPolicies)
    .where(
      and(
        eq(warrantyPolicies.organizationId, params.organizationId),
        eq(warrantyPolicies.type, params.type),
        eq(warrantyPolicies.isActive, true)
      )
    )
    .orderBy(asc(warrantyPolicies.createdAt))
    .limit(1);

  if (fallbackPolicy) {
    return { policy: fallbackPolicy, source: 'organization_fallback' };
  }

  return { policy: null, source: null };
}
