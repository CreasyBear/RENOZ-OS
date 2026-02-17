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
import { getCustomerEmailActivities } from '@/server/functions/communications/customer-communications';
import { queryKeys } from '@/lib/query-keys';
import { isActivityEntityType, type UseUnifiedActivitiesOptions } from '@/lib/schemas/activities';

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to fetch unified activities for an entity.
 * Currently supports 'customer' entity type with plans to expand.
 */
export function useUnifiedActivities({
  entityType,
  entityId,
  relatedCustomerId,
  enabled = true,
  pageSize = 50,
}: UseUnifiedActivitiesOptions) {
  // Fetch audit trail activities
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    error: auditError,
  } =   useQuery({
    queryKey: queryKeys.unifiedActivities.entityAuditWithRelated(
      entityType,
      entityId,
      relatedCustomerId ?? null
    ),
    queryFn: async () => {
      // Validate entityType before use
      if (!isActivityEntityType(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      
      const result = await getEntityActivities({
        data: {
          entityType,
          entityId,
          relatedCustomerId,
          pageSize,
        },
      });
      // transformAuditActivity expects Activity & { user?: ... }
      // ActivityWithUser extends Activity and has compatible user structure
      // The user property structure matches exactly, so we can pass directly
      return result.items.map((item) => transformAuditActivity(item));
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
      return result.map((item) => transformPlannedActivity(item));
    },
    enabled: enabled && !!entityId && entityType === 'customer',
  });

  // Fetch email activities (only for customer entity type)
  const {
    data: emailData,
    isLoading: isLoadingEmails,
    error: emailError,
  } = useQuery({
    queryKey: queryKeys.unifiedActivities.entityEmails(entityId),
    queryFn: async () => {
      const result = await getCustomerEmailActivities({
        data: {
          customerId: entityId,
          limit: 50,
        },
      });
      return result;
    },
    enabled: enabled && !!entityId && entityType === 'customer',
  });

  // Merge and sort activities (audit + planned + emails)
  const activities: UnifiedActivity[] = (() => {
    const audit = auditData || [];
    const planned = plannedData || [];
    const emails = emailData || [];

    return [...audit, ...planned, ...emails].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  })();

  return {
    activities,
    isLoading: isLoadingAudit || isLoadingPlanned || isLoadingEmails,
    error: auditError || plannedError || emailError,
    hasError: !!auditError || !!plannedError || !!emailError,
  };
}

// ============================================================================
// MOCK DATA HELPER (development only — tree-shaken from production builds)
// ============================================================================

export function useMockUnifiedActivities(
  options: UseUnifiedActivitiesOptions & { mockData?: UnifiedActivity[] } = {
    entityType: 'customer',
    entityId: '00000000-0000-0000-0000-000000000000',
    pageSize: 50,
  }
) {
  if (!import.meta.env.DEV) {
    throw new Error('useMockUnifiedActivities is only available in development');
  }
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
