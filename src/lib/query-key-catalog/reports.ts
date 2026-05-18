import type { ReportType } from '@/lib/schemas/reports/report-favorites';

export interface ReportsScheduledReportsFilters {
  search?: string
  isActive?: boolean
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  format?: 'pdf' | 'csv' | 'xlsx' | 'html'
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ReportsTargetsFilters {
  metric?: string
  period?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ReportsTargetProgressFilters {
  metric?: string
  period?: string
}

export interface ReportsCustomReportsFilters {
  isShared?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export interface ReportsReportFavoritesFilters {
  reportType?: ReportType
  page?: number
  pageSize?: number
}

const all = ['reports'] as const;

const pipelineForecast = (startDate: string, endDate: string, groupBy: string) =>
  [...all, 'pipelineForecast', startDate, endDate, groupBy] as const;
const pipelineVelocity = (startDate: string, endDate: string) =>
  [...all, 'pipelineVelocity', startDate, endDate] as const;
const revenueAttribution = (startDate: string, endDate: string) =>
  [...all, 'revenueAttribution', startDate, endDate] as const;

const winLossAnalysis = (dateFrom: string, dateTo: string) =>
  [...all, 'winLossAnalysis', dateFrom, dateTo] as const;
const competitors = (dateFrom: string, dateTo: string) =>
  [...all, 'competitors', dateFrom, dateTo] as const;

const procurementAnalytics = (dateRange?: Record<string, unknown>) =>
  [...all, 'procurementAnalytics', dateRange ?? {}] as const;

const scheduledReportsAll = () => [...all, 'scheduledReports'] as const;
const scheduledReportsLists = () => [...scheduledReportsAll(), 'list'] as const;
const scheduledReportsDetails = () => [...scheduledReportsAll(), 'detail'] as const;
const scheduledReports = {
  all: scheduledReportsAll,
  lists: scheduledReportsLists,
  list: (filters?: ReportsScheduledReportsFilters) =>
    [...scheduledReportsLists(), filters ?? {}] as const,
  details: scheduledReportsDetails,
  detail: (id: string) => [...scheduledReportsDetails(), id] as const,
  status: (id: string) => [...scheduledReportsAll(), 'status', id] as const,
};

const targetsAll = () => [...all, 'targets'] as const;
const targetsLists = () => [...targetsAll(), 'list'] as const;
const targetsDetails = () => [...targetsAll(), 'detail'] as const;
const targets = {
  all: targetsAll,
  lists: targetsLists,
  list: (filters?: ReportsTargetsFilters) =>
    [...targetsLists(), filters ?? {}] as const,
  details: targetsDetails,
  detail: (id: string) => [...targetsDetails(), id] as const,
  progress: (filters?: ReportsTargetProgressFilters) =>
    [...targetsAll(), 'progress', filters ?? {}] as const,
};

const customReportsAll = () => [...all, 'customReports'] as const;
const customReportsLists = () => [...customReportsAll(), 'list'] as const;
const customReportsDetails = () => [...customReportsAll(), 'detail'] as const;
const customReports = {
  all: customReportsAll,
  lists: customReportsLists,
  list: (filters?: ReportsCustomReportsFilters) =>
    [...customReportsLists(), filters ?? {}] as const,
  details: customReportsDetails,
  detail: (id: string) => [...customReportsDetails(), id] as const,
  results: (id: string, params?: Record<string, unknown>) =>
    [...customReportsAll(), 'result', id, params ?? {}] as const,
};

const reportFavoritesAll = () => [...all, 'reportFavorites'] as const;
const reportFavoritesLists = () => [...reportFavoritesAll(), 'list'] as const;
const reportFavoritesDetails = () => [...reportFavoritesAll(), 'detail'] as const;
const reportFavorites = {
  all: reportFavoritesAll,
  lists: reportFavoritesLists,
  list: (filters?: ReportsReportFavoritesFilters) =>
    [...reportFavoritesLists(), filters ?? {}] as const,
  details: reportFavoritesDetails,
  detail: (id: string) => [...reportFavoritesDetails(), id] as const,
};

const metricsAll = () => [...all, 'metrics'] as const;
const metrics = {
  all: metricsAll,
  available: () => [...metricsAll(), 'available'] as const,
};

const financialSummary = (dateFrom: string, dateTo: string, periodType?: string) =>
  [...all, 'financialSummary', dateFrom, dateTo, periodType ?? 'monthly'] as const;

export const reportsQueryKeys = {
  all,
  pipelineForecast,
  pipelineVelocity,
  revenueAttribution,
  winLossAnalysis,
  competitors,
  procurementAnalytics,
  scheduledReports,
  targets,
  customReports,
  reportFavorites,
  metrics,
  financialSummary,
};
