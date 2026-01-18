# Win/Loss Reasons UI Wireframe
## DOM-PIPE-005c: Reason Selection Dialogs and Settings Management

**Last Updated:** 2026-01-10
**PRD Reference:** pipeline.prd.json
**Story:** DOM-PIPE-005c

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | opportunities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-PIPE-005c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/opportunities.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD
- **Win Reasons**: Price, Technical fit, Delivery timeline, Competitor weakness
- **Loss Reasons**: Price, Competitor, Timing, Technical fit, Budget allocated elsewhere

---

## Overview

This wireframe covers the UI for win/loss reason tracking:
- Mark as Won dialog with win reason selection
- Mark as Lost dialog with loss reason and competitor
- Win/Loss reasons settings manager (admin)
- Analytics integration hints

## UI Patterns (Reference Implementation)

### Dialog (Mark as Won/Lost)
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Modal dialogs for win/loss reason selection
  - Confetti animation on win confirmation (signature moment)
  - Form validation requiring reason selection before submission
  - Accessible modal with focus management and keyboard navigation

### Select (Reason Dropdown)
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Searchable dropdown for win/loss reason selection
  - Required field validation (red border if not selected)
  - Grouped options (common reasons at top, "Other" at bottom)
  - Accessible select with aria-required and aria-invalid states

### DataTable (Settings Manager)
- **Pattern**: RE-UI Table
- **Reference**: `_reference/.reui-reference/registry/default/ui/table.tsx`
- **Features**:
  - Sortable table for win/loss reasons with usage statistics
  - Drag-and-drop reordering with visual grab handles
  - Inline edit actions and status toggles (Active/Inactive)
  - Accessible table with proper thead/tbody and scope attributes

### Tabs (Win/Loss Settings)
- **Pattern**: RE-UI Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - Tabbed interface for Win Reasons vs Loss Reasons
  - Active tab indicator with count badges
  - Keyboard navigation (Arrow keys to switch tabs)
  - Accessible tabs with role="tablist" and aria-selected states

---

## Mark as Won Dialog

### Desktop Dialog
```
+================================================================+
| Mark as Won                                                [x] |
+================================================================+
|                                                                |
|  [Trophy Icon]                                                 |
|                                                                |
|  Congratulations! Mark this opportunity as won.                |
|                                                                |
|  Opportunity: Acme Corporation                                 |
|  Value: $15,000                                                |
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|  Win Reason *                                                  |
|  [Select why we won this deal...                           v]  |
|    +----------------------------------------------------------+|
|    | Better pricing                                           ||
|    | Superior technical fit                                   ||
|    | Faster delivery timeline                                 ||
|    | Competitor weakness                                      ||
|    | Strong relationship                                      ||
|    | Product quality / Warranty                               ||
|    | Other                                                    ||
|    +----------------------------------------------------------+|
|                                                                |
|  Notes (optional)                                              |
|  +------------------------------------------------------------+|
|  | What specifically helped close this deal? This helps us    ||
|  | learn for future opportunities...                          ||
|  +------------------------------------------------------------+|
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|  [checkbox] Close related follow-ups                           |
|  [checkbox] Send internal win notification                     |
|                                                                |
|                             [Cancel] [Confirm Win]             |
+================================================================+
  Win Reason required before Confirm enabled
  Focus on dropdown on open
  Confetti animation on confirm (signature moment)
```

### Win Confirmation Animation (Signature Moment)
```
FRAME 1: Button Click
+------------------+
| [Confirm Win]    |
+------------------+
      | click
      v

FRAME 2: Processing
+------------------+
| [spinner] Saving |
+------------------+

FRAME 3: Success (500ms)
+================================================================+
|                                                                |
|     [confetti animation across dialog]                         |
|                                                                |
|              [Large Trophy Icon]                               |
|                                                                |
|                   DEAL WON!                                    |
|                                                                |
|              Acme Corporation                                  |
|              $15,000                                           |
|                                                                |
|     "Better pricing" helped close this deal                    |
|                                                                |
|              [View Won Deals] [Close]                          |
|                                                                |
+================================================================+
  Confetti: multicolor particles from top
  Trophy: scale animation (0.8 -> 1.2 -> 1.0)
  Sound effect (optional, respect prefers-reduced-motion)
```

---

## Mark as Lost Dialog

### Desktop Dialog
```
+================================================================+
| Mark as Lost                                               [x] |
+================================================================+
|                                                                |
|  Mark this opportunity as lost to help improve future wins.    |
|                                                                |
|  Opportunity: Tech Inc                                         |
|  Value: $25,000                                                |
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|  Loss Reason *                                                 |
|  [Select why we lost this deal...                          v]  |
|    +----------------------------------------------------------+|
|    | Price too high                                           ||
|    | Chose a competitor                                       ||
|    | Timing / Delivery schedule                               ||
|    | Technical fit / Requirements                             ||
|    | Budget allocated elsewhere                               ||
|    | Decision maker changed                                   ||
|    | Project cancelled / No decision                          ||
|    | Installation complexity / Site issues                    ||
|    | Other                                                    ||
|    +----------------------------------------------------------+|
|                                                                |
+----------------------------------------------------------------+
|  Competitor Information (if applicable)                        |
+----------------------------------------------------------------+
|                                                                |
|  Did they choose a competitor?                                 |
|  ( ) No / Unknown                                              |
|  (*) Yes - specify below                                       |
|                                                                |
|  Competitor Name                                               |
|  [Enter competitor name...                                 ]   |
|  Autocomplete from previous entries:                           |
|  - CompetitorA (chosen 5 times)                                |
|  - CompetitorB (chosen 3 times)                                |
|  - CompetitorC (chosen 2 times)                                |
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|  What could we have done differently?                          |
|  +------------------------------------------------------------+|
|  | This helps us improve for future opportunities...          ||
|  |                                                            ||
|  +------------------------------------------------------------+|
|                                                                |
|  [checkbox] Close related follow-ups                           |
|  [checkbox] Keep for re-engagement (don't archive)             |
|                                                                |
|                             [Cancel] [Confirm Loss]            |
+================================================================+
  Loss Reason required before Confirm enabled
  Competitor name appears when "Yes" selected
```

### Mobile Dialog (Bottom Sheet)
```
+================================+
| Mark as Lost              [x]  |
+================================+
|                                |
| Tech Inc - $25,000             |
|                                |
| Loss Reason *                  |
| [Select reason...         v]   |
|                                |
| Did they choose competitor?    |
| ( ) No  (*) Yes                |
|                                |
| Competitor                     |
| [Enter name...            ]    |
|                                |
| Notes                          |
| [What could we improve?   ]    |
|                                |
| [ ] Close follow-ups           |
| [ ] Keep for re-engagement     |
|                                |
| [Cancel]   [Confirm Loss]      |
+================================+
```

---

## Win/Loss Reasons Settings Manager

### Desktop Settings Page
```
+================================================================================+
| Settings > Win/Loss Reasons                                                     |
+================================================================================+
|                                                                                 |
| ← Back to Settings                                                              |
|                                                                                 |
| Win/Loss Reasons                                              [+ Add Reason]    |
| Configure the reasons available when marking opportunities as won or lost.      |
|                                                                                 |
+=== TABS ======================================================================+
| [Win Reasons (6)]  [Loss Reasons (9)]                                          |
+================================================================================+
|                                                                                 |
| WIN REASONS                                                                     |
| These appear when marking an opportunity as won.                                |
|                                                                                 |
| +--------------------------------------------------------------------------+   |
| | [=] | Reason                           | Usage    | Status    | Actions  |   |
| +--------------------------------------------------------------------------+   |
| | [=] | Better pricing                   | 23 deals | [Active]  | [Edit]   |   |
| | [=] | Superior product features        | 18 deals | [Active]  | [Edit]   |   |
| | [=] | Strong customer relationship     | 15 deals | [Active]  | [Edit]   |   |
| | [=] | Competitor weakness              | 8 deals  | [Active]  | [Edit]   |   |
| | [=] | Faster delivery timeline         | 5 deals  | [Active]  | [Edit]   |   |
| | [=] | Bundled services value           | 3 deals  | [Active]  | [Edit]   |   |
| +--------------------------------------------------------------------------+   |
|                                                                                 |
| [=] = Drag to reorder                                                          |
|                                                                                 |
| +----------------------------------------------------------------------+       |
| | [lightbulb] Tip: Order reasons by frequency to speed up data entry.  |       |
| +----------------------------------------------------------------------+       |
|                                                                                 |
+================================================================================+
```

### Loss Reasons Tab
```
+================================================================================+
| [Win Reasons (6)]  [Loss Reasons (9)]                                          |
+================================================================================+
|                                                                                 |
| LOSS REASONS                                                                    |
| These appear when marking an opportunity as lost.                               |
|                                                                                 |
| +--------------------------------------------------------------------------+   |
| | [=] | Reason                           | Usage    | Status    | Actions  |   |
| +--------------------------------------------------------------------------+   |
| | [=] | Price too high                   | 34 deals | [Active]  | [Edit]   |   |
| | [=] | Missing required features        | 22 deals | [Active]  | [Edit]   |   |
| | [=] | Chose a competitor               | 19 deals | [Active]  | [Edit]   |   |
| | [=] | Budget constraints               | 15 deals | [Active]  | [Edit]   |   |
| | [=] | Timeline mismatch                | 12 deals | [Active]  | [Edit]   |   |
| | [=] | Decision maker changed           | 8 deals  | [Active]  | [Edit]   |   |
| | [=] | Project cancelled                | 7 deals  | [Active]  | [Edit]   |   |
| | [=] | Communication issues             | 4 deals  | [Inactive]| [Edit]   |   |
| | [=] | Other                            | 11 deals | [Active]  | [Edit]   |   |
| +--------------------------------------------------------------------------+   |
|                                                                                 |
| Note: Inactive reasons won't appear in the dropdown but historical             |
| data using these reasons is preserved.                                         |
|                                                                                 |
+================================================================================+
```

### Add/Edit Reason Dialog
```
+================================================+
| Add Win Reason                            [x]  |
+================================================+
|                                                |
| Reason Name *                                  |
| [Enter reason name...                      ]   |
|                                                |
| Description (optional)                         |
| +--------------------------------------------+ |
| | Additional context to help users select    | |
| | the right reason...                        | |
| +--------------------------------------------+ |
|                                                |
| Type *                                         |
| (*) Win Reason                                 |
| ( ) Loss Reason                                |
|                                                |
| Status                                         |
| [Active               v]                       |
|   - Active: Appears in dropdown                |
|   - Inactive: Hidden but data preserved        |
|                                                |
|                    [Cancel] [Save Reason]      |
+================================================+
```

### Delete Confirmation
```
+================================================+
| Delete Reason?                            [x]  |
+================================================+
|                                                |
| [!] This reason has been used 23 times.        |
|                                                |
| Deleting "Better pricing" will:                |
| - Remove it from the dropdown                  |
| - Convert historical uses to "Other"           |
|                                                |
| Consider deactivating instead to preserve      |
| historical data accuracy.                      |
|                                                |
| [Cancel] [Deactivate Instead] [Delete]         |
+================================================+
  "Delete" is destructive red button
```

---

## Tablet View

### Mark as Won/Lost Dialogs
```
+============================================+
| Mark as Won                          [x]   |
+============================================+
|                                            |
| [Trophy] Congratulations!                  |
|                                            |
| Acme Corporation - $15,000                 |
|                                            |
| Win Reason *                               |
| [Select reason...                    v]    |
|                                            |
| Notes (optional)                           |
| [What helped close this deal?        ]     |
|                                            |
| [x] Close related follow-ups               |
| [x] Send internal notification             |
|                                            |
|              [Cancel] [Confirm Win]        |
+============================================+
```

### Settings Manager
```
+============================================+
| Settings > Win/Loss Reasons          [+]   |
+============================================+
|                                            |
| [Win Reasons] [Loss Reasons]               |
|                                            |
| +----------------------------------------+ |
| | Better pricing                         | |
| | 23 deals | Active         [Edit] [=]   | |
| +----------------------------------------+ |
| | Superior product features              | |
| | 18 deals | Active         [Edit] [=]   | |
| +----------------------------------------+ |
| | Strong relationship                    | |
| | 15 deals | Active         [Edit] [=]   | |
| +----------------------------------------+ |
|                                            |
+============================================+
```

---

## Mobile View

### Mark as Won Dialog
```
+==============================+
| Mark as Won             [x]  |
+==============================+
|                              |
|         [Trophy]             |
|                              |
| Acme Corporation             |
| $15,000                      |
|                              |
| Win Reason *                 |
| [Select reason...       v]   |
|                              |
| Notes                        |
| [Optional notes...      ]    |
|                              |
| [x] Close follow-ups         |
| [x] Send notification        |
|                              |
| [Cancel]                     |
| [Confirm Win]                |
|                              |
+==============================+
```

### Settings Manager (Mobile)
```
+==============================+
| Win/Loss Reasons        [+]  |
+==============================+
|                              |
| [Win] [Loss]                 |
|       ^active                |
|                              |
| +---------------------------+|
| | Better pricing            ||
| | 23 deals      [Active]    ||
| |              [Edit] [=]   ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | Superior features         ||
| | 18 deals      [Active]    ||
| |              [Edit] [=]   ||
| +---------------------------+|
|                              |
| +---------------------------+|
| | Strong relationship       ||
| | 15 deals      [Active]    ||
| |              [Edit] [=]   ||
| +---------------------------+|
|                              |
+==============================+
```

---

## Loading States

### Reasons Loading
```
Win Reason *
+------------------------------------------+
| [spinner] Loading reasons...             |
+------------------------------------------+
  aria-busy="true"
```

### Saving Reason Selection
```
+================================================+
| Mark as Won                               [x]  |
+================================================+
|                                                |
|              [spinner]                         |
|                                                |
|    Recording win...                            |
|                                                |
|    - Updating opportunity status               |
|    - Recording win reason                      |
|    - Closing follow-ups                        |
|                                                |
+================================================+
```

### Settings Table Loading
```
+--------------------------------------------------------------------------+
| [=] | Reason                           | Usage    | Status    | Actions  |
+--------------------------------------------------------------------------+
| [=] | [shimmer==================]      | [shim]   | [shimmer] | [shim]   |
| [=] | [shimmer==================]      | [shim]   | [shimmer] | [shim]   |
| [=] | [shimmer==================]      | [shim]   | [shimmer] | [shim]   |
+--------------------------------------------------------------------------+
```

---

## Empty States

### No Reasons Configured
```
+================================================================+
| Win Reason *                                                   |
+----------------------------------------------------------------+
|                                                                |
|               [illustration]                                   |
|                                                                |
|         No win reasons configured                              |
|                                                                |
|    Ask your administrator to set up                            |
|    win/loss reasons in Settings.                               |
|                                                                |
|    [Go to Settings] (admin only)                               |
|                                                                |
+----------------------------------------------------------------+
```

### No Usage Data
```
+--------------------------------------------------------------------------+
| [=] | Bundled services value           | 0 deals  | [Active]  | [Edit]   |
|     |                                  | (new)    |           |          |
+--------------------------------------------------------------------------+
  Tooltip: "This reason hasn't been used yet"
```

---

## Error States

### Failed to Load Reasons
```
+================================================================+
| Win Reason *                                                   |
+----------------------------------------------------------------+
|                                                                |
| [!] Unable to load reasons                                     |
|                                                                |
|     Please try again or contact support.                       |
|                                                                |
|     [Retry]                                                    |
|                                                                |
+----------------------------------------------------------------+
  role="alert"
```

### Failed to Save
```
+================================================+
| [!] Could not mark as won                 [x]  |
+================================================+
|                                                |
| Failed to update opportunity status.           |
|                                                |
| Your changes have not been saved.              |
| Please try again.                              |
|                                                |
|                        [Cancel] [Try Again]    |
+================================================+
```

### Duplicate Reason Name
```
Reason Name *
[Better pricing                          ]
[!] A reason with this name already exists
    aria-invalid="true"
```

---

## Accessibility Specification

### Dialog ARIA
```html
<!-- Mark as Won Dialog -->
<div role="dialog"
     aria-labelledby="won-dialog-title"
     aria-describedby="won-dialog-description"
     aria-modal="true">
  <h2 id="won-dialog-title">Mark as Won</h2>
  <p id="won-dialog-description">
    Select a reason for winning this opportunity to help track success patterns.
  </p>
  <!-- Form content -->
</div>
```

### Reason Dropdown ARIA
```html
<div class="form-field">
  <label id="reason-label" for="win-reason">
    Win Reason
    <span aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </label>
  <select id="win-reason"
          aria-labelledby="reason-label"
          aria-required="true"
          aria-invalid="false">
    <option value="">Select why we won this deal...</option>
    <option value="pricing">Better pricing</option>
    <option value="features">Superior product features</option>
    <!-- More options -->
  </select>
</div>
```

### Settings Table ARIA
```html
<table role="table" aria-label="Win reasons configuration">
  <thead>
    <tr>
      <th scope="col">Reorder</th>
      <th scope="col">Reason</th>
      <th scope="col">Usage</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="Better pricing, used 23 times, active">
      <!-- Row content -->
    </tr>
  </tbody>
</table>
```

### Keyboard Navigation
```
Mark Won/Lost Dialog:
- Tab navigates form fields
- Arrow keys navigate dropdown options
- Enter selects option
- Escape closes dialog
- Submit with Enter when on primary button

Settings Manager:
- Tab navigates rows and actions
- Enter on Edit opens edit dialog
- Drag handles: Space to start drag, Arrow keys to move
- Escape cancels drag

Reason Dropdown:
- Arrow Down opens dropdown
- Arrow Up/Down navigates options
- Enter selects
- Type to filter (first letter)
- Escape closes dropdown
```

### Screen Reader Announcements
```
On dialog open:
  "Mark as Won dialog. Select a reason for winning the Acme Corporation opportunity."

On reason selected:
  "Better pricing selected"

On won confirmed:
  "Opportunity marked as won. Acme Corporation, $15,000.
   Win reason: Better pricing."

On lost confirmed:
  "Opportunity marked as lost. Tech Inc, $25,000.
   Loss reason: Price too high. Competitor: CompetitorA."

On reason saved (settings):
  "New win reason saved: Customer referral"

On reason reordered:
  "Better pricing moved to position 1 of 6"
```

---

## Analytics Preview (Future Integration)

### Quick Stats on Settings Page
```
+================================================================+
| Win/Loss Analysis Preview                                      |
+================================================================+
|                                                                |
| +---------------------------+ +---------------------------+    |
| | TOP WIN REASONS           | | TOP LOSS REASONS          |    |
| +---------------------------+ +---------------------------+    |
| | 1. Better pricing    32%  | | 1. Price too high    28%  |    |
| | 2. Features          24%  | | 2. Competitor        22%  |    |
| | 3. Relationship      18%  | | 3. No budget         18%  |    |
| +---------------------------+ +---------------------------+    |
|                                                                |
| [View Full Win/Loss Report ->]                                 |
|                                                                |
+================================================================+
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
