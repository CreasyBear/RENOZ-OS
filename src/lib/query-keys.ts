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
// SUPPLIER FILTER TYPES
// ============================================================================

export interface SupplierFilters {
  search?: string
  status?: string
  type?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
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
    mfa: {
      all: () => [...queryKeys.auth.all, 'mfa'] as const,
      factors: () => [...queryKeys.auth.all, 'mfa', 'factors'] as const,
      status: () => [...queryKeys.auth.all, 'mfa', 'status'] as const,
    },
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
    healthMetrics: (customerId: string) =>
      [...queryKeys.customers.all, 'healthMetrics', customerId] as const,
    health: {
      all: () => [...queryKeys.customers.all, 'health'] as const,
      metrics: (customerId: string) =>
        [...queryKeys.customers.health.all(), 'metrics', customerId] as const,
      history: (customerId: string, months?: number) =>
        [...queryKeys.customers.health.all(), 'history', customerId, months] as const,
    },
    segments: {
      all: () => [...queryKeys.customers.all, 'segments'] as const,
      lists: () => [...queryKeys.customers.segments.all(), 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.customers.segments.lists(), filters ?? {}] as const,
      detail: (id: string) =>
        [...queryKeys.customers.segments.all(), 'detail', id] as const,
      analytics: (segmentId: string, filters?: Record<string, unknown>) =>
        [...queryKeys.customers.segments.all(), 'analytics', segmentId, filters ?? {}] as const,
    },
    duplicates: {
      all: () => [...queryKeys.customers.all, 'duplicates'] as const,
      scan: (customerId?: string) =>
        [...queryKeys.customers.duplicates.all(), 'scan', customerId] as const,
      detection: (input?: Record<string, unknown>) =>
        [...queryKeys.customers.duplicates.all(), 'detection', input] as const,
      history: (filters?: Record<string, unknown>) =>
        [...queryKeys.customers.duplicates.all(), 'history', filters] as const,
      check: (input?: Record<string, unknown>) =>
        [...queryKeys.customers.duplicates.all(), 'check', input] as const,
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
    recent: ['orders', 'recent'] as const,
    byStatus: (status: string) =>
      [...queryKeys.orders.lists(), { status }] as const,
    fulfillment: (status?: string) =>
      [...queryKeys.orders.all, 'fulfillment', status ?? ''] as const,
    shipments: (orderId?: string) =>
      [...queryKeys.orders.all, 'shipments', orderId ?? ''] as const,
    templates: (search?: string) =>
      [...queryKeys.orders.all, 'templates', search ?? ''] as const,
    templateDetail: (id: string) =>
      [...queryKeys.orders.all, 'templates', 'detail', id] as const,
    amendments: (orderId: string) =>
      [...queryKeys.orders.all, 'amendments', orderId] as const,
    amendmentDetail: (id: string) =>
      [...queryKeys.orders.all, 'amendments', 'detail', id] as const,
    withCustomer: (orderId: string) =>
      [...queryKeys.orders.details(), orderId, 'withCustomer'] as const,
    assignees: (orgId?: string, roles?: readonly string[]) =>
      [...queryKeys.orders.all, 'assignees', orgId, roles] as const,
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
    hotLeads: () => [...queryKeys.opportunities.all, 'hotLeads'] as const,
  },

  // Alias for pipeline views (same data, different UI context)
  pipeline: {
    all: ['pipeline'] as const,
    board: () => [...queryKeys.pipeline.all, 'board'] as const,
    stages: () => [...queryKeys.pipeline.all, 'stages'] as const,
    expiringQuotes: (warningDays?: number) =>
      [...queryKeys.pipeline.all, 'expiringQuotes', warningDays ?? 7] as const,
    expiredQuotes: () => [...queryKeys.pipeline.all, 'expiredQuotes'] as const,
    activityTimeline: (opportunityId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.pipeline.all, 'activityTimeline', opportunityId, filters ?? {}] as const,
    followUps: (opportunityId: string) =>
      [...queryKeys.pipeline.all, 'followUps', opportunityId] as const,
    quoteVersions: (opportunityId: string) =>
      [...queryKeys.pipeline.all, 'quoteVersions', opportunityId] as const,
    quoteCompare: (version1Id: string, version2Id: string) =>
      [...queryKeys.pipeline.all, 'quoteCompare', version1Id, version2Id] as const,
    activities: (opportunityId: string) =>
      [...queryKeys.pipeline.all, 'activities', opportunityId] as const,
    opportunity: (opportunityId: string) =>
      [...queryKeys.pipeline.all, 'opportunity', opportunityId] as const,
    metrics: () => [...queryKeys.pipeline.all, 'metrics'] as const,
    customers: (filters?: Record<string, unknown>) =>
      [...queryKeys.pipeline.all, 'customers', filters ?? {}] as const,
    products: (filters?: Record<string, unknown>) =>
      [...queryKeys.pipeline.all, 'products', filters ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // FULFILLMENT
  // -------------------------------------------------------------------------
  fulfillment: {
    all: ['fulfillment'] as const,
    lists: () => [...queryKeys.fulfillment.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.fulfillment.lists(), filters ?? {}] as const,
    detail: (orderId: string) =>
      [...queryKeys.fulfillment.all, 'detail', orderId] as const,
    kanban: (filters?: Record<string, unknown>) =>
      [...queryKeys.fulfillment.all, 'kanban', filters ?? {}] as const,
    board: () => [...queryKeys.fulfillment.all, 'board'] as const,
  },

  // -------------------------------------------------------------------------
  // QUOTES
  // -------------------------------------------------------------------------
  quotes: {
    all: ['quotes'] as const,
    lists: () => [...queryKeys.quotes.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.quotes.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.quotes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quotes.details(), id] as const,
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
    viewSync: (interval?: number) => [...queryKeys.jobs.all, 'viewSync', interval] as const,
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
    items: (filters?: { organizationId?: string }) =>
      [...queryKeys.inventory.all, 'items', filters ?? {}] as const,
    alerts: () => [...queryKeys.inventory.all, 'alerts'] as const,
    movements: (filters?: Record<string, unknown>) =>
      [...queryKeys.inventory.all, 'movements', filters ?? {}] as const,
    movementsAll: () => [...queryKeys.inventory.all, 'movements'] as const,
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
    orders: () => [...queryKeys.dashboard.all, 'orders'] as const,
    pipeline: () => [...queryKeys.dashboard.all, 'pipeline'] as const,
    inventory: () => [...queryKeys.dashboard.all, 'inventory'] as const,
    alerts: () => [...queryKeys.dashboard.all, 'alerts'] as const,
    hotLeads: () => [...queryKeys.dashboard.all, 'hotLeads'] as const,

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

    // Scheduled Reports nested factory
    scheduledReports: {
      all: () => [...queryKeys.dashboard.all, 'scheduledReports'] as const,
      lists: () => [...queryKeys.dashboard.scheduledReports.all(), 'list'] as const,
      list: (filters?: ScheduledReportsFilters) =>
        [...queryKeys.dashboard.scheduledReports.lists(), filters ?? {}] as const,
      details: () => [...queryKeys.dashboard.scheduledReports.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.dashboard.scheduledReports.details(), id] as const,
      status: (id: string) => [...queryKeys.dashboard.scheduledReports.all(), 'status', id] as const,
    },

    // Layouts nested factory
    layouts: {
      all: () => [...queryKeys.dashboard.all, 'layouts'] as const,
      lists: () => [...queryKeys.dashboard.layouts.all(), 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.dashboard.layouts.lists(), filters ?? {}] as const,
      detail: (id: string) => [...queryKeys.dashboard.layouts.all(), 'detail', id] as const,
      default: () => [...queryKeys.dashboard.layouts.all(), 'default'] as const,
      userLayout: () => [...queryKeys.dashboard.layouts.all(), 'userLayout'] as const,
      widgets: () => [...queryKeys.dashboard.layouts.all(), 'widgets'] as const,
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

    // CSAT additional keys
    csatMetricsWithFilters: (filters?: Record<string, unknown>) =>
      [...queryKeys.support.all, 'csat', 'metrics', filters ?? {}] as const,
    csatToken: (token: string) =>
      [...queryKeys.support.all, 'csat', 'token', token] as const,

    // Issue Templates additional keys
    issueTemplatesPopular: (limit?: number) =>
      [...queryKeys.support.all, 'issueTemplates', 'popular', limit ?? 5] as const,
  },

  // -------------------------------------------------------------------------
  // JOB PROGRESS (background jobs tracking)
  // -------------------------------------------------------------------------
  jobProgress: {
    all: ['jobProgress'] as const,
    list: (filters?: JobFilters) =>
      [...queryKeys.jobProgress.all, 'list', filters ?? {}] as const,
    detail: (jobId: string) =>
      [...queryKeys.jobProgress.all, 'detail', jobId] as const,
    status: (jobId: string) =>
      [...queryKeys.jobProgress.all, 'status', jobId] as const,
    active: () => [...queryKeys.jobProgress.all, 'active'] as const,
    recent: (limit?: number) =>
      [...queryKeys.jobProgress.all, 'recent', limit ?? 10] as const,
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
    stock: () => [...queryKeys.products.all, 'stock'] as const,
    jobMaterials: (jobId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.products.all, 'jobMaterials', jobId, filters ?? {}] as const,
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

  // -------------------------------------------------------------------------
  // COMMUNICATIONS
  // -------------------------------------------------------------------------
  communications: {
    all: ['communications'] as const,

    // Campaigns
    campaigns: () => [...queryKeys.communications.all, 'campaigns'] as const,
    campaignsList: (filters?: Record<string, unknown>) =>
      [...queryKeys.communications.campaigns(), 'list', filters ?? {}] as const,
    campaignDetail: (id: string) =>
      [...queryKeys.communications.campaigns(), 'detail', id] as const,
    campaignRecipients: (campaignId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.communications.campaigns(), 'recipients', campaignId, filters ?? {}] as const,
    campaignPreview: (criteria: unknown) =>
      [...queryKeys.communications.campaigns(), 'preview', criteria] as const,

    // Templates
    templates: () => [...queryKeys.communications.all, 'templates'] as const,
    templatesList: (filters?: Record<string, unknown>) =>
      [...queryKeys.communications.templates(), 'list', filters ?? {}] as const,
    templateDetail: (id: string) =>
      [...queryKeys.communications.templates(), 'detail', id] as const,
    templateVersions: (templateId: string) =>
      [...queryKeys.communications.templates(), 'versions', templateId] as const,

    // Signatures
    signatures: () => [...queryKeys.communications.all, 'signatures'] as const,
    signaturesList: (filters?: Record<string, unknown>) =>
      [...queryKeys.communications.signatures(), 'list', filters ?? {}] as const,
    signatureDetail: (id: string) =>
      [...queryKeys.communications.signatures(), 'detail', id] as const,

    // Scheduled Emails
    scheduledEmails: () => [...queryKeys.communications.all, 'scheduledEmails'] as const,
    scheduledEmailsList: (filters?: Record<string, unknown>) =>
      [...queryKeys.communications.scheduledEmails(), 'list', filters ?? {}] as const,
    scheduledEmailDetail: (id: string) =>
      [...queryKeys.communications.scheduledEmails(), 'detail', id] as const,

    // Scheduled Calls
    scheduledCalls: () => [...queryKeys.communications.all, 'scheduledCalls'] as const,
    scheduledCallsList: (filters?: Record<string, unknown>) =>
      [...queryKeys.communications.scheduledCalls(), 'list', filters ?? {}] as const,
    scheduledCallDetail: (id: string) =>
      [...queryKeys.communications.scheduledCalls(), 'detail', id] as const,
    upcomingCalls: (filters?: Record<string, unknown>) =>
      [...queryKeys.communications.scheduledCalls(), 'upcoming', filters ?? {}] as const,

    // Contact Preferences
    contactPreference: (contactId: string) =>
      [...queryKeys.communications.all, 'contactPreference', contactId] as const,
    preferenceHistory: (contactId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.communications.all, 'preferenceHistory', contactId, filters ?? {}] as const,

    // Customer Communications
    customerCommunications: (customerId: string) =>
      [...queryKeys.communications.all, 'customer', customerId] as const,

    // Email Suppression (Resend Integration)
    emailSuppression: {
      all: () => [...queryKeys.communications.all, 'emailSuppression'] as const,
      lists: () => [...queryKeys.communications.all, 'emailSuppression', 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.communications.all, 'emailSuppression', 'list', filters ?? {}] as const,
      check: (email: string) =>
        [...queryKeys.communications.all, 'emailSuppression', 'check', email] as const,
    },

    // Email Analytics (Resend Integration)
    emailAnalytics: {
      all: () => [...queryKeys.communications.all, 'emailAnalytics'] as const,
      metrics: (filters?: Record<string, unknown>) =>
        [...queryKeys.communications.all, 'emailAnalytics', 'metrics', filters ?? {}] as const,
    },

    // Domain Verification (Resend Integration)
    domainVerification: {
      all: () => [...queryKeys.communications.all, 'domainVerification'] as const,
      status: () =>
        [...queryKeys.communications.all, 'domainVerification', 'status'] as const,
    },

    // Email Preview (Resend Integration)
    emailPreview: {
      all: () => [...queryKeys.communications.all, 'emailPreview'] as const,
      render: (templateId: string, data?: Record<string, unknown>) =>
        [...queryKeys.communications.all, 'emailPreview', 'render', templateId, data ?? {}] as const,
    },
  },

  // -------------------------------------------------------------------------
  // SUPPLIERS
  // -------------------------------------------------------------------------
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.suppliers.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
    priceHistory: (supplierId: string, productId?: string) =>
      [...queryKeys.suppliers.all, 'priceHistory', supplierId, productId ?? ''] as const,

    // Purchase Orders
    purchaseOrders: () => [...queryKeys.suppliers.all, 'purchaseOrders'] as const,
    purchaseOrdersList: (filters?: Record<string, unknown>) =>
      [...queryKeys.suppliers.purchaseOrders(), 'list', filters ?? {}] as const,
    purchaseOrderDetail: (id: string) =>
      [...queryKeys.suppliers.purchaseOrders(), 'detail', id] as const,
    purchaseOrderItems: (poId: string) =>
      [...queryKeys.suppliers.purchaseOrders(), 'items', poId] as const,
    pendingApprovals: () =>
      [...queryKeys.suppliers.purchaseOrders(), 'pendingApprovals'] as const,

    // Backward compatibility aliases
    purchaseOrdersPendingApprovals: () =>
      [...queryKeys.suppliers.purchaseOrders(), 'pendingApprovals'] as const,
    suppliersList: () => [...queryKeys.suppliers.all, 'list'] as const,
    suppliersListFiltered: (filters?: Record<string, unknown>) =>
      [...queryKeys.suppliers.lists(), filters ?? {}] as const,
    supplierDetail: (id: string) =>
      [...queryKeys.suppliers.details(), id] as const,
    supplierPerformance: (supplierId: string) =>
      [...queryKeys.suppliers.all, 'performance', supplierId] as const,
  },

  // -------------------------------------------------------------------------
  // FINANCIAL
  // -------------------------------------------------------------------------
  financial: {
    all: ['financial'] as const,

    // AR Aging
    arAgingReport: (filters?: Record<string, unknown>) =>
      [...queryKeys.financial.all, 'arAging', 'report', filters ?? {}] as const,
    arAgingCustomer: (customerId: string) =>
      [...queryKeys.financial.all, 'arAging', 'customer', customerId] as const,

    // Credit Notes
    creditNotes: () => [...queryKeys.financial.all, 'creditNotes'] as const,
    creditNotesList: (filters?: Record<string, unknown>) =>
      [...queryKeys.financial.creditNotes(), 'list', filters ?? {}] as const,
    creditNoteDetail: (id: string) =>
      [...queryKeys.financial.creditNotes(), 'detail', id] as const,

    // Payment Schedules
    paymentSchedules: () => [...queryKeys.financial.all, 'paymentSchedules'] as const,
    paymentScheduleDetail: (orderId: string) =>
      [...queryKeys.financial.paymentSchedules(), 'detail', orderId] as const,

    // Revenue
    revenue: () => [...queryKeys.financial.all, 'revenue'] as const,
    revenueByPeriod: (periodType: string, filters?: Record<string, unknown>) =>
      [...queryKeys.financial.revenue(), 'byPeriod', periodType, filters ?? {}] as const,

    // Dashboard Metrics
    dashboardMetrics: (filters?: Record<string, unknown>) =>
      [...queryKeys.financial.all, 'dashboard', filters ?? {}] as const,

    // Reminders
    reminders: () => [...queryKeys.financial.all, 'reminders'] as const,
    reminderHistory: (filters?: Record<string, unknown>) =>
      [...queryKeys.financial.reminders(), 'history', filters ?? {}] as const,
    reminderTemplates: () => [...queryKeys.financial.reminders(), 'templates'] as const,

    // Xero Integration
    xero: () => [...queryKeys.financial.all, 'xero'] as const,
    xeroStatus: (orderId: string) =>
      [...queryKeys.financial.xero(), 'status', orderId] as const,
    xeroSyncs: (status?: string) =>
      [...queryKeys.financial.xero(), 'syncs', status ?? ''] as const,

    // Statements
    statements: (customerId?: string) =>
      [...queryKeys.financial.all, 'statements', customerId ?? ''] as const,

    // Other
    deferredBalance: () => [...queryKeys.financial.all, 'deferredBalance'] as const,
    outstandingInvoices: (filters?: Record<string, unknown>) =>
      [...queryKeys.financial.all, 'outstandingInvoices', filters ?? {}] as const,
    recognitions: (state?: string) =>
      [...queryKeys.financial.all, 'recognitions', state ?? ''] as const,
    recognitionSummary: (dateFrom?: string, dateTo?: string) =>
      [...queryKeys.financial.all, 'recognitionSummary', dateFrom ?? '', dateTo ?? ''] as const,
    topCustomers: (filters?: Record<string, unknown>) =>
      [...queryKeys.financial.all, 'topCustomers', filters ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // ACTIVITIES
  // -------------------------------------------------------------------------
  activities: {
    all: ['activities'] as const,
    feeds: () => [...queryKeys.activities.all, 'feeds'] as const,
    feed: (filters?: Record<string, unknown>) =>
      [...queryKeys.activities.feeds(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.activities.all, 'detail', id] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.activities.all, 'customer', customerId] as const,
    byOpportunity: (opportunityId: string) =>
      [...queryKeys.activities.all, 'opportunity', opportunityId] as const,
    entity: (entityType: string, entityId: string) =>
      [...queryKeys.activities.all, 'entity', entityType, entityId] as const,
    user: (userId: string) => [...queryKeys.activities.all, 'user', userId] as const,
    stats: (query?: Record<string, unknown>) =>
      [...queryKeys.activities.all, 'stats', query ?? {}] as const,
    leaderboard: (filters?: Record<string, unknown>) =>
      [...queryKeys.activities.all, 'leaderboard', filters ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // JOB CALENDAR / TASKS / TIME / MATERIALS / ASSIGNMENTS
  // -------------------------------------------------------------------------
  jobCalendar: {
    all: ['jobCalendar'] as const,
    events: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'events', filters ?? {}] as const,
    eventDetail: (id: string) =>
      [...queryKeys.jobCalendar.all, 'event', id] as const,
    availability: (userId: string, dateRange?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'availability', userId, dateRange ?? {}] as const,
    connected: () => [...queryKeys.jobCalendar.all, 'connected'] as const,
    oauthStatus: () => [...queryKeys.jobCalendar.all, 'oauthStatus'] as const,
    oauth: {
      all: () => [...queryKeys.jobCalendar.all, 'oauth'] as const,
      status: () => [...queryKeys.jobCalendar.all, 'oauth', 'status'] as const,
      calendars: () => [...queryKeys.jobCalendar.all, 'oauth', 'calendars'] as const,
      connection: () => [...queryKeys.jobCalendar.all, 'oauth', 'connection'] as const,
    },
    eventsRange: (startDate: string, endDate: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'eventsRange', startDate, endDate, filters ?? {}] as const,
    unscheduledList: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'unscheduled', filters ?? {}] as const,
    installers: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'installers', filters ?? {}] as const,
    kanbanRange: (startDate: string, endDate: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'kanban', startDate, endDate, filters ?? {}] as const,
    timelineRange: (startDate: string, endDate: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobCalendar.all, 'timeline', startDate, endDate, filters ?? {}] as const,
    timelineStats: (startDate: string, endDate: string) =>
      [...queryKeys.jobCalendar.all, 'timelineStats', startDate, endDate] as const,
  },

  jobTasks: {
    all: ['jobTasks'] as const,
    lists: () => [...queryKeys.jobTasks.all, 'list'] as const,
    list: (jobId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobTasks.lists(), jobId, filters ?? {}] as const,
    detail: (taskId: string) => [...queryKeys.jobTasks.all, 'detail', taskId] as const,
    kanban: {
      all: ['jobTasks', 'kanban'] as const,
      list: (filters?: Record<string, unknown>) => [...queryKeys.jobTasks.kanban.all, 'list', filters ?? {}] as const,
    },
  },

  jobTime: {
    all: ['jobTime'] as const,
    lists: () => [...queryKeys.jobTime.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobTime.all, 'list', filters ?? {}] as const,
    detail: (entryId: string) =>
      [...queryKeys.jobTime.all, 'detail', entryId] as const,
    entries: (jobId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobTime.all, 'entries', jobId, filters ?? {}] as const,
    entryDetail: (entryId: string) =>
      [...queryKeys.jobTime.all, 'entry', entryId] as const,
    summary: (jobId: string) =>
      [...queryKeys.jobTime.all, 'summary', jobId] as const,
    userEntries: (userId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobTime.all, 'user', userId, filters ?? {}] as const,
    cost: (jobId: string) =>
      [...queryKeys.jobTime.all, 'cost', jobId] as const,
    costs: {
      all: () => [...queryKeys.jobTime.all, 'costs'] as const,
      byJob: (jobId: string) => [...queryKeys.jobTime.all, 'costs', jobId] as const,
    },
  },

  jobMaterials: {
    all: ['jobMaterials'] as const,
    lists: () => [...queryKeys.jobMaterials.all, 'list'] as const,
    list: (jobId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobMaterials.lists(), jobId, filters ?? {}] as const,
    detail: (materialId: string) =>
      [...queryKeys.jobMaterials.all, 'detail', materialId] as const,
    summary: (jobId: string) =>
      [...queryKeys.jobMaterials.all, 'summary', jobId] as const,
    cost: {
      all: () => [...queryKeys.jobMaterials.all, 'cost'] as const,
      byJob: (jobId: string) => [...queryKeys.jobMaterials.all, 'cost', jobId] as const,
    },
  },

  jobAssignments: {
    all: ['jobAssignments'] as const,
    lists: () => [...queryKeys.jobAssignments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobAssignments.lists(), filters ?? {}] as const,
    detail: (assignmentId: string) =>
      [...queryKeys.jobAssignments.all, 'detail', assignmentId] as const,
    byJob: (jobId: string) =>
      [...queryKeys.jobAssignments.all, 'byJob', jobId] as const,
    byUser: (userId: string) =>
      [...queryKeys.jobAssignments.all, 'byUser', userId] as const,
    kanbanSelector: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobAssignments.all, 'kanbanSelector', filters ?? {}] as const,
  },

  jobDocuments: {
    all: ['jobDocuments'] as const,
    lists: () => [...queryKeys.jobDocuments.all, 'list'] as const,
    list: (jobId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobDocuments.lists(), jobId, filters ?? {}] as const,
    detail: (documentId: string) =>
      [...queryKeys.jobDocuments.all, 'detail', documentId] as const,
  },

  jobCosting: {
    all: ['jobCosting'] as const,
    lists: () => [...queryKeys.jobCosting.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobCosting.lists(), filters ?? {}] as const,
    detail: (jobId: string) =>
      [...queryKeys.jobCosting.all, 'detail', jobId] as const,
    summary: (jobId: string) =>
      [...queryKeys.jobCosting.all, 'summary', jobId] as const,
    cost: (jobId: string) =>
      [...queryKeys.jobCosting.all, 'cost', jobId] as const,
    job: (jobId: string) =>
      [...queryKeys.jobCosting.all, 'job', jobId] as const,
    report: (jobId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.jobCosting.all, 'report', jobId, filters ?? {}] as const,
  },

  jobTemplates: {
    all: ['jobTemplates'] as const,
    lists: () => [...queryKeys.jobTemplates.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.jobTemplates.lists(), filters ?? {}] as const,
    detail: (templateId: string) =>
      [...queryKeys.jobTemplates.all, 'detail', templateId] as const,
    // Aliases for backwards compatibility
    templates: () => [...queryKeys.jobTemplates.all, 'list'] as const,
    template: (templateId: string) =>
      [...queryKeys.jobTemplates.all, 'detail', templateId] as const,
  },

  // -------------------------------------------------------------------------
  // CHECKLISTS
  // -------------------------------------------------------------------------
  checklists: {
    all: ['checklists'] as const,
    templates: () => [...queryKeys.checklists.all, 'templates'] as const,
    templateList: (includeInactive?: boolean) =>
      [...queryKeys.checklists.templates(), 'list', includeInactive ?? false] as const,
    templateDetail: (templateId: string) =>
      [...queryKeys.checklists.templates(), 'detail', templateId] as const,
    jobChecklist: (jobId: string) =>
      [...queryKeys.checklists.all, 'job', jobId] as const,
    item: (itemId: string) => [...queryKeys.checklists.all, 'item', itemId] as const,
  },

  // -------------------------------------------------------------------------
  // LOCATIONS
  // -------------------------------------------------------------------------
  locations: {
    all: ['locations'] as const,
    lists: () => [...queryKeys.locations.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.locations.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.locations.all, 'detail', id] as const,
    tree: () => [...queryKeys.locations.all, 'tree'] as const,
    contents: (locationId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.locations.all, 'contents', locationId, filters ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------------------------
  settings: {
    all: ['settings'] as const,
    system: () => [...queryKeys.settings.all, 'system'] as const,
    businessHours: () => [...queryKeys.settings.all, 'businessHours'] as const,
    holidays: () => [...queryKeys.settings.all, 'holidays'] as const,
    customFields: (entityType?: string) =>
      [...queryKeys.settings.all, 'customFields', entityType ?? ''] as const,
    dataExports: () => [...queryKeys.settings.all, 'dataExports'] as const,
    winLossReasons: () => [...queryKeys.settings.all, 'winLossReasons'] as const,
  },

  // -------------------------------------------------------------------------
  // OAUTH (Integrations)
  // -------------------------------------------------------------------------
  oauth: {
    all: ['oauth'] as const,
    connections: (organizationId?: string) =>
      [...queryKeys.oauth.all, 'connections', organizationId ?? ''] as const,
    health: (organizationId?: string) =>
      [...queryKeys.oauth.all, 'health', organizationId ?? ''] as const,
    dashboard: (organizationId?: string, timeframe?: string) =>
      [...queryKeys.oauth.all, 'dashboard', organizationId ?? '', timeframe ?? ''] as const,
  },

  // -------------------------------------------------------------------------
  // LAYOUTS (Dashboard layouts)
  // -------------------------------------------------------------------------
  layouts: {
    all: ['layouts'] as const,
    lists: () => [...queryKeys.layouts.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.layouts.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.layouts.all, 'detail', id] as const,
    default: () => [...queryKeys.layouts.all, 'default'] as const,
    roleDefaults: () => [...queryKeys.layouts.all, 'roleDefaults'] as const,
  },

  // -------------------------------------------------------------------------
  // CUSTOMER ANALYTICS
  // -------------------------------------------------------------------------
  customerAnalytics: {
    all: ['customerAnalytics'] as const,
    kpis: (filters?: Record<string, unknown>) =>
      [...queryKeys.customerAnalytics.all, 'kpis', filters ?? {}] as const,
    trends: (filters?: Record<string, unknown>) =>
      [...queryKeys.customerAnalytics.all, 'trends', filters ?? {}] as const,
    segments: () => [...queryKeys.customerAnalytics.all, 'segments'] as const,
    segmentAnalytics: (tagId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.customerAnalytics.all, 'segmentAnalytics', tagId, filters ?? {}] as const,
    healthDistribution: () =>
      [...queryKeys.customerAnalytics.all, 'healthDistribution'] as const,
    lifecycleStages: () =>
      [...queryKeys.customerAnalytics.all, 'lifecycleStages'] as const,
    topCustomers: (filters?: Record<string, unknown>) =>
      [...queryKeys.customerAnalytics.all, 'topCustomers', filters ?? {}] as const,
    valueTiers: () => [...queryKeys.customerAnalytics.all, 'valueTiers'] as const,
  },

  // -------------------------------------------------------------------------
  // REPORTS
  // -------------------------------------------------------------------------
  reports: {
    all: ['reports'] as const,

    // Pipeline Forecast Reports
    pipelineForecast: (startDate: string, endDate: string, groupBy: string) =>
      [...queryKeys.reports.all, 'pipelineForecast', startDate, endDate, groupBy] as const,
    pipelineVelocity: (startDate: string, endDate: string) =>
      [...queryKeys.reports.all, 'pipelineVelocity', startDate, endDate] as const,
    revenueAttribution: (startDate: string, endDate: string) =>
      [...queryKeys.reports.all, 'revenueAttribution', startDate, endDate] as const,

    // Win/Loss Analysis
    winLossAnalysis: (dateFrom: string, dateTo: string) =>
      [...queryKeys.reports.all, 'winLossAnalysis', dateFrom, dateTo] as const,
    competitors: (dateFrom: string, dateTo: string) =>
      [...queryKeys.reports.all, 'competitors', dateFrom, dateTo] as const,

    // Procurement Reports
    procurementAnalytics: (dateRange?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'procurementAnalytics', dateRange ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // PROCUREMENT ANALYTICS
  // -------------------------------------------------------------------------
  procurement: {
    all: ['procurement'] as const,

    // Spend metrics
    spend: (filters?: Record<string, unknown>) =>
      [...queryKeys.procurement.all, 'spend', filters ?? {}] as const,

    // Order metrics
    orders: (filters?: Record<string, unknown>) =>
      [...queryKeys.procurement.all, 'orders', filters ?? {}] as const,

    // Supplier metrics
    suppliers: (filters?: Record<string, unknown>) =>
      [...queryKeys.procurement.all, 'suppliers', filters ?? {}] as const,

    // Alerts
    alerts: () => [...queryKeys.procurement.all, 'alerts'] as const,

    // Combined dashboard
    dashboard: (filters?: Record<string, unknown>) =>
      [...queryKeys.procurement.all, 'dashboard', filters ?? {}] as const,
  },

  // -------------------------------------------------------------------------
  // APPROVALS
  // -------------------------------------------------------------------------
  approvals: {
    all: ['approvals'] as const,
    // List queries
    lists: () => [...queryKeys.approvals.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.approvals.lists(), filters ?? {}] as const,
    pending: (filters?: Record<string, unknown>) =>
      [...queryKeys.approvals.lists(), { status: 'pending', ...filters }] as const,
    // Detail queries
    details: () => [...queryKeys.approvals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.approvals.details(), id] as const,
    // History and workflow
    history: (purchaseOrderId: string) =>
      [...queryKeys.approvals.all, 'history', purchaseOrderId] as const,
    // Stats and metrics
    stats: () => [...queryKeys.approvals.all, 'stats'] as const,
    myStats: (userId: string) =>
      [...queryKeys.approvals.stats(), 'user', userId] as const,
    // Legacy alias for backward compatibility
    items: (status?: string, filters?: Record<string, unknown>) =>
      [...queryKeys.approvals.all, 'items', status ?? '', filters ?? {}] as const,
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type QueryKeys = typeof queryKeys
