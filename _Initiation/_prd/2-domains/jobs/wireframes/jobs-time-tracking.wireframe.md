# Jobs Domain Wireframe: Time Tracking (DOM-JOBS-003c)

**Story ID:** DOM-JOBS-003c
**Component Type:** Timer widget with DataTable
**Aesthetic:** Rugged Utilitarian - designed for harsh field conditions
**Primary Device:** Mobile (field technicians)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Timer Display
- **Pattern**: Custom Timer with RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Large 48px font for outdoor visibility (HH:MM:SS format)
  - Green glow border animation for active state
  - 72px start/stop button for glove-friendly operation

### Card for Time Entries
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Time entry cards with status indicators (active pulsing dot, billable badge)
  - Color-coded background (green=active, white=billable, gray=non-billable)
  - Tap to edit, swipe for quick actions

### Badge for Billable Status
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - [B] filled badge for billable time entries
  - [ ] empty badge for non-billable time
  - [~] sync pending indicator for offline entries

### Sheet for Entry Details
- **Pattern**: RE-UI Sheet (mobile bottom sheet)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Stop timer dialog with description field and billable toggle
  - Add manual entry form with date/time pickers
  - Quick description chips for common tasks

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `jobTimeEntries` table in `renoz-v2/lib/schema/job-time-entries.ts` | NOT CREATED |
| **Server Functions Required** | `startTimer`, `stopTimer`, `createManualTimeEntry`, `getJobTimeEntries` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-003a (schema), DOM-JOBS-003b (server functions) | PENDING |

### Existing Schema Available
- `jobAssignments` in `renoz-v2/lib/schema/job-assignments.ts` (job link, has `startedAt`, `completedAt`)
- `users` in `renoz-v2/lib/schema/users.ts` (technician reference)

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **Time Format**: 12-hour with AM/PM (e.g., "9:00 AM")
- **Timezone**: AEST/AEDT (auto-adjusts for daylight saving)
- **Typical Jobs**: Residential (1-2 days), Commercial (3-5 days), Large commercial (1-2 weeks)
- **Billable Tracking**: Time entries marked billable for job costing

---

## Design Principles for Field Use

- **Touch targets:** Minimum 44px (prefer 48px for primary actions)
- **High contrast:** Dark text on light backgrounds, clear timer display
- **One-handed operation:** Timer controls reachable by thumb
- **Glove-friendly:** Extra large start/stop button (72px)
- **Outdoor visibility:** Large, bold timer digits
- **Always visible:** Floating timer when scrolling
- **Offline capable:** Timer works without connection

---

## Mobile Wireframe (Primary - 375px)

### Time Tab with Active Timer

```
+=========================================+
| < Job #JOB-1234                    [*]  | <- Sync indicator
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] | <- Scrollable tabs
|                         ======          |
+-----------------------------------------+
|                                         |
|  +=====================================+|
|  ||                                   |||
|  ||     ACTIVE TIMER                  ||| <- Green glow border
|  ||                                   |||
|  ||        02:34:15                   ||| <- 48px font size
|  ||        HH:MM:SS                   |||
|  ||                                   |||
|  ||   Started at 9:15 AM              |||
|  ||                                   |||
|  ||   +---------------------------+   |||
|  ||   |                           |   |||
|  ||   |    [||] STOP TIMER        |   ||| <- 72px height, red
|  ||   |                           |   |||
|  ||   +---------------------------+   |||
|  ||                                   |||
|  +=====================================+|
|                                         |
|  TODAY'S TIME                           |
|  +-------------------------------------+|
|  | Total: 4h 23m      Billable: 3h 45m ||
|  +-------------------------------------+|
|                                         |
|  TIME ENTRIES                           |
|  +-------------------------------------+|
|  | 9:15 AM - Active                    ||
|  | Battery mounting                    ||
|  | Duration: 2h 34m (running)     [B] || <- [B] = Billable
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 7:30 AM - 9:00 AM                   ||
|  | Electrical prep and testing         ||
|  | Duration: 1h 30m               [B] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 7:00 AM - 7:30 AM                   ||
|  | Travel to site                      ||
|  | Duration: 30m                  [ ] || <- Not billable
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|  +-------------------------------------+|
|  |     [+] ADD MANUAL ENTRY            || <- 48px
|  +-------------------------------------+|
+=========================================+
```

### Timer NOT Running (Idle State)

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                         ======          |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |     START TIMER                     ||
|  |                                     ||
|  |        00:00:00                     || <- Dimmed
|  |                                     ||
|  |   Tap to start tracking time        ||
|  |                                     ||
|  |   +---------------------------+     ||
|  |   |                           |     ||
|  |   |    [>] START TIMER        |     || <- 72px height, green
|  |   |                           |     ||
|  |   +---------------------------+     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  TODAY'S TIME                           |
|  +-------------------------------------+|
|  | Total: 2h 00m      Billable: 1h 30m ||
|  +-------------------------------------+|
|                                         |
|  TIME ENTRIES                           |
|  +-------------------------------------+|
|  | 7:30 AM - 9:00 AM                   ||
|  | Site prep and unloading             ||
|  | Duration: 1h 30m               [B] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 7:00 AM - 7:30 AM                   ||
|  | Travel to site                      ||
|  | Duration: 30m                  [ ] ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|  +-------------------------------------+|
|  |     [+] ADD MANUAL ENTRY            ||
|  +-------------------------------------+|
+=========================================+
```

### Floating Timer FAB (When Scrolling)

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                         ======          |
+-----------------------------------------+
|                                         |
|  TIME ENTRIES                           |
|  +-------------------------------------+|
|  | 9:15 AM - Active                    ||
|  | Battery installation               ||
|  | Duration: 2h 34m (running)     [B] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|   +==============+
|  | 7:30 AM - 9:00 AM                   ||   || 02:34:15   || <- Floating
|  | Site prep and unloading             ||   || [||] STOP  || <- 56px FAB
|  | Duration: 1h 30m               [B] ||   +==============+
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 7:00 AM - 7:30 AM                   ||
|  | Travel to site                      ||
|  | Duration: 30m                  [ ] ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Yesterday                           ||
|  | -----------------------------------||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 3:00 PM - 5:00 PM                   ||
|  | Finishing work                      ||
|  | Duration: 2h 00m               [B] ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Time Entry States

```
+-- ACTIVE ENTRY (RUNNING) ----------------------+
|  +--------------------------------------------+|
|  | 9:15 AM - Active                      [*]  || <- Pulsing dot
|  | Battery installation                       ||
|  | Duration: 2h 34m (running)            [B]  ||
|  | ========================================   || <- Animated bar
|  +--------------------------------------------+|
|  Background: green-50                          |
|  Border-left: 4px solid green-500              |
+------------------------------------------------+

+-- COMPLETED ENTRY (BILLABLE) ------------------+
|  +--------------------------------------------+|
|  | 7:30 AM - 9:00 AM                          ||
|  | Site prep and unloading                    ||
|  | Duration: 1h 30m                      [B]  || <- Filled badge
|  +--------------------------------------------+|
|  Background: white                             |
|  Border-left: none                             |
+------------------------------------------------+

+-- COMPLETED ENTRY (NON-BILLABLE) --------------+
|  +--------------------------------------------+|
|  | 7:00 AM - 7:30 AM                          ||
|  | Travel to site                             ||
|  | Duration: 30m                         [ ]  || <- Empty badge
|  +--------------------------------------------+|
|  Background: gray-50                           |
|  Border-left: none                             |
|  Text: slightly muted                          |
+------------------------------------------------+

+-- PENDING SYNC --------------------------------+
|  +--------------------------------------------+|
|  | 9:15 AM - 11:30 AM                    [~]  || <- Sync pending
|  | Battery installation                       ||
|  | Duration: 2h 15m                      [B]  ||
|  | - - - - - - - - - - - - - - - - - - - - -  || <- Dashed border
|  +--------------------------------------------+|
+------------------------------------------------+
```

### Stop Timer Dialog

```
+=========================================+
| ====================================    | <- Drag handle
|                                         |
|  STOP TIMER                    [X]      | <- 48px close
|  -----------------------------------    |
|                                         |
|  TIME LOGGED                            |
|  +-------------------------------------+|
|  |                                     ||
|  |           02:34:15                  || <- Large display
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Description *                          |
|  +-------------------------------------+|
|  | Battery installation and alignment  || <- 48px height
|  +-------------------------------------+|
|                                         |
|  Quick descriptions:                    |
|  +----------+ +----------+ +----------+ |
|  | Install  | | Repair   | | Inspect  | | <- Quick chips
|  +----------+ +----------+ +----------+ |
|  +----------+ +----------+              |
|  | Cleanup  | | Travel   |              |
|  +----------+ +----------+              |
|                                         |
|  Billable                               |
|  +-------------------------------------+|
|  | [X] This time is billable           || <- 48px toggle row
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |        [SAVE TIME ENTRY]            || <- 56px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Add Manual Entry Dialog

```
+=========================================+
| ====================================    |
|                                         |
|  ADD TIME ENTRY                [X]      |
|  -----------------------------------    |
|                                         |
|  Date                                   |
|  +-------------------------------------+|
|  | [cal] Today, Jan 10, 2026      [v]  || <- Date picker
|  +-------------------------------------+|
|                                         |
|  Start Time                             |
|  +-------------------------------------+|
|  | [clock] 9:00 AM                [v]  || <- Time picker
|  +-------------------------------------+|
|                                         |
|  End Time                               |
|  +-------------------------------------+|
|  | [clock] 11:30 AM               [v]  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Duration: 2h 30m                    || <- Auto-calculated
|  +-------------------------------------+|
|                                         |
|  Description *                          |
|  +-------------------------------------+|
|  | What did you work on?               ||
|  +-------------------------------------+|
|                                         |
|  Billable                               |
|  +-------------------------------------+|
|  | [X] This time is billable           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [ADD TIME ENTRY]               || <- 56px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                         ======          |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |     START TRACKING TIME             ||
|  |                                     ||
|  |        00:00:00                     ||
|  |                                     ||
|  |   +---------------------------+     ||
|  |   |                           |     ||
|  |   |    [>] START TIMER        |     || <- 72px
|  |   |                           |     ||
|  |   +---------------------------+     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|                                         |
|            +-------------+              |
|            |   [clock]   |              |
|            +-------------+              |
|                                         |
|       NO TIME TRACKED YET               |
|                                         |
|   Start the timer or add a manual       |
|   entry to track time on this job.      |
|                                         |
|   +-----------------------------+       |
|   |   [+] ADD MANUAL ENTRY      |       | <- 48px
|   +-----------------------------+       |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px - Office Use)

```
+=======================================================================+
| < Back | Job #JOB-1234 - Install 10kWh battery system       [Sync *] [Actions v]|
+-----------------------------------------------------------------------+
| [Overview] [Tasks] [Materials] [Time] [Checklist] [Photos] [Notes]    |
|                                 ======                                |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- TIMER CARD -------------------+  +-- TIME SUMMARY ---------------+
|  |                                 |  |                               |
|  |     ACTIVE TIMER                |  |  Today                        |
|  |                                 |  |  Total: 4h 23m                |
|  |        02:34:15                 |  |  Billable: 3h 45m (86%)       |
|  |                                 |  |                               |
|  |   Started: 9:15 AM              |  |  This Week                    |
|  |   [||] STOP TIMER               |  |  Total: 18h 30m               |
|  |                                 |  |  Billable: 16h 00m            |
|  +- - - - - - - - - - - - - - - - -+  |                               |
|  |   [+] Add Manual Entry          |  |  Job Total                    |
|  +---------------------------------+  |  Total: 32h 15m               |
|                                       |  Budget: 40h                  |
|                                       |  Remaining: 7h 45m            |
|                                       +-------------------------------+
|                                                                       |
|  +-- TIME ENTRIES --------------------------------------------------------+
|  |                                                                        |
|  |  [search] Search entries...                           [Export CSV]    |
|  |  ----------------------------------------------------------------------
|  |                                                                        |
|  |  +--- Date/Time ------+--- Description -----------+-- Duration --+--B-+
|  |  | 9:15 AM - Active   | Battery installation      | 2h 34m [*]   | [X]|
|  |  |                    | (running)                 |              |    |
|  |  +---------------------------------------------------------------------+
|  |  | 7:30 AM - 9:00 AM  | Site prep and unloading   | 1h 30m       | [X]|
|  |  +---------------------------------------------------------------------+
|  |  | 7:00 AM - 7:30 AM  | Travel to site            | 30m          | [ ]|
|  |  +---------------------------------------------------------------------+
|  |  | Yesterday          |                           |              |    |
|  |  +---------------------------------------------------------------------+
|  |  | 3:00 PM - 5:00 PM  | Finishing work            | 2h 00m       | [X]|
|  |  +---------------------------------------------------------------------+
|  |  | 1:00 PM - 3:00 PM  | Battery installation      | 2h 00m       | [X]|
|  |  +---------------------------------------------------------------------+
|  |                                                                        |
|  +------------------------------------------------------------------------+
|                                                                       |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+ - Admin/Office Manager)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Jobs                                                                        |
| Customers   |                                                                                        |
| Orders      |  Job #JOB-1234 - 45 Industrial Rd - Install 10kWh battery system                                      |
| Products    |  Customer: Acme Corp          Status: [In Progress]      [Edit Job] [Actions v]        |
| Jobs <      |  ----------------------------------------------------------------------------------    |
| Pipeline    |                                                                                        |
| Support     |  [Overview] [Tasks] [Materials] [Time Tracking] [Checklist] [Photos] [Notes]           |
|             |                                 ==============                                         |
|             |                                                                                        |
|             |  +-- TIME TRACKING -------------------------------------------------------------------|
|             |  |                                                                                    |
|             |  |  +-- Sidebar --+  +-- Main Content -----------------------------------------------+|
|             |  |  |             |  |                                                               ||
|             |  |  | TIMER       |  |  TIME ENTRIES                                                 ||
|             |  |  | =========   |  |  ------------------------------------------------------------  ||
|             |  |  |             |  |                                                               ||
|             |  |  |  02:34:15   |  |  [search] Search...   [Date Range v]   [Billable v]  [Export] ||
|             |  |  |             |  |                                                               ||
|             |  |  | Started     |  |  +-- Date -------+-- Time ----+-- Description ----+-- Dur --+--B--+-- Actions --+
|             |  |  | 9:15 AM     |  |  | Today         | 9:15 - now | Inverter install   | 2h 34m | [X] | [Edit] [Del]|
|             |  |  |             |  |  |               |            | (running)         |  [*]   |     |             |
|             |  |  | [||] STOP   |  |  +---------------+------------+-------------------+--------+-----+-------------+
|             |  |  |             |  |  | Today         | 7:30-9:00  | Site prep         | 1h 30m | [X] | [Edit] [Del]|
|             |  |  +-------------+  |  +---------------+------------+-------------------+--------+-----+-------------+
|             |  |  |             |  |  | Today         | 7:00-7:30  | Travel            | 30m    | [ ] | [Edit] [Del]|
|             |  |  | SUMMARY     |  |  +---------------+------------+-------------------+--------+-----+-------------+
|             |  |  | =========   |  |  | Jan 9         | 3:00-5:00  | Finishing         | 2h 00m | [X] | [Edit] [Del]|
|             |  |  |             |  |  +---------------+------------+-------------------+--------+-----+-------------+
|             |  |  | Today       |  |  | Jan 9         | 1:00-3:00  | Inverter install   | 2h 00m | [X] | [Edit] [Del]|
|             |  |  | 4h 23m      |  |  +---------------+------------+-------------------+--------+-----+-------------+
|             |  |  |             |  |                                                               ||
|             |  |  | This Week   |  |  +-- Totals ----------------------------------------------+   ||
|             |  |  | 18h 30m     |  |  | Total: 8h 34m   Billable: 8h 04m   Non-billable: 30m   |   ||
|             |  |  |             |  |  +--------------------------------------------------------+   ||
|             |  |  | Job Total   |  |                                                               ||
|             |  |  | 32h 15m     |  |  [+ Add Manual Entry]                                         ||
|             |  |  |             |  |                                                               ||
|             |  |  | Budget      |  +---------------------------------------------------------------+|
|             |  |  | 40h         |                                                                   |
|             |  |  |             |                                                                   |
|             |  |  | [Progress]  |                                                                   |
|             |  |  | #######.... |                                                                   |
|             |  |  | 80%         |                                                                   |
|             |  |  +-------------+                                                                   |
|             |  |                                                                                    |
|             |  +------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Timer Interaction Flow

```
+-- START TIMER FLOW ----------------------------------------+
|                                                            |
|  1. User taps [>] START TIMER button                       |
|                                                            |
|  2. Immediate feedback:                                    |
|     - Haptic feedback (medium)                             |
|     - Button changes to red STOP                           |
|     - Timer starts counting from 00:00:00                  |
|     - Green glow appears around timer card                 |
|     - Server notified (can work offline)                   |
|                                                            |
|  3. While running:                                         |
|     - Timer updates every second                           |
|     - Active entry appears in list with pulsing dot        |
|     - Floating FAB appears when scrolling                  |
|     - Continues if app backgrounded                        |
|     - Persists across page navigation                      |
|                                                            |
+------------------------------------------------------------+

+-- STOP TIMER FLOW -----------------------------------------+
|                                                            |
|  1. User taps [||] STOP TIMER button                       |
|                                                            |
|  2. Stop dialog opens:                                     |
|     - Shows total time logged                              |
|     - Requires description                                 |
|     - Billable toggle (default: on)                        |
|     - Quick description chips                              |
|                                                            |
|  3. On save:                                               |
|     - Haptic feedback (success)                            |
|     - Dialog closes                                        |
|     - Entry appears in list                                |
|     - Timer resets to 00:00:00                             |
|     - Today's total updates                                |
|     - Toast: "Time entry saved"                            |
|                                                            |
|  4. On cancel:                                             |
|     - Confirmation: "Discard 2h 34m?"                      |
|     - [Keep Timing] [Discard]                              |
|                                                            |
+------------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Start/Stop button | aria-label="Start/Stop timer" | Space/Enter | 72x72px |
| Timer display | role="timer", aria-live="polite" | - | - |
| Time entry row | role="row" | Tab focus | Full row |
| Billable toggle | role="switch", aria-checked | Space | 48px height |
| Manual entry button | aria-label="Add manual time entry" | Enter | 48px height |
| Floating FAB | aria-label="Timer running: 2:34:15" | - | 56px |

---

## Offline Behavior

```
+-- OFFLINE MODE --------------------------------------------+
|                                                            |
|  Timer operation:                                          |
|  - Timer runs locally, no server required                  |
|  - Start time stored in localStorage                       |
|  - Survives app restart                                    |
|                                                            |
|  When timer stops:                                         |
|  - Entry saved locally                                     |
|  - Queued for sync                                         |
|  - Dashed border indicates pending sync                    |
|  - Toast: "Saved offline. Will sync when online."          |
|                                                            |
|  When back online:                                         |
|  - All queued entries sync automatically                   |
|  - Entries update to solid border                          |
|  - Toast: "Time entries synced"                            |
|                                                            |
|  Conflict handling:                                        |
|  - If server has different data, show resolution dialog    |
|  - "Keep local" or "Keep server" options                   |
|                                                            |
+------------------------------------------------------------+
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Time tab | JobTimeTab | - |
| Timer widget | ActiveTimer | Card |
| Timer display | TimerDisplay | - (custom) |
| Start/Stop button | TimerButton | Button |
| Time entry row | TimeEntryCard | Card |
| Floating timer FAB | FloatingTimer | - (custom) |
| Stop dialog | StopTimerDialog | Sheet |
| Manual entry dialog | TimeEntryDialog | Sheet |
| Time summary | TimeSummary | Card |
| Empty state | EmptyState | - |
| Loading skeleton | TimeEntriesSkeleton | Skeleton |

---

## Files to Create/Modify

- src/components/domain/jobs/job-time-tab.tsx (create)
- src/components/domain/jobs/active-timer.tsx (create)
- src/components/domain/jobs/timer-display.tsx (create)
- src/components/domain/jobs/time-entry-card.tsx (create)
- src/components/domain/jobs/time-entry-dialog.tsx (create)
- src/components/domain/jobs/floating-timer.tsx (create)
- src/routes/installer/jobs/$jobId.tsx (modify: add Time tab)
