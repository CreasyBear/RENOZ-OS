# Wireframe: DOM-COMMS-008 - Communications Timeline Enhancement

## Story Reference

- **Story ID**: DOM-COMMS-008
- **Name**: Fix and Enhance Communications Timeline
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: Timeline with FilterBar and SearchInput

## Overview

Fix bugs in existing communication-history.tsx and enhance with filtering by type/date/participant, search functionality, quick actions for reply/follow-up, and CSV/PDF export capabilities.

## UI Patterns (Reference Implementation)

### ActivityTimeline
- **Pattern**: RE-UI ScrollArea + Card + Timeline
- **Reference**: `_reference/.reui-reference/registry/default/ui/scroll-area.tsx`, `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Vertical timeline with date group headers (TODAY, YESTERDAY, etc.)
  - Activity type icons (email, phone, order, note) with color coding
  - Infinite scroll with "Load More" button or auto-load on scroll
  - Staggered entrance animation for activity cards

### FilterBar
- **Pattern**: RE-UI Select + DateRangePicker + Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`, `_reference/.reui-reference/registry/default/ui/calendar.tsx`, `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Multi-select checkboxes for activity types (Emails, Calls, Orders, etc.)
  - Date range dropdown with presets (Last 7 days, Last 30 days, Custom)
  - Team member filter for multi-user accounts
  - Active filter count badge with "Clear All" button

### SearchInput
- **Pattern**: RE-UI Input + Command
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`, `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Debounced search input (500ms delay)
  - Keyboard shortcut focus (/) with visual hint
  - Search result highlighting in activity cards
  - Clear button (X) appearing when text present

### ActivityCard
- **Pattern**: RE-UI Card + Badge + DropdownMenu
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`, `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`
- **Features**:
  - Expandable/collapsible card for detailed view
  - Quick action buttons: Reply, Schedule Follow-up, View Details
  - Timestamp with relative formatting ("3 hours ago")
  - User attribution with avatar and name

### ExportMenu
- **Pattern**: RE-UI DropdownMenu + Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`, `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Export format options: CSV (spreadsheet) or PDF (printable)
  - Activity type checkboxes to filter export
  - Date range selector for export scope
  - Progress indicator during export generation

---

## Mobile Wireframe (375px)

### Timeline View with Filters

```
+=========================================+
| < Customer                              |
+-----------------------------------------+
|                                         |
|  Acme Corporation                       |
|  ─────────────────────────────────────  |
|                                         |
|  [Overview] [Orders] [Communications]   |
|                       =============     |
+-----------------------------------------+
|                                         |
|  Activity Timeline             [Filter] |
|  ─────────────────────────────────────  |
|                                         |
|  [Search activities____________] [x]    |
|                                         |
|  TODAY                                  |
|  |                                      |
|  +--[email]-----------------------------+
|  |  Email Sent                          |
|  |  Quote Q-1234 sent to john@acme.com  |
|  |                                      |
|  |  3:45 PM by Joel Chan                |
|  |                                      |
|  |  [Reply]  [View Email]               |
|  +--------------------------------------+
|  |                                      |
|  +--[phone]-----------------------------+
|  |  Call Logged                         |
|  |  Discussed pricing options           |
|  |                                      |
|  |  10:30 AM by Joel Chan               |
|  |  Duration: 15 min                    |
|  |                                      |
|  |  [Schedule Follow-up]                |
|  +--------------------------------------+
|  |                                      |
|  YESTERDAY                              |
|  |                                      |
|  +--[order]-----------------------------+
|  |  Order Created                       |
|  |  Order #O-5678 for $2,500.00         |
|  |                                      |
|  |  2:15 PM by System                   |
|  |                                      |
|  |  [View Order]                        |
|  +--------------------------------------+
|  |                                      |
|  +--[note]------------------------------+
|  |  Note Added                          |
|  |  Customer interested in bulk         |
|  |  pricing for Q2                      |
|  |                                      |
|  |  9:00 AM by Sarah Kim                |
|  +--------------------------------------+
|                                         |
|  [Load More]                            |
|                                         |
+=========================================+
```

### Filter Panel (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  FILTER ACTIVITIES                [X]   |
|  ─────────────────────────────────────  |
|                                         |
|  Activity Type                          |
|  +-------------------------------------+|
|  | [x] All Types                       ||
|  | [x] Emails                          ||
|  | [x] Calls                           ||
|  | [x] Orders                          ||
|  | [x] Quotes                          ||
|  | [x] Warranties                      ||
|  | [x] Notes                           ||
|  +-------------------------------------+|
|                                         |
|  Date Range                             |
|  +----------------------------------v--+|
|  | Last 30 days                        ||
|  +-------------------------------------+|
|                                         |
|  Team Member                            |
|  +----------------------------------v--+|
|  | All team members                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         [Apply Filters]             ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [Clear All Filters]                    |
|                                         |
+=========================================+
```

### Search Results

```
+=========================================+
| < Customer                              |
+-----------------------------------------+
|                                         |
|  Activity Timeline             [Filter] |
|  ─────────────────────────────────────  |
|                                         |
|  [Search: "quote"______________] [x]    |
|                                         |
|  3 results for "quote"                  |
|  ─────────────────────────────────────  |
|                                         |
|  +--[email]-----------------------------+
|  |  Email Sent                          |
|  |  Quote Q-1234 sent to...             |
|  |       ^^^^^                          |
|  |  Today at 3:45 PM                    |
|  +--------------------------------------+
|                                         |
|  +--[quote]-----------------------------+
|  |  Quote Created                       |
|  |  Quote Q-1234 for $5,000.00          |
|  |       ^^^^^                          |
|  |  Jan 10 at 2:00 PM                   |
|  +--------------------------------------+
|                                         |
|  +--[note]------------------------------+
|  |  Note Added                          |
|  |  Customer requested quote for bulk   |
|  |                      ^^^^^           |
|  |  Jan 8 at 11:30 AM                   |
|  +--------------------------------------+
|                                         |
|  [Clear Search]                         |
|                                         |
+=========================================+
```

### Reply to Email Dialog

```
+=========================================+
| Reply to Email                    [X]   |
+-----------------------------------------+
|                                         |
|  Replying to:                           |
|  +-------------------------------------+|
|  | Subject: Your Quote from Renoz      ||
|  | To: john@acme.com                   ||
|  | Sent: Today at 3:45 PM              ||
|  +-------------------------------------+|
|                                         |
|  Subject                                |
|  +-------------------------------------+|
|  | RE: Your Quote from Renoz           ||
|  +-------------------------------------+|
|                                         |
|  Message                                |
|  +-------------------------------------+|
|  |                                     ||
|  | Hi John,                            ||
|  |                                     ||
|  |                                     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [Include original message]             |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |           [Send Reply]              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Export Menu (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  EXPORT ACTIVITIES                      |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | [csv] Export as CSV                 ||
|  |       Spreadsheet format            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [pdf] Export as PDF                 ||
|  |       Printable document            ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  Export includes:                       |
|  * All activities matching filters      |
|  * Date range: Last 30 days             |
|  * Total: 47 activities                 |
|                                         |
|  ( Cancel )                             |
|                                         |
+=========================================+
```

### Empty State (Mobile)

```
+=========================================+
| < Customer                              |
+-----------------------------------------+
|                                         |
|  [Overview] [Orders] [Communications]   |
|                       =============     |
+-----------------------------------------+
|                                         |
|  Activity Timeline             [Filter] |
|  ─────────────────────────────────────  |
|                                         |
|            +-------------+              |
|            |  [timeline] |              |
|            +-------------+              |
|                                         |
|       No Communication History          |
|                                         |
|   Start communicating with this         |
|   customer to build a history.          |
|                                         |
|   +-------------------------------+     |
|   | [email] Send Email            |     |
|   +-------------------------------+     |
|   +-------------------------------+     |
|   | [phone] Log Call              |     |
|   +-------------------------------+     |
|   +-------------------------------+     |
|   | [note] Add Note               |     |
|   +-------------------------------+     |
|                                         |
+=========================================+
```

### Loading Skeleton (Mobile)

```
+=========================================+
| < Customer                              |
+-----------------------------------------+
|                                         |
|  Activity Timeline                      |
|  ─────────────────────────────────────  |
|                                         |
|  .........                              |
|  |                                      |
|  +--[...]-------------------------------+
|  |  .......................             |
|  |  ...............................     |
|  |                                      |
|  |  ............                        |
|  |                                      |
|  |  [........] [..........]             |
|  +--------------------------------------+
|  |                                      |
|  +--[...]-------------------------------+
|  |  .......................             |
|  |  ...............................     |
|  |                                      |
|  |  ............                        |
|  |                                      |
|  |  [........]                          |
|  +--------------------------------------+
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Timeline with Sidebar Filters

```
+=========================================================================+
| < Back to Customers                                                      |
+-------------------------------------------------------------------------+
|                                                                          |
|  Acme Corporation                                   [Edit]  [Actions v]  |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  [Overview] [Orders] [Jobs] [Communications] [Activity]                  |
|                              =============                               |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-- FILTERS ----------------+  +-- TIMELINE -------------------------+ |
|  |                           |  |                                      | |
|  |  [Search_____________]    |  |  TODAY                               | |
|  |                           |  |  |                                   | |
|  |  Type                     |  |  +--[email]-------------------------+| |
|  |  [x] Emails         (23)  |  |  |  Email Sent                      || |
|  |  [x] Calls          (12)  |  |  |  Quote Q-1234 sent to john@...   || |
|  |  [x] Orders          (8)  |  |  |                                  || |
|  |  [x] Quotes          (5)  |  |  |  3:45 PM - Joel Chan             || |
|  |  [x] Warranties      (3)  |  |  |                                  || |
|  |  [x] Notes          (15)  |  |  |  [Reply] [View] [Forward]        || |
|  |                           |  |  +----------------------------------+| |
|  |  Date Range               |  |  |                                   | |
|  |  +-------------------v-+  |  |  +--[phone]-------------------------+| |
|  |  | Last 30 days       |  |  |  |  Call Logged                     || |
|  |  +--------------------+  |  |  |  Discussed pricing options        || |
|  |                           |  |  |                                  || |
|  |  Team Member              |  |  |  10:30 AM - Joel Chan (15 min)   || |
|  |  +-------------------v-+  |  |  |                                  || |
|  |  | All team members   |  |  |  |  [Schedule Follow-up] [View]     || |
|  |  +--------------------+  |  |  +----------------------------------+| |
|  |                           |  |                                      | |
|  |  ─────────────────────   |  |  YESTERDAY                            | |
|  |                           |  |  |                                   | |
|  |  [Clear All]              |  |  +--[order]-------------------------+| |
|  |                           |  |  |  Order Created                   || |
|  |  ─────────────────────   |  |  |  Order #O-5678 for $2,500.00     || |
|  |                           |  |  |                                  || |
|  |  [Export v]               |  |  |  2:15 PM - System                || |
|  |                           |  |  |                                  || |
|  |  66 activities            |  |  |  [View Order]                    || |
|  |                           |  |  +----------------------------------+| |
|  +---------------------------+  +--------------------------------------+ |
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Customer Detail - Communications Tab

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Customers                                                                   |
| Customers   |                                                                                        |
| Orders      |  Acme Corporation                                  [New Order]  [Edit]  [Actions v]    |
| Products    |  john@acme.com | +1 555-0123 | Active                                                  |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────────     |
| Pipeline    |                                                                                        |
| Support     |  [Overview] [Orders] [Jobs] [Communications] [Warranties] [Activity]                   |
| Communi..   |                               =============                                            |
|             |                                                                                        |
|             |  +-- FILTER BAR --------------------------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  [Search activities_______________]  Type: [All v]  Date: [Last 30 days v]       |  |
|             |  |                                                                                  |  |
|             |  |  Team: [All team members v]                          [Export v]  66 activities   |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- TIMELINE ----------------------------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  TODAY                                                                           |  |
|             |  |  |                                                                               |  |
|             |  |  +--[email]-----------------------------------------------------------------+    |  |
|             |  |  |                                                                           |    |  |
|             |  |  |  Email Sent                                              3:45 PM          |    |  |
|             |  |  |  ────────────────────────────────────────────────────────────────────────|    |  |
|             |  |  |  Subject: Your Quote from Renoz                                           |    |  |
|             |  |  |  To: john@acme.com                                                        |    |  |
|             |  |  |  Quote Q-1234 sent with pricing details and terms.                       |    |  |
|             |  |  |                                                                           |    |  |
|             |  |  |  By: Joel Chan                        [Reply] [View Email] [Forward]     |    |  |
|             |  |  +--------------------------------------------------------------------------+    |  |
|             |  |  |                                                                               |  |
|             |  |  +--[phone]----------------------------------------------------------------+    |  |
|             |  |  |                                                                           |    |  |
|             |  |  |  Call Logged                                             10:30 AM         |    |  |
|             |  |  |  ────────────────────────────────────────────────────────────────────────|    |  |
|             |  |  |  Discussed pricing options for bulk order.                                |    |  |
|             |  |  |  Customer will review and respond by end of week.                         |    |  |
|             |  |  |                                                                           |    |  |
|             |  |  |  Duration: 15 min | By: Joel Chan     [Schedule Follow-up] [Add Note]    |    |  |
|             |  |  +--------------------------------------------------------------------------+    |  |
|             |  |  |                                                                               |  |
|             |  |  YESTERDAY                                                                       |  |
|             |  |  |                                                                               |  |
|             |  |  +--[order]----------------------------------------------------------------+    |  |
|             |  |  |                                                                           |    |  |
|             |  |  |  Order Created                                           2:15 PM          |    |  |
|             |  |  |  ────────────────────────────────────────────────────────────────────────|    |  |
|             |  |  |  Order #O-5678 created for $2,500.00                                      |    |  |
|             |  |  |  5 items | Payment: Net 30                                                |    |  |
|             |  |  |                                                                           |    |  |
|             |  |  |  By: System                                            [View Order]       |    |  |
|             |  |  +--------------------------------------------------------------------------+    |  |
|             |  |                                                                                  |  |
|             |  |  < Load More Activities >                                                        |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Quick Action: Reply with Context

```
+============================================================================+
| Reply to Email                                                        [X]   |
+=============================================================================+
|                                                                             |
|  +-- ORIGINAL EMAIL -----------------------+  +-- YOUR REPLY --------------+|
|  |                                         |  |                            ||
|  |  From: joel@renoz.com                   |  |  To: john@acme.com         ||
|  |  To: john@acme.com                      |  |                            ||
|  |  Sent: Today at 3:45 PM                 |  |  Subject                   ||
|  |  Subject: Your Quote from Renoz         |  |  +------------------------+||
|  |                                         |  |  | RE: Your Quote from... |||
|  |  ─────────────────────────────────────  |  |  +------------------------+||
|  |                                         |  |                            ||
|  |  Hi John,                               |  |  Message                   ||
|  |                                         |  |  +------------------------+||
|  |  Please find attached your quote        |  |  |                        |||
|  |  Q-1234 for the materials you           |  |  |                        |||
|  |  requested.                             |  |  |                        |||
|  |                                         |  |  |                        |||
|  |  Total: $5,000.00                       |  |  |                        |||
|  |  Valid until: Jan 30, 2026              |  |  |                        |||
|  |                                         |  |  +------------------------+||
|  |  Best regards,                          |  |                            ||
|  |  Joel Chan                              |  |  [x] Include original      ||
|  |                                         |  |                            ||
|  +------------------------------------------  +----------------------------+|
|                                                                             |
|                                             ( Cancel )    [ Send Reply ]    |
|                                                                             |
+=============================================================================+
```

### Export Dialog

```
+--------------------------------------------------+
| Export Communication History                [X]   |
+--------------------------------------------------+
|                                                   |
|  Format                                           |
|  ( ) CSV - Spreadsheet format                     |
|  (o) PDF - Printable document                     |
|                                                   |
|  Include                                          |
|  [x] Emails (23)                                  |
|  [x] Calls (12)                                   |
|  [x] Orders (8)                                   |
|  [x] Quotes (5)                                   |
|  [x] Warranties (3)                               |
|  [x] Notes (15)                                   |
|                                                   |
|  Date Range                                       |
|  +------------------+  +------------------+       |
|  | Dec 15, 2025     |  | Jan 15, 2026     |       |
|  +------------------+  +------------------+       |
|                                                   |
|  Total: 66 activities                             |
|                                                   |
|            ( Cancel )     [ Download ]            |
|                                                   |
+--------------------------------------------------+
```

---

## Interaction States

### Loading States

```
TIMELINE LOADING:
+--------------------------------------+
|  Activity Timeline                   |
|  |                                   |
|  +--[...]----------------------------+
|  |  .......................          |
|  |  ...............................  |
|  |                                   |
|  |  ............                     |
|  |                                   |
|  |  [........] [..........]          |
|  +-----------------------------------+
|  |                                   |
|  +--[...]----------------------------+
|  |  .......................          |
|  |  ...............................  |
|  +-----------------------------------+
+--------------------------------------+
  ^ Shimmer animation

LOAD MORE:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  |     [spinner]                    ||
|  |     Loading more activities...   ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+

EXPORTING:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  |     [spinner]                    ||
|  |     Generating export...         ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+
```

### Empty States

```
NO COMMUNICATIONS:
+--------------------------------------+
|                                      |
|          +------------+              |
|          | [timeline] |              |
|          +------------+              |
|                                      |
|    No Communication History          |
|                                      |
|  Start building a relationship       |
|  with this customer by sending       |
|  an email or logging a call.         |
|                                      |
|   [email] Send Email                 |
|   [phone] Log Call                   |
|   [note] Add Note                    |
|                                      |
+--------------------------------------+

NO SEARCH RESULTS:
+--------------------------------------+
|                                      |
|  No activities matching "xyz"        |
|                                      |
|  Try a different search term         |
|  or adjust your filters.             |
|                                      |
|  [Clear Search]                      |
|                                      |
+--------------------------------------+

NO FILTERED RESULTS:
+--------------------------------------+
|                                      |
|  No activities match your filters    |
|                                      |
|  Filters applied:                    |
|  * Type: Emails only                 |
|  * Date: Last 7 days                 |
|                                      |
|  [Clear Filters]                     |
|                                      |
+--------------------------------------+
```

### Error States

```
LOAD FAILED:
+--------------------------------------+
|                                      |
|  [!] Couldn't load activities        |
|                                      |
|  Check your connection and try       |
|  again.                              |
|                                      |
|  [Retry]                             |
|                                      |
+--------------------------------------+

REPLY FAILED:
+--------------------------------------+
|                                      |
|  [!] Failed to send reply            |
|                                      |
|  Your message could not be sent.     |
|  Your draft has been saved.          |
|                                      |
|  [Retry]  [Save Draft]               |
|                                      |
+--------------------------------------+

EXPORT FAILED:
+--------------------------------------+
|                                      |
|  [!] Export failed                   |
|                                      |
|  Could not generate the export       |
|  file. Please try again.             |
|                                      |
|  [Retry]                             |
|                                      |
+--------------------------------------+
```

### Success States

```
REPLY SENT:
+--------------------------------------+
|                                      |
|  * Reply Sent                        |
|                                      |
|  Your reply to john@acme.com         |
|  has been sent.                      |
|                                      |
+--------------------------------------+

EXPORT COMPLETE:
+--------------------------------------+
|                                      |
|  * Export Ready                      |
|                                      |
|  Your PDF with 66 activities         |
|  is ready to download.               |
|                                      |
|  [Download PDF]                      |
|                                      |
+--------------------------------------+

FOLLOW-UP SCHEDULED:
+--------------------------------------+
|                                      |
|  * Follow-up Scheduled               |
|                                      |
|  Call scheduled for Jan 20           |
|  at 10:00 AM.                        |
|                                      |
|  [View in Calendar]                  |
|                                      |
+--------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Timeline Page**
   - Search input
   - Filter controls (type, date, team)
   - Export button
   - Timeline items (Tab through)
   - Quick action buttons within items
   - Load more button

2. **Filter Panel (Mobile)**
   - Type checkboxes
   - Date range selector
   - Team member selector
   - Apply button
   - Clear button

3. **Reply Dialog**
   - Close button
   - Subject field
   - Message textarea
   - Include original checkbox
   - Cancel -> Send button

### ARIA Requirements

```html
<!-- Timeline Container -->
<section
  role="feed"
  aria-label="Communication history timeline"
  aria-busy="false"
>
  <!-- Date Group -->
  <div role="group" aria-labelledby="today-heading">
    <h3 id="today-heading">Today</h3>

    <!-- Timeline Item -->
    <article
      role="article"
      aria-labelledby="activity-1-type"
      aria-describedby="activity-1-desc"
    >
      <h4 id="activity-1-type">Email Sent</h4>
      <p id="activity-1-desc">
        Quote Q-1234 sent to john@acme.com at 3:45 PM
      </p>
      <div role="group" aria-label="Activity actions">
        <button aria-label="Reply to email">Reply</button>
        <button aria-label="View email details">View</button>
        <button aria-label="Forward email">Forward</button>
      </div>
    </article>
  </div>
</section>

<!-- Search -->
<search role="search">
  <label for="activity-search" class="sr-only">Search activities</label>
  <input
    type="search"
    id="activity-search"
    aria-label="Search communication history"
    placeholder="Search activities..."
  />
  <button aria-label="Clear search">Clear</button>
</search>

<!-- Filter Bar -->
<fieldset role="group" aria-label="Filter activities">
  <legend class="sr-only">Activity filters</legend>

  <div>
    <label for="type-filter">Activity type</label>
    <select id="type-filter" aria-label="Filter by type">
      <option>All types</option>
      <option>Emails</option>
      <option>Calls</option>
    </select>
  </div>

  <div>
    <label for="date-filter">Date range</label>
    <select id="date-filter" aria-label="Filter by date">
      <option>Last 30 days</option>
      <option>Last 7 days</option>
      <option>Custom range</option>
    </select>
  </div>
</fieldset>

<!-- Activity Type Icon -->
<span
  role="img"
  aria-label="Email"
  class="activity-icon-email"
></span>

<!-- Load More -->
<button
  aria-label="Load more activities, 20 of 66 shown"
>
  Load More
</button>

<!-- Export Menu -->
<menu
  role="menu"
  aria-label="Export options"
>
  <button role="menuitem" aria-label="Export as CSV spreadsheet">
    Export as CSV
  </button>
  <button role="menuitem" aria-label="Export as PDF document">
    Export as PDF
  </button>
</menu>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Timeline | Navigate between activities |
| Enter | Activity | Expand/view details |
| Tab | Within activity | Navigate action buttons |
| Enter/Space | Action button | Execute action |
| / | Page | Focus search |
| Escape | Search | Clear and blur search |
| Tab | Filter panel | Navigate filter controls |
| Space | Checkbox | Toggle filter |

### Screen Reader Announcements

- Page loaded: "Communication history loaded, showing 20 of 66 activities"
- Search results: "3 activities found matching quote"
- Filters applied: "Showing emails only from last 7 days, 15 activities"
- Load more: "Loaded 20 more activities, 40 of 66 now showing"
- Reply sent: "Reply sent to john@acme.com"
- Export ready: "PDF export ready with 66 activities"

---

## Animation Choreography

### Timeline Entry

```
INITIAL LOAD:
- Duration: 200ms per item
- Stagger: 50ms
- Easing: ease-out
- Opacity: 0 -> 1
- Transform: translateX(-20px) -> translateX(0)

LOAD MORE:
- Duration: 200ms per item
- Stagger: 30ms
- Slide up from below
- Opacity: 0 -> 1
```

### Search

```
FOCUS:
- Duration: 150ms
- Border highlight
- Icon color change

RESULTS APPEAR:
- Duration: 200ms
- Cross-fade from regular timeline
- Search highlights pulse once

CLEAR:
- Duration: 200ms
- Results cross-fade back to full timeline
```

### Filter Changes

```
APPLY:
- Duration: 300ms
- Easing: ease-out
- Old items fade out
- New items fade in with stagger

FILTER CHIP ADD:
- Duration: 150ms
- Scale: 0 -> 1
- Background color flash

FILTER CHIP REMOVE:
- Duration: 150ms
- Scale: 1 -> 0
- Chip closes
```

### Quick Actions

```
BUTTON HOVER:
- Duration: 100ms
- Background highlight
- Scale: 1 -> 1.05

ACTION CLICK:
- Duration: 150ms
- Button press effect
- Loading spinner if async

SUCCESS:
- Duration: 300ms
- Green checkmark
- Toast notification
```

### Activity Card

```
HOVER (Desktop):
- Duration: 150ms
- Background subtle highlight
- Actions more visible

EXPAND/COLLAPSE:
- Duration: 200ms
- Height animation
- Content fade
```

### Export

```
MENU OPEN:
- Duration: 200ms
- Scale Y: 0.95 -> 1
- Opacity: 0 -> 1

DOWNLOADING:
- Duration: continuous
- Progress indicator
- Disabled interactions

COMPLETE:
- Duration: 300ms
- Success checkmark
- Download auto-triggers
```

---

## Component Props Interfaces

```typescript
// TimelineSkeleton
interface TimelineSkeletonProps {
  /** Number of skeleton items */
  count?: number;
  /** Show date headers */
  showHeaders?: boolean;
}

// FilterBar
interface FilterBarProps {
  /** Search query */
  searchQuery: string;
  /** Search change handler */
  onSearchChange: (query: string) => void;
  /** Activity type filter */
  activityTypes: string[];
  /** Type filter change handler */
  onTypesChange: (types: string[]) => void;
  /** Date range filter */
  dateRange: { from: Date; to: Date } | null;
  /** Date range change handler */
  onDateRangeChange: (range: { from: Date; to: Date } | null) => void;
  /** Team member filter */
  teamMemberId: string | null;
  /** Team member change handler */
  onTeamMemberChange: (id: string | null) => void;
  /** Available team members */
  teamMembers: Array<{ id: string; name: string }>;
  /** Total activity count */
  totalCount: number;
  /** Loading state */
  isLoading?: boolean;
}

// SearchInput
interface SearchInputProps {
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Clear handler */
  onClear?: () => void;
  /** Submit handler */
  onSubmit?: () => void;
  /** Loading state */
  isSearching?: boolean;
}

// ActivityTimeline
interface ActivityTimelineProps {
  /** Activities to display */
  activities: Array<{
    id: string;
    type: 'email' | 'call' | 'order' | 'quote' | 'warranty' | 'note';
    title: string;
    description: string;
    timestamp: string;
    user?: { id: string; name: string };
    metadata?: Record<string, unknown>;
  }>;
  /** Group by date */
  groupByDate?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Has more to load */
  hasMore?: boolean;
  /** Load more handler */
  onLoadMore?: () => void;
  /** Search query for highlighting */
  searchQuery?: string;
  /** Reply handler */
  onReply?: (activityId: string) => void;
  /** Schedule follow-up handler */
  onScheduleFollowUp?: (activityId: string) => void;
  /** View details handler */
  onViewDetails?: (activityId: string, type: string) => void;
}

// ActivityCard
interface ActivityCardProps {
  activity: {
    id: string;
    type: 'email' | 'call' | 'order' | 'quote' | 'warranty' | 'note';
    title: string;
    description: string;
    timestamp: string;
    user?: { id: string; name: string };
    metadata?: Record<string, unknown>;
  };
  /** Search query for highlighting */
  searchQuery?: string;
  /** Available quick actions */
  quickActions?: Array<{
    label: string;
    icon: string;
    onClick: () => void;
  }>;
  /** Expanded state */
  expanded?: boolean;
  /** Expand toggle handler */
  onToggleExpand?: () => void;
}

// ReplyDialog
interface ReplyDialogProps {
  /** Original email */
  originalEmail: {
    id: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    body: string;
    sentAt: string;
  };
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Send handler */
  onSend: (data: {
    subject: string;
    body: string;
    includeOriginal: boolean;
  }) => void;
  /** Sending state */
  isSending?: boolean;
}

// QuickActionButton
interface QuickActionButtonProps {
  /** Button label */
  label: string;
  /** Icon name */
  icon: 'reply' | 'forward' | 'call' | 'calendar' | 'note' | 'view';
  /** Click handler */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Variant */
  variant?: 'default' | 'primary';
}

// ExportMenu
interface ExportMenuProps {
  /** Menu open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Export handler */
  onExport: (format: 'csv' | 'pdf', options: {
    types: string[];
    dateRange: { from: Date; to: Date };
  }) => void;
  /** Activity counts by type */
  activityCounts: Record<string, number>;
  /** Current filters */
  currentFilters: {
    types: string[];
    dateRange: { from: Date; to: Date } | null;
  };
  /** Exporting state */
  isExporting?: boolean;
}

// DateRangePicker
interface DateRangePickerProps {
  /** Selected range */
  value: { from: Date; to: Date } | null;
  /** Change handler */
  onChange: (range: { from: Date; to: Date } | null) => void;
  /** Preset options */
  presets?: Array<{
    label: string;
    getValue: () => { from: Date; to: Date };
  }>;
  /** Allow custom range */
  allowCustom?: boolean;
  /** Placeholder */
  placeholder?: string;
}

// UserSelector
interface UserSelectorProps {
  /** Selected user ID */
  value: string | null;
  /** Change handler */
  onChange: (userId: string | null) => void;
  /** Available users */
  users: Array<{ id: string; name: string; avatar?: string }>;
  /** Include "All" option */
  includeAll?: boolean;
  /** Placeholder */
  placeholder?: string;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/activity-timeline.tsx` | Main timeline component |
| `src/components/domain/communications/activity-card.tsx` | Individual activity item |
| `src/components/domain/communications/filter-bar.tsx` | Filter controls bar |
| `src/components/domain/communications/search-input.tsx` | Search input with clear |
| `src/components/domain/communications/reply-dialog.tsx` | Reply to email dialog |
| `src/components/domain/communications/quick-action-button.tsx` | Action buttons |
| `src/components/domain/communications/export-menu.tsx` | Export options menu |
| `src/components/domain/communications/timeline-skeleton.tsx` | Loading skeleton |
| `src/components/domain/communications/date-range-picker.tsx` | Date range selection |
| `src/components/domain/communications/user-selector.tsx` | Team member filter |
| `src/components/domain/customers/customer-communications-tab.tsx` | Tab integration |
