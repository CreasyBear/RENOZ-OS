# Jobs PRD UI Patterns Enhancement

**Date**: 2026-01-10
**Task**: Add UI patterns to Jobs domain PRD referencing REUI and Midday components
**Status**: Complete - All UI stories enhanced with uiPatterns field

---

## Summary

Enhanced the Jobs/Projects domain PRD with comprehensive UI pattern mappings for all 6 UI stories (DOM-JOBS-001c through DOM-JOBS-008b). Each UI story now includes a `uiPatterns` field that maps wireframe requirements to specific REUI components and Midday reference implementations.

### Stories Enhanced

| Story ID | Feature | UI Patterns Added |
|----------|---------|-------------------|
| DOM-JOBS-001c | Task Management UI | Kanban board, List cards, Dialog, Progress bar |
| DOM-JOBS-002c | BOM Tracking UI | Data Grid, Statistic cards, Combobox, Number field |
| DOM-JOBS-003c | Time Tracking UI | Timer widget (Statistic card 10), Data Grid, DateField |
| DOM-JOBS-004c | Checklist UI | List cards, Progress bar, Checkbox, Kanban (template editor) |
| DOM-JOBS-005a | Calendar Basic | FullCalendar, Tabs, Badge, Popover |
| DOM-JOBS-005b | Calendar Drag-Drop | Sheet, Filters, Alert Dialog, Toast |
| DOM-JOBS-007c | Templates UI | Data Grid, Tabs (multi-step), Kanban, Combobox, Sheet |
| DOM-JOBS-008b | Costing Report UI | Data Grid, Statistic cards, Filters, Calendar |

---

## REUI Components Used

### Primary Components (Most Frequent)

| Component | Path | Stories Using It | Primary Use Case |
|-----------|------|-----------------|------------------|
| **data-grid.tsx** | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` | 001c, 002c, 003c, 004c, 007c, 008b | Tables with sorting, filtering, inline editing |
| **statistic-card-1.tsx** | `_reference/.reui-reference/registry/default/blocks/cards/statistic-cards/statistic-card-1.tsx` | 002c, 003c, 008b | KPI summaries, cost totals, metrics |
| **base-dialog.tsx** | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` | 001c, 002c, 004c, 007c | Form dialogs, add/edit modals |
| **kanban.tsx** | `_reference/.reui-reference/registry/default/ui/kanban.tsx` | 001c, 004c, 007c | Drag-drop task/item reordering |
| **base-tabs.tsx** | `_reference/.reui-reference/registry/default/ui/base-tabs.tsx` | 005a, 007c | View toggles, multi-step forms |

### Supporting Components

| Component | Path | Use Cases |
|-----------|------|-----------|
| **base-progress.tsx** | `.../ui/base-progress.tsx` | Task completion, checklist progress, quantity indicators |
| **badge.tsx** | `.../ui/badge.tsx` | Status indicators, counts, labels |
| **base-combobox.tsx** | `.../ui/base-combobox.tsx` | Product search, material picker, template selection |
| **base-sheet.tsx** | `.../ui/base-sheet.tsx` | Sidebars, preview panels, unscheduled jobs drawer |
| **filters.tsx** | `.../ui/filters.tsx` | Multi-select filters for calendar, reports |
| **base-checkbox.tsx** | `.../ui/base-checkbox.tsx` | Checklist items, selection |
| **base-switch.tsx** | `.../ui/base-switch.tsx` | Billable toggle in time entries |
| **base-toast.tsx** | `.../ui/base-toast.tsx` | Success/error notifications, undo actions |

---

## Special Component Highlights

### 1. Timer Widget (DOM-JOBS-003c)
**Component**: `statistic-card-10.tsx`
**Usage**: Active job timer with live-updating elapsed time
**Features**:
- Large HH:MM:SS display
- 48px touch-friendly start/stop button
- Live updates every second via useEffect
- ARIA live region for status announcements
- Pulse animation when running

### 2. Kanban Board (DOM-JOBS-001c)
**Component**: `kanban.tsx`
**Usage**: Task management with status columns (Pending, In Progress, Completed, Blocked)
**Features**:
- Drag-drop between columns for status changes
- Touch-friendly mobile interactions
- Position persistence
- Falls back to vertical list on mobile

### 3. Drag-Drop Calendar (DOM-JOBS-005b)
**Third-party**: FullCalendar or react-big-calendar
**Supporting**: Sheet (unscheduled jobs sidebar), Filters, Toast
**Features**:
- Drag jobs to reschedule
- Optimistic updates with error rollback
- @dnd-kit/core for accessibility
- Keyboard alternative via dialog

### 4. Multi-Step Template Form (DOM-JOBS-007c)
**Component**: `base-tabs.tsx` (adapted for stepper)
**Usage**: Template creation with 4 steps (Details, Tasks, Materials, Checklist)
**Features**:
- Step indicator (1 of 4)
- Next/Prev navigation
- Save on each step
- Preview panel with Sheet component

---

## Midday Reference Components

While REUI provides the base components, Midday chart components are suggested for enhanced visualizations:

### Job Costing Report (DOM-JOBS-008b)
**Suggested Charts**:
- **ProfitChart** (`_reference/.midday-reference/.../charts/profit-chart.tsx`) - Line chart showing profit trend over time
- **CategoryExpenseDonutChart** - Breakdown of costs by job type

**Note**: These are optional enhancements beyond the core DataGrid implementation.

---

## Pattern Breakdown by Story

### DOM-JOBS-001c: Task Management

**Layout Pattern**: Tabs → Kanban (desktop) / List (mobile)

**Primary Components**:
- Kanban board for drag-drop task reordering
- List card for task display (title, description, assignee, due date)

**Supporting**:
- Dialog for add/edit task form
- Progress bar for completion percentage
- Badge for status indicators

**Mobile Optimization**: Falls back to vertical list with status badges

---

### DOM-JOBS-002c: BOM Tracking

**Layout Pattern**: Header card (cost summary) → Data Grid → Action buttons

**Primary Components**:
- Data Grid for materials list (Product, SKU, Qty Required/Used, Cost)
- Statistic Card for total cost summary

**Supporting**:
- Combobox for product search/picker
- Number Field with stepper for quantity input
- Progress bar for used/required ratio

**Key Feature**: Inline editing for quantity used with custom cell renderer

---

### DOM-JOBS-003c: Time Tracking

**Layout Pattern**: Sticky timer card → Summary cards (3-col grid) → Data Grid

**Primary Components**:
- Statistic Card 10 as timer widget (HH:MM:SS display)
- Data Grid for time entries list

**Supporting**:
- Statistic Card 1 for summary metrics (Total Hours, Billable Hours, Labor Cost)
- Switch for billable toggle
- DateField for start/end time pickers

**Realtime**: Timer updates every second, ARIA live region for announcements

---

### DOM-JOBS-004c: Commissioning Checklist

**Layout Pattern**: Progress header → Checklist items (vertical list) → Apply Template button if empty

**Primary Components**:
- List Card for checklist items (checkbox, text, photo, notes)
- Progress bar for completion percentage

**Supporting**:
- Checkbox (44px tap target for mobile)
- Dialog for photo preview and notes
- Data Grid for template management in settings
- Kanban for template editor (drag-drop item ordering)

**Mobile Optimization**: Swipe to complete, full-width cards, large tap targets

---

### DOM-JOBS-005a & 005b: Job Scheduling Calendar

**Layout Pattern**: Header (view toggle, navigation) → Calendar grid → Legend + Unscheduled sidebar

**Primary Components**:
- FullCalendar/react-big-calendar (third-party, not REUI)
- Tabs for Month/Week/Day view toggle
- Sheet for unscheduled jobs sidebar

**Supporting**:
- Badge for job status on calendar events
- Popover for job preview on hover (desktop)
- Filters for technician multi-select
- Alert Dialog for reschedule confirmation
- Toast for success/error with undo

**Drag-Drop**: @dnd-kit/core for accessibility, optimistic updates

**Color Coding**:
- Scheduled: Blue
- In Progress: Orange
- Completed: Green
- Cancelled: Gray

---

### DOM-JOBS-007c: Job Templates

**Layout Pattern**: Data Grid → Dialog (multi-step form) → Preview sheet

**Primary Components**:
- Data Grid for template list
- Tabs (adapted as stepper) for multi-step form

**Supporting**:
- Dialog (full-screen) for template creation/editing
- Kanban for task ordering in template
- Combobox for product/checklist selection
- Sheet for preview panel

**Multi-Step Flow**: Details → Tasks → Materials → Checklist (4 steps)

---

### DOM-JOBS-008b: Job Costing Report

**Layout Pattern**: Summary cards (4-col grid) → Filters bar → Data Grid → Export button

**Primary Components**:
- Data Grid for costing report table (9 columns)
- Statistic Cards for summary metrics (Revenue, Cost, Profit, Margin)

**Supporting**:
- Filters for date range, customer, job type, status
- Calendar for date range picker
- Button for CSV export

**Color Coding**:
- Green: Margin >10% (healthy)
- Yellow: Margin 0-10% (marginal)
- Red: Margin <0% (loss)

**Optional Enhancement**: Midday ProfitChart and CategoryExpenseDonutChart

---

## Common Patterns Across All Stories

### 1. Responsive Layout
- **Mobile**: Single column, full-width cards, bottom sheets, sticky headers
- **Tablet**: Two-column grids, collapsible sidebars
- **Desktop**: Multi-column layouts, data grids, hover interactions

### 2. Accessibility
- **ARIA labels**: All interactive elements labeled
- **Keyboard navigation**: Tab, Enter, Space, Arrow keys
- **Screen reader**: Proper announcements, live regions for dynamic updates
- **Focus management**: Predictable focus flow, return to origin after dialogs

### 3. Loading States
- **Skeleton**: Placeholder matching actual layout (3-5 items)
- **Spinner**: Overlay for async operations (reschedule, save)

### 4. Empty States
- **Illustration**: Contextual imagery (clipboard, timer, calendar)
- **CTA**: Primary action button (Add First Task, Start Timer, Apply Template)

### 5. Error Handling
- **Error Boundary**: Wraps all features with retry action
- **Toast**: Non-blocking error notifications with undo where applicable
- **Validation**: Inline form validation with clear error messages

---

## Implementation Notes

### Touch Targets
All mobile interactive elements use **minimum 44px tap targets** per WCAG 2.1 Level AAA guidelines:
- Buttons (Start Timer, Add Task)
- Checkboxes (Checklist items)
- Drag handles
- Row actions

### Color Consistency
Status colors standardized across Jobs domain:
- **Blue**: Scheduled, Informational, Allocated
- **Green**: Completed, Healthy, Positive variance
- **Orange**: In Progress, Warning, At risk
- **Red**: Blocked, Critical, Negative variance
- **Gray**: Cancelled, Inactive, Neutral

### Currency Formatting
All cost displays use consistent AUD currency formatting with:
- Dollar sign prefix
- Two decimal places
- Thousands separators
- Delta badges for comparisons

---

## Development Guidance

### File Organization
```
src/components/domain/jobs/
├── job-tasks-list.tsx           # DOM-JOBS-001c
├── task-dialog.tsx
├── job-materials-tab.tsx        # DOM-JOBS-002c
├── add-material-dialog.tsx
├── job-time-tab.tsx             # DOM-JOBS-003c
├── time-entry-dialog.tsx
├── active-timer.tsx
├── job-checklist-tab.tsx        # DOM-JOBS-004c
├── checklist-item.tsx
├── job-calendar.tsx             # DOM-JOBS-005a/b
├── unscheduled-jobs-sidebar.tsx
├── job-template-form.tsx        # DOM-JOBS-007c
└── job-costing-table.tsx        # DOM-JOBS-008b

src/routes/_authed/
├── jobs/
│   └── calendar.tsx             # DOM-JOBS-005a/b
├── settings/
│   ├── checklist-templates.tsx  # DOM-JOBS-004c
│   └── job-templates.tsx        # DOM-JOBS-007c
└── reports/
    └── job-costing.tsx          # DOM-JOBS-008b

src/routes/installer/jobs/
└── $jobId.tsx                   # Modified for tabs: Tasks, BOM, Time, Checklist
```

### Component Import Pattern
```tsx
// REUI base components
import { DataGrid } from "@/components/ui/data-grid"
import { Dialog } from "@/components/ui/base-dialog"
import { Badge } from "@/components/ui/badge"

// REUI blocks
import { StatisticCard } from "@/components/blocks/cards/statistic-cards/statistic-card-1"

// Domain components
import { TaskDialog } from "@/components/domain/jobs/task-dialog"
```

### Recommended Next Steps

1. **Shared Job Components** (Create once, reuse)
   - `JobStatusBadge` - Status indicator with color logic
   - `JobCostSummary` - Currency display with delta badge
   - `JobProgressBar` - Consistent progress visualization
   - `JobActionMenu` - Dropdown with common actions (Edit, Delete, Duplicate)

2. **Mobile-Optimized Variants**
   - `TaskCardMobile` - Touch-friendly task card for mobile view
   - `MaterialRowMobile` - Swipeable material row with inline editing
   - `ChecklistItemMobile` - Large tap targets with swipe-to-complete

3. **Custom Hooks**
   - `useJobTimer` - Timer logic with persistence (startTime, elapsed, isRunning)
   - `useDragDropCalendar` - @dnd-kit integration for calendar scheduling
   - `useJobCosting` - Cost calculation and margin computation

4. **Validation Schemas**
   - Reference `src/lib/schemas/job-*.ts` for Zod schemas
   - Ensure all forms use schema validation before server calls
   - Add custom error messages for domain-specific rules

---

## PRD Changes Summary

**File Modified**: `opc/_Initiation/_prd/domains/jobs.prd.json`

**Changes Made**:
- Added `uiPatterns` field to 6 UI stories (001c, 002c, 003c, 004c, 005a/b, 007c, 008b)
- Updated `updated` field to "2026-01-10"

**Structure of uiPatterns Field**:
```json
{
  "uiPatterns": {
    "primaryComponents": [
      {
        "name": "Component Name",
        "component": "file-name.tsx",
        "path": "_reference/.reui-reference/...",
        "usage": "How to use in this story",
        "features": ["Feature 1", "Feature 2"],
        "adaptation": "Optional customization notes"
      }
    ],
    "supportingComponents": [...],
    "layoutPattern": "High-level layout description",
    "emptyState": "Empty state description",
    "loadingState": "Loading skeleton description",
    "colorCoding": {...},        // Optional
    "dragDropLibrary": "...",    // Optional
    "realtime": "...",           // Optional
    "optimisticUpdate": "...",   // Optional
    "chartReference": {...}      // Optional
  }
}
```

**JSON Validity**: Verified with JSON parser - no syntax errors

---

## Summary

All 6 UI stories in the Jobs domain PRD now have comprehensive UI pattern mappings to REUI components and Midday references. This provides clear implementation guidance for developers, ensuring:

1. **Consistency**: Reusable components across all job features
2. **Accessibility**: WCAG 2.1 Level AA compliance (AAA for touch targets)
3. **Responsiveness**: Mobile-first design with tablet/desktop enhancements
4. **Performance**: Optimistic updates, skeleton loading, efficient rendering
5. **Maintainability**: Shared patterns, documented adaptations, clear file structure

The PRD is ready for development handoff.
