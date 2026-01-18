# Forecasting Fields UI Wireframe
## DOM-PIPE-001c: Probability, Expected Close, Weighted Values

**Last Updated:** 2026-01-10
**PRD Reference:** pipeline.prd.json
**Story:** DOM-PIPE-001c

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-001c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD
- **Pipeline Stages**: Lead → Qualified → Site Visit → Quote Sent → Negotiation → Won/Lost
- **Win Rate Targets**: 65-70%

---

## Overview

This wireframe covers the UI integration for forecasting fields:
- Probability slider (0-100%)
- Expected close date picker
- Weighted value calculations
- Visual indicators based on probability and overdue status

## UI Patterns (Reference Implementation)

### Slider (Probability Control)
- **Pattern**: RE-UI Slider
- **Reference**: `_reference/.reui-reference/registry/default/ui/slider.tsx`
- **Features**:
  - Horizontal slider with customizable range (0-100%)
  - Accessible keyboard controls (Arrow keys, Page Up/Down, Home/End)
  - Visual thumb indicator with hover/active states
  - ARIA attributes for screen reader support (aria-valuenow, aria-valuemin, aria-valuemax)

### Calendar (Expected Close Date Picker)
- **Pattern**: RE-UI Calendar + Popover
- **Reference**: `_reference/.reui-reference/registry/default/ui/calendar.tsx`
- **Features**:
  - Date selection dialog with month/year navigation
  - Quick select buttons (+7, +14, +30 days)
  - Accessible date picker with keyboard navigation
  - Popover trigger for date picker dialog

### Badge (Probability & Status Indicators)
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded probability badges (green=high, yellow=medium, red=low)
  - Overdue status badges with alert icons
  - Responsive badge sizing (full/compact/icon-only)
  - Semantic color variants matching probability ranges

### Card (Opportunity Display)
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Opportunity card with probability-based background intensity
  - Visual border states for overdue quotes (red border)
  - Header, content, and footer sections for structured layout
  - Accessible card structure with proper headings

---

## Opportunity Form Integration

### Desktop Form Layout (Full Width)
```
+================================================================================+
| Opportunity: Acme Corporation                                             [x]  |
+================================================================================+
|                                                                                 |
| +== 1 == Basic Information ===================================================+|
| |                                                                              ||
| | Customer *                          Contact                                  ||
| | [Acme Corporation          v]       [John Doe                    v]          ||
| |                                                                              ||
| | Opportunity Name *                  Value *                                  ||
| | [Website Redesign Project__]        [$_______15,000_____]                    ||
| |                                                                              ||
| +===========================================================================+  |
|                                                                                 |
| +== 2 == Forecasting ========================================================+|
| |                                                                              ||
| | Probability *                                                                ||
| | +-----------------------------------------------------------------+          ||
| | |  10%  |  20%  |  30%  |  40%  |  50%  |  60%  |  70%  |  80%  |  90%  | 100%|
| | |       |       |   O   |       |       |       |       |       |       |    ||
| | +-----------------------------------------------------------------+          ||
| | [==========O==========================================] 30%                  ||
| |                                                                              ||
| | aria-valuenow="30" aria-valuemin="0" aria-valuemax="100"                     ||
| | aria-label="Probability of winning this opportunity"                         ||
| |                                                                              ||
| | Stage defaults: New=10% | Quoted=30% | Pending=60% | Ordered=90%             ||
| |                                                                              ||
| | Expected Close Date                 Weighted Value                           ||
| | [Jan 15, 2026        v]             $4,500                                   ||
| | [Calendar picker]                   (auto-calculated: $15,000 x 30%)         ||
| |                                     aria-label="Weighted value based on      ||
| |                                     probability: $4,500"                     ||
| +===========================================================================+  |
|                                                                                 |
| +== 3 == Notes ==============================================================+|
| | [Additional notes about this opportunity...                               ]  ||
| +===========================================================================+  |
|                                                                                 |
|                                              [Cancel] [Save Opportunity]        |
+================================================================================+
```

### Tablet Form Layout (Side by Side, Compact)
```
+============================================+
| Opportunity: Acme Corp               [x]   |
+============================================+
|                                            |
| Customer *           Contact               |
| [Acme Corp      v]   [John Doe      v]     |
|                                            |
| Name *               Value *               |
| [Website Rede...]    [$15,000      ]       |
|                                            |
| --- Forecasting ---                        |
|                                            |
| Probability: 30%                           |
| [=====O======================]             |
|                                            |
| Expected Close      Weighted               |
| [Jan 15, 2026 v]    $4,500                 |
|                                            |
| Notes                                      |
| [Additional notes...          ]            |
|                                            |
|            [Cancel] [Save]                 |
+============================================+
```

### Mobile Form Layout (Stacked)
```
+==============================+
| Opportunity            [x]   |
+==============================+
|                              |
| Customer *                   |
| [Acme Corporation     v]     |
|                              |
| Contact                      |
| [John Doe             v]     |
|                              |
| Opportunity Name *           |
| [Website Redesign Pro...]    |
|                              |
| Value *                      |
| [$15,000             ]       |
|                              |
| === Forecasting ===          |
|                              |
| Probability                  |
| +------------------------+   |
| |[=====O=============]30%|   |
| +------------------------+   |
|                              |
| Expected Close Date          |
| [Jan 15, 2026        v]      |
|                              |
| Weighted Value               |
| +------------------------+   |
| | $4,500                 |   |
| | (calculated)           |   |
| +------------------------+   |
|                              |
| Notes                        |
| [Add notes...         ]      |
|                              |
| [Cancel]                     |
| [Save Opportunity]           |
+==============================+
```

---

## Probability Slider Component

### Visual Design
```
Probability Scale with Stage Markers:

       NEW     QUOTED   PENDING   ORDERED    WON
        |         |         |         |        |
        v         v         v         v        v
+-------|---------|---------|---------|--------|--------+
|  10%  |   30%   |   60%   |   90%   |  100%  |        |
+-------|---------|---------|---------|--------|--------+
        [===O================================================]
             ^
             | thumb position (30%)
             |
        Background gradient: light blue (0%) -> dark blue (100%)
```

### Probability Badge Colors
```
0-25%:   [##] Light/Muted    - Low confidence
26-50%:  [##] Medium         - Developing
51-75%:  [##] Strong         - Good chance
76-100%: [##] Dark/Saturated - High confidence

Badge Component:
+-------+
| 30%   |  <- Background intensity matches probability
+-------+
  border-radius: full
  padding: 2px 8px
  font-weight: semibold
```

### Slider Interaction States
```
Idle:
[================================O=============]
                                  ^ gray thumb

Hover:
[================================O=============]
                                  ^ blue thumb, slight grow

Active/Dragging:
[================================O=============]
                                  ^ blue thumb, larger
                             aria-valuenow updates live

Focus:
[================================O=============]
   ^-- focus ring around entire slider track --^

Disabled:
[================================O=============]
   ^-- muted colors, cursor: not-allowed     --^
```

---

## Opportunity Card Display

### Card with Forecasting Fields (Desktop)
```
+=============================================+
| [=] Acme Corporation                        |
|---------------------------------------------|
| $15,000                                     |
|                                             |
| +-------+ +---------------------------+     |
| | 30%   | | Expected: Jan 15, 2026    |     |
| +-------+ +---------------------------+     |
|     ^           ^                           |
|     |           | Date badge                |
|     | Probability badge (colored)           |
|                                             |
| Weighted: $4,500                            |
|---------------------------------------------|
| [Edit] [Follow-up] [More...]                |
+=============================================+
```

### Card with Overdue Expected Close
```
+=============================================+
| [=] Enterprise Co                           |
|---------------------------------------------|
| $22,000                                     |
|                                             |
| +-------+ +---------------------------+     |
| | 80%   | | [!] OVERDUE: Jan 8        |     |
| +-------+ +---------------------------+     |
|                    ^ Red badge with icon    |
|                                             |
| Weighted: $17,600                           |
|---------------------------------------------|
| [Edit] [Follow-up] [More...]                |
+=============================================+
  Border: red (2px)
  aria-label includes: "Expected close date is overdue by 2 days"
```

### Card Probability Backgrounds
```
10% Probability:        30% Probability:        60% Probability:
+----------------+      +----------------+      +----------------+
|░░░░░░░░░░░░░░░░|      |▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒|      |▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓|
|░░ Acme Corp ░░░|      |▒▒ Tech Inc ▒▒▒▒|      |▓▓ Startup X ▓▓▓|
|░░ $5,000   ░░░░|      |▒▒ $15,000  ▒▒▒▒|      |▓▓ $25,000  ▓▓▓▓|
|░░░░░░░░░░░░░░░░|      |▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒|      |▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓|
+----------------+      +----------------+      +----------------+
  Very light shade        Light shade            Medium shade

90% Probability:
+----------------+
|████████████████|
|██ BigCo    ████|
|██ $50,000  ████|
|████████████████|
+----------------+
  Dark shade (but still readable)
```

---

## Pipeline Column Headers

### Column Header with Weighted Total (Desktop)
```
+-- QUOTED -------------------------------------------------+
|                                                           |
|  QUOTED                    8 opportunities                |
|  $78,000 total            Weighted: $23,400               |
|                                                           |
|  [Sort: Value v]                                          |
+-----------------------------------------------------------+
   aria-label="Quoted stage: 8 opportunities,
   total value $78,000, weighted value $23,400"
```

### Column Header States
```
Loading:
+-- QUOTED -------------------------------------------------+
|  QUOTED                    [shimmer======]                |
|  [shimmer=====]           [shimmer=======]                |
+-----------------------------------------------------------+

Error Calculating:
+-- QUOTED -------------------------------------------------+
|  QUOTED                    8 opportunities                |
|  [!] Error                 [Retry]                        |
+-----------------------------------------------------------+
```

---

## Pipeline Metrics Bar

### Desktop Metrics Display
```
+=== PIPELINE METRICS (aria-live="polite") =================+
|                                                           |
| +---------------+ +---------------+ +-----------------+   |
| | Total Value   | | Weighted Val  | | Forecast (Q1)   |   |
| | $450,000      | | $198,000      | | $125,000        |   |
| | [sparkline]   | | [sparkline]   | | (expected wins) |   |
| +---------------+ +---------------+ +-----------------+   |
|                                                           |
| Calculation: Sum of (value * probability) for all active  |
+=============================================================+
```

### Metrics Comparison (Raw vs Weighted)
```
+-----------------------------------------------+
|                                               |
|   Pipeline Value Comparison                   |
|                                               |
|   Raw Total:      $450,000  ████████████████  |
|   Weighted:       $198,000  ███████           |
|                                               |
|   Conversion shows 44% confidence-adjusted    |
|                                               |
+-----------------------------------------------+
```

---

## Loading States

### Probability Calculating
```
+-------+
|[spin] |  <- Small spinner inside badge
+-------+
  aria-busy="true"
  aria-label="Calculating probability"
```

### Weighted Value Loading
```
Weighted: [shimmer=====]
          aria-busy="true"
```

### Form Save with Forecasting
```
+== 2 == Forecasting =====================================+
|                                                         |
| [Saving probability...]                                 |
| [====O================================] 30%             |
|                   ^ disabled during save                |
|                                                         |
| Weighted Value                                          |
| [Recalculating...]                                      |
|                                                         |
+=========================================================+
```

---

## Error States

### Invalid Probability
```
Probability *
+-----------------------------------------------------+
| [==========O========================================]  |
+-----------------------------------------------------+
[!] Probability must be between 0 and 100
    aria-invalid="true"
    aria-describedby="probability-error"
```

### Failed to Save Forecasting Fields
```
+=========================================================+
| [!] Could not update forecasting fields                 |
|                                                         |
| Probability and expected close date were not saved.     |
|                                                         |
| [Dismiss] [Retry]                                       |
+=========================================================+
  role="alert"
  aria-live="assertive"
```

### Weighted Calculation Error
```
+---------------+
| Weighted Val  |
| [!] Error     |
| [Retry]       |
+---------------+
  Tooltip: "Failed to calculate weighted value"
```

---

## Responsive Behavior Summary

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Probability badge | Compact % only | Badge with % | Full badge |
| Expected close | Icon + date | Badge with date | Full date display |
| Weighted value | Below card | Same row | Inline with value |
| Slider | Full width stacked | Inline narrow | Inline wide with markers |
| Column totals | Tooltip on tap | Single total shown | All three totals |
| Metrics bar | 2 cards | 3 cards | 4 cards |

---

## Accessibility Specification

### Probability Slider ARIA
```html
<div role="slider"
     aria-label="Probability of winning this opportunity"
     aria-valuenow="30"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-valuetext="30 percent probability"
     tabindex="0">
  <!-- Visual slider track and thumb -->
</div>
```

### Date Picker ARIA
```html
<button aria-label="Expected close date: January 15, 2026.
                    Click to change"
        aria-haspopup="dialog"
        aria-expanded="false">
  Jan 15, 2026
</button>
```

### Weighted Value ARIA
```html
<div aria-label="Weighted value: $4,500.
                 Calculated as $15,000 times 30% probability"
     role="status">
  Weighted: $4,500
</div>
```

### Overdue Status ARIA
```html
<span role="status"
      aria-label="Expected close date is overdue by 2 days"
      class="text-red-600">
  <AlertIcon aria-hidden="true" />
  OVERDUE: Jan 8 (2 days ago)
</span>
```

### Keyboard Navigation
```
Probability Slider:
- Tab: Focus slider
- Left/Down Arrow: Decrease by 1%
- Right/Up Arrow: Increase by 1%
- Page Down: Decrease by 10%
- Page Up: Increase by 10%
- Home: Set to 0%
- End: Set to 100%

Date Picker:
- Enter/Space: Open picker dialog
- Arrow keys: Navigate calendar
- Enter: Select date
- Escape: Close picker

Live Announcements:
- "Probability changed to 45 percent"
- "Expected close date set to January 15, 2026"
- "Weighted value updated to $6,750"
```

---

## Related Wireframes

- [Pipeline Kanban Board](./pipeline-kanban-board.wireframe.md)
- [Pipeline Forecasting Report](./pipeline-forecasting-report.wireframe.md)
- [Opportunity Panel](./pipeline-opportunity-panel.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
