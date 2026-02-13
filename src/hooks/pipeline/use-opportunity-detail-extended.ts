/**
 * Opportunity Detail Extended Hooks
 *
 * TanStack Query hooks for opportunity alerts and active items.
 * These support the 5-zone layout pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/server/functions/pipeline/opportunity-detail-extended.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getOpportunityAlerts,
  getOpportunityActiveItems,
} from '@/server/functions/pipeline/opportunity-detail-extended';
import type {
  OpportunityAlertsResponse,
  OpportunityActiveItems,
} from '@/lib/schemas/pipeline/opportunity-detail-extended';

// ============================================================================
// ALERTS HOOK
// ============================================================================

export interface UseOpportunityAlertsOptions {
  opportunityId: string;
  enabled?: boolean;
  quoteExpiryWarningDays?: number;
  stalenessDays?: number;
  closeWarningDays?: number;
}

/**
 * Fetch alerts for an opportunity (Zone 3 of detail view).
 *
 * Alerts include:
 * - Expired/expiring quotes
 * - Overdue follow-ups
 * - Stale deals (no activity)
 * - Approaching close dates
 */
export function useOpportunityAlerts({
  opportunityId,
  enabled = true,
  quoteExpiryWarningDays = 7,
  stalenessDays = 14,
  closeWarningDays = 7,
}: UseOpportunityAlertsOptions) {
  return useQuery({
    queryKey: queryKeys.opportunities.alerts(opportunityId),
    queryFn: async () => {
      const result = await getOpportunityAlerts({
        data: {
          opportunityId,
          quoteExpiryWarningDays,
          stalenessDays,
          closeWarningDays,
        },
      });
      if (result == null) throw new Error('Opportunity alerts returned no data');
      return result as OpportunityAlertsResponse;
    },
    enabled: enabled && !!opportunityId,
    staleTime: 60 * 1000, // 1 minute - alerts don't change frequently
    refetchOnWindowFocus: true, // Refresh alerts when user returns to tab
  });
}

// ============================================================================
// ACTIVE ITEMS HOOK
// ============================================================================

export interface UseOpportunityActiveItemsOptions {
  opportunityId: string;
  enabled?: boolean;
  pendingActivitiesLimit?: number;
  quoteVersionsLimit?: number;
}

/**
 * Fetch active items for an opportunity (Overview tab content).
 *
 * Active items include:
 * - Pending activities
 * - Scheduled follow-ups
 * - Recent quote versions
 * - Activity staleness info
 */
export function useOpportunityActiveItems({
  opportunityId,
  enabled = true,
  pendingActivitiesLimit = 5,
  quoteVersionsLimit = 3,
}: UseOpportunityActiveItemsOptions) {
  return useQuery<OpportunityActiveItems>({
    queryKey: queryKeys.opportunities.activeItems(opportunityId),
    queryFn: async () => {
      const result = await getOpportunityActiveItems({
        data: {
          opportunityId,
          pendingActivitiesLimit,
          quoteVersionsLimit,
        },
      });
      if (result == null) throw new Error('Opportunity active items returned no data');
      return result;
    },
    enabled: enabled && !!opportunityId,
    staleTime: 30 * 1000, // 30 seconds - more dynamic than alerts
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  OpportunityAlertsResponse,
  OpportunityActiveItems,
  OpportunityAlert,
  OpportunityAlertType,
  OpportunityAlertSeverity,
  PendingActivity,
  RecentQuoteVersion,
} from '@/lib/schemas/pipeline/opportunity-detail-extended';
