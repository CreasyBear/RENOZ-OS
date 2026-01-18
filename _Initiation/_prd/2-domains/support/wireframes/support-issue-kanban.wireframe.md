# Support Issue Kanban Board Wireframe

**Story ID:** DOM-SUP-008
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Enhances existing `issues` | EXISTS |
| **Server Functions Required** | Status change with notes, bulk actions, duplicate detection | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-008 | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Support Types**: Warranty claims, service requests, product questions
- **Priority**: low, normal, high, urgent

---

## UI Patterns (Reference Implementation)

### Ticket List
- **Pattern**: RE-UI DataGrid with priority indicators
- **Features**:
  - Priority column with color-coded badges (High=orange, Medium=blue, Low=gray)
  - SLA countdown timer (red when breached, orange when at risk)
  - Assignee avatar column with user photo
  - Quick reply action button for instant response
  - Drag-and-drop between status columns
  - Bulk selection with checkbox column

### SLA Indicator
- **Pattern**: Countdown badge with status color
- **Features**:
  - Time remaining display ("45m left", "-2h overdue")
  - Color transitions: green (on track) → yellow (at risk < 25%) → red (breached)
  - "Breached" badge with duration when SLA exceeded
  - Pulsing animation on at-risk items
  - Paused state with dashed border when waiting on customer

### Card States
- **Pattern**: Visual hierarchy with status-specific styling
- **Features**:
  - Border-left color coding by priority
  - Background color for escalated items (orange-100)
  - SLA at-risk items get orange-50 background
  - Duplicate detection with yellow-50 background and dashed border
  - Compact card view for resolved items

---

## Overview

The Issue Kanban Board provides a visual workflow for managing support issues. This wireframe covers:
- Kanban board view by status
- Drag-drop status changes with note prompt
- Quick filters (my issues, unassigned, SLA at risk)
- Bulk actions (assign, change priority)
- Related issues linking
- Issue duplication detection

---

## Desktop View (1280px+)

### Main Kanban Board

```
+================================================================================+
| HEADER BAR                                                      [bell] [Joel v] |
+================================================================================+
|                                                                                 |
| Issue Board                                            [List View]  [+ New]     |
| Visual workflow for support issues                                              |
|                                                                                 |
+=== FILTER BAR (role="search") =================================================+
| +------------------------------------------------------------------------+     |
| | [magnifier] Search issues...                                           |     |
| +------------------------------------------------------------------------+     |
|                                                                                 |
| Quick Filters:                                                                  |
| [[My Issues]] [Unassigned] [SLA At Risk] [Escalated] [Clear All]                |
|                                                                                 |
| [Type v] [Priority v] [Assignee v] [Customer v]          Sort: [Priority v]     |
+=================================================================================+
|                                                                                 |
+=== KANBAN BOARD (role="region" aria-label="Issue board") =====================+
|                                                                                 |
| +-- OPEN --------+ +-- IN PROGRESS --+ +-- ON HOLD ----+ +-- ESCALATED ---+    |
| | (23)           | | (12)            | | (5)           | | (4)            |    |
| +----------------+ +-----------------+ +---------------+ +----------------+    |
| |                | |                 | |               | |                |    |
| | +============+ | | +=============+ | | +===========+ | | +============+ |    |
| | |ISS-1260   || | | |ISS-1255    || | | |ISS-1248  || | | |[!!!]       || |    |
| | |[!]SLA Risk|| | | |In Progress || | | |On Hold   || | | |ISS-1245   || |    |
| | |           || | | |            || | | |           || | | |VIP Cust.  || |    |
| | |Defective  || | | |Return req. || | | |Waiting on|| | | |High Pri.  || |    |
| | |product    || | | |process     || | | |customer  || | | |           || |    |
| | |           || | | |            || | | |           || | | |Inverter    || |    |
| | |Brisbane Solar Co  || | | |Beta Inc    || | | |Tech Ltd  || | | |damage     || |    |
| | |John D.    || | | |Sarah K.    || | | |Mike J.   || | | |           || |    |
| | |High       || | | |Medium      || | | |Low       || | | |Sarah M.   || |    |
| | |           || | | |            || | | |           || | | |Urgent     || |    |
| | +============+ | | +=============+ | | +===========+ | | +============+ |    |
| |                | |                 | |               | |                |    |
| | +------------+ | | +-------------+ | | +-----------+ | | +------------+ |    |
| | |ISS-1258   | | | |ISS-1252    | | | |ISS-1240   | | | |[!!!]       | |    |
| | |Warranty   | | | |Installation| | | |Pending    | | | |ISS-1238   | |    |
| | |claim      | | | |support     | | | |approval   | | | |Repeated   | |    |
| | |           | | | |            | | | |           | | | |issue      | |    |
| | |Global Co  | | | |StartupX    | | | |Micro Inc  | | | |           | |    |
| | |--         | | | |John D.     | | | |Sarah K.   | | | |John D.    | |    |
| | |Medium     | | | |Low         | | | |Medium     | | | |High       | |    |
| | +------------+ | | +-------------+ | | +-----------+ | | +------------+ |    |
| |                | |                 | |               | |                |    |
| | +------------+ | | +-------------+ | |               | |                |    |
| | |ISS-1256   | | | |ISS-1250    | | | [+ On Hold]   | | +----------------+    |
| | |Question   | | | |RMA process | | |               | |                      |
| | |about...   | | | |            | | +---------------+ | +-- RESOLVED ---+    |
| | |           | | | |Granite Plus| |                   | | (15 today)    |    |
| | |NewCo      | | | |Mike J.     | |                   | +---------------+    |
| | |Mike J.    | | | |Medium      | |                   | |               |    |
| | |Low        | | | +-------------+ |                   | | [Collapsed   |    |
| | +------------+ | |                 |                   | |  Show 15]    |    |
| |                | | [+ In Progress] |                   | |               |    |
| | [+ Open]       | +-----------------+                   | +---------------+    |
| +----------------+                                                              |
|                                                                                 |
+=================================================================================+

LEGEND:
[!!!]     = Escalated issue (orange badge)
[!]       = SLA at risk or breached (warning)
[+ Open]  = Quick add card to column
```

### Issue Card States

```
+-- STANDARD CARD ------------------------------+
| +==========================================+ |
| | ISS-1260                                 | |
| |                                          | |
| | Defective product - handle replacement   | |
| |                                          | |
| | ---------------------------------------- | |
| | Customer: Brisbane Solar Corporation     | |
| | Assignee: John Doe                       | |
| | Priority: [!] High                       | |
| | Type: Claim                              | |
| | ---------------------------------------- | |
| | [claim icon]  Created: 2h ago            | |
| +==========================================+ |
| Background: white                            |
| Border-left: 4px solid priority color        |
| (High = orange, Medium = blue, Low = gray)   |
+----------------------------------------------+

+-- SLA AT RISK CARD ---------------------------+
| +==========================================+ |
| | ISS-1260              [!] SLA AT RISK    | |
| |                        Resp: 45m left    | |
| | Defective product - handle replacement   | |
| |                                          | |
| | ---------------------------------------- | |
| | Customer: Brisbane Solar Corporation     | |
| | Assignee: John Doe                       | |
| | Priority: [!] High                       | |
| | ---------------------------------------- | |
| | [claim icon]  Created: 3h ago            | |
| +==========================================+ |
| Background: orange-50                        |
| Border: 2px solid orange-500                 |
| SLA badge pulses subtly                      |
+----------------------------------------------+

+-- ESCALATED CARD -----------------------------+
| +==========================================+ |
| | [!!!] ISS-1245                           | |
| | ESCALATED - VIP Customer                 | |
| |                                          | |
| | Inverter damage during delivery           | |
| |                                          | |
| | ---------------------------------------- | |
| | Customer: Premium Plus Inc               | |
| | Assignee: Sarah Manager                  | |
| | Priority: [!!!] Urgent                   | |
| | ---------------------------------------- | |
| | [claim icon]  Escalated: 1h ago          | |
| +==========================================+ |
| Background: orange-100                       |
| Border: 2px solid orange-600                 |
| Escalation badge prominent                   |
+----------------------------------------------+

+-- POTENTIAL DUPLICATE CARD -------------------+
| +==========================================+ |
| | ISS-1262              [?] Possible Dup   | |
| |                                          | |
| | Inverter hardware defective               | |
| |                                          | |
| | ---------------------------------------- | |
| | Customer: Brisbane Solar Corporation     | |
| | Similar to: ISS-1260                     | |
| | Assignee: --                             | |
| | ---------------------------------------- | |
| | [ Link as Related ]  [ Not Duplicate ]   | |
| +==========================================+ |
| Background: yellow-50                        |
| Dashed border                                |
+----------------------------------------------+
```

### Drag-Drop Status Change Dialog

```
+================================================================+
| Change Issue Status                                       [X]  |
+================================================================+
|                                                                |
|  Moving ISS-1260 from Open to In Progress                      |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  Add a note about this status change (optional):               |
|  +----------------------------------------------------------+  |
|  | Started investigating the defective product claim.       |  |
|  | Waiting for photos from customer.                        |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Update assignee?                                              |
|  +---------------------------------------------- v-----------+  |
|  | Keep current: John Doe                                    |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [ ] Notify customer of status change                          |
|                                                                |
|                       ( Cancel )  [ Confirm Move ]             |
+================================================================+
  Appears when card dropped in new column
  Cancel returns card to original position
```

### Bulk Actions Bar

```
+=== BULK ACTIONS (appears when cards selected) ===========================+
|                                                                          |
|  3 issues selected                                                       |
|                                                                          |
|  [ Assign To v ]  [ Change Priority v ]  [ Change Status v ]             |
|                                                                          |
|  [ Clear Selection ]                                              [X]    |
|                                                                          |
+==========================================================================+
  Appears above board when 1+ cards selected
  Sticky to bottom on scroll
```

### Related Issues Panel

```
+================================================================+
| Related Issues                                            [X]  |
+================================================================+
|                                                                |
|  ISS-1260: Defective product - handle replacement              |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  LINKED ISSUES                                                 |
|                                                                |
|  +----------------------------------------------------------+  |
|  | ISS-1245 - Inverter damage during delivery                |  |
|  | Relationship: Related (same product line)                |  |
|  | Status: Escalated  |  Assignee: Sarah M.                 |  |
|  |                                           [ Unlink ]     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +----------------------------------------------------------+  |
|  | ISS-1200 - Handle defect (resolved)                      |  |
|  | Relationship: Similar issue (resolved)                   |  |
|  | Status: Resolved  |  Resolution: Replacement sent        |  |
|  |                                           [ Unlink ]     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  POTENTIAL DUPLICATES                                          |
|                                                                |
|  +----------------------------------------------------------+  |
|  | ISS-1262 - Inverter hardware defective                    |  |
|  | Same customer, similar title (85% match)                 |  |
|  | Status: Open  |  Created: 30m ago                        |  |
|  |                                                          |  |
|  | [ Link as Related ]  [ Mark as Duplicate ]  [ Ignore ]   |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  + Link Another Issue                                          |
|                                                                |
+================================================================+
```

### Link Issue Dialog

```
+================================================================+
| Link Related Issue                                        [X]  |
+================================================================+
|                                                                |
|  Search for an issue to link:                                  |
|  +----------------------------------------------------------+  |
|  | [search] Search by ID or title...                        |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Recent issues from same customer:                             |
|  +----------------------------------------------------------+  |
|  | ( ) ISS-1245 - Inverter damage during delivery            |  |
|  | ( ) ISS-1200 - Handle defect (resolved)                  |  |
|  | (o) ISS-1180 - Installation question                     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Relationship Type *                                           |
|  +----------------------------------------------------------+  |
|  | ( ) Related - Same customer/product                       |  |
|  | (o) Similar - Similar symptoms/resolution                 |  |
|  | ( ) Duplicate - Same issue reported twice                 |  |
|  | ( ) Parent - This is caused by another issue              |  |
|  | ( ) Child - Another issue is caused by this               |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Notes (optional)                                              |
|  +----------------------------------------------------------+  |
|  | Both issues relate to inverter hardware quality            |  |
|  +----------------------------------------------------------+  |
|                                                                |
|                          ( Cancel )  [ Link Issue ]            |
+================================================================+
```

---

## Tablet View (768px)

### Kanban Board (Tablet - Horizontal Scroll)

```
+================================================================+
| Issue Board                              [List] [+]             |
+================================================================+
|                                                                 |
| [[My Issues]] [Unassigned] [SLA At Risk] [Clear]                |
|                                                                 |
| [Type v] [Priority v] [Assignee v]             [Search...]      |
|                                                                 |
+================================================================+
|                                                                 |
| <- Horizontal scroll for columns ->                             |
|                                                                 |
| +============================================================+  |
| | +-- OPEN ---+ +-- IN PROG -+ +-- ON HOLD + +-- ESCAL --+  |  |
| | | (23)      | | (12)       | | (5)       | | (4)       |  |  |
| | +-----------+ +------------+ +-----------+ +-----------+  |  |
| | |           | |            | |           | |           |  |  |
| | | +-------+ | | +--------+ | | +-------+ | | +-------+ |  |  |
| | | |ISS-   | | | |ISS-    | | | |ISS-   | | | |[!!!]  | |  |  |
| | | |1260   | | | |1255    | | | |1248   | | | |ISS-   | |  |  |
| | | |[!]SLA | | | |Return  | | | |Wait   | | | |1245   | |  |  |
| | | |Defect | | | |process | | | |cust   | | | |VIP    | |  |  |
| | | |Acme   | | | |Beta    | | | |Tech   | | | |Urgent | |  |  |
| | | |High   | | | |Medium  | | | |Low    | | | +-------+ |  |  |
| | | +-------+ | | +--------+ | | +-------+ | |           |  |  |
| | |           | |            | |           | | +-------+ |  |  |
| | | +-------+ | | +--------+ | |           | | |[!!!]  | |  |  |
| | | |ISS-   | | | |ISS-    | | |           | | |ISS-   | |  |  |
| | | |1258   | | | |1252    | | |           | | |1238   | |  |  |
| | | |Warr.  | | | |Install | | |           | | |Repeat | |  |  |
| | | +-------+ | | +--------+ | |           | | +-------+ |  |  |
| | |           | |            | |           | |           |  |  |
| | +-----------+ +------------+ +-----------+ +-----------+  |  |
| +============================================================+  |
|                                                                 |
| [Scroll indicator dots: o o * o o]                              |
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### Mobile Board (Swimlane View)

```
+================================+
| Issue Board              [=]   |
+================================+
|                                |
| <-swipe-> [OPEN] [IN PROG] .. |
|           ^active              |
+================================+
|                                |
| [[My Issues]] [At Risk]        |
|                                |
| [Filter v]        [Search...]  |
|                                |
+================================+
|                                |
| OPEN (23)                      |
|                                |
| +----------------------------+ |
| | ISS-1260        [!] SLA    | |
| |                            | |
| | Defective product          | |
| |                            | |
| | Brisbane Solar Co  |  John D.      | |
| | [!] High   |  2h ago       | |
| |                            | |
| | <-- swipe for actions -->  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ISS-1258                   | |
| |                            | |
| | Warranty claim             | |
| |                            | |
| | Global Co  |  --           | |
| | Medium     |  4h ago       | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ISS-1256                   | |
| |                            | |
| | Question about order       | |
| |                            | |
| | NewCo  |  Mike J.          | |
| | Low    |  5h ago           | |
| +----------------------------+ |
|                                |
| [Load More...]                 |
|                                |
+================================+
| [+] <- FAB for new issue       |
+================================+
```

### Mobile Card Swipe Actions

```
+================================+
|                                |
| <- SWIPE LEFT reveals:         |
| +----------------------------+ |
| | ISS-1260         [ASSIGN]  | |
| | Defective...     [PRIORITY]| |
| |                  [STATUS]  | |
| +----------------------------+ |
|                                |
| <- SWIPE RIGHT reveals:        |
| +----------------------------+ |
| |   [OPEN]        ISS-1260   | |
| |                 Defective  | |
| +----------------------------+ |
|   Opens issue detail           |
|                                |
+================================+
```

### Mobile Status Change Bottom Sheet

```
+================================+
| ============================== |
|                                |
| CHANGE STATUS             [X]  |
| =============================== |
|                                |
| ISS-1260                       |
| Defective product              |
|                                |
| Current: Open                  |
|                                |
| Move to:                       |
| +----------------------------+ |
| | ( ) Open                   | |
| | (o) In Progress            | |
| | ( ) On Hold                | |
| | ( ) Escalated              | |
| | ( ) Resolved               | |
| +----------------------------+ |
|                                |
| Add note:                      |
| +----------------------------+ |
| | Started investigation...   | |
| +----------------------------+ |
|                                |
| [ ] Notify customer            |
|                                |
| +----------------------------+ |
| |                            | |
| |      [ Confirm ]           | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### Mobile Quick Filters (Bottom Sheet)

```
+================================+
| ============================== |
|                                |
| FILTERS                   [X]  |
| =============================== |
|                                |
| Quick Filters                  |
| [x] My Issues                  |
| [ ] Unassigned                 |
| [x] SLA At Risk                |
| [ ] Escalated                  |
|                                |
| Type                           |
| +----------------------------+ |
| | All Types               v  | |
| +----------------------------+ |
|                                |
| Priority                       |
| +----------------------------+ |
| | All Priorities          v  | |
| +----------------------------+ |
|                                |
| Assignee                       |
| +----------------------------+ |
| | Anyone                  v  | |
| +----------------------------+ |
|                                |
| [Clear All]     [Apply]        |
|                                |
+================================+
```

---

## Duplicate Detection Alert

```
+-- DUPLICATE DETECTION BANNER (in-page alert) -------------------------+
|                                                                        |
|  [?] Potential duplicate detected                                      |
|                                                                        |
|  ISS-1262 may be a duplicate of ISS-1260                               |
|  - Same customer: Brisbane Solar Corporation                           |
|  - Similar title: "Inverter hardware defective" vs "Defective product" |
|  - Created 30 minutes apart                                            |
|                                                                        |
|  [ View Both ]  [ Link as Related ]  [ Mark as Duplicate ]  [ Dismiss ]|
|                                                                        |
+------------------------------------------------------------------------+
  Appears at top of board when duplicate detected
  Yellow background with dashed border
```

---

## Loading States

### Board Loading

```
+=== KANBAN BOARD (Loading) ============================================+
|                                                                       |
| +-- OPEN ---+ +-- IN PROG --+ +-- ON HOLD -+ +-- ESCALATED -+        |
| | [shimmer] | | [shimmer]   | | [shimmer]  | | [shimmer]    |        |
| +-----------+ +-------------+ +------------+ +--------------+        |
| |           | |             | |            | |              |        |
| | +~~~~~~~+ | | +~~~~~~~~~+ | | +~~~~~~~~+ | | +~~~~~~~~~~+ |        |
| | |shimmer| | | |shimmer  | | | |shimmer | | | |shimmer   | |        |
| | |       | | | |         | | | |        | | | |          | |        |
| | +~~~~~~~+ | | +~~~~~~~~~+ | | +~~~~~~~~+ | | +~~~~~~~~~~+ |        |
| |           | |             | |            | |              |        |
| | +~~~~~~~+ | | +~~~~~~~~~+ | |            | |              |        |
| | |shimmer| | | |shimmer  | | |            | |              |        |
| | +~~~~~~~+ | | +~~~~~~~~~+ | |            | |              |        |
| +-----------+ +-------------+ +------------+ +--------------+        |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Card Drag Processing

```
+==========================================+
| ISS-1260                                 |
|                                          |
| [spinner] Moving to In Progress...       |
|                                          |
+==========================================+
  Card shows spinner during status update
  Slight opacity reduction
  aria-busy="true"
```

---

## Empty States

### Empty Column

```
+-- ESCALATED (Empty) --------------------------------+
| (0)                                                 |
+----------------------------------------------------|
|                                                    |
|     [illustration]                                 |
|                                                    |
|     No escalated issues                            |
|                                                    |
|     Great work keeping issues                      |
|     from escalating!                               |
|                                                    |
+----------------------------------------------------+
```

### No Filter Results

```
+=== KANBAN BOARD (Empty) ============================================+
|                                                                     |
|                    [illustration]                                   |
|                                                                     |
|              No issues match your filters                           |
|                                                                     |
|    Try adjusting your filters or [ Clear All Filters ]              |
|                                                                     |
+=====================================================================+
```

---

## Error States

### Failed to Load Board

```
+=== KANBAN BOARD (Error) ============================================+
|                                                                     |
|  [!] Unable to load issue board                                     |
|                                                                     |
|  There was a problem loading the board.                             |
|  Please try again.                                                  |
|                                                                     |
|  [Retry]  [Switch to List View]                                     |
|                                                                     |
+=====================================================================+
```

### Failed to Move Card

```
+================================================================+
| [!] Move Failed                                                |
|                                                                |
| Could not move ISS-1260 to In Progress.                        |
| The issue has been returned to its original position.          |
|                                                                |
| [Dismiss]  [Try Again]                                         |
+================================================================+
  Toast notification
  Card animates back to original column
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// Kanban Board
<div
  role="region"
  aria-label="Issue kanban board"
>
  // Columns
  <div
    role="list"
    aria-label="Issue status columns"
  >
    <section
      role="listitem"
      aria-label="Open column, 23 issues"
    >
      <h2>Open (23)</h2>
      <div
        role="list"
        aria-label="Issues in Open status"
      >
        // Issue Cards
        <article
          role="listitem"
          aria-label="Issue ISS-1260, Defective product, High priority, SLA at risk"
          tabIndex={0}
          draggable="true"
          aria-grabbed={isDragging}
        >
          // Card content
        </article>
      </div>
    </section>
  </div>
</div>

// Quick Filters
<div role="group" aria-label="Quick filters">
  <button
    aria-pressed={myIssuesActive}
    aria-label="Show only my issues"
  >
    My Issues
  </button>
</div>

// Bulk Actions
<div
  role="toolbar"
  aria-label="Bulk actions for 3 selected issues"
>
  <button>Assign To</button>
  <button>Change Priority</button>
</div>
```

### Keyboard Navigation

```
Board Navigation:
1. Tab to filter bar elements
2. Tab to quick filter buttons (Enter to toggle)
3. Tab to first column
4. Arrow Right/Left to move between columns
5. Arrow Down/Up to navigate cards within column
6. Enter on card opens issue detail
7. Space to select card for bulk action
8. D to start drag mode

Drag Mode (Press D when card focused):
1. Arrow keys move card between columns/positions
2. Enter confirms drop (opens note dialog)
3. Escape cancels drag
4. Screen reader announces valid drop zones

Bulk Actions:
1. Select multiple cards with Space
2. Tab to bulk action bar
3. Tab between action buttons
4. Enter on button opens action menu
```

### Screen Reader Announcements

```
On board load:
  "Issue kanban board. 4 columns: Open 23 issues, In Progress 12 issues,
   On Hold 5 issues, Escalated 4 issues."

On filter toggle:
  "My Issues filter active. Showing 8 issues assigned to you."

On card focus:
  "Issue ISS-1260, Defective product, Brisbane Solar Corporation,
   High priority, SLA at risk with 45 minutes remaining.
   Press Enter to view, Space to select, D to drag."

On drag start:
  "ISS-1260 grabbed. Use arrow keys to move between columns.
   Press Enter to drop, Escape to cancel."

On column hover during drag:
  "Over In Progress column. 12 issues. Drop here to change status."

On drop:
  "ISS-1260 dropped in In Progress column.
   Status change dialog opened."

On status change:
  "ISS-1260 status changed from Open to In Progress.
   Note added. Card moved to In Progress column."

On duplicate detection:
  "Alert: Potential duplicate issue detected.
   ISS-1262 may be a duplicate of ISS-1260.
   Same customer, similar title."
```

---

## Animation Choreography

### Card Drag Animation

```
Drag Start Animation:

FRAME 1 (0ms):
  Card at rest in column

FRAME 2 (100ms):
  Card lifts with shadow (elevation 8)
  Slight rotation (2deg)
  Scale 1.02

FRAME 3 (100ms+):
  Card follows cursor
  Original position shows dashed placeholder

Drop Animation:

FRAME 1: Card over target column
FRAME 2 (0-150ms): Column header highlights
FRAME 3 (150-300ms): Card settles into position
FRAME 4 (300ms): Shadow reduces, rotation resets

Duration: 300ms
Easing: spring(1, 80, 10)
```

### Status Change Success

```
Card Status Update Animation:

FRAME 1 (0ms): Card in new column
FRAME 2 (0-150ms): Card border flashes green
FRAME 3 (150-300ms): Status badge updates
FRAME 4 (300-500ms): Subtle success glow fades

Duration: 500ms
Haptic: light success (mobile)
```

### Bulk Selection

```
Selection Animation:

On Space press:
FRAME 1: Card border becomes dashed
FRAME 2 (50ms): Selection checkmark appears
FRAME 3 (100ms): Card background tints blue

Bulk bar appears:
FRAME 1: Bar slides up from bottom
FRAME 2: Selected count animates in

Duration: 150ms per card, 200ms for bar
```

### Duplicate Alert Appearance

```
Alert Animation:

FRAME 1: Banner height 0
FRAME 2 (0-200ms): Slides down from top
FRAME 3 (200-350ms): Content fades in
FRAME 4 (350-500ms): Attention pulse (yellow glow)

Duration: 500ms
```

---

## Component Props Interface

```typescript
// Issue Card for Kanban
interface KanbanIssueCard {
  id: string;
  issueNumber: string; // ISS-1260
  subject: string;
  type: IssueType;
  priority: Priority;
  status: IssueStatus;
  customerId: string;
  customerName: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Date;
  slaStatus?: 'on_track' | 'at_risk' | 'breached' | 'paused';
  slaRemaining?: string;
  isEscalated: boolean;
  escalationReason?: string;
  isPotentialDuplicate: boolean;
  duplicateOf?: string;
}

// Kanban Column
interface KanbanColumnProps {
  status: IssueStatus;
  issues: KanbanIssueCard[];
  count: number;
  onCardDrop: (issueId: string, targetIndex: number) => void;
  onCardClick: (issueId: string) => void;
  onCardSelect: (issueId: string, selected: boolean) => void;
  onQuickAdd: () => void;
  selectedCardIds: string[];
  isLoading?: boolean;
}

// Kanban Board
interface KanbanBoardProps {
  columns: Array<{
    status: IssueStatus;
    issues: KanbanIssueCard[];
    count: number;
  }>;
  onStatusChange: (issueId: string, newStatus: IssueStatus, note?: string) => Promise<void>;
  onCardClick: (issueId: string) => void;
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  selectedCardIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkAction: (action: BulkAction, ids: string[]) => Promise<void>;
  isLoading?: boolean;
  error?: Error;
}

interface KanbanFilters {
  search?: string;
  myIssues: boolean;
  unassigned: boolean;
  slaAtRisk: boolean;
  escalated: boolean;
  type?: IssueType;
  priority?: Priority;
  assigneeId?: string;
  customerId?: string;
}

type BulkAction =
  | { type: 'assign'; assigneeId: string }
  | { type: 'priority'; priority: Priority }
  | { type: 'status'; status: IssueStatus };

// Status Change Dialog
interface StatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueSummary: string;
  currentStatus: IssueStatus;
  targetStatus: IssueStatus;
  currentAssignee?: { id: string; name: string };
  onConfirm: (note?: string, newAssigneeId?: string, notifyCustomer?: boolean) => Promise<void>;
  assignees: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

// Duplicate Detection
interface DuplicateDetectionBannerProps {
  potentialDuplicate: {
    issueId: string;
    issueSummary: string;
  };
  originalIssue: {
    issueId: string;
    issueSummary: string;
  };
  matchReason: string;
  onViewBoth: () => void;
  onLinkAsRelated: () => void;
  onMarkAsDuplicate: () => void;
  onDismiss: () => void;
}

// Related Issues Panel
interface RelatedIssuesPanelProps {
  issueId: string;
  issueSummary: string;
  linkedIssues: Array<{
    id: string;
    issueNumber: string;
    summary: string;
    relationship: RelationshipType;
    status: IssueStatus;
    assignee?: string;
  }>;
  potentialDuplicates: Array<{
    id: string;
    issueNumber: string;
    summary: string;
    matchPercentage: number;
    matchReason: string;
  }>;
  onLinkIssue: (targetIssueId: string, relationship: RelationshipType, notes?: string) => Promise<void>;
  onUnlink: (linkedIssueId: string) => Promise<void>;
  onMarkAsDuplicate: (duplicateId: string) => Promise<void>;
  onIgnoreDuplicate: (duplicateId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type RelationshipType = 'related' | 'similar' | 'duplicate' | 'parent' | 'child';

// Quick Add Card
interface QuickAddCardProps {
  status: IssueStatus;
  onAdd: () => void;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Board initial load | < 2s | All columns and cards visible |
| Card drag start | < 100ms | Visual feedback on mousedown |
| Card drop | < 500ms | Card settled in new position |
| Status change | < 1s | Including note and notifications |
| Filter apply | < 500ms | Cards filter/reappear |
| Bulk action | < 2s | All selected cards updated |
| Duplicate detection | < 200ms | Alert appears after card load |

---

## Related Wireframes

- [Issue List](./support-issue-list.wireframe.md) - Alternative list view
- [Issue Detail](./support-issue-detail.wireframe.md) - Card click destination
- [SLA Tracking](./support-sla-tracking.wireframe.md) - SLA badge details

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
