# Dashboard Date Range Selector Wireframe

**Story:** DOM-DASH-002a, DOM-DASH-002b
**Purpose:** Date range selection for filtering all dashboard widgets
**Design Aesthetic:** Compact, accessible, prominent position

---

## UI Patterns (Reference Implementation)

### Button (Toggle Group)
- **Pattern**: RE-UI Button with Toggle Group pattern
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Preset button group (Today, This Week, This Month, etc.)
  - Active/selected state styling with filled background
  - Hover states and focus indicators
  - Radio button behavior within group

### Calendar
- **Pattern**: RE-UI Calendar
- **Reference**: `_reference/.reui-reference/registry/default/ui/calendar.tsx`
- **Features**:
  - Dual calendar view for start/end date selection
  - Date range highlighting with visual connection
  - Month/year navigation controls
  - Keyboard navigation (Arrow keys, Page Up/Down, Home/End)

### Popover
- **Pattern**: RE-UI Popover
- **Reference**: `_reference/.reui-reference/registry/default/ui/popover.tsx`
- **Features**:
  - Custom date range picker dialog
  - Positioned relative to trigger button
  - Focus trap and Escape key dismissal
  - Quick preset shortcuts within popover

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Selected date range display indicator
  - Preset label badge (e.g., "This Month", "Custom Range")
  - Visual distinction for active date context

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-002a, DOM-DASH-002b | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Date Range Selector - Desktop Layout

```
+========================================================================+
|  DASHBOARD HEADER WITH DATE RANGE SELECTOR                              |
+========================================================================+
|  Dashboard                                                              |
|  +------------------------------------------------------------------+  |
|  |  PRESET BUTTONS                          CUSTOM RANGE             |  |
|  |  [Today] [This Week] [This Month] [This Quarter] [YTD] [Custom v] |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  Selected: Dec 1 - Dec 10, 2024 (This Month)                           |
+========================================================================+
```

## Preset Button States

```
BUTTON STATES:

Unselected:
+------------+
| This Week  |  <- Outline style, muted
+------------+

Selected:
+============+
| This Month |  <- Filled style, primary color
+============+

Hover:
+------------+
| This Week  |  <- Subtle highlight
+------------+

Disabled (invalid range):
+------------+
| This Year  |  <- Grayed out, no pointer
+------------+
```

## Custom Date Range Picker

```
+================================================================+
|  CUSTOM DATE RANGE DIALOG                            [X Close]  |
+================================================================+
|                                                                 |
|  +---------------------------+  +---------------------------+   |
|  | Start Date                |  | End Date                  |   |
|  +---------------------------+  +---------------------------+   |
|  | [Calendar icon] Dec 1     |  | [Calendar icon] Dec 10    |   |
|  +---------------------------+  +---------------------------+   |
|                                                                 |
|  +---------------------------+  +---------------------------+   |
|  |      December 2024        |  |      December 2024        |   |
|  | Su Mo Tu We Th Fr Sa      |  | Su Mo Tu We Th Fr Sa      |   |
|  |  1  2  3  4  5  6  7      |  |  1  2  3  4  5  6  7      |   |
|  |  8  9 10 11 12 13 14      |  |  8  9[10]11 12 13 14      |   |
|  | 15 16 17 18 19 20 21      |  | 15 16 17 18 19 20 21      |   |
|  | 22 23 24 25 26 27 28      |  | 22 23 24 25 26 27 28      |   |
|  | 29 30 31                  |  | 29 30 31                  |   |
|  +---------------------------+  +---------------------------+   |
|                                                                 |
|  Quick Presets:                                                 |
|  [Last 7 Days] [Last 30 Days] [Last 90 Days] [Last Year]       |
|                                                                 |
+================================================================+
|  Selected: Dec 1 - Dec 10 (10 days)                             |
|                                [Cancel]  [Apply Range]          |
+================================================================+
```

## Date Range Display Badge

```
+--------------------------------------------------+
|  DATE RANGE INDICATOR (Always Visible)            |
+--------------------------------------------------+
|                                                   |
|  +---------------------------------------------+ |
|  | [Calendar] Dec 1 - Dec 10, 2024  [v]        | |  <- Clickable to change
|  +---------------------------------------------+ |
|                                                   |
|  Subtitle: "This Month" or "Custom Range"         |
+--------------------------------------------------+
```

## Tablet Layout (768px - 1199px)

```
+================================================+
|  Dashboard                                      |
|  +------------------------------------------+  |
|  | [Today] [Week] [Month] [Quarter] [YTD]   |  |  <- Abbreviated labels
|  |                                          |  |
|  | [Calendar] Dec 1 - Dec 10  [Custom v]    |  |  <- Date below buttons
|  +------------------------------------------+  |
+================================================+
```

## Mobile Layout (<768px)

```
+================================+
|  Dashboard            [...]    |
+================================+
|  +----------------------------+|
|  | [Calendar] This Month   [v]||  <- Compact dropdown
|  +----------------------------+|
+================================+

Mobile Dropdown Expanded:
+================================+
|  Select Date Range    [X]      |
+================================+
|  [ ] Today                     |
|  [ ] This Week                 |
|  [x] This Month   <-- Selected |
|  [ ] This Quarter              |
|  [ ] Year to Date              |
|  ----------------------------  |
|  [ ] Custom Range...           |
+================================+
```

## Custom Range Mobile (Full Screen Modal)

```
+================================+
|  Custom Date Range    [X]      |
+================================+
|                                |
|  Start Date                    |
|  +----------------------------+|
|  | [Calendar] Dec 1, 2024     ||
|  +----------------------------+|
|                                |
|  +----------------------------+|
|  |      December 2024   < >   ||
|  | Su Mo Tu We Th Fr Sa       ||
|  | [1] 2  3  4  5  6  7       ||
|  |  8  9 10 11 12 13 14       ||
|  | 15 16 17 18 19 20 21       ||
|  | 22 23 24 25 26 27 28       ||
|  | 29 30 31                   ||
|  +----------------------------+|
|                                |
|  End Date                      |
|  +----------------------------+|
|  | [Calendar] Dec 10, 2024    ||
|  +----------------------------+|
|                                |
+================================+
|  [Cancel]        [Apply Range] |
+================================+
```

## Date Range Context Propagation

```
+================================================================+
|  HOW DATE RANGE FLOWS TO WIDGETS                                |
+================================================================+
|                                                                 |
|  Dashboard Header                                               |
|  +-----------------------------------------------------------+ |
|  | Date Range: Dec 1 - Dec 10                                 | |
|  +-----------------------------------------------------------+ |
|           |                                                     |
|           v  (Context Provider)                                 |
|  +-----------------------------------------------------------+ |
|  | DashboardContext.dateRange = { start, end }                | |
|  +-----------------------------------------------------------+ |
|           |                                                     |
|           +---> KPI Widget 1 (uses dateRange)                   |
|           |                                                     |
|           +---> KPI Widget 2 (uses dateRange)                   |
|           |                                                     |
|           +---> Chart Widget (uses dateRange)                   |
|           |                                                     |
|           +---> Activity Feed (uses dateRange)                  |
|                                                                 |
+================================================================+
```

## Widget Loading During Date Change

```
Date Change Sequence:

1. User selects new date range
+-------------------------------------------+
| [This Week] -> [This Month] (clicked)     |
+-------------------------------------------+

2. All widgets show loading state
+-------------------------------------------+
| +--------+ +--------+ +--------+          |
| |Loading | |Loading | |Loading |          |
| |[====]  | |[====]  | |[====]  |          |
| +--------+ +--------+ +--------+          |
+-------------------------------------------+

3. Widgets refresh with new data
+-------------------------------------------+
| +--------+ +--------+ +--------+          |
| |$45,230 | |   47   | |$456K   |          |
| |  +8%   | |   -3   | |  +12%  |          |
| +--------+ +--------+ +--------+          |
+-------------------------------------------+

4. ARIA announcement
"Dashboard updated for December 1 through December 10"
```

## URL State Preservation

```
URL Structure:

/dashboard?dateRange=this-month
/dashboard?dateRange=custom&start=2024-12-01&end=2024-12-10
/dashboard?dateRange=last-7-days

When user navigates away and back:
- Date range restored from URL
- Widgets load with preserved range
- Back button returns to previous range
```

## Preset Definitions

```
+--------------------------------------------------+
| PRESET       | START              | END           |
+--------------------------------------------------+
| Today        | Today 00:00        | Today 23:59   |
| This Week    | Monday 00:00       | Sunday 23:59  |
| This Month   | Month 1st 00:00    | Last day 23:59|
| This Quarter | Quarter start      | Quarter end   |
| YTD          | Jan 1 00:00        | Today 23:59   |
| Last 7 Days  | 7 days ago 00:00   | Today 23:59   |
| Last 30 Days | 30 days ago 00:00  | Today 23:59   |
| Last 90 Days | 90 days ago 00:00  | Today 23:59   |
| Last Year    | Year start         | Year end      |
+--------------------------------------------------+
```

## Error Handling

### Invalid Date Range

```
+-------------------------------------------+
| [Start: Dec 15] [End: Dec 10]             |
|                                           |
| [!] End date must be after start date     |
|                                           |
| [Apply Range] <- Disabled                 |
+-------------------------------------------+
```

### Future Date Warning

```
+-------------------------------------------+
| [Start: Dec 1] [End: Dec 25]              |
|                                           |
| [i] Range includes future dates.          |
|     Some widgets may show partial data.   |
|                                           |
| [Apply Range]                             |
+-------------------------------------------+
```

### Maximum Range Exceeded

```
+-------------------------------------------+
| [Start: Jan 1, 2023] [End: Dec 10, 2024]  |
|                                           |
| [!] Maximum range is 365 days.            |
|     Please select a shorter range.        |
|                                           |
| [Apply Range] <- Disabled                 |
+-------------------------------------------+
```

## Accessibility Requirements

### ARIA Labels

```tsx
<div role="group" aria-label="Date range selection">
  <div role="radiogroup" aria-label="Preset date ranges">
    <button
      role="radio"
      aria-checked="true"
      aria-label="This Month, December 1 to December 31"
    >
      This Month
    </button>
    {/* ... other presets */}
  </div>

  <button
    aria-haspopup="dialog"
    aria-expanded="false"
    aria-label="Select custom date range"
  >
    Custom
  </button>
</div>
```

### Keyboard Navigation

```
Tab: Move between preset buttons and custom trigger
Arrow Left/Right: Navigate between presets
Enter/Space: Select preset or open custom dialog
Escape: Close custom dialog

In Calendar:
Arrow keys: Navigate dates
Enter: Select date
Page Up/Down: Previous/Next month
Home: First day of month
End: Last day of month
```

### Screen Reader Announcements

```
On preset selection:
"This Month selected. Dashboard showing December 1 to December 31, 2024"

On custom range apply:
"Custom range applied. Dashboard showing December 1 to December 10, 2024"

On widget refresh:
"Dashboard data updated for selected date range"
```

## Loading and Transition States

### Preference Loading

```
+-------------------------------------------+
| Loading preferences...                    |
| +---------------------------------------+ |
| | [====>                            ]   | |
| +---------------------------------------+ |
+-------------------------------------------+
```

### Transition Between Ranges

```
Previous Range -> New Range

1. Fade out current data (200ms)
2. Show skeleton loaders
3. Fetch new data
4. Fade in new data (200ms)
5. Announce completion
```

## Component Props Interface

```typescript
interface DateRangeSelectorProps {
  // Current value
  value: DateRange;
  onChange: (range: DateRange) => void;

  // Presets
  presets?: DatePreset[];
  showPresets?: boolean;

  // Validation
  minDate?: Date;
  maxDate?: Date;
  maxRangeDays?: number;

  // States
  isLoading?: boolean;
  disabled?: boolean;

  // Display
  showSelectedLabel?: boolean;
  compact?: boolean; // For mobile

  // Persistence
  persistToUrl?: boolean;
  persistToStorage?: boolean;
  storageKey?: string;
}

interface DateRange {
  start: Date;
  end: Date;
  preset?: string; // "this-month", "custom", etc.
}

interface DatePreset {
  id: string;
  label: string;
  shortLabel?: string; // For mobile
  getRange: () => { start: Date; end: Date };
}
```

## Default Preference Storage

```typescript
// localStorage key: "dashboard-date-range"
interface StoredPreference {
  preset: string | null;
  customStart?: string; // ISO date
  customEnd?: string;   // ISO date
  lastUpdated: string;  // ISO timestamp
}

// Example:
{
  "preset": "this-month",
  "customStart": null,
  "customEnd": null,
  "lastUpdated": "2024-12-10T14:30:00Z"
}
```

## Success Metrics

- Date range selection completes in < 500ms
- Preset selection is single-click
- Custom range selection is < 5 clicks
- Date range persists across page refreshes
- All widgets update within 2 seconds of range change
- Keyboard users can select any date range
- Screen reader users receive clear announcements
