/**
 * Trigger.dev Client Configuration
 *
 * Sets up the Trigger.dev client for background job processing.
 * Jobs are triggered from Edge Functions via the Trigger.dev API.
 *
 * @see https://trigger.dev/docs
 */
import { TriggerClient } from '@trigger.dev/sdk'

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * Trigger.dev client instance
 *
 * Environment variables required:
 * - TRIGGER_API_KEY: Your Trigger.dev API key
 * - TRIGGER_API_URL: Trigger.dev API URL (optional, defaults to cloud)
 */
export const client = new TriggerClient({
  id: 'renoz-crm',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
})

// ============================================================================
// EVENT DEFINITIONS
// ============================================================================

/**
 * Order events triggered from Edge Functions
 */
export const orderEvents = {
  created: 'order.created',
  confirmed: 'order.confirmed',
  shipped: 'order.shipped',
  delivered: 'order.delivered',
  cancelled: 'order.cancelled',
} as const

/**
 * Inventory events triggered from Edge Functions
 */
export const inventoryEvents = {
  lowStock: 'inventory.low_stock',
  outOfStock: 'inventory.out_of_stock',
  restocked: 'inventory.restocked',
} as const

/**
 * Pipeline events triggered from Edge Functions
 */
export const pipelineEvents = {
  stageChanged: 'pipeline.stage_changed',
  dealWon: 'pipeline.deal_won',
  dealLost: 'pipeline.deal_lost',
} as const

// ============================================================================
// EVENT PAYLOAD TYPES
// ============================================================================

export interface OrderCreatedPayload {
  orderId: string
  orderNumber: string
  organizationId: string
  customerId: string
  total: number
}

export interface OrderConfirmedPayload {
  orderId: string
  orderNumber: string
  customerId: string
  organizationId: string
  total: number
}

export interface OrderShippedPayload {
  orderId: string
  orderNumber: string
  customerId: string
  organizationId: string
  trackingNumber?: string
  carrier?: string
}

export interface LowStockPayload {
  productId: string
  locationId: string
  organizationId: string
  currentQuantity: number
  reorderPoint: number
  reorderQuantity: number
  isCritical: boolean
}

export interface PipelineStageChangedPayload {
  opportunityId: string
  opportunityName: string
  organizationId: string
  ownerId: string
  customerId: string
  oldStage: string
  newStage: string
  value: number
  probability: number
}

export interface DealWonPayload {
  opportunityId: string
  opportunityName: string
  organizationId: string
  customerId: string
  value: number
  ownerId: string
}

export interface DealLostPayload {
  opportunityId: string
  opportunityName: string
  organizationId: string
  customerId: string
  value: number
  reason?: string
}

// ============================================================================
// REPORT EVENTS
// ============================================================================

/**
 * Report events triggered from server functions
 */
export const reportEvents = {
  generate: 'report.generate',
  generated: 'report.generated',
  failed: 'report.failed',
} as const;

/**
 * Report generation event payload
 */
export interface GenerateReportPayload {
  reportId: string;
  organizationId: string;
  isManualTrigger?: boolean;
}

/**
 * Report generated event payload
 */
export interface ReportGeneratedPayload {
  reportId: string;
  organizationId: string;
  reportUrl: string;
  format: string;
  recipientCount: number;
}

/**
 * Report failed event payload
 */
export interface ReportFailedPayload {
  reportId: string;
  organizationId: string;
  error: string;
}

// ============================================================================
// DASHBOARD EVENTS
// ============================================================================

/**
 * Dashboard events triggered by background jobs
 */
export const dashboardEvents = {
  mvRefreshed: 'dashboard.mv_refreshed',
  cacheInvalidated: 'dashboard.cache_invalidated',
  cacheWarmed: 'dashboard.cache_warmed',
} as const

/**
 * Materialized view refresh event payload
 */
export interface DashboardMvRefreshedPayload {
  views: string[]
  organizationId?: string // Optional - null for all orgs
  timestamp: string
  durationMs: number
}

/**
 * Cache invalidation event payload
 */
export interface DashboardCacheInvalidatedPayload {
  organizationId: string
  cacheTypes: string[]
  timestamp: string
}

/**
 * Cache warming event payload
 */
export interface DashboardCacheWarmedPayload {
  organizationCount: number
  dateRanges: string[]
  timestamp: string
  durationMs: number
}

// ============================================================================
// WARRANTY EVENTS
// ============================================================================

/**
 * Warranty events triggered from Edge Functions
 */
export const warrantyEvents = {
  registered: 'warranty.registered',
  expiringSoon: 'warranty.expiring_soon',
  expired: 'warranty.expired',
  extended: 'warranty.extended',
  claimSubmitted: 'warranty.claim_submitted',
  claimResolved: 'warranty.claim_resolved',
} as const

/**
 * Warranty registration event payload
 */
export interface WarrantyRegisteredPayload {
  warrantyId: string
  warrantyNumber: string
  organizationId: string
  customerId: string
  productId: string
  productName: string
  productSerial?: string
  customerName: string
  customerEmail?: string
  startDate: string
  expiryDate: string
  policyType: string
  policyName: string
  durationMonths: number
  cycleLimit?: number
  slaResponseHours?: number
  slaResolutionDays?: number
  certificateUrl?: string
}

/**
 * Warranty expiring soon event payload
 */
export interface WarrantyExpiringSoonPayload {
  warrantyId: string
  warrantyNumber: string
  organizationId: string
  customerId: string
  customerName: string
  customerEmail?: string
  productId: string
  productName: string
  policyType: string
  expiryDate: string
  daysUntilExpiry: number
  currentCycleCount?: number
  cycleLimit?: number
  renewalUrl?: string
}

/**
 * Warranty extended event payload
 */
export interface WarrantyExtendedPayload {
  warrantyId: string
  warrantyNumber: string
  organizationId: string
  customerId: string
  productId: string
  oldExpiryDate: string
  newExpiryDate: string
  extensionMonths: number
  reason?: string
}

/**
 * Warranty claim submitted event payload
 */
export interface WarrantyClaimSubmittedPayload {
  claimId: string
  claimNumber: string
  warrantyId: string
  warrantyNumber: string
  organizationId: string
  customerId: string
  customerName: string
  customerEmail?: string
  productId: string
  productName: string
  claimType: string
  description: string
  submittedAt: string
}

/**
 * Warranty claim resolved event payload
 */
export interface WarrantyClaimResolvedPayload {
  claimId: string
  claimNumber: string
  warrantyId: string
  warrantyNumber: string
  organizationId: string
  customerId: string
  customerName: string
  customerEmail?: string
  resolution: string
  resolutionType: string
  resolvedAt: string
  resolutionNotes?: string
}

// ============================================================================
// USER EVENTS
// ============================================================================

/**
 * User events triggered from Edge Functions
 */
export const userEvents = {
  invitationSent: 'user.invitation_sent',
  invitationAccepted: 'user.invitation_accepted',
  invitationExpired: 'user.invitation_expired',
} as const

/**
 * User invitation sent event payload
 */
export interface InvitationSentPayload {
  invitationId: string
  email: string
  organizationId: string
  organizationName: string
  inviterName: string
  inviterEmail: string
  role: string
  personalMessage?: string
  acceptUrl: string
  expiresAt: string
}

/**
 * Batch invitation sent event payload
 */
export interface BatchInvitationSentPayload {
  organizationId: string
  organizationName: string
  inviterName: string
  inviterEmail: string
  invitations: Array<{
    invitationId: string
    email: string
    role: string
    personalMessage?: string
    acceptUrl: string
    expiresAt: string
  }>
}
