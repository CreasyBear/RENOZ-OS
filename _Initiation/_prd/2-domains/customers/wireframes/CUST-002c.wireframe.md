# Wireframe: DOM-CUST-002c - Credit Limit: UI Integration

## Story Reference

- **Story ID**: DOM-CUST-002c
- **Name**: Credit Limit: UI Integration
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: StatusBadge

## Overview

Display credit status in customer views and order creation. Shows credit limit, current balance, available credit, and status indicators (ok/warning/exceeded/hold) with appropriate warnings during order creation.

---

## UI Patterns (Reference Implementation)

### Status Badge
- **Pattern**: RE-UI Badge with semantic colors
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Credit status states: OK (green), Warning (amber), Exceeded (red), Hold (gray)
  - Icon + dot indicator variant
  - Responsive sizing (icon-only on mobile)

### Tooltip
- **Pattern**: RE-UI Tooltip
- **Reference**: `_reference/.reui-reference/registry/default/ui/tooltip.tsx`
- **Features**:
  - Tap-to-reveal on mobile
  - Hover-to-reveal on desktop
  - Contains credit details (limit, balance, available)

### Alert Banner
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Warning variant for credit limit warnings
  - Action button to view/manage credit
  - Dismissible with acknowledgment

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | contacts | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-002c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/contacts.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Credit Status Badge (Customer Detail - Icon Only)

```
┌────────────────────────────────────────┐
│ ← Customers                            │
├────────────────────────────────────────┤
│                                        │
│  Brisbane Solar Co           [$ ●]     │
│  ───────────────────────  ↑ icon+dot   │
│  admin@brisbanesolar.com.au  (green)   │
│                                        │
│  [Overview] [Orders] [Activity]        │
│                                        │
└────────────────────────────────────────┘

CREDIT STATUS TOOLTIP (on tap):
┌────────────────────────────────────────┐
│ ┌──────────────────────────────────┐   │
│ │ Credit Status: OK                │   │
│ │ ─────────────────────────────    │   │
│ │ Credit Limit:     $50,000        │   │
│ │ Current Balance:  $12,500        │   │
│ │ Available:        $37,500 (75%)  │   │
│ │                                  │   │
│ │ [====-------] 25% used           │   │
│ │                                  │   │
│ │            [Edit Limit]          │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

### Credit Status - Warning State (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│  Sydney Energy Systems             [$ ●]     │
│  ───────────────────────    (yellow)   │
│                                        │
└────────────────────────────────────────┘

TOOLTIP:
┌────────────────────────────────────────┐
│ ┌──────────────────────────────────┐   │
│ │ Credit Status: WARNING           │   │
│ │ ─────────────────────────────    │   │
│ │ Credit Limit:     $25,000        │   │
│ │ Current Balance:  $21,250        │   │
│ │ Available:        $3,750 (15%)   │   │
│ │                                  │   │
│ │ [==========--] 85% used          │   │
│ │                                  │   │
│ │ [!] Approaching credit limit     │   │
│ │                                  │   │
│ │            [Edit Limit]          │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

### Credit Status - Exceeded/Hold (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│  Melbourne Power Solutions                   [$ ●]     │
│  ───────────────────────      (red)    │
│                                        │
└────────────────────────────────────────┘

TOOLTIP (Exceeded):
┌────────────────────────────────────────┐
│ ┌──────────────────────────────────┐   │
│ │ [!] CREDIT EXCEEDED              │   │
│ │ ─────────────────────────────    │   │
│ │ Credit Limit:     $10,000        │   │
│ │ Current Balance:  $12,500        │   │
│ │ Over Limit:       -$2,500        │   │
│ │                                  │   │
│ │ [============!!!] 125% used      │   │
│ │                                  │   │
│ │ New orders require approval      │   │
│ │                                  │   │
│ │            [Edit Limit]          │   │
│ └──────────────────────────────────┘   │

TOOLTIP (On Hold):
┌────────────────────────────────────────┐
│ ┌──────────────────────────────────┐   │
│ │ [lock] CREDIT ON HOLD            │   │
│ │ ─────────────────────────────    │   │
│ │ Hold Reason:                     │   │
│ │ "Pending payment dispute"        │   │
│ │                                  │   │
│ │ Hold Date: Jan 5, 2026           │   │
│ │                                  │   │
│ │ Contact admin to release hold    │   │
│ │                                  │   │
│ │            [Edit Hold]           │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

### Customer Form - Credit Limit Field (Mobile)

```
┌────────────────────────────────────────┐
│ Edit Customer                    [×]   │
├────────────────────────────────────────┤
│                                        │
│  Company Name *                        │
│  [Brisbane Solar Co____________]       │
│                                        │
│  ... (other fields) ...                │
│                                        │
│  ──────────────────────────────────    │
│  Credit Settings                       │
│  ──────────────────────────────────    │
│                                        │
│  Credit Limit                          │
│  [$][___50,000__________]              │
│  Leave blank for no limit              │
│                                        │
│  Current Balance (read-only)           │
│  $12,500.00                            │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  [Cancel]            [Save Changes]    │
│                                        │
└────────────────────────────────────────┘
```

### Order Creation - Credit Warning (Mobile)

```
┌────────────────────────────────────────┐
│ New Order                        [×]   │
├────────────────────────────────────────┤
│                                        │
│  Customer                              │
│  [Sydney Energy Systems______________] [▼]   │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ [!] CREDIT WARNING              │  │
│  │                                  │  │
│  │ This order ($5,000) will exceed │  │
│  │ the customer's credit limit.    │  │
│  │                                  │  │
│  │ Available Credit: $3,750        │  │
│  │ Order Total:      $5,000        │  │
│  │ Over Limit By:    $1,250        │  │
│  │                                  │  │
│  │ [ ] Override credit check       │  │
│  │                                  │  │
│  │ Override Reason *               │  │
│  │ [_________________________]     │  │
│  │ [_________________________]     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ... (order details) ...               │
│                                        │
│  [Cancel]              [Create Order]  │
│                                        │
└────────────────────────────────────────┘
```

### Customer List - Credit Status Column (Mobile Card)

```
┌────────────────────────────────────────┐
│ Customers                    [+ New]   │
├────────────────────────────────────────┤
│ [Search_______________] [Filter ▼]     │
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Brisbane Solar Co                 │   │
│ │ john@brisbanesolar.com.au          [$●] OK   │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Sydney Energy Systems                  │   │
│ │ contact@sydneyenergy.com.au      [$●] 85%    │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Melbourne Power Solutions                        │   │
│ │ info@gamma.co     [$●] EXCEEDED  │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Credit Status Badge (Customer Summary Card)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Brisbane Solar Co                    [Edit] [Actions ▼]  │  │
│  │ john@brisbanesolar.com.au | +61 7 3000 0123                             │  │
│  │                                                         │  │
│  │ ┌─────────────┐  ┌──────────────────────────────────┐   │  │
│  │ │ Customer    │  │ Credit Status    [$●] OK         │   │  │
│  │ │ Since       │  │ ────────────────────────────     │   │  │
│  │ │ Mar 2023    │  │ Limit: $50,000                   │   │  │
│  │ │             │  │ Balance: $12,500                 │   │  │
│  │ │ Status      │  │ Available: $37,500               │   │  │
│  │ │ ● Active    │  │                                  │   │  │
│  │ └─────────────┘  │ [====-------] 25%                │   │  │
│  │                  │                     [Edit Limit] │   │  │
│  │                  └──────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Credit Status - Warning State (Tablet)

```
┌───────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Credit Status    [$●] WARNING                            │ │
│  │ ──────────────────────────────────────────────────────   │ │
│  │                                                          │ │
│  │ Credit Limit:      $25,000                               │ │
│  │ Current Balance:   $21,250                               │ │
│  │ Available Credit:  $3,750 (15% remaining)                │ │
│  │                                                          │ │
│  │ [==========--] 85% utilized                              │ │
│  │                                                          │ │
│  │ [!] Approaching credit limit (>80%)       [Edit Limit]   │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Customer List with Credit Column

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Customers                                              [+ New Customer]   │
├───────────────────────────────────────────────────────────────────────────┤
│ [Search_____________________] [Status ▼] [Credit ▼] [Sort: Name ▼]       │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  □  Name              Email              Credit Status          Status    │
│  ─────────────────────────────────────────────────────────────────────── │
│  □  Acme Corp         john@brisbanesolar.com.au      [$●] OK - 25%         ● Active  │
│  □  Sydney Energy Systems   contact@sydneyenergy.com.au    [$●] Warn - 85%       ● Active  │
│  □  Melbourne Power Solutions         info@gamma.co      [$●] EXCEEDED         ● Active  │
│  □  Perth Renewables         sales@delta.com    [$●] Hold             ○ Inact.  │
│  □  Adelaide Battery Corp        hello@epsilon.org  [-] No Limit          ● Active  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Order Creation Dialog - Credit Warning (Tablet)

```
┌───────────────────────────────────────────────────────────────┐
│ New Order for Sydney Energy Systems                            [×]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [!] CREDIT WARNING                                      │  │
│  │ ─────────────────────────────────────────────────────   │  │
│  │                                                         │  │
│  │ Customer: Sydney Energy Systems                               │  │
│  │                                                         │  │
│  │ Current Available Credit:  $3,750.00                    │  │
│  │ This Order Total:          $5,000.00                    │  │
│  │ ─────────────────────────────────────                   │  │
│  │ Amount Over Limit:         $1,250.00                    │  │
│  │                                                         │  │
│  │ [ ] Override credit limit check                         │  │
│  │                                                         │  │
│  │ Override Reason (required when overriding) *            │  │
│  │ [________________________________________]              │  │
│  │                                                         │  │
│  │ Note: Override will be logged for audit purposes        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Order Items                                                  │
│  ───────────────────────────────────────────────────────      │
│  ... (order line items) ...                                   │
│                                                               │
│                          [Cancel]         [Create Order]      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Credit Status Badge (Customer Summary Card - Full)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products     [Bell] [User] │
├──────────┬──────────────────────────────────────────────────────────────────────────┤
│          │                                                                          │
│ Dashboard│  ← Back to Customers                                                     │
│ ──────── │                                                                          │
│ Customers│  Brisbane Solar Co                          [New Order] [Edit] [More ▼]  │
│ Orders   │  john@brisbanesolar.com.au | +61 7 3000 0123 | ABN: 12345678901                          │
│ Quotes   │  ────────────────────────────────────────────────────────────────────    │
│ Products │                                                                          │
│ Settings │  ┌────────────────────────────────────────────────────────────────────┐  │
│          │  │                                                                    │  │
│          │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│          │  │  │ Lifetime     │  │ YTD Revenue  │  │ Credit Status            │ │  │
│          │  │  │ Value        │  │              │  │                          │ │  │
│          │  │  │ $245,000     │  │ $45,200      │  │ [$●] OK                  │ │  │
│          │  │  │ +12% YoY     │  │ +8% vs LY    │  │                          │ │  │
│          │  │  └──────────────┘  └──────────────┘  │ Limit:    $50,000        │ │  │
│          │  │                                      │ Balance:  $12,500        │ │  │
│          │  │  ┌──────────────┐  ┌──────────────┐  │ Available: $37,500       │ │  │
│          │  │  │ Open Orders  │  │ Open Quotes  │  │                          │ │  │
│          │  │  │ 3            │  │ 2            │  │ [========----] 25%       │ │  │
│          │  │  │ $12,500      │  │ $28,000      │  │                          │ │  │
│          │  │  └──────────────┘  └──────────────┘  │           [Edit Limit]   │ │  │
│          │  │                                      └──────────────────────────┘ │  │
│          │  │                                                                    │  │
│          │  └────────────────────────────────────────────────────────────────────┘  │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Credit Status - All States (Desktop)

```
OK STATE:
┌────────────────────────────────┐
│ Credit Status        [$●] OK  │
│ ────────────────────────────  │
│ Limit:     $50,000            │
│ Balance:   $12,500            │
│ Available: $37,500 (75%)      │
│                               │
│ [========------------] 25%    │
│                 [Edit Limit]  │
└────────────────────────────────┘

WARNING STATE (80%+):
┌────────────────────────────────┐
│ Credit Status   [$●] WARNING  │
│ ────────────────────────────  │
│ Limit:     $25,000            │
│ Balance:   $21,250            │
│ Available: $3,750 (15%)       │
│                               │
│ [==================--] 85%    │
│                               │
│ [!] Approaching limit         │
│                 [Edit Limit]  │
└────────────────────────────────┘

EXCEEDED STATE:
┌────────────────────────────────┐
│ Credit Status  [$●] EXCEEDED  │
│ ────────────────────────────  │
│ Limit:     $10,000            │
│ Balance:   $12,500            │
│ Over By:   -$2,500            │
│                               │
│ [===================!!!] 125% │
│                               │
│ [!] Orders require approval   │
│                 [Edit Limit]  │
└────────────────────────────────┘

HOLD STATE:
┌────────────────────────────────┐
│ Credit Status   [lock] HOLD   │
│ ────────────────────────────  │
│                               │
│ Hold Reason:                  │
│ "Pending payment dispute"     │
│                               │
│ On Hold Since: Jan 5, 2026    │
│                               │
│ [!] Orders blocked            │
│                 [Edit Hold]   │
└────────────────────────────────┘

NO LIMIT SET:
┌────────────────────────────────┐
│ Credit Status    [-] No Limit │
│ ────────────────────────────  │
│                               │
│ No credit limit configured    │
│                               │
│ Current Balance: $45,000      │
│                               │
│              [Set Limit]      │
└────────────────────────────────┘
```

### Customer List with Credit Column

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ Customers                                                            [+ New Customer]      │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Search________________________] [Status ▼] [Credit ▼] [Tags ▼] [Health ▼] [Sort: Name ▼] │
│                                                                                            │
│ Credit Filter: [All] [OK] [Warning] [Exceeded] [Hold] [No Limit]                          │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  □  Name              Email              Phone          Credit Status             Status   │
│  ─────────────────────────────────────────────────────────────────────────────────────── │
│  □  Acme Corp         john@brisbanesolar.com.au      555-0123      [$●] OK        25%        ● Active │
│  □  Sydney Energy Systems   contact@sydneyenergy.com.au    555-0124      [$●] Warning   85%        ● Active │
│  □  Melbourne Power Solutions         info@gamma.co      555-0125      [$●] EXCEEDED  125%       ● Active │
│  □  Perth Renewables         sales@delta.com    555-0126      [lock] HOLD               ○ Inact. │
│  □  Adelaide Battery Corp        hello@epsilon.org  555-0127      [-] No Limit              ● Active │
│                                                                                            │
│  < 1 2 3 ... 10 >                                    Showing 1-25 of 234 customers        │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Customer Form - Credit Settings Section (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Edit Customer: Brisbane Solar Co                                              [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  [Basic Info] [Contact] [Credit Settings] [Addresses]                             │
│                                                                                   │
│  ┌─ Credit Settings ────────────────────────────────────────────────────────────┐ │
│  │                                                                               │ │
│  │  Credit Limit                           Current Balance (Unpaid Invoices)    │ │
│  │  [$][_______50,000________]             $12,500.00                           │ │
│  │  Leave blank for unlimited credit        Last updated: Jan 10, 2026          │ │
│  │                                                                               │ │
│  │  ─────────────────────────────────────────────────────────────────────────   │ │
│  │                                                                               │ │
│  │  Credit Hold                                                                  │ │
│  │  [Toggle ○──] Place customer on credit hold                                  │ │
│  │                                                                               │ │
│  │  Hold Reason (required when on hold)                                         │ │
│  │  [________________________________________________]                          │ │
│  │  [________________________________________________]                          │ │
│  │                                                                               │ │
│  │  Note: Placing on hold will prevent new orders                               │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│                                              [Cancel]         [Save Changes]      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Order Creation - Credit Warning Dialog (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ New Order                                                                    [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Customer                                                                         │
│  [Sydney Energy Systems________________________________] [▼]                            │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  [!] CREDIT LIMIT WARNING                                    role="alert"  │  │
│  │  ─────────────────────────────────────────────────────────────────────     │  │
│  │                                                                             │  │
│  │  This order will exceed the customer's available credit.                    │  │
│  │                                                                             │  │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │  │
│  │  │ Credit Limit    $25,000.00 │  │ Order Total      $5,000.00 │          │  │
│  │  │ Current Balance $21,250.00 │  │ Available Credit $3,750.00 │          │  │
│  │  │ Available       $3,750.00  │  │ Amount Over      $1,250.00 │          │  │
│  │  └─────────────────────────────┘  └─────────────────────────────┘          │  │
│  │                                                                             │  │
│  │  [ ] I acknowledge and override the credit limit check                      │  │
│  │                                                                             │  │
│  │  Override Reason (required) *                                               │  │
│  │  [__________________________________________________________________]       │  │
│  │  ↑ aria-describedby links to warning message                                │  │
│  │                                                                             │  │
│  │  Note: This override will be recorded in the audit log                      │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  Order Details                                                                    │
│  ───────────────────────────────────────────────────────────────────────────      │
│                                                                                   │
│  ... (order line items) ...                                                       │
│                                                                                   │
│                                              [Cancel]         [Create Order]      │
│                                              (Create disabled until override)     │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
CREDIT STATUS LOADING:
┌────────────────────────────────┐
│ Credit Status                  │
│ ────────────────────────────   │
│ [......................]       │
│ [......................]       │
│ [......................]       │
│                                │
│ [................]             │
│                                │
└────────────────────────────────┘
↑ Skeleton with shimmer animation

BALANCE CALCULATING:
┌────────────────────────────────┐
│ Credit Status        [$...]    │
│ ────────────────────────────   │
│ Limit:     $50,000             │
│ Balance:   Calculating...      │
│ Available: -                   │
│                                │
└────────────────────────────────┘
```

### Empty States

```
NO CREDIT LIMIT SET:
┌────────────────────────────────┐
│ Credit Status                  │
│ ────────────────────────────   │
│                                │
│      No credit limit set       │
│                                │
│   Set a credit limit to track  │
│   customer credit utilization  │
│                                │
│          [Set Limit]           │
│                                │
└────────────────────────────────┘
```

### Error States

```
FAILED TO LOAD CREDIT:
┌────────────────────────────────┐
│ Credit Status        [!]       │
│ ────────────────────────────   │
│                                │
│   Unable to load credit info   │
│                                │
│          [Retry]               │
│                                │
└────────────────────────────────┘

FAILED TO UPDATE LIMIT:
┌────────────────────────────────┐
│ [!] Failed to update credit    │
│     limit. Please try again.   │
│                                │
│     [Retry]   [Cancel]         │
└────────────────────────────────┘
```

### Success States

```
LIMIT UPDATED:
┌────────────────────────────────┐
│ [ok] Credit limit updated      │
│                                │
│ <- Toast notification (3s)     │
└────────────────────────────────┘

HOLD APPLIED:
┌────────────────────────────────┐
│ [ok] Customer placed on credit │
│      hold                      │
│                                │
│ <- Toast notification (3s)     │
└────────────────────────────────┘
```

---

## Accessibility Notes

### Focus Order

1. **Credit Status Badge**
   - Tab to badge
   - Enter to open details popover/tooltip
   - Tab to "Edit Limit" button within
   - Escape to close popover

2. **Order Creation Warning**
   - Warning announced immediately via role="alert"
   - Tab to override checkbox
   - Tab to reason field (becomes required when checked)
   - Create Order button disabled until override acknowledged

3. **Customer Form Credit Section**
   - Tab through limit input, toggle, reason field
   - Toggle announced with state change
   - Reason field shows/hides based on toggle state

### ARIA Requirements

```html
<!-- Credit Status Badge -->
<div
  role="status"
  aria-label="Credit status: Warning - 85% utilized, $3,750 available of $25,000 limit"
  tabindex="0"
>
  <span aria-hidden="true">[$●]</span>
  WARNING
</div>

<!-- Credit Warning in Order Dialog -->
<div
  role="alert"
  aria-live="assertive"
  aria-label="Credit limit warning: This order will exceed the customer's available credit by $1,250"
>
  ...
</div>

<!-- Override Checkbox -->
<label>
  <input
    type="checkbox"
    aria-describedby="override-note"
  />
  I acknowledge and override the credit limit check
</label>
<p id="override-note">This override will be recorded in the audit log</p>

<!-- Override Reason Field -->
<label for="override-reason">
  Override Reason (required)
</label>
<input
  id="override-reason"
  aria-describedby="credit-warning-message"
  aria-required="true"
/>

<!-- Progress Bar -->
<div
  role="meter"
  aria-valuenow="25"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Credit utilization: 25%"
>
  [========------------]
</div>
```

### Screen Reader Announcements

- Credit status change: "Credit status changed to Warning"
- Limit updated: "Credit limit updated to $50,000"
- Hold applied: "Customer placed on credit hold"
- Warning shown: "Credit limit warning: Order will exceed available credit"
- Override enabled: "Credit override enabled, reason required"

---

## Animation Choreography

### Status Badge Transitions

```
STATUS CHANGE (e.g., OK -> Warning):
- Duration: 300ms
- Easing: ease-in-out
- Badge color: crossfade
- Icon: scale pulse (1 -> 1.2 -> 1)
- Progress bar: smooth width transition

BADGE APPEAR:
- Duration: 200ms
- Easing: ease-out
- Opacity: 0 -> 1
- Transform: scale(0.95) -> scale(1)
```

### Progress Bar

```
INITIAL LOAD:
- Duration: 600ms
- Easing: ease-out
- Width: 0% -> actual%
- Color determined at end

VALUE UPDATE:
- Duration: 400ms
- Easing: ease-in-out
- Width: smooth transition
- Color: crossfade if threshold crossed
```

### Warning Alert

```
APPEAR:
- Duration: 200ms
- Easing: ease-out
- Transform: translateY(-8px) -> translateY(0)
- Opacity: 0 -> 1
- Border: pulse highlight (2 cycles)

DISMISS:
- Duration: 150ms
- Easing: ease-in
- Opacity: 1 -> 0
- Height: collapse to 0
```

### Popover/Tooltip

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: scale(0.95) -> scale(1)
- Opacity: 0 -> 1

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Transform: scale(1) -> scale(0.95)
- Opacity: 1 -> 0
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: Financial dashboards, banking apps (clear status indicators)
- **Color System**:
  - OK: Green (#4CAF50)
  - Warning: Amber/Yellow (#FF9800)
  - Exceeded: Red (#F44336)
  - Hold: Red with lock icon (#F44336)
  - No Limit: Neutral gray
- **Progress Bar**: Rounded, filled from left, color matches status
- **Badge Style**: Compact pill with icon and status text

### Visual Hierarchy

1. Status badge most prominent (color-coded)
2. Available credit highlighted (what matters for decisions)
3. Progress bar provides at-a-glance utilization
4. Action button secondary but accessible

### Reference Files

- `.square-ui-reference/templates/dashboard-1/` - Metrics card layout
- `.reui-reference/components/analytics.tsx` - Progress/gauge styling

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/credit-status-badge.tsx` | Status badge with all states |
| `src/components/domain/customers/customer-summary-card.tsx` | Integration with summary |
| `src/components/domain/customers/customer-form.tsx` | Credit limit edit field |
| `src/components/domain/customers/customer-columns.tsx` | List column with filter |
| `src/components/domain/orders/order-creation-dialog.tsx` | Credit warning integration |
