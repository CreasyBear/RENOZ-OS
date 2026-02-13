'use server'

/**
 * Warranty Policy Server Functions
 *
 * CRUD operations and policy resolution for warranty policies.
 * Implements product > category > org default resolution hierarchy.
 *
 * @see drizzle/schema/warranty-policies.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-001b
 */

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  warrantyPolicies,
  products,
  categories,
  slaConfigurations,
  customers,
  type WarrantyPolicy,
  type WarrantyPolicyTerms,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { tasks } from '@trigger.dev/sdk/v3';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/server/errors';
import type { WarrantyRegisteredPayload } from '@/trigger/client';
import {
  createWarrantyPolicySchema,
  updateWarrantyPolicySchema,
  getWarrantyPoliciesSchema,
  getWarrantyPolicyByIdSchema,
  resolveWarrantyPolicySchema,
  assignWarrantyPolicyToProductSchema,
  assignDefaultWarrantyPolicyToCategorySchema,
  seedDefaultPoliciesSchema,
  warrantyPolicyTermsSchema,
} from '@/lib/schemas/warranty/policies';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges, excludeFieldsForActivity } from '@/lib/activity-logger';
import { warrantyLogger } from '@/lib/logger';

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const WARRANTY_POLICY_EXCLUDED_FIELDS = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
] as const satisfies readonly string[];

// ============================================================================
// WARRANTY POLICY CRUD
// ============================================================================

/**
 * Create a new warranty policy
 */
export const createWarrantyPolicy = createServerFn({ method: 'POST' })
  .inputValidator(createWarrantyPolicySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    const [policy] = await db
      .insert(warrantyPolicies)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        durationMonths: data.durationMonths,
        cycleLimit: data.cycleLimit ?? null,
        terms: warrantyPolicyTermsSchema.parse(data.terms ?? {}) as WarrantyPolicyTerms,
        slaConfigurationId: data.slaConfigurationId ?? null,
        isDefault: data.isDefault,
        isActive: data.isActive,
      })
      .returning();

    // Log policy creation
    logger.logAsync({
      entityType: 'warranty_policy',
      entityId: policy.id,
      action: 'created',
      description: `Created warranty policy: ${policy.name}`,
      changes: computeChanges({
        before: null,
        after: policy,
        excludeFields: excludeFieldsForActivity<WarrantyPolicy>(WARRANTY_POLICY_EXCLUDED_FIELDS),
      }),
      metadata: {
        warrantyPolicyId: policy.id,
        policyName: policy.name,
        policyType: policy.type,
        customFields: {
          durationMonths: policy.durationMonths,
          cycleLimit: policy.cycleLimit,
          isDefault: policy.isDefault,
        },
      },
    });

    return policy;
  });

/**
 * Update an existing warranty policy
 */
export const updateWarrantyPolicy = createServerFn({ method: 'POST' })
  .inputValidator(
    updateWarrantyPolicySchema.extend({
      policyId: getWarrantyPolicyByIdSchema.shape.policyId,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);
    const { policyId, ...updates } = data;

    // Get existing policy for change tracking
    const [existingPolicy] = await db
      .select()
      .from(warrantyPolicies)
      .where(
        and(
          eq(warrantyPolicies.id, policyId),
          eq(warrantyPolicies.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingPolicy) {
      throw new NotFoundError('Warranty policy not found', 'warrantyPolicy');
    }

    const [policy] = await db
      .update(warrantyPolicies)
      .set({
        ...updates,
        // Ensure nullability is handled correctly
        description: updates.description ?? undefined,
        cycleLimit: updates.cycleLimit ?? undefined,
        slaConfigurationId: updates.slaConfigurationId ?? undefined,
        terms: updates.terms
          ? (warrantyPolicyTermsSchema.parse(updates.terms) as WarrantyPolicyTerms)
          : undefined,
      })
      .where(
        and(
          eq(warrantyPolicies.id, policyId),
          eq(warrantyPolicies.organizationId, ctx.organizationId)
        )
      )
      .returning();

    // Log policy update
    const changes = computeChanges({
      before: existingPolicy,
      after: policy,
      excludeFields: excludeFieldsForActivity<WarrantyPolicy>(WARRANTY_POLICY_EXCLUDED_FIELDS),
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'warranty_policy',
        entityId: policy.id,
        action: 'updated',
        description: `Updated warranty policy: ${policy.name}`,
        changes,
        metadata: {
          warrantyPolicyId: policy.id,
          policyName: policy.name,
          policyType: policy.type,
          changedFields: changes.fields,
        },
      });
    }

    return policy;
  });

/**
 * List warranty policies with optional filters
 */
export const listWarrantyPolicies = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyPoliciesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(warrantyPolicies.organizationId, ctx.organizationId)];

    if (data.type) {
      conditions.push(eq(warrantyPolicies.type, data.type));
    }

    if (typeof data.isActive === 'boolean') {
      conditions.push(eq(warrantyPolicies.isActive, data.isActive));
    }

    const policies = await db
      .select()
      .from(warrantyPolicies)
      .where(and(...conditions))
      .orderBy(
        asc(warrantyPolicies.type),
        asc(warrantyPolicies.isDefault),
        asc(warrantyPolicies.name)
      );

    return policies;
  });

/**
 * Cached warranty policy fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getWarrantyPolicyCached = cache(async (policyId: string, organizationId: string) => {
  const [policy] = await db
    .select()
    .from(warrantyPolicies)
    .where(
      and(
        eq(warrantyPolicies.id, policyId),
        eq(warrantyPolicies.organizationId, organizationId)
      )
    )
    .limit(1);

  return policy ?? null;
});

/**
 * Get a single warranty policy by ID
 */
export const getWarrantyPolicy = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyPolicyByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const policy = await _getWarrantyPolicyCached(data.policyId, ctx.organizationId);
    if (!policy) {
      setResponseStatus(404);
      throw new NotFoundError('Warranty policy not found', 'warrantyPolicy');
    }
    return policy;
  });

/**
 * Delete a warranty policy (soft delete by setting isActive = false)
 */
export const deleteWarrantyPolicy = createServerFn({ method: 'POST' })
  .inputValidator(getWarrantyPolicyByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing policy for logging
    const [existingPolicy] = await db
      .select()
      .from(warrantyPolicies)
      .where(
        and(
          eq(warrantyPolicies.id, data.policyId),
          eq(warrantyPolicies.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existingPolicy) {
      throw new NotFoundError('Warranty policy not found', 'warrantyPolicy');
    }

    const [policy] = await db
      .update(warrantyPolicies)
      .set({ isActive: false })
      .where(
        and(
          eq(warrantyPolicies.id, data.policyId),
          eq(warrantyPolicies.organizationId, ctx.organizationId)
        )
      )
      .returning();

    // Log policy deactivation (soft delete)
    logger.logAsync({
      entityType: 'warranty_policy',
      entityId: policy.id,
      action: 'deleted',
      description: `Deactivated warranty policy: ${policy.name}`,
      changes: {
        before: { isActive: true },
        after: { isActive: false },
        fields: ['isActive'],
      },
      metadata: {
        warrantyPolicyId: policy.id,
        policyName: policy.name,
        policyType: policy.type,
      },
    });

    return policy;
  });

// ============================================================================
// DEFAULT POLICY OPERATIONS
// ============================================================================

/**
 * Get the default policy for a specific type
 */
export const getDefaultWarrantyPolicy = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyPoliciesSchema.pick({ type: true }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    if (!data.type) {
      throw new ValidationError('Policy type is required');
    }

    // First try to find the org's default for this type
    const [policy] = await db
      .select()
      .from(warrantyPolicies)
      .where(
        and(
          eq(warrantyPolicies.organizationId, ctx.organizationId),
          eq(warrantyPolicies.type, data.type),
          eq(warrantyPolicies.isDefault, true),
          eq(warrantyPolicies.isActive, true)
        )
      )
      .limit(1);

    if (policy) {
      return policy;
    }

    // Fall back to any active policy of this type
    const [fallback] = await db
      .select()
      .from(warrantyPolicies)
      .where(
        and(
          eq(warrantyPolicies.organizationId, ctx.organizationId),
          eq(warrantyPolicies.type, data.type),
          eq(warrantyPolicies.isActive, true)
        )
      )
      .orderBy(asc(warrantyPolicies.createdAt))
      .limit(1);

    return fallback ?? null;
  });

/**
 * Set a policy as the default for its type
 */
export const setDefaultWarrantyPolicy = createServerFn({ method: 'POST' })
  .inputValidator(getWarrantyPolicyByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    // Get the policy to find its type
    const [targetPolicy] = await db
      .select()
      .from(warrantyPolicies)
      .where(
        and(
          eq(warrantyPolicies.id, data.policyId),
          eq(warrantyPolicies.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!targetPolicy) {
      throw new NotFoundError('Warranty policy not found', 'warrantyPolicy');
    }

    // Clear existing default for this type
    await db
      .update(warrantyPolicies)
      .set({ isDefault: false })
      .where(
        and(
          eq(warrantyPolicies.organizationId, ctx.organizationId),
          eq(warrantyPolicies.type, targetPolicy.type),
          eq(warrantyPolicies.isDefault, true)
        )
      );

    // Set the new default
    const [policy] = await db
      .update(warrantyPolicies)
      .set({ isDefault: true })
      .where(eq(warrantyPolicies.id, data.policyId))
      .returning();

    // Log setting default policy
    logger.logAsync({
      entityType: 'warranty_policy',
      entityId: policy.id,
      action: 'updated',
      description: `Set default warranty policy: ${policy.name}`,
      changes: {
        before: { isDefault: false },
        after: { isDefault: true },
        fields: ['isDefault'],
      },
      metadata: {
        warrantyPolicyId: policy.id,
        policyName: policy.name,
        policyType: policy.type,
      },
    });

    return policy;
  });

// ============================================================================
// POLICY RESOLUTION
// ============================================================================

/**
 * Resolve which warranty policy applies for a product.
 * Resolution hierarchy: product > category > org default
 */
export const resolveWarrantyPolicy = createServerFn({ method: 'GET' })
  .inputValidator(resolveWarrantyPolicySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // 1. If product specified, check product's direct policy
    if (data.productId) {
      const [product] = await db
        .select({
          warrantyPolicyId: products.warrantyPolicyId,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(
          and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId))
        )
        .limit(1);

      if (!product) {
        throw new NotFoundError('Product not found', 'product');
      }

      // If product has a direct policy, use it
      if (product.warrantyPolicyId) {
        const [policy] = await db
          .select()
          .from(warrantyPolicies)
          .where(
            and(
              eq(warrantyPolicies.id, product.warrantyPolicyId),
              eq(warrantyPolicies.isActive, true)
            )
          )
          .limit(1);

        if (policy) {
          return { policy, source: 'product' as const };
        }
      }

      // 2. Check product's category default
      if (product.categoryId) {
        const [category] = await db
          .select({
            defaultWarrantyPolicyId: categories.defaultWarrantyPolicyId,
          })
          .from(categories)
          .where(eq(categories.id, product.categoryId))
          .limit(1);

        if (category?.defaultWarrantyPolicyId) {
          const [policy] = await db
            .select()
            .from(warrantyPolicies)
            .where(
              and(
                eq(warrantyPolicies.id, category.defaultWarrantyPolicyId),
                eq(warrantyPolicies.isActive, true)
              )
            )
            .limit(1);

          if (policy) {
            return { policy, source: 'category' as const };
          }
        }
      }
    }

    // 3. If category specified directly (not via product)
    if (data.categoryId && !data.productId) {
      const [category] = await db
        .select({
          defaultWarrantyPolicyId: categories.defaultWarrantyPolicyId,
        })
        .from(categories)
        .where(
          and(eq(categories.id, data.categoryId), eq(categories.organizationId, ctx.organizationId))
        )
        .limit(1);

      if (!category) {
        throw new NotFoundError('Category not found', 'category');
      }

      if (category.defaultWarrantyPolicyId) {
        const [policy] = await db
          .select()
          .from(warrantyPolicies)
          .where(
            and(
              eq(warrantyPolicies.id, category.defaultWarrantyPolicyId),
              eq(warrantyPolicies.isActive, true)
            )
          )
          .limit(1);

        if (policy) {
          return { policy, source: 'category' as const };
        }
      }
    }

    // 4. Fall back to org default for the specified type
    if (data.type) {
      const [policy] = await db
        .select()
        .from(warrantyPolicies)
        .where(
          and(
            eq(warrantyPolicies.organizationId, ctx.organizationId),
            eq(warrantyPolicies.type, data.type),
            eq(warrantyPolicies.isDefault, true),
            eq(warrantyPolicies.isActive, true)
          )
        )
        .limit(1);

      if (policy) {
        return { policy, source: 'organization_default' as const };
      }

      // Fall back to any active policy of this type
      const [fallback] = await db
        .select()
        .from(warrantyPolicies)
        .where(
          and(
            eq(warrantyPolicies.organizationId, ctx.organizationId),
            eq(warrantyPolicies.type, data.type),
            eq(warrantyPolicies.isActive, true)
          )
        )
        .orderBy(asc(warrantyPolicies.createdAt))
        .limit(1);

      if (fallback) {
        return { policy: fallback, source: 'organization_fallback' as const };
      }
    }

    return { policy: null, source: null };
  });

// ============================================================================
// POLICY ASSIGNMENT
// ============================================================================

/**
 * Assign a warranty policy to a product
 */
export const assignWarrantyPolicyToProduct = createServerFn({ method: 'POST' })
  .inputValidator(assignWarrantyPolicyToProductSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing product for logging
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existingProduct) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Verify policy belongs to org if not null
    let policyName: string | undefined;
    if (data.policyId) {
      const [policy] = await db
        .select()
        .from(warrantyPolicies)
        .where(
          and(
            eq(warrantyPolicies.id, data.policyId),
            eq(warrantyPolicies.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!policy) {
        throw new NotFoundError('Warranty policy not found', 'warrantyPolicy');
      }
      policyName = policy.name;
    }

    const [product] = await db
      .update(products)
      .set({ warrantyPolicyId: data.policyId })
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .returning();

    // Log policy assignment
    logger.logAsync({
      entityType: 'product',
      entityId: product.id,
      action: 'updated',
      description: data.policyId
        ? `Assigned warranty policy to product: ${product.name}`
        : `Removed warranty policy from product: ${product.name}`,
      changes: {
        before: { warrantyPolicyId: existingProduct.warrantyPolicyId },
        after: { warrantyPolicyId: data.policyId },
        fields: ['warrantyPolicyId'],
      },
      metadata: {
        productId: product.id,
        productName: product.name ?? undefined,
        warrantyPolicyId: data.policyId ?? undefined,
        policyName: policyName,
      },
    });

    return product;
  });

/**
 * Set the default warranty policy for a category
 */
export const assignDefaultWarrantyPolicyToCategory = createServerFn({ method: 'POST' })
  .inputValidator(assignDefaultWarrantyPolicyToCategorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing category for logging
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, data.categoryId), eq(categories.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existingCategory) {
      throw new NotFoundError('Category not found', 'category');
    }

    // Verify policy belongs to org if not null
    let policyName: string | undefined;
    if (data.policyId) {
      const [policy] = await db
        .select()
        .from(warrantyPolicies)
        .where(
          and(
            eq(warrantyPolicies.id, data.policyId),
            eq(warrantyPolicies.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!policy) {
        throw new NotFoundError('Warranty policy not found', 'warrantyPolicy');
      }
      policyName = policy.name;
    }

    const [category] = await db
      .update(categories)
      .set({ defaultWarrantyPolicyId: data.policyId })
      .where(
        and(eq(categories.id, data.categoryId), eq(categories.organizationId, ctx.organizationId))
      )
      .returning();

    // Log default policy assignment to category
    logger.logAsync({
      entityType: 'warranty_policy',
      entityId: data.policyId ?? existingCategory.defaultWarrantyPolicyId ?? category.id,
      action: 'updated',
      description: data.policyId
        ? `Assigned default warranty policy to category: ${category.name}`
        : `Removed default warranty policy from category: ${category.name}`,
      changes: {
        before: { defaultWarrantyPolicyId: existingCategory.defaultWarrantyPolicyId },
        after: { defaultWarrantyPolicyId: data.policyId },
        fields: ['defaultWarrantyPolicyId'],
      },
      metadata: {
        warrantyPolicyId: data.policyId ?? undefined,
        policyName: policyName,
        customFields: {
          categoryId: category.id,
          categoryName: category.name,
        },
      },
    });

    return category;
  });

// ============================================================================
// SEED DEFAULT POLICIES
// ============================================================================

/**
 * Seed default warranty policies for a new organization.
 * Creates: Battery (120 months/10k cycles), Inverter (60 months), Installation (24 months)
 */
export const seedDefaultWarrantyPolicies = createServerFn({ method: 'POST' })
  .inputValidator(seedDefaultPoliciesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    // Check if policies already exist
    const existing = await db
      .select()
      .from(warrantyPolicies)
      .where(eq(warrantyPolicies.organizationId, ctx.organizationId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('Warranty policies already exist for this organization');
    }

    // Get or create warranty SLA configuration
    let [warrantySlaConfig] = await db
      .select()
      .from(slaConfigurations)
      .where(
        and(
          eq(slaConfigurations.organizationId, ctx.organizationId),
          eq(slaConfigurations.domain, 'warranty'),
          eq(slaConfigurations.isDefault, true)
        )
      )
      .limit(1);

    // If no warranty SLA exists, create a default one
    if (!warrantySlaConfig) {
      [warrantySlaConfig] = await db
        .insert(slaConfigurations)
        .values({
          organizationId: ctx.organizationId,
          domain: 'warranty',
          name: 'Default Warranty SLA',
          description: 'Default SLA for warranty claims',
          responseTargetValue: 24,
          responseTargetUnit: 'business_hours',
          resolutionTargetValue: 5,
          resolutionTargetUnit: 'business_days',
          atRiskThresholdPercent: 75,
          escalateOnBreach: true,
          isDefault: true,
          priorityOrder: 1,
          isActive: true,
        })
        .returning();
    }

    // Create default policies
    const policies = await db
      .insert(warrantyPolicies)
      .values([
        {
          organizationId: ctx.organizationId,
          name: 'Battery Performance Warranty',
          description:
            'Standard 10-year battery performance warranty covering capacity degradation and cycle limits.',
          type: 'battery_performance',
          durationMonths: data.batteryDurationMonths,
          cycleLimit: data.batteryCycleLimit,
          terms: {
            coverage: ['Capacity retention below 60%', 'Manufacturing defects', 'Cell failure'],
            exclusions: ['Physical damage', 'Improper installation', 'Unauthorized modifications'],
            claimRequirements: [
              'Proof of purchase',
              'Installation certificate',
              'Battery diagnostics report',
            ],
            transferable: true,
          },
          slaConfigurationId: warrantySlaConfig.id,
          isDefault: true,
          isActive: true,
        },
        {
          organizationId: ctx.organizationId,
          name: 'Inverter Manufacturer Warranty',
          description: 'Standard 5-year inverter warranty from manufacturer.',
          type: 'inverter_manufacturer',
          durationMonths: data.inverterDurationMonths,
          cycleLimit: null,
          terms: {
            coverage: ['Component failure', 'Manufacturing defects', 'Firmware issues'],
            exclusions: ['Power surge damage', 'Physical damage', 'Environmental damage'],
            claimRequirements: ['Proof of purchase', 'Installation certificate', 'Error logs'],
            transferable: true,
          },
          slaConfigurationId: warrantySlaConfig.id,
          isDefault: true,
          isActive: true,
        },
        {
          organizationId: ctx.organizationId,
          name: 'Installation Workmanship Warranty',
          description: '2-year warranty covering installation quality and workmanship.',
          type: 'installation_workmanship',
          durationMonths: data.installationDurationMonths,
          cycleLimit: null,
          terms: {
            coverage: ['Wiring defects', 'Mounting issues', 'Connection problems'],
            exclusions: [
              'Customer modifications',
              'Weather damage post-install',
              'Third-party interference',
            ],
            claimRequirements: ['Original installation documentation', 'Photo evidence'],
            transferable: false,
          },
          slaConfigurationId: warrantySlaConfig.id,
          isDefault: true,
          isActive: true,
        },
      ])
      .returning();

    // Log seed policies creation
    for (const policy of policies) {
      logger.logAsync({
        entityType: 'warranty_policy',
        entityId: policy.id,
        action: 'created',
        description: `Seeded default warranty policy: ${policy.name}`,
        changes: computeChanges({
          before: null,
          after: policy,
          excludeFields: excludeFieldsForActivity<WarrantyPolicy>(WARRANTY_POLICY_EXCLUDED_FIELDS),
        }),
        metadata: {
          warrantyPolicyId: policy.id,
          policyName: policy.name,
          policyType: policy.type,
          customFields: {
            durationMonths: policy.durationMonths,
            cycleLimit: policy.cycleLimit,
            isDefault: policy.isDefault,
            seededAsDefault: true,
          },
        },
      });
    }

    return {
      policies,
      slaConfiguration: warrantySlaConfig,
    };
  });

// ============================================================================
// GET POLICIES WITH SLA INFO
// ============================================================================

/**
 * Get warranty policies with their SLA configuration details
 */
export const getWarrantyPoliciesWithSla = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyPoliciesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(warrantyPolicies.organizationId, ctx.organizationId)];

    if (data.type) {
      conditions.push(eq(warrantyPolicies.type, data.type));
    }

    if (typeof data.isActive === 'boolean') {
      conditions.push(eq(warrantyPolicies.isActive, data.isActive));
    }

    const policies = await db
      .select({
        policy: warrantyPolicies,
        slaConfig: slaConfigurations,
      })
      .from(warrantyPolicies)
      .leftJoin(slaConfigurations, eq(warrantyPolicies.slaConfigurationId, slaConfigurations.id))
      .where(and(...conditions))
      .orderBy(
        asc(warrantyPolicies.type),
        asc(warrantyPolicies.isDefault),
        asc(warrantyPolicies.name)
      );

    return policies.map(({ policy, slaConfig }) => ({
      ...policy,
      slaConfiguration: slaConfig,
    }));
  });

// ============================================================================
// WARRANTY REGISTRATION NOTIFICATION
// ============================================================================

/**
 * Trigger warranty registration notification.
 *
 * Called after a warranty is registered (either auto from order delivery or manual).
 * Sends WarrantyRegisteredPayload to trigger background notification job.
 *
 * @see src/trigger/jobs/warranty-notifications.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-002
 */
export async function triggerWarrantyRegistrationNotification(params: {
  warrantyId: string;
  warrantyNumber: string;
  organizationId: string;
  customerId: string;
  productId: string;
  productSerial?: string;
  policyId: string;
  registrationDate: Date;
  expiryDate: Date;
}): Promise<void> {
  // Fetch customer details
  const [customer] = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
    })
    .from(customers)
    .where(eq(customers.id, params.customerId))
    .limit(1);

  // Skip if no customer email
  if (!customer?.email) {
    warrantyLogger.info('Skipping registration notification - no customer email', {
      warrantyNumber: params.warrantyNumber,
    });
    return;
  }

  // Fetch product details
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .where(eq(products.id, params.productId))
    .limit(1);

  // Fetch policy details with SLA
  const [policyWithSla] = await db
    .select({
      policy: warrantyPolicies,
      slaConfig: slaConfigurations,
    })
    .from(warrantyPolicies)
    .leftJoin(slaConfigurations, eq(warrantyPolicies.slaConfigurationId, slaConfigurations.id))
    .where(eq(warrantyPolicies.id, params.policyId))
    .limit(1);

  if (!policyWithSla?.policy) {
    warrantyLogger.info('Skipping registration notification - policy not found', {
      warrantyNumber: params.warrantyNumber,
    });
    return;
  }

  const { policy, slaConfig } = policyWithSla;

  // Build event payload
  const payload: WarrantyRegisteredPayload = {
    warrantyId: params.warrantyId,
    warrantyNumber: params.warrantyNumber,
    organizationId: params.organizationId,
    customerId: params.customerId,
    customerEmail: customer.email,
    customerName: customer.name,
    productId: params.productId,
    productName: product?.name || 'Unknown Product',
    productSerial: params.productSerial,
    policyType: policy.type,
    policyName: policy.name,
    durationMonths: policy.durationMonths,
    cycleLimit: policy.cycleLimit ?? undefined,
    startDate: params.registrationDate.toISOString(),
    expiryDate: params.expiryDate.toISOString(),
    slaResponseHours: slaConfig?.responseTargetValue ?? 24,
    slaResolutionDays: slaConfig?.resolutionTargetValue ?? 5,
    // certificateUrl will be added when DOM-WAR-004 is implemented
  };

  // Trigger warranty notification task
  await tasks.trigger('send-warranty-registration-email', payload);

  warrantyLogger.info('Registration notification triggered', {
    warrantyNumber: params.warrantyNumber,
    customerEmail: customer.email,
  });
}
