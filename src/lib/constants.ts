/**
 * System Constants - Gold Standard Organization
 *
 * Centralized constants for cookies, localStorage, permissions, and other system-wide values.
 * Follows Midday's pattern of organized, typed constants.
 */

// ============================================================================
// COOKIES
// ============================================================================

export const Cookies = {
  // Authentication
  PreferredSignInProvider: 'preferred-signin-provider',

  // UI State
  TableSettings: 'table-settings',
  SidebarCollapsed: 'sidebar-collapsed',
  Theme: 'theme',

  // Feature Flags
  DebugMode: 'debug-mode',
  FeatureFlags: 'feature-flags',

  // User Preferences
  DateFormat: 'date-format',
  TimeFormat: 'time-format',
  Currency: 'preferred-currency',
  Timezone: 'timezone',

  // Domain-specific
  SupplierFilters: 'supplier-filters',
  CustomerFilters: 'customer-filters',
  OrderFilters: 'order-filters',
  JobFilters: 'job-filters',
} as const;

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

export const LocalStorageKeys = {
  // UI State
  TableColumnWidths: 'table-column-widths',
  TableSortState: 'table-sort-state',

  // User Preferences
  DashboardLayout: 'dashboard-layout',
  RecentSearches: 'recent-searches',

  // Feature State
  DismissedHints: 'dismissed-hints',
  OnboardingComplete: 'onboarding-complete',

  // Cache
  CachedQueries: 'cached-queries',
  OfflineData: 'offline-data',
} as const;

// ============================================================================
// PERMISSIONS
// ============================================================================

export const PERMISSIONS = {
  // Authentication
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    RESET_PASSWORD: 'auth.reset_password',
  },

  // Users & Teams
  USERS: {
    READ: 'users.read',
    CREATE: 'users.create',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    MANAGE_ROLES: 'users.manage_roles',
  },

  // Organizations
  ORGANIZATIONS: {
    READ: 'organizations.read',
    UPDATE: 'organizations.update',
    MANAGE_MEMBERS: 'organizations.manage_members',
    MANAGE_SETTINGS: 'organizations.manage_settings',
  },

  // Suppliers
  SUPPLIERS: {
    READ: 'suppliers.read',
    CREATE: 'suppliers.update', // Using update for create (consistent with existing)
    UPDATE: 'suppliers.update',
    DELETE: 'suppliers.update',
    APPROVE: 'suppliers.approve',
    IMPORT: 'suppliers.update',
  },

  // Customers
  CUSTOMERS: {
    READ: 'customers.read',
    CREATE: 'customers.update',
    UPDATE: 'customers.update',
    DELETE: 'customers.update',
  },

  // Products
  PRODUCTS: {
    READ: 'products.read',
    CREATE: 'product.create',
    UPDATE: 'product.update',
    DELETE: 'product.delete',
  },

  // Orders
  ORDERS: {
    READ: 'orders.read',
    CREATE: 'orders.update',
    UPDATE: 'orders.update',
    DELETE: 'orders.update',
    APPROVE: 'orders.approve',
  },

  // Purchase Orders
  PURCHASE_ORDERS: {
    READ: 'purchase-orders.read',
    CREATE: 'purchase-orders.update',
    UPDATE: 'purchase-orders.update',
    DELETE: 'purchase-orders.update',
    APPROVE: 'purchase-orders.approve',
  },

  // Jobs
  JOBS: {
    READ: 'jobs.read',
    CREATE: 'jobs.update',
    UPDATE: 'jobs.update',
    DELETE: 'jobs.update',
    ASSIGN: 'jobs.assign',
  },

  // Inventory
  INVENTORY: {
    READ: 'inventory.read',
    MANAGE: 'inventory.manage',
    ADJUST: 'inventory.adjust',
    TRANSFER: 'inventory.transfer',
    ALLOCATE: 'inventory.allocate',
    RECEIVE: 'inventory.receive',
    COUNT: 'inventory.count',
    FORECAST: 'inventory.forecast',
  },

  // Financial
  FINANCIAL: {
    READ: 'financial.read',
    CREATE: 'invoice.create',
    UPDATE: 'invoice.update',
    DELETE: 'invoice.delete',
    EXPORT: 'financial.export',
    APPROVE: 'financial.approve',
  },

  // Reports
  REPORTS: {
    READ: 'reports.read',
    EXPORT: 'reports.export',
    ADMIN: 'reports.admin',
  },

  // Settings
  SETTINGS: {
    READ: 'settings.read',
    UPDATE: 'settings.update',
    ADMIN: 'settings.admin',
  },

  // Support
  SUPPORT: {
    READ: 'support.read',
    CREATE: 'support.create',
    UPDATE: 'support.update',
    DELETE: 'support.delete',
  },

  // Warranty
  WARRANTY: {
    READ: 'warranty.read',
    CREATE: 'warranty.create',
    UPDATE: 'warranty.update',
    DELETE: 'warranty.delete',
    APPROVE: 'warranty.approve',
    RESOLVE: 'warranty.resolve',
    ASSIGN: 'warranty.assign',
  },
} as const;

// ============================================================================
// STATUS ENUMS
// ============================================================================

export const STATUSES = {
  // Generic Statuses
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  ARCHIVED: 'archived',

  // Order Statuses
  ORDER_STATUSES: {
    DRAFT: 'draft',
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
  },

  // Job Statuses
  JOB_STATUSES: {
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    ON_HOLD: 'on_hold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  // Approval Statuses
  APPROVAL_STATUSES: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    AUTO_APPROVED: 'auto_approved',
  },

  // Payment Statuses
  PAYMENT_STATUSES: {
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    PAID: 'paid',
    OVERDUE: 'overdue',
    REFUNDED: 'refunded',
  },
} as const;

// ============================================================================
// LIMITS & CONSTRAINTS
// ============================================================================

export const LIMITS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,

  // File Uploads
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_COUNT: 10,

  // Text Fields
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NOTES_LENGTH: 5000,

  // Numbers
  MAX_QUANTITY: 999999,
  MAX_PRICE: 999999.99,
  MAX_DISCOUNT_PERCENT: 90,

  // Lists
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 10,
  MAX_COMMENTS: 100,

  // Timeouts (ms)
  API_TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 120000,
  LONG_RUNNING_TIMEOUT: 300000,
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  // Development
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false',

  // Features
  SUPPLIERS_REAL_API: process.env.NEXT_PUBLIC_SUPPLIERS_REAL_API === 'true',
  SUPPLIERS_PRICING_REAL_API: process.env.NEXT_PUBLIC_SUPPLIERS_PRICING_REAL_API === 'true',
  CUSTOMERS_REAL_API: process.env.NEXT_PUBLIC_CUSTOMERS_REAL_API === 'true',
  ORDERS_REAL_API: process.env.NEXT_PUBLIC_ORDERS_REAL_API === 'true',
  JOBS_REAL_API: process.env.NEXT_PUBLIC_JOBS_REAL_API === 'true',

  // UI Features
  ERROR_BOUNDARIES: process.env.NEXT_PUBLIC_ERROR_BOUNDARIES !== 'false',
  DYNAMIC_IMPORTS: process.env.NEXT_PUBLIC_DYNAMIC_IMPORTS !== 'false',
  OFFLINE_MODE: process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true',
  BULK_OPERATIONS: process.env.NEXT_PUBLIC_BULK_OPERATIONS !== 'false',

  // Experimental
  AI_ASSISTANT: process.env.NEXT_PUBLIC_AI_ASSISTANT === 'true',
  REAL_TIME_UPDATES: process.env.NEXT_PUBLIC_REAL_TIME_UPDATES === 'true',
} as const;

// ============================================================================
// API ENDPOINTS & CONFIG
// ============================================================================

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  TIMEOUT: LIMITS.API_TIMEOUT,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Rate Limiting
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
  // Email
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone (international format)
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,

  // URLs
  URL_REGEX: /^https?:\/\/.+/,

  // Currency codes (ISO 4217)
  CURRENCY_REGEX: /^[A-Z]{3}$/,

  // Password strength
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
} as const;

// ============================================================================
// DATE & TIME CONSTANTS
// ============================================================================

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

export const TIMEZONES = {
  DEFAULT: 'Australia/Sydney',
  SUPPORTED: [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Darwin',
    'Australia/Brisbane',
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
  ],
} as const;
