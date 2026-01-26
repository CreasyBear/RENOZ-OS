---
status: pending
priority: p2
issue_id: EMAIL-TPL-007
tags: [code-review, architecture, email-templates]
dependencies: [EMAIL-TPL-003, EMAIL-TPL-006]
---

# Complete Domain Template Coverage

## Problem Statement

Only warranty domain has a React Email template. Other CRM domains (Orders, Customers, Support, Pipeline, Financial, Inventory) lack proper email templates, relying on database templates or inline HTML.

**Impact**: MEDIUM - Inconsistent email experience across CRM functions.

## Findings

### Evidence

Current template coverage:
| Domain | React Templates | Database Templates | Coverage |
|--------|-----------------|-------------------|----------|
| Warranty | 1 (expiring) | 0 | Partial |
| Orders | 0 | ~3 | None |
| Customers | 0 | ~2 | None |
| Support | 0 | ~2 | None |
| Pipeline | 0 | 0 | None |
| Financial | 0 | ~2 | None |
| Inventory | 0 | ~1 | None |

### Required Templates by Domain

**Orders** (highest volume):
- Order confirmation
- Order shipped
- Order delivered
- Invoice
- Payment receipt

**Customers**:
- Welcome email
- Account update confirmation

**Support**:
- Ticket created
- Ticket response
- Ticket resolved

**Warranty**:
- Registration confirmation ✓ (exists)
- Warranty expiring ✓ (exists)
- Claim submitted
- Claim approved/denied

**Financial**:
- Invoice
- Payment reminder
- Payment confirmation

**Inventory**:
- Low stock alert
- Reorder notification

### Agent Source
- architecture-strategist: "Domain coverage gaps"
- code-simplicity-reviewer: "Start with highest-impact templates"

## Proposed Solutions

### Option A: Priority-Based Rollout (Recommended)
Build templates in order of business impact:
1. Orders (highest volume)
2. Financial (revenue impact)
3. Support (customer satisfaction)
4. Warranty (existing partial)
5. Customers (lower volume)
6. Inventory (internal)

**Pros**: Delivers value incrementally
**Cons**: Takes longer for full coverage
**Effort**: Large (total), Small (per sprint)
**Risk**: Low

### Option B: All at Once
Build all templates before deploying.

**Pros**: Consistent launch
**Cons**: Delays all value, larger risk
**Effort**: Large
**Risk**: High

## Recommended Action

Option A - Start with Orders domain, iterate.

## Technical Details

### Directory Structure
```
src/lib/email/templates/
├── orders/
│   ├── confirmation.tsx
│   ├── shipped.tsx
│   ├── delivered.tsx
│   ├── invoice.tsx
│   └── payment-receipt.tsx
├── financial/
│   ├── invoice.tsx
│   ├── payment-reminder.tsx
│   └── payment-confirmation.tsx
├── support/
│   ├── ticket-created.tsx
│   ├── ticket-response.tsx
│   └── ticket-resolved.tsx
├── warranty/
│   ├── registration.tsx
│   ├── expiring.tsx
│   ├── claim-submitted.tsx
│   └── claim-decision.tsx
├── customers/
│   ├── welcome.tsx
│   └── account-updated.tsx
└── inventory/
    ├── low-stock-alert.tsx
    └── reorder-notification.tsx
```

### Template Props Pattern
```typescript
// Each template has typed props
interface OrderConfirmationProps {
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress: Address;
  unsubscribeUrl?: string;
}
```

## Acceptance Criteria

Phase 1 (Orders):
- [ ] Order confirmation template
- [ ] Order shipped template
- [ ] Invoice template
- [ ] Payment receipt template
- [ ] Connected to order trigger jobs

Phase 2 (Financial):
- [ ] Invoice template
- [ ] Payment reminder template
- [ ] Payment confirmation template

Phase 3+ (Remaining domains):
- [ ] Support templates
- [ ] Warranty templates (enhance existing)
- [ ] Customer templates
- [ ] Inventory templates

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From architecture-strategist review |

## Resources

- Midday templates: `_reference/.midday-reference/packages/email/emails/`
