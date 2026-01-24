/**
 * Warranty Policy Validation Schemas
 *
 * Zod schemas for warranty policy CRUD operations.
 *
 * @see drizzle/schema/warranty-policies.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-001b
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const warrantyPolicyTypeSchema = z.enum([
  'battery_performance',
  'inverter_manufacturer',
  'installation_workmanship',
]);
export type WarrantyPolicyTypeValue = z.infer<typeof warrantyPolicyTypeSchema>;

// ============================================================================
// WARRANTY POLICY TERMS
// ============================================================================

export const warrantyPolicyTermsSchema = z
  .object({
    coverage: z.array(z.string()).optional(),
    exclusions: z.array(z.string()).optional(),
    claimRequirements: z.array(z.string()).optional(),
    transferable: z.boolean().optional(),
    proratedAfterMonths: z.number().int().positive().optional(),
  })
  .passthrough(); // Allow additional properties for extensibility

// ============================================================================
// CREATE WARRANTY POLICY
// ============================================================================

export const createWarrantyPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  type: warrantyPolicyTypeSchema,
  durationMonths: z.number().int().positive('Duration must be a positive number'),
  cycleLimit: z.number().int().positive().nullable().optional(),
  terms: warrantyPolicyTermsSchema.optional(),
  slaConfigurationId: z.string().uuid().nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateWarrantyPolicyInput = z.infer<typeof createWarrantyPolicySchema>;

// ============================================================================
// UPDATE WARRANTY POLICY
// ============================================================================

export const updateWarrantyPolicySchema = createWarrantyPolicySchema.partial();

export type UpdateWarrantyPolicyInput = z.infer<typeof updateWarrantyPolicySchema>;

// ============================================================================
// GET WARRANTY POLICIES (LIST)
// ============================================================================

export const getWarrantyPoliciesSchema = z.object({
  type: warrantyPolicyTypeSchema.optional(),
  isActive: z.boolean().optional(),
  includeDefaults: z.boolean().optional().default(true),
});

// Use z.input to allow optional parameters, z.infer gives output type with defaults applied
export type GetWarrantyPoliciesInput = z.input<typeof getWarrantyPoliciesSchema>;

// ============================================================================
// GET WARRANTY POLICY BY ID
// ============================================================================

export const getWarrantyPolicyByIdSchema = z.object({
  policyId: z.string().uuid('Invalid policy ID'),
});

export type GetWarrantyPolicyByIdInput = z.infer<typeof getWarrantyPolicyByIdSchema>;

// ============================================================================
// RESOLVE WARRANTY POLICY
// ============================================================================

/**
 * Resolution logic: product > category > org default
 * Given a product or category, resolve which warranty policy applies.
 */
export const resolveWarrantyPolicySchema = z.object({
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: warrantyPolicyTypeSchema.optional(),
});

export type ResolveWarrantyPolicyInput = z.infer<typeof resolveWarrantyPolicySchema>;

// ============================================================================
// ASSIGN WARRANTY POLICY
// ============================================================================

export const assignWarrantyPolicyToProductSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  policyId: z.string().uuid().nullable(),
});

export type AssignWarrantyPolicyToProductInput = z.infer<
  typeof assignWarrantyPolicyToProductSchema
>;

export const assignDefaultWarrantyPolicyToCategorySchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  policyId: z.string().uuid().nullable(),
});

export type AssignDefaultWarrantyPolicyToCategoryInput = z.infer<
  typeof assignDefaultWarrantyPolicyToCategorySchema
>;

// ============================================================================
// SEED DEFAULT POLICIES
// ============================================================================

export const seedDefaultPoliciesSchema = z.object({
  // Optional: override default values
  batteryDurationMonths: z.number().int().positive().default(120),
  batteryCycleLimit: z.number().int().positive().default(10000),
  inverterDurationMonths: z.number().int().positive().default(60),
  installationDurationMonths: z.number().int().positive().default(24),
});

export type SeedDefaultPoliciesInput = z.infer<typeof seedDefaultPoliciesSchema>;
