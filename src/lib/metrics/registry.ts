/**
 * Metric Registry
 *
 * Single source of truth for all metric definitions.
 * Used by aggregator to calculate metrics consistently across all report types.
 *
 * @see src/server/functions/metrics/aggregator.ts
 */

// ============================================================================
// TYPES
// ============================================================================

export type MetricTable = 'orders' | 'customers' | 'opportunities' | 'warranties' | 'warrantyClaims' | 'slaTracking';
export type MetricAggregation = 'SUM' | 'COUNT' | 'AVG' | 'SPECIAL';
export type MetricDateField = 'orderDate' | 'deliveredDate' | 'createdAt' | 'expectedCloseDate' | 'actualCloseDate' | 'registrationDate' | 'submittedAt' | 'expiryDate' | 'startedAt';
export type MetricUnit = 'currency' | 'count' | 'percentage';

export interface MetricDefinition {
  /** Unique identifier (used in code, URLs, etc.) */
  id: string;
  /** Human-readable name for display */
  name: string;
  /** Description of what this metric measures */
  description: string;
  /** Type of aggregation */
  aggregation: MetricAggregation;
  /** Database table to query */
  table: MetricTable;
  /** Field to aggregate (or '*' for COUNT) */
  field: string;
  /** Date field to use for date range filtering */
  dateField: MetricDateField;
  /** Base filters applied to all queries */
  baseFilters: {
    /** Status/stage values to include (empty = all) */
    status?: string[];
    /** Other field filters */
    [key: string]: unknown;
  };
  /** Unit for display */
  unit: MetricUnit;
  /** Whether this metric requires date range */
  requiresDateRange: boolean;
}

// ============================================================================
// METRIC REGISTRY
// ============================================================================

/**
 * All available metrics.
 * Add new metrics here - they'll automatically work everywhere.
 */
export const METRICS: Record<string, MetricDefinition> = {
  // Revenue Metrics
  REVENUE: {
    id: 'revenue',
    name: 'Total Revenue',
    description: 'Sum of all delivered order totals',
    aggregation: 'SUM',
    table: 'orders',
    field: 'total',
    dateField: 'deliveredDate',
    baseFilters: {
      status: ['delivered'], // Only count delivered orders
    },
    unit: 'currency',
    requiresDateRange: true,
  },

  ORDER_COUNT: {
    id: 'orders_count',
    name: 'Order Count',
    description: 'Total number of orders',
    aggregation: 'COUNT',
    table: 'orders',
    field: '*',
    dateField: 'createdAt',
    baseFilters: {},
    unit: 'count',
    requiresDateRange: true,
  },

  AVERAGE_ORDER_VALUE: {
    id: 'average_order_value',
    name: 'Average Order Value',
    description: 'Average value of orders',
    aggregation: 'AVG',
    table: 'orders',
    field: 'total',
    dateField: 'createdAt',
    baseFilters: {},
    unit: 'currency',
    requiresDateRange: true,
  },

  // Customer Metrics
  CUSTOMER_COUNT: {
    id: 'customer_count',
    name: 'Customer Count',
    description: 'Total number of customers',
    aggregation: 'COUNT',
    table: 'customers',
    field: '*',
    dateField: 'createdAt',
    baseFilters: {},
    unit: 'count',
    requiresDateRange: true,
  },

  // Pipeline Metrics
  PIPELINE_VALUE: {
    id: 'pipeline_value',
    name: 'Pipeline Value',
    description: 'Total value of open opportunities',
    aggregation: 'SUM',
    table: 'opportunities',
    field: 'value',
    dateField: 'createdAt',
    baseFilters: {
      stage: ['new', 'qualified', 'proposal', 'negotiation'],
    },
    unit: 'currency',
    requiresDateRange: false, // Pipeline is current state
  },

  FORECASTED_REVENUE: {
    id: 'forecasted_revenue',
    name: 'Forecasted Revenue',
    description: 'Probability-weighted value of opportunities',
    aggregation: 'SUM',
    table: 'opportunities',
    field: 'weightedValue',
    dateField: 'expectedCloseDate',
    baseFilters: {
      stage: ['new', 'qualified', 'proposal', 'negotiation'],
    },
    unit: 'currency',
    requiresDateRange: true,
  },

  WIN_RATE: {
    id: 'win_rate',
    name: 'Win Rate',
    description: 'Percentage of won vs lost opportunities',
    aggregation: 'SPECIAL', // Special calculation
    table: 'opportunities',
    field: '*',
    dateField: 'actualCloseDate',
    baseFilters: {
      stage: ['won', 'lost'], // Only closed opportunities
    },
    unit: 'percentage',
    requiresDateRange: true,
  },

  WON_REVENUE: {
    id: 'won_revenue',
    name: 'Won Revenue',
    description: 'Total value of won opportunities',
    aggregation: 'SUM',
    table: 'opportunities',
    field: 'value',
    dateField: 'actualCloseDate',
    baseFilters: {
      stage: ['won'],
    },
    unit: 'currency',
    requiresDateRange: true,
  },

  LOST_REVENUE: {
    id: 'lost_revenue',
    name: 'Lost Revenue',
    description: 'Total value of lost opportunities',
    aggregation: 'SUM',
    table: 'opportunities',
    field: 'value',
    dateField: 'actualCloseDate',
    baseFilters: {
      stage: ['lost'],
    },
    unit: 'currency',
    requiresDateRange: true,
  },

  // Warranty Metrics
  WARRANTY_COUNT: {
    id: 'warranty_count',
    name: 'Warranty Count',
    description: 'Total number of warranties',
    aggregation: 'COUNT',
    table: 'warranties',
    field: '*',
    dateField: 'registrationDate',
    baseFilters: {},
    unit: 'count',
    requiresDateRange: true,
  },

  WARRANTY_VALUE: {
    id: 'warranty_value',
    name: 'Warranty Value',
    description: 'Total value of warranties',
    aggregation: 'SUM',
    table: 'warranties',
    field: '*', // Special - joins with orders
    dateField: 'expiryDate',
    baseFilters: {},
    unit: 'currency',
    requiresDateRange: true,
  },

  CLAIM_COUNT: {
    id: 'claim_count',
    name: 'Claim Count',
    description: 'Total number of warranty claims',
    aggregation: 'COUNT',
    table: 'warrantyClaims',
    field: '*',
    dateField: 'submittedAt',
    baseFilters: {},
    unit: 'count',
    requiresDateRange: true,
  },

  EXPIRING_WARRANTIES: {
    id: 'expiring_warranties',
    name: 'Expiring Warranties',
    description: 'Count of warranties expiring soon',
    aggregation: 'COUNT',
    table: 'warranties',
    field: '*',
    dateField: 'expiryDate',
    baseFilters: {
      status: ['active', 'expiring_soon'],
    },
    unit: 'count',
    requiresDateRange: true,
  },

  SLA_COMPLIANCE: {
    id: 'sla_compliance',
    name: 'SLA Compliance',
    description: 'Percentage of SLA tracking records not breached',
    aggregation: 'SPECIAL', // Special calculation
    table: 'slaTracking',
    field: '*',
    dateField: 'startedAt',
    baseFilters: {
      domain: 'warranty',
    },
    unit: 'percentage',
    requiresDateRange: true,
  },
} as const;

// ============================================================================
// TYPE-SAFE METRIC IDS
// ============================================================================

export type MetricId = keyof typeof METRICS;

/**
 * Get a metric definition by ID.
 * @throws Error if metric not found
 */
export function getMetric(id: MetricId | string): MetricDefinition {
  const metric = METRICS[id];
  if (!metric) {
    throw new Error(`Unknown metric: ${id}`);
  }
  return metric;
}

/**
 * Get all available metrics.
 */
export function getAllMetrics(): MetricDefinition[] {
  return Object.values(METRICS);
}

/**
 * Get metrics filtered by table.
 */
export function getMetricsByTable(table: MetricTable): MetricDefinition[] {
  return Object.values(METRICS).filter(m => m.table === table);
}

/**
 * Check if a metric ID is valid.
 */
export function isValidMetricId(id: string): id is MetricId {
  return id in METRICS;
}
