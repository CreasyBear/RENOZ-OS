# Wireframe: DOM-CUST-003b - Merge Customers: UI

## Story Reference

- **Story ID**: DOM-CUST-003b
- **Name**: Merge Customers: UI
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: MultiStepDialog

## Overview

UI for finding and merging duplicate customer records. Multi-step dialog flow: search for duplicate, side-by-side comparison, field selection, preview, and confirmation.

---

## UI Patterns (Reference Implementation)

### Multi-Step Dialog
- **Pattern**: RE-UI Dialog with Stepper
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `stepper.tsx`
- **Features**:
  - 4-step flow: Search, Compare, Select Fields, Confirm
  - Progress indicator at top
  - Mobile: Full-screen bottom sheet
  - Desktop: Centered modal

### Search Input
- **Pattern**: RE-UI Command (autocomplete)
- **Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Search by name, email, ABN
  - Keyboard navigation
  - Recent/suggested results

### Comparison Table
- **Pattern**: Side-by-side data display
- **Reference**: Custom table component
- **Features**:
  - Two-column layout with radio selection
  - Highlight differences
  - Mobile: Stacked cards with swipe

### Radio Group
- **Pattern**: RE-UI Radio Group
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Select which field value to keep
  - Visual indicator for selected source

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customerActivities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-003b | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customer-activities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Step 1: Search for Duplicate (Mobile - Full Screen)

```
┌────────────────────────────────────────┐
│ ← Merge Customer                       │
├────────────────────────────────────────┤
│                                        │
│  Step 1 of 4: Find Duplicate           │
│  [●───────────────]                    │
│                                        │
│  Primary Customer:                     │
│  ┌──────────────────────────────────┐  │
│  │ Brisbane Solar Co                 │  │
│  │ john@brisbanesolar.com.au                    │  │
│  │ ABN: 12345678901                 │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  Search for duplicate to merge:        │
│  [Search by name, email, ABN____] [X]  │
│                                        │
│  Search Results:                       │
│  ┌──────────────────────────────────┐  │
│  │ ○ Acme Corp                      │  │
│  │   john.doe@brisbanesolar.com.au              │  │
│  │   ABN: 12345678901               │  │
│  ├──────────────────────────────────┤  │
│  │ ○ ACME Corporation Pty Ltd       │  │
│  │   admin@brisbanesolar.com.au.au              │  │
│  │   ABN: 12345678901               │  │
│  ├──────────────────────────────────┤  │
│  │ ○ Acme Industries                │  │
│  │   contact@acmeindustries.com     │  │
│  │   ABN: 98765432109               │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Cancel]                    [Next →]  │
│                                        │
└────────────────────────────────────────┘
```

### Step 2: Compare Records (Mobile - Stacked)

```
┌────────────────────────────────────────┐
│ ← Merge Customer                       │
├────────────────────────────────────────┤
│                                        │
│  Step 2 of 4: Compare Records          │
│  [●●──────────────]                    │
│                                        │
│  PRIMARY (Keep):                       │
│  ┌──────────────────────────────────┐  │
│  │ Brisbane Solar Co                 │  │
│  │ ────────────────────────────     │  │
│  │ Name:  Brisbane Solar Co          │  │
│  │ Email: john@brisbanesolar.com.au             │  │
│  │ Phone: +61 7 3000 0123               │  │
│  │ ABN:   12345678901               │  │
│  │ Status: Active                   │  │
│  │ Tier:  Enterprise                │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ↓ Will merge into ↑                   │
│                                        │
│  SECONDARY (Merge & Delete):           │
│  ┌──────────────────────────────────┐  │
│  │ Acme Corp                        │  │
│  │ ────────────────────────────     │  │
│  │ Name:  Acme Corp                 │  │
│  │ Email: john.doe@brisbanesolar.com.au         │  │
│  │ Phone: +61 7 3000 0124               │  │
│  │ ABN:   12345678901               │  │
│  │ Status: Active                   │  │
│  │ Tier:  Standard                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [← Back]                    [Next →]  │
│                                        │
└────────────────────────────────────────┘
```

### Step 3: Select Fields (Mobile)

```
┌────────────────────────────────────────┐
│ ← Merge Customer                       │
├────────────────────────────────────────┤
│                                        │
│  Step 3 of 4: Choose Values            │
│  [●●●─────────────]                    │
│                                        │
│  Select which values to keep:          │
│                                        │
│  Name:                                 │
│  ┌──────────────────────────────────┐  │
│  │ ● Brisbane Solar Co (Primary)     │  │
│  │ ○ Acme Corp (Secondary)          │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Email:                                │
│  ┌──────────────────────────────────┐  │
│  │ ● john@brisbanesolar.com.au (Primary)        │  │
│  │ ○ john.doe@brisbanesolar.com.au (Secondary)  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Phone:                                │
│  ┌──────────────────────────────────┐  │
│  │ ○ +61 7 3000 0123 (Primary)          │  │
│  │ ● +61 7 3000 0124 (Secondary)        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Pricing Tier:                         │
│  ┌──────────────────────────────────┐  │
│  │ ● Enterprise (Primary)           │  │
│  │ ○ Standard (Secondary)           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [← Back]                    [Next →]  │
│                                        │
└────────────────────────────────────────┘
```

### Step 4: Preview & Confirm (Mobile)

```
┌────────────────────────────────────────┐
│ ← Merge Customer                       │
├────────────────────────────────────────┤
│                                        │
│  Step 4 of 4: Confirm Merge            │
│  [●●●●────────────]                    │
│                                        │
│  Merge Preview:                        │
│  ┌──────────────────────────────────┐  │
│  │ Resulting Customer:              │  │
│  │ ────────────────────────────     │  │
│  │ Name:  Brisbane Solar Co          │  │
│  │ Email: john@brisbanesolar.com.au             │  │
│  │ Phone: +61 7 3000 0124 *             │  │
│  │ Tier:  Enterprise                │  │
│  │                                  │  │
│  │ * From secondary record          │  │
│  └──────────────────────────────────┘  │
│                                        │
│  What will happen:                     │
│  ┌──────────────────────────────────┐  │
│  │ • 12 orders transferred          │  │
│  │ • 3 contacts transferred         │  │
│  │ • 45 activities transferred      │  │
│  │ • 2 opportunities transferred    │  │
│  │ • 4 addresses merged             │  │
│  │ • "Acme Corp" will be deleted    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [!] This action cannot be undone      │
│                                        │
│  [← Back]             [Confirm Merge]  │
│                                        │
└────────────────────────────────────────┘
```

### Merge In Progress (Mobile)

```
┌────────────────────────────────────────┐
│ Merging Customers...                   │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │         [===progress===]         │  │
│  │                                  │  │
│  │   [ok] Orders transferred        │  │
│  │   [ok] Contacts transferred      │  │
│  │   [..] Transferring activities   │  │
│  │   [ ] Merging addresses          │  │
│  │   [ ] Cleaning up...             │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Please wait...                        │
│                                        │
└────────────────────────────────────────┘
```

### Merge Success (Mobile)

```
┌────────────────────────────────────────┐
│ Merge Complete                   [×]   │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │           [checkmark]            │  │
│  │                                  │  │
│  │     Customers merged             │  │
│  │     successfully!                │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Summary:                              │
│  • 12 orders transferred               │
│  • 3 contacts transferred              │
│  • 45 activities transferred           │
│  • 2 opportunities transferred         │
│  • 4 addresses merged                  │
│  • 1 duplicate removed                 │
│                                        │
│       [View Merged Customer]           │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Step 1: Search for Duplicate (Tablet)

```
┌───────────────────────────────────────────────────────────────┐
│ Merge Customer                                           [×]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1 of 4: Find Duplicate                                  │
│  [●─────────────────────────────────]                         │
│                                                               │
│  ┌─ Primary Customer ─────────────────────────────────────┐   │
│  │ Brisbane Solar Co                                       │   │
│  │ john@brisbanesolar.com.au | +61 7 3000 0123 | ABN: 12345678901        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Search for duplicate to merge:                               │
│  [Search by name, email, or ABN_______________________] [X]   │
│                                                               │
│  ┌─ Search Results ───────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ○  Acme Corp               john.doe@brisbanesolar.com.au          │   │
│  │     ABN: 12345678901        5 orders, $24,000 LTV      │   │
│  │  ──────────────────────────────────────────────────    │   │
│  │  ○  ACME Corporation        admin@brisbanesolar.com.au.au          │   │
│  │     ABN: 12345678901        2 orders, $8,500 LTV       │   │
│  │  ──────────────────────────────────────────────────    │   │
│  │  ○  Acme Industries         contact@acmeindustries.com │   │
│  │     ABN: 98765432109        0 orders, $0 LTV           │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│                               [Cancel]            [Next →]    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Step 2: Compare Records (Tablet - Side by Side)

```
┌───────────────────────────────────────────────────────────────┐
│ Merge Customer                                           [×]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 2 of 4: Compare Records                                 │
│  [●●────────────────────────────────]                         │
│                                                               │
│  ┌─ PRIMARY (Keep) ────────┬─ SECONDARY (Delete) ──────────┐  │
│  │                         │                                │  │
│  │ Brisbane Solar Co        │ Acme Corp                     │  │
│  │ ───────────────────     │ ───────────────────           │  │
│  │                         │                                │  │
│  │ Name:                   │ Name:                          │  │
│  │ Brisbane Solar Co        │ Acme Corp                     │  │
│  │                         │                                │  │
│  │ Email:                  │ Email:                         │  │
│  │ john@brisbanesolar.com.au           │ john.doe@brisbanesolar.com.au             │  │
│  │                         │                                │  │
│  │ Phone:                  │ Phone:                         │  │
│  │ +61 7 3000 0123             │ +61 7 3000 0124                   │  │
│  │                         │                                │  │
│  │ ABN:                    │ ABN:                           │  │
│  │ 12345678901             │ 12345678901                   │  │
│  │                         │                                │  │
│  │ Status:                 │ Status:                        │  │
│  │ Active                  │ Active                        │  │
│  │                         │                                │  │
│  │ Pricing Tier:           │ Pricing Tier:                  │  │
│  │ Enterprise              │ Standard                      │  │
│  │                         │                                │  │
│  │ Orders: 15              │ Orders: 5                     │  │
│  │ Lifetime: $120,000      │ Lifetime: $24,000             │  │
│  │                         │                                │  │
│  └─────────────────────────┴────────────────────────────────┘  │
│                                                               │
│                            [← Back]               [Next →]    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Step 3: Select Fields (Tablet)

```
┌───────────────────────────────────────────────────────────────┐
│ Merge Customer                                           [×]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 3 of 4: Choose Values                                   │
│  [●●●───────────────────────────────]                         │
│                                                               │
│  Select which value to keep for each field:                   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ Field          │ Primary            │ Secondary       │    │
│  ├───────────────────────────────────────────────────────┤    │
│  │ Name           │ ● Brisbane Solar Co │ ○ Acme Corp     │    │
│  │ Email          │ ● john@brisbanesolar.com.au    │ ○ john.doe@...  │    │
│  │ Phone          │ ○ +61 7 3000 0123      │ ● +61 7 3000 0124   │    │
│  │ Website        │ ○ (empty)          │ ● acme.com      │    │
│  │ Pricing Tier   │ ● Enterprise       │ ○ Standard      │    │
│  │ Notes          │ ○ (empty)          │ ● "Key account" │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  Note: Related records (orders, contacts, activities) will    │
│  automatically transfer to the primary customer.              │
│                                                               │
│                            [← Back]               [Next →]    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Step 4: Preview & Confirm (Tablet)

```
┌───────────────────────────────────────────────────────────────┐
│ Merge Customer                                           [×]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 4 of 4: Confirm Merge                                   │
│  [●●●●──────────────────────────────]                         │
│                                                               │
│  ┌─ Resulting Customer ────────┬─ Transfer Summary ────────┐  │
│  │                             │                            │  │
│  │ Name: Brisbane Solar Co      │  Records to transfer:     │  │
│  │ Email: john@brisbanesolar.com.au        │                            │  │
│  │ Phone: +61 7 3000 0124 *        │  • 12 orders              │  │
│  │ Website: acme.com *         │  • 3 contacts             │  │
│  │ Pricing Tier: Enterprise    │  • 45 activities          │  │
│  │ Notes: "Key account" *      │  • 2 opportunities        │  │
│  │                             │  • 4 addresses (merged)   │  │
│  │ * From secondary record     │                            │  │
│  │                             │  Customer to delete:      │  │
│  │                             │  "Acme Corp"              │  │
│  │                             │                            │  │
│  └─────────────────────────────┴────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [!] Warning: This action cannot be undone               │  │
│  │                                                         │  │
│  │ The secondary customer "Acme Corp" will be permanently  │  │
│  │ deleted and all records transferred to "Acme Corp...".  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│                            [← Back]        [Confirm Merge]    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Step 1: Search for Duplicate (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Merge Customer                                                               [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─ Progress ─────────────────────────────────────────────────────────────────┐  │
│  │  [●] Search  ─────  [○] Compare  ─────  [○] Select  ─────  [○] Confirm    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─ Primary Customer ─────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  Brisbane Solar Co                                                          │  │
│  │  john@brisbanesolar.com.au | +61 7 3000 0123 | ABN: 12345678901                            │  │
│  │  Enterprise Tier | Active | 15 orders | $120,000 lifetime value            │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  Search for duplicate customer to merge into this record:                         │
│                                                                                   │
│  [Search by company name, email, phone, or ABN________________________] [Search] │
│                                                                                   │
│  ┌─ Search Results ───────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │   Select     Company               Contact              Stats              │  │
│  │   ─────────────────────────────────────────────────────────────────────    │  │
│  │   ○          Acme Corp             john.doe@brisbanesolar.com.au    5 orders          │  │
│  │              ABN: 12345678901      +61 7 3000 0124          $24,000 LTV       │  │
│  │                                                                             │  │
│  │   ○          ACME Corporation      admin@brisbanesolar.com.au.au    2 orders          │  │
│  │              ABN: 12345678901      +61 2 9000 0000      $8,500 LTV        │  │
│  │                                                                             │  │
│  │   ○          Acme Industries       contact@acme...      0 orders          │  │
│  │              ABN: 98765432109      +61 7 3000 9999          $0 LTV            │  │
│  │                                                                             │  │
│  │   Tip: Records with matching ABN or similar names are highlighted          │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│                                                  [Cancel]            [Next →]     │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 2: Compare Records (Desktop - Full Side by Side)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Merge Customer                                                               [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─ Progress ─────────────────────────────────────────────────────────────────┐  │
│  │  [ok] Search  ─────  [●] Compare  ─────  [○] Select  ─────  [○] Confirm   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─ PRIMARY (Will be kept) ──────────┬─ SECONDARY (Will be merged & deleted) ─┐  │
│  │                                    │                                        │  │
│  │  Brisbane Solar Co                  │  Acme Corp                             │  │
│  │  ═══════════════════════════════  │  ═══════════════════════════════      │  │
│  │                                    │                                        │  │
│  │  Basic Information                 │  Basic Information                     │  │
│  │  ─────────────────                 │  ─────────────────                     │  │
│  │  Name:     Brisbane Solar Co        │  Name:     Acme Corp                   │  │
│  │  Email:    john@brisbanesolar.com.au           │  Email:    john.doe@brisbanesolar.com.au           │  │
│  │  Phone:    +61 7 3000 0123             │  Phone:    +61 7 3000 0124                 │  │
│  │  Website:  (not set)               │  Website:  acme.com                    │  │
│  │  ABN:      12345678901             │  ABN:      12345678901       [match]  │  │
│  │                                    │                                        │  │
│  │  Business Details                  │  Business Details                      │  │
│  │  ─────────────────                 │  ─────────────────                     │  │
│  │  Status:   Active                  │  Status:   Active                      │  │
│  │  Tier:     Enterprise              │  Tier:     Standard                    │  │
│  │  Credit:   $50,000                 │  Credit:   $10,000                     │  │
│  │                                    │                                        │  │
│  │  Statistics                        │  Statistics                            │  │
│  │  ─────────────────                 │  ─────────────────                     │  │
│  │  Orders:      15                   │  Orders:      5                        │  │
│  │  Lifetime:    $120,000             │  Lifetime:    $24,000                  │  │
│  │  Contacts:    4                    │  Contacts:    2                        │  │
│  │  Activities:  89                   │  Activities:  23                       │  │
│  │                                    │                                        │  │
│  │  Notes                             │  Notes                                 │  │
│  │  ─────────────────                 │  ─────────────────                     │  │
│  │  (empty)                           │  "Key account - handle with care"      │  │
│  │                                    │                                        │  │
│  └────────────────────────────────────┴────────────────────────────────────────┘  │
│                                                                                   │
│  [swap] Swap Primary / Secondary                                                  │
│                                                                                   │
│                                               [← Back]               [Next →]     │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Select Fields (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Merge Customer                                                               [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─ Progress ─────────────────────────────────────────────────────────────────┐  │
│  │  [ok] Search  ─────  [ok] Compare  ─────  [●] Select  ─────  [○] Confirm  │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  Choose which value to keep for each field:                                       │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │   Field           Keep From Primary          Keep From Secondary          │  │
│  │   ────────────────────────────────────────────────────────────────────    │  │
│  │   Name            ● Brisbane Solar Co         ○ Acme Corp                  │  │
│  │   Email           ● john@brisbanesolar.com.au            ○ john.doe@brisbanesolar.com.au          │  │
│  │   Phone           ○ +61 7 3000 0123              ● +61 7 3000 0124                │  │
│  │   Website         ○ (empty)                  ● acme.com                   │  │
│  │   Pricing Tier    ● Enterprise               ○ Standard                   │  │
│  │   Credit Limit    ● $50,000                  ○ $10,000                    │  │
│  │   Notes           ○ (empty)                  ● "Key account..."           │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  Note: Fields with identical values are automatically merged.                     │
│  Related records (orders, contacts, opportunities, activities) will be            │
│  automatically transferred to the primary customer.                               │
│                                                                                   │
│                                               [← Back]               [Next →]     │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 4: Preview & Confirm (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Merge Customer                                                               [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─ Progress ─────────────────────────────────────────────────────────────────┐  │
│  │  [ok] Search  ─────  [ok] Compare  ─────  [ok] Select  ─────  [●] Confirm │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─ Resulting Customer ───────────────────┬─ Transfer Summary ─────────────────┐ │
│  │                                         │                                    │ │
│  │  Brisbane Solar Co                       │  Records that will be transferred: │ │
│  │  ═════════════════════════════════     │                                    │ │
│  │                                         │  ┌────────────────────────────┐   │ │
│  │  Name:      Brisbane Solar Co            │  │ Type          Count       │   │ │
│  │  Email:     john@brisbanesolar.com.au               │  ├────────────────────────────┤   │ │
│  │  Phone:     +61 7 3000 0124 *               │  │ Orders        5            │   │ │
│  │  Website:   acme.com *                  │  │ Contacts      2            │   │ │
│  │  ABN:       12345678901                 │  │ Activities    23           │   │ │
│  │  Tier:      Enterprise                  │  │ Opportunities 1            │   │ │
│  │  Credit:    $50,000                     │  │ Addresses     2            │   │ │
│  │  Notes:     "Key account..." *          │  └────────────────────────────┘   │ │
│  │                                         │                                    │ │
│  │  * Values from secondary record         │  After merge:                      │ │
│  │                                         │  • Total Orders: 20                │ │
│  │  Combined Statistics:                   │  • Total Contacts: 6               │ │
│  │  ────────────────────────               │  • Lifetime Value: $144,000        │ │
│  │  Total Orders:    20                    │                                    │ │
│  │  Total Lifetime:  $144,000              │  Customer to be deleted:           │ │
│  │  Total Contacts:  6                     │  "Acme Corp"                       │ │
│  │  Total Activities: 112                  │                                    │ │
│  │                                         │                                    │ │
│  └─────────────────────────────────────────┴────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  [!] This action cannot be undone                                          │  │
│  │                                                                             │  │
│  │  The secondary customer "Acme Corp" will be permanently deleted.           │  │
│  │  All related records will be transferred to "Brisbane Solar Co".            │  │
│  │  This merge will be recorded in the audit log.                             │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│                                               [← Back]        [Confirm Merge]     │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Merge In Progress (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Merging Customers...                                                              │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│                                                                                   │
│                    ┌──────────────────────────────────────────┐                   │
│                    │                                          │                   │
│                    │    [================--------] 60%        │                   │
│                    │                                          │                   │
│                    │    [ok] Validating records               │                   │
│                    │    [ok] Transferring orders              │                   │
│                    │    [ok] Transferring contacts            │                   │
│                    │    [..] Transferring activities...       │                   │
│                    │    [ ] Transferring opportunities        │                   │
│                    │    [ ] Merging addresses                 │                   │
│                    │    [ ] Updating references               │                   │
│                    │    [ ] Cleaning up duplicate             │                   │
│                    │                                          │                   │
│                    │    Please don't close this battery        │                   │
│                    │                                          │                   │
│                    └──────────────────────────────────────────┘                   │
│                                                                                   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
SEARCH LOADING:
┌────────────────────────────────────────┐
│ [Search: "acme"_______________] [...]  │
│                                        │
│  Searching...                          │
│  ┌──────────────────────────────────┐  │
│  │ [............................] │  │
│  │ [............................] │  │
│  │ [............................] │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘

COMPARISON LOADING:
┌──────────────────┬───────────────────┐
│ Loading...       │ Loading...        │
│ [..............] │ [..............] │
│ [..............] │ [..............] │
│ [..............] │ [..............] │
└──────────────────┴───────────────────┘

MERGE IN PROGRESS:
┌────────────────────────────────────────┐
│ [================--------] 60%         │
│                                        │
│ [ok] Transferring orders               │
│ [..] Transferring activities...        │
│ [ ] Merging addresses                  │
└────────────────────────────────────────┘
```

### Empty States

```
NO SEARCH RESULTS:
┌────────────────────────────────────────┐
│                                        │
│       [illustration: no results]       │
│                                        │
│    No matching customers found         │
│                                        │
│    Try searching by:                   │
│    • Company name                      │
│    • Email address                     │
│    • ABN/Tax ID                        │
│    • Phone number                      │
│                                        │
└────────────────────────────────────────┘

NO SEARCH ENTERED:
┌────────────────────────────────────────┐
│                                        │
│       [illustration: search]           │
│                                        │
│    Search for a duplicate customer     │
│                                        │
│    Enter a name, email, or ABN to      │
│    find potential duplicates           │
│                                        │
└────────────────────────────────────────┘
```

### Error States

```
SEARCH ERROR:
┌────────────────────────────────────────┐
│ [!] Search failed                      │
│                                        │
│ Unable to search customers.            │
│ Please try again.                      │
│                                        │
│ [Retry Search]                         │
└────────────────────────────────────────┘

MERGE FAILED:
┌────────────────────────────────────────┐
│ [!] Merge Failed                       │
│                                        │
│ The merge operation could not be       │
│ completed. No changes were made.       │
│                                        │
│ Error: Database connection timeout     │
│                                        │
│ [Retry Merge]     [Cancel]             │
└────────────────────────────────────────┘

PARTIAL FAILURE (Rare):
┌────────────────────────────────────────┐
│ [!] Merge Partially Completed          │
│                                        │
│ Some records could not be transferred: │
│ • 2 activities failed                  │
│                                        │
│ The primary record has been updated.   │
│ Please manually review the remaining   │
│ items.                                 │
│                                        │
│ [View Details]    [Close]              │
└────────────────────────────────────────┘
```

### Success States

```
MERGE COMPLETE:
┌────────────────────────────────────────┐
│                                        │
│          [checkmark animation]         │
│                                        │
│    Merge completed successfully!       │
│                                        │
│    Summary:                            │
│    • 5 orders transferred              │
│    • 2 contacts transferred            │
│    • 23 activities transferred         │
│    • 1 customer removed                │
│                                        │
│       [View Merged Customer]           │
│                                        │
└────────────────────────────────────────┘
```

---

## Accessibility Notes

### Focus Order

1. **Step 1 (Search)**
   - Search input (auto-focused)
   - Search results (radio group)
   - Cancel button
   - Next button

2. **Step 2 (Compare)**
   - Swap button
   - Back button
   - Next button

3. **Step 3 (Select)**
   - Field radio groups (one per field)
   - Back button
   - Next button

4. **Step 4 (Confirm)**
   - Warning message (read by screen reader)
   - Back button
   - Confirm Merge button (focus here)

### ARIA Requirements

```html
<!-- Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="merge-dialog-title"
  aria-describedby="merge-step-description"
>
  <h2 id="merge-dialog-title">Merge Customer</h2>
  <p id="merge-step-description">Step 1 of 4: Find Duplicate</p>
</div>

<!-- Progress Steps -->
<nav aria-label="Merge progress">
  <ol role="list">
    <li aria-current="step">Search</li>
    <li>Compare</li>
    <li>Select</li>
    <li>Confirm</li>
  </ol>
</nav>

<!-- Search Results -->
<div
  role="radiogroup"
  aria-label="Select duplicate customer"
>
  <div role="radio" aria-checked="false">
    Acme Corp - john.doe@brisbanesolar.com.au
  </div>
</div>

<!-- Comparison Table -->
<table aria-label="Customer comparison">
  <thead>
    <tr>
      <th>Field</th>
      <th id="primary-header">Primary</th>
      <th id="secondary-header">Secondary</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Name</th>
      <td headers="primary-header">Brisbane Solar Co</td>
      <td headers="secondary-header">Acme Corp</td>
    </tr>
  </tbody>
</table>

<!-- Field Selection -->
<fieldset>
  <legend>Phone number</legend>
  <input type="radio" name="phone" id="phone-primary" />
  <label for="phone-primary">+61 7 3000 0123 (Primary)</label>
  <input type="radio" name="phone" id="phone-secondary" />
  <label for="phone-secondary">+61 7 3000 0124 (Secondary)</label>
</fieldset>

<!-- Merge Preview (Live Region) -->
<div
  aria-live="polite"
  aria-label="Merge preview"
>
  ...
</div>

<!-- Warning -->
<div role="alert">
  Warning: This action cannot be undone
</div>

<!-- Progress During Merge -->
<div
  role="progressbar"
  aria-valuenow="60"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Merge progress: 60%"
>
</div>
```

### Screen Reader Announcements

- Step change: "Step 2 of 4: Compare Records"
- Search results: "Found 3 potential duplicates"
- Selection change: "Selected Acme Corp as duplicate"
- Field selection: "Keeping phone number from secondary record"
- Merge starting: "Merging customers, please wait"
- Progress update: "Transferring activities, 60% complete"
- Merge complete: "Merge completed successfully. 5 orders transferred."

---

## Animation Choreography

### Step Transitions

```
STEP FORWARD:
- Duration: 300ms
- Easing: ease-out
- Current step: translateX(0) -> translateX(-100%)
- Next step: translateX(100%) -> translateX(0)
- Opacity: crossfade

STEP BACKWARD:
- Duration: 300ms
- Easing: ease-out
- Current step: translateX(0) -> translateX(100%)
- Previous step: translateX(-100%) -> translateX(0)

PROGRESS BAR:
- Duration: 300ms
- Easing: ease-out
- Width: grows to next step marker
```

### Search Results

```
RESULTS APPEAR:
- Duration: 200ms per item
- Stagger: 50ms between items
- Transform: translateY(8px) -> translateY(0)
- Opacity: 0 -> 1

RESULT SELECTED:
- Duration: 150ms
- Background: highlight flash
- Border: scale pulse
```

### Comparison Columns

```
COLUMNS APPEAR:
- Duration: 400ms
- Easing: ease-out
- Left column: translateX(-20px) -> translateX(0)
- Right column: translateX(20px) -> translateX(0)
- Opacity: 0 -> 1
- Stagger: 100ms

MATCHING FIELDS HIGHLIGHT:
- Duration: 300ms
- Background: subtle glow pulse
```

### Field Selection

```
RADIO SELECTION:
- Duration: 150ms
- Dot: scale(0) -> scale(1)
- Row: subtle background flash
- Selected value: slight glow
```

### Merge Progress

```
PROGRESS BAR:
- Duration: continuous
- Easing: linear
- Width: grows smoothly

STEP COMPLETION:
- Duration: 200ms
- Icon: scale(0) -> scale(1.2) -> scale(1)
- Check color: fade to green
- Row: brief highlight

SUCCESS ANIMATION:
- Duration: 600ms
- Checkmark: draw stroke animation
- Circle: scale(0.8) -> scale(1)
- Confetti: optional subtle particles
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: Data migration wizards, CRM merge tools (Salesforce, HubSpot)
- **Layout**: Clear progression with visual step indicator
- **Comparison**: Side-by-side tables with clear visual hierarchy
- **Selection**: Radio buttons with clear association to columns
- **Warning**: Red/orange alert styling for destructive action

### Visual Hierarchy

1. Progress indicator always visible (top of dialog)
2. Primary customer visually emphasized (left column, stronger border)
3. Matching values highlighted for easy identification
4. Destructive action clearly marked with warning colors

### Reference Files

- `.square-ui-reference/templates/employees/` - Comparison table patterns
- Dialog and multi-step patterns from existing codebase

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/merge-customer-dialog.tsx` | Main multi-step dialog |
| `src/routes/_authed/customers/$customerId.tsx` | Integration (action menu) |
