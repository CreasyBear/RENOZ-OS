# Jobs Domain Wireframe: Job Scheduling Calendar (DOM-JOBS-005a/b)

**Story ID:** DOM-JOBS-005a (Basic Calendar), DOM-JOBS-005b (Drag-Drop & Filters)
**Component Type:** Calendar with event display and drag-drop
**Aesthetic:** Rugged Utilitarian - optimized for office scheduling
**Primary Device:** Tablet/Desktop (office managers)
**Secondary:** Mobile (quick view for field techs)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Calendar Component
- **Pattern**: RE-UI Calendar
- **Reference**: `_reference/.reui-reference/registry/default/ui/calendar.tsx`
- **Features**:
  - Day/week/month view switching for schedule overview
  - Event display with color-coded job status
  - Date navigation with swipe gestures on mobile

### Drag and Drop
- **Pattern**: RE-UI Sortable (with dnd-kit)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sortable.tsx`
- **Features**:
  - Drag jobs from unscheduled sidebar to calendar slots
  - Drag existing jobs to reschedule with visual feedback
  - Drop zone highlighting for valid time slots

### Badge for Status
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Job status badges (scheduled, in-progress, completed, on-hold)
  - Technician assignment badges on calendar cards
  - Time slot indicators for duration visualization

### Dialog for Scheduling
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Schedule confirmation with time/duration/assignee selection
  - Conflict detection warnings for overlapping jobs
  - Quick technician assignment checkboxes

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `jobAssignments` table (exists) - may need enhancements for scheduling metadata | PARTIALLY EXISTS |
| **Server Functions Required** | `getJobAssignments`, `rescheduleJob`, `getUnscheduledJobs`, `assignTechnicianToJob` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-005a (Basic Calendar), DOM-JOBS-005b (Drag-Drop & Filters) | PENDING |

### Existing Schema Available
- `jobAssignments` in `renoz-v2/lib/schema/job-assignments.ts` - base schema exists
- `users` in `renoz-v2/lib/schema/users.ts` - for technician filtering

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **Use Case**: Office managers scheduling technicians for installation jobs across multiple sites
- **Job Types**: Battery installation, Inverter install, Full system commissioning, Warranty service
- **Typical Jobs**: Residential (1-2 days), Commercial (3-5 days), Large commercial (1-2 weeks)
- **Key Features**: Drag-drop scheduling, technician availability view, conflict detection
- **Integration**: Calendar syncs with technician mobile view for field access

---

## Design Principles

- **Desktop-first:** Calendar scheduling is primarily an office task
- **Mobile readable:** Field techs can view their schedule
- **Drag-drop:** Intuitive job rescheduling
- **Technician visibility:** Filter by crew member
- **Unscheduled jobs:** Sidebar for pending assignments
- **Color-coded:** Status at a glance

---

## Mobile Wireframe (375px - View Only)

### Day View (Default on Mobile)

```
+=========================================+
| < Jobs Calendar                    [*]  |
|                                         |
+-----------------------------------------+
| [Day] [3-Day] [Week]    [Today]         | <- View toggles
|       ====                              |
+-----------------------------------------+
|                                         |
|  < Jan 10, 2026 >                       | <- Swipe to change
|     Friday                              |
|                                         |
+-----------------------------------------+
|  6 AM                                   |
|  ----                                   |
|                                         |
|  7 AM                                   |
|  ----                                   |
|  +-------------------------------------+|
|  | 7:00 - 9:00 AM                      ||
|  | Battery Install - Acme Corp         ||
|  | 45 Industrial Rd                    ||
|  | [In Progress] Mike, Sarah           ||
|  | ===================================  || <- Blue/in-progress
|  +-------------------------------------+|
|                                         |
|  9 AM                                   |
|  ----                                   |
|  +-------------------------------------+|
|  | 9:00 - 12:00 PM                     ||
|  | Inverter Upgrade - Tech Inc         ||
|  | 456 Oak Ave                         ||
|  | [Scheduled] Mike                    ||
|  | -----------------------------------  || <- Gray/scheduled
|  +-------------------------------------+|
|                                         |
|  12 PM                                  |
|  ----                                   |
|  +-------------------------------------+|
|  | 12:00 - 1:00 PM                     ||
|  | LUNCH                               ||
|  +-------------------------------------+|
|                                         |
|  1 PM                                   |
|  ----                                   |
|  +-------------------------------------+|
|  | 1:00 - 4:00 PM                      ||
|  | Commissioning - Johnson Home        ||
|  | 789 Elm St                          ||
|  | [Scheduled] Sarah                   ||
|  +-------------------------------------+|
|                                         |
|  4 PM                                   |
|  ----                                   |
|                                         |
|  5 PM                                   |
|  ----                                   |
|                                         |
+-----------------------------------------+
|                                         |
|  TODAY: 3 Jobs | 8h Scheduled           |
|                                         |
+=========================================+
```

### 3-Day View (Mobile)

```
+=========================================+
| < Jobs Calendar                    [*]  |
+-----------------------------------------+
| [Day] [3-Day] [Week]    [Today]         |
|       =======                           |
+-----------------------------------------+
|                                         |
|  < Jan 10 - 12, 2026 >                  |
|                                         |
|  +----------+----------+----------+     |
|  |  Fri 10  |  Sat 11  |  Sun 12  |     |
|  +----------+----------+----------+     |
|  |          |          |          |     |
|  | 7:00     |          |          |     |
|  | [######] |          |          |     |
|  | Kitchen  |          |          |     |
|  |          |          |          |     |
|  | 9:00     |  9:00    |          |     |
|  | [------] |  [------]|          |     |
|  | Bathroom |  Followup|          |     |
|  |          |          |          |     |
|  | 1:00     |  1:00    |          |     |
|  | [------] |  [------]|          |     |
|  | Battery   |  Inspect |          |     |
|  |          |          |          |     |
|  +----------+----------+----------+     |
|                                         |
+-----------------------------------------+
```

### Job Card (Tap to View)

```
+-- TAP JOB CARD OPENS BOTTOM SHEET ---------+
|                                            |
|  =======================================   |
|                                            |
|  Install 10kWh battery system         [X]     |
|  Acme Corporation                          |
|  -----------------------------------------  |
|                                            |
|  +--- Details -------------------------+   |
|  | Date: Friday, Jan 10, 2026          |   |
|  | Time: 7:00 AM - 9:00 AM             |   |
|  | Duration: 2 hours                   |   |
|  +-------------------------------------+   |
|                                            |
|  +--- Location ------------------------+   |
|  | 45 Industrial Rd                    |   |
|  | Anytown, ST 12345                   |   |
|  | [Navigate]                          |   | <- Opens maps
|  +-------------------------------------+   |
|                                            |
|  +--- Assigned ------------------------+   |
|  | [avatar] Mike Johnson               |   |
|  | [avatar] Sarah Williams             |   |
|  +-------------------------------------+   |
|                                            |
|  Status: [In Progress v]                   | <- Status dropdown
|                                            |
|  +-------------------------------------+   |
|  |                                     |   |
|  |         [VIEW JOB DETAILS]          |   | <- 56px
|  |                                     |   |
|  +-------------------------------------+   |
|                                            |
+--------------------------------------------+
```

---

## Tablet Wireframe (768px - Office Scheduling)

### Week View with Sidebar

```
+===================================================================================+
| < Jobs Calendar                                           [Sync *] [+ New Job]    |
+-----------------------------------------------------------------------------------+
| [Day] [Week] [Month]                                                    [Today]   |
|       ======                                                                      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-- FILTERS --------------------------------+  +-- UNSCHEDULED JOBS ------------+|
|  |                                           |  |                                ||
|  |  Technicians: [All v]                     |  |  Drag to calendar to schedule  ||
|  |  +-----+ +-----+ +-----+ +-----+          |  |                                ||
|  |  |[X]  | |[X]  | |[ ]  | |[ ]  |          |  |  +----------------------------+||
|  |  |Mike | |Sarah| |Bob  | |Lisa |          |  |  | Inverter Install            |||
|  |  +-----+ +-----+ +-----+ +-----+          |  |  | Morrison Home              |||
|  |                                           |  |  | Est: 3h                    |||
|  |  Status: [All v]                          |  |  | [=] drag                   |||
|  |  [X] Scheduled  [ ] In Progress           |  |  +----------------------------+||
|  |  [ ] Completed  [ ] On Hold               |  |                                ||
|  |                                           |  |  +----------------------------+||
|  +-------------------------------------------+  |  | Plumbing Repair            |||
|                                                 |  | Chen Residence             |||
|  +-- WEEK VIEW: Jan 6-12, 2026 --------------+  |  | Est: 2h                    |||
|  |                                           |  |  | [=] drag                   |||
|  |  +-----+-----+-----+-----+-----+-----+-----+  +----------------------------+||
|  |  | Mon | Tue | Wed | Thu | Fri | Sat | Sun |  |                                ||
|  |  |  6  |  7  |  8  |  9  | 10  | 11  | 12  |  |  +----------------------------+||
|  |  +-----+-----+-----+-----+-----+-----+-----+  |  | Battery Install             |||
|  |  |     |     |     |     |     |     |     |  |  | Park Office                |||
|  |  | 8AM |     | 8AM |     | 7AM |     |     |  |  | Est: 4h                    |||
|  |  |[###]|     |[###]|     |[###]|     |     |  |  | [=] drag                   |||
|  |  |Bath |     |Kitch|     |Kitch|     |     |  |  +----------------------------+||
|  |  |Reno |     |Inst |     |Inst |     |     |  |                                ||
|  |  |     |     |     |     |     |     |     |  |  5 unscheduled jobs            ||
|  |  | 1PM | 9AM | 1PM | 9AM | 9AM | 9AM |     |  |                                ||
|  |  |[---]|[---]|[---]|[---]|[---]|[---]|     |  +--------------------------------+|
|  |  |Wind |Insp |HVAC |Cab  |Bath |Foll |     |                                   |
|  |  |Inst |ectn |Maint|Inst |Reno |owUp |     |                                   |
|  |  |     |     |     |     |     |     |     |                                   |
|  |  | 4PM |     |     | 2PM | 1PM |     |     |                                   |
|  |  |[---]|     |     |[---]|[---]|     |     |                                   |
|  |  |Meet |     |     |Plmb |Wind |     |     |                                   |
|  |  |     |     |     |     |Inst |     |     |                                   |
|  |  +-----+-----+-----+-----+-----+-----+-----+                                   |
|  |                                           |                                    |
|  +-------------------------------------------+                                    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  Legend: [###] In Progress  [---] Scheduled  [***] Completed  [!!!] On Hold       |
+-----------------------------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+ - Full Calendar)

### Month View with Drag-Drop

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Jobs Calendar                                                    [+ Schedule Job]     |
| Customers   |  =================================================================================     |
| Orders      |                                                                                        |
| Products    |  +-- FILTERS -----------------------------------------------------------------------+ |
| Jobs <      |  |                                                                                  | |
|  > List     |  |  Technicians:                          Status:                 Date Range:       | |
|  > Calendar<|  |  [X] Mike [X] Sarah [ ] Bob [ ] Lisa   [X] All [Scheduled][InProg][Complete]   | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- CALENDAR (Month View) --------------------------+  +-- UNSCHEDULED JOBS --------+|
|             |  |                                                   |  |                            ||
|             |  |  < January 2026 >                   [Day][Week][Mo]|  |  Drag to schedule          ||
|             |  |                                                   |  |                            ||
|             |  |  +---+---+---+---+---+---+---+                     |  |  +------------------------+||
|             |  |  |Mon|Tue|Wed|Thu|Fri|Sat|Sun|                     |  |  | [=] Inverter Install    |||
|             |  |  +---+---+---+---+---+---+---+                     |  |  |     Morrison Home      |||
|             |  |  |   |   |   | 1 | 2 | 3 | 4 |                     |  |  |     Est: 3h            |||
|             |  |  |   |   |   |   |[2]|   |   |                     |  |  +------------------------+||
|             |  |  +---+---+---+---+---+---+---+                     |  |                            ||
|             |  |  | 5 | 6 | 7 | 8 | 9 |10 |11 |                     |  |  +------------------------+||
|             |  |  |   |[2]|[1]|[2]|[3]|[3]|[1]|                     |  |  | [=] Plumbing Repair    |||
|             |  |  +---+---+---+---+---+---+---+                     |  |  |     Chen Residence     |||
|             |  |  |12 |13 |14 |15 |16 |17 |18 |                     |  |  |     Est: 2h            |||
|             |  |  |   |[1]|[2]|[1]|[2]|[1]|   |                     |  |  +------------------------+||
|             |  |  +---+---+---+---+---+---+---+                     |  |                            ||
|             |  |  |19 |20 |21 |22 |23 |24 |25 |                     |  |  +------------------------+||
|             |  |  |   |[2]|[1]|[2]|[1]|   |   |                     |  |  | [=] Battery Install     |||
|             |  |  +---+---+---+---+---+---+---+                     |  |  |     Park Office        |||
|             |  |  |26 |27 |28 |29 |30 |31 |   |                     |  |  |     Est: 4h            |||
|             |  |  |   |[1]|[2]|[1]|[1]|   |   |                     |  |  +------------------------+||
|             |  |  +---+---+---+---+---+---+---+                     |  |                            ||
|             |  |                                                   |  |  +------------------------+||
|             |  |  [#] = job count for day                          |  |  | [=] HVAC Inspection    |||
|             |  |  Click day to expand                               |  |  |     Tech Inc          |||
|             |  |                                                   |  |  |     Est: 1h            |||
|             |  +---------------------------------------------------+  |  +------------------------+||
|             |                                                         |                            ||
|             |                                                         |  5 unscheduled jobs        ||
|             |                                                         +----------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Day Expanded View (Click on Day)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Jobs <      |  Jobs Calendar > Friday, January 10, 2026                        [+ Schedule Job]      |
|  > Calendar<|  =================================================================================     |
|             |                                                                                        |
|             |  +-- DAY SCHEDULE ------------------------------------------------------------------- +|
|             |  |                                                                                    ||
|             |  |  +--- Mike Johnson ---------+  +--- Sarah Williams -----+  +--- Unassigned ------+ ||
|             |  |  |                          |  |                        |  |                     | ||
|             |  |  | 7:00 AM                  |  | 7:00 AM                |  | DROP ZONE           | ||
|             |  |  | +----------------------+ |  | +--------------------+ |  |                     | ||
|             |  |  | | Kitchen Install      | |  | | Kitchen Install    | |  | Drag jobs here     | ||
|             |  |  | | Acme Corp            | |  | | Acme Corp          | |  | to schedule         | ||
|             |  |  | | 7:00 - 9:00 AM       | |  | | 7:00 - 9:00 AM     | |  |                     | ||
|             |  |  | | [In Progress]        | |  | | [In Progress]      | |  |                     | ||
|             |  |  | +----------------------+ |  | +--------------------+ |  |                     | ||
|             |  |  |                          |  |                        |  |                     | ||
|             |  |  | 9:00 AM                  |  | 9:00 AM                |  |                     | ||
|             |  |  | +----------------------+ |  |                        |  |                     | ||
|             |  |  | | Bathroom Reno        | |  |                        |  |                     | ||
|             |  |  | | Tech Inc             | |  |                        |  |                     | ||
|             |  |  | | 9:00 - 12:00 PM      | |  |                        |  |                     | ||
|             |  |  | | [Scheduled]          | |  |                        |  |                     | ||
|             |  |  | +----------------------+ |  |                        |  |                     | ||
|             |  |  |                          |  |                        |  |                     | ||
|             |  |  | 12:00 PM                 |  | 12:00 PM               |  |                     | ||
|             |  |  |                          |  |                        |  |                     | ||
|             |  |  | 1:00 PM                  |  | 1:00 PM                |  |                     | ||
|             |  |  |                          |  | +--------------------+ |  |                     | ||
|             |  |  |                          |  | | Battery Install     | |  |                     | ||
|             |  |  |                          |  | | Johnson Home       | |  |                     | ||
|             |  |  |                          |  | | 1:00 - 4:00 PM     | |  |                     | ||
|             |  |  |                          |  | | [Scheduled]        | |  |                     | ||
|             |  |  |                          |  | +--------------------+ |  |                     | ||
|             |  |  |                          |  |                        |  |                     | ||
|             |  |  | 4:00 PM                  |  | 4:00 PM                |  |                     | ||
|             |  |  | 5:00 PM                  |  | 5:00 PM                |  |                     | ||
|             |  |  +---------------------------+  +-----------------------+  +--------------------+ ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Drag-Drop Interactions

### Drag from Unscheduled Sidebar

```
+-- DRAG INITIATION -----------------------------------------+
|                                                            |
|  1. User clicks and holds job card in sidebar              |
|                                                            |
|  2. Visual feedback:                                       |
|     - Card lifts with shadow                               |
|     - Cursor changes to grab                               |
|     - Original card shows dashed outline                   |
|                                                            |
|  3. Dragging over calendar:                                |
|     - Valid drop zones highlight                           |
|     - Time slot shows preview                              |
|     - Invalid zones dim                                    |
|                                                            |
|  +------------------------------------------------------+  |
|  |                                                      |  |
|  |  |Fri 10|                                            |  |
|  |  +------+                                            |  |
|  |  | 7AM  |     +====================+                 |  |
|  |  |[####]|     || Inverter Install  ||  <- Drag ghost  |  |
|  |  |      |     || 3h estimated     ||                 |  |
|  |  | 10AM |     +====================+                 |  |
|  |  |[    ]| <- Drop zone highlighted (green border)    |  |
|  |  |      |                                            |  |
|  |  | 1PM  |                                            |  |
|  |  |[----]|                                            |  |
|  |  +------+                                            |  |
|  |                                                      |  |
|  +------------------------------------------------------+  |
|                                                            |
|  4. On drop:                                               |
|     - Schedule dialog opens                                |
|     - Confirm time, duration, assignee                     |
|     - Job moves from sidebar to calendar                   |
|                                                            |
+------------------------------------------------------------+
```

### Schedule Confirmation Dialog

```
+-- SCHEDULE JOB DIALOG --------------------------------+
|                                                       |
|  +---------------------------------------------------+|
|  |                                                   ||
|  |  Schedule Job                             [X]     ||
|  |  -----------------------------------------------  ||
|  |                                                   ||
|  |  Inverter Installation - Morrison Home             ||
|  |                                                   ||
|  |  Date                                             ||
|  |  +---------------------------------------------+  ||
|  |  | [cal] Friday, January 10, 2026          [v] |  ||
|  |  +---------------------------------------------+  ||
|  |                                                   ||
|  |  Start Time                  Duration             ||
|  |  +-------------------+  +-------------------+     ||
|  |  | 10:00 AM      [v] |  | 3 hours       [v] |     ||
|  |  +-------------------+  +-------------------+     ||
|  |                                                   ||
|  |  End Time: 1:00 PM                                ||
|  |                                                   ||
|  |  Assign To                                        ||
|  |  +---------------------------------------------+  ||
|  |  | [X] Mike Johnson                            |  ||
|  |  | [ ] Sarah Williams                          |  ||
|  |  | [ ] Bob Smith                               |  ||
|  |  +---------------------------------------------+  ||
|  |                                                   ||
|  |  [!] Mike has another job 9:00-12:00             ||
|  |      Consider adjusting time                      ||
|  |                                                   ||
|  |  +---------------------------------------------+  ||
|  |  |                                             |  ||
|  |  |            [SCHEDULE JOB]                   |  || <- Primary
|  |  |                                             |  ||
|  |  +---------------------------------------------+  ||
|  |                                                   ||
|  +---------------------------------------------------+|
|                                                       |
+-------------------------------------------------------+
```

### Reschedule Existing Job (Drag on Calendar)

```
+-- RESCHEDULE FLOW -----------------------------------------+
|                                                            |
|  1. User clicks and drags scheduled job to new time/date   |
|                                                            |
|  2. Visual feedback:                                       |
|     - Job card becomes semi-transparent                    |
|     - Drag ghost follows cursor                            |
|     - New position shows dashed preview                    |
|                                                            |
|  3. On drop:                                               |
|     - Confirmation toast appears                           |
|     - "Job rescheduled to Jan 11, 10:00 AM [UNDO]"         |
|     - Undo available for 5 seconds                         |
|                                                            |
|  4. Optimistic update:                                     |
|     - Calendar updates immediately                         |
|     - Server call in background                            |
|     - If fails, revert with error toast                    |
|                                                            |
+------------------------------------------------------------+
```

---

## Job Card Design

### Calendar Job Card (Compact)

```
+-- JOB CARD STATES -----------------------------------------+
|                                                            |
|  SCHEDULED (Gray):                                         |
|  +------------------------------------------------------+  |
|  | Kitchen Install - Acme Corp                          |  |
|  | 7:00 AM - 9:00 AM | Mike, Sarah                      |  |
|  +------------------------------------------------------+  |
|                                                            |
|  IN PROGRESS (Blue):                                       |
|  +======================================================+  |
|  || Kitchen Install - Acme Corp                        ||  |
|  || 7:00 AM - 9:00 AM | Mike, Sarah         [running]  ||  |
|  +======================================================+  |
|                                                            |
|  COMPLETED (Green):                                        |
|  +------------------------------------------------------+  |
|  | Kitchen Install - Acme Corp              [X]         |  |
|  | 7:00 AM - 9:00 AM | Mike, Sarah                      |  |
|  +------------------------------------------------------+  |
|                                                            |
|  ON HOLD (Orange):                                         |
|  +------------------------------------------------------+  |
|  | Kitchen Install - Acme Corp              [!]         |  |
|  | 7:00 AM - 9:00 AM | Mike, Sarah                      |  |
|  +------------------------------------------------------+  |
|                                                            |
+------------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Calendar grid | role="grid" | Arrow keys navigate | - |
| Date cell | role="gridcell" | Enter to select | Full cell |
| Job card | role="button" | Enter to open | 44px min |
| Drag handle | aria-label="Drag to reschedule" | Alt+Arrow | 48px |
| View toggle | role="tablist" | Tab, Arrow | 44px |
| Filter checkbox | role="checkbox" | Space | 44px |
| Unscheduled list | role="list" | Tab through | - |

---

## Keyboard Navigation

```
+-- KEYBOARD CONTROLS ---------------------------------------+
|                                                            |
|  CALENDAR NAVIGATION:                                      |
|  - Arrow keys: Move between days                           |
|  - Page Up/Down: Previous/next month                       |
|  - Home/End: First/last day of month                       |
|  - Enter: Select day, open day view                        |
|                                                            |
|  JOB CARDS:                                                |
|  - Tab: Navigate between jobs on selected day              |
|  - Enter: Open job details                                 |
|  - Space: Toggle job selection (for bulk actions)          |
|  - Delete: Unschedule job (with confirmation)              |
|                                                            |
|  DRAG ALTERNATIVE:                                         |
|  - R: Open reschedule dialog for focused job               |
|  - Allows date/time selection via form                     |
|                                                            |
+------------------------------------------------------------+
```

---

## Offline Behavior

```
+-- OFFLINE MODE --------------------------------------------+
|                                                            |
|  Calendar viewing:                                         |
|  - Cached jobs display normally                            |
|  - "Offline - viewing cached data" banner                  |
|                                                            |
|  Scheduling/Rescheduling:                                  |
|  - Changes queue for sync                                  |
|  - Dashed border on modified jobs                          |
|  - Toast: "Change queued. Will sync when online."          |
|                                                            |
|  When back online:                                         |
|  - Auto-sync queued changes                                |
|  - Conflict detection if server changed                    |
|  - Resolution dialog if conflicts exist                    |
|                                                            |
+------------------------------------------------------------+
```

---

## Component Mapping

| Wireframe Element | React Component | Library |
|-------------------|-----------------|---------|
| Calendar view | JobCalendar | FullCalendar or react-big-calendar |
| Day view | DaySchedule | - |
| Week view | WeekSchedule | - |
| Month view | MonthCalendar | - |
| Job card | CalendarJobCard | Card |
| Unscheduled sidebar | UnscheduledJobsSidebar | - |
| Technician filter | TechnicianFilter | Checkbox, Badge |
| Schedule dialog | ScheduleJobDialog | Dialog |
| View toggles | CalendarViewTabs | Tabs |
| Drag overlay | DragOverlay | dnd-kit |

---

## Files to Create/Modify

- src/routes/_authed/jobs/calendar.tsx (create)
- src/components/domain/jobs/job-calendar.tsx (create)
- src/components/domain/jobs/calendar-job-card.tsx (create)
- src/components/domain/jobs/unscheduled-jobs-sidebar.tsx (create)
- src/components/domain/jobs/schedule-job-dialog.tsx (create)
- src/components/domain/jobs/technician-filter.tsx (create)
- src/server/functions/jobs.ts (modify: add rescheduleJob function)
