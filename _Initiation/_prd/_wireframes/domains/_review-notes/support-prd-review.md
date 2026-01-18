# Support PRD UI Pattern Enhancement Review

**Date:** 2026-01-10
**PRD:** DOM-SUPPORT (Support/Issues Domain)
**Task:** Backfill UI patterns to all stories

## Overview

Enhanced the Support PRD with comprehensive UI patterns by adding `uiPatterns` field to all 17 stories. Each story now includes:
- Specific RE-UI components to use
- Reference files from Midday and RE-UI
- Implementation notes and design guidance

## Changes Made

### Stories Enhanced: 17/17

All stories from DOM-SUP-001a through DOM-SUP-008 now have complete UI pattern specifications.

## UI Pattern Summary by Feature

### 1. SLA Tracking (DOM-SUP-001a/b/c)

**Components Used:**
- `form.tsx`, `select.tsx`, `input.tsx`, `dialog.tsx` - Settings management
- `badge.tsx` (yellow/red variants) - Breach indicators
- `alert.tsx` - Warning notifications
- `card.tsx` - Dashboard widgets
- `chart.tsx` - Trend visualization
- `progress.tsx` - Time remaining bars
- `counting-number.tsx` - Animated metrics

**Design Notes:**
- Color coding: default (on-track), yellow (at-risk <25% remaining), red (breached)
- Dashboard shows: total breaches, breach rate %, avg response/resolution time
- Settings page pattern for SLA policy CRUD

### 2. Escalation (DOM-SUP-002a/b)

**Components Used:**
- `dialog.tsx`, `form.tsx` - Escalation reason capture
- `button.tsx` (destructive variant) - Escalate/de-escalate actions
- `badge.tsx` - Escalated status indicators
- `tabs.tsx` - Timeline history view
- `table.tsx` - Rules list
- `select.tsx`, `input.tsx` - Rule builder

**Design Notes:**
- Timeline shows escalation events with timestamp, actor, reason
- Rule builder: condition type (time/customer type), threshold, action (notify/reassign)
- Auto-escalated badge distinguishes from manual escalation

### 3. RMA Workflow (DOM-SUP-003a/b/c)

**Components Used:**
- `form.tsx`, `input.tsx` - RMA creation
- `checkbox.tsx` - Item selection from order
- `badge.tsx` - Status indicators (requested/approved/received/processed/rejected)
- `button.tsx` - Workflow transitions
- `dialog.tsx` - Confirmation modals
- `alert.tsx` - Validation errors
- `data-grid.tsx` - RMA list
- `tabs.tsx` - Issue detail integration
- `separator.tsx` - Workflow step dividers

**Design Notes:**
- Stepper pattern for workflow progression
- Disable invalid state transitions
- Color-coded status badges
- RMA list shows: number, status, items count, created date, actions

### 4. Issue Templates (DOM-SUP-004)

**Components Used:**
- `dialog.tsx` - Template selector modal
- `card.tsx` - Template cards with preview
- `form.tsx` - Template builder
- `data-grid.tsx` - Template management table
- `badge.tsx` - Usage count badges
- `button.tsx` - Quick create button

**Design Notes:**
- Template selector shows: name, issue type icon, usage count, preview
- Sort by usage count
- Settings page for template CRUD

### 5. CSAT Tracking (DOM-SUP-005a/b/c)

**Components Used:**
- `rating.tsx` - 1-5 star rating component
- `form.tsx` - Feedback forms (internal + public)
- `card.tsx` - Feedback display, thank you confirmation
- `badge.tsx` - Rating score badges
- `alert.tsx` - Rate limit warnings, low rating notifications
- `chart.tsx` - CSAT trend line chart
- `counting-number.tsx` - Animated average score

**Design Notes:**
- Public form is minimal: star rating, optional comment, submit
- Dashboard color-code: green >=4, yellow 3-4, red <3
- Low rating (1-2) triggers follow-up notification

### 6. Support Dashboard (DOM-SUP-006)

**Components Used:**
- `card.tsx` - Metric cards
- `chart.tsx` - Trend charts (line, bar, pie)
- `data-grid.tsx` - Issue queue table
- `button.tsx` - Quick actions
- `tabs.tsx` - Dashboard sections
- `counting-number.tsx` - Animated metrics
- `badge.tsx` - Status indicators

**Design Notes:**
- Layout: 4 metric cards (open, breached, avg response, avg resolution)
- 2 charts: type breakdown, priority distribution
- Issue queue table with quick actions in header

### 7. Knowledge Base (DOM-SUP-007a/b/c)

**Components Used:**
- `form.tsx`, `input.tsx`, `textarea.tsx` - Article editor
- `select.tsx` - Category dropdown
- `data-grid.tsx` - Article list
- `card.tsx` - Article preview/suggestion cards
- `badge.tsx` - Status, view count, tag filters
- `command.tsx` - Search command palette
- `accordion.tsx` - Category hierarchy tree
- `breadcrumb.tsx` - Category navigation
- `popover.tsx` - Article quick preview
- `button.tsx` - Helpful/not helpful votes

**Design Notes:**
- Article editor supports markdown
- Instant search results as typing
- Category tree allows nesting
- Issue form sidebar shows relevant articles based on type/description
- Track view count and helpfulness votes

### 8. Kanban Board (DOM-SUP-008)

**Components Used:**
- `kanban.tsx` - Drag-drop board
- `card.tsx` - Issue cards
- `dialog.tsx` - Status change note prompt
- `checkbox.tsx` - Bulk selection
- `dropdown-menu.tsx` - Bulk actions
- `badge.tsx` - Status, priority, SLA indicators
- `filters.tsx` - Quick filter chips
- `alert.tsx` - Duplicate detection warnings

**Design Notes:**
- Columns: new, open, in_progress, on_hold, resolved, closed
- Drag to change status (prompts for note)
- Bulk select with shift+click
- Filter bar: my issues, unassigned, SLA at risk

## Reference Files Used

### RE-UI Components (`_reference/.reui-reference/registry/default/ui/`)
- Core: badge, button, card, form, input, select, dialog
- Data: data-grid, table, kanban
- Interaction: checkbox, rating, command, popover, accordion
- Visualization: chart, progress, counting-number
- Layout: tabs, separator, breadcrumb, filters

### Midday Patterns (`_reference/.midday-reference/apps/dashboard/src/components/`)
- `support-form.tsx` - Form structure with Select/Textarea/validation
- `metrics/*.tsx` - Dashboard widget patterns
- Form handling with zod + next-safe-action

## Component Usage Statistics

| Component | Stories Using | Primary Use Cases |
|-----------|---------------|-------------------|
| badge.tsx | 11/17 | Status indicators, SLA warnings, counts |
| form.tsx | 10/17 | All CRUD operations, settings |
| button.tsx | 9/17 | Actions, workflow transitions |
| dialog.tsx | 9/17 | Modals, confirmations |
| card.tsx | 9/17 | Dashboard widgets, content display |
| input.tsx | 7/17 | Form fields, search |
| data-grid.tsx | 6/17 | Lists, tables |
| alert.tsx | 5/17 | Warnings, errors |
| chart.tsx | 4/17 | Dashboard visualizations |
| select.tsx | 4/17 | Dropdowns, filters |

## Design Consistency Patterns

### Status Indicators
- Use `badge.tsx` with color variants
- Standard colors: green (success), yellow (warning), red (error/breach)
- Show status on cards, tables, detail pages

### Forms
- Follow Midday `support-form.tsx` pattern
- Use zod schemas for validation
- next-safe-action for server actions
- Toast notifications on success/error

### Dashboards
- Metric cards with `counting-number.tsx` animations
- Charts for trends and distributions
- Quick action buttons in header
- Responsive grid layout

### Workflows
- Stepper/progress pattern for multi-step processes
- Disable invalid transitions
- Confirmation dialogs for state changes
- Timeline view for history

### Lists/Tables
- Use `data-grid.tsx` for complex tables with sorting/filtering
- Quick filters as chips at top
- Bulk actions with checkbox selection
- Badge indicators in cells

## Implementation Recommendations

### Phase 1: Foundation (Stories 1-3)
Start with SLA tracking (001a/b/c) as it affects all subsequent features. This establishes:
- Badge system for indicators
- Dashboard patterns
- Form patterns

### Phase 2: Core Workflows (Stories 4-6)
Implement escalation (002a/b) and RMA (003a/b/c) workflows. These establish:
- Workflow state machines
- Status transition patterns
- Timeline/history views

### Phase 3: Enhancements (Stories 7-11)
Add templates (004) and CSAT (005a/b/c). These establish:
- Template/preset patterns
- Rating components
- Public forms

### Phase 4: Dashboard (Story 6)
Build support dashboard (006). Consolidates all metrics and patterns from previous phases.

### Phase 5: Knowledge Base (Stories 7-9)
Implement KB (007a/b/c). Establishes:
- Search patterns
- Content management
- Hierarchical data (categories)

### Phase 6: Advanced UI (Story 10)
Finally add Kanban board (008). Requires:
- All previous badge/filter patterns
- Drag-drop library
- Complex state management

## Validation

### JSON Validity
- Verified JSON structure is valid
- All stories have consistent uiPatterns structure
- No syntax errors

### Component References
- All components exist in `_reference/.reui-reference/registry/default/ui/`
- Reference files are real paths
- Midday patterns correctly referenced

### Coverage
- 17/17 stories have UI patterns
- All major features covered
- Consistent naming and structure

## Next Steps

1. Review this enhancement with product team
2. Create wireframes for key screens based on these patterns
3. Update story acceptance criteria to include UI component tests
4. Add Storybook stories for key component combinations
5. Create UI pattern library documentation

## Notes

- UI patterns focus on RE-UI components as primary library
- Midday patterns used as reference for complex interactions
- Design system maintains consistency across all features
- Component reuse maximized (badge, form, card used extensively)
- Accessibility considerations deferred to implementation phase
