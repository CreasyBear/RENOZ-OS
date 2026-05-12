/**
 * Escalation Rule Hooks
 *
 * Mutations for support escalation-rule management.
 *
 * @see src/server/functions/support/escalation.ts
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { deleteEscalationRule } from '@/server/functions/support/escalation';

/**
 * Delete an escalation rule.
 */
export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deleteEscalationRule({ data: { ruleId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.escalationRules() });
    },
  });
}
