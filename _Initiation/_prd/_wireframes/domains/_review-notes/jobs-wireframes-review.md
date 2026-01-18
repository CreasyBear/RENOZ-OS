# Jobs Domain Wireframes - UI Pattern Review

**Review Date:** 2026-01-10
**Reviewer:** Scribe Agent
**Purpose:** Map Jobs domain wireframes to reference UI component implementations

---

## Summary

| Wireframe | Status | Primary Device | Reference Components Mapped |
|-----------|--------|----------------|----------------------------|
| jobs-task-management.wireframe.md | ✓ Reviewed | Mobile | 12 patterns |
| jobs-bom-tracking.wireframe.md | ✓ Reviewed | Mobile | 10 patterns |
| jobs-time-tracking.wireframe.md | ✓ Reviewed | Mobile | 11 patterns |
| jobs-checklist.wireframe.md | ✓ Reviewed | Mobile | 9 patterns |
| jobs-scheduling-calendar.wireframe.md | ✓ Reviewed | Tablet/Desktop | 8 patterns |
| jobs-templates.wireframe.md | ✓ Reviewed | Desktop | 10 patterns |
| jobs-costing-report.wireframe.md | ✓ Reviewed | Desktop | 9 patterns |

**Total Patterns Identified:** 69
**REUI Components:** 45
**Midday Reference Examples:** 24

---

## 1. Task Management (DOM-JOBS-001c)

**File:** `jobs-task-management.wireframe.md`
**Primary Device:** Mobile (field technicians)
**Story ID:** DOM-JOBS-001c

### UI Patterns (Reference Implementation)

#### 1.1 Task List with Sortable/Draggable Items
- **Pattern:** Sortable list with drag-drop reordering
- **REUI Component:** `data-grid-table-dnd-rows.tsx` - Drag-and-drop table rows
- **Midday Reference:** Not found (data tables are non-draggable in Midday)
- **Implementation Notes:**
  - Use REUI's dnd-kit integration for drag-drop
  - Add long-press trigger (300ms) for mobile drag initiation
  - Visual feedback: lifted shadow, dashed outline at original position

#### 1.2 Task Progress Bar
- **Pattern:** Horizontal progress indicator with percentage
- **REUI Component:** `progress.tsx` - Standard progress bar
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Bold/prominent display (48px height recommended for mobile)
  - Show fraction and percentage (e.g., "4/7 (57%)")

#### 1.3 Task Card with Status States
- **Pattern:** Card component with multiple visual states (pending, in-progress, completed, blocked)
- **REUI Component:** `card.tsx` - Base card structure
- **REUI Component:** `checkbox.tsx` - Task checkbox
- **Midday Reference:** `components/tables/tracker/data-table-row.tsx` - Similar status states
- **Implementation Notes:**
  - State-based background colors (white, blue-50, green-50, red-50)
  - Border-left accent (4px solid) for active states
  - Minimum 48px row height for mobile touch targets

#### 1.4 Swipe Actions (Mobile)
- **Pattern:** Left/right swipe reveals contextual actions
- **REUI Component:** None (custom implementation required)
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Left swipe: EDIT + COMPLETE buttons (48px reveal)
  - Right swipe: BLOCK button
  - Use gesture libraries (e.g., react-use-gesture)

#### 1.5 Bottom Sheet Dialog (Add Task)
- **Pattern:** Mobile-friendly modal sliding up from bottom
- **REUI Component:** `sheet.tsx` - Bottom sheet / drawer
- **Midday Reference:** Not found (Midday uses standard dialogs)
- **Implementation Notes:**
  - 80% viewport height
  - Drag handle at top
  - 56px primary button height

#### 1.6 Empty State
- **Pattern:** Empty state with icon, message, and CTA
- **REUI Component:** None (custom)
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Icon: 48x48px minimum
  - CTA button: 56px height

#### 1.7 Loading Skeleton
- **Pattern:** Shimmer skeleton for loading states
- **REUI Component:** None (custom)
- **Midday Reference:** `components/tables/core/table-skeleton.tsx` - Table skeleton pattern
- **Implementation Notes:**
  - Match card dimensions
  - Shimmer animation

#### 1.8 Checkbox Toggle (Quick Complete)
- **Pattern:** Tap checkbox for instant completion with undo
- **REUI Component:** `checkbox.tsx` - Base checkbox
- **Implementation Notes:**
  - 44x44px minimum touch target
  - Haptic feedback on toggle
  - Toast with UNDO action (5-second timeout)

#### 1.9 Tablet Layout (Split View)
- **Pattern:** List + detail panel side-by-side
- **REUI Component:** `resizable.tsx` - Resizable panels
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Left: Task list (60%)
  - Right: Task detail (40%)

#### 1.10 Desktop Table View
- **Pattern:** Data table with inline editing
- **REUI Component:** `data-grid-table.tsx` - Full data table with sorting/filtering
- **Midday Reference:** `components/tables/tracker/data-table-header.tsx` - Similar table structure
- **Implementation Notes:**
  - Columns: Status, Task, Assignee, Due, Actions
  - Drag handles in first column
  - Inline add row at bottom

#### 1.11 Offline Indicators
- **Pattern:** Visual feedback for offline state and pending sync
- **REUI Component:** `badge.tsx` - Status badges
- **Implementation Notes:**
  - Dotted border on pending sync items
  - Sync icon in header
  - Toast notifications

#### 1.12 Keyboard Navigation (Desktop)
- **Pattern:** Full keyboard accessibility
- **Implementation Notes:**
  - Tab/Shift+Tab: Navigate tasks
  - Enter: Toggle completion
  - Ctrl+Up/Down: Reorder
  - E: Edit, Delete: Remove (with confirmation)

---

## 2. BOM Tracking (DOM-JOBS-002c)

**File:** `jobs-bom-tracking.wireframe.md`
**Primary Device:** Mobile (field technicians)
**Story ID:** DOM-JOBS-002c

### UI Patterns (Reference Implementation)

#### 2.1 Materials Summary Card
- **Pattern:** Summary stats in card layout
- **REUI Component:** `card.tsx` - Base card
- **Midday Reference:** `components/charts/selectable-chart-wrapper.tsx` - Card-based summaries
- **Implementation Notes:**
  - Display: Total Cost, Items, Usage percentage
  - 48px row height for stats

#### 2.2 Search Input (Materials)
- **Pattern:** Search/filter input
- **REUI Component:** `input.tsx` - Search input
- **REUI Component:** `command.tsx` - Command palette (for autocomplete)
- **Midday Reference:** `components/tables/transactions/data-table-header.tsx` - Search pattern
- **Implementation Notes:**
  - 48px height
  - Debounced search

#### 2.3 Material Card with Quantity Control
- **Pattern:** Card with +/- buttons for quantity adjustment
- **REUI Component:** `card.tsx` - Base card
- **REUI Component:** `button.tsx` - +/- buttons
- **REUI Component:** `base-number-field.tsx` - Number input
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Quantity buttons: 48x48px minimum
  - Long-press for rapid increment
  - Haptic feedback on change
  - Debounced server sync (500ms)

#### 2.4 Material Progress Indicator
- **Pattern:** Visual progress bar showing usage vs. needed
- **REUI Component:** `progress.tsx` - Progress bar
- **Implementation Notes:**
  - Color-coded: gray (not started), blue (in progress), green (complete), orange (over-used)

#### 2.5 Material Status States
- **Pattern:** Multiple visual states for material cards
- **REUI Component:** `card.tsx` + `badge.tsx`
- **Implementation Notes:**
  - NOT STARTED: white background
  - IN PROGRESS: blue-50 background, blue-500 border-left
  - COMPLETE: green-50 background, green-500 border-left, checkmark icon
  - OVER-USED: orange-50 background, warning icon
  - LOW STOCK: red-50 background, alert icon

#### 2.6 Swipe Actions (Materials)
- **Pattern:** Swipe left reveals EDIT + REMOVE
- **Implementation Notes:**
  - Same as Task Management swipe pattern
  - 48px reveal height

#### 2.7 Add Material Dialog (Bottom Sheet)
- **Pattern:** Multi-step material selection
- **REUI Component:** `sheet.tsx` - Bottom sheet
- **REUI Component:** `base-autocomplete.tsx` - Product search
- **Midday Reference:** `components/forms/product-form.tsx` - Product selection pattern
- **Implementation Notes:**
  - Step 1: Search or scan barcode
  - Step 2: Quantity selection with large +/- buttons (56px)

#### 2.8 Barcode Scanner Integration
- **Pattern:** Camera-based barcode scanning
- **REUI Component:** None (native camera API)
- **Implementation Notes:**
  - Fullscreen camera view
  - Viewfinder overlay
  - Flash toggle (48px button)
  - Product lookup on successful scan

#### 2.9 Reserve Stock Dialog (Desktop)
- **Pattern:** Confirmation dialog with inventory impact
- **REUI Component:** `alert-dialog.tsx` - Confirmation dialog
- **REUI Component:** `table.tsx` - Stock impact table
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Show before/after stock levels
  - Warn about insufficient stock

#### 2.10 Tablet Table View
- **Pattern:** Data table with inline quantity controls
- **REUI Component:** `data-grid-table.tsx`
- **Implementation Notes:**
  - Columns: Material, SKU, Qty Required, Qty Used (+/-), Cost
  - Inline +/- controls in table cells

---

## 3. Time Tracking (DOM-JOBS-003c)

**File:** `jobs-time-tracking.wireframe.md`
**Primary Device:** Mobile (field technicians)
**Story ID:** DOM-JOBS-003c

### UI Patterns (Reference Implementation)

#### 3.1 Active Timer Display
- **Pattern:** Large, prominent timer with start/stop button
- **REUI Component:** `card.tsx` - Timer container
- **REUI Component:** `button.tsx` - Start/stop button (72px height)
- **Midday Reference:** `components/tracker-calendar.tsx` - Time tracking patterns
- **Implementation Notes:**
  - Timer: 48px font size for digits
  - Green glow border when active
  - Red stop button (72x72px minimum)

#### 3.2 Floating Timer FAB
- **Pattern:** Persistent floating action button showing running timer
- **REUI Component:** None (custom FAB)
- **Implementation Notes:**
  - 56px diameter circular FAB
  - Shows elapsed time
  - Stop button embedded
  - Appears when scrolling past main timer

#### 3.3 Time Entry Card
- **Pattern:** List item showing time entry details
- **REUI Component:** `card.tsx`
- **REUI Component:** `badge.tsx` - Billable/non-billable indicator
- **Midday Reference:** `components/tables/tracker/data-table-row.tsx` - Time entry row pattern
- **Implementation Notes:**
  - States: ACTIVE (pulsing dot), COMPLETED, PENDING SYNC
  - Billable badge: [B] filled or [ ] empty

#### 3.4 Today's Time Summary
- **Pattern:** Summary card with total/billable breakdown
- **REUI Component:** `card.tsx`
- **Implementation Notes:**
  - Display: Total hours, Billable hours

#### 3.5 Stop Timer Dialog
- **Pattern:** Bottom sheet for completing time entry
- **REUI Component:** `sheet.tsx`
- **REUI Component:** `input.tsx` - Description input (48px)
- **REUI Component:** `base-switch.tsx` - Billable toggle
- **Midday Reference:** `components/forms/tracker-entries-form.tsx` - Time entry form pattern
- **Implementation Notes:**
  - Large time display
  - Quick description chips
  - Billable toggle (48px row)
  - Primary button (56px)

#### 3.6 Manual Time Entry Dialog
- **Pattern:** Form for adding historical time
- **REUI Component:** `sheet.tsx`
- **REUI Component:** `datefield.tsx` - Date picker
- **REUI Component:** `base-number-field.tsx` - Time picker
- **Implementation Notes:**
  - Auto-calculate duration
  - Native date/time pickers

#### 3.7 Empty State (No Time)
- **Pattern:** Empty state with timer CTA
- **Implementation Notes:**
  - Large timer display (greyed out)
  - Primary CTA: Start timer (72px)
  - Secondary CTA: Add manual entry (48px)

#### 3.8 Tablet Summary Sidebar
- **Pattern:** Side-by-side layout with summary stats
- **REUI Component:** `card.tsx`
- **Implementation Notes:**
  - Summary: Today, This Week, Job Total
  - Budget tracking (if available)

#### 3.9 Desktop Table View
- **Pattern:** Data table with time entries
- **REUI Component:** `data-grid-table.tsx`
- **Midday Reference:** `components/tables/tracker/data-table-header.tsx` - Tracker table pattern
- **Implementation Notes:**
  - Columns: Date/Time, Description, Duration, Billable, Actions
  - Filter: Date range, Billable status
  - Export CSV action

#### 3.10 Offline Timer Persistence
- **Pattern:** Timer runs offline and syncs later
- **Implementation Notes:**
  - Store start time in localStorage
  - Queue completed entries for sync
  - Dashed border on pending sync items

#### 3.11 Keyboard Controls (Desktop)
- **Implementation Notes:**
  - Space: Start/stop timer
  - M: Add manual entry
  - Tab: Navigate entries

---

## 4. Checklist/Punchlist (DOM-JOBS-004c)

**File:** `jobs-checklist.wireframe.md`
**Primary Device:** Mobile (field technicians)
**Story ID:** DOM-JOBS-004c

### UI Patterns (Reference Implementation)

#### 4.1 Checklist Progress Display
- **Pattern:** Progress bar with fraction and percentage
- **REUI Component:** `progress.tsx`
- **Implementation Notes:**
  - Bold/prominent (e.g., "8/12 Complete (67%)")

#### 4.2 Checklist Section Headers
- **Pattern:** Grouped checklist items by section
- **REUI Component:** `accordion.tsx` - Collapsible sections (optional)
- **Implementation Notes:**
  - Headers: PRE-INSTALLATION, INSTALLATION, FINAL CHECKS
  - All-caps section names

#### 4.3 Checklist Item States
- **Pattern:** Checkbox with multiple states
- **REUI Component:** `checkbox.tsx`
- **REUI Component:** `badge.tsx` - Photo/signature required indicators
- **Implementation Notes:**
  - States: UNCHECKED, CHECKED, CHECKED WITH PHOTO, CHECKED WITH NOTES
  - Required indicators: [camera], [sign]
  - 48px row height minimum

#### 4.4 Swipe to Complete
- **Pattern:** Swipe left reveals PHOTO + COMPLETE actions
- **Implementation Notes:**
  - 48px action buttons
  - Haptic feedback
  - Completed items show UNDO instead of COMPLETE

#### 4.5 Complete Item Dialog
- **Pattern:** Bottom sheet for completing item with photo/note
- **REUI Component:** `sheet.tsx`
- **REUI Component:** `input.tsx` - Note input
- **Implementation Notes:**
  - Optional photo capture (56px button)
  - Optional note (text area)
  - Primary "Mark Complete" button (56px)

#### 4.6 Photo Capture Flow
- **Pattern:** Fullscreen camera with capture/retake
- **Implementation Notes:**
  - Fullscreen camera viewfinder
  - Flash toggle
  - Large capture button (72px)
  - Preview with Retake/Save actions (48px)

#### 4.7 Signature Pad
- **Pattern:** Touch-based signature capture
- **REUI Component:** None (custom canvas)
- **Implementation Notes:**
  - Large touch area for signature
  - Customer name text input
  - Clear + Submit buttons (48px each)

#### 4.8 Apply Template Dialog
- **Pattern:** Select and apply checklist template
- **REUI Component:** `sheet.tsx`
- **REUI Component:** `radio-group.tsx` - Template selection
- **Implementation Notes:**
  - List available templates with item counts
  - Preview selected template
  - Apply button (56px)

#### 4.9 Tablet/Desktop Table View
- **Pattern:** Data table with checklist items
- **REUI Component:** `data-grid-table.tsx`
- **Implementation Notes:**
  - Columns: Item, Status, Photo, Time
  - Grouped by section

---

## 5. Scheduling Calendar (DOM-JOBS-005a/b)

**File:** `jobs-scheduling-calendar.wireframe.md`
**Primary Device:** Tablet/Desktop (office managers)
**Story ID:** DOM-JOBS-005a (Basic), DOM-JOBS-005b (Drag-Drop)

### UI Patterns (Reference Implementation)

#### 5.1 Calendar Views (Day/Week/Month)
- **Pattern:** Multi-view calendar with view toggles
- **REUI Component:** `calendar.tsx` - Base calendar
- **REUI Component:** `tabs.tsx` - View toggle (Day/Week/Month)
- **Midday Reference:** `components/tracker-calendar.tsx` - Calendar implementation
- **Midday Reference:** `components/tracker/calendar-week-view.tsx` - Week view pattern
- **Midday Reference:** `components/tracker/calendar-month-view.tsx` - Month view pattern
- **Implementation Notes:**
  - Consider FullCalendar or react-big-calendar library
  - Mobile: Day view default
  - Tablet/Desktop: Week view default

#### 5.2 Job Card on Calendar
- **Pattern:** Compact job card with status-based styling
- **REUI Component:** `card.tsx`
- **REUI Component:** `badge.tsx` - Status indicator
- **Midday Reference:** `components/tracker/calendar-day.tsx` - Event card pattern
- **Implementation Notes:**
  - Status colors: Gray (scheduled), Blue (in progress), Green (completed), Orange (on hold)
  - Show: Job title, customer, time range, assigned techs
  - 44px minimum height

#### 5.3 Unscheduled Jobs Sidebar
- **Pattern:** Draggable sidebar with pending jobs
- **REUI Component:** `card.tsx` - Job cards
- **REUI Component:** `scroll-area.tsx` - Scrollable list
- **Implementation Notes:**
  - Drag handle [=] on each job
  - Display: Job title, customer, estimated duration
  - Drop zone on calendar highlights on drag

#### 5.4 Drag-Drop Scheduling
- **Pattern:** Drag jobs from sidebar to calendar
- **REUI Component:** None (use dnd-kit library)
- **Implementation Notes:**
  - Visual feedback: lift with shadow, dashed outline at source
  - Valid drop zones highlight (green border)
  - Opens schedule confirmation dialog on drop

#### 5.5 Schedule Job Dialog
- **Pattern:** Confirmation dialog for job scheduling
- **REUI Component:** `dialog.tsx`
- **REUI Component:** `datefield.tsx` - Date picker
- **REUI Component:** `base-number-field.tsx` - Time/duration inputs
- **REUI Component:** `checkbox.tsx` - Technician assignment
- **Implementation Notes:**
  - Auto-calculate end time
  - Conflict detection warning
  - Primary "Schedule Job" button

#### 5.6 Technician Filter
- **Pattern:** Multi-select filter for technicians
- **REUI Component:** `checkbox.tsx` - Checkbox group
- **REUI Component:** `badge.tsx` - Selected techs
- **Midday Reference:** Not found
- **Implementation Notes:**
  - Filter calendar to show only selected technicians
  - Avatar + name display

#### 5.7 Job Detail Bottom Sheet (Mobile)
- **Pattern:** Tap job card opens detail sheet
- **REUI Component:** `sheet.tsx`
- **Implementation Notes:**
  - Display: Job details, location, assigned techs, status dropdown
  - CTA: View full job details (navigates to job page)

#### 5.8 Reschedule (Drag on Calendar)
- **Pattern:** Drag existing job to new time/date
- **Implementation Notes:**
  - Semi-transparent drag ghost
  - Toast with UNDO action (5 seconds)
  - Optimistic UI update

---

## 6. Job Templates (DOM-JOBS-007c)

**File:** `jobs-templates.wireframe.md`
**Primary Device:** Desktop (office managers)
**Story ID:** DOM-JOBS-007c

### UI Patterns (Reference Implementation)

#### 6.1 Template List (DataTable)
- **Pattern:** Sortable/filterable data table
- **REUI Component:** `data-grid-table.tsx`
- **REUI Component:** `data-grid-column-header.tsx` - Sortable columns
- **REUI Component:** `data-grid-column-filter.tsx` - Column filters
- **Midday Reference:** `components/tables/products/table.tsx` - Product table pattern (similar structure)
- **Implementation Notes:**
  - Columns: Name, Tasks, Materials, Checklist, Est Duration, Status, Actions
  - Actions: Edit, Copy, Preview, Activate/Deactivate
  - Search input

#### 6.2 Template Preview Panel
- **Pattern:** Slide-in panel from right
- **REUI Component:** `sheet.tsx`
- **Implementation Notes:**
  - Display: Description, Tasks (collapsed list), Materials (collapsed list), Checklist reference
  - CTA: Use This Template (opens assign job flow)
  - Secondary: Edit Template, Duplicate

#### 6.3 Multi-Step Template Form
- **Pattern:** Wizard/stepper form with progress indicator
- **REUI Component:** `tabs.tsx` - Step navigation
- **REUI Component:** `form.tsx` - Form wrapper
- **REUI Component:** `base-form-tanstack.tsx` - TanStack Form integration
- **Midday Reference:** Not found (Midday doesn't have multi-step forms)
- **Implementation Notes:**
  - Steps: 1. Basic Info, 2. Tasks, 3. Materials, 4. Checklist, 5. Review
  - Progress indicator at top
  - Previous/Next navigation buttons
  - Save Draft + Publish actions

#### 6.4 Step 1: Basic Info
- **Pattern:** Standard form fields
- **REUI Component:** `input.tsx` - Template name
- **REUI Component:** `base-input.tsx` - Description textarea
- **REUI Component:** `select.tsx` - Duration, Category dropdowns
- **REUI Component:** `radio-group.tsx` - Active/Inactive status
- **Midday Reference:** `components/forms/product-form.tsx` - Similar form structure

#### 6.5 Step 2: Tasks (Sortable List)
- **Pattern:** Draggable task list with inline add
- **REUI Component:** `data-grid-table-dnd-rows.tsx` - Drag-drop rows
- **REUI Component:** `button.tsx` - Remove task button
- **Implementation Notes:**
  - Drag handle [=] on each task
  - Inline text input + Add button for new tasks
  - Task description (editable)

#### 6.6 Step 3: Materials (Picker)
- **Pattern:** Product search + quantity selection
- **REUI Component:** `base-autocomplete.tsx` - Product search
- **REUI Component:** `base-number-field.tsx` - Quantity input
- **Midday Reference:** `components/forms/product-form.tsx` - Product selection
- **Implementation Notes:**
  - Search products by name/SKU
  - Default quantity (adjustable per job)
  - Remove button per material

#### 6.7 Step 4: Checklist (Selector)
- **Pattern:** Radio group for selecting checklist template
- **REUI Component:** `radio-group.tsx`
- **Implementation Notes:**
  - List available checklist templates
  - Preview selected checklist (collapsed item list)
  - Option: No checklist

#### 6.8 Step 5: Review & Publish
- **Pattern:** Summary view before publishing
- **REUI Component:** `card.tsx` - Summary sections
- **Implementation Notes:**
  - Display: Name, Description, Stats (task/material/checklist counts)
  - Collapsed lists for Tasks, Materials, Checklist
  - Actions: Previous, Save Draft, Publish Template

#### 6.9 Template Selector in Assign Job Dialog
- **Pattern:** Radio group with template preview
- **REUI Component:** `radio-group.tsx`
- **REUI Component:** `collapsible.tsx` - Expandable preview
- **Implementation Notes:**
  - Option: No template (blank job)
  - Preview: Show task/material counts, expand to see full list

#### 6.10 Tablet Card Layout
- **Pattern:** 2-column grid of template cards
- **REUI Component:** `card.tsx`
- **Implementation Notes:**
  - Display: Name, Description, Stats, Actions (Edit/Preview)
  - 2 columns on tablet, 1 column on mobile

---

## 7. Job Costing Report (DOM-JOBS-008b)

**File:** `jobs-costing-report.wireframe.md`
**Primary Device:** Desktop (office managers/admins)
**Story ID:** DOM-JOBS-008b

### UI Patterns (Reference Implementation)

#### 7.1 Filter Bar
- **Pattern:** Date range + dropdown filters
- **REUI Component:** `datefield.tsx` - Date range picker
- **REUI Component:** `select.tsx` - Customer, Job Type filters
- **REUI Component:** `button.tsx` - Quick date range buttons (Today, This Week, etc.)
- **Midday Reference:** `components/tables/transactions/data-table-header.tsx` - Filter pattern
- **Implementation Notes:**
  - Date range: From/To pickers
  - Quick filters: Today, This Week, This Month, This Quarter, This Year, Custom
  - Apply Filters + Clear Filters buttons

#### 7.2 Summary Cards
- **Pattern:** Stats cards in grid layout
- **REUI Component:** `card.tsx`
- **Midday Reference:** `components/charts/selectable-chart-wrapper.tsx` - Summary card pattern
- **Implementation Notes:**
  - Cards: Total Jobs, Total Quoted, Total Cost, Profit Margin, Avg Margin, Profitable/At Risk/Loss counts
  - Color-coded values (green profit, red loss)

#### 7.3 Costing Table (DataTable)
- **Pattern:** Sortable data table with financial data
- **REUI Component:** `data-grid-table.tsx`
- **REUI Component:** `data-grid-column-header.tsx` - Sortable columns
- **REUI Component:** `data-grid-pagination.tsx` - Pagination
- **Midday Reference:** `components/tables/transactions/data-table.tsx` - Financial data table pattern
- **Implementation Notes:**
  - Columns: Job, Customer, Quoted, Materials, Labor, Total Cost, Margin, Status
  - Color-coded margin: Green (>15%), Orange (0-15%), Red (negative)
  - Click row to open detail panel

#### 7.4 Job Costing Detail Panel
- **Pattern:** Slide-in panel from right
- **REUI Component:** `sheet.tsx`
- **REUI Component:** `table.tsx` - Breakdown tables
- **Implementation Notes:**
  - Summary: Quoted, Material Cost (budgeted vs. actual), Labor Cost (budgeted vs. actual), Total, Profit/Loss
  - Breakdown tables: Material, Labor
  - Notes section for issues

#### 7.5 Loss Alert View
- **Pattern:** Filtered table showing underperforming jobs
- **REUI Component:** `alert.tsx` - Alert banner
- **REUI Component:** `card.tsx` - Job cards grouped by severity
- **Implementation Notes:**
  - Alert: "Showing jobs with margin < 15%"
  - Groups: LOSS (negative margin), AT RISK (0-15% margin)
  - Link to view full job details

#### 7.6 Margin Distribution Chart
- **Pattern:** Line/scatter chart showing margin by job
- **REUI Component:** `chart.tsx` - Recharts wrapper
- **Midday Reference:** Midday uses Recharts for analytics (various chart components)
- **Implementation Notes:**
  - X-axis: Jobs
  - Y-axis: Margin %
  - Target zone shading (25-35%)

#### 7.7 Cost Breakdown Pie Chart
- **Pattern:** Pie chart showing materials vs. labor
- **REUI Component:** `chart.tsx`
- **Implementation Notes:**
  - Materials % vs. Labor %
  - Total cost display

#### 7.8 Export CSV
- **Pattern:** Export button with CSV download
- **REUI Component:** `button.tsx`
- **Midday Reference:** `components/tables/transactions/data-table.tsx` - Export pattern
- **Implementation Notes:**
  - Generate CSV from filtered data
  - Columns match table + additional detail columns

#### 7.9 Tablet Card Layout
- **Pattern:** Scrollable job cards (mobile-friendly)
- **REUI Component:** `card.tsx`
- **REUI Component:** `scroll-area.tsx`
- **Implementation Notes:**
  - Display: Job title, customer, quoted/cost, margin, status
  - Tap to expand details

---

## Component Availability Matrix

### REUI Reference Components (45 total)

| Component | Used In | Priority |
|-----------|---------|----------|
| `card.tsx` | All 7 wireframes | High |
| `button.tsx` | All 7 wireframes | High |
| `checkbox.tsx` | Task, Checklist, Filters | High |
| `input.tsx` | Task, BOM, Time, Templates | High |
| `sheet.tsx` | Task, BOM, Time, Checklist (mobile) | High |
| `dialog.tsx` | Calendar, Templates (desktop) | High |
| `progress.tsx` | Task, BOM, Checklist | High |
| `badge.tsx` | Task, BOM, Time, Calendar, Costing | High |
| `data-grid-table.tsx` | Task, BOM, Time, Templates, Costing | High |
| `data-grid-table-dnd-rows.tsx` | Task, Templates | High |
| `select.tsx` | Task, Templates, Costing filters | High |
| `datefield.tsx` | Time, Calendar, Costing | High |
| `calendar.tsx` | Calendar | High |
| `form.tsx` / `base-form-tanstack.tsx` | Templates | High |
| `base-number-field.tsx` | BOM, Time | Medium |
| `base-autocomplete.tsx` | BOM, Templates | Medium |
| `radio-group.tsx` | Checklist, Templates | Medium |
| `tabs.tsx` | Calendar, Templates | Medium |
| `alert-dialog.tsx` | BOM, Task (confirmations) | Medium |
| `scroll-area.tsx` | All (long lists) | Medium |
| `data-grid-column-header.tsx` | All tables | Medium |
| `data-grid-pagination.tsx` | All tables | Medium |
| `chart.tsx` | Costing | Medium |
| `base-switch.tsx` | Time (billable toggle) | Low |
| `collapsible.tsx` | Templates | Low |
| `accordion.tsx` | Checklist (optional) | Low |
| `resizable.tsx` | Task (tablet split) | Low |
| `alert.tsx` | Costing | Low |
| `table.tsx` | Costing detail | Low |
| `command.tsx` | BOM search (autocomplete) | Low |

**Custom Components Needed (not in REUI):**
- Swipe Actions (mobile)
- Barcode Scanner (native camera)
- Signature Pad (canvas)
- Floating Action Button (FAB)
- Timer Display (custom)
- Photo Capture Flow (camera)
- Empty State (custom pattern)
- Loading Skeleton (custom pattern)

### Midday Reference Examples (24 total)

| Midday Component | Maps To | Notes |
|------------------|---------|-------|
| `components/tracker-calendar.tsx` | Calendar | Time tracking calendar |
| `components/tracker/calendar-week-view.tsx` | Calendar | Week view pattern |
| `components/tracker/calendar-month-view.tsx` | Calendar | Month view pattern |
| `components/tracker/calendar-day.tsx` | Calendar | Event card pattern |
| `components/tables/tracker/data-table-row.tsx` | Task, Time | Row with status states |
| `components/tables/tracker/data-table-header.tsx` | Task, Time, Costing | Table header with filters |
| `components/tables/transactions/data-table.tsx` | Costing | Financial data table |
| `components/tables/transactions/data-table-header.tsx` | Costing | Filter pattern |
| `components/tables/products/table.tsx` | Templates | Product table structure |
| `components/tables/core/table-skeleton.tsx` | All | Skeleton loading pattern |
| `components/forms/tracker-entries-form.tsx` | Time | Time entry form |
| `components/forms/product-form.tsx` | BOM, Templates | Product selection |
| `components/charts/selectable-chart-wrapper.tsx` | Costing | Summary cards |

---

## Implementation Recommendations

### High Priority (Must Have)
1. **Mobile Swipe Actions** - Critical for Task, BOM, Checklist UX (no REUI component exists)
2. **Bottom Sheet (Sheet.tsx)** - Already in REUI, optimize for mobile 80% height with drag handle
3. **Data Grid with DnD** - Use REUI `data-grid-table-dnd-rows.tsx` for Task and Template reordering
4. **Calendar Component** - Use REUI `calendar.tsx` + consider FullCalendar library for advanced features
5. **Timer Component** - Custom implementation with large display and start/stop button

### Medium Priority (Important)
6. **Barcode Scanner** - Use native camera API or libraries like `react-zxing` or `react-qr-reader`
7. **Signature Pad** - Use libraries like `react-signature-canvas`
8. **Photo Capture** - Use native camera API with preview/retake flow
9. **Floating FAB** - Custom component, position fixed with scroll triggers
10. **Multi-Step Form** - Use REUI `tabs.tsx` + custom progress indicator

### Low Priority (Nice to Have)
11. **Empty State Pattern** - Create reusable component with icon/message/CTA slots
12. **Loading Skeleton Pattern** - Create reusable component matching card dimensions
13. **Offline Indicators** - Use REUI `badge.tsx` + custom sync status logic
14. **Keyboard Navigation** - Add ARIA and keyboard handlers to all interactive components

---

## Design System Alignment

### Touch Targets (Mobile)
- **Minimum:** 44x44px (WCAG 2.1 Level AAA)
- **Preferred:** 48x48px for primary actions
- **Large Actions:** 56-72px for critical buttons (Start Timer, Add Task)

### Status Colors
- **Green:** Completed, Profitable, Synced
- **Blue:** In Progress, Active
- **Orange:** At Risk, Blocked, Warning (0-15% margin)
- **Red:** Loss, Error, Overdue (negative margin)
- **Gray:** Pending, Not Started

### Typography
- **High Contrast:** Dark text on light backgrounds for outdoor visibility
- **Bold Progress:** 48px font for timer displays, large progress indicators
- **All Caps:** Section headers, status labels

### Spacing
- **Card Padding:** 16px minimum
- **Row Height:** 48px minimum for mobile
- **Input Height:** 48px for mobile, 44px for desktop

---

## Next Steps

1. **Create Component Stubs** - Start with high-priority components (swipe, timer, barcode)
2. **Review Midday Reference** - Study Midday's tracker/calendar implementations for patterns
3. **Test on Devices** - Validate touch targets and outdoor visibility on actual mobile devices
4. **Schema Implementation** - Ensure backend schemas (DOM-JOBS-001a through 008a) are complete before UI work
5. **Offline Strategy** - Implement sync queue and conflict resolution for all mobile components

---

**End of Review**
