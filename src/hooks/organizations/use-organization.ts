/**
 * Organization Hooks
 *
 * TanStack Query hooks for organization management.
 * Provides hooks for fetching and mutating organization details, settings, and branding.
 *
 * @example
 * ```tsx
 * // Using separate hooks (recommended)
 * function OrganizationSettings() {
 *   const { data: organization, isLoading } = useOrganizationQuery();
 *   const updateOrganization = useUpdateOrganization();
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <Form onSubmit={(data) => updateOrganization.mutate(data)}>
 *       <Input defaultValue={organization?.name} />
 *     </Form>
 *   );
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  getOrganization,
  updateOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
  getOrganizationBranding,
  updateOrganizationBranding,
} from '@/server/functions/settings/organizations';
import type {
  Organization,
  OrganizationSettings,
  OrganizationBranding,
  UpdateOrganization,
} from '@/lib/schemas/auth';
import type { Address } from '@/lib/schemas/_shared/patterns';

// Re-export types for convenience
export type { Organization, OrganizationSettings, OrganizationBranding, Address };

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseOrganizationQueryOptions {
  enabled?: boolean;
}

/**
 * Query hook to fetch organization details
 *
 * @example
 * ```tsx
 * const { data: organization, isLoading } = useOrganizationQuery();
 * ```
 */
export function useOrganizationQuery(options: UseOrganizationQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.organizations.current(),
    queryFn: () => getOrganization(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled,
  });
}

export interface UseOrganizationSettingsQueryOptions {
  enabled?: boolean;
}

/**
 * Query hook to fetch organization settings only
 *
 * @example
 * ```tsx
 * const { data: settings } = useOrganizationSettingsQuery();
 * ```
 */
export function useOrganizationSettingsQuery(options: UseOrganizationSettingsQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.organizations.settings(),
    queryFn: () => getOrganizationSettings(),
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled,
  });
}

export interface UseOrganizationBrandingQueryOptions {
  enabled?: boolean;
}

/**
 * Query hook to fetch organization branding only
 *
 * @example
 * ```tsx
 * const { data: branding } = useOrganizationBrandingQuery();
 * ```
 */
export function useOrganizationBrandingQuery(options: UseOrganizationBrandingQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.organizations.branding(),
    queryFn: () => getOrganizationBranding(),
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export interface UseUpdateOrganizationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

/**
 * Mutation hook to update organization details
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Toast notifications (optional)
 *
 * @example
 * ```tsx
 * const updateOrganization = useUpdateOrganization({
 *   onSuccess: () => console.log('Updated!'),
 *   showToast: true,
 * });
 *
 * updateOrganization.mutate({ name: 'New Name', email: 'new@example.com' });
 * ```
 */
export function useUpdateOrganization(options: UseUpdateOrganizationOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, showToast = true } = options;

  return useMutation({
    mutationFn: (data: UpdateOrganization) => updateOrganization({ data }),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.organizations.current() });

      // Snapshot previous value
      const previousOrg = queryClient.getQueryData<Organization>(
        queryKeys.organizations.current()
      );

      // Optimistically update
      if (previousOrg) {
        queryClient.setQueryData(queryKeys.organizations.current(), {
          ...previousOrg,
          ...variables,
          address: variables.address
            ? { ...previousOrg.address, ...variables.address }
            : previousOrg.address,
          settings: variables.settings
            ? { ...previousOrg.settings, ...variables.settings }
            : previousOrg.settings,
          branding: variables.branding
            ? { ...previousOrg.branding, ...variables.branding }
            : previousOrg.branding,
          updatedAt: new Date(),
        });
      }

      return { previousOrg };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousOrg) {
        queryClient.setQueryData(queryKeys.organizations.current(), context.previousOrg);
      }

      if (showToast) {
        toast.error('Failed to update organization', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
      }

      onError?.(error as Error);
    },

    onSuccess: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.branding() });

      if (showToast) {
        toast.success('Organization updated successfully');
      }

      onSuccess?.();
    },
  });
}

export interface UseUpdateOrganizationSettingsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

/**
 * Mutation hook to update organization settings only
 *
 * @example
 * ```tsx
 * const updateSettings = useUpdateOrganizationSettings();
 * updateSettings.mutate({ timezone: 'Australia/Sydney', currency: 'AUD' });
 * ```
 */
export type UpdateOrganizationSettingsInput = Partial<OrganizationSettings>;

export function useUpdateOrganizationSettings(options: UseUpdateOrganizationSettingsOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, showToast = true } = options;

  return useMutation({
    mutationFn: (data: UpdateOrganizationSettingsInput) => updateOrganizationSettings({ data }),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.organizations.settings() });

      const previousSettings = queryClient.getQueryData<OrganizationSettings>(
        queryKeys.organizations.settings()
      );
      const previousOrg = queryClient.getQueryData<Organization>(
        queryKeys.organizations.current()
      );

      // Optimistically update settings
      if (previousSettings) {
        queryClient.setQueryData(queryKeys.organizations.settings(), {
          ...previousSettings,
          ...variables,
        });
      }

      // Also update the organization cache if it exists
      if (previousOrg) {
        queryClient.setQueryData(queryKeys.organizations.current(), {
          ...previousOrg,
          settings: { ...previousOrg.settings, ...variables },
          updatedAt: new Date(),
        });
      }

      return { previousSettings, previousOrg };
    },

    onError: (error, _variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.organizations.settings(), context.previousSettings);
      }
      if (context?.previousOrg) {
        queryClient.setQueryData(queryKeys.organizations.current(), context.previousOrg);
      }

      if (showToast) {
        toast.error('Failed to update settings', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
      }

      onError?.(error as Error);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });

      if (showToast) {
        toast.success('Settings updated successfully');
      }

      onSuccess?.();
    },
  });
}

export interface UseUpdateOrganizationBrandingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

/**
 * Mutation hook to update organization branding only
 *
 * @example
 * ```tsx
 * const updateBranding = useUpdateOrganizationBranding();
 * updateBranding.mutate({ primaryColor: '#0066CC', logoUrl: 'https://...' });
 * ```
 */
export function useUpdateOrganizationBranding(options: UseUpdateOrganizationBrandingOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, showToast = true } = options;

  return useMutation({
    mutationFn: (data: OrganizationBranding) => updateOrganizationBranding({ data }),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.organizations.branding() });

      const previousBranding = queryClient.getQueryData<OrganizationBranding & { name: string }>(
        queryKeys.organizations.branding()
      );
      const previousOrg = queryClient.getQueryData<Organization>(
        queryKeys.organizations.current()
      );

      // Optimistically update branding
      if (previousBranding) {
        queryClient.setQueryData(queryKeys.organizations.branding(), {
          ...previousBranding,
          ...variables,
        });
      }

      // Also update the organization cache if it exists
      if (previousOrg) {
        queryClient.setQueryData(queryKeys.organizations.current(), {
          ...previousOrg,
          branding: { ...previousOrg.branding, ...variables },
          updatedAt: new Date(),
        });
      }

      return { previousBranding, previousOrg };
    },

    onError: (error, _variables, context) => {
      if (context?.previousBranding) {
        queryClient.setQueryData(queryKeys.organizations.branding(), context.previousBranding);
      }
      if (context?.previousOrg) {
        queryClient.setQueryData(queryKeys.organizations.current(), context.previousOrg);
      }

      if (showToast) {
        toast.error('Failed to update branding', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
      }

      onError?.(error as Error);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.branding() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });

      if (showToast) {
        toast.success('Branding updated successfully');
      }

      onSuccess?.();
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS (Backward Compatibility - will be removed in v4)
// ============================================================================

/**
 * @deprecated Use `useOrganizationQuery()` and `useUpdateOrganization()` instead
 */
export function useOrganization() {
  const query = useOrganizationQuery();
  const mutation = useUpdateOrganization({ showToast: false });

  return {
    organization: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateOrganization: mutation,
  };
}

/**
 * @deprecated Use `useOrganizationSettingsQuery()` and `useUpdateOrganizationSettings()` instead
 */
export function useOrganizationSettings() {
  const query = useOrganizationSettingsQuery();
  const mutation = useUpdateOrganizationSettings({ showToast: false });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings: mutation,
  };
}

/**
 * @deprecated Use `useOrganizationBrandingQuery()` and `useUpdateOrganizationBranding()` instead
 */
export function useOrganizationBranding() {
  const query = useOrganizationBrandingQuery();
  const mutation = useUpdateOrganizationBranding({ showToast: false });

  return {
    branding: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateBranding: mutation,
  };
}
