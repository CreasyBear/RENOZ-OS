# Wireframe: DOM-COMMS-004c - Call Scheduling UI

## Story Reference

- **Story ID**: DOM-COMMS-004c
- **Name**: Add Call Scheduling UI
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: FormDialog with UpcomingCallsWidget

## Overview

UI for scheduling calls from customer detail pages, dashboard widget for upcoming calls, snooze/reschedule functionality, and call outcome logging after completion.

## UI Patterns (Reference Implementation)

### ScheduleCallDialog
- **Pattern**: RE-UI Dialog + Form + DateTimePicker
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/form.tsx`, `_reference/.reui-reference/registry/default/ui/calendar.tsx`
- **Features**:
  - Split layout: Customer info sidebar with recent call history
  - Date/time pickers with duration dropdown (15, 30, 45, 60 min)
  - Assignee selector with avatar display
  - Reminder preset options (5, 15, 30 minutes before)

### UpcomingCallsWidget
- **Pattern**: RE-UI Card + ScrollArea + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/scroll-area.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Grouped by date headers (TODAY, TOMORROW, THIS WEEK)
  - Time-based badges for urgent calls (within 15 min)
  - Quick action buttons: Start Call, Snooze, Log Outcome
  - Compact vs expanded modes for dashboard/sidebar

### SnoozeMenu
- **Pattern**: RE-UI DropdownMenu + Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`, `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Preset snooze durations (15 min, 30 min, 1 hour, 2 hours)
  - "Tomorrow at same time" quick option
  - Custom datetime picker for flexible rescheduling
  - Slide-up sheet on mobile, dropdown on desktop

### CallOutcomeDialog
- **Pattern**: RE-UI Dialog + RadioGroup + Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/radio-group.tsx`, `_reference/.reui-reference/registry/default/ui/textarea.tsx`
- **Features**:
  - Outcome selection with visual icons (Completed, No Answer, Rescheduled, Cancelled)
  - Duration dropdown conditional on "Completed" outcome
  - Notes textarea with rich formatting
  - Follow-up call scheduling checkbox with inline datetime picker

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Enhanced `notifications` with call scheduling fields | EXISTS (needs enhancement) |
| **Server Functions Required** | `scheduleCall`, `getScheduledCalls`, `updateScheduledCall`, `cancelCall`, `snoozeCall`, `logCallOutcome`, `getCallHistory` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-COMMS-004a, DOM-COMMS-004b | PENDING |

### Existing Schema Available
- `notifications` in `renoz-v2/lib/schema/notifications.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- Call scheduling for battery quote follow-ups, installation confirmations, warranty checks
- Snooze/reschedule accommodates Australian business hours (AEST/AEDT)
- Call outcome logging tracks battery sales pipeline progress

---

## Mobile Wireframe (375px)

### Customer Detail - Schedule Call Button

```
+=========================================+
| < Customers                             |
+-----------------------------------------+
|                                         |
|  Acme Corporation                       |
|  [Active]                               |
|  ─────────────────────────────────────  |
|                                         |
|  john@acme.com  |  +1 555-0123          |
|                                         |
|  +---------------+  +---------------+   |
|  | [phone]       |  | [email]       |   |
|  | Schedule Call |  | Send Email    |   |
|  +---------------+  +---------------+   |
|                                         |
|  [Overview] [Orders] [Activity]         |
|  =========                              |
|                                         |
|  +-------------------------------------+|
|  | Summary                             ||
|  | ...                                 ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Schedule Call Dialog (Full Screen)

```
+=========================================+
| Schedule Call                     [X]   |
+-----------------------------------------+
|                                         |
|  Customer                               |
|  +-------------------------------------+|
|  | Acme Corporation                    ||
|  | john@acme.com                       ||
|  +-------------------------------------+|
|                                         |
|  Date *                                 |
|  +-------------------------------------+|
|  | [cal] Jan 15, 2026                  ||
|  +-------------------------------------+|
|                                         |
|  Time *                                 |
|  +-------------------------------------+|
|  | [clock] 10:00 AM                    ||
|  +-------------------------------------+|
|                                         |
|  Duration (optional)                    |
|  +----------------------------------v--+|
|  | 30 minutes                          ||
|  +-------------------------------------+|
|                                         |
|  Assign To                              |
|  +----------------------------------v--+|
|  | [avatar] Joel Chan                  ||
|  +-------------------------------------+|
|                                         |
|  Reminder                               |
|  +----------------------------------v--+|
|  | 15 minutes before                   ||
|  +-------------------------------------+|
|                                         |
|  Notes                                  |
|  +-------------------------------------+|
|  | Follow up on 10kWh battery quote    ||
|  |                                     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |        [Schedule Call]              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Dashboard - Upcoming Calls Widget (Mobile)

```
+=========================================+
| Dashboard                               |
+-----------------------------------------+
|                                         |
|  Upcoming Calls (3)            [See All]|
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | TODAY                               ||
|  |                                     ||
|  | +----------------------------------+||
|  | | 10:00 AM                         |||
|  | | Acme Corporation                 |||
|  | | Follow up on quote Q-1234        |||
|  | |                                  |||
|  | | [Start Call]  [Snooze v]         |||
|  | +----------------------------------+||
|  |                                     ||
|  | +----------------------------------+||
|  | | 2:30 PM                          |||
|  | | Beta Industries                  |||
|  | | Check on order status            |||
|  | |                                  |||
|  | | [Start Call]  [Snooze v]         |||
|  | +----------------------------------+||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | TOMORROW                            ||
|  |                                     ||
|  | +----------------------------------+||
|  | | 9:00 AM                          |||
|  | | Gamma LLC                        |||
|  | | Initial consultation             |||
|  | |                                  |||
|  | | [Reschedule] [Cancel]            |||
|  | +----------------------------------+||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Snooze Menu (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  SNOOZE CALL                            |
|  Acme Corporation - 10:00 AM            |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | [clock] In 15 minutes               ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [clock] In 30 minutes               ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [clock] In 1 hour                   ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [clock] In 2 hours                  ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [cal] Tomorrow at same time         ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | [cal] Pick a different time...      ||
|  +-------------------------------------+|
|                                         |
|  ( Cancel )                             |
|                                         |
+=========================================+
```

### Call Outcome Dialog (Full Screen)

```
+=========================================+
| Log Call Outcome                  [X]   |
+-----------------------------------------+
|                                         |
|  Call with Acme Corporation             |
|  Scheduled for Jan 15 at 10:00 AM       |
|  ─────────────────────────────────────  |
|                                         |
|  OUTCOME *                              |
|                                         |
|  +----------+  +----------+             |
|  |  [check] |  |   [x]    |             |
|  | Completed|  |No Answer |             |
|  +----------+  +----------+             |
|                                         |
|  +----------+  +----------+             |
|  |   [cal]  |  |  [ban]   |             |
|  |Reschedule|  | Cancelled|             |
|  +----------+  +----------+             |
|                                         |
|  CALL DETAILS                           |
|                                         |
|  Duration (if completed)                |
|  +----------------------------------v--+|
|  | 15 minutes                          ||
|  +-------------------------------------+|
|                                         |
|  Call Notes *                           |
|  +-------------------------------------+|
|  | Discussed pricing options. Customer ||
|  | will review and get back to us by   ||
|  | end of week. Need to follow up.     ||
|  +-------------------------------------+|
|                                         |
|  FOLLOW-UP                              |
|                                         |
|  [x] Schedule follow-up call            |
|                                         |
|      +-------------------------------+  |
|      | [cal] Jan 20, 2026 at 10 AM   |  |
|      +-------------------------------+  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         [Log Call]                  ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Call Reminder Notification (Toast/Push)

```
+=========================================+
|                                         |
|  +-------------------------------------+|
|  | [bell] REMINDER                     ||
|  |                                     ||
|  | Call with Acme Corporation          ||
|  | in 15 minutes (10:00 AM)            ||
|  |                                     ||
|  | [Start Call]  [Snooze 5 min]        ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State (Mobile)

```
+=========================================+
| Dashboard                               |
+-----------------------------------------+
|                                         |
|  Upcoming Calls                [See All]|
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |          +-------------+            ||
|  |          |   [phone]   |            ||
|  |          +-------------+            ||
|  |                                     ||
|  |       No Calls Scheduled            ||
|  |                                     ||
|  |   Schedule calls to stay on top     ||
|  |   of customer communications.       ||
|  |                                     ||
|  |      [Schedule a Call]              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Loading Skeleton (Mobile)

```
+=========================================+
| Dashboard                               |
+-----------------------------------------+
|                                         |
|  Upcoming Calls                         |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | .........                           ||
|  |                                     ||
|  | +----------------------------------+||
|  | | ........                         |||
|  | | .......................          |||
|  | | ...................              |||
|  | |                                  |||
|  | | [...........] [...........]     |||
|  | +----------------------------------+||
|  |                                     ||
|  | +----------------------------------+||
|  | | ........                         |||
|  | | .......................          |||
|  | | ...................              |||
|  | |                                  |||
|  | | [...........] [...........]     |||
|  | +----------------------------------+||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Customer Detail with Call Button

```
+=========================================================================+
| < Back to Customers                                                      |
+-------------------------------------------------------------------------+
|                                                                          |
|  Acme Corporation                                   [Edit]  [Actions v]  |
|  john@acme.com  |  +1 555-0123  |  Active                                |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  +-- QUICK ACTIONS ---------------------------------------------------+ |
|  |                                                                    | |
|  |  [phone] Schedule Call   [email] Send Email   [note] Add Note      | |
|  |                                                                    | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
|  [Overview] [Orders] [Jobs] [Activity] [Communications]                  |
|  =========                                                               |
|                                                                          |
+=========================================================================+
```

### Schedule Call Dialog (Modal)

```
+=========================================================================+
| Schedule Call                                                      [X]   |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-- CUSTOMER INFO -------------------+  +-- CALL DETAILS -------------+|
|  |                                    |  |                              ||
|  |  Acme Corporation                  |  |  Date *                      ||
|  |  john@acme.com                     |  |  +------------------------+  ||
|  |  +1 555-0123                       |  |  | [cal] Jan 15, 2026     |  ||
|  |                                    |  |  +------------------------+  ||
|  |  Recent calls:                     |  |                              ||
|  |  * Jan 5 - Pricing discussion      |  |  Time *                      ||
|  |  * Dec 20 - Initial contact        |  |  +------------------------+  ||
|  |                                    |  |  | [clock] 10:00 AM       |  ||
|  +------------------------------------+  |  +------------------------+  ||
|                                          |                              ||
|                                          |  Duration                    ||
|                                          |  +------------------------+  ||
|                                          |  | 30 minutes           v |  ||
|                                          |  +------------------------+  ||
|                                          |                              ||
|                                          |  Assign To                   ||
|                                          |  +------------------------+  ||
|                                          |  | Joel Chan            v |  ||
|                                          |  +------------------------+  ||
|                                          |                              ||
|                                          |  Reminder                    ||
|                                          |  +------------------------+  ||
|                                          |  | 15 minutes before    v |  ||
|                                          |  +------------------------+  ||
|                                          |                              ||
|                                          +------------------------------+|
|                                                                          |
|  Notes                                                                   |
|  +---------------------------------------------------------------------+|
|  | Follow up on quote Q-1234. Need to discuss payment terms.           ||
|  +---------------------------------------------------------------------+|
|                                                                          |
|                                     ( Cancel )     [ Schedule Call ]     |
|                                                                          |
+=========================================================================+
```

### Dashboard - Upcoming Calls Widget (Sidebar)

```
+------------------------------------+
| Upcoming Calls             [+New]  |
+------------------------------------+
|                                    |
|  TODAY                             |
|  +--------------------------------+|
|  | 10:00 AM                       ||
|  | Acme Corp - Follow up Q-1234   ||
|  | [Start]    [v More]            ||
|  +--------------------------------+|
|                                    |
|  +--------------------------------+|
|  | 2:30 PM                        ||
|  | Beta Industries - Order status ||
|  | [Start]    [v More]            ||
|  +--------------------------------+|
|                                    |
|  TOMORROW                          |
|  +--------------------------------+|
|  | 9:00 AM                        ||
|  | Gamma LLC - Consultation       ||
|  | [Start]    [v More]            ||
|  +--------------------------------+|
|                                    |
|  [See all scheduled calls]        |
|                                    |
+------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### Communications Route - Calls Tab

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Communications                                        [+ Compose]  [Settings]         |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  [Summary] [Emails] [Scheduled] [Templates] [Campaigns] [Calls]                        |
| Jobs        |                                                                   =====                |
| Pipeline    |                                                                                        |
| Support     |  +-- SCHEDULED CALLS -------------------------------------------------------------------+
| Communi..   |  |                                                                                     |
|   <         |  |  [+ Schedule Call]        [Filter: All v]  [Assignee: All v]  [Date Range v]        |
|             |  |                                                                                     |
|             |  |  TODAY - Jan 15, 2026                                                               |
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | Time     | Customer         | Assignee    | Notes                  | Actions    ||
|             |  |  |---------+------------------+-------------+------------------------+------------|  |
|             |  |  | 10:00 AM | Acme Corp        | Joel Chan   | Follow up on Q-1234    | [Start][v] ||
|             |  |  | 2:30 PM  | Beta Industries  | Joel Chan   | Check order status     | [Start][v] ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |                                                                                     |
|             |  |  TOMORROW - Jan 16, 2026                                                            |
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | 9:00 AM  | Gamma LLC        | Sarah Kim   | Initial consultation   | [Edit][v]  ||
|             |  |  | 11:00 AM | Delta Inc        | Joel Chan   | Warranty follow-up     | [Edit][v]  ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |                                                                                     |
|             |  |  THIS WEEK                                                                          |
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | Jan 18   | Epsilon Co       | Mike Lee    | New customer intro     | [Edit][v]  ||
|             |  |  | Jan 19   | Zeta Corp        | Joel Chan   | Contract renewal       | [Edit][v]  ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |                                                                                     |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  +-- RECENT CALLS ----------------------------------------------------------------------+
|             |  |                                                                                     |
|             |  |  Completed calls this week                                       [View All History] |
|             |  |                                                                                     |
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | Date     | Customer         | Outcome     | Duration | Notes                    ||
|             |  |  |----------+------------------+-------------+----------+--------------------------|
|             |  |  | Jan 14   | Acme Corp        | Completed   | 15 min   | Discussed pricing...     ||
|             |  |  | Jan 13   | Omega LLC        | No Answer   | -        | Left voicemail           ||
|             |  |  | Jan 12   | Pi Industries    | Completed   | 30 min   | Contract signed          ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |                                                                                     |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Dashboard - Upcoming Calls Widget (Desktop)

```
+----------------------------------------------------+
| Upcoming Calls                        [+ Schedule]  |
+----------------------------------------------------+
|                                                     |
|  TODAY                                              |
|  +------------------------------------------------+|
|  | 10:00 AM    Acme Corporation                   ||
|  |             Follow up on quote Q-1234          ||
|  |                                                ||
|  |    [Start Call]   [Snooze v]   [Log Outcome]   ||
|  +------------------------------------------------+|
|                                                     |
|  +------------------------------------------------+|
|  | 2:30 PM     Beta Industries                    ||
|  |             Check on order status              ||
|  |                                                ||
|  |    [Start Call]   [Snooze v]   [Log Outcome]   ||
|  +------------------------------------------------+|
|                                                     |
|  TOMORROW                                           |
|  +------------------------------------------------+|
|  | 9:00 AM     Gamma LLC                          ||
|  |             Initial consultation               ||
|  |                                                ||
|  |    [Reschedule]       [Cancel]                 ||
|  +------------------------------------------------+|
|                                                     |
|  [View all scheduled calls ->]                      |
|                                                     |
+----------------------------------------------------+
```

### Call Outcome Dialog (Desktop)

```
+============================================================================+
| Log Call Outcome                                                      [X]   |
+=============================================================================+
|                                                                             |
|  +-- CALL INFO -------------+  +-- OUTCOME & DETAILS ----------------------+|
|  |                          |  |                                           ||
|  |  Acme Corporation        |  |  OUTCOME *                                ||
|  |  john@acme.com           |  |                                           ||
|  |  +1 555-0123             |  |  +--------+  +--------+  +--------+       ||
|  |                          |  |  |[check] |  |  [x]   |  |  [cal] |       ||
|  |  Scheduled:              |  |  |Complete|  |No Answ |  |Resched.|       ||
|  |  Jan 15 at 10:00 AM      |  |  +--------+  +--------+  +--------+       ||
|  |                          |  |                                           ||
|  |  Assigned to:            |  |  +--------+                               ||
|  |  Joel Chan               |  |  | [ban]  |                               ||
|  |                          |  |  |Cancelled|                              ||
|  |  Original notes:         |  |  +--------+                               ||
|  |  Follow up on quote      |  |                                           ||
|  |  Q-1234                  |  |  Duration                                 ||
|  |                          |  |  +----------------------------------v--+  ||
|  +---------------------------+  |  | 15 minutes                         |  ||
|                                 |  +-------------------------------------+  ||
|                                 |                                           ||
|                                 |  Call Notes *                             ||
|                                 |  +-------------------------------------+  ||
|                                 |  | Discussed pricing options. Customer |  ||
|                                 |  | will review and get back to us by   |  ||
|                                 |  | end of week.                        |  ||
|                                 |  +-------------------------------------+  ||
|                                 |                                           ||
|                                 |  +-------------------------------------+  ||
|                                 |  | [x] Schedule follow-up call         |  ||
|                                 |  |                                     |  ||
|                                 |  |  +-------------------------------+  |  ||
|                                 |  |  | Jan 20, 2026 at 10:00 AM      |  |  ||
|                                 |  |  +-------------------------------+  |  ||
|                                 |  +-------------------------------------+  ||
|                                 |                                           ||
|                                 +-------------------------------------------+|
|                                                                             |
|                                            ( Cancel )     [ Log Call ]      |
|                                                                             |
+=============================================================================+
```

---

## Interaction States

### Loading States

```
WIDGET LOADING:
+------------------------------------+
| Upcoming Calls                     |
+------------------------------------+
|                                    |
|  +--------------------------------+|
|  | .........                      ||
|  | .......................        ||
|  | ...................            ||
|  |                                ||
|  | [..........] [..........      ||
|  +--------------------------------+|
|                                    |
|  +--------------------------------+|
|  | .........                      ||
|  | .......................        ||
|  | ...................            ||
|  |                                ||
|  | [..........] [..........      ||
|  +--------------------------------+|
|                                    |
+------------------------------------+
  ^ Shimmer animation

SCHEDULING IN PROGRESS:
+------------------------------------+
|                                    |
|  +--------------------------------+|
|  |     [spinner]                  ||
|  |     Scheduling call...         ||
|  +--------------------------------+|
|                                    |
+------------------------------------+

LOGGING CALL:
+------------------------------------+
|                                    |
|  +--------------------------------+|
|  |     [spinner]                  ||
|  |     Logging call outcome...    ||
|  +--------------------------------+|
|                                    |
+------------------------------------+
```

### Empty States

```
NO UPCOMING CALLS:
+------------------------------------+
| Upcoming Calls                     |
+------------------------------------+
|                                    |
|          +------------+            |
|          |  [phone]   |            |
|          +------------+            |
|                                    |
|     No Calls Scheduled             |
|                                    |
|  Schedule calls to stay on top     |
|  of customer relationships and     |
|  never miss a follow-up.           |
|                                    |
|       [Schedule a Call]            |
|                                    |
+------------------------------------+

NO CALL HISTORY:
+------------------------------------+
| Recent Calls                       |
+------------------------------------+
|                                    |
|     No call history yet            |
|                                    |
|  Completed calls will appear       |
|  here after you log outcomes.      |
|                                    |
+------------------------------------+
```

### Error States

```
FAILED TO LOAD:
+------------------------------------+
| Upcoming Calls                     |
+------------------------------------+
|                                    |
|  [!] Couldn't load calls           |
|                                    |
|  [Retry]                           |
|                                    |
+------------------------------------+

SCHEDULING FAILED:
+------------------------------------+
|                                    |
|  [!] Failed to schedule call       |
|                                    |
|  The selected time conflicts       |
|  with an existing call.            |
|                                    |
|  [Try Different Time]              |
|                                    |
+------------------------------------+

CONFLICT DETECTED:
+------------------------------------+
|                                    |
|  [!] Time Conflict                 |
|                                    |
|  You already have a call with      |
|  Beta Industries at 10:00 AM.      |
|                                    |
|  ( Change Time )  [Schedule Anyway]|
|                                    |
+------------------------------------+
```

### Success States

```
CALL SCHEDULED:
+------------------------------------+
|                                    |
|  * Call Scheduled                  |
|                                    |
|  Call with Acme Corporation        |
|  Jan 15, 2026 at 10:00 AM          |
|                                    |
|  You'll get a reminder 15 min      |
|  before the call.                  |
|                                    |
+------------------------------------+

CALL LOGGED:
+------------------------------------+
|                                    |
|  * Call Logged Successfully        |
|                                    |
|  Outcome: Completed (15 min)       |
|  Follow-up scheduled for Jan 20    |
|                                    |
+------------------------------------+

CALL SNOOZED:
+------------------------------------+
|                                    |
|  * Call Snoozed                    |
|                                    |
|  Rescheduled to 10:30 AM           |
|                                    |
|  [Undo - 5s]                       |
+------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Schedule Call Dialog**
   - Customer info (read-only)
   - Date picker -> Time picker
   - Duration selector -> Assignee selector -> Reminder selector
   - Notes textarea
   - Cancel -> Schedule button

2. **Upcoming Calls Widget**
   - Widget header / Schedule button
   - Tab through each call card
   - Within card: Start Call -> Snooze dropdown -> More actions
   - "See all" link

3. **Call Outcome Dialog**
   - Call info (read-only)
   - Outcome buttons (radio group)
   - Duration (if completed) -> Notes
   - Follow-up checkbox -> Follow-up datetime
   - Cancel -> Log button

### ARIA Requirements

```html
<!-- Schedule Call Button -->
<button
  aria-label="Schedule call with Acme Corporation"
>
  <PhoneIcon aria-hidden="true" />
  Schedule Call
</button>

<!-- Upcoming Calls Widget -->
<section
  role="region"
  aria-labelledby="upcoming-calls-heading"
>
  <h2 id="upcoming-calls-heading">Upcoming Calls</h2>

  <div role="group" aria-label="Today's calls">
    <h3>Today</h3>
    <!-- Call cards -->
  </div>
</section>

<!-- Call Card -->
<article
  role="article"
  aria-label="Call with Acme Corporation at 10:00 AM today"
>
  <time datetime="2026-01-15T10:00:00">10:00 AM</time>
  <div aria-label="Customer">Acme Corporation</div>
  <div aria-label="Notes">Follow up on quote Q-1234</div>

  <div role="group" aria-label="Call actions">
    <button aria-label="Start call with Acme Corporation">Start Call</button>
    <button
      aria-haspopup="menu"
      aria-expanded="false"
      aria-label="Snooze call"
    >Snooze</button>
  </div>
</article>

<!-- Snooze Menu -->
<menu
  role="menu"
  aria-label="Snooze options"
>
  <button role="menuitem">In 15 minutes</button>
  <button role="menuitem">In 30 minutes</button>
  <button role="menuitem">In 1 hour</button>
</menu>

<!-- Outcome Selection -->
<fieldset role="radiogroup" aria-label="Call outcome">
  <legend>Outcome</legend>
  <label>
    <input type="radio" name="outcome" value="completed" aria-checked="true" />
    Completed
  </label>
  <label>
    <input type="radio" name="outcome" value="no-answer" aria-checked="false" />
    No Answer
  </label>
</fieldset>

<!-- Call Reminder -->
<div
  role="alert"
  aria-live="polite"
>
  <p>Reminder: Call with Acme Corporation in 15 minutes (10:00 AM)</p>
  <button>Start Call</button>
  <button>Snooze 5 minutes</button>
</div>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Widget | Navigate between call cards |
| Enter | Call card | Start call / activate focused button |
| Space | Outcome options | Select outcome |
| Arrow Up/Down | Snooze menu | Navigate options |
| Enter | Snooze option | Apply snooze |
| Escape | Dialog/Menu | Close |
| Arrow Left/Right | Outcome buttons | Navigate between outcomes |

### Screen Reader Announcements

- Call scheduled: "Call with Acme Corporation scheduled for January 15 at 10 AM. Reminder set for 15 minutes before."
- Reminder: "Reminder: Call with Acme Corporation in 15 minutes"
- Call snoozed: "Call snoozed to 10:30 AM"
- Call logged: "Call logged as completed. 15 minute duration. Follow-up scheduled for January 20."
- Widget loading: "Loading upcoming calls"
- Empty state: "No calls scheduled"

---

## Animation Choreography

### Schedule Dialog Open

```
OPEN:
- Duration: 250ms
- Easing: ease-out
- Scale: 0.95 -> 1
- Opacity: 0 -> 1
- Backdrop fade in: 150ms

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Scale: 1 -> 0.98
- Opacity: 1 -> 0
```

### Call Card

```
ENTER (new call scheduled):
- Duration: 300ms
- Easing: spring
- Height: 0 -> auto
- Opacity: 0 -> 1
- Slide down from top

SNOOZE/RESCHEDULE:
- Duration: 250ms
- Card slides out left
- Reappears in new position
- Other cards shift

COMPLETE/CANCEL:
- Duration: 200ms
- Easing: ease-out
- Opacity: 1 -> 0
- Height: auto -> 0
- Other cards slide up

REMINDER PULSE:
- Duration: 500ms
- Easing: ease-in-out
- Border color pulse
- Scale: 1 -> 1.02 -> 1
```

### Snooze Menu

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Scale Y: 0.95 -> 1
- Opacity: 0 -> 1
- Origin: top

OPTIONS HOVER:
- Duration: 100ms
- Background highlight

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Opacity: 1 -> 0
```

### Outcome Selection

```
SELECT:
- Duration: 150ms
- Scale: 1 -> 1.1 -> 1
- Background color transition
- Check icon fade in

DESELECT:
- Duration: 100ms
- Scale back to 1
- Background color transition
```

### Success Feedback

```
CALL SCHEDULED:
- Duration: 300ms
- Checkmark scale: 0 -> 1.2 -> 1
- Green flash on dialog
- Auto-close after 2s or user dismiss

CALL LOGGED:
- Duration: 300ms
- Card exit animation
- Success toast slide up
- Auto-dismiss: 4s
```

---

## Component Props Interfaces

```typescript
// CallsSkeleton
interface CallsSkeletonProps {
  /** Number of skeleton cards */
  count?: number;
  /** Show date headers */
  showHeaders?: boolean;
}

// ScheduleCallDialog
interface ScheduleCallDialogProps {
  /** Customer to schedule call with */
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  /** Pre-fill assignee */
  defaultAssignee?: string;
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Schedule handler */
  onSchedule: (data: {
    customerId: string;
    scheduledAt: Date;
    duration?: number;
    assigneeId: string;
    reminderMinutes?: number;
    notes?: string;
  }) => void;
  /** Scheduling state */
  isScheduling?: boolean;
}

// UpcomingCallsWidget
interface UpcomingCallsWidgetProps {
  /** Number of days to show */
  daysAhead?: number;
  /** Maximum calls to display */
  maxCalls?: number;
  /** Filter by assignee */
  assigneeId?: string;
  /** Compact mode for sidebar */
  compact?: boolean;
  /** Show "See all" link */
  showSeeAll?: boolean;
  /** See all click handler */
  onSeeAll?: () => void;
  /** Schedule click handler */
  onScheduleClick?: () => void;
}

// CallCard
interface CallCardProps {
  call: {
    id: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    scheduledAt: string;
    duration?: number;
    assigneeId: string;
    assigneeName: string;
    notes?: string;
    status: 'pending' | 'completed' | 'cancelled' | 'no_answer';
  };
  /** Start call handler */
  onStartCall: () => void;
  /** Snooze handler */
  onSnooze: (minutes: number | Date) => void;
  /** Reschedule handler */
  onReschedule: () => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Log outcome handler */
  onLogOutcome: () => void;
  /** Is today's call */
  isToday?: boolean;
  /** Compact display */
  compact?: boolean;
}

// SnoozeMenu
interface SnoozeMenuProps {
  /** Menu open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Snooze option selected */
  onSnooze: (option: number | 'tomorrow' | 'custom') => void;
  /** Original scheduled time */
  originalTime: Date;
  /** Anchor element */
  anchorEl?: HTMLElement;
}

// CallOutcomeDialog
interface CallOutcomeDialogProps {
  /** Call to log outcome for */
  call: {
    id: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    scheduledAt: string;
    assigneeId: string;
    notes?: string;
  };
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Log outcome handler */
  onLog: (data: {
    outcome: 'completed' | 'no_answer' | 'rescheduled' | 'cancelled';
    duration?: number;
    notes: string;
    followUp?: {
      scheduledAt: Date;
      notes?: string;
    };
  }) => void;
  /** Logging state */
  isLogging?: boolean;
}

// CallReminderToast
interface CallReminderToastProps {
  /** Call details */
  call: {
    id: string;
    customerName: string;
    scheduledAt: string;
  };
  /** Minutes until call */
  minutesUntil: number;
  /** Start call handler */
  onStartCall: () => void;
  /** Quick snooze handler */
  onQuickSnooze: (minutes: number) => void;
  /** Dismiss handler */
  onDismiss: () => void;
}

// ActionButton (for customer detail)
interface ActionButtonProps {
  /** Button variant */
  variant: 'call' | 'email' | 'note';
  /** Customer context */
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  /** Click handler */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/schedule-call-dialog.tsx` | Call scheduling form |
| `src/components/domain/communications/upcoming-calls-widget.tsx` | Dashboard widget |
| `src/components/domain/communications/call-card.tsx` | Individual call display |
| `src/components/domain/communications/snooze-menu.tsx` | Snooze options menu |
| `src/components/domain/communications/call-outcome-dialog.tsx` | Outcome logging form |
| `src/components/domain/communications/call-reminder-toast.tsx` | Reminder notification |
| `src/components/domain/communications/calls-skeleton.tsx` | Loading skeleton |
| `src/components/domain/customers/customer-action-buttons.tsx` | Quick action buttons |
| `src/routes/_authed/communications/calls.tsx` | Calls tab route |
