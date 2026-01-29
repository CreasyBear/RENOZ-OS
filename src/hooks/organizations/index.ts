/**
 * Organizations Hooks
 *
 * TanStack Query hooks for organization management.
 * Provides hooks for fetching and mutating organization details, settings, and branding.
 *
 * @example
 * ```tsx
 * // Using separate hooks (recommended)
 * import {
 *   useOrganizationQuery,
 *   useUpdateOrganization,
 *   useOrganizationSettingsQuery,
 *   useUpdateOrganizationSettings,
 * } from '@/hooks/organizations';
 *
 * function OrganizationSettings() {
 *   const { data: organization } = useOrganizationQuery();
 *   const updateOrganization = useUpdateOrganization();
 *
 *   return (
 *     <Form onSubmit={(data) => updateOrganization.mutate(data)}>
 *       <Input defaultValue={organization?.name} />
 *     </Form>
 *   );
 * }
 * ```
 */

// ============================================================================
// QUERY HOOKS
// ============================================================================

export {
  useOrganizationQuery,
  useOrganizationSettingsQuery,
  useOrganizationBrandingQuery,
} from './use-organization';

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export {
  useUpdateOrganization,
  useUpdateOrganizationSettings,
  useUpdateOrganizationBranding,
} from './use-organization';

// ============================================================================
// COMPOSITE HOOKS (Backward Compatibility)
// ============================================================================

export {
  useOrganization,
  useOrganizationSettings,
  useOrganizationBranding,
} from './use-organization';

// ============================================================================
// TYPE EXPORTS (from schemas)
// ============================================================================

export type {
  Organization,
  OrganizationSettings,
  OrganizationBranding,
  UpdateOrganization,
} from '@/lib/schemas/auth';

export type { UpdateOrganizationSettingsInput } from './use-organization';

export type { Address as OrganizationAddress } from '@/lib/schemas/_shared/patterns';
