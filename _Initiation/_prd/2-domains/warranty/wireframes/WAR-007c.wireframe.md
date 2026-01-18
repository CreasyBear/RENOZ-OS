# Wireframe: DOM-WAR-007c - Warranty Extensions: UI

## Story Reference

- **Story ID**: DOM-WAR-007c
- **Name**: Warranty Extensions: UI
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: Dialog Form with DataTable and ReportLayout

## Overview

Warranty extension action and history display on warranty detail page. Includes extension dialog with month selection and expiry preview, extension history section, and dedicated extensions report page.

## UI Patterns (Reference Implementation)

### Dialog & Sheet Components
- **Pattern**: RE-UI Dialog/Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `sheet.tsx`
- **Features**:
  - Extend warranty bottom sheet on mobile
  - Extension modal on desktop with month selector
  - New expiry date preview panel

### Input Component (Number)
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Month increment/decrement controls
  - Quick select buttons (3, 6, 12, 24 months)
  - Min/max validation for extension period

### Card Component
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Extension history section on warranty detail
  - New expiry date preview card with visual timeline
  - Summary metrics card (total months extended)

### DataTable Component
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Extension history table with date, months, reason, approver
  - Extensions report page table with filters
  - Sortable columns for date and extension period

### Textarea Component
- **Pattern**: RE-UI Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/textarea.tsx`
- **Features**:
  - Extension reason input (required)
  - Character count for justification text
  - Auto-resize for longer explanations

---

## Mobile Wireframe (375px)

### Warranty Detail with Extend Button

```
+=========================================+
| < Warranties                       [*]  |
+-----------------------------------------+
|                                         |
|  WAR-2026-00123                         |
|  Kitchen Inverter Set - Oak              |
|  Brisbane Solar Cooration                       |
|  =====================================  |
|                                         |
|  Status: [Active]   Expires: Jan 2028   |
|                                         |
|  +-------------------------------------+|
|  |         [EXTEND WARRANTY]           ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|  [Overview] [Claims] [Extensions]       |
|                        ==========       |
+-----------------------------------------+
|                                         |
|  Extension History                      |
|  ---------------------------------      |
|                                         |
|  +-------------------------------------+|
|  | +12 months                          ||
|  | January 10, 2026                    ||
|  | ---------------------------------   ||
|  | Reason: Customer loyalty program    ||
|  | Approved by: Sarah Wilson           ||
|  | New expiry: January 5, 2029         ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | +6 months                           ||
|  | December 15, 2025                   ||
|  | ---------------------------------   ||
|  | Reason: Goodwill gesture - claim    ||
|  | Approved by: Mike Johnson           ||
|  | New expiry: January 5, 2028         ||
|  +-------------------------------------+|
|                                         |
|  Original Expiry: July 5, 2027          |
|  Total Extended: 18 months              |
|                                         |
+=========================================+
```

### Extend Warranty Dialog (Bottom Sheet)

```
+=========================================+
|                                         |
|  =====================================  |
|         <- drag handle                  |
|                                         |
|  Extend Warranty                  [X]   |
|  =====================================  |
|                                         |
|  WAR-2026-00123                         |
|  Kitchen Inverter Set - Oak              |
|                                         |
|  Current Expiry: January 5, 2028        |
|  Remaining: 730 days                    |
|                                         |
|  ---------------------------------      |
|                                         |
|  Extension Period *                     |
|  +-------------------------------------+|
|  |  [-]     12 months      [+]         ||
|  +-------------------------------------+|
|  Quick select: [3mo] [6mo] [12mo] [24mo]|
|                                         |
|  +-------------------------------------+|
|  |  NEW EXPIRY DATE                    ||
|  |  ================================   ||
|  |  January 5, 2029                    ||
|  |  (+365 days from current)           ||
|  +-------------------------------------+|
|                                         |
|  Reason *                               |
|  +-------------------------------------+|
|  | Customer loyalty program            ||
|  | participation - 10% extension       ||
|  | bonus applied.                      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |        [EXTEND WARRANTY]            ||
|  +-------------------------------------+|
|                                         |
|  (Cancel)                               |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Warranty Detail with Extensions Tab

```
+=======================================================================+
| < Warranties                                                           |
+------------------------------------------------------------------------+
|                                                                        |
|  WAR-2026-00123                              [Extend Warranty] [Edit]  |
|  Kitchen Inverter Set - Oak | Brisbane Solar Cooration                          |
|  Status: [Active]  |  Expires: January 5, 2029  |  1095 days           |
|                                                                        |
+------------------------------------------------------------------------+
|  [Overview] [Claims] [Extensions] [Activity]                           |
|                      ==========                                        |
+------------------------------------------------------------------------+
|                                                                        |
|  Extension History                                    [+ New Extension]|
|  ---------------------------------------------------------------------  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | Date       | Extension | Reason              | Approved | Expiry |  |
|  +------------+-----------+---------------------+----------+--------+  |
|  | Jan 10     | +12 mo    | Customer loyalty    | S.Wilson | Jan 29 |  |
|  | Dec 15     | +6 mo     | Goodwill - claim    | M.Johnson| Jan 28 |  |
|  +------------+-----------+---------------------+----------+--------+  |
|                                                                        |
|  Summary                                                               |
|  +------------------------------------------------------------------+  |
|  | Original Expiry: July 5, 2027                                    |  |
|  | Total Extensions: 18 months                                      |  |
|  | Current Expiry: January 5, 2029                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+=======================================================================+
```

### Extend Warranty Dialog (Side Panel)

```
+=======================================================================+
|  Warranty Detail                         +---------------------------+ |
|                                          | Extend Warranty       [X] | |
|  WAR-2026-00123                          | ------------------------- | |
|  Kitchen Inverter Set                     |                           | |
|  Brisbane Solar Cooration                        | Current Status            | |
|                                          | +------------------------+| |
|  +--- DETAILS ---+                       | | Expires: Jan 5, 2028   || |
|  |               |                       | | Remaining: 730 days    || |
|  | Serial: KC... |                       | +------------------------+| |
|  | Policy: 24mo  |                       |                           | |
|  |               |                       | Extension Period *        | |
|  +---------------+                       | +------------------------+| |
|                                          | | [-]   12 months   [+]  || |
|  +--- EXTENSIONS ---+                    | +------------------------+| |
|  |                  |                    | [3] [6] [12] [24]         | |
|  | +12mo  Jan 10   |                    |                           | |
|  | +6mo   Dec 15   |                    | New Expiry Date           | |
|  |                  |                    | +------------------------+| |
|  +------------------+                    | |   JANUARY 5, 2029      || |
|                                          | |   +365 days            || |
|                                          | +------------------------+| |
|                                          |                           | |
|                                          | Reason *                  | |
|                                          | [Customer loyalty...    ] | |
|                                          |                           | |
|                                          | (Cancel) [EXTEND]         | |
|                                          +---------------------------+ |
|                                                                         |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Warranty Detail with Extensions Tab

```
+================================================================================================+
| [Logo] Renoz CRM                                                         [Bell] [User v]       |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Support  |  < Back to Warranties                                                               |
| -------  |                                                                                      |
| Issues   |  WAR-2026-00123                                      [Extend Warranty] [Edit]       |
| Warranty<|  Kitchen Inverter Set - Oak                                                          |
|          |  Brisbane Solar Cooration | John Smith | john@acme.com                                      |
|          |  ==================================================================================  |
|          |                                                                                      |
|          |  +--- STATUS BAR -------------------------------------------------------------+      |
|          |  | [Active]  |  Original: Jul 5, 2027  |  Current: Jan 5, 2029  |  +18 months |      |
|          |  +----------------------------------------------------------------------------+      |
|          |                                                                                      |
|          |  [Overview] [Claims] [Extensions] [Certificate] [Activity]                           |
|          |                      ==========                                                      |
|          |                                                                                      |
|          |  +--- EXTENSION HISTORY -----------------------------------------------------+       |
|          |  |                                                                          |       |
|          |  |  Summary: 2 extensions totaling 18 months              [+ New Extension] |       |
|          |  |                                                                          |       |
|          |  |  +--------------------------------------------------------------------+  |       |
|          |  |  |                                                                    |  |       |
|          |  |  | Date           | Extension | Reason                 | Approved By |  |       |
|          |  |  |                | Period    |                        | New Expiry  |  |       |
|          |  |  |----------------+-----------+------------------------+-------------|  |       |
|          |  |  | Jan 10, 2026   | +12 mo    | Customer loyalty       | S. Wilson   |  |       |
|          |  |  |                |           | program participation  | Jan 5, 2029 |  |       |
|          |  |  |----------------+-----------+------------------------+-------------|  |       |
|          |  |  | Dec 15, 2025   | +6 mo     | Goodwill gesture       | M. Johnson  |  |       |
|          |  |  |                |           | following claim        | Jan 5, 2028 |  |       |
|          |  |  |----------------+-----------+------------------------+-------------|  |       |
|          |  |  |                |           |                        |             |  |       |
|          |  |  | (Original)     | --        | Initial warranty       | --          |  |       |
|          |  |  | Jan 5, 2026    |           | 24-Month Extended      | Jul 5, 2027 |  |       |
|          |  |  |                |           |                        |             |  |       |
|          |  |  +--------------------------------------------------------------------+  |       |
|          |  |                                                                          |       |
|          |  |  +--- EXTENSION TIMELINE ---------------------------------------------+  |       |
|          |  |  |                                                                    |  |       |
|          |  |  |  [Jan 2026]----[Jul 2027]----[Jan 2028]----[Jan 2029]             |  |       |
|          |  |  |  Original      +6 mo         +12 mo        Current                 |  |       |
|          |  |  |                                                                    |  |       |
|          |  |  +--------------------------------------------------------------------+  |       |
|          |  |                                                                          |       |
|          |  +--------------------------------------------------------------------------+       |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+
```

### Extend Warranty Modal (Desktop)

```
+================================================================================================+
|                                                                                                 |
|     +------------------------------------------------------------------------+                 |
|     | Extend Warranty                                                    [X] |                 |
|     +========================================================================+                 |
|     |                                                                        |                 |
|     |  +--- WARRANTY INFO ---+  +--- EXTENSION DETAILS -------------------+  |                 |
|     |  |                     |  |                                         |  |                 |
|     |  | WAR-2026-00123      |  | Extension Period *                      |  |                 |
|     |  | Kitchen Inverter Set |  | +-------------------------------------+ |  |                 |
|     |  | Brisbane Solar Cooration    |  | |                                     | |  |                 |
|     |  |                     |  | |     [-]     12 months     [+]       | |  |                 |
|     |  | Current Status:     |  | |                                     | |  |                 |
|     |  | Expires Jan 5, 2028 |  | +-------------------------------------+ |  |                 |
|     |  | 730 days remaining  |  |                                         |  |                 |
|     |  |                     |  | Quick Select:                           |  |                 |
|     |  | Previous Extensions:|  | [3 months] [6 months] [12 months] [24]  |  |                 |
|     |  | +18 months          |  |                                         |  |                 |
|     |  |                     |  | +-------------------------------------+ |  |                 |
|     |  +---------------------+  | |  NEW EXPIRY DATE                    | |  |                 |
|     |                           | |  ===================================| |  |                 |
|     |                           | |                                     | |  |                 |
|     |                           | |  January 5, 2029                    | |  |                 |
|     |                           | |                                     | |  |                 |
|     |                           | |  +365 days from current expiry      | |  |                 |
|     |                           | |  Total coverage: 36 months          | |  |                 |
|     |                           | |                                     | |  |                 |
|     |                           | +-------------------------------------+ |  |                 |
|     |                           |                                         |  |                 |
|     |                           | Reason for Extension *                  |  |                 |
|     |                           | +-------------------------------------+ |  |                 |
|     |                           | | Customer loyalty program             | |  |                 |
|     |                           | | participation. Eligible for 12-month| |  |                 |
|     |                           | | extension bonus.                     | |  |                 |
|     |                           | +-------------------------------------+ |  |                 |
|     |                           |                                         |  |                 |
|     |                           +-----------------------------------------+  |                 |
|     |                                                                        |                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |  |                                                                    ||                 |
|     |  |                      (Cancel)       [EXTEND WARRANTY]              ||                 |
|     |  |                                                                    ||                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |                                                                        |                 |
|     +------------------------------------------------------------------------+                 |
|                                                                                                 |
+================================================================================================+
```

---

## Extensions Report Page

### Desktop Report Layout

```
+================================================================================================+
| [Logo] Renoz CRM                                                         [Bell] [User v]       |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Reports  |  Warranty Extensions Report                                        [Export to CSV]  |
| -------  |  ==================================================================================  |
| Sales    |  Track all warranty extensions across customers and products                        |
| Warranty<|                                                                                      |
| Extensns<|  +--------------------------------------------------------------------------------+  |
| Pipeline |  | FILTERS                                                                        |  |
|          |  |                                                                                |  |
|          |  |  Date Range           Customer             Product              Approved By    |  |
|          |  |  [Last 30 days v]     [All Customers v]    [All Products v]    [All Users v]   |  |
|          |  |                                                                                |  |
|          |  |  Active Filters: [Last 30 days x]                           [Clear All]       |  |
|          |  |                                                                                |  |
|          |  +--------------------------------------------------------------------------------+  |
|          |                                                                                      |
|          |  +--- SUMMARY METRICS ----------------------------------------------------------+   |
|          |  |                                                                              |   |
|          |  |  Total Extensions: 24  |  Total Months: 186  |  Avg Extension: 7.75 months  |   |
|          |  |                                                                              |   |
|          |  +------------------------------------------------------------------------------+   |
|          |                                                                                      |
|          |  +--------------------------------------------------------------------------------+  |
|          |  |                                                                                |  |
|          |  | Warranty #     | Product              | Customer        | Extension | Approver|  |
|          |  |                |                      |                 | Period    | Date    |  |
|          |  |----------------+----------------------+-----------------+-----------+---------|  |
|          |  | WAR-2026-00123 | Kitchen Inverter Set  | Brisbane Solar Co       | +12 mo    | S.Wilson|  |
|          |  |                | Oak                  | John Smith      |           | Jan 10  |  |
|          |  |----------------+----------------------+-----------------+-----------+---------|  |
|          |  | WAR-2026-00098 | Battery Installation  | Tech Industries | +6 mo     | M.Johns |  |
|          |  |                | Double Pane          | Sarah Chen      |           | Jan 8   |  |
|          |  |----------------+----------------------+-----------------+-----------+---------|  |
|          |  | WAR-2026-00076 | HVAC System         | Global Services | +24 mo    | Admin   |  |
|          |  |                | Commercial           | Mike Williams   |           | Jan 5   |  |
|          |  |----------------+----------------------+-----------------+-----------+---------|  |
|          |  |                                                                                |  |
|          |  +--------------------------------------------------------------------------------+  |
|          |                                                                                      |
|          |  Showing 1-10 of 24                                          < 1 [2] 3 >            |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+
```

### Mobile Report View

```
+=========================================+
| < Reports                          [*]  |
+-----------------------------------------+
|                                         |
|  Warranty Extensions                    |
|  Track extensions granted               |
|                                         |
+-----------------------------------------+
|  [Filters]                  [Export v]  |
+-----------------------------------------+
|  Last 30 days | 24 extensions           |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | WAR-2026-00123                      ||
|  | Kitchen Inverter Set - Oak           ||
|  | Brisbane Solar Cooration                    ||
|  | ---------------------------------   ||
|  | Extension: +12 months               ||
|  | Approved: Sarah Wilson              ||
|  | Date: January 10, 2026              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | WAR-2026-00098                      ||
|  | Battery Installation - Double        ||
|  | Tech Industries                     ||
|  | ---------------------------------   ||
|  | Extension: +6 months                ||
|  | Approved: Mike Johnson              ||
|  | Date: January 8, 2026               ||
|  +-------------------------------------+|
|                                         |
|  [Load More]                            |
|                                         |
+=========================================+
```

---

## Expiry Preview Animation

```
+--- EXPIRY DATE PREVIEW ----------------------------------+
|                                                          |
|  Extension Period: 12 months                             |
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |  Current Expiry      ->      New Expiry            |  |
|  |  Jan 5, 2028                 Jan 5, 2029           |  |
|  |  730 days                    1095 days             |  |
|  |                                                    |  |
|  |  [===================|+++++++++++++++]             |  |
|  |   Current coverage    New coverage                 |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
|  On months change:                                       |
|  - New date animates with counter                        |
|  - Bar expands/contracts smoothly                        |
|  - Days count updates in real-time                       |
|                                                          |
+----------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
EXTENSIONS TAB LOADING:
+------------------------------------------------------------------+
|  Extension History                                                |
+------------------------------------------------------------------+
|                                                                   |
|  +--------------------------------------------------------------+|
|  | [.......] | [..........] | [....................] | [......] ||
|  | [.......] | [..........] | [....................] | [......] ||
|  +--------------------------------------------------------------+|
|  <- Skeleton rows with shimmer                                    |
|                                                                   |
+------------------------------------------------------------------+

EXTENDING WARRANTY:
+--------------------------------------------+
| Extend Warranty                        [X] |
+--------------------------------------------+
|                                            |
|  +--------------------------------------+  |
|  |                                      |  |
|  |  [spinner] Extending warranty...     |  |
|  |                                      |  |
|  +--------------------------------------+  |
|                                            |
|                  (Cancel)  [EXTENDING...]  |
|                            disabled        |
+--------------------------------------------+
```

### Empty States

```
NO EXTENSIONS:
+------------------------------------------------------------------+
|  Extension History                              [+ New Extension] |
+------------------------------------------------------------------+
|                                                                   |
|  +--------------------------------------------------------------+|
|  |                                                              ||
|  |                  +------------------+                        ||
|  |                  |   [calendar]     |                        ||
|  |                  |      icon        |                        ||
|  |                  +------------------+                        ||
|  |                                                              ||
|  |               No extensions on record                        ||
|  |                                                              ||
|  |     This warranty has not been extended. The expiry date     ||
|  |     reflects the original policy duration.                   ||
|  |                                                              ||
|  |     Original Expiry: July 5, 2027                            ||
|  |     Current Expiry: July 5, 2027                             ||
|  |                                                              ||
|  +--------------------------------------------------------------+|
|                                                                   |
+------------------------------------------------------------------+
```

### Error States

```
EXTENSION FAILED:
+--------------------------------------------+
| Extend Warranty                        [X] |
+--------------------------------------------+
|                                            |
|  [!] Failed to extend warranty             |
|                                            |
|  There was a problem applying the          |
|  extension. The warranty has not been      |
|  modified.                                 |
|                                            |
|  Error: Approval required for extensions   |
|  over 12 months.                           |
|                                            |
|           (Cancel)    [Retry]              |
|                                            |
+--------------------------------------------+

APPROVAL REQUIRED:
+--------------------------------------------+
| Extension Requires Approval            [X] |
+--------------------------------------------+
|                                            |
|  [!] Manager approval required             |
|                                            |
|  Extensions over 12 months require         |
|  manager approval. Your extension request  |
|  has been submitted for review.            |
|                                            |
|  Requested: +24 months                     |
|  Submitted to: Operations Manager          |
|                                            |
|                    [OK]                    |
|                                            |
+--------------------------------------------+
```

### Success States

```
EXTENSION APPLIED:
+--------------------------------------------+
|  [check] Warranty extended successfully    |
|                                            |
|  WAR-2026-00123 extended by 12 months      |
|  New expiry: January 5, 2029               |
|                                            |
|  <- Toast notification (5s)                |
+--------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Extensions Tab**
   - Tab: New Extension button -> First table row -> Pagination

2. **Extend Dialog**
   - Focus trapped within dialog
   - Tab: Months decrement -> Months value -> Months increment -> Quick select buttons -> Reason textarea -> Cancel -> Extend
   - Arrow keys: Adjust months value

3. **Report Page**
   - Tab: Filters -> Export button -> Table rows -> Pagination

### ARIA Requirements

```html
<!-- Extensions Tab -->
<section
  role="tabpanel"
  aria-labelledby="extensions-tab"
  aria-label="Extension history for warranty WAR-2026-00123"
>
  <table
    role="table"
    aria-label="Warranty extensions"
  >
    <thead>
      <tr role="row">
        <th role="columnheader" scope="col">Date</th>
        <th role="columnheader" scope="col">Extension</th>
        <th role="columnheader" scope="col">Reason</th>
        <th role="columnheader" scope="col">Approved By</th>
      </tr>
    </thead>
  </table>
</section>

<!-- Extend Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="extend-dialog-title"
>
  <h2 id="extend-dialog-title">Extend Warranty</h2>

  <!-- Months Selector -->
  <div role="group" aria-labelledby="months-label">
    <span id="months-label">Extension Period (months)</span>
    <button
      aria-label="Decrease extension period"
      aria-controls="months-value"
    >-</button>
    <input
      id="months-value"
      type="number"
      aria-valuemin="1"
      aria-valuemax="60"
      aria-valuenow="12"
      aria-label="Extension months"
    />
    <button
      aria-label="Increase extension period"
      aria-controls="months-value"
    >+</button>
  </div>

  <!-- Quick Select -->
  <div role="group" aria-label="Quick select extension period">
    <button aria-pressed="false">3 months</button>
    <button aria-pressed="true">12 months</button>
  </div>

  <!-- New Expiry Preview -->
  <div
    role="status"
    aria-live="polite"
    aria-label="New expiry date: January 5, 2029, adding 365 days"
  >
    <strong>January 5, 2029</strong>
    <span>+365 days from current expiry</span>
  </div>
</dialog>

<!-- Extension Badge -->
<span
  role="status"
  aria-label="Extended by 12 months"
  class="badge"
>
  +12 mo
</span>
```

### Screen Reader Announcements

- Tab selected: "Extensions tab selected. 2 extensions on record for warranty WAR-2026-00123."
- Months changed: "Extension period set to 12 months. New expiry date: January 5, 2029."
- Extension applied: "Warranty extended successfully. New expiry date: January 5, 2029."
- Approval required: "Extension requires manager approval. Request submitted."
- Loading: "Loading extension history."
- Error: "Failed to extend warranty. Retry button available."

---

## Animation Choreography

### Dialog Open/Close

```
OPEN:
- Duration: 250ms (Complex timing)
- Overlay: opacity(0) -> opacity(0.5)
- Dialog:
  - Mobile: translateY(100%) -> translateY(0)
  - Tablet: translateX(100%) -> translateX(0)
  - Desktop: scale(0.95) opacity(0) -> scale(1) opacity(1)

CLOSE:
- Duration: 200ms
- Reverse of open animation
```

### Months Selector

```
INCREMENT/DECREMENT:
- Duration: 150ms (Micro timing)
- Number: slide up/down animation
- Button: brief press feedback (scale 0.95)

QUICK SELECT:
- Duration: 150ms
- Previous button: fade out pressed state
- New button: fade in pressed state
- Number: animate to new value
```

### Expiry Preview Update

```
DATE CHANGE:
- Duration: 300ms
- Old date: fade out
- New date: fade in with count-up animation
- Days count: number ticker animation
- Bar: width transition (ease-out)

BAR VISUALIZATION:
- Duration: 250ms
- Current portion: static
- New portion: width grows from 0
- Color: subtle pulse on update
```

### Table Row Addition

```
NEW EXTENSION ROW:
- Duration: 200ms
- Row: fade in at top, other rows shift down
- Badge: scale bounce
- New expiry column: highlight flash
```

---

## Component Props Interface

```typescript
// Extensions Tab Component
interface WarrantyExtensionsTabProps {
  warrantyId: string;
  warranty: Warranty;
  extensions: WarrantyExtension[];
  isLoading: boolean;
  onExtendClick: () => void;
  originalExpiry: Date;
  currentExpiry: Date;
}

interface WarrantyExtension {
  id: string;
  warrantyId: string;
  months: number;
  reason: string;
  approvedByUserId: string;
  approvedByUserName: string;
  newExpiryDate: Date;
  createdAt: Date;
}

// Extend Warranty Dialog
interface ExtendWarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty;
  currentExpiry: Date;
  previousExtensions: number; // total months already extended
  onSubmit: (data: ExtensionFormData) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
  requiresApprovalThreshold?: number; // months
}

interface ExtensionFormData {
  months: number;
  reason: string;
}

// Months Selector Component
interface MonthsSelectorProps {
  value: number;
  onChange: (months: number) => void;
  min?: number;
  max?: number;
  quickSelectOptions?: number[];
  disabled?: boolean;
}

// Expiry Preview Component
interface ExpiryPreviewProps {
  currentExpiry: Date;
  extensionMonths: number;
  showVisualization?: boolean;
}

// Extension Timeline Component
interface ExtensionTimelineProps {
  originalExpiry: Date;
  currentExpiry: Date;
  extensions: WarrantyExtension[];
}

// Extensions Report Page
interface ExtensionsReportProps {
  initialFilters?: ExtensionsReportFilters;
}

interface ExtensionsReportFilters {
  dateRange: 'last7' | 'last30' | 'last90' | 'custom';
  customDateFrom?: Date;
  customDateTo?: Date;
  customerId?: string;
  productId?: string;
  approvedById?: string;
  sortBy: 'date_desc' | 'date_asc' | 'months_desc' | 'customer';
  page: number;
  limit: number;
}

// Hook for Extension Management
interface UseWarrantyExtensionsOptions {
  warrantyId: string;
}

interface UseWarrantyExtensionsReturn {
  extensions: WarrantyExtension[];
  isLoading: boolean;
  error: Error | null;
  totalMonthsExtended: number;
  originalExpiry: Date;
  currentExpiry: Date;
  extendWarranty: (data: ExtensionFormData) => Promise<WarrantyExtension>;
  needsApproval: (months: number) => boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/support/warranties/$warrantyId.tsx` | Integration point (modify) |
| `src/routes/_authed/reports/warranty-extensions.tsx` | Extensions report page |
| `src/components/domain/support/warranty-extensions-tab.tsx` | Extensions tab content |
| `src/components/domain/support/extend-warranty-dialog.tsx` | Extension dialog |
| `src/components/domain/support/months-selector.tsx` | Month increment control |
| `src/components/domain/support/expiry-preview.tsx` | New expiry visualization |
| `src/components/domain/support/extension-timeline.tsx` | Visual timeline |
| `src/hooks/use-warranty-extensions.ts` | Extensions management hook |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-007c
