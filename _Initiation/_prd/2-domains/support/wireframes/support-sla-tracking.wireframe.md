# Support SLA Tracking Wireframe

**Story IDs:** DOM-SUP-001a, DOM-SUP-001b, DOM-SUP-001c
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## UI Patterns (Reference Implementation)

### SLA Status Badges
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded status indicators (green/orange/red/gray for On Track/At Risk/Breached/Paused)
  - Animated pulse effects for At Risk and Breached states
  - Icon integration with status-specific symbols
  - Compact list view and expanded detail view variants

### SLA Progress Bars
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Real-time countdown visualization with percentage display
  - Color transitions at threshold breakpoints (green → orange → red)
  - Pause state with dashed styling
  - Responsive width animations for elapsed time updates

### SLA Metrics Cards
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Response SLA and Resolution SLA separate card displays
  - Target time, elapsed time, and remaining time metrics
  - Due date/time with timezone support
  - Pause/Resume action buttons contextual to SLA state

### SLA Dashboard Widgets
- **Pattern**: RE-UI Card with Chart
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx` + `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Features**:
  - Open Issues, At Risk, Breached count widgets
  - Average response time trend visualization (sparkline)
  - Click-to-filter navigation from metric widgets
  - Real-time updates with aria-live regions

### SLA Filter Dropdown
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - SLA status filter (All/On Track/At Risk/Breached/Paused)
  - Multi-select support for combined filtering
  - Filter count badges showing active filters
  - Clear filters action for quick reset

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `slaConfigs` | NOT CREATED |
| **Server Functions Required** | SLA calculation, pause/resume functions | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-001a, DOM-SUP-001b | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Support Types**: Battery performance issues, inverter errors, installation problems, connectivity issues
- **Priority**: low, normal, high, urgent
- **SLA Tiers**: Priority (4h response), Standard (24h response), Basic (48h response)

---

## Overview

SLA (Service Level Agreement) tracking provides visual indicators for response and resolution times on support issues. This wireframe covers:
- SLA breach warning badges (at-risk, breached)
- SLA status section on issue detail
- SLA pause/resume on customer wait
- SLA dashboard widgets and metrics

---

## Desktop View (1280px+)

### Issue List with SLA Indicators

```
+================================================================================+
| HEADER BAR                                                      [bell] [Joel v] |
+================================================================================+
|                                                                                 |
| Support Issues                                            [Export v] [+ New]    |
| Track and resolve customer issues                                               |
|                                                                                 |
+=== ISSUE METRICS (aria-live="polite") =========================================+
| +------------------+ +------------------+ +------------------+ +---------------+ |
| | Open Issues      | | SLA At Risk      | | SLA Breached     | | Avg Response  | |
| | 47               | | 8                | | 3                | | 2.4 hrs       | |
| | [---icon---]     | | [!] warning      | | [X] critical     | | [sparkline]   | |
| +------------------+ +------------------+ +------------------+ +---------------+ |
+=================================================================================+
|                                                                                 |
+=== FILTER BAR (role="search") =================================================+
| [Search issues...________________________] [Clear Filters]                      |
|                                                                                 |
| [Type v] [Status v] [Priority v] [Assignee v] [SLA Status v]     [View: List v] |
|                                                                                 |
| Active Filters: [SLA: At Risk x] [Type: Claim x]               Sort: [Due v]   |
+=================================================================================+
|                                                                                 |
| +-------------------------------------------------------------------------------+
| | [ ] | ID        | Subject           | Customer    | SLA Status    | Assignee |
| +-----+-----------+-------------------+-------------+---------------+----------+
| | [ ] | ISS-1234  | Battery not charging | Brisbane Solar | [!] AT RISK   | John D.  |
| |     |           | to full capacity     |                | Resp: 1h left |          |
| +-----+-----------+----------------------+----------------+---------------+----------+
| | [ ] | ISS-1235  | Inverter fault E-12  | Sydney Energy  | [X] BREACHED  | Sarah K. |
| |     |           |                      |                | Resp: -2h     |          |
| +-----+-----------+----------------------+----------------+---------------+----------+
| | [ ] | ISS-1236  | BMS communication    | Melbourne Grid | [*] ON TRACK  | Mike J.  |
| |     |           | timeout              |                | Resp: 4h left |          |
| +-----+-----------+----------------------+----------------+---------------+----------+
| | [ ] | ISS-1237  | Installation defect  | Perth Solar Co | [||] PAUSED   | --       |
| |     |           | on-site inspection   |                | Waiting: 2d   |          |
| +-----+-----------+----------------------+----------------+---------------+----------+
| | [ ] | ISS-1238  | Performance          | Adelaide Power | [*] ON TRACK  | John D.  |
| |     |           | degradation          |                | Resol: 12h    |          |
| +-------------------------------------------------------------------------------+
|                                                                                 |
|  Showing 1-10 of 47 issues                              < 1 [2] 3 4 ... 5 >    |
+=================================================================================+

LEGEND:
[*] ON TRACK  = Green badge - SLA within thresholds
[!] AT RISK   = Yellow/Orange badge - < 25% time remaining
[X] BREACHED  = Red badge - SLA time exceeded
[||] PAUSED   = Gray badge - Waiting on customer
```

### Issue Detail - SLA Status Section

```
+================================================================================+
| < Back to Issues                                                                |
+================================================================================+
| +----------------------------------------------------------------------------+ |
| | [!] ISS-1234: Battery not charging to full capacity                        | |
| |     Customer: Brisbane Solar Co |  Type: Hardware fault  |  Priority: High | |
| |     Assignee: John Doe          |  Status: Open |  Created: Jan 9, 2:30 PM | |
| |                                                                            | |
| |     [ Edit Issue ]  [ Assign ]  [ Change Status v ]  [ Actions v ]         | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
|                                                                                 |
| +-- SLA STATUS (role="region" aria-label="SLA Status") -----------------------+|
| |                                                                              ||
| |  +== RESPONSE SLA ==================+  +== RESOLUTION SLA ===============+ ||
| |  |                                  |  |                                 | ||
| |  |  Status: [!] AT RISK             |  |  Status: [*] ON TRACK           | ||
| |  |  ================================|  |  =============================== | ||
| |  |  Target: 4 hours                 |  |  Target: 24 hours               | ||
| |  |  Elapsed: 3h 15m                 |  |  Elapsed: 3h 15m                | ||
| |  |  Remaining: 45 minutes           |  |  Remaining: 20h 45m             | ||
| |  |  ================================|  |  =============================== | ||
| |  |                                  |  |                                 | ||
| |  |  [=================...] 81%      |  |  [===.................] 14%     | ||
| |  |                                  |  |                                 | ||
| |  |  Due: Jan 9, 6:30 PM            |  |  Due: Jan 10, 2:30 PM          | ||
| |  |                                  |  |                                 | ||
| |  +----------------------------------+  +---------------------------------+ ||
| |                                                                              ||
| |  SLA Policy: Standard Support (4h response / 24h resolution)                 ||
| |                                                                              ||
| |  [ Pause SLA - Waiting on Customer ]                                         ||
| |                                                                              ||
| +------------------------------------------------------------------------------+|
|                                                                                 |
| [Overview] [Activity] [Attachments] [Related]                                   |
| =========                                                                       |
|                                                                                 |
| +-- ISSUE DETAILS -------------------------------------------------------------+|
| |                                                                              ||
| |  Description:                                                                ||
| |  Customer reports battery only charging to 85% capacity. BMS showing        ||
| |  normal operation. Firmware version 2.4.1. Remote diagnostics requested.    ||
| |                                                                              ||
| |  Linked Order: ORD-5678 - 50kWh Battery System                               ||
| |  Linked Products: SKU-BAT-001 - LiFePO4 Battery Pack 50kWh                  ||
| |                                                                              ||
| +------------------------------------------------------------------------------+|
|                                                                                 |
+=================================================================================+
```

### SLA Pause Dialog

```
+========================================================+
| Pause SLA - Waiting on Customer                   [X]  |
+========================================================+
|                                                        |
|  Pausing the SLA will stop the countdown while you     |
|  wait for the customer to respond or provide           |
|  additional information.                               |
|                                                        |
|  Pause Reason *                                        |
|  +--------------------------------------------------+  |
|  | Waiting for customer to provide photos           |  |
|  +--------------------------------------------------+  |
|                                                        |
|  What are you waiting for? *                           |
|  +--------------------------------------------------+  |
|  | ( ) Customer response                            |  |
|  | (o) Additional information                       |  |
|  | ( ) Customer approval                            |  |
|  | ( ) Other                                        |  |
|  +--------------------------------------------------+  |
|                                                        |
|  Note: Customer will be notified that we're waiting    |
|  for their response.                                   |
|                                                        |
|                           ( Cancel )  [ Pause SLA ]    |
+========================================================+
  Focus trap active
  aria-labelledby="dialog-title"
```

### SLA Paused State Display

```
+-- SLA STATUS (PAUSED) --------------------------------------------------------+
|                                                                               |
|  +== RESPONSE SLA ==================+  +== RESOLUTION SLA ===============+   |
|  |                                  |  |                                 |   |
|  |  Status: [||] PAUSED             |  |  Status: [||] PAUSED            |   |
|  |  ================================|  |  ================================|   |
|  |  [||||||||||||||||||||||||||||]  |  |  [||||||||||||||||||||||||||||] |   |
|  |                                  |  |                                 |   |
|  |  Paused: Jan 10, 9:00 AM         |  |  Paused: Jan 10, 9:00 AM        |   |
|  |  Duration: 4h 30m                |  |  Duration: 4h 30m               |   |
|  |  Reason: Waiting on customer     |  |  Reason: Waiting on customer    |   |
|  |                                  |  |                                 |   |
|  +----------------------------------+  +---------------------------------+   |
|                                                                               |
|  Waiting on: Additional information from customer                             |
|                                                                               |
|  [ Resume SLA ]  <- Primary action when paused                                |
|                                                                               |
+-------------------------------------------------------------------------------+
```

---

## Tablet View (768px)

```
+================================================================+
| Support Issues                              [+]  [Filter v]     |
+================================================================+
|                                                                 |
| +----------+ +----------+ +----------+ +----------+             |
| | Open     | | At Risk  | | Breached | | Avg Resp |             |
| | 47       | | 8        | | 3        | | 2.4h     |             |
| +----------+ +----------+ +----------+ +----------+             |
|                                                                 |
| [Search..._______________]  [SLA: All v]                        |
|                                                                 |
| +-------------------------------------------------------------+ |
| | ISS-1234 - Defective product              [!] AT RISK       | |
| | Acme Corp  |  John D.  |  Claim           Resp: 1h left     | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | ISS-1235 - Return request                 [X] BREACHED      | |
| | Beta Inc   |  Sarah K. |  Return          Resp: -2h         | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | ISS-1236 - Question about order           [*] ON TRACK      | |
| | Tech Ltd   |  Mike J.  |  Question        Resp: 4h left     | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | ISS-1237 - Installation issue             [||] PAUSED       | |
| | Global Co  |  --       |  Other           Waiting: 2d       | |
| +-------------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

### Issue Detail SLA Section (Tablet)

```
+================================================================+
| < Back  |  ISS-1234                           [Edit] [More v]  |
+================================================================+
|                                                                 |
|  Defective product - handle replacement                        |
|  Customer: Acme Corp  |  Type: Claim  |  Priority: High        |
|                                                                 |
+================================================================+
|                                                                 |
|  +-- SLA STATUS -----------------------------------------------+|
|  |                                                             ||
|  |  Response SLA              Resolution SLA                   ||
|  |  +-------------------+     +---------------------+          ||
|  |  | [!] AT RISK       |     | [*] ON TRACK        |          ||
|  |  | 45m remaining     |     | 20h 45m remaining   |          ||
|  |  | [=========..]     |     | [===............]   |          ||
|  |  +-------------------+     +---------------------+          ||
|  |                                                             ||
|  |  [ Pause SLA - Waiting on Customer ]                        ||
|  +-------------------------------------------------------------+|
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### Issue List with SLA Badges

```
+================================+
| Issues             [+] [=]     |
+================================+
|                                |
| Open: 47  |  At Risk: 8        |
|                                |
| [Search...________] [Filter v] |
|                                |
+================================+
|                                |
| +----------------------------+ |
| | ISS-1234                   | |
| | Defective product          | |
| | Acme Corp  -  John D.      | |
| | +------------------------+ | |
| | | [!] RESP: 45m left     | | |
| | | [*] RESOL: 20h left    | | |
| | +------------------------+ | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ISS-1235                   | |
| | Return request             | |
| | Beta Inc  -  Sarah K.      | |
| | +------------------------+ | |
| | | [X] RESP: BREACHED -2h | | |
| | | [!] RESOL: 2h left     | | |
| | +------------------------+ | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ISS-1237                   | |
| | Installation issue         | |
| | Global Co  -  Unassigned   | |
| | +------------------------+ | |
| | | [||] PAUSED - 2 days   | | |
| | +------------------------+ | |
| +----------------------------+ |
|                                |
+================================+
| [+] <- FAB                     |
+================================+
```

### Issue Detail SLA Section (Mobile)

```
+================================+
| < Back          ISS-1234       |
+================================+
|                                |
| Defective product              |
| handle replacement needed      |
|                                |
| Acme Corp  |  Claim  |  High   |
| John Doe   |  Open             |
|                                |
| [Edit] [Status v] [More v]     |
|                                |
+================================+
|                                |
| SLA STATUS                     |
| =============================== |
|                                |
| +----------------------------+ |
| | RESPONSE                   | |
| | [!] AT RISK                | |
| |                            | |
| | Target: 4 hours            | |
| | Elapsed: 3h 15m            | |
| | Remaining: 45 min          | |
| |                            | |
| | [============....] 81%     | |
| |                            | |
| | Due: Today, 6:30 PM        | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | RESOLUTION                 | |
| | [*] ON TRACK               | |
| |                            | |
| | Target: 24 hours           | |
| | Elapsed: 3h 15m            | |
| | Remaining: 20h 45m         | |
| |                            | |
| | [====................] 14% | |
| |                            | |
| | Due: Tomorrow, 2:30 PM     | |
| +----------------------------+ |
|                                |
| Policy: Standard Support       |
|                                |
| +----------------------------+ |
| |                            | |
| | [ Pause - Waiting on Cust] | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### Pause SLA Bottom Sheet (Mobile)

```
+================================+
| ============================== | <- Drag handle
|                                |
| PAUSE SLA                 [X]  |
| =============================== |
|                                |
| Stop the SLA countdown while   |
| waiting for customer response. |
|                                |
| Pause Reason *                 |
| +----------------------------+ |
| | Waiting for photos...      | |
| +----------------------------+ |
|                                |
| What are you waiting for? *    |
| +----------------------------+ |
| | ( ) Customer response      | |
| | (o) Additional info        | |
| | ( ) Customer approval      | |
| | ( ) Other                  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| |                            | |
| |      [ Pause SLA ]         | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

---

## SLA Badge States

### Badge Visual Hierarchy

```
+-- ON TRACK (Green) -------------------------+
|  [*] ON TRACK                               |
|  Background: green-50                       |
|  Border: green-500                          |
|  Icon: checkmark-circle (green-600)         |
|  Text: "X hours/minutes remaining"          |
+---------------------------------------------+

+-- AT RISK (Orange/Yellow) ------------------+
|  [!] AT RISK                                |
|  Background: orange-50                      |
|  Border: orange-500                         |
|  Icon: exclamation-triangle (orange-600)    |
|  Text: "X minutes remaining"                |
|  Animation: subtle pulse                    |
+---------------------------------------------+

+-- BREACHED (Red) ---------------------------+
|  [X] BREACHED                               |
|  Background: red-50                         |
|  Border: red-500                            |
|  Icon: x-circle (red-600)                   |
|  Text: "-X hours overdue"                   |
|  Animation: attention-grabbing glow         |
+---------------------------------------------+

+-- PAUSED (Gray) ----------------------------+
|  [||] PAUSED                                |
|  Background: gray-100                       |
|  Border: gray-400 (dashed)                  |
|  Icon: pause-circle (gray-500)              |
|  Text: "Waiting: X days/hours"              |
|  Animation: none                            |
+---------------------------------------------+

+-- NO SLA (Muted) ---------------------------+
|  [--] No SLA                                |
|  Background: transparent                    |
|  Border: gray-200                           |
|  Text: gray-400                             |
+---------------------------------------------+
```

---

## Loading States

### Issue List Loading

```
+-------------------------------------------------------------------------------+
| [ ] | [========] | [================] | [==========] | [==========] | [=====] |
+-----+-----------+-------------------+-------------+---------------+----------+
| [ ] | [======]   | [==============]   | [========]   | [shimmer~~~] | [=====] |
| [ ] | [=======]  | [===============]  | [=========]  | [shimmer~~~] | [====]  |
| [ ] | [======]   | [================] | [==========] | [shimmer~~~] | [=====] |
+-------------------------------------------------------------------------------+
  SLA Status column shows shimmer animation
```

### SLA Status Section Loading

```
+-- SLA STATUS (Loading) -----------------------------------------------+
|                                                                       |
|  +== RESPONSE SLA ==================+  +== RESOLUTION SLA ==========+|
|  |                                  |  |                            ||
|  |  Status: [shimmer~~~~~~~~~~~]    |  |  Status: [shimmer~~~~~~~]  ||
|  |  [shimmer~~~~~~~~~~~~~~~~~~~]    |  |  [shimmer~~~~~~~~~~~~~~~~~]||
|  |  [shimmer~~~~~~~~~~~~~~~]        |  |  [shimmer~~~~~~~~~~~~~~~]  ||
|  |                                  |  |                            ||
|  +----------------------------------+  +----------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Empty States

### No Issues with SLA

```
+===============================================================+
|                                                               |
|                    [illustration]                             |
|                                                               |
|           No issues with SLA tracking                         |
|                                                               |
|    SLA policies help ensure timely responses                  |
|    and resolutions for your support issues.                   |
|                                                               |
|    [ Configure SLA Policies ]                                 |
|                                                               |
+===============================================================+
```

### All SLAs Met

```
+===============================================================+
|                                                               |
|                    [success icon]                             |
|                                                               |
|              All SLAs are on track!                           |
|                                                               |
|    No issues are at risk or breached.                         |
|    Great work keeping response times low.                     |
|                                                               |
+===============================================================+
```

---

## Error States

### Failed to Load SLA Data

```
+-- SLA STATUS (Error) -------------------------------------------------+
|                                                                       |
|  [!] Unable to load SLA information                                   |
|                                                                       |
|  There was a problem calculating SLA status.                          |
|  Issue timeline may not be accurate.                                  |
|                                                                       |
|  [Retry]                                                              |
|                                                                       |
+-----------------------------------------------------------------------+
  role="alert"
  aria-live="polite"
```

### Failed to Pause SLA

```
+========================================================+
| [!] Pause Failed                                        |
|                                                        |
| Could not pause the SLA for this issue.                |
| Please try again or contact support.                   |
|                                                        |
| [Dismiss]  [Try Again]                                 |
+========================================================+
  Toast notification
  aria-live="assertive"
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// SLA Badge
<div
  role="status"
  aria-label="Response SLA: At risk, 45 minutes remaining"
  className="sla-badge sla-at-risk"
>
  <Icon name="exclamation-triangle" aria-hidden="true" />
  <span>AT RISK</span>
</div>

// SLA Progress Bar
<div
  role="progressbar"
  aria-valuenow={81}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Response SLA: 81% of time elapsed, 45 minutes remaining"
>
  <div className="progress-fill" style={{ width: '81%' }} />
</div>

// SLA Status Region
<section
  role="region"
  aria-label="SLA Status for issue ISS-1234"
>
  <!-- SLA cards -->
</section>

// Live Updates
<div aria-live="polite" className="sr-only">
  SLA status updated: Response time now at risk with 30 minutes remaining
</div>
```

### Keyboard Navigation

```
Tab Order:
1. Back button
2. Issue action buttons (Edit, Assign, Status)
3. SLA section (focusable region)
4. Response SLA card (focusable, shows details on focus)
5. Resolution SLA card
6. Pause/Resume SLA button
7. Tab navigation (Overview, Activity, etc.)
8. Issue details content

Actions:
- Enter on SLA card: Toggle expanded view
- Enter on Pause button: Opens pause dialog
- Escape: Close any open dialogs
```

### Screen Reader Announcements

```
On page load:
  "Issue ISS-1234, Defective product. Response SLA at risk,
   45 minutes remaining. Resolution SLA on track, 20 hours remaining."

On SLA status change:
  "Alert: Response SLA is now breached. Issue has exceeded the
   4-hour response time target."

On pause:
  "SLA paused. Waiting on customer for additional information."

On resume:
  "SLA resumed. Response time remaining: 45 minutes.
   Resolution time remaining: 16 hours."
```

---

## Animation Choreography

### SLA Status Transition

```
State Change Animation (at-risk -> breached):

FRAME 1 (0ms):
  +--------------------+
  | [!] AT RISK        |
  | orange background  |
  +--------------------+

FRAME 2 (150ms):
  +--------------------+
  | [!] -> [X]         |
  | scale: 1.1         |
  | background: fade   |
  +--------------------+

FRAME 3 (300ms):
  +--------------------+
  | [X] BREACHED       |
  | red background     |
  | glow animation     |
  +--------------------+

Duration: 300ms
Easing: ease-out
Haptic: (mobile) medium warning
```

### Pause/Resume Animation

```
Pause Animation:

FRAME 1: Active SLA cards
  Progress bars animating

FRAME 2 (0-200ms):
  Progress bars freeze
  Color desaturates
  Border becomes dashed

FRAME 3 (200-350ms):
  Pause icon fades in
  "PAUSED" text appears

Resume Animation (reverse):
  350ms total
  Progress bars resume from paused position
  Color re-saturates
```

### Progress Bar Updates

```
Progress Bar Animation:

When SLA time elapses:
- Smooth width transition (200ms)
- Color transitions at thresholds:
  - 0-74%: green fill
  - 75-89%: orange fill (at-risk)
  - 90-100%: red fill (critical)
  - >100%: red with pulse (breached)

CSS:
  transition: width 200ms ease-out, background-color 150ms ease;
```

---

## Component Props Interface

```typescript
// SLA Status Badge
interface SLABadgeProps {
  status: 'on_track' | 'at_risk' | 'breached' | 'paused' | 'no_sla';
  type: 'response' | 'resolution';
  remaining?: string; // "45 minutes", "-2 hours"
  pausedDuration?: string; // "2 days"
  compact?: boolean; // For list view
  className?: string;
}

// SLA Status Card
interface SLAStatusCardProps {
  type: 'response' | 'resolution';
  status: 'on_track' | 'at_risk' | 'breached' | 'paused';
  target: number; // hours
  elapsed: number; // minutes
  remaining: number; // minutes (negative if breached)
  dueDate: Date;
  pausedAt?: Date;
  pausedDuration?: number; // minutes
  pauseReason?: string;
  onPause?: () => void;
  onResume?: () => void;
}

// SLA Status Section
interface SLAStatusSectionProps {
  issueId: string;
  policy?: {
    id: string;
    name: string;
    responseHours: number;
    resolutionHours: number;
  };
  responseSla: SLAStatusCardProps;
  resolutionSla: SLAStatusCardProps;
  onPauseSla: (reason: string, waitingFor: string) => Promise<void>;
  onResumeSla: () => Promise<void>;
  isLoading?: boolean;
  error?: Error;
}

// Pause SLA Dialog
interface PauseSLADialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPause: (reason: string, waitingFor: WaitingForType) => Promise<void>;
  isSubmitting?: boolean;
}

type WaitingForType =
  | 'customer_response'
  | 'additional_information'
  | 'customer_approval'
  | 'other';

// Issue List SLA Filter
interface SLAFilterProps {
  value: SLAFilterValue;
  onChange: (value: SLAFilterValue) => void;
}

type SLAFilterValue =
  | 'all'
  | 'on_track'
  | 'at_risk'
  | 'breached'
  | 'paused';

// SLA Metrics Widget
interface SLAMetricsWidgetProps {
  openIssues: number;
  atRiskCount: number;
  breachedCount: number;
  avgResponseTime: number; // minutes
  avgResolutionTime: number; // minutes
  isLoading?: boolean;
  onAtRiskClick?: () => void;
  onBreachedClick?: () => void;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| SLA badge render | < 50ms | Per badge |
| SLA section load | < 500ms | Full section with calculations |
| Pause/Resume action | < 1s | From click to confirmation |
| Live update frequency | 60s | Background refresh |
| SLA list filter | < 300ms | Filter change to display |

---

## Related Wireframes

- [Support Dashboard](./support-dashboard.wireframe.md) - SLA metrics widgets
- [Issue List](./support-issue-list.wireframe.md) - Full issue list layout
- [Issue Detail](./support-issue-detail.wireframe.md) - Complete issue view

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
