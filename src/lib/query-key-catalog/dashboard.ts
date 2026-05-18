export interface TargetsFilters {
  status?: 'pending' | 'on_track' | 'behind' | 'ahead' | 'completed'
  metric?: string
  period?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TargetProgressFilters {
  status?: 'pending' | 'on_track' | 'behind' | 'ahead' | 'completed'
  metric?: string
  includeCompleted?: boolean
}

export interface DashboardMetricsFilters {
  startDate?: string
  endDate?: string
  metrics?: string[]
}

export interface ComparisonFilters {
  startDate: string
  endDate: string
  comparisonType: 'previous_period' | 'previous_year' | 'previous_quarter' | 'previous_month' | 'custom'
  comparisonStartDate?: string
  comparisonEndDate?: string
  metrics?: string[]
}

export interface EnhancedComparisonFilters extends ComparisonFilters {
  includeStatistics?: boolean
  includeTrends?: boolean
  includeInsights?: boolean
}

export interface ScheduledReportsFilters {
  search?: string
  isActive?: boolean
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  format?: 'pdf' | 'csv' | 'xlsx' | 'html'
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const all = ['dashboard'] as const;

const stats = () => [...all, 'stats'] as const;
const recentActivity = () => [...all, 'recentActivity'] as const;
const charts = (chartType: string) =>
  [...all, 'charts', chartType] as const;
const orders = () => [...all, 'orders'] as const;
const pipeline = () => [...all, 'pipeline'] as const;
const inventory = () => [...all, 'inventory'] as const;
const alerts = () => [...all, 'alerts'] as const;
const hotLeads = () => [...all, 'hotLeads'] as const;
const overview = () => [...all, 'overview'] as const;
const overviewWonThisMonth = (dateFrom: string, dateTo: string) =>
  [...overview(), 'wonThisMonth', dateFrom, dateTo] as const;

const recentOutstanding = (limit: number) =>
  [...all, 'recentOutstanding', limit] as const;
const recentOverdue = (limit: number) =>
  [...all, 'recentOverdue', limit] as const;
const recentOpportunities = (limit: number) =>
  [...all, 'recentOpportunities', limit] as const;
const recentOrdersToShip = (limit: number) =>
  [...all, 'recentOrdersToShip', limit] as const;

const inventoryCounts = (patterns: Array<{ key: string; patterns: string[] }>) =>
  [...all, 'inventoryCounts', patterns] as const;
const trackedProductsInventory = (productIds: string[]) =>
  [...all, 'trackedProductsInventory', productIds] as const;

const targetsAll = () => [...all, 'targets'] as const;
const targetsLists = () => [...targetsAll(), 'list'] as const;
const targetsDetails = () => [...targetsAll(), 'detail'] as const;
const targets = {
  all: targetsAll,
  lists: targetsLists,
  list: (filters?: TargetsFilters) =>
    [...targetsLists(), filters ?? {}] as const,
  details: targetsDetails,
  detail: (id: string) => [...targetsDetails(), id] as const,
  progress: (filters?: TargetProgressFilters) =>
    [...targetsAll(), 'progress', filters ?? {}] as const,
};

const metricsAll = () => [...all, 'metrics'] as const;
const metrics = {
  all: metricsAll,
  summary: (filters?: DashboardMetricsFilters) =>
    [...metricsAll(), 'summary', filters ?? {}] as const,
  comparison: (filters: ComparisonFilters) =>
    [...metricsAll(), 'comparison', filters] as const,
  enhanced: (filters: EnhancedComparisonFilters) =>
    [...metricsAll(), 'enhanced', filters] as const,
};

const scheduledReportsAll = () => [...all, 'scheduledReports'] as const;
const scheduledReportsLists = () => [...scheduledReportsAll(), 'list'] as const;
const scheduledReportsDetails = () => [...scheduledReportsAll(), 'detail'] as const;
const scheduledReports = {
  all: scheduledReportsAll,
  lists: scheduledReportsLists,
  list: (filters?: ScheduledReportsFilters) =>
    [...scheduledReportsLists(), filters ?? {}] as const,
  details: scheduledReportsDetails,
  detail: (id: string) => [...scheduledReportsDetails(), id] as const,
  status: (id: string) => [...scheduledReportsAll(), 'status', id] as const,
};

const layoutsAll = () => [...all, 'layouts'] as const;
const layoutsLists = () => [...layoutsAll(), 'list'] as const;
const layouts = {
  all: layoutsAll,
  lists: layoutsLists,
  list: (filters?: Record<string, unknown>) =>
    [...layoutsLists(), filters ?? {}] as const,
  detail: (id: string) => [...layoutsAll(), 'detail', id] as const,
  default: () => [...layoutsAll(), 'default'] as const,
  userLayout: () => [...layoutsAll(), 'userLayout'] as const,
  widgets: () => [...layoutsAll(), 'widgets'] as const,
};

const onboardingAll = () => [...all, 'onboarding'] as const;
const onboarding = {
  all: onboardingAll,
  progress: () => [...onboardingAll(), 'progress'] as const,
};

export const dashboardQueryKeys = {
  all,
  stats,
  recentActivity,
  charts,
  orders,
  pipeline,
  inventory,
  alerts,
  hotLeads,
  overview,
  overviewWonThisMonth,
  recentOutstanding,
  recentOverdue,
  recentOpportunities,
  recentOrdersToShip,
  inventoryCounts,
  trackedProductsInventory,
  targets,
  metrics,
  scheduledReports,
  layouts,
  onboarding,
};
