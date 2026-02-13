/**
 * Financial Summary Report Hook
 *
 * @see src/server/functions/reports/financial-summary.ts
 * @see reports_domain_remediation Phase 6
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFinancialSummaryReport, generateFinancialSummaryReport } from '@/server/functions/reports';
import { queryKeys } from '@/lib/query-keys';
import type {
  GetFinancialSummaryReportInput,
  GenerateFinancialSummaryReportInput,
} from '@/lib/schemas/reports/financial-summary';

export interface UseFinancialSummaryReportOptions extends GetFinancialSummaryReportInput {
  enabled?: boolean;
}

export function useFinancialSummaryReport(options: Partial<UseFinancialSummaryReportOptions> = {}) {
  const { enabled = true, dateFrom, dateTo, periodType = 'monthly' } = options;

  const dateFromStr = dateFrom instanceof Date ? dateFrom.toISOString().split('T')[0] : dateFrom;
  const dateToStr = dateTo instanceof Date ? dateTo.toISOString().split('T')[0] : dateTo;
  const fromStr = dateFromStr ?? '';
  const toStr = dateToStr ?? '';

  return useQuery({
    queryKey: queryKeys.reports.financialSummary(fromStr, toStr, periodType),
    queryFn: async () => {
      const result = await getFinancialSummaryReport({
        data: {
          dateFrom: dateFrom instanceof Date ? dateFrom : new Date(fromStr),
          dateTo: dateTo instanceof Date ? dateTo : new Date(toStr),
          periodType,
        },
      });
      if (result == null) throw new Error('Financial summary report returned no data');
      return result;
    },
    enabled: enabled && !!dateFromStr && !!dateToStr,
    staleTime: 60 * 1000,
  });
}

export function useExportFinancialSummaryReport() {
  return useMutation({
    mutationFn: (input: GenerateFinancialSummaryReportInput) =>
      generateFinancialSummaryReport({ data: input }),
  });
}
