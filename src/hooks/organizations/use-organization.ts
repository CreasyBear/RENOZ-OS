/**
 * Organization Hook
 *
 * Manages organization data and mutations using TanStack Query.
 * Provides full organization details for settings pages.
 *
 * @example
 * ```tsx
 * function OrganizationSettings() {
 *   const { organization, isLoading, updateOrganization } = useOrganization();
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return <OrganizationForm organization={organization} onSubmit={updateOrganization.mutate} />;
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getOrganization,
  updateOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
  getOrganizationBranding,
  updateOrganizationBranding,
} from '@/server/functions/settings/organizations';

// ============================================================================
// TYPES
// ============================================================================

export interface OrganizationAddress {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface OrganizationSettings {
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  fiscalYearStart?: number;
  defaultPaymentTerms?: number;
  portalBranding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    websiteUrl?: string;
  };
}

export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  websiteUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  abn?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: OrganizationAddress | null;
  settings?: OrganizationSettings | null;
  branding?: OrganizationBranding | null;
  plan: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateOrganizationInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  abn?: string;
  address?: OrganizationAddress;
  settings?: OrganizationSettings;
  branding?: OrganizationBranding;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get organization details
 */
export function useOrganization() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.organizations.current(),
    queryFn: () => getOrganization(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOrganizationInput) => updateOrganization({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
    },
  });

  return {
    organization: query.data as Organization | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateOrganization: updateMutation,
  };
}

/**
 * Get organization settings only
 */
export function useOrganizationSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.organizations.settings(),
    queryFn: () => getOrganizationSettings(),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrganizationSettings) => updateOrganizationSettings({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
    },
  });

  return {
    settings: query.data as OrganizationSettings | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings: updateMutation,
  };
}

/**
 * Get organization branding only
 */
export function useOrganizationBranding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKeys.organizations.all, 'branding'],
    queryFn: () => getOrganizationBranding(),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrganizationBranding) => updateOrganizationBranding({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.organizations.all, 'branding'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
    },
  });

  return {
    branding: query.data as (OrganizationBranding & { name: string }) | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateBranding: updateMutation,
  };
}
