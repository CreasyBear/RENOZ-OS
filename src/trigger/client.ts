'use server'

/**
 * Trigger.dev Client Configuration
 *
 * Sets up the Trigger.dev client for background job processing.
 * Jobs are triggered from Edge Functions via the Trigger.dev API.
 *
 * Uses lazy initialization so env vars are read at runtime (not build time).
 * This ensures TRIGGER_SECRET_KEY works in Vercel serverless where process.env
 * may not be available at module load.
 *
 * SDK: @trigger.dev/sdk ^3.0.0 (tested with 3.3.17)
 * @see https://trigger.dev/docs
 * @see https://trigger.dev/docs/apikeys
 */
import { TriggerClient } from '@trigger.dev/sdk'

// ============================================================================
// CONSTANTS
// ============================================================================

const TRIGGER_DASHBOARD_URL = 'https://cloud.trigger.dev'
const VALID_API_KEY_PREFIXES = ['tr_dev_', 'tr_prod_', 'tr_stg_'] as const

function isValidTriggerKey(key: string): boolean {
  const trimmed = key.trim()
  return trimmed.length > 0 && VALID_API_KEY_PREFIXES.some((p) => trimmed.startsWith(p))
}

// ============================================================================
// CLIENT CONFIGURATION (lazy init for runtime env access)
// ============================================================================

let _client: TriggerClient | null = null

function getEnv(key: string): string | undefined {
  if (typeof process === 'undefined') return undefined
  const val = process.env[key]
  return typeof val === 'string' ? val.trim() || undefined : undefined
}

function getTriggerClient(): TriggerClient {
  if (_client) return _client

  const apiKey = getEnv('TRIGGER_SECRET_KEY') ?? getEnv('TRIGGER_API_KEY')
  if (!apiKey) {
    throw new Error(
      `[Trigger.dev] Missing TRIGGER_SECRET_KEY or TRIGGER_API_KEY. ` +
        `Add to Vercel Project Settings → Environment Variables. ` +
        `Get your key at ${TRIGGER_DASHBOARD_URL} → Project → API Keys`
    )
  }
  if (!isValidTriggerKey(apiKey)) {
    throw new Error(
      `[Trigger.dev] Invalid API key format. Expected tr_dev_*, tr_prod_*, or tr_stg_*. ` +
        `Get the correct key at ${TRIGGER_DASHBOARD_URL} → Project → API Keys`
    )
  }

  const apiUrl = getEnv('TRIGGER_API_URL')

  _client = new TriggerClient({
    id: 'renoz-crm',
    apiKey,
    apiUrl: apiUrl || undefined,
  })
  return _client
}

/**
 * Check if Trigger.dev is configured (without initializing the client).
 * Use for graceful degradation when background jobs are optional.
 */
export function isTriggerConfigured(): boolean {
  const apiKey = getEnv('TRIGGER_SECRET_KEY') ?? getEnv('TRIGGER_API_KEY')
  return Boolean(apiKey && isValidTriggerKey(apiKey))
}

/**
 * Trigger.dev client instance (lazy-initialized).
 *
 * Environment variables:
 * - TRIGGER_SECRET_KEY or TRIGGER_API_KEY: Secret key (tr_dev_*, tr_prod_*, tr_stg_*)
 * - TRIGGER_API_URL: Optional, for self-hosted (default: https://api.trigger.dev)
 * - TRIGGER_PREVIEW_BRANCH: For Vercel preview deployments (see Trigger.dev docs)
 *
 * @see https://trigger.dev/docs/apikeys
 */
export const client = new Proxy({} as TriggerClient, {
  get(_, prop) {
    return (getTriggerClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
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

// ============================================================================
// DOCUMENT EVENTS
// ============================================================================

/**
 * Document generation events triggered from server functions
 */
export const documentEvents = {
  generateQuote: 'document.generate_quote',
  generateInvoice: 'document.generate_invoice',
  generated: 'document.generated',
  failed: 'document.failed',
} as const

/**
 * Generate quote document event payload
 */
export interface GenerateQuoteDocumentPayload {
  orderId: string
  orderNumber: string
  organizationId: string
  customerId: string
  /** Optional: regenerate existing document */
  regenerate?: boolean
  /** Optional: ID of existing document to regenerate */
  existingDocumentId?: string
}

/**
 * Generate invoice document event payload
 */
export interface GenerateInvoiceDocumentPayload {
  orderId: string
  orderNumber: string
  organizationId: string
  customerId: string
  /** Due date for the invoice */
  dueDate: string
  /** Optional: regenerate existing document */
  regenerate?: boolean
  /** Optional: ID of existing document to regenerate */
  existingDocumentId?: string
}

/**
 * Document generated event payload
 */
export interface DocumentGeneratedPayload {
  documentId: string
  documentType: 'quote' | 'invoice'
  orderId: string
  orderNumber: string
  organizationId: string
  storagePath: string
  fileSize: number
  checksum: string
}

/**
 * Document failed event payload
 */
export interface DocumentFailedPayload {
  orderId: string
  orderNumber: string
  organizationId: string
  documentType: 'quote' | 'invoice'
  error: string
}
