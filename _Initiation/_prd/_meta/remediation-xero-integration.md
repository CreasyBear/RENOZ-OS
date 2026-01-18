# Remediation Plan: Resilient Xero API Integration

**Created:** 2026-01-17
**Author:** architect-agent
**Source:** Premortem analysis - Xero integration risks

## Overview

This plan addresses critical risks identified in the premortem analysis for Xero API integration:
1. Xero API rate limits (60 calls/minute) causing sync failures
2. Sync failure cascades affecting payment reconciliation
3. Missing retry strategy and queue system
4. Webhook endpoint setup and signature verification
5. Revenue recognition timing conflicts with Xero sync

## Problem Statement

The current Xero integration (in `src/trigger/jobs/sync-xero.ts`) is a placeholder that lacks:
- Rate limit management for Xero's strict 60 calls/min limit
- Retry logic for transient failures
- Circuit breaker to prevent cascade failures
- Queue system for bulk operations
- Webhook handling for real-time payment updates
- Coordination between revenue recognition milestones and Xero sync

## Architecture Design

### Component Diagram

```
                                    ┌─────────────────────┐
                                    │     Xero API        │
                                    │  (60 calls/min)     │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
            ┌───────▼───────┐          ┌───────▼───────┐          ┌───────▼───────┐
            │ Invoice Sync  │          │ Contact Sync  │          │ Credit Note   │
            │   (Outbound)  │          │   (Outbound)  │          │    Sync       │
            └───────┬───────┘          └───────┬───────┘          └───────┬───────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   Circuit Breaker   │
                                    │   + Rate Limiter    │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   Xero Job Queue    │
                                    │ (Trigger.dev Tasks) │
                                    └──────────┬──────────┘
                                               │
         ┌─────────────────────────────────────┼─────────────────────────────────────┐
         │                                     │                                     │
┌────────▼────────┐               ┌────────────▼───────────┐              ┌──────────▼─────────┐
│ Revenue         │               │  xero_sync_queue       │              │ Webhook Handler    │
│ Recognition     │◄──────────────│  (Redis/Trigger.dev)   │◄─────────────│ /api/webhooks/xero │
│ Engine          │               └────────────────────────┘              └────────────────────┘
└─────────────────┘
```

### Data Flow

1. **Outbound Sync Flow (Our System -> Xero)**
   ```
   Business Event (Invoice Created)
       │
       ▼
   Queue Job with Priority
       │
       ▼
   Rate Limiter Check (Redis: xero:rate:{orgId})
       │
       ├── Under limit (< 55) ──► Execute API Call
       │                              │
       │                              ├── Success ──► Log + Update Local Record
       │                              │
       │                              └── Failure ──► Retry with Backoff
       │
       └── Near limit (>= 55) ──► Delay + Re-queue
   ```

2. **Inbound Sync Flow (Xero -> Our System via Webhook)**
   ```
   Xero Webhook Event
       │
       ▼
   Signature Verification (HMAC-SHA256)
       │
       ├── Invalid ──► 401 Reject + Log
       │
       └── Valid ──► Log to xero_webhook_logs
                         │
                         ▼
                   Route by Event Type
                         │
                         ├── INVOICE.PAID ──► Update payment status + Trigger revenue recognition
                         ├── INVOICE.UPDATED ──► Sync status changes
                         └── CONTACT.UPDATED ──► Update customer record
   ```

3. **Revenue Recognition Timing Flow**
   ```
   Milestone Completed (e.g., "Battery Delivered")
       │
       ▼
   recognizeRevenue() triggered
       │
       ▼
   Calculate recognition amount based on milestone %
       │
       ▼
   Create revenue_recognition record
       │
       ▼
   Update deferred_revenue balance
       │
       ▼
   Queue Xero sync job (LOW PRIORITY)
       │
       ▼
   Wait for Xero sync confirmation before marking final
   ```

---

## Implementation Phases

### Phase 1: Rate Limit Infrastructure

**Files to create:**

| File | Purpose |
|------|---------|
| `src/lib/xero/rate-limiter.ts` | Redis-based rate limit tracker |
| `src/lib/xero/types.ts` | Xero sync types and interfaces |

**Implementation: `src/lib/xero/rate-limiter.ts`**

```typescript
/**
 * Xero API Rate Limiter
 * 
 * Uses Upstash Redis to track API calls per organization.
 * Xero limit: 60 calls per minute per tenant.
 * 
 * Strategy:
 * - Track calls with sliding window
 * - Proactive throttling at 55 calls (safety margin)
 * - Exponential backoff on 429 responses
 */

import { Redis } from "@upstash/redis";

export interface RateLimitState {
  callsUsed: number;
  callsRemaining: number;
  resetAt: number;
  shouldDelay: boolean;
  delayMs: number;
}

export interface RateLimitConfig {
  maxCalls: number;          // 60 for Xero
  windowMs: number;          // 60000 (1 minute)
  safetyThreshold: number;   // 55 - proactive throttling
  baseDelayMs: number;       // 1000
  maxDelayMs: number;        // 30000
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxCalls: 60,
  windowMs: 60000,
  safetyThreshold: 55,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export class XeroRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(redis: Redis, config: Partial<RateLimitConfig> = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get rate limit key for organization
   */
  private getKey(organizationId: string): string {
    return `xero:rate:${organizationId}`;
  }

  /**
   * Check current rate limit state
   */
  async getState(organizationId: string): Promise<RateLimitState> {
    const key = this.getKey(organizationId);
    const now = Date.now();
    
    // Get current call count
    const callsUsed = await this.redis.get<number>(key) || 0;
    const ttl = await this.redis.ttl(key);
    const resetAt = ttl > 0 ? now + (ttl * 1000) : now + this.config.windowMs;
    
    const callsRemaining = Math.max(0, this.config.maxCalls - callsUsed);
    const shouldDelay = callsUsed >= this.config.safetyThreshold;
    
    // Calculate delay based on how close to limit
    let delayMs = 0;
    if (shouldDelay) {
      const overage = callsUsed - this.config.safetyThreshold;
      delayMs = Math.min(
        this.config.baseDelayMs * Math.pow(2, overage),
        this.config.maxDelayMs
      );
    }

    return {
      callsUsed,
      callsRemaining,
      resetAt,
      shouldDelay,
      delayMs,
    };
  }

  /**
   * Record an API call
   * Returns whether the call is allowed
   */
  async recordCall(organizationId: string): Promise<{ allowed: boolean; state: RateLimitState }> {
    const key = this.getKey(organizationId);
    const state = await this.getState(organizationId);
    
    if (state.callsRemaining === 0) {
      return { allowed: false, state };
    }

    // Increment counter with TTL
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60); // 60 second window
    await pipeline.exec();

    return { 
      allowed: true, 
      state: {
        ...state,
        callsUsed: state.callsUsed + 1,
        callsRemaining: state.callsRemaining - 1,
      }
    };
  }

  /**
   * Handle 429 response from Xero
   * Returns delay in ms based on Retry-After header
   */
  handleRateLimitResponse(retryAfterHeader?: string): number {
    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    // Default to 60 seconds if no header
    return 60000;
  }
}
```

**Acceptance Criteria:**
- [ ] Rate limit counter increments per API call
- [ ] Counter auto-resets after 60 seconds
- [ ] Proactive throttling triggers at 55+ calls
- [ ] Exponential backoff calculates correct delays
- [ ] Unit tests for rate limiter

**Estimated effort:** Small (1-2 iterations)

---

### Phase 2: Circuit Breaker Pattern

**Files to create:**

| File | Purpose |
|------|---------|
| `src/lib/xero/circuit-breaker.ts` | Prevent cascade failures |

**Implementation: `src/lib/xero/circuit-breaker.ts`**

```typescript
/**
 * Circuit Breaker for Xero API
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failing, all requests rejected immediately
 * - HALF_OPEN: Testing, limited requests allowed
 * 
 * Transitions:
 * - CLOSED -> OPEN: After failureThreshold failures
 * - OPEN -> HALF_OPEN: After resetTimeout
 * - HALF_OPEN -> CLOSED: On successful request
 * - HALF_OPEN -> OPEN: On failed request
 */

import { Redis } from "@upstash/redis";

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;    // 5 failures to open
  resetTimeoutMs: number;      // 30 seconds before half-open
  halfOpenRequests: number;    // 1 request allowed in half-open
}

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailure: number | null;
  nextAttempt: number | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenRequests: 1,
};

export class XeroCircuitBreaker {
  private redis: Redis;
  private config: CircuitBreakerConfig;

  constructor(redis: Redis, config: Partial<CircuitBreakerConfig> = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getKey(organizationId: string, suffix: string): string {
    return `xero:circuit:${organizationId}:${suffix}`;
  }

  /**
   * Get current circuit status
   */
  async getStatus(organizationId: string): Promise<CircuitStatus> {
    const failuresKey = this.getKey(organizationId, 'failures');
    const lastFailureKey = this.getKey(organizationId, 'lastFailure');
    const stateKey = this.getKey(organizationId, 'state');

    const [failures, lastFailure, state] = await Promise.all([
      this.redis.get<number>(failuresKey) || 0,
      this.redis.get<number>(lastFailureKey),
      this.redis.get<CircuitState>(stateKey) || 'CLOSED',
    ]);

    const now = Date.now();
    let currentState = state;
    let nextAttempt: number | null = null;

    // Check if OPEN circuit should transition to HALF_OPEN
    if (state === 'OPEN' && lastFailure) {
      const elapsed = now - lastFailure;
      if (elapsed >= this.config.resetTimeoutMs) {
        currentState = 'HALF_OPEN';
        await this.redis.set(stateKey, 'HALF_OPEN');
      } else {
        nextAttempt = lastFailure + this.config.resetTimeoutMs;
      }
    }

    return {
      state: currentState,
      failures,
      lastFailure,
      nextAttempt,
    };
  }

  /**
   * Check if request should be allowed
   */
  async canRequest(organizationId: string): Promise<{ allowed: boolean; status: CircuitStatus }> {
    const status = await this.getStatus(organizationId);

    switch (status.state) {
      case 'CLOSED':
        return { allowed: true, status };
      case 'OPEN':
        return { allowed: false, status };
      case 'HALF_OPEN':
        // Allow limited requests in half-open state
        return { allowed: true, status };
    }
  }

  /**
   * Record a successful request
   */
  async recordSuccess(organizationId: string): Promise<void> {
    const stateKey = this.getKey(organizationId, 'state');
    const failuresKey = this.getKey(organizationId, 'failures');
    const status = await this.getStatus(organizationId);

    if (status.state === 'HALF_OPEN') {
      // Successful half-open request -> close circuit
      await this.redis.set(stateKey, 'CLOSED');
      await this.redis.del(failuresKey);
    } else if (status.state === 'CLOSED' && status.failures > 0) {
      // Reset failure count on success
      await this.redis.del(failuresKey);
    }
  }

  /**
   * Record a failed request
   */
  async recordFailure(organizationId: string): Promise<CircuitStatus> {
    const failuresKey = this.getKey(organizationId, 'failures');
    const lastFailureKey = this.getKey(organizationId, 'lastFailure');
    const stateKey = this.getKey(organizationId, 'state');
    const status = await this.getStatus(organizationId);
    const now = Date.now();

    if (status.state === 'HALF_OPEN') {
      // Failed half-open request -> reopen circuit
      await this.redis.set(stateKey, 'OPEN');
      await this.redis.set(lastFailureKey, now);
      return { ...status, state: 'OPEN', lastFailure: now };
    }

    // Increment failure count
    const newFailures = await this.redis.incr(failuresKey);
    await this.redis.set(lastFailureKey, now);
    await this.redis.expire(failuresKey, 300); // 5 minute window for failures

    // Check if we should open the circuit
    if (newFailures >= this.config.failureThreshold) {
      await this.redis.set(stateKey, 'OPEN');
      return {
        state: 'OPEN',
        failures: newFailures,
        lastFailure: now,
        nextAttempt: now + this.config.resetTimeoutMs,
      };
    }

    return {
      state: 'CLOSED',
      failures: newFailures,
      lastFailure: now,
      nextAttempt: null,
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Circuit opens after 5 consecutive failures
- [ ] Circuit resets to half-open after 30 seconds
- [ ] Successful half-open request closes circuit
- [ ] Failed half-open request reopens circuit
- [ ] Redis keys have appropriate TTLs

**Estimated effort:** Small (1-2 iterations)

---

### Phase 3: Xero Job Queue with Trigger.dev

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/lib/xero/queue.ts` | Job queue management |
| `src/trigger/jobs/xero/sync-invoice.ts` | Invoice sync job with retry |
| `src/trigger/jobs/xero/sync-contact.ts` | Contact sync job with retry |
| `src/trigger/jobs/xero/sync-credit-note.ts` | Credit note sync job |
| `src/trigger/jobs/xero/batch-sync.ts` | Batch operations with throttling |
| `src/trigger/client.ts` | Add Xero event definitions |

**Implementation: `src/lib/xero/queue.ts`**

```typescript
/**
 * Xero Sync Queue Manager
 * 
 * Manages job priorities and batching for Xero operations.
 * Uses Trigger.dev for durable job execution with built-in retry.
 */

export type XeroSyncJobType = 
  | 'invoice-create'
  | 'invoice-update'
  | 'contact-create'
  | 'contact-update'
  | 'credit-note-create'
  | 'payment-record'
  | 'bulk-sync';

export type XeroSyncPriority = 'high' | 'normal' | 'low';

export interface XeroSyncJob {
  id: string;
  type: XeroSyncJobType;
  organizationId: string;
  entityId: string;
  entityType: 'invoice' | 'contact' | 'credit_note' | 'payment';
  priority: XeroSyncPriority;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor?: Date;
}

/**
 * Priority weights for job ordering
 * Higher number = processed first
 */
export const PRIORITY_WEIGHTS: Record<XeroSyncPriority, number> = {
  high: 100,    // Payment updates, status changes
  normal: 50,   // New invoices, contacts
  low: 10,      // Bulk sync, cleanup
};

/**
 * Retry configuration by job type
 */
export const RETRY_CONFIG: Record<XeroSyncJobType, { maxAttempts: number; backoffMs: number[] }> = {
  'invoice-create': { 
    maxAttempts: 5, 
    backoffMs: [1000, 5000, 30000, 60000, 300000] // 1s, 5s, 30s, 1m, 5m
  },
  'invoice-update': { 
    maxAttempts: 5, 
    backoffMs: [1000, 5000, 30000, 60000, 300000]
  },
  'contact-create': { 
    maxAttempts: 3, 
    backoffMs: [1000, 10000, 60000]
  },
  'contact-update': { 
    maxAttempts: 3, 
    backoffMs: [1000, 10000, 60000]
  },
  'credit-note-create': { 
    maxAttempts: 5, 
    backoffMs: [1000, 5000, 30000, 60000, 300000]
  },
  'payment-record': { 
    maxAttempts: 5, 
    backoffMs: [1000, 5000, 30000, 60000, 300000]
  },
  'bulk-sync': { 
    maxAttempts: 3, 
    backoffMs: [60000, 300000, 900000] // 1m, 5m, 15m
  },
};

/**
 * Calculate backoff delay for retry attempt
 */
export function getRetryDelay(jobType: XeroSyncJobType, attempt: number): number {
  const config = RETRY_CONFIG[jobType];
  const index = Math.min(attempt - 1, config.backoffMs.length - 1);
  return config.backoffMs[index];
}
```

**Implementation: `src/trigger/jobs/xero/sync-invoice.ts`**

```typescript
/**
 * Xero Invoice Sync Job
 * 
 * Syncs invoices to Xero with rate limiting, circuit breaker, and retry.
 */

import { task, retry } from '@trigger.dev/sdk/v3';
import { XeroRateLimiter } from '~/lib/xero/rate-limiter';
import { XeroCircuitBreaker } from '~/lib/xero/circuit-breaker';
import { getRetryDelay, RETRY_CONFIG } from '~/lib/xero/queue';
import { redis } from '~/lib/redis'; // Shared Redis client

interface SyncInvoicePayload {
  organizationId: string;
  invoiceId: string;
  orderId: string;
  customerId: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    taxType: string;
  }>;
  reference: string;
  dueDate: string;
  currency: 'AUD';
}

interface SyncInvoiceResult {
  success: boolean;
  xeroInvoiceId?: string;
  xeroInvoiceNumber?: string;
  error?: string;
  rateLimitState?: {
    callsRemaining: number;
    resetAt: number;
  };
}

export const syncXeroInvoiceTask = task({
  id: 'xero-sync-invoice',
  
  // Retry configuration
  retry: {
    maxAttempts: RETRY_CONFIG['invoice-create'].maxAttempts,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 300000,
  },

  run: async (payload: SyncInvoicePayload): Promise<SyncInvoiceResult> => {
    const { organizationId, invoiceId, orderId, customerId, lineItems, reference, dueDate, currency } = payload;

    const rateLimiter = new XeroRateLimiter(redis);
    const circuitBreaker = new XeroCircuitBreaker(redis);

    // 1. Check circuit breaker
    const circuitCheck = await circuitBreaker.canRequest(organizationId);
    if (!circuitCheck.allowed) {
      // Circuit is open - fail fast
      throw new Error(`Xero circuit breaker OPEN for org ${organizationId}. Next attempt at ${new Date(circuitCheck.status.nextAttempt || Date.now()).toISOString()}`);
    }

    // 2. Check rate limit
    const rateState = await rateLimiter.getState(organizationId);
    if (rateState.shouldDelay) {
      // Approaching rate limit - add delay
      await new Promise(resolve => setTimeout(resolve, rateState.delayMs));
    }

    if (rateState.callsRemaining === 0) {
      // At rate limit - reschedule
      throw retry.rescheduleIn(rateLimiter.handleRateLimitResponse());
    }

    // 3. Record the API call
    const { allowed } = await rateLimiter.recordCall(organizationId);
    if (!allowed) {
      throw retry.rescheduleIn(60000); // Try again in 1 minute
    }

    try {
      // 4. Make Xero API call
      // TODO: Replace with actual XeroClient call
      const xeroClient = await getXeroClient(organizationId);
      
      const invoice = await xeroClient.accountingApi.createInvoices(
        xeroClient.tenantId,
        {
          invoices: [{
            type: 'ACCREC',
            contact: { contactID: await getXeroContactId(customerId, organizationId) },
            lineItems: lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              taxType: item.taxType,
            })),
            date: new Date().toISOString().split('T')[0],
            dueDate,
            currencyCode: currency,
            reference,
            status: 'AUTHORISED',
          }],
        }
      );

      // 5. Record success
      await circuitBreaker.recordSuccess(organizationId);

      const createdInvoice = invoice.invoices?.[0];
      
      // 6. Update local record with Xero ID
      await updateOrderXeroInvoiceId(orderId, createdInvoice?.invoiceID);

      // 7. Log sync
      await logXeroSync({
        organizationId,
        entityType: 'invoice',
        entityId: invoiceId,
        action: 'create',
        status: 'success',
        xeroId: createdInvoice?.invoiceID,
      });

      return {
        success: true,
        xeroInvoiceId: createdInvoice?.invoiceID,
        xeroInvoiceNumber: createdInvoice?.invoiceNumber,
        rateLimitState: {
          callsRemaining: rateState.callsRemaining - 1,
          resetAt: rateState.resetAt,
        },
      };

    } catch (error) {
      // Handle Xero-specific errors
      const xeroError = parseXeroError(error);

      if (xeroError.statusCode === 429) {
        // Rate limited by Xero
        const retryAfter = rateLimiter.handleRateLimitResponse(xeroError.retryAfter);
        throw retry.rescheduleIn(retryAfter);
      }

      if (xeroError.statusCode >= 500) {
        // Xero server error - record failure for circuit breaker
        await circuitBreaker.recordFailure(organizationId);
        throw error; // Will retry with backoff
      }

      if (xeroError.statusCode === 400) {
        // Validation error - log and don't retry
        await logXeroSync({
          organizationId,
          entityType: 'invoice',
          entityId: invoiceId,
          action: 'create',
          status: 'error',
          error: xeroError.message,
        });
        
        return {
          success: false,
          error: xeroError.message,
        };
      }

      // Other errors - record failure and retry
      await circuitBreaker.recordFailure(organizationId);
      throw error;
    }
  },
});
```

**Acceptance Criteria:**
- [ ] Jobs enqueue with correct priority
- [ ] Rate limiter delays/blocks appropriately
- [ ] Circuit breaker prevents cascade failures
- [ ] Retry backoff follows exponential pattern
- [ ] Sync logs persist for audit trail
- [ ] Failed jobs create error records

**Estimated effort:** Medium (3-4 iterations)

---

### Phase 4: Webhook Handler with Signature Verification

**Files to create:**

| File | Purpose |
|------|---------|
| `src/server/api/webhooks/xero.ts` | Webhook endpoint handler |
| `src/lib/xero/webhook-verifier.ts` | HMAC signature verification |
| `src/lib/xero/webhook-processor.ts` | Event routing and processing |

**Implementation: `src/lib/xero/webhook-verifier.ts`**

```typescript
/**
 * Xero Webhook Signature Verification
 * 
 * Xero signs webhook payloads with HMAC-SHA256 using your webhook key.
 * This must be verified before processing any webhook events.
 * 
 * @see https://developer.xero.com/documentation/webhooks/
 */

import crypto from 'crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify Xero webhook signature
 * 
 * @param payload - Raw request body as string
 * @param signature - x-xero-signature header value
 * @param webhookKey - Your Xero webhook key from app settings
 */
export function verifyXeroWebhookSignature(
  payload: string,
  signature: string,
  webhookKey: string
): WebhookVerificationResult {
  if (!signature) {
    return { valid: false, error: 'Missing x-xero-signature header' };
  }

  if (!webhookKey) {
    return { valid: false, error: 'Webhook key not configured' };
  }

  try {
    const computedSignature = crypto
      .createHmac('sha256', webhookKey)
      .update(payload)
      .digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );

    return { valid };
  } catch (error) {
    return { 
      valid: false, 
      error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
```

**Implementation: `src/server/api/webhooks/xero.ts`**

```typescript
/**
 * Xero Webhook Endpoint
 * 
 * Handles incoming webhook events from Xero.
 * 
 * Endpoint: POST /api/webhooks/xero
 * 
 * Required headers:
 * - x-xero-signature: HMAC-SHA256 signature
 * 
 * Event types handled:
 * - INVOICE.CREATED
 * - INVOICE.UPDATED  
 * - INVOICE.PAID
 * - INVOICE.VOIDED
 * - CONTACT.CREATED
 * - CONTACT.UPDATED
 * - CREDITNOTE.CREATED
 * - CREDITNOTE.UPDATED
 */

import { json } from '@tanstack/start';
import { verifyXeroWebhookSignature } from '~/lib/xero/webhook-verifier';
import { processXeroWebhookEvent } from '~/lib/xero/webhook-processor';
import { logXeroWebhook } from '~/lib/xero/logging';

interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: string;
  eventCategory: string;
  tenantId: string;
  tenantType: string;
}

interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
}

export async function POST(request: Request) {
  const webhookKey = process.env.XERO_WEBHOOK_KEY;
  const rawBody = await request.text();
  const signature = request.headers.get('x-xero-signature') || '';

  // 1. Verify signature
  const verification = verifyXeroWebhookSignature(rawBody, signature, webhookKey || '');
  
  if (!verification.valid) {
    // Log failed verification attempt
    await logXeroWebhook({
      status: 'signature_failed',
      error: verification.error,
      payload: rawBody.substring(0, 1000), // Truncate for logging
    });
    
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse payload
  let payload: XeroWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logXeroWebhook({
      status: 'parse_failed',
      error: 'Invalid JSON payload',
      payload: rawBody.substring(0, 1000),
    });
    return json({ error: 'Invalid payload' }, { status: 400 });
  }

  // 3. Handle Xero's Intent to Receive validation
  // Xero sends an empty events array to verify the endpoint
  if (!payload.events || payload.events.length === 0) {
    return json({ received: true }, { status: 200 });
  }

  // 4. Log and process events asynchronously
  // Respond immediately to avoid Xero timeout (30 seconds)
  const webhookLogId = await logXeroWebhook({
    status: 'received',
    eventCount: payload.events.length,
    firstSequence: payload.firstEventSequence,
    lastSequence: payload.lastEventSequence,
    payload: rawBody,
  });

  // Queue event processing (don't await)
  processXeroWebhookEvent(payload.events, webhookLogId).catch(async (error) => {
    await logXeroWebhook({
      id: webhookLogId,
      status: 'processing_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  // 5. Return success immediately
  return json({ received: true, logId: webhookLogId }, { status: 200 });
}
```

**Implementation: `src/lib/xero/webhook-processor.ts`**

```typescript
/**
 * Xero Webhook Event Processor
 * 
 * Routes webhook events to appropriate handlers and triggers local updates.
 */

import { triggerRevenueRecognition } from '~/lib/financial/revenue-recognition';
import { updateInvoiceStatus } from '~/server/functions/invoices';
import { updateCustomerFromXero } from '~/server/functions/customers';

type XeroEventHandler = (event: XeroWebhookEvent, logId: string) => Promise<void>;

const EVENT_HANDLERS: Record<string, XeroEventHandler> = {
  'INVOICE.PAID': handleInvoicePaid,
  'INVOICE.UPDATED': handleInvoiceUpdated,
  'INVOICE.VOIDED': handleInvoiceVoided,
  'CONTACT.UPDATED': handleContactUpdated,
  'CREDITNOTE.CREATED': handleCreditNoteCreated,
  'CREDITNOTE.UPDATED': handleCreditNoteUpdated,
};

export async function processXeroWebhookEvent(
  events: XeroWebhookEvent[],
  logId: string
): Promise<void> {
  for (const event of events) {
    const handler = EVENT_HANDLERS[event.eventType];
    
    if (handler) {
      try {
        await handler(event, logId);
        await updateWebhookLogStatus(logId, event.eventType, 'processed');
      } catch (error) {
        await updateWebhookLogStatus(logId, event.eventType, 'failed', error);
        // Don't throw - continue processing other events
      }
    } else {
      // Unknown event type - log for review
      await updateWebhookLogStatus(logId, event.eventType, 'ignored', 'Unknown event type');
    }
  }
}

/**
 * Handle invoice paid event
 * CRITICAL: Triggers revenue recognition workflow
 */
async function handleInvoicePaid(event: XeroWebhookEvent, logId: string): Promise<void> {
  const xeroInvoiceId = event.resourceId;
  
  // 1. Find local invoice by Xero ID
  const invoice = await findInvoiceByXeroId(xeroInvoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found for Xero ID: ${xeroInvoiceId}`);
  }

  // 2. Update local payment status
  await updateInvoiceStatus(invoice.id, {
    paymentStatus: 'paid',
    paidAt: new Date(event.eventDateUtc),
    xeroSyncStatus: 'synced',
  });

  // 3. Trigger revenue recognition (if milestone-based)
  const order = await getOrderForInvoice(invoice.orderId);
  if (order.recognitionType === 'milestone') {
    await triggerRevenueRecognition({
      orderId: order.id,
      invoiceId: invoice.id,
      milestone: 'payment_received',
      amount: invoice.total,
      organizationId: invoice.organizationId,
    });
  }

  // 4. Log the update
  await logXeroSync({
    organizationId: invoice.organizationId,
    entityType: 'invoice',
    entityId: invoice.id,
    action: 'payment_received',
    status: 'success',
    xeroId: xeroInvoiceId,
    webhookLogId: logId,
  });
}

// ... additional handlers
```

**Acceptance Criteria:**
- [ ] Webhook endpoint validates HMAC signature
- [ ] Invalid signatures return 401 with logging
- [ ] Empty events (Intent to Receive) handled correctly
- [ ] Events processed asynchronously after quick response
- [ ] INVOICE.PAID triggers revenue recognition
- [ ] Processing errors logged but don't fail webhook

**Estimated effort:** Medium (3-4 iterations)

---

### Phase 5: Revenue Recognition Timing Coordination

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/lib/financial/revenue-recognition.ts` | Recognition engine with Xero coordination |
| `src/trigger/jobs/financial/recognize-revenue.ts` | Async revenue recognition job |

**Problem:** Revenue recognition timing conflicts with Xero sync:
1. Milestone completed (e.g., battery delivered)
2. Revenue should be recognized
3. But Xero sync might fail
4. What state is the recognition in?

**Solution: State Machine with Xero Coordination**

```typescript
/**
 * Revenue Recognition States
 * 
 * State transitions:
 * PENDING -> RECOGNIZED -> SYNCED (happy path)
 * PENDING -> RECOGNIZED -> SYNC_FAILED -> SYNCED (with retry)
 * PENDING -> RECOGNIZED -> SYNC_FAILED -> MANUAL_OVERRIDE (after max retries)
 */

export type RecognitionState = 
  | 'PENDING'          // Milestone not yet completed
  | 'RECOGNIZED'       // Revenue recognized locally
  | 'SYNCING'          // Xero sync in progress
  | 'SYNCED'           // Xero sync confirmed
  | 'SYNC_FAILED'      // Xero sync failed (retrying)
  | 'MANUAL_OVERRIDE'; // Manual intervention required

export interface RevenueRecognitionRecord {
  id: string;
  orderId: string;
  invoiceId: string;
  milestoneId: string;
  milestoneName: string;
  recognizedAmount: number;  // AUD cents
  recognitionDate: Date;
  state: RecognitionState;
  xeroSyncAttempts: number;
  xeroSyncError?: string;
  lastXeroSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recognize revenue for a milestone
 * 
 * Order of operations:
 * 1. Create local recognition record (RECOGNIZED)
 * 2. Update deferred revenue balance
 * 3. Queue Xero sync job (transitions to SYNCING)
 * 4. Xero job confirms success (transitions to SYNCED)
 * 
 * @param params Recognition parameters
 */
export async function recognizeRevenue(params: {
  orderId: string;
  invoiceId: string;
  milestone: MilestoneType;
  amount: number;
  organizationId: string;
}): Promise<RevenueRecognitionRecord> {
  const { orderId, invoiceId, milestone, amount, organizationId } = params;

  // 1. Get milestone configuration
  const milestoneConfig = await getMilestoneConfig(orderId, milestone);
  const recognitionPercent = milestoneConfig.recognitionPercent;
  const recognizedAmount = Math.round(amount * (recognitionPercent / 100));

  // 2. Create recognition record
  const recognition = await db.insert(revenueRecognition).values({
    orderId,
    invoiceId,
    milestoneId: milestoneConfig.id,
    milestoneName: milestoneConfig.name,
    recognizedAmount,
    recognitionDate: new Date(),
    state: 'RECOGNIZED',
    xeroSyncAttempts: 0,
  }).returning();

  // 3. Update deferred revenue
  await updateDeferredRevenue({
    orderId,
    recognizedAmount,
    remainingDeferred: await calculateRemainingDeferred(orderId, recognizedAmount),
  });

  // 4. Queue Xero sync (low priority - recognition is already recorded locally)
  await queueXeroSync({
    type: 'revenue-recognition-sync',
    organizationId,
    entityId: recognition[0].id,
    entityType: 'revenue_recognition',
    priority: 'low',
    payload: {
      orderId,
      invoiceId,
      recognizedAmount,
      recognitionDate: recognition[0].recognitionDate,
    },
  });

  // 5. Update state to SYNCING
  await db.update(revenueRecognition)
    .set({ state: 'SYNCING', updatedAt: new Date() })
    .where(eq(revenueRecognition.id, recognition[0].id));

  return { ...recognition[0], state: 'SYNCING' };
}

/**
 * Handle Xero sync result for revenue recognition
 */
export async function handleRecognitionSyncResult(
  recognitionId: string,
  result: { success: boolean; error?: string }
): Promise<void> {
  const recognition = await getRecognitionById(recognitionId);
  
  if (result.success) {
    await db.update(revenueRecognition)
      .set({ 
        state: 'SYNCED',
        lastXeroSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(revenueRecognition.id, recognitionId));
  } else {
    const newAttempts = recognition.xeroSyncAttempts + 1;
    const newState = newAttempts >= 5 ? 'MANUAL_OVERRIDE' : 'SYNC_FAILED';
    
    await db.update(revenueRecognition)
      .set({
        state: newState,
        xeroSyncAttempts: newAttempts,
        xeroSyncError: result.error,
        lastXeroSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(revenueRecognition.id, recognitionId));

    if (newState === 'MANUAL_OVERRIDE') {
      // Notify finance team
      await sendManualOverrideNotification(recognitionId, result.error);
    }
  }
}
```

**Milestone to Recognition to Xero Timing:**

```
Timeline:
─────────────────────────────────────────────────────────────────►

T0: Order Created
    └── Deferred Revenue: $10,000
        └── Recognition State: N/A

T1: Battery Delivered (50% milestone)
    └── recognizeRevenue() called
        └── Recognition record created: $5,000, state=RECOGNIZED
        └── Deferred updated: $5,000 remaining
        └── Xero sync queued (LOW priority)
        └── State: SYNCING

T2: Xero Sync Job Executes
    └── Rate limit check: OK
    └── Circuit breaker: CLOSED
    └── API call: Create/Update Journal Entry
    └── Success:
        └── State: SYNCED
    └── Failure (rate limit):
        └── Re-queue with delay
        └── State: SYNC_FAILED
    └── Failure (5x):
        └── State: MANUAL_OVERRIDE
        └── Alert finance team

T3: Installation Complete (50% milestone)
    └── Same flow...

T4: Payment Received (via webhook)
    └── handleInvoicePaid() called
    └── Checks if all milestones recognized
    └── Final reconciliation
```

**Acceptance Criteria:**
- [ ] Recognition records created locally first
- [ ] Xero sync is async and low priority
- [ ] Failed syncs retry up to 5 times
- [ ] Manual override state triggers alert
- [ ] Deferred revenue balances always consistent
- [ ] Webhook payment triggers appropriate recognition

**Estimated effort:** Medium (3-4 iterations)

---

### Phase 6: Manual Resync UI

**Files to create:**

| File | Purpose |
|------|---------|
| `src/components/xero/XeroSyncStatus.tsx` | Sync status badge component |
| `src/components/xero/ManualSyncDialog.tsx` | Resync dialog with options |
| `src/components/xero/SyncErrorList.tsx` | Error list with retry actions |
| `src/routes/_app/settings/xero/sync.tsx` | Sync management page |

**Acceptance Criteria:**
- [ ] Sync status visible on invoices, contacts, credit notes
- [ ] Manual resync button triggers job
- [ ] Partial failure shows which items failed
- [ ] Retry individual failed items
- [ ] Bulk retry for all failed items
- [ ] Clear error after manual resolution

**Estimated effort:** Medium (3-4 iterations)

---

### Phase 7: Batch Sync Strategy

**Files to create:**

| File | Purpose |
|------|---------|
| `src/trigger/jobs/xero/batch-sync.ts` | Batch operations with throttling |
| `src/lib/xero/batch-processor.ts` | Batch chunking and throttling logic |

**Implementation: Batch Strategy**

```typescript
/**
 * Batch Sync Strategy
 * 
 * For bulk operations (initial sync, catch-up sync):
 * - Chunk items into batches of 10
 * - Process batches with 1-second delay between
 * - Track progress for UI updates
 * - Handle partial failures without stopping
 */

export interface BatchSyncConfig {
  batchSize: number;       // 10 items per batch
  delayBetweenBatches: number; // 1000ms
  maxConcurrentBatches: number; // 1 (sequential to respect rate limit)
}

export interface BatchSyncProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  errors: Array<{ entityId: string; error: string }>;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export async function* batchSyncGenerator<T>(
  items: T[],
  processor: (item: T) => Promise<{ success: boolean; error?: string }>,
  config: BatchSyncConfig = { batchSize: 10, delayBetweenBatches: 1000, maxConcurrentBatches: 1 }
): AsyncGenerator<BatchSyncProgress> {
  const batches = chunk(items, config.batchSize);
  const progress: BatchSyncProgress = {
    total: items.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    currentBatch: 0,
    totalBatches: batches.length,
    errors: [],
    startedAt: new Date(),
  };

  for (const batch of batches) {
    progress.currentBatch++;
    
    for (const item of batch) {
      try {
        const result = await processor(item);
        progress.processed++;
        
        if (result.success) {
          progress.succeeded++;
        } else {
          progress.failed++;
          progress.errors.push({ 
            entityId: (item as any).id || 'unknown',
            error: result.error || 'Unknown error',
          });
        }
      } catch (error) {
        progress.processed++;
        progress.failed++;
        progress.errors.push({
          entityId: (item as any).id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Estimate completion time
    const elapsed = Date.now() - progress.startedAt.getTime();
    const rate = progress.processed / elapsed;
    const remaining = progress.total - progress.processed;
    progress.estimatedCompletion = new Date(Date.now() + (remaining / rate));

    // Yield progress update
    yield progress;

    // Delay before next batch (rate limit protection)
    if (progress.currentBatch < progress.totalBatches) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Batches process sequentially (rate limit safe)
- [ ] Progress updates in real-time
- [ ] Partial failures tracked without stopping
- [ ] Estimated completion time calculated
- [ ] Batch size configurable per operation type

**Estimated effort:** Small (2 iterations)

---

## Database Schema Additions

**New Tables:**

```sql
-- Xero webhook event logs
CREATE TABLE xero_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  event_type VARCHAR(100),
  event_sequence INTEGER,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'received',
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by status and time
CREATE INDEX idx_xero_webhook_logs_status ON xero_webhook_logs(status, created_at DESC);
CREATE INDEX idx_xero_webhook_logs_org ON xero_webhook_logs(organization_id, created_at DESC);

-- Xero sync error tracking
CREATE TABLE xero_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xero_sync_errors_unresolved ON xero_sync_errors(organization_id, resolved, created_at DESC) WHERE NOT resolved;

-- Xero sync operation logs
CREATE TABLE xero_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  xero_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  request_summary JSONB,
  response_summary JSONB,
  duration_ms INTEGER,
  webhook_log_id UUID REFERENCES xero_webhook_logs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xero_sync_logs_entity ON xero_sync_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_xero_sync_logs_org ON xero_sync_logs(organization_id, created_at DESC);

-- Retention policy: auto-delete logs older than 90 days (scheduled job)
```

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Xero API changes break integration | High | Low | Version-pin Xero SDK, monitor changelog, integration tests |
| Rate limit exceeded during bulk sync | Medium | Medium | Batch throttling, proactive rate tracking, queue overflow to next window |
| Webhook endpoint unavailable | High | Low | Health monitoring, redundant endpoint, manual sync fallback |
| Revenue recognition timing mismatch | High | Medium | State machine with clear transitions, audit trail, reconciliation reports |
| Redis unavailable (rate limiter) | Medium | Low | Fallback to conservative defaults (no API calls), alert on Redis failure |
| Circuit breaker stays open too long | Medium | Low | Manual override, configurable reset timeout, admin dashboard |

---

## Open Questions

- [ ] **Xero Tenant Strategy:** Multi-tenant or single Xero organization per Renoz customer?
- [ ] **Webhook Endpoint Domain:** What is the public URL for webhook callbacks? Need SSL.
- [ ] **Redis Provider:** Continue with Upstash or move to self-hosted for cost at scale?
- [ ] **Manual Override Process:** Who can override MANUAL_OVERRIDE state? Just finance role?
- [ ] **Sync Conflict Resolution:** If invoice edited in both systems, which wins?

---

## Success Criteria

1. **Rate Limit Compliance:** Zero 429 errors under normal load
2. **Sync Reliability:** >99% sync success rate within 5 retries
3. **Circuit Breaker Effectiveness:** Cascade failures prevented during Xero outages
4. **Revenue Recognition Accuracy:** 100% match between local recognition and Xero journal entries
5. **Webhook Latency:** Payment status updates within 30 seconds of Xero event
6. **Error Visibility:** All sync errors surfaced in UI within 1 minute
7. **Recovery Time:** Manual resync restores consistency within 5 minutes

---

## Implementation Order

1. **Phase 1 & 2:** Rate Limiter + Circuit Breaker (infrastructure)
2. **Phase 3:** Job Queue with Trigger.dev (core sync)
3. **Phase 4:** Webhook Handler (inbound sync)
4. **Phase 5:** Revenue Recognition Coordination (business logic)
5. **Phase 6:** Manual Resync UI (user-facing)
6. **Phase 7:** Batch Sync Strategy (bulk operations)

Total estimated effort: **16-22 iterations**
