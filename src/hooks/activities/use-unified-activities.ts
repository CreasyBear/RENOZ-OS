/**
 * Unified Activities Hook
 *
 * Fetches and combines audit trail activities with planned activities
 * into a single timeline view.
 *
 * @see queryKeys.unifiedActivities in @/lib/query-keys.ts
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  transformAuditActivity,
  transformPlannedActivity,
  transformOpportunityActivity,
  type OpportunityActivityRaw,
} from '@/lib/schemas/unified-activity';
import { getEntityActivities } from '@/server/functions/activities/activities';
import { getCustomerActivities } from '@/server/functions/customers/customers';
import { getCustomerEmailActivities } from '@/server/functions/communications/customer-communications';
import { getActivityTimeline } from '@/server/functions/pipeline/pipeline';
import { queryKeys } from '@/lib/query-keys';
import { isActivityEntityType, type UseUnifiedActivitiesOptions } from '@/lib/schemas/activities';
import type { ActivityWithUser } from '@/lib/schemas/activities';
import type { CursorPaginatedResponse } from '@/lib/db/pagination';

function getEntityActivityItems(
  result: CursorPaginatedResponse<ActivityWithUser> | ActivityWithUser[] | null | undefined
) {
  if (Array.isArray(result)) {
    return result;
  }

  if (result && Array.isArray(result.items)) {
    return result.items;
  }

  throw new Error('Entity activities returned an invalid response');
}

function unwrapServerFnResult(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  if ('result' in record && record.result !== value) {
    return unwrapServerFnResult(record.result);
  }
  if ('data' in record && record.data !== value) {
    return unwrapServerFnResult(record.data);
  }

  return value;
}

function normalizeEntityActivitiesResult(
  result: unknown
): CursorPaginatedResponse<ActivityWithUser> | ActivityWithUser[] | null | undefined {
  const unwrapped = unwrapServerFnResult(result);

  if (Array.isArray(unwrapped) || unwrapped == null) {
    return unwrapped as ActivityWithUser[] | null | undefined;
  }

  if (
    typeof unwrapped === 'object' &&
    unwrapped !== null &&
    'items' in unwrapped &&
    Array.isArray((unwrapped as { items?: unknown }).items)
  ) {
    return unwrapped as CursorPaginatedResponse<ActivityWithUser>;
  }

  return undefined;
}

function getOpportunityTimelineActivities(result: unknown): OpportunityActivityRaw[] {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('activities' in result) ||
    !Array.isArray((result as { activities?: unknown }).activities)
  ) {
    throw new Error('Activity timeline returned an invalid response');
  }

  return (result as { activities: OpportunityActivityRaw[] }).activities;
}

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
  const getEntityActivitiesFn = useServerFn(getEntityActivities);
  const getCustomerActivitiesFn = useServerFn(getCustomerActivities);
  const getCustomerEmailActivitiesFn = useServerFn(getCustomerEmailActivities);
  const getActivityTimelineFn = useServerFn(getActivityTimeline);

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
      try {
        // Validate entityType before use
        if (!isActivityEntityType(entityType)) {
          throw new Error(`Invalid entity type: ${entityType}`);
        }

        const result = normalizeEntityActivitiesResult(
          await getEntityActivitiesFn({
            data: {
              entityType,
              entityId,
              relatedCustomerId,
              pageSize,
            },
          })
        );
        const items = getEntityActivityItems(result);
        return items.map((item) => transformAuditActivity(item));
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity history is temporarily unavailable. Please refresh and try again.',
        });
      }
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
      try {
        if (entityType !== 'customer') {
          return [];
        }
        const result = unwrapServerFnResult(
          await getCustomerActivitiesFn({
            data: {
              customerId: entityId,
            },
          })
        );
        if (!Array.isArray(result)) {
          throw new Error('Customer activities returned an invalid response');
        }
        return result.map((item) => transformPlannedActivity(item));
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Planned customer activity is temporarily unavailable. Please refresh and try again.',
        });
      }
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
      try {
        const result = unwrapServerFnResult(
          await getCustomerEmailActivitiesFn({
            data: {
              customerId: entityId,
              limit: 50,
            },
          })
        );
        if (!Array.isArray(result)) {
          throw new Error('Customer email activities returned an invalid response');
        }
        return result;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer email activity is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!entityId && entityType === 'customer',
  });

  // Fetch opportunity activities (only for opportunity entity type)
  // Reuses pipeline.activityTimeline key so pipeline mutations invalidate correctly
  const {
    data: opportunityData,
    isLoading: isLoadingOpportunity,
    error: opportunityError,
  } = useQuery({
    queryKey: queryKeys.pipeline.activityTimeline(entityId, { days: 90 }),
    queryFn: async () => {
      try {
        const result = unwrapServerFnResult(
          await getActivityTimelineFn({
            data: { opportunityId: entityId, days: 90 },
          })
        );
        if (!result) throw new Error('Activity timeline returned no data');
        const activities = getOpportunityTimelineActivities(result);
        return activities.map((a) =>
          transformOpportunityActivity(
            {
              id: a.id,
              type: a.type,
              description: a.description,
              outcome: a.outcome,
              scheduledAt: a.scheduledAt,
              completedAt: a.completedAt,
              createdAt: a.createdAt,
              createdBy: a.createdBy,
            },
            entityId
          )
        );
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Opportunity activity is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!entityId && entityType === 'opportunity',
  });

  // Merge and sort activities (audit + planned + emails + opportunity)
  const activities: UnifiedActivity[] = (() => {
    const audit = auditData || [];
    const planned = plannedData || [];
    const emails = emailData || [];
    const opportunity = opportunityData || [];

    return [...audit, ...planned, ...emails, ...opportunity].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  })();

  return {
    activities,
    isLoading:
      isLoadingAudit ||
      isLoadingPlanned ||
      isLoadingEmails ||
      isLoadingOpportunity,
    error: auditError || plannedError || emailError || opportunityError,
    hasError:
      !!auditError ||
      !!plannedError ||
      !!emailError ||
      !!opportunityError,
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
