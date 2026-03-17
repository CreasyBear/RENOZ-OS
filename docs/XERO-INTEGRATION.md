# Xero Integration

> Operational guide for Renoz v3's Xero integration.
> Last verified: 2026-03-16

## Summary

Renoz v3 now treats Xero as an organization-scoped OAuth integration, not a single environment-wide token.

That means:

- each organization must connect its own Xero tenant
- invoice and revenue-recognition sync fail closed when the org is not connected
- invoice sync also fails closed when the customer is not mapped to a trusted `xeroContactId`
- payment webhooks are verified against the raw request body and deduped before any money is applied

This is intentional. Money safety is more important than best-effort sync.

## What Renoz Syncs

Current Xero-backed flows:

- invoice sync from orders
- payment updates from Xero webhooks into Renoz order payments
- revenue-recognition sync as Xero Manual Journals

Current non-goals:

- automatic Xero contact creation
- fuzzy contact matching
- update-in-place reconciliation of existing Xero invoices or journals
- reviving legacy Trigger Xero sync jobs

## Connection Model

Renoz uses one active Xero OAuth connection per organization for `serviceType: 'accounting'`.

Runtime auth comes from `oauth_connections`, not from `XERO_ACCESS_TOKEN` / `XERO_TENANT_ID`.

Key behavior:

- access tokens are organization-scoped
- refresh tokens are rotated through the shared OAuth refresh flow
- the Xero tenant ID is stored in `oauth_connections.externalAccountId`
- if the authenticating Xero user can access multiple tenants, Renoz now requires an explicit tenant choice before finishing OAuth setup
- if no active Xero accounting connection exists, syncs fail closed with actionable errors
- if refresh fails permanently, the connection is marked inactive and the org must reconnect

## Required Environment Variables

These are app-level credentials and secrets. They do not represent an organization's runtime Xero session.

- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`
- `XERO_REDIRECT_URI`
- `XERO_WEBHOOK_SECRET`
- `XERO_WEBHOOKS_ENABLED=true` to accept webhook traffic
- `XERO_API_BASE_URL` is optional and defaults to `https://api.xero.com/api.xro/2.0`
- `OAUTH_ENCRYPTION_KEY` is required because Xero tokens are encrypted at rest in `oauth_connections`

## Organization Setup

For an organization to use Xero safely, all of the following must be true:

1. The org has an active Xero OAuth connection with `provider: 'xero'` and `serviceType: 'accounting'`.
2. The connection has a valid tenant ID in `externalAccountId`.
3. Customers that need invoice sync have `customers.xeroContactId` populated.
4. If revenue recognition sync is used, the org settings contain:
   - `xeroRevenueRecognitionRevenueAccount`
   - `xeroRevenueRecognitionDeferredAccount`

If any of those are missing, Renoz fails closed instead of guessing.

## Trusted Contact Mapping

Invoice sync now requires a trusted Xero contact mapping.

Renoz uses:

- `customers.xeroContactId`

Invoice sync behavior:

- if `xeroContactId` is present, Renoz sends `contactID` to Xero
- if `xeroContactId` is missing, invoice sync is blocked
- Renoz does not silently fall back to name/email-only invoice creation
- Renoz does not auto-create contacts in this wave

This avoids duplicate or incorrectly matched contacts in real books.

Backfill expectation for existing orgs:

- adding the nullable column is not enough
- operators must backfill `customers.xeroContactId` for any customer that should participate in invoice sync
- until that mapping exists, invoice sync will fail closed for that customer by design

## Invoice Sync Behavior

Invoice sync runs through [xero-invoice-sync.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/financial/xero-invoice-sync.ts).

Safety rules:

- order must belong to the org
- order must not be `draft` or `cancelled`
- customer must exist and have a name
- customer must have `xeroContactId`
- line items must exist

Retry and idempotency behavior:

- if the order is already marked `synced` and no force flag is used, Renoz returns the existing synced state
- before creating a new Xero invoice, Renoz checks Xero by order reference
- if a matching Xero invoice already exists, Renoz reconciles local state to that invoice instead of sending a duplicate

## Revenue Recognition Sync

Revenue recognition sync runs through [revenue-recognition.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/financial/revenue-recognition.ts).

It creates Xero Manual Journals using the org's configured revenue/deferred accounts.

Safety rules:

- org must have an active Xero accounting connection
- org must have both revenue-recognition account codes configured
- sync stores only real `xeroJournalId` values returned by Xero

Retry and idempotency behavior:

- if the recognition is already synced and no force flag is used, Renoz returns the existing state
- before creating a new manual journal, Renoz checks Xero by recognition reference
- if a matching journal already exists, Renoz reconciles local state instead of creating a duplicate
- repeated failures follow the existing `sync_failed -> manual_override` state machine

## Payment Webhooks

Xero webhook ingress is handled by [xero.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/routes/api/webhooks/xero.ts).

Important behavior:

- Renoz reads the exact raw request body using `request.text()`
- Renoz verifies `x-xero-signature` against that raw body only
- Renoz rejects invalid signatures with `401`
- Renoz does not trust reconstructed `JSON.stringify(...)` payloads for verification

After verification:

- the payload is parsed
- supported payment payloads are normalized
- each payment is applied through the internal `applyXeroPaymentUpdate` path

## Payment Idempotency

Payment replay safety is implemented with:

- `xero_payment_events`
- real `order_payments` rows
- recomputation of order payment totals through the existing payment-status logic

Deduplication behavior:

- primary dedupe key: Xero `paymentId`
- fallback dedupe key: invoice/date/amount/reference composite
- duplicate webhook deliveries return success/no-op semantics
- Renoz does not increment `orders.paidAmount` directly anymore for Xero webhook traffic

This matters because webhook retries or replays must never double-apply money.

## Error Model

The Xero adapter now distinguishes these machine-readable failure classes:

- `configuration_unavailable`
- `connection_missing`
- `auth_failed`
- `forbidden`
- `rate_limited`
- `validation_failed`
- `transient_upstream_error`
- `unexpected_response`

Operational guidance:

- `configuration_unavailable`
  - fix environment configuration
- `connection_missing`
  - connect Xero for the organization
- `auth_failed`
  - refresh failed or token could not be used; reconnect the org's Xero integration
- `forbidden`
  - wrong tenant, missing scopes, or tenant access issue
- `rate_limited`
  - retry after the provided delay
- `validation_failed`
  - fix data or account mapping
- `transient_upstream_error`
  - retry later
- `unexpected_response`
  - inspect logs and upstream payloads

## Database Changes in This Wave

This hardening wave introduced:

- `customers.xeroContactId`
- `xero_payment_events`

Migration:

- [0027_xero_foundation_hardening.sql](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/migrations/0027_xero_foundation_hardening.sql)

## Rollout Preflight

Before applying the Xero unique indexes in production, verify there are no duplicate active bindings:

```sql
SELECT organization_id, COUNT(*)
FROM oauth_connections
WHERE is_active = true
  AND provider = 'xero'
  AND service_type = 'accounting'
GROUP BY organization_id
HAVING COUNT(*) > 1;

SELECT external_account_id, COUNT(*)
FROM oauth_connections
WHERE is_active = true
  AND provider = 'xero'
  AND service_type = 'accounting'
  AND external_account_id IS NOT NULL
GROUP BY external_account_id
HAVING COUNT(*) > 1;
```

Both queries must return zero rows before the migration proceeds.

If you are fixing a historically drifted environment:

- use the guarded Supabase reconciliation script first
- do not blindly apply both the reconciliation SQL and the Drizzle migration in the same rollout without checking which path already created the Xero objects
- only enable invoice sync after required `xeroContactId` backfills are complete

## Operational Checklist

Before enabling Xero sync for an organization:

- verify `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI`
- verify `XERO_WEBHOOK_SECRET`
- set `XERO_WEBHOOKS_ENABLED=true`
- verify `OAUTH_ENCRYPTION_KEY`
- connect the org's Xero tenant through OAuth
- confirm the active connection has `serviceType: 'accounting'`
- populate `customers.xeroContactId` for any customer that needs invoice sync
- set revenue-recognition Xero account codes if manual journal sync is used

Before trusting payment ingestion:

- point Xero webhooks at the Renoz Xero webhook endpoint
- verify valid signed webhook deliveries succeed
- verify duplicate deliveries are no-ops

## Known Remaining Gaps

The Xero foundation is significantly safer now, but these follow-up capabilities still remain:

- a proper customer-to-Xero contact mapping workflow in the UI
- optional contact creation/matching tooling
- richer remote reconciliation beyond reference-based safety checks
- any finance/operator UI that explains the new typed failure states more clearly

## Files to Know

- [xero-adapter.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/financial/xero-adapter.ts)
- [xero-invoice-sync.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/financial/xero-invoice-sync.ts)
- [revenue-recognition.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/financial/revenue-recognition.ts)
- [xero.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/routes/api/webhooks/xero.ts)
- [oauth-connections.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/oauth/oauth-connections.ts)
- [xero-payment-events.ts](/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/financial/xero-payment-events.ts)
