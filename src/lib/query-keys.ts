/**
 * Query Key Factory
 *
 * Centralized query key definitions for TanStack Query.
 * Uses the factory pattern for type-safe, hierarchical cache invalidation.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 *
 * @example
 * ```tsx
 * // In a hook
 * const { data } = useQuery({
 *   queryKey: queryKeys.customers.list({ status: 'active' }),
 *   queryFn: () => getCustomers({ status: 'active' }),
 * })
 *
 * // Invalidate all customer queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
 *
 * // Invalidate only customer lists (not details)
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
 *
 * // Invalidate a specific customer
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) })
 * ```
 */

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface CustomerFilters {
  search?: string
  status?: string
  type?: string
  size?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  cursor?: string
}

export interface OrderFilters {
  search?: string
  status?: string
  customerId?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  cursor?: string
}

export interface OpportunityFilters {
  search?: string
  status?: string
  stage?: string
  assignedTo?: string
  customerId?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  cursor?: string
}

export interface JobFilters {
  status?: 'pending' | 'running' | 'completed' | 'failed'
  type?: string
  limit?: number
}

export interface InventoryFilters {
  search?: string
  category?: string
  status?: string
  lowStock?: boolean
  page?: number
  pageSize?: number
  cursor?: string
}

export interface ContactFilters {
  customerId?: string
  search?: string
  isPrimary?: boolean
}

export interface NotificationFilters {
  status?: 'pending' | 'read' | 'dismissed'
  type?: string
  limit?: number
}

export interface RmaFilters {
  status?: string
  reason?: string
  customerId?: string
  orderId?: string
  issueId?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface IssueFilters {
  status?: string
  priority?: string
  type?: string
  customerId?: string
  assignedToUserId?: string
  search?: string
  limit?: number
  offset?: number
  includeSlaMetrics?: boolean
}

export interface KbCategoryFilters {
  parentId?: string | null
  isActive?: boolean
  includeArticleCount?: boolean
}

export interface KbArticleFilters {
  categoryId?: string
  status?: string
  search?: string
  tags?: string[]
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CsatFilters {
  issueId?: string
  rating?: number
  minRating?: number
  maxRating?: number
  source?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface IssueTemplateFilters {
  type?: string
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SlaConfigurationFilters {
  domain?: 'support' | 'warranty' | 'jobs'
  isActive?: boolean
  includeDefaults?: boolean
}

// ============================================================================
// WARRANTY FILTER TYPES
// ============================================================================

export interface WarrantyFilters {
  customerId?: string
  productId?: string
  orderId?: string
  status?: string
  search?: string
  expiresWithin?: number
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Generic filter type for warranty claims - accepts any filter object
 */
export type WarrantyClaimFilters = Record<string, unknown>

export interface WarrantyPolicyFilters {
  type?: string
  isActive?: boolean
  search?: string
  includeDefaultOnly?: boolean
  includeSlaConfig?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface WarrantyExtensionFilters {
  warrantyId?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface WarrantyAnalyticsFilters {
  startDate?: string
  endDate?: string
  warrantyType?: string
  claimType?: string
}

export interface ClaimsTrendFilters {
  months?: number
  warrantyType?: string
  claimType?: string
}

export interface ExpiringWarrantiesFilters {
  days?: number
  limit?: number
  sortOrder?: 'asc' | 'desc'
}

export interface ExpiringWarrantiesReportFilters {
  days?: number
  customerId?: string
  productId?: string
  status?: 'active' | 'expired' | 'all'
  sortBy?: 'expiry_asc' | 'expiry_desc' | 'customer' | 'product'
  page?: number
  limit?: number
}

// ============================================================================
// DASHBOARD FILTER TYPES
// ============================================================================

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

// ============================================================================
// QUERY KEYS FACTORY
// ============================================================================

export const queryKeys = {
  // -------------------------------------------------------------------------
  // AUTH (re-export for convenience, canonical source in lib/auth/hooks.ts)
  // -------------------------------------------------------------------------
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // -------------------------------------------------------------------------
  // CURRENT USER (app-level user with role/org, not Supabase auth user)
  // -------------------------------------------------------------------------
  currentUser: {
    all: ['currentUser'] as const,
    detail: () => [...queryKeys.currentUser.all, 'detail'] as const,
  },

  // -------------------------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------------------------
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: CustomerFilters) =>
      [...queryKeys.customers.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    tags: {
      all: () => [...queryKeys.customers.all, 'tags'] as const,
      list: () => [...queryKeys.customers.tags.all(), 'list'] as const,
    },
  },

  // -------------------------------------------------------------------------
  // CONTACTS
  // -------------------------------------------------------------------------
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (filters?: ContactFilters) =>
      [...queryKeys.contacts.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.contacts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.contacts.lists(), { customerId }] as const,
  },

  // -------------------------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------------------------
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: OrderFilters) =>
      [...queryKeys.orders.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.orders.lists(), { customerId }] as const,
  },

  // -------------------------------------------------------------------------
  // OPPORTUNITIES / PIPELINE
  // -------------------------------------------------------------------------
  opportunities: {
    all: ['opportunities'] as const,
    lists: () => [...queryKeys.opportunities.all, 'list'] as const,
    list: (filters?: OpportunityFilters) =>
      [...queryKeys.opportunities.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.opportunities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.opportunities.details(), id] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.opportunities.lists(), { customerId }] as const,
    byStage: (stage: string) =>
      [...queryKeys.opportunities.lists(), { stage }] as const,
  },

  // Alias for pipeline views (same data, different UI context)
  pipeline: {
    all: ['pipeline'] as const,
    board: () => [...queryKeys.pipeline.all, 'board'] as const,
    stages: () => [...queryKeys.pipeline.all, 'stages'] as const,
  },

  // -------------------------------------------------------------------------
  // JOBS (Background job tracking)
  // -------------------------------------------------------------------------
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: JobFilters) =>
      [...queryKeys.jobs.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    active: () => [...queryKeys.jobs.all, 'active'] as const,
  },

  // -------------------------------------------------------------------------
  // INVENTORY
  // -------------------------------------------------------------------------
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters?: InventoryFilters) =>
      [...queryKeys.inventory.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.inventory.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inventory.details(), id] as const,
    lowStock: () => [...queryKeys.inventory.all, 'lowStock'] as const,
  },

  // -------------------------------------------------------------------------
  // FILES / ATTACHMENTS
  // -------------------------------------------------------------------------
  files: {
    all: ['files'] as const,
    lists: () => [...queryKeys.files.all, 'list'] as const,
    list: (entityType: string, entityId: string) =>
      [...queryKeys.files.lists(), entityType, entityId] as const,
    details: () => [...queryKeys.files.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.files.details(), id] as const,
    download: (id: string) => [...queryKeys.files.all, 'download', id] as const,
    downloads: (ids: string[]) =>
      [...queryKeys.files.all, 'downloads', ids] as const,
  },

  // -------------------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------------------
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters?: NotificationFilters) =>
      [...queryKeys.notifications.lists(), filters ?? {}] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    count: () => [...queryKeys.notifications.all, 'count'] as const,
  },

  // -------------------------------------------------------------------------
  // API TOKENS
  // -------------------------------------------------------------------------
  apiTokens: {
    all: ['api-tokens'] as const,
    lists: () => [...queryKeys.apiTokens.all, 'list'] as const,
    list: () => [...queryKeys.apiTokens.lists()] as const,
  },

  // -------------------------------------------------------------------------
  // ONBOARDING
  // -------------------------------------------------------------------------
  onboarding: {
    all: ['onboarding'] as const,
    progress: () => [...queryKeys.onboarding.all, 'progress'] as const,
    checklist: () => [...queryKeys.onboarding.all, 'checklist'] as const,
  },

  // -------------------------------------------------------------------------
  // DISMISSED HINTS (Empty state hints)
  // -------------------------------------------------------------------------
  dismissedHints: {
    all: ['dismissedHints'] as const,
    list: () => [...queryKeys.dismissedHints.all, 'list'] as const,
  },

  // -------------------------------------------------------------------------
  // USERS (Admin user management)
  // -------------------------------------------------------------------------
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: { role?: string; status?: string }) =>
      [...queryKeys.users.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // -------------------------------------------------------------------------
  // ORGANIZATIONS
  // -------------------------------------------------------------------------
  organizations: {
    all: ['organizations'] as const,
    current: () => [...queryKeys.organizations.all, 'current'] as const,
    settings: () => [...queryKeys.organizations.all, 'settings'] as const,
  },

  // -------------------------------------------------------------------------
  // DASHBOARD / ANALYTICS
  // -------------------------------------------------------------------------
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recentActivity'] as const,
    charts: (chartType: string) =>
      [...queryKeys.dashboard.all, 'charts', chartType] as const,

    // Targets nested factory
    targets: {
      all: () => [...queryKeys.dashboard.all, 'targets'] as const,
      lists: () => [...queryKeys.dashboard.targets.all(), 'list'] as const,
      list: (filters?: TargetsFilters) =>
        [...queryKeys.dashboard.targets.lists(), filters ?? {}] as const,
      details: () => [...queryKeys.dashboard.targets.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.dashboard.targets.details(), id] as const,
      progress: (filters?: TargetProgressFilters) =>
        [...queryKeys.dashboard.targets.all(), 'progress', filters ?? {}] as const,
    },

    // Metrics nested factory
    metrics: {
      all: () => [...queryKeys.dashboard.all, 'metrics'] as const,
      summary: (filters?: DashboardMetricsFilters) =>
        [...queryKeys.dashboard.metrics.all(), 'summary', filters ?? {}] as const,
      comparison: (filters: ComparisonFilters) =>
        [...queryKeys.dashboard.metrics.all(), 'comparison', filters] as const,
      enhanced: (filters: EnhancedComparisonFilters) =>
        [...queryKeys.dashboard.metrics.all(), 'enhanced', filters] as const,
    },
  },

  // -------------------------------------------------------------------------
  // SUPPORT DOMAIN
  // -------------------------------------------------------------------------
  support: {
    all: ['support'] as const,

    // Issues
    issuesList: () => [...queryKeys.support.all, 'issues', 'list'] as const,
    issuesListFiltered: (filters?: IssueFilters) =>
      [...queryKeys.support.issuesList(), filters ?? {}] as const,
    issueDetails: () => [...queryKeys.support.all, 'issues', 'detail'] as const,
    issueDetail: (id: string) => [...queryKeys.support.issueDetails(), id] as const,

    // RMAs
    rmasList: () => [...queryKeys.support.all, 'rmas', 'list'] as const,
    rmasListFiltered: (filters?: RmaFilters) =>
      [...queryKeys.support.rmasList(), filters ?? {}] as const,
    rmaDetails: () => [...queryKeys.support.all, 'rmas', 'detail'] as const,
    rmaDetail: (id: string) => [...queryKeys.support.rmaDetails(), id] as const,

    // Knowledge Base - Categories
    kbCategories: () => [...queryKeys.support.all, 'kb', 'categories'] as const,
    kbCategoryList: (filters?: KbCategoryFilters) =>
      [...queryKeys.support.kbCategories(), 'list', filters ?? {}] as const,
    kbCategoryDetails: () => [...queryKeys.support.kbCategories(), 'detail'] as const,
    kbCategoryDetail: (id: string) =>
      [...queryKeys.support.kbCategoryDetails(), id] as const,

    // Knowledge Base - Articles
    kbArticles: () => [...queryKeys.support.all, 'kb', 'articles'] as const,
    kbArticleList: (filters?: KbArticleFilters) =>
      [...queryKeys.support.kbArticles(), 'list', filters ?? {}] as const,
    kbArticleDetails: () => [...queryKeys.support.kbArticles(), 'detail'] as const,
    kbArticleDetail: (id: string) =>
      [...queryKeys.support.kbArticleDetails(), id] as const,

    // CSAT
    csatList: () => [...queryKeys.support.all, 'csat', 'list'] as const,
    csatListFiltered: (filters?: CsatFilters) =>
      [...queryKeys.support.csatList(), filters ?? {}] as const,
    csatDetails: () => [...queryKeys.support.all, 'csat', 'detail'] as const,
    csatDetail: (issueId: string) =>
      [...queryKeys.support.csatDetails(), issueId] as const,
    csatMetrics: (filters?: { startDate?: string; endDate?: string }) =>
      [...queryKeys.support.all, 'csat', 'metrics', filters ?? {}] as const,

    // Support Metrics
    supportMetrics: () => [...queryKeys.support.all, 'metrics'] as const,
    supportMetricsWithDates: (startDate?: string, endDate?: string) =>
      [...queryKeys.support.supportMetrics(), { startDate, endDate }] as const,

    // Issue Templates
    issueTemplatesList: () =>
      [...queryKeys.support.all, 'issueTemplates', 'list'] as const,
    issueTemplatesListFiltered: (filters?: IssueTemplateFilters) =>
      [...queryKeys.support.issueTemplatesList(), filters ?? {}] as const,
    issueTemplateDetails: () =>
      [...queryKeys.support.all, 'issueTemplates', 'detail'] as const,
    issueTemplateDetail: (id: string) =>
      [...queryKeys.support.issueTemplateDetails(), id] as const,
    popularTemplates: (limit?: number) =>
      [...queryKeys.support.all, 'issueTemplates', 'popular', limit ?? 5] as const,

    // SLA Configurations
    slaConfigurations: () => [...queryKeys.support.all, 'sla', 'configurations'] as const,
    slaConfigurationsList: (filters?: SlaConfigurationFilters) =>
      [...queryKeys.support.slaConfigurations(), 'list', filters ?? {}] as const,
    slaConfigurationDetail: (id: string) =>
      [...queryKeys.support.slaConfigurations(), 'detail', id] as const,
    slaConfigurationDefault: (domain: string) =>
      [...queryKeys.support.slaConfigurations(), 'default', domain] as const,
    slaHasConfigurations: (domain?: string) =>
      [...queryKeys.support.slaConfigurations(), 'has', domain ?? 'all'] as const,

    // SLA Tracking
    slaTracking: () => [...queryKeys.support.all, 'sla', 'tracking'] as const,
    slaTrackingDetail: (id: string) =>
      [...queryKeys.support.slaTracking(), 'detail', id] as const,
    slaTrackingState: (id: string) =>
      [...queryKeys.support.slaTracking(), 'state', id] as const,
    slaTrackingEvents: (id: string) =>
      [...queryKeys.support.slaTracking(), 'events', id] as const,

    // SLA Metrics
    slaMetrics: (filters?: { domain?: string; startDate?: string; endDate?: string }) =>
      [...queryKeys.support.all, 'sla', 'metrics', filters ?? {}] as const,
    slaReportByIssueType: (filters?: { startDate?: string; endDate?: string }) =>
      [...queryKeys.support.all, 'sla', 'report', 'issueType', filters ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------------------------
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: { search?: string; categoryId?: string; status?: string }) =>
      [...queryKeys.products.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // -------------------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------------------
  categories: {
    all: ['categories'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
  },

  // -------------------------------------------------------------------------
  // WARRANTY DOMAIN
  // -------------------------------------------------------------------------
  warranties: {
    all: ['warranties'] as const,
    lists: () => [...queryKeys.warranties.all, 'list'] as const,
    list: (filters?: WarrantyFilters) =>
      [...queryKeys.warranties.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.warranties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warranties.details(), id] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.warranties.lists(), { customerId }] as const,
    byProduct: (productId: string) =>
      [...queryKeys.warranties.lists(), { productId }] as const,
  },

  warrantyCertificates: {
    all: ['warrantyCertificates'] as const,
    details: () => [...queryKeys.warrantyCertificates.all, 'detail'] as const,
    detail: (warrantyId: string) =>
      [...queryKeys.warrantyCertificates.details(), warrantyId] as const,
  },

  warrantyClaims: {
    all: ['warrantyClaims'] as const,
    lists: () => [...queryKeys.warrantyClaims.all, 'list'] as const,
    list: (filters?: WarrantyClaimFilters) =>
      [...queryKeys.warrantyClaims.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.warrantyClaims.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warrantyClaims.details(), id] as const,
    byWarranty: (warrantyId: string) =>
      [...queryKeys.warrantyClaims.lists(), { warrantyId }] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.warrantyClaims.lists(), { customerId }] as const,
  },

  warrantyExtensions: {
    all: ['warrantyExtensions'] as const,
    lists: () => [...queryKeys.warrantyExtensions.all, 'list'] as const,
    list: (warrantyId: string) =>
      [...queryKeys.warrantyExtensions.lists(), { warrantyId }] as const,
    history: () => [...queryKeys.warrantyExtensions.all, 'history'] as const,
    historyFiltered: (filters?: WarrantyExtensionFilters) =>
      [...queryKeys.warrantyExtensions.history(), filters ?? {}] as const,
    details: () => [...queryKeys.warrantyExtensions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warrantyExtensions.details(), id] as const,
  },

  warrantyPolicies: {
    all: ['warrantyPolicies'] as const,
    lists: () => [...queryKeys.warrantyPolicies.all, 'list'] as const,
    list: (filters?: WarrantyPolicyFilters) =>
      [...queryKeys.warrantyPolicies.lists(), filters ?? {}] as const,
    listWithSla: (filters?: WarrantyPolicyFilters) =>
      [...queryKeys.warrantyPolicies.lists(), 'withSla', filters ?? {}] as const,
    details: () => [...queryKeys.warrantyPolicies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warrantyPolicies.details(), id] as const,
    defaults: () => [...queryKeys.warrantyPolicies.all, 'defaults'] as const,
    default: (type?: string) =>
      [...queryKeys.warrantyPolicies.defaults(), type ?? 'any'] as const,
    resolve: (params?: { productId?: string; customerId?: string; type?: string }) =>
      [...queryKeys.warrantyPolicies.all, 'resolve', params ?? {}] as const,
  },

  warrantyAnalytics: {
    all: ['warrantyAnalytics'] as const,
    summary: (filters?: WarrantyAnalyticsFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'summary', filters ?? {}] as const,
    claimsByProduct: (filters?: WarrantyAnalyticsFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'claimsByProduct', filters ?? {}] as const,
    claimsTrend: (input?: ClaimsTrendFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'claimsTrend', input ?? {}] as const,
    claimsByType: (filters?: WarrantyAnalyticsFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'claimsByType', filters ?? {}] as const,
    slaCompliance: (filters?: WarrantyAnalyticsFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'slaCompliance', filters ?? {}] as const,
    cycleCount: (filters?: WarrantyAnalyticsFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'cycleCount', filters ?? {}] as const,
    extensionVsResolution: (filters?: WarrantyAnalyticsFilters) =>
      [...queryKeys.warrantyAnalytics.all, 'extensionVsResolution', filters ?? {}] as const,
    filterOptions: () =>
      [...queryKeys.warrantyAnalytics.all, 'filterOptions'] as const,
  },

  expiringWarranties: {
    all: ['expiringWarranties'] as const,
    lists: () => [...queryKeys.expiringWarranties.all, 'list'] as const,
    list: (filters?: ExpiringWarrantiesFilters) =>
      [...queryKeys.expiringWarranties.lists(), filters ?? {}] as const,
  },

  expiringWarrantiesReport: {
    all: ['expiringWarrantiesReport'] as const,
    lists: () => [...queryKeys.expiringWarrantiesReport.all, 'list'] as const,
    list: (filters?: ExpiringWarrantiesReportFilters) =>
      [...queryKeys.expiringWarrantiesReport.lists(), filters ?? {}] as const,
    filterOptions: ['expiringWarrantiesReport', 'filterOptions'] as const,
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type QueryKeys = typeof queryKeys
