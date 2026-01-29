/**
 * Current Organization Hook
 *
 * Manages the current organization context for multi-org support.
 * Persists selection in localStorage and syncs across tabs.
 *
 * @example
 * ```tsx
 * function OrgDisplay() {
 *   const { currentOrg, setCurrentOrg, organizations } = useCurrentOrg()
 *
 *   return (
 *     <select
 *       value={currentOrg?.id}
 *       onChange={(e) => setCurrentOrg(e.target.value)}
 *     >
 *       {organizations.map((org) => (
 *         <option key={org.id} value={org.id}>{org.name}</option>
 *       ))}
 *     </select>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from './use-current-user';
import { useOrganizationQuery } from '@/hooks/organizations';

// ============================================================================
// TYPES
// ============================================================================

export interface CurrentOrg {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

export interface UseCurrentOrgResult {
  /** Current active organization */
  currentOrg: CurrentOrg | null;
  /** List of organizations user has access to */
  organizations: CurrentOrg[];
  /** Whether organizations are loading */
  isLoading: boolean;
  /** Set the current organization by ID */
  setCurrentOrg: (orgId: string) => void;
  /** Refresh organization list */
  refresh: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORG_STORAGE_KEY = 'renoz_current_org_id';

// ============================================================================
// HOOK
// ============================================================================

export function useCurrentOrg(): UseCurrentOrgResult {
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: organization, isLoading: organizationLoading } = useOrganizationQuery();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ORG_STORAGE_KEY);
  });

  const organizations: CurrentOrg[] = organization
    ? [
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logoUrl: organization.branding?.logoUrl ?? null,
        },
      ]
    : currentUser?.organizationId
      ? [
          {
            id: currentUser.organizationId,
            name: currentUser.user_metadata?.organizationName || 'My Organization',
            slug: 'my-org',
            logoUrl: null,
          },
        ]
      : [];

  // Determine current org
  const currentOrg =
    organizations.find((org) => org.id === selectedOrgId) || organizations[0] || null;

  // Sync selected org to localStorage
  useEffect(() => {
    if (currentOrg && typeof window !== 'undefined') {
      localStorage.setItem(ORG_STORAGE_KEY, currentOrg.id);
    }
  }, [currentOrg]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleStorageChange(e: StorageEvent) {
      if (e.key === ORG_STORAGE_KEY && e.newValue) {
        setSelectedOrgId(e.newValue);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setCurrentOrg = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORG_STORAGE_KEY, orgId);
    }
  }, []);

  const refresh = useCallback(() => {
    // In a full implementation, this would refetch organizations
    // For now, it's a placeholder
  }, []);

  return {
    currentOrg,
    organizations,
    isLoading: userLoading || organizationLoading,
    setCurrentOrg,
    refresh,
  };
}
