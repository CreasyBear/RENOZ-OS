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
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type QueryKeys = typeof queryKeys
