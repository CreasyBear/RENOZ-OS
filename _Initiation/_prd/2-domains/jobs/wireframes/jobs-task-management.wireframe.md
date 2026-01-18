# Jobs Domain Wireframe: Task Management (DOM-JOBS-001c)

**Story ID:** DOM-JOBS-001c
**Component Type:** SortableList with DetailPanel integration
**Aesthetic:** Rugged Utilitarian - designed for harsh field conditions
**Primary Device:** Mobile (field technicians)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Sortable List
- **Pattern**: RE-UI Sortable
- **Reference**: `_reference/.reui-reference/registry/default/ui/sortable.tsx`
- **Features**:
  - Drag-to-reorder tasks with long-press activation (300ms)
  - Visual elevation during drag with haptic feedback
  - Drop zone indicators between tasks

### Checkbox with States
- **Pattern**: RE-UI Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Quick tap-to-complete with undo toast (5 second window)
  - State visualization: pending (empty), in-progress (filled circle), complete (checkmark), blocked (red X)
  - Large 28px checkbox for field use

### Progress Indicator
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Bold task completion progress bar (4/7 complete, 57%)
  - Real-time updates on task state changes
  - Visual budget tracking with estimated time remaining

### Sheet for Task Details
- **Pattern**: RE-UI Sheet (mobile bottom sheet)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - 80% height bottom sheet for "Add Task" form
  - Drag handle for dismissal
  - Priority selection with toggle buttons

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `jobTasks` table in `renoz-v2/lib/schema/job-tasks.ts` | NOT CREATED |
| **Server Functions Required** | `createJobTask`, `updateJobTask`, `deleteJobTask`, `reorderJobTasks` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-001a (schema), DOM-JOBS-001b (server functions) | PENDING |

### Existing Schema Available
- `jobAssignments` in `renoz-v2/lib/schema/job-assignments.ts` (basic job assignment)
- `jobPhotos` in `renoz-v2/lib/schema/job-assignments.ts` (photo uploads)

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **Users**: Field technicians (installers with `userType: 'installer'`)
- **Job Types**: Battery installation, Inverter install, Full system commissioning, Warranty service
- **Typical Jobs**: Residential (1-2 days), Commercial (3-5 days), Large commercial (1-2 weeks)
- **Terminology**: Use generic terms, NOT branded product names (e.g., "Battery System" not "PowerWall")

---

## Design Principles for Field Use

- **Touch targets:** Minimum 44px (prefer 48px for primary actions)
- **High contrast:** Dark text on light backgrounds, clear status colors
- **One-handed operation:** Primary actions reachable by thumb
- **Glove-friendly:** Extra padding, forgiving hit areas
- **Outdoor visibility:** No subtle grays, bold typography
- **Offline indicators:** Clear sync status on all actions

---

## Mobile Wireframe (Primary - 375px)

### Task List View

```
+=========================================+
| < Job #JOB-1234                    [*]  | <- Sync indicator (green=synced)
| Install 10kWh battery system            |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] | <- Scrollable tabs
| ======================                  |
+-----------------------------------------+
|                                         |
|  TASK PROGRESS                          |
|  +-------------------------------------+|
|  | ############............  4/7 (57%) || <- Bold progress
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [X] Site assessment                 || <- 48px row height
|  |     Completed - 2h ago              ||
|  |                            <- SWIPE || <- Swipe hint
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [X] Electrical prep                 ||
|  |     Completed - 1h ago              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [*] Battery mounting          [!]   || <- In progress, priority flag
|  |     In Progress - Started 30m ago   ||
|  |     ============================    || <- Highlighted current
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Inverter install                ||
|  |     Pending - Due today             ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] BMS configuration               ||
|  |     Pending                         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [X] Grid connection           [!]   || <- Blocked status
|  |     BLOCKED - Waiting on permit     ||
|  |     ############################    || <- Red/orange blocked
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Customer handover               ||
|  |     Pending                         ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|        +---------------------+          |
|        |    [+] ADD TASK     |          | <- 56px height FAB
|        |                     |          |
|        +---------------------+          |
|                                         |
+=========================================+
```

### Task Card States

```
+-- PENDING ------------------------------+
|  +------------------------------------+ |
|  | [ ] Task name                      | |  <- Empty checkbox, 24px
|  |     Pending - Due Jan 15           | |  <- Muted text
|  |     [=]                     SWIPE> | |  <- Drag handle, swipe hint
|  +------------------------------------+ |
|  Background: white                      |
|  Border-left: none                      |
+-----------------------------------------+

+-- IN PROGRESS --------------------------+
|  +------------------------------------+ |
|  | [*] Task name                      | |  <- Blue filled circle
|  |     In Progress - 30m              | |  <- Active timer
|  |     [=]                     SWIPE> | |
|  +------------------------------------+ |
|  Background: blue-50                    |
|  Border-left: 4px solid blue-500        |
+-----------------------------------------+

+-- COMPLETED ----------------------------+
|  +------------------------------------+ |
|  | [X] Task name                      | |  <- Green checkmark
|  |     Completed - 2h ago             | |  <- Strikethrough optional
|  |     [=]                     SWIPE> | |
|  +------------------------------------+ |
|  Background: green-50                   |
|  Border-left: 4px solid green-500       |
+-----------------------------------------+

+-- BLOCKED ------------------------------+
|  +------------------------------------+ |
|  | [!] Task name                 [!]  | |  <- Red X, warning icon
|  |     BLOCKED - Reason here          | |  <- ALL CAPS, red text
|  |     [=]                     SWIPE> | |
|  +------------------------------------+ |
|  Background: red-50                     |
|  Border-left: 4px solid red-500         |
+-----------------------------------------+
```

### Swipe Actions (48px reveal)

```
+-------------------------------------------------------------+
|                                                             |
|  <- SWIPE LEFT reveals:                                     |
|  +------------------------------------+-------+------------+|
|  | [*] Battery mounting          | EDIT  |  COMPLETE  ||
|  |     In Progress                    | [pen] |    [X]     ||
|  |                                    | gray  |   green    ||
|  +------------------------------------+-------+------------+|
|                                                             |
|  <- SWIPE RIGHT reveals:                                    |
|  +------------+--------------------------------------------+|
|  |   BLOCK    | [*] Battery mounting                  ||
|  |    [!]     |     In Progress                            ||
|  |   orange   |                                            ||
|  +------------+--------------------------------------------+|
|                                                             |
+-------------------------------------------------------------+
```

### Quick Task Completion (Tap Checkbox)

```
+-- TAP TO COMPLETE -----------------------------------+
|                                                     |
|  User taps checkbox:                                |
|  +-----------------------------------------------+  |
|  | [  ]  ->  [X]                                 |  |
|  |  |                                            |  |
|  | Haptic feedback                               |  |
|  | Green flash                                   |  |
|  | Card slides up with checkmark animation       |  |
|  | Progress bar updates                          |  |
|  | "Task completed" toast (bottom)               |  |
|  +-----------------------------------------------+  |
|                                                     |
|  UNDO action available for 5 seconds:               |
|  +-----------------------------------------------+  |
|  | X Task completed              [UNDO]          |  | <- 48px toast
|  +-----------------------------------------------+  |
|                                                     |
+-----------------------------------------------------+
```

### Add Task Dialog (Bottom Sheet - 80% height)

```
+=========================================+
| ====================================    | <- Drag handle
|                                         |
|  ADD TASK                      [X]      | <- 48px close button
|  -----------------------------------    |
|                                         |
|  Task Title *                           |
|  +-------------------------------------+|
|  |                                     || <- 48px input height
|  +-------------------------------------+|
|                                         |
|  Description                            |
|  +-------------------------------------+|
|  |                                     ||
|  |                                     || <- 96px textarea
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Due Date                               |
|  +------------------------------+       |
|  | [cal] Select date...         |       | <- Native date picker
|  +------------------------------+       |
|                                         |
|  Assign To                              |
|  +------------------------------+       |
|  | [user] Select team member... | [v]   | <- Dropdown
|  +------------------------------+       |
|                                         |
|  Priority                               |
|  +----------+ +----------+ +----------+ |
|  |  Normal  | |   High   | |  Urgent  | | <- Toggle buttons
|  |    ( )   | |    ( )   | |    ( )   | |   48px height
|  +----------+ +----------+ +----------+ |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |           [ADD TASK]                || <- 56px primary button
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
| ======================                  |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |    [list]   |              |
|            |             |              |
|            +-------------+              |
|                                         |
|         NO TASKS YET                    |
|                                         |
|   Break this job into manageable        |
|   tasks to track progress and           |
|   keep your team aligned.               |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |     [+] ADD FIRST TASK      |       | <- 56px CTA
|   |                             |       |
|   +-----------------------------+       |
|                                         |
|                                         |
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
| ======================                  |
+-----------------------------------------+
|                                         |
|  TASK PROGRESS                          |
|  +-------------------------------------+|
|  | ..................................... || <- Shimmer animation
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [.] .......................         ||
|  |     .................               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [.] ......................          ||
|  |     .............                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [.] ...................             ||
|  |     ..................              ||
|  +-------------------------------------+|
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
| ====================                                                  |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- TASK PROGRESS ------------------+  +-- QUICK STATS -------------+|
|  |                                   |  |                            ||
|  |  ############..........  4/7      |  |  Completed: 4              ||
|  |  57% Complete                     |  |  In Progress: 1            ||
|  |                                   |  |  Blocked: 1                ||
|  +-----------------------------------+  |  Pending: 1                ||
|                                         +----------------------------+|
|                                                                       |
|  +-- TASK LIST --------------------------------+  +-- TASK DETAIL ---+|
|  |                                             |  |                  ||
|  | +------------------------------------------+|  | Install base     ||
|  | | [X] Remove old inverters                  ||  | inverters         ||
|  | |     Completed - Mike - 2h ago            ||  |                  ||
|  | +------------------------------------------+|  | Status:          ||
|  |                                             |  | [* In Progress]  ||
|  | +------------------------------------------+|  |                  ||
|  | | [X] Disconnect plumbing                  ||  | Assigned:        ||
|  | |     Completed - Mike - 1h ago            ||  | Mike Johnson     ||
|  | +------------------------------------------+|  |                  ||
|  |                                             |  | Started:         ||
|  | +------------------------------------------+|  | 30 min ago       ||
|  | | [*] Battery mounting          [!]  <|  |                  ||
|  | |     In Progress - Mike - 30m             ||  | Description:     ||
|  | |     ==================================   ||  | Install all      ||
|  | +------------------------------------------+|  | lower inverter    ||
|  |                                             |  | units per        ||
|  | +------------------------------------------+|  | layout plan.     ||
|  | | [ ] Install upper inverters               ||  |                  ||
|  | |     Pending - Due today                  ||  | [Edit Task]      ||
|  | +------------------------------------------+|  | [Mark Complete]  ||
|  |                                             |  | [Mark Blocked]   ||
|  | +------------------------------------------+|  |                  ||
|  | | [!] Electrical inspection          [!]   ||  +------------------+|
|  | |     BLOCKED - Waiting on permit          ||                      |
|  | +------------------------------------------+|                      |
|  |                                             |                      |
|  | +------------------------------------------+|                      |
|  | | [ ] Final cleanup                        ||                      |
|  | |     Pending                              ||                      |
|  | +------------------------------------------+|                      |
|  |                                             |                      |
|  |              [+ ADD TASK]                   |                      |
|  +---------------------------------------------+                      |
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
|             |  ====================                                                                  |
|             |                                                                                        |
|             |  +-- TASK MANAGEMENT ------------------------------------------------------------------|
|             |  |                                                                                     |
|             |  |  +-- Progress -------------------------------------------------+                    |
|             |  |  |                                                             |                    |
|             |  |  |   ########################..............  4/7 Complete      |                    |
|             |  |  |   57% - Estimated completion: 2h remaining                  |                    |
|             |  |  |                                                             |                    |
|             |  |  +-------------------------------------------------------------+                    |
|             |  |                                                                                     |
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | [ ]  Status | Task                  | Assignee   | Due      | Actions          ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | [=] [X]     | Remove old inverters   | Mike J.    | Jan 10   | [...]            ||
|             |  |  | [=] [X]     | Disconnect plumbing   | Mike J.    | Jan 10   | [...]            ||
|             |  |  | [=] [*]     | Battery mounting | Mike J.    | Jan 10   | [...]            ||
|             |  |  | [=] [ ]     | Install upper cabs    | Sarah K.   | Jan 10   | [...]            ||
|             |  |  | [=] [ ]     | Connect plumbing      | Mike J.    | Jan 11   | [...]            ||
|             |  |  | [=] [!]     | Electrical inspect    | External   | Jan 11   | [...]            ||
|             |  |  | [=] [ ]     | Final cleanup         | Team       | Jan 12   | [...]            ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |                                                                                     |
|             |  |  +-- Inline Add Task ----------------------------------------------------------+    |
|             |  |  | [+ Add task title...                                   ] [Add Task]        |    |
|             |  |  +----------------------------------------------------------------------------+    |
|             |  |                                                                                     |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction Specifications

### Drag-Drop Reordering (Mobile)

```
+-- DRAG INITIATION -----------------------------------------+
|                                                            |
|  Trigger: Long-press on task card (300ms)                  |
|  OR: Press-hold drag handle [=]                            |
|                                                            |
|  Visual feedback:                                          |
|  - Card lifts with subtle shadow                           |
|  - Haptic feedback (medium)                                |
|  - Original position shows dashed outline                  |
|                                                            |
|  +------------------------------------------------------+  |
|  | + - - - - - - - - - - - - - - - - - - - - - - - - +  |  |
|  | | (original position)                             |  |  |
|  | + - - - - - - - - - - - - - - - - - - - - - - - - +  |  |
|  |                                                      |  |
|  | +--------------------------------------------------+ |  |
|  | | [ ] Connect plumbing              *              | |  | <- Drop zone
|  | +--------------------------------------------------+ |  |
|  |                                                      |  |
|  |      +==========================================+    |  |
|  |      || [*] Battery mounting    [green]   ||    |  | <- Dragged (elevated)
|  |      ||     In Progress                        ||    |  |
|  |      +==========================================+    |  |
|  |                                                      |  |
|  | +--------------------------------------------------+ |  |
|  | | [ ] Final cleanup                                | |  |
|  | +--------------------------------------------------+ |  |
|  +------------------------------------------------------+  |
|                                                            |
|  Drop: Release finger                                      |
|  - Card animates to new position                           |
|  - Haptic feedback (light)                                 |
|  - Server sync initiated (optimistic)                      |
|  - Position numbers update                                 |
|                                                            |
+------------------------------------------------------------+
```

### Keyboard Navigation (Desktop)

```
+-- KEYBOARD CONTROLS ---------------------------------------+
|                                                            |
|  FOCUS:                                                    |
|  - Tab: Move between tasks                                 |
|  - Shift+Tab: Move backwards                               |
|                                                            |
|  ACTIONS:                                                  |
|  - Enter: Toggle task completion                           |
|  - Space: Open task edit dialog                            |
|  - E: Edit task (when focused)                             |
|  - Delete/Backspace: Delete task (with confirmation)       |
|                                                            |
|  REORDERING:                                               |
|  - Ctrl+Up: Move task up                                   |
|  - Ctrl+Down: Move task down                               |
|                                                            |
|  SCREEN READER:                                            |
|  - Announces: "Task 3 of 7: Battery mounting,         |
|    status in progress, assigned to Mike Johnson"           |
|  - On completion: "Task completed. 5 of 7 tasks done"      |
|  - aria-live region for status changes                     |
|                                                            |
+------------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Task checkbox | role="checkbox", aria-checked | Enter to toggle | 44x44px min |
| Task card | role="listitem" | Tab focus | Full card tappable |
| Drag handle | aria-label="Reorder task" | Ctrl+Arrow | 48x48px |
| Add button | aria-label="Add new task" | Enter to activate | 56px height |
| Progress bar | role="progressbar", aria-valuenow | - | - |
| Status badge | aria-label="Status: {status}" | - | - |

---

## Offline Behavior

```
+-- OFFLINE MODE --------------------------------------------+
|                                                            |
|  Header indicator changes:                                 |
|  [*] -> [ ] gray with "Offline" label                      |
|                                                            |
|  Task completion:                                          |
|  - Works locally, queued for sync                          |
|  - Visual indicator: dotted border on modified tasks       |
|  - Toast: "Saved offline. Will sync when online."          |
|                                                            |
|  +------------------------------------------------------+  |
|  | + - - - - - - - - - - - - - - - - - - - - - - - - +  |  |
|  | : [X] Remove old inverters          [sync]        :  |  | <- Pending sync
|  | :     Completed - Pending sync                   :  |  |
|  | + - - - - - - - - - - - - - - - - - - - - - - - - +  |  |
|  +------------------------------------------------------+  |
|                                                            |
|  When back online:                                         |
|  - Auto-sync queued changes                                |
|  - Progress indicator in header                            |
|  - Conflict resolution if server changed                   |
|  - Toast: "All changes synced"                             |
|                                                            |
+------------------------------------------------------------+
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Task list | JobTasksList | - |
| Task card | TaskCard | Card |
| Task checkbox | TaskCheckbox | Checkbox |
| Progress bar | TaskProgress | Progress |
| Add task dialog | TaskDialog | Sheet (mobile), Dialog (desktop) |
| Swipe actions | SwipeableTaskCard | - (custom) |
| Empty state | EmptyState | - |
| Loading skeleton | TaskListSkeleton | Skeleton |

---

## Files to Create/Modify

- src/components/domain/jobs/job-tasks-list.tsx (create)
- src/components/domain/jobs/task-card.tsx (create)
- src/components/domain/jobs/task-dialog.tsx (create)
- src/components/domain/jobs/task-progress.tsx (create)
- src/routes/installer/jobs/$jobId.tsx (modify: add Tasks tab)
