# Quote Validity Enforcement UI Wireframe
## DOM-PIPE-004b: Expiration Badges, Warnings, and Extension

**Last Updated:** 2026-01-10
**PRD Reference:** pipeline.prd.json
**Story:** DOM-PIPE-004b

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-004b | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD
- **Quote Items**: Battery systems, inverters, installation services

---

## Overview

This wireframe covers the UI for quote validity enforcement:
- Expiration status badges (valid, expiring soon, expired)
- Warning banners and indicators
- Quote validity extension dialog
- Filter integration for expired/expiring quotes

## UI Patterns (Reference Implementation)

### Badge (Validity Status)
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded status badges (green=valid, yellow=expiring, red=expired)
  - Icon integration for status indicators (check, clock, alert)
  - Responsive variants (full/compact/icon-only) for different screen sizes
  - Accessible role="status" or role="alert" for expired quotes

### Alert (Warning Banners)
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Prominent warning banner for expiring/expired quotes
  - Color-coded variants (yellow for warning, red for critical/expired)
  - Action buttons within alert (Extend, Remind, Dismiss)
  - Accessible role="alert" or role="alertdialog" for critical alerts

### Dialog (Extend Validity)
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Modal dialog for extending quote validity
  - Form with date picker and quick select buttons (+7d, +14d, +30d)
  - Reason dropdown and notification checkbox
  - Focus trap and accessible dialog structure

### RadioGroup (Quick Filter Buttons)
- **Pattern**: RE-UI RadioGroup
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Quick filter toggle buttons (All/Valid/Expiring/Expired)
  - Visual active state with count badges
  - Single-select behavior for mutually exclusive filters
  - Accessible keyboard navigation between options

---

## Quote Validity Badge Component

### Badge States
```
VALID (> 7 days remaining):
+----------------+
| [check] Valid  |  <- Green background, check icon
| 25 days        |
+----------------+
  aria-label="Quote valid for 25 more days"


EXPIRING SOON (1-7 days remaining):
+--------------------+
| [clock] Expires    |  <- Yellow/amber background, clock icon
| in 5 days          |
+--------------------+
  aria-label="Quote expiring soon, 5 days remaining"


EXPIRED:
+--------------------+
| [!] EXPIRED        |  <- Red background, alert icon
| 3 days ago         |
+--------------------+
  aria-label="Quote expired 3 days ago"
```

### Badge Responsive Variants
```
DESKTOP (Full):
+--------------------+
| [clock] Expires    |
| in 5 days          |
+--------------------+

TABLET (Compact):
+---------------+
| [clock] 5 days|
+---------------+

MOBILE (Icon Only):
+------+
|[clock]|  <- Tap for tooltip with details
+------+
```

---

## Opportunity Card with Validity

### Card States by Validity

#### Valid Quote
```
+=============================================+
| [=] Acme Corporation                 [30%]  |
|---------------------------------------------|
| $15,000                     Expected:       |
| Weighted: $4,500            Jan 15, 2026    |
|---------------------------------------------|
| +----------------+                          |
| | [check] Valid  |  Quote valid for 25 days |
| +----------------+                          |
|---------------------------------------------|
| [Edit] [Follow-up] [More...]                |
+=============================================+
```

#### Expiring Soon Quote
```
+=============================================+
| [=] Tech Inc                         [60%]  |
|---------------------------------------------|
| $25,000                     Expected:       |
| Weighted: $15,000           Jan 20, 2026    |
|---------------------------------------------|
| +--------------------+                      |
| | [!] Expires in 3d  |  <- Yellow badge     |
| +--------------------+                      |
|---------------------------------------------|
| [Edit] [Extend Quote] [More...]             |
+=============================================+
  Border: yellow/amber (2px)
  "Extend Quote" action promoted
```

#### Expired Quote
```
+=============================================+
| [=] Old Company                      [45%]  |
|---------------------------------------------|
| $8,000                      Expected:       |
| Weighted: $3,600            Dec 28, 2025    |
|---------------------------------------------|
| +--------------------+                      |
| | [!] EXPIRED 5d     |  <- Red badge        |
| +--------------------+                      |
|---------------------------------------------|
| [Extend Quote] [Archive] [More...]          |
+=============================================+
  Border: red (2px)
  Background: subtle red tint
  Primary action is "Extend Quote"
  aria-label includes: "Quote expired 5 days ago"
```

---

## Opportunity Panel Header with Validity

### Desktop Panel Header
```
+================================================================================+
| Opportunity: Tech Inc                                                     [x]  |
+================================================================================+
|                                                                                 |
| +== Header ==================================================================+ |
| |                                                                            | |
| | Tech Inc                              Status: [Quoted v]                    | |
| | $25,000                               Probability: [60%]                    | |
| |                                                                            | |
| | +--------------------------------------------------------------------+     | |
| | | [!] QUOTE EXPIRING                                                 |     | |
| | |                                                                    |     | |
| | | This quote expires in 3 days (January 13, 2026)                    |     | |
| | |                                                                    |     | |
| | | Customer cannot accept after expiration. Consider extending        |     | |
| | | or following up with the customer.                                 |     | |
| | |                                                                    |     | |
| | | [Extend Quote] [Send Reminder Email]                   [Dismiss]   |     | |
| | +--------------------------------------------------------------------+     | |
| |                                                                            | |
| +==========================================================================+ |
|                                                                                 |
| [Overview] [Quote] [Activity] [Documents]                                       |
+================================================================================+
  Warning banner: role="alert"
  Yellow/amber background with border
```

### Expired Quote Warning
```
+================================================================================+
| +== EXPIRED QUOTE WARNING ==================================================+ |
| |                                                                            | |
| | [!] THIS QUOTE HAS EXPIRED                                                 | |
| |                                                                            | |
| | The quote for Tech Inc expired on January 10, 2026 (3 days ago).           | |
| |                                                                            | |
| | The customer can no longer accept this quote at the original terms.        | |
| | You can extend the validity or create a new quote.                         | |
| |                                                                            | |
| | [Extend Quote Validity] [Create New Quote] [Mark as Lost]     [Dismiss]    | |
| |                                                                            | |
| +==========================================================================+ |
  Red background with border
  role="alertdialog" (blocks interaction until acknowledged)
```

---

## Extend Validity Dialog

### Desktop Dialog
```
+================================================+
| Extend Quote Validity                     [x]  |
+================================================+
|                                                |
| Extend the validity period for this quote.     |
|                                                |
| Current Expiration: January 10, 2026 (EXPIRED) |
|                                                |
| New Expiration Date *                          |
| [February 10, 2026            v]               |
|   [+7 days] [+14 days] [+30 days]              |
|                                                |
| Reason for Extension                           |
| [Customer requested more time to review    v]  |
|   - Customer requested more time               |
|   - Internal delays                            |
|   - Pricing discussion ongoing                 |
|   - Other                                      |
|                                                |
| Additional Notes                               |
| [Optional: Add any relevant notes...        ]  |
|                                                |
| +--------------------------------------------+ |
| | [checkbox] Notify customer of extension    | |
| | Send email with updated quote PDF          | |
| +--------------------------------------------+ |
|                                                |
|                 [Cancel] [Extend Quote]        |
+================================================+
  Focus on "New Expiration Date" on open
  aria-labelledby="dialog-title"
```

### Quick Extend Buttons
```
New Expiration Date *
[February 10, 2026            v]

Quick Select:
+----------+ +----------+ +----------+
| +7 days  | | +14 days | | +30 days |
| Jan 17   | | Jan 24   | | Feb 10   |
+----------+ +----------+ +----------+
    ^             ^             ^
    | Button shows resulting date
```

### Mobile Dialog (Bottom Sheet)
```
+================================+
| Extend Quote Validity     [x]  |
+================================+
|                                |
| Current: Jan 10, 2026 EXPIRED  |
|                                |
| New Expiration Date *          |
| [Feb 10, 2026          v]      |
|                                |
| [+7d] [+14d] [+30d]            |
|                                |
| Reason *                       |
| [Select reason...       v]     |
|                                |
| Notes                          |
| [Add notes...           ]      |
|                                |
| [ ] Notify customer            |
|                                |
| [Cancel] [Extend]              |
+================================+
```

---

## Pipeline Filters with Validity

### Desktop Filter Bar
```
+=== FILTER BAR ==============================================================+
| [Search opportunities...___________________] [Clear Filters]                  |
|                                                                              |
| [Sales Rep v] [Customer v] [Stage v] [Expected Close: From ___ To ___]       |
|                                                                              |
| Quick Filters:                                                               |
| +-------------+ +------------------+ +-------------+ +------------------+    |
| | All Quotes  | | [!] Expiring (5) | | [!] Expired | | High Value (>$10K)|   |
| +-------------+ +------------------+ +-------------+ +------------------+    |
|       ^                ^                   ^                                 |
|       | active         | badge count       | no count = none expired         |
|                                                                              |
| Active Filters: [Expiring Soon x]                    Sort: [Expires Soon v]  |
+=============================================================================+
```

### Quick Filter States
```
EXPIRING SOON (has items):
+------------------+
| [!] Expiring (5) |  <- Yellow background, count badge
+------------------+
  aria-label="Show 5 quotes expiring within 7 days"

EXPIRED (has items):
+------------------+
| [!] Expired (2)  |  <- Red background, count badge
+------------------+
  aria-label="Show 2 expired quotes"

NO ITEMS:
+------------------+
| [check] No Expired|  <- Green/muted, check icon
+------------------+
  aria-label="No expired quotes"
```

### Mobile Filter Sheet
```
+================================+
| Filters                   [x]  |
+================================+
|                                |
| Quote Status                   |
| +----------------------------+ |
| | ( ) All Quotes             | |
| | ( ) Valid                  | |
| | (*) Expiring Soon (5)      | |
| | ( ) Expired (2)            | |
| +----------------------------+ |
|                                |
| Stage                          |
| [All Stages            v]      |
|                                |
| Value Range                    |
| [Min: $___] [Max: $___]        |
|                                |
| [Clear All] [Apply Filters]    |
+================================+
```

---

## Countdown Timer Display

### Desktop Countdown (Panel Header)
```
+================================================================+
| Quote Validity                                                 |
| +------------------------------------------------------------+ |
| |                                                            | |
| | Expires in: 2 days, 14 hours, 32 minutes                   | |
| |                                                            | |
| | ████████████████████████░░░░░░  (80% time remaining)       | |
| |                                                            | |
| | [Extend Quote] [Send Reminder]                             | |
| +------------------------------------------------------------+ |
+================================================================+
  Progress bar shows time elapsed
  Updates every minute
  aria-live="polite" for screen reader updates
```

### Compact Countdown (Card)
```
+--------------------+
| [clock] 2d 14h     |  <- Compact format
+--------------------+
  Tooltip: "Quote expires January 13, 2026 at 3:30 PM"
```

---

## Loading States

### Validity Check Loading
```
+----------------+
| [spinner]      |  <- Small spinner in badge
| Checking...    |
+----------------+
  aria-busy="true"
```

### Extension Processing
```
+================================================+
| Extending Quote Validity                       |
+================================================+
|                                                |
|              [spinner]                         |
|                                                |
|    Extending quote validity...                 |
|                                                |
|    - Updating expiration date                  |
|    - Logging activity                          |
|    - Sending notification (if selected)        |
|                                                |
+================================================+
```

---

## Error States

### Extension Failed
```
+================================================+
| [!] Extension Failed                      [x]  |
+================================================+
|                                                |
| Could not extend quote validity.               |
|                                                |
| The quote may have been modified by another    |
| user. Please refresh and try again.            |
|                                                |
|                    [Dismiss] [Retry]           |
+================================================+
  role="alert"
```

### Invalid Date Selection
```
New Expiration Date *
[December 1, 2025            v]
[!] New date must be in the future
    aria-invalid="true"
    aria-describedby="date-error"
```

### Email Notification Failed
```
+================================================+
| Quote Extended (with warning)             [x]  |
+================================================+
|                                                |
| [check] Quote validity extended to Feb 10.     |
|                                                |
| [!] Customer notification email failed         |
|     to send. Please try manually.              |
|                                                |
|                    [Send Manually] [Dismiss]   |
+================================================+
```

---

## Empty States

### No Expiring Quotes
```
+================================================================+
|                                                                 |
| Quick Filters: [...] [Expiring Soon]                            |
|                                                                 |
+================================================================+
|                                                                 |
|                    [illustration]                               |
|                                                                 |
|              All quotes are current                             |
|                                                                 |
|    Great! None of your active quotes are                        |
|    expiring within the next 7 days.                             |
|                                                                 |
|    [View All Quotes]                                            |
|                                                                 |
+================================================================+
```

### No Expired Quotes
```
+================================================================+
|                                                                 |
|              [check illustration]                               |
|                                                                 |
|              No expired quotes                                  |
|                                                                 |
|    All your quotes are valid or have been                       |
|    resolved (won/lost).                                         |
|                                                                 |
+================================================================+
```

---

## Accessibility Specification

### Validity Badge ARIA
```html
<!-- Valid -->
<span role="status"
      aria-label="Quote valid for 25 more days"
      class="badge-valid">
  <CheckIcon aria-hidden="true" />
  <span>Valid - 25 days</span>
</span>

<!-- Expiring Soon -->
<span role="status"
      aria-label="Warning: Quote expiring soon, 3 days remaining"
      class="badge-expiring">
  <ClockIcon aria-hidden="true" />
  <span>Expires in 3 days</span>
</span>

<!-- Expired -->
<span role="alert"
      aria-label="Alert: Quote expired 5 days ago"
      class="badge-expired">
  <AlertIcon aria-hidden="true" />
  <span>EXPIRED - 5 days ago</span>
</span>
```

### Warning Banner ARIA
```html
<div role="alert"
     aria-labelledby="expiry-warning-title"
     aria-describedby="expiry-warning-description"
     class="warning-banner">
  <h3 id="expiry-warning-title">Quote Expiring</h3>
  <p id="expiry-warning-description">
    This quote expires in 3 days. Customer cannot accept after expiration.
  </p>
  <div class="actions">
    <button>Extend Quote</button>
    <button>Send Reminder</button>
    <button aria-label="Dismiss warning">Dismiss</button>
  </div>
</div>
```

### Extend Dialog ARIA
```html
<div role="dialog"
     aria-labelledby="extend-dialog-title"
     aria-describedby="extend-dialog-description"
     aria-modal="true">
  <h2 id="extend-dialog-title">Extend Quote Validity</h2>
  <p id="extend-dialog-description">
    Extend the validity period for this quote.
  </p>
  <!-- Form fields -->
</div>
```

### Keyboard Navigation
```
Validity Badge:
- Tab to focus
- Enter/Space to show details tooltip (mobile)

Warning Banner:
- Tab navigates to action buttons
- Escape dismisses (if dismissible)

Extend Dialog:
- Focus trap active
- Tab navigates fields
- Quick select buttons: Enter/Space to select
- Escape closes dialog
- Enter on primary button submits

Filter Quick Buttons:
- Tab to navigate between buttons
- Enter/Space to toggle filter
- Active state announced
```

### Screen Reader Announcements
```
On quote expiring (when card focused):
  "Warning: Quote for Tech Inc expires in 3 days"

On filter apply (expiring):
  "Showing 5 quotes expiring within 7 days"

On extension success:
  "Quote validity extended to February 10, 2026.
   Customer notification sent."

On entering expired quote:
  "Alert: This quote expired on January 10, 2026.
   Extend validity or create new quote to continue."
```

---

## Color and Icon Reference

### Status Colors
```
VALID:
  Background: green-50
  Border: green-200
  Text: green-700
  Icon: CheckCircle (green-500)

EXPIRING SOON (1-7 days):
  Background: amber-50
  Border: amber-200
  Text: amber-700
  Icon: Clock (amber-500)

EXPIRED:
  Background: red-50
  Border: red-200
  Text: red-700
  Icon: AlertTriangle (red-500)
```

### Icon Usage
```
[check]   = CheckCircle   - Valid status
[clock]   = Clock         - Time-based warning
[!]       = AlertTriangle - Expired/urgent
[bell]    = Bell          - Notification option
[extend]  = ArrowRight    - Extend action
```

---

## Related Wireframes

- [Pipeline Kanban Board](./pipeline-kanban-board.wireframe.md)
- [Quote Builder](./pipeline-quote-builder.wireframe.md)
- [Opportunity Panel](./pipeline-opportunity-panel.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
