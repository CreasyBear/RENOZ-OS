/**
 * Unified Activities Hook
 *
 * Fetches and combines audit trail activities with planned activities
 * into a single timeline view.
 *
 * @see queryKeys.unifiedActivities in @/lib/query-keys.ts
 */

import { useQuery } from '@tanstack/react-query';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { transformAuditActivity, transformPlannedActivity } from '@/lib/schemas/unified-activity';
import { getEntityActivities } from '@/server/functions/activities/activities';
import { getCustomerActivities } from '@/server/customers';
import { queryKeys } from '@/lib/query-keys';
import type { ActivityEntityType } from '@/lib/schemas/activities';

// ============================================================================
// HOOK
// ============================================================================

export interface UseUnifiedActivitiesOptions {
  entityType: string;
  entityId: string;
  enabled?: boolean;
  pageSize?: number;
}

/**
 * Hook to fetch unified activities for an entity.
 * Currently supports 'customer' entity type with plans to expand.
 */
export function useUnifiedActivities({
  entityType,
  entityId,
  enabled = true,
  pageSize = 50,
}: UseUnifiedActivitiesOptions) {
  // Fetch audit trail activities
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    error: auditError,
  } = useQuery({
    queryKey: queryKeys.unifiedActivities.entityAudit(entityType, entityId),
    queryFn: async () => {
      const result = await getEntityActivities({
        data: {
          entityType: entityType as ActivityEntityType,
          entityId,
          pageSize,
        },
      });
      return result.items.map((item) => transformAuditActivity(item as Parameters<typeof transformAuditActivity>[0]));
    },
    enabled: enabled && !!entityId,
  });

  // Fetch planned activities (only for customer entity type currently)
  const {
    data: plannedData,
    isLoading: isLoadingPlanned,
    error: plannedError,
  } = useQuery({
    queryKey: queryKeys.unifiedActivities.entityPlanned(entityType, entityId),
    queryFn: async () => {
      if (entityType !== 'customer') {
        return [];
      }
      const result = await getCustomerActivities({
        data: {
          customerId: entityId,
        },
      });
      // Transform planned activities to unified format
      return result.map((item) => transformPlannedActivity(item));
    },
    enabled: enabled && !!entityId && entityType === 'customer',
  });

  // Merge and sort activities
  const activities: UnifiedActivity[] = (() => {
    const audit = auditData || [];
    const planned = plannedData || [];

    // Combine and sort by createdAt (newest first)
    return [...audit, ...planned].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  })();

  return {
    activities,
    isLoading: isLoadingAudit || isLoadingPlanned,
    error: auditError || plannedError,
    hasError: !!auditError || !!plannedError,
  };
}

// ============================================================================
// MOCK DATA HELPER (for development/testing)
// ============================================================================

export function useMockUnifiedActivities(
  options: UseUnifiedActivitiesOptions & { mockData?: UnifiedActivity[] } = { entityType: '', entityId: '' }
) {
  const { mockData } = options;

  return {
    activities: mockData || getMockActivities(),
    isLoading: false,
    error: null,
    hasError: false,
  };
}

function getMockActivities(): UnifiedActivity[] {
  const now = new Date();

  return [
    {
      id: '1',
      source: 'planned',
      entityType: 'customer',
      entityId: 'cust-1',
      type: 'call',
      description: 'Discussed quote for solar installation',
      subject: 'Solar Installation Quote Follow-up',
      userId: 'user-1',
      userName: 'Alice Johnson',
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      direction: 'outbound',
      duration: 15,
      outcome: 'Interested, requested proposal',
      isCompleted: true,
      isOverdue: false,
    },
    {
      id: '2',
      source: 'audit',
      entityType: 'customer',
      entityId: 'cust-1',
      type: 'updated',
      action: 'updated',
      description: 'Updated customer: Acme Solar Corp',
      userId: 'user-1',
      userName: 'Alice Johnson',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      changes: {
        fields: ['phone', 'industry'],
        before: { phone: '+61 2 9000 0000', industry: 'Technology' },
        after: { phone: '+61 2 9000 1234', industry: 'Energy' },
      },
      isCompleted: true,
      isOverdue: false,
    },
    {
      id: '3',
      source: 'audit',
      entityType: 'customer',
      entityId: 'cust-1',
      type: 'email_sent',
      action: 'email_sent',
      description: 'Email sent to john@acmesolar.com: Solar Installation Quote',
      userId: 'user-1',
      userName: 'Alice Johnson',
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      metadata: {
        emailId: 'email-1',
        recipientEmail: 'john@acmesolar.com',
      },
      isCompleted: true,
      isOverdue: false,
    },
    {
      id: '4',
      source: 'planned',
      entityType: 'customer',
      entityId: 'cust-1',
      type: 'meeting',
      description: 'Site visit to discuss installation requirements',
      subject: 'Site Survey',
      userId: 'user-2',
      userName: 'Bob Smith',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      direction: 'outbound',
      isCompleted: false,
      isOverdue: false,
    },
    {
      id: '5',
      source: 'audit',
      entityType: 'customer',
      entityId: 'cust-1',
      type: 'created',
      action: 'created',
      description: 'Created customer: Acme Solar Corp',
      userId: 'user-1',
      userName: 'Alice Johnson',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      isCompleted: true,
      isOverdue: false,
    },
  ];
}
