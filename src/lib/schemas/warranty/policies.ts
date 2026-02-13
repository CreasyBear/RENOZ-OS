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

export function isWarrantyPolicyTypeValue(
  v: unknown
): v is WarrantyPolicyTypeValue {
  return warrantyPolicyTypeSchema.safeParse(v).success;
}

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

// ============================================================================
// CLIENT-SAFE TYPE DEFINITIONS
// (Duplicated from drizzle schema to avoid client/server bundling issues)
// ============================================================================

/**
 * Warranty policy terms stored as JSONB.
 * Client-safe version of WarrantyPolicyTerms from drizzle/schema.
 */
export interface WarrantyPolicyTerms {
  coverage?: string[];
  exclusions?: string[];
  claimRequirements?: string[];
  transferable?: boolean;
  proratedAfterMonths?: number;
  [key: string]: string | string[] | number | boolean | null | undefined;
}

/**
 * Warranty policy record.
 * Client-safe version of WarrantyPolicy from drizzle/schema.
 */
export interface WarrantyPolicy {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  durationMonths: number;
  cycleLimit: number | null;
  terms: WarrantyPolicyTerms | null;
  slaConfigurationId: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Form payload for create/update warranty policy */
export interface WarrantyPolicyFormPayload {
  policyId?: string;
  name: string;
  description: string | null;
  type: WarrantyPolicyTypeValue;
  durationMonths: number;
  cycleLimit: number | null;
  terms: WarrantyPolicyTerms;
  isDefault: boolean;
  isActive: boolean;
}

/** Props for WarrantyPolicySettingsView */
export interface WarrantyPolicySettingsViewProps {
  policies: WarrantyPolicy[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onDeletePolicy?: (policy: WarrantyPolicy) => void;
  onSetDefault?: (policy: WarrantyPolicy) => void;
  onSeedDefaults?: () => void;
  isSeedingDefaults?: boolean;
  pendingDefaultPolicyId?: string | null;
  onCreatePolicy?: () => void;
  onEditPolicy?: (policy: WarrantyPolicy) => void;
  dialogOpen: boolean;
  editingPolicy: WarrantyPolicy | null;
  onDialogOpenChange: (open: boolean) => void;
  onSubmitPolicy: (payload: WarrantyPolicyFormPayload) => Promise<void>;
  isSubmitting?: boolean;
}
