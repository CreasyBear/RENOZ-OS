/**
 * Customer statement hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  generateStatement,
  listStatements,
  markStatementSent,
  getStatementHistory,
  getStatement,
} from '@/server/functions/financial/statements';

function rethrowFinancialReadError(
  error: unknown,
  options: {
    fallbackMessage: string;
    contractType: 'always-shaped' | 'detail-not-found';
    notFoundMessage?: string;
  }
): never {
  if (isReadQueryError(error)) {
    throw error;
  }

  throw normalizeReadQueryError(error, options);
}

// ============================================================================
// CUSTOMER STATEMENT HOOKS
// ============================================================================

export interface UseStatementsOptions {
  customerId?: string | null;
  page?: number;
  pageSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  onlySent?: boolean;
  enabled?: boolean;
}

/**
 * List statement history for a customer.
 */
export function useStatements(options: UseStatementsOptions) {
  const { enabled = true, customerId, page = 1, pageSize = 10, dateFrom, dateTo, onlySent } = options;
  const listFn = useServerFn(listStatements);
  const filters = {
    page,
    pageSize,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
    onlySent,
  };

  return useQuery({
    queryKey: queryKeys.financial.statements(customerId ?? undefined, filters),
    queryFn: async () => {
      try {
        if (!customerId) {
          throw new Error('Customer is required to load statements.');
        }
        const result = await listFn({ data: { customerId, page, pageSize, dateFrom, dateTo, onlySent } });
        return requireReadResult(result, {
          message: 'Statements list returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Statements are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Statements are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single statement by ID.
 */
export function useStatement(statementId: string, enabled = true) {
  const getFn = useServerFn(getStatement);

  return useQuery({
    queryKey: queryKeys.financial.statement(statementId),
    queryFn: async () => {
      try {
        const result = await getFn({ data: { id: statementId } });
        return requireReadResult(result, {
          message: 'Statement not found',
          contractType: 'detail-not-found',
          fallbackMessage: 'Statement details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested statement could not be found.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Statement details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested statement could not be found.',
        });
      }
    },
    enabled: enabled && !!statementId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get statement history for a customer.
 */
export function useStatementHistory(
  customerId: string,
  options: { page?: number; pageSize?: number; dateFrom?: Date; dateTo?: Date } = {},
  enabled = true
) {
  const getHistoryFn = useServerFn(getStatementHistory);
  const { page = 1, pageSize = 10, dateFrom, dateTo } = options;

  return useQuery({
    queryKey: queryKeys.financial.statementHistory(customerId, { page, pageSize, dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() }),
    queryFn: async () => {
      try {
        const result = await getHistoryFn({ data: { customerId, page, pageSize, dateFrom, dateTo } });
        return requireReadResult(result, {
          message: 'Statement history returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Statement history is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Statement history is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 30 * 1000,
  });
}

export interface GenerateStatementInput {
  customerId: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Generate a new statement for a customer.
 */
export function useGenerateStatement() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateStatement);

  return useMutation({
    mutationFn: (input: GenerateStatementInput) =>
      generateFn({
        data: {
          customerId: input.customerId,
          startDate: input.dateFrom,
          endDate: input.dateTo,
        },
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.statements(variables.customerId),
      });
    },
  });
}

/**
 * Mark a statement as sent via email.
 */
export function useMarkStatementSent() {
  const queryClient = useQueryClient();
  const markSentFn = useServerFn(markStatementSent);

  return useMutation({
    mutationFn: (data: { statementId: string; sentToEmail?: string; customerId: string }) =>
      markSentFn({ data: { statementId: data.statementId, sentToEmail: data.sentToEmail } }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.statements(variables.customerId),
      });
    },
  });
}
