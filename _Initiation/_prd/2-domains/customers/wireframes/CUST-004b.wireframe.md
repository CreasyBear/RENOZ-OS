# Wireframe: DOM-CUST-004b - Enhanced 360 View: Quick Actions

## Story Reference

- **Story ID**: DOM-CUST-004b
- **Name**: Enhanced 360 View: Quick Actions
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: ActionBar

## Overview

Quick action buttons in customer detail header for common operations: New Order, New Quote, Log Call, Send Email. Includes keyboard shortcuts and responsive layout from dropdown (mobile) to full buttons (desktop).

## UI Patterns (Reference Implementation)

### Action Buttons
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Multiple variants (default, outline, ghost for secondary actions)
  - Icon + label composition for primary actions
  - Loading states with spinner replacement
  - Keyboard shortcut indicators (aria-keyshortcuts)

### Dropdown Menu
- **Pattern**: RE-UI Dropdown Menu
- **Reference**: `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`
- **Features**:
  - Responsive collapse on mobile (all actions in dropdown)
  - Keyboard navigation (arrow keys, Enter/Space)
  - Visual separators for action grouping
  - Menu item icons and descriptions

### Dialog Components
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Modal overlay for New Order/Quote creation
  - Focus trap and return-to-trigger on close
  - Responsive sizing (full-screen on mobile, centered on desktop)
  - Pre-filled customer context

### Form Integration
- **Pattern**: RE-UI Form (TanStack Form)
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form-tanstack.tsx`
- **Features**:
  - Log Call dialog form with validation
  - Date/time pickers for call logging
  - Textarea for notes with character limits
  - Checkbox for follow-up task creation

### Toast Notifications
- **Pattern**: RE-UI Toast/Sonner
- **Reference**: `_reference/.reui-reference/registry/default/ui/sonner.tsx`
- **Features**:
  - Success confirmations (Order created, Call logged)
  - Error handling with retry actions
  - Auto-dismiss with configurable duration
  - Action buttons within toast (View Order)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-004b | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (320px - 640px)

### Quick Actions (Dropdown Menu)

```
┌────────────────────────────────────────┐
│ ← Customers            [...] Actions   │
├────────────────────────────────────────┤
│                                        │
│  Brisbane Solar Co                      │
│  john@brisbanesolar.com.au                         │
│                                        │
└────────────────────────────────────────┘

[...] BUTTON TAPPED - Dropdown Opens:
┌────────────────────────────────────────┐
│ ← Customers            [...] Actions   │
│                        ┌─────────────┐ │
│  Brisbane Solar Co      │ [+] Order   │ │
│  john@brisbanesolar.com.au         │ [Q] Quote   │ │
│                        │ [tel] Call  │ │
│                        │ [env] Email │ │
│                        │─────────────│ │
│                        │ [pen] Edit  │ │
│                        │ [merge]Merge│ │
│                        │ [del] Delete│ │
│                        └─────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### Dropdown Menu - Detailed

```
┌─────────────────────────────────────┐
│ Actions                        [×]  │
├─────────────────────────────────────┤
│                                     │
│  Primary Actions                    │
│  ─────────────────────────────────  │
│  ┌─────────────────────────────┐    │
│  │ [+]  New Order              │    │
│  │      Create order for       │    │
│  │      this customer    [O]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [Q]  New Quote              │    │
│  │      Create quote/          │    │
│  │      opportunity      [Q]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [tel] Log Call              │    │
│  │      Record a phone         │    │
│  │      interaction      [L]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [env] Send Email            │    │
│  │      Open email composer    │    │
│  │                       [E]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Other Actions                      │
│  ─────────────────────────────────  │
│  ┌─────────────────────────────┐    │
│  │ [pen] Edit Customer         │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ [merge] Merge Duplicate     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ [del] Delete Customer       │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Quick Actions (2 Primary + More Dropdown)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Brisbane Solar Co           [+ Order] [+ Quote] [More ▼]     │
│  john@brisbanesolar.com.au | +61 7 3000 0123                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘

[More ▼] CLICKED:
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  Brisbane Solar Co           [+ Order] [+ Quote] [More ▼]     │
│  john@brisbanesolar.com.au | +61 7 3000 0123         ┌──────────────────────┐│
│                                      │ [tel] Log Call    [L]││
│                                      │ [env] Send Email  [E]││
│                                      │─────────────────────││
│                                      │ [pen] Edit           ││
│                                      │ [merge] Merge        ││
│                                      │ [del] Delete         ││
│                                      └──────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Button States (Tablet)

```
DEFAULT:
┌───────────┐ ┌───────────┐ ┌─────────┐
│ + Order   │ │ + Quote   │ │ More ▼  │
└───────────┘ └───────────┘ └─────────┘

HOVER:
┌───────────┐
│ + Order   │ <- slight elevation, background highlight
└───────────┘

LOADING (after click):
┌───────────┐
│ [...]     │ <- spinner, disabled
└───────────┘

KEYBOARD SHORTCUT HINT (on focus):
┌───────────┐
│ + Order   │
│   (O)     │ <- shortcut badge appears below
└───────────┘
```

---

## Desktop Wireframe (1280px+)

### Quick Actions (All Buttons with Icons + Labels)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products     [Bell] [User] │
├──────────┬──────────────────────────────────────────────────────────────────────────┤
│          │                                                                          │
│ Dashboard│  ← Back to Customers                                                     │
│ ──────── │                                                                          │
│ Customers│  ┌──────────────────────────────────────────────────────────────────┐    │
│ Orders   │  │                                                                  │    │
│ Quotes   │  │  Brisbane Solar Co                                                │    │
│ Products │  │  john@brisbanesolar.com.au | +61 7 3000 0123 | ABN: 12345678901                  │    │
│ Settings │  │                                                                  │    │
│          │  │  ┌───────────────────────────────────────────────────────────┐   │    │
│          │  │  │                                                           │   │    │
│          │  │  │ [+ New Order]  [+ New Quote]  [tel Log Call]  [env Email] │   │    │
│          │  │  │     (O)            (Q)            (L)            (E)      │   │    │
│          │  │  │                                                           │   │    │
│          │  │  └───────────────────────────────────────────────────────────┘   │    │
│          │  │                                              [Edit] [More ▼]     │    │
│          │  │                                                                  │    │
│          │  └──────────────────────────────────────────────────────────────────┘    │
│          │                                                                          │
│          │  ────────────────────────────────────────────────────────────────────    │
│          │                                                                          │
│          │  [Overview] [Orders] [Quotes] [Warranties] [Activity] [Contacts] [Addr.] │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Action Bar - Detailed View

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│  Quick Actions (role="toolbar"):                                                  │
│                                                                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │                 │ │                 │ │                 │ │                 │ │
│  │  [+]            │ │  [doc]          │ │  [tel]          │ │  [env]          │ │
│  │  New Order      │ │  New Quote      │ │  Log Call       │ │  Send Email     │ │
│  │                 │ │                 │ │                 │ │                 │ │
│  │  Shortcut: O    │ │  Shortcut: Q    │ │  Shortcut: L    │ │  Shortcut: E    │ │
│  │                 │ │                 │ │                 │ │                 │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                                                   │
│  Secondary Actions:                                           [Edit] [More ▼]    │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts Announcement (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  Keyboard Shortcuts Available                              aria-live="polite" │
│  │  ─────────────────────────────────────────────────────────────────────────  │  │
│  │  O - New Order   Q - New Quote   L - Log Call   E - Send Email              │  │
│  │                                                                             │  │
│  │  Press any shortcut key to activate                                         │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│  ↑ Shown briefly on page focus (sr-only after 3s)                                 │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Dialog Flows

### New Order Dialog (Prefilled with Customer)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ New Order                                                                    [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Customer (pre-filled)                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Brisbane Solar Co                                              [Change]      │  │
│  │ john@brisbanesolar.com.au                                                               │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ... (rest of order creation form) ...                                            │
│                                                                                   │
│                                              [Cancel]         [Create Order]      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Log Call Dialog

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Log Call                                                                     [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Customer: Brisbane Solar Co                                                       │
│                                                                                   │
│  Call Type                                                                        │
│  [● Outbound]  [○ Inbound]                                                       │
│                                                                                   │
│  Call Date & Time                                                                 │
│  [Jan 10, 2026_______] [2:30 PM___]                                              │
│                                                                                   │
│  Duration (minutes)                                                               │
│  [15______]                                                                       │
│                                                                                   │
│  Contact (optional)                                                               │
│  [▼ Select contact_________________]                                             │
│                                                                                   │
│  Notes *                                                                          │
│  [______________________________________________________]                        │
│  [______________________________________________________]                        │
│  [______________________________________________________]                        │
│                                                                                   │
│  Follow-up                                                                        │
│  [ ] Create follow-up task                                                        │
│                                                                                   │
│                                              [Cancel]           [Log Call]        │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Send Email (Opens Default Email Client)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│  Opening email...                                                                 │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  Your default email application should open with:                           │  │
│  │                                                                             │  │
│  │  To: john@brisbanesolar.com.au                                                          │  │
│  │  Subject: (blank)                                                           │  │
│  │                                                                             │  │
│  │  If it didn't open, click below:                                            │  │
│  │                                                                             │  │
│  │  [Open Email Manually]                                                      │  │
│  │                                                                             │  │
│  │  Or copy email: john@brisbanesolar.com.au [Copy]                                        │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  This dialog closes automatically in 3s...                           [Close]      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
BUTTON LOADING (dialog opening):
┌─────────────────┐
│ [...]           │ <- spinner replaces icon
│ New Order       │ <- label stays
│                 │
│ (disabled)      │
└─────────────────┘

ALL BUTTONS DISABLED DURING DIALOG:
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ [...]          │ │ [disabled]     │ │ [disabled]     │ │ [disabled]     │
│ New Order      │ │ New Quote      │ │ Log Call       │ │ Send Email     │
│ (loading)      │ │ (dimmed)       │ │ (dimmed)       │ │ (dimmed)       │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

### Empty States

N/A - Actions are always available for active customers.

### Error States

```
ACTION FAILED:
┌────────────────────────────────────────┐
│ [!] Couldn't open order dialog         │
│                                        │
│ Please try again.    [Retry] [Dismiss] │
│                                        │
└────────────────────────────────────────┘
↑ Toast notification

CUSTOMER INACTIVE:
┌────────────────────────────────────────┐
│ [!] Customer is inactive               │
│                                        │
│ Some actions are disabled for inactive │
│ customers. Reactivate to enable.       │
│                                        │
│           [Reactivate Customer]        │
└────────────────────────────────────────┘
```

### Success States

```
ORDER CREATED:
┌────────────────────────────────────────┐
│ [check] Order ORD-2026-0052 created    │
│                                        │
│              [View Order]              │
└────────────────────────────────────────┘
↑ Toast with action

CALL LOGGED:
┌────────────────────────────────────────┐
│ [check] Call logged successfully       │
└────────────────────────────────────────┘
↑ Toast notification (3s)

EMAIL OPENED:
┌────────────────────────────────────────┐
│ [check] Email composer opened          │
└────────────────────────────────────────┘
↑ Toast notification (2s)
```

---

## Accessibility Notes

### Focus Order

1. **Toolbar Navigation**
   - Tab to toolbar
   - Arrow keys to navigate between buttons
   - Enter/Space to activate

2. **Keyboard Shortcuts**
   - O: New Order
   - Q: New Quote
   - L: Log Call
   - E: Send Email
   - Work globally when on customer page

3. **Dialog Focus**
   - Focus moves to dialog when opened
   - Focus returns to trigger button on close

### ARIA Requirements

```html
<!-- Action Bar -->
<div
  role="toolbar"
  aria-label="Customer quick actions"
  aria-orientation="horizontal"
>
  <button
    aria-label="New Order, keyboard shortcut O"
    aria-keyshortcuts="o"
  >
    <span aria-hidden="true">[+]</span>
    New Order
  </button>

  <button
    aria-label="New Quote, keyboard shortcut Q"
    aria-keyshortcuts="q"
  >
    <span aria-hidden="true">[doc]</span>
    New Quote
  </button>

  <button
    aria-label="Log Call, keyboard shortcut L"
    aria-keyshortcuts="l"
  >
    <span aria-hidden="true">[tel]</span>
    Log Call
  </button>

  <button
    aria-label="Send Email, keyboard shortcut E"
    aria-keyshortcuts="e"
  >
    <span aria-hidden="true">[env]</span>
    Send Email
  </button>
</div>

<!-- Shortcut Announcement (sr-only) -->
<div
  role="status"
  aria-live="polite"
  class="sr-only"
>
  Keyboard shortcuts available: O for Order, Q for Quote, L for Log Call, E for Email
</div>

<!-- Dropdown Menu -->
<div
  role="menu"
  aria-label="More actions"
>
  <button role="menuitem">Log Call</button>
  <button role="menuitem">Send Email</button>
  <div role="separator"></div>
  <button role="menuitem">Edit</button>
  <button role="menuitem">Merge</button>
  <button role="menuitem">Delete</button>
</div>

<!-- Loading State -->
<button
  aria-busy="true"
  aria-label="New Order, loading"
  disabled
>
  <span class="spinner" aria-hidden="true"></span>
  New Order
</button>
```

### Screen Reader Announcements

- Page load: "Customer quick actions toolbar. Press O for Order, Q for Quote, L for Log Call, E for Email."
- Button focus: "New Order button, keyboard shortcut O"
- Shortcut pressed: "Opening new order dialog"
- Dialog open: "New Order dialog opened"
- Dialog close: "Dialog closed, focus returned to New Order button"
- Action success: "Order created successfully"
- Action error: "Failed to create order, please try again"

---

## Animation Choreography

### Button Hover

```
HOVER:
- Duration: 150ms
- Easing: ease-out
- Transform: translateY(-1px)
- Box-shadow: elevation increase
- Background: slight tint
```

### Button Press

```
PRESS (mousedown/active):
- Duration: 100ms
- Transform: scale(0.97)
- Background: darker tint

RELEASE:
- Duration: 150ms
- Return to hover/default state
```

### Button Loading

```
LOADING SPINNER:
- Duration: infinite
- Rotation: 360deg per 1s
- Opacity: button text dims to 0.6

BUTTON DISABLED:
- Duration: 200ms
- Opacity: 0.5
- Cursor: not-allowed
```

### Dropdown Menu

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: scale(0.95) -> scale(1), translateY(-4px) -> translateY(0)
- Opacity: 0 -> 1

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Transform: scale(1) -> scale(0.95)
- Opacity: 1 -> 0
```

### Keyboard Shortcut Indicator

```
APPEAR (on focus):
- Duration: 200ms
- Opacity: 0 -> 1
- Transform: translateY(4px) -> translateY(0)

DISAPPEAR (on blur):
- Duration: 150ms
- Opacity: 1 -> 0
```

### Success/Error Toast

```
ENTER:
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(100%) -> translateY(0)
- Opacity: 0 -> 1

EXIT:
- Duration: 200ms
- Easing: ease-in
- Transform: translateY(0) -> translateY(100%)
- Opacity: 1 -> 0
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: Gmail action bar, Notion quick actions, Linear toolbar
- **Button Style**: Rounded, subtle background, icon + label
- **Spacing**: Comfortable gaps between buttons
- **Shortcuts**: Small badge below or to right of button

### Visual Hierarchy

1. Primary actions (Order, Quote) more prominent
2. Secondary actions (Call, Email) slightly subdued
3. Overflow menu for less common actions
4. Edit/Delete clearly separated

### Color System

- Primary actions: Brand color (blue)
- Secondary actions: Neutral/gray with colored icon
- Destructive (Delete): Red accent

### Reference Files

- Existing `log-call-dialog.tsx` for call logging pattern
- Order creation dialog patterns from orders domain

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/customer-quick-actions.tsx` | Action bar component |
| `src/routes/_authed/customers/$customerId.tsx` | Integration (header) |
| `src/components/domain/customers/log-call-dialog.tsx` | Existing (reuse) |
| `src/components/domain/orders/order-creation-dialog.tsx` | Existing (integrate) |
| `src/components/domain/opportunities/opportunity-dialog.tsx` | For quotes |
