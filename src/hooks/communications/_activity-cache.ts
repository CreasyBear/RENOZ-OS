import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface CommunicationActivityMutationIdentity {
  customerId?: string | null;
  opportunityId?: string | null;
}

function invalidateActivityCollections(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.activities.feeds() });
  queryClient.invalidateQueries({ queryKey: queryKeys.activities.statsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.activities.leaderboards() });
}

function invalidateCustomerActivityQueries(queryClient: QueryClient, customerId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.activities.byCustomer(customerId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.unifiedActivities.entityAudit('customer', customerId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.unifiedActivities.entityAuditWithRelated('customer', customerId, null),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.communications.customerCommunications(customerId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.unifiedActivities.entityPrefix('order'),
  });
}

function invalidateOpportunityActivityQueries(queryClient: QueryClient, opportunityId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.activities.byOpportunity(opportunityId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.unifiedActivities.entityAudit('opportunity', opportunityId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.unifiedActivities.entityAuditWithRelated('opportunity', opportunityId, null),
  });
}

export function invalidateCommunicationActivityMutationQueries(
  queryClient: QueryClient,
  { customerId, opportunityId }: CommunicationActivityMutationIdentity
) {
  invalidateActivityCollections(queryClient);

  if (customerId) {
    invalidateCustomerActivityQueries(queryClient, customerId);
  }

  if (opportunityId) {
    invalidateOpportunityActivityQueries(queryClient, opportunityId);
  }
}
