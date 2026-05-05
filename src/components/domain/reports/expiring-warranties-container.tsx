/**
 * Expiring Warranties Report Container
 *
 * Data fetching and handlers for expiring warranties report.
 *
 * @source warranties from useExpiringWarrantiesReport hook
 * @source filterOptions from useExpiringWarrantiesFilterOptions hook
 */

import { useCallback, useMemo } from 'react';
import { toast } from '@/lib/toast';
import {
  useExpiringWarrantiesReport,
  useExpiringWarrantiesFilterOptions,
} from '@/hooks';
import {
  formatGeneratedReportError,
  useCreateScheduledReport,
  useGenerateReport,
} from '@/hooks/reports';
import type {
  ExpiringWarrantiesSearchParams,
  ExpiringWarrantiesReportPageProps,
} from '@/lib/schemas/reports/expiring-warranties';
import type { CreateScheduledReportInput } from '@/lib/schemas/reports/scheduled-reports';
import { generateCSV, downloadCSV, formatDateForFilename } from '@/lib/utils/csv';
import { formatDateAustralian } from '@/lib/warranty';
import { ExpiringWarrantiesReport } from './expiring-warranties-report';

const PAGE_SIZE = 20;
const EXPIRING_WARRANTIES_CSV_HEADERS = [
  'Warranty Number',
  'Product',
  'Customer',
  'Expiry Date',
  'Days Until Expiry',
  'Urgency',
  'Policy Type',
];

function getExpiringWarrantyRange(range: ExpiringWarrantiesSearchParams['range']) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + Number(range));
  return {
    dateFrom: start.toISOString().split('T')[0],
    dateTo: end.toISOString().split('T')[0],
  };
}

export function ExpiringWarrantiesReportContainer({
  search,
  onUpdateSearch,
}: ExpiringWarrantiesReportPageProps) {
  const { data, isLoading, error, refetch } = useExpiringWarrantiesReport({
    days: parseInt(search.range, 10),
    customerId: search.customer,
    productId: search.product,
    status: search.status,
    sortBy: search.sort,
    page: search.page,
    limit: PAGE_SIZE,
  });

  const { data: filterOptions } = useExpiringWarrantiesFilterOptions();
  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  const updateSearch = useCallback(
    (updates: Partial<ExpiringWarrantiesSearchParams>) => {
      onUpdateSearch({
        ...search,
        ...updates,
        page: 'page' in updates ? updates.page ?? 1 : 1,
      });
    },
    [onUpdateSearch, search]
  );

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (search.range !== '30') {
      filters.push({
        key: 'range',
        label: `${search.range} days`,
        onRemove: () => updateSearch({ range: '30' }),
      });
    }
    if (search.customer && filterOptions?.customers) {
      const customer = filterOptions.customers.find((c) => c.id === search.customer);
      filters.push({
        key: 'customer',
        label: customer?.name ?? 'Customer filter',
        onRemove: () => updateSearch({ customer: undefined }),
      });
    }
    if (search.product && filterOptions?.products) {
      const product = filterOptions.products.find((p) => p.id === search.product);
      filters.push({
        key: 'product',
        label: product?.name ?? 'Product filter',
        onRemove: () => updateSearch({ product: undefined }),
      });
    }
    if (search.status !== 'active') {
      filters.push({
        key: 'status',
        label: search.status === 'expired' ? 'Expired' : 'All statuses',
        onRemove: () => updateSearch({ status: 'active' }),
      });
    }
    return filters;
  }, [search, filterOptions, updateSearch]);

  const handleExport = useCallback(
    (format: 'csv' | 'pdf' | 'excel') => {
      const warranties = data?.warranties ?? [];

      if (format === 'csv') {
        if (!warranties.length) {
          toast.error('No expiring warranties to export');
          return;
        }

        const csv = generateCSV({
          headers: EXPIRING_WARRANTIES_CSV_HEADERS,
          rows: warranties.map((w) => [
            w.warrantyNumber,
            w.productName ?? '',
            w.customerName ?? '',
            formatDateAustralian(w.expiryDate, 'short'),
            w.daysUntilExpiry,
            w.urgencyLevel,
            w.policyType,
          ]),
        });
        const date = formatDateForFilename();
        downloadCSV(csv, `expiring-warranties-${date}.csv`);
        toast.success('Expiring warranties exported as CSV');
        return;
      }

      const reportFormat = format === 'excel' ? 'xlsx' : 'pdf';
      const exportRange = getExpiringWarrantyRange(search.range);
      generateReport
        .mutateAsync({
          metrics: ['warranty_count', 'expiring_warranties', 'warranty_value'],
          dateFrom: exportRange.dateFrom,
          dateTo: exportRange.dateTo,
          format: reportFormat,
          includeCharts: true,
          includeTrends: true,
        })
        .then((result) => {
          window.open(result.reportUrl, '_blank', 'noopener,noreferrer');
        })
        .catch((error: unknown) => {
          toast.error(formatGeneratedReportError(error, 'expiring warranties report', format));
        });
    },
    [data, search.range, generateReport]
  );

  const clearAllFilters = useCallback(() => {
    onUpdateSearch({
      ...search,
      range: '30',
      status: 'active',
      sort: 'expiry_asc',
      page: 1,
    });
  }, [onUpdateSearch, search]);

  const handleScheduleSubmit = useCallback(
    async (input: CreateScheduledReportInput) => {
      await createScheduledReport.mutateAsync(input);
    },
    [createScheduledReport]
  );

  const warranties = data?.warranties ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalValue = data?.totalValue ?? 0;
  const avgDaysToExpiry = data?.avgDaysToExpiry ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <ExpiringWarrantiesReport
      search={search}
      warranties={warranties}
      totalCount={totalCount}
      totalValue={totalValue}
      avgDaysToExpiry={avgDaysToExpiry}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
      filterOptions={filterOptions ?? undefined}
      activeFilters={activeFilters}
      onUpdateSearch={updateSearch}
      onClearFilters={clearAllFilters}
      onExport={handleExport}
      onRetry={() => refetch()}
      onScheduleSubmit={handleScheduleSubmit}
      isScheduleSubmitting={createScheduledReport.isPending}
    />
  );
}
