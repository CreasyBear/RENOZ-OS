# Payment Processing PRD Execution

> **PRD**: payment-processing.prd.json
> **Stories**: 8
> **Dependencies**: FOUND-AUTH, FOUND-SCHEMA, FOUND-SHARED, DOM-CUSTOMERS

## Overview

Stripe integration for invoice payments:
- **Payment Intents**: Secure payment flow
- **Saved Methods**: Store and reuse payment methods
- **Webhooks**: Automated payment reconciliation
- **Public Payment Page**: Customer-facing payment UI

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Execution Order

### Phase 1: Schema (2 stories)
1. **PAY-001** - Payment Methods Schema
2. **PAY-002** - Payment Transactions Schema

### Phase 2: Infrastructure (1 story)
3. **PAY-003** - Stripe Client Setup

### Phase 3: API Routes (3 stories)
4. **PAY-004** - Payment Intent API (depends on 001, 002, 003)
5. **PAY-005** - Payment Methods API (depends on 001, 003)
6. **PAY-006** - Stripe Webhook Handler (depends on 001, 002, 003)

### Phase 4: UI (2 stories)
7. **PAY-007** - Payment Form Component (depends on 004)
8. **PAY-008** - Invoice Payment Page (depends on 007)

## Key Patterns

### Stripe Server Setup
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});
```

### Payment Flow
```
1. Client: POST /api/payments/intent { invoiceId }
2. Server: Creates PaymentIntent, returns clientSecret
3. Client: stripe.confirmPayment({ clientSecret })
4. Stripe: Redirects to return_url or fires webhook
5. Webhook: Updates payment_transaction and invoice status
```

### Webhook Signature Verification
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## UI Components Reference

| Component | Package | Usage |
|-----------|---------|-------|
| Elements | @stripe/react-stripe-js | Payment form wrapper |
| PaymentElement | @stripe/react-stripe-js | Card input |
| loadStripe | @stripe/stripe-js | Client initialization |

## Validation

```bash
bun run typecheck
python scripts/validate-prd-corpus.py --prd-root "_Initiation/_prd/"
```

## Completion

When ALL payment processing stories pass:
```xml
<promise>PAYMENT_PROCESSING_COMPLETE</promise>
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
