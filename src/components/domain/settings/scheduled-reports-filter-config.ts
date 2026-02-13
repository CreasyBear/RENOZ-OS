/**
 * Scheduled Reports Filter Configuration
 *
 * Config-driven filter definition for scheduled reports.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import type { FilterBarConfig, FilterOption } from '@/components/shared/filters';
import type { ReportFrequency, ReportFormat } from '@/lib/schemas/reports/scheduled-reports';

export type ScheduledReportStatusFilter = 'active' | 'inactive';

export interface ScheduledReportsFiltersState extends Record<string, unknown> {
  search: string;
  frequency: ReportFrequency | null;
  format: ReportFormat | null;
  isActive: ScheduledReportStatusFilter | null;
}

export const DEFAULT_SCHEDULED_REPORTS_FILTERS: ScheduledReportsFiltersState = {
  search: '',
  frequency: null,
  format: null,
  isActive: null,
};

const FREQUENCY_OPTIONS: FilterOption<ReportFrequency>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FORMAT_OPTIONS: FilterOption<ReportFormat>[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'html', label: 'HTML' },
];

const STATUS_OPTIONS: FilterOption<ScheduledReportStatusFilter>[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Paused' },
];

export const SCHEDULED_REPORTS_FILTER_CONFIG: FilterBarConfig<ScheduledReportsFiltersState> = {
  search: {
    placeholder: 'Search reports...',
    fields: ['name', 'description'],
  },
  filters: [
    {
      key: 'frequency',
      label: 'Frequency',
      type: 'select',
      options: FREQUENCY_OPTIONS,
      primary: true,
      allLabel: 'All Frequencies',
    },
    {
      key: 'format',
      label: 'Format',
      type: 'select',
      options: FORMAT_OPTIONS,
      primary: true,
      allLabel: 'All Formats',
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      primary: true,
      allLabel: 'All Status',
    },
  ],
  labels: {
    frequency: 'Frequency',
    format: 'Format',
    isActive: 'Status',
  },
};
