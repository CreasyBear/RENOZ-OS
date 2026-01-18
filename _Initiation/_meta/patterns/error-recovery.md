# Error Recovery Patterns

Cross-cutting error recovery patterns for the renoz-v3 application. These patterns ensure consistent, resilient handling of failures across all domains.

---

## Pattern 1: Sync Failure Recovery (External APIs)

**Use Case:** Xero sync, external API integrations, any third-party service communication.

```
Retry Strategy: Exponential backoff with dead letter queue

Schedule:
- Attempt 1: Immediate
- Attempt 2: 30 seconds delay
- Attempt 3: 2 minutes delay
- Attempt 4: 15 minutes delay
- Attempt 5: 1 hour delay

After 5 failures:
- Move to dead_letter_queue table
- Set status = 'dead_letter'
- Alert relevant team (finance for Xero, ops for other integrations)
- Log full error context for debugging

UI States:
- "Sync pending" (initial)
- "Sync in progress" (during attempt)
- "Sync failed - retrying (attempt N/5)" (on failure)
- "Manual intervention required" (dead letter)
```

### Implementation Notes

- Store `retry_count`, `last_attempt_at`, `next_attempt_at` in sync record
- Use Trigger.dev scheduled jobs for retry orchestration
- Dead letter queue should include: original payload, all error messages, timestamps
- Provide "Retry Now" button for dead-lettered items (resets retry count)

### Database Schema Pattern

```sql
CREATE TABLE sync_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,  -- 'contact', 'invoice', etc.
  entity_id UUID NOT NULL,
  external_service TEXT NOT NULL,  -- 'xero', 'resend', etc.
  operation TEXT NOT NULL,  -- 'push', 'pull', 'webhook'
  error_message TEXT,
  error_code TEXT,
  retry_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',  -- pending, retrying, dead_letter, resolved
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

---

## Pattern 2: Offline Conflict Resolution

**Use Case:** Field technician mobile app, any offline-first functionality.

```
Strategy: Last-write-wins with conflict audit log

Conflict Detection:
1. On sync: Compare server_updated_at vs local_updated_at
2. If server_updated_at > local_sync_timestamp: Conflict detected

Resolution:
- Keep the most recent version (higher timestamp wins)
- Log the "losing" version to conflict_audit table
- Include field-level diff for review

UI Flow:
1. "Synced successfully" (no conflicts)
2. "Synced with N conflicts" (conflicts detected) - clickable
3. Conflict review modal shows both versions side-by-side
4. User can manually override if needed (creates new version)
```

### Implementation Notes

- Store `local_updated_at` on client before sync attempt
- Server returns `conflict: true` if timestamps don't match expected
- Conflict audit preserves full entity state, not just changed fields
- Auto-resolution is default; manual review is optional

### Database Schema Pattern

```sql
CREATE TABLE conflict_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  winning_version JSONB NOT NULL,
  losing_version JSONB NOT NULL,
  winning_source TEXT NOT NULL,  -- 'server', 'client'
  losing_source TEXT NOT NULL,
  conflict_fields TEXT[],  -- fields that differed
  user_id UUID REFERENCES auth.users(id),
  device_id TEXT,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  manually_overridden BOOLEAN DEFAULT FALSE,
  override_user_id UUID REFERENCES auth.users(id)
);
```

---

## Pattern 3: Partial Transaction Failure (Saga Pattern)

**Use Case:** Quote-to-Job conversion, multi-step workflows, complex entity creation.

```
Strategy: Saga with compensation actions

Example: Quote to Job Conversion
- Step 1: Create job record (save job_id)
- Step 2: Transfer BOM items to job
- Step 3: Link quote to job, mark quote as converted
- Step 4: Create initial job activities

Compensation on Failure:
- Failure at step 2: Delete job from step 1
- Failure at step 3: Delete job AND restore BOM items
- Failure at step 4: Keep job but mark conversion as 'partial'
                     Alert user to complete setup manually

State Machine:
- INITIATED -> CREATING_JOB -> TRANSFERRING_BOM -> LINKING -> COMPLETE
                    |                |                |
                    v                v                v
              ROLLED_BACK     ROLLED_BACK      PARTIAL_SUCCESS
```

### Implementation Notes

- Each step is a separate transaction
- Store saga state in `saga_executions` table
- Compensation actions are idempotent
- Log each step for debugging failed sagas
- Partial success requires user notification and resolution path

### Database Schema Pattern

```sql
CREATE TABLE saga_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_type TEXT NOT NULL,  -- 'quote_to_job', 'invoice_creation', etc.
  initiator_id UUID NOT NULL,  -- the starting entity
  current_step TEXT NOT NULL,
  status TEXT NOT NULL,  -- initiated, in_progress, complete, failed, partial, rolled_back
  steps_completed JSONB DEFAULT '[]',  -- [{step, entity_id, timestamp}]
  error_message TEXT,
  error_step TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);
```

---

## Pattern 4: Email Send Failure

**Use Case:** Resend email service, any email sending functionality.

```
Strategy: Queue with status tracking and retry

Send Flow:
1. On send request: Status = 'queued', create email record
2. Resend API call: Status = 'sending'
3. On webhook success: Status = 'delivered', create activity
4. On webhook bounce: Status = 'bounced', add to suppression list
5. On API failure: Status = 'failed', schedule retry

Retry Schedule:
- Attempt 1: Immediate
- Attempt 2: 5 minutes
- Attempt 3: 30 minutes
- Attempt 4: 1 hour

After 4 failures: Status = 'failed_permanent'
- Notify user via in-app notification
- Show retry button on email history

UI States:
- Queued (pending icon)
- Sending (spinner)
- Delivered (green check)
- Opened (eye icon)
- Bounced (warning icon)
- Failed (red X with retry button)
```

### Implementation Notes

- Use webhook events to update status (not polling)
- Idempotent processing using Resend message ID
- Suppression list check BEFORE queuing (fail fast)
- Batch sends use same pattern but with batch_id grouping

### Database Schema Pattern

```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_message_id TEXT UNIQUE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id TEXT,
  template_data JSONB,
  status TEXT DEFAULT 'queued',  -- queued, sending, delivered, bounced, failed, failed_permanent
  retry_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## Pattern 5: Payment Processing Failure

**Use Case:** Any payment processing, Xero payment sync, credit card transactions.

```
Strategy: Idempotent retry with unique reference

Flow:
1. Generate unique payment_reference BEFORE attempt
2. Store reference with status = 'pending'
3. Call payment provider with reference as idempotency key
4. On success: status = 'completed'
5. On failure: status = 'failed', check if charge went through

Timeout Handling:
1. On timeout (no response within 30s): status = 'uncertain'
2. Query provider with payment_reference
3. If found: update status based on provider state
4. If not found: safe to retry with SAME reference

Double-Charge Prevention:
- Same payment_reference = same charge (idempotent)
- Provider returns existing result if already processed
- Never generate new reference for retry

Status States:
- pending -> processing -> completed
                |
                v
             failed -> retrying -> completed
                |          |
                v          v
            cancelled   failed_permanent
```

### Implementation Notes

- payment_reference format: `PAY-{org_id}-{entity_id}-{timestamp}-{nonce}`
- Store reference in database BEFORE API call
- On uncertain status, wait 5 minutes then check with provider
- Manual resolution required for failed_permanent

### Database Schema Pattern

```sql
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  provider TEXT NOT NULL,  -- 'xero', 'stripe', etc.
  provider_transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  idempotency_key TEXT,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  related_invoice_id UUID
);
```

---

## Cross-Pattern Guidelines

### Logging Requirements

All error recovery patterns MUST log:
1. Original operation attempted
2. Error message and code
3. Current retry count
4. User who initiated (if applicable)
5. Timestamp of failure
6. Full context (entity IDs, payloads)

### Alerting Rules

| Severity | Condition | Action |
|----------|-----------|--------|
| INFO | Retry scheduled | Log only |
| WARN | 3+ retries failed | In-app notification |
| ERROR | Dead letter / permanent failure | Email + Slack alert |
| CRITICAL | Payment uncertain | Immediate alert + auto-incident |

### User Communication

- Always show current status in UI
- Provide "Why?" link explaining failure
- Include "What can I do?" guidance
- Offer manual retry button where safe
- Never block user workflow for retriable errors

---

**Document Version:** 1.0
**Created:** 2026-01-17
**Purpose:** Cross-cutting error recovery patterns for renoz-v3
