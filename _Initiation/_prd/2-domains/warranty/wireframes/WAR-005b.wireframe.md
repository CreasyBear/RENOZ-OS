# Wireframe: DOM-WAR-005b - CSV Bulk Warranty Registration: UI

## Story Reference

- **Story ID**: DOM-WAR-005b
- **Name**: CSV Bulk Warranty Registration: UI
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: Dialog with FileUpload, DataTable, and ProgressBar

## Overview

Bulk CSV warranty registration dialog for standalone imports (separate from order-based). Features drag-drop file upload, customer assignment, preview table with validation status, import progress, and error download capability.

## UI Patterns (Reference Implementation)

### Dialog Component
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Full-screen bulk import modal on mobile
  - Side panel import dialog on tablet/desktop
  - Multi-step wizard flow (Upload → Configure → Validate → Import)

### FileUpload Component (Custom)
- **Pattern**: RE-UI Input with drag-drop
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Drag-and-drop CSV file zone with visual feedback
  - File type validation (.csv only)
  - File size limit enforcement (5MB, 1000 rows)

### DataTable Component
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - CSV validation preview table with row-level error display
  - Filter toggle for valid/error/all rows
  - Error details expansion for failed validation rows

### Select Component
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Customer assignment dropdown (required)
  - Warranty policy selector
  - Registration date picker

### Progress Component
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Import progress bar showing completed/total warranties
  - Current item indicator during batch processing
  - Success/failure summary on completion

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | warranties | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-WAR-005b | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/warranties.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Bulk Import Dialog (Full Screen)

```
+=========================================+
| Bulk Import Warranties              [X] |
+=========================================+
|                                         |
|  STEP 1: Upload CSV                     |
|  =====================================  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         [upload cloud icon]         ||
|  |                                     ||
|  |    Tap to select CSV file           ||
|  |    or drag and drop                 ||
|  |                                     ||
|  |    Max 1000 rows, 5MB               ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [Download CSV Template]                |
|                                         |
+-----------------------------------------+
|                                         |
|  STEP 2: Assign Customer                |
|  =====================================  |
|                                         |
|  Customer *                             |
|  +--------------------------------- v--+|
|  | Search or select customer...        ||
|  +-------------------------------------+|
|  All warranties will be registered      |
|  to this customer                       |
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |          [VALIDATE CSV]             ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### File Selected State

```
+=========================================+
| Bulk Import Warranties              [X] |
+=========================================+
|                                         |
|  STEP 1: Upload CSV                     |
|  =====================================  |
|                                         |
|  +-------------------------------------+|
|  | [file] warranty-batch-jan.csv       ||
|  |        45 rows | 12KB               ||
|  |                            [Remove] ||
|  +-------------------------------------+|
|                                         |
|  [Change File]                          |
|                                         |
+-----------------------------------------+
|                                         |
|  STEP 2: Assign Customer                |
|  =====================================  |
|                                         |
|  Customer *                             |
|  +-------------------------------------+|
|  | Brisbane Solar Cooration                [x] ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |          [VALIDATE CSV]             ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Validation Preview (Scrollable)

```
+=========================================+
| Bulk Import Warranties              [X] |
+=========================================+
|                                         |
|  Validation Results                     |
|  45 rows | 42 valid | 3 errors          |
|  =====================================  |
|                                         |
|  +-------------------------------------+|
|  | # | Serial        | Product | Stat  ||
|  +-------------------------------------+|
|  | 1 | KC-2024-001   | Inverter | [ok]  ||
|  | 2 | KC-2024-002   | Inverter | [ok]  ||
|  | 3 | KC-2024-003   | Inverter | [!]   ||
|  |   | ^ Already registered             ||
|  | 4 | KC-2024-004   | Inverter | [ok]  ||
|  | 5 | WN-2024-001   | Battery  | [ok]  ||
|  | 6 | WN-2024-002   | Battery  | [!]   ||
|  |   | ^ Invalid serial format          ||
|  | 7 | WN-2024-003   | Battery  | [ok]  ||
|  | 8 | HV-2024-001   | HVAC    | [ok]  ||
|  | 9 | HV-2024-002   | HVAC    | [!]   ||
|  |   | ^ Product not found              ||
|  |10 | HV-2024-003   | HVAC    | [ok]  ||
|  | ............ scroll for more         |
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [Download Errors CSV]               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |    [IMPORT 42 VALID WARRANTIES]     ||
|  +-------------------------------------+|
|                                         |
|  (Cancel)                               |
|                                         |
+=========================================+
```

### Import Progress

```
+=========================================+
| Bulk Import Warranties              [X] |
+=========================================+
|                                         |
|  Importing Warranties                   |
|  =====================================  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [spinner]                          ||
|  |                                     ||
|  |  Registering warranties...          ||
|  |                                     ||
|  |  [==================....] 75%       ||
|  |                                     ||
|  |  32 of 42 complete                  ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Please do not close this battery        |
|                                         |
+=========================================+
```

### Import Complete

```
+=========================================+
| Bulk Import Warranties              [X] |
+=========================================+
|                                         |
|  Import Complete                        |
|  =====================================  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |     [large checkmark icon]          ||
|  |                                     ||
|  |  Successfully imported 42           ||
|  |  warranties for Brisbane Solar Cooration    ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Summary:                               |
|  +-------------------------------------+|
|  | Imported:        42                 ||
|  | Skipped:          3 (errors)        ||
|  | Customer:        Brisbane Solar Co          ||
|  | Policy:          12-Month Std       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |       [VIEW IMPORTED WARRANTIES]    ||
|  +-------------------------------------+|
|                                         |
|  (Close)                                |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Upload and Preview Side-by-Side

```
+=======================================================================+
| Bulk Import Warranties                                            [X] |
+=======================================================================+
|                                                                        |
|  +--- UPLOAD & CONFIG ----+  +--- PREVIEW ------------------------+   |
|  |                        |  |                                    |   |
|  | Upload CSV File        |  | Validation Preview                 |   |
|  | -------------------    |  | ---------------------------------- |   |
|  |                        |  |                                    |   |
|  | +--------------------+ |  | 45 rows | 42 valid | 3 errors      |   |
|  | |                    | |  |                                    |   |
|  | | [upload icon]      | |  | +--------------------------------+ |   |
|  | |                    | |  | | # | Serial     | Prod  | Stat | |   |
|  | | Drag CSV here      | |  | +---+------------+-------+------+ |   |
|  | | or click to browse | |  | | 1 | KC-2024-001| Cab   | [ok] | |   |
|  | |                    | |  | | 2 | KC-2024-002| Cab   | [ok] | |   |
|  | +--------------------+ |  | | 3 | KC-2024-003| Cab   | [!]  | |   |
|  |                        |  | | 4 | KC-2024-004| Cab   | [ok] | |   |
|  | [Download Template]    |  | | 5 | WN-2024-001| Win   | [ok] | |   |
|  |                        |  | | 6 | WN-2024-002| Win   | [!]  | |   |
|  | -------------------    |  | | 7 | WN-2024-003| Win   | [ok] | |   |
|  |                        |  | | 8 | HV-2024-001| HVAC  | [ok] | |   |
|  | Customer *             |  | | 9 | HV-2024-002| HVAC  | [!]  | |   |
|  | +--------------------+ |  | |10 | HV-2024-003| HVAC  | [ok] | |   |
|  | | Brisbane Solar Co      [x] | |  | +--------------------------------+ |   |
|  | +--------------------+ |  |                                    |   |
|  |                        |  | [Download Errors CSV]              |   |
|  +------------------------+  |                                    |   |
|                              +------------------------------------+   |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |  (Cancel)               [IMPORT 42 VALID WARRANTIES]            |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Full Bulk Import Dialog

```
+================================================================================================+
|                                                                                                 |
|  +----------------------------------------------------------------------------------------+    |
|  | Bulk Import Warranties                                                              [X] |    |
|  +=========================================================================================+    |
|  |                                                                                         |    |
|  |  Import multiple warranty registrations from a CSV file. All warranties will be        |    |
|  |  registered to a single customer with a unified policy.                                |    |
|  |                                                                                         |    |
|  |  +--- UPLOAD & CONFIGURATION -------------------+  +--- VALIDATION PREVIEW ----------+ |    |
|  |  |                                              |  |                                 | |    |
|  |  | CSV File                                     |  | Validation Results              | |    |
|  |  | +------------------------------------------+ |  | ------------------------------- | |    |
|  |  | |                                          | |  |                                 | |    |
|  |  | |           [cloud upload icon]            | |  | Total Rows:     45              | |    |
|  |  | |                                          | |  | Valid:          42 [green]      | |    |
|  |  | |    Drag and drop your CSV file here      | |  | Errors:          3 [red]        | |    |
|  |  | |    or click to browse                    | |  | Duplicates:      0              | |    |
|  |  | |                                          | |  |                                 | |    |
|  |  | |    Accepted: .csv                        | |  | +-----------------------------+ | |    |
|  |  | |    Max: 1000 rows, 5MB                   | |  | |                             | | |    |
|  |  | |                                          | |  | | Row | Serial      | Product | | |    |
|  |  | +------------------------------------------+ |  | |     |             | Status  | | |    |
|  |  |                                              |  | |-----+-------------+---------| | |    |
|  |  | [Download CSV Template]                      |  | |  1  | KC-2024-001 | [Valid] | | |    |
|  |  |                                              |  | |  2  | KC-2024-002 | [Valid] | | |    |
|  |  | ------------------------------------------   |  | |  3  | KC-2024-003 | [ERROR] | | |    |
|  |  |                                              |  | |     | Already registered    | | |    |
|  |  | Customer *                                   |  | |  4  | KC-2024-004 | [Valid] | | |    |
|  |  | +------------------------------------------+ |  | |  5  | WN-2024-001 | [Valid] | | |    |
|  |  | | [Search customers...]                 v  | |  | |  6  | WN-2024-002 | [ERROR] | | |    |
|  |  | +------------------------------------------+ |  | |     | Invalid format       | | |    |
|  |  | All warranties will be assigned to this      |  | |  7  | WN-2024-003 | [Valid] | | |    |
|  |  | customer account.                            |  | |  8  | HV-2024-001 | [Valid] | | |    |
|  |  |                                              |  | |  9  | HV-2024-002 | [ERROR] | | |    |
|  |  | Warranty Policy                              |  | |     | Product not found    | | |    |
|  |  | +------------------------------------------+ |  | | 10  | HV-2024-003 | [Valid] | | |    |
|  |  | | 12-Month Standard (Default)           v  | |  | | ... | (35 more)   |         | | |    |
|  |  | +------------------------------------------+ |  | |                             | | |    |
|  |  | Policy applied to all imported warranties.   |  | +-----------------------------+ | |    |
|  |  |                                              |  |                                 | |    |
|  |  | Registration Date                            |  | [Download Errors as CSV]        | |    |
|  |  | +------------------------------------------+ |  |                                 | |    |
|  |  | | Today (January 10, 2026)              v  | |  | Filter: [All] [Valid] [Errors] | |    |
|  |  | +------------------------------------------+ |  |                                 | |    |
|  |  |                                              |  +--------------------------------+ |    |
|  |  +----------------------------------------------+                                     |    |
|  |                                                                                         |    |
|  |  +-----------------------------------------------------------------------------------+  |    |
|  |  |                                                                                   |  |    |
|  |  |  (Cancel)                              [IMPORT 42 VALID WARRANTIES]               |  |    |
|  |  |                                                                                   |  |    |
|  |  +-----------------------------------------------------------------------------------+  |    |
|  |                                                                                         |    |
|  +-----------------------------------------------------------------------------------------+    |
|                                                                                                 |
+================================================================================================+
```

### Import Progress State

```
+----------------------------------------------------------------------------------------+
| Bulk Import Warranties                                                              [X] |
+=========================================================================================+
|                                                                                         |
|  +--- IMPORT PROGRESS ------------------------------------------------------------+    |
|  |                                                                                 |    |
|  |                        Importing Warranties                                     |    |
|  |                                                                                 |    |
|  |  +--------------------------------------------------------------------------+   |    |
|  |  |                                                                          |   |    |
|  |  |  [spinner]  Registering 42 warranties for Brisbane Solar Cooration               |   |    |
|  |  |                                                                          |   |    |
|  |  |  +--------------------------------------------------------------------+  |   |    |
|  |  |  |                                                                    |  |   |    |
|  |  |  |  [==================================================............] |  |   |    |
|  |  |  |                                                                    |  |   |    |
|  |  |  |  75% complete                                                      |  |   |    |
|  |  |  |                                                                    |  |   |    |
|  |  |  +--------------------------------------------------------------------+  |   |    |
|  |  |                                                                          |   |    |
|  |  |  32 of 42 warranties registered                                         |   |    |
|  |  |                                                                          |   |    |
|  |  |  Current: KC-2024-032 - Kitchen Inverter Set                              |   |    |
|  |  |                                                                          |   |    |
|  |  +--------------------------------------------------------------------------+   |    |
|  |                                                                                 |    |
|  |  Please do not close this battery. Import is in progress.                       |    |
|  |                                                                                 |    |
|  +---------------------------------------------------------------------------------+    |
|                                                                                         |
+=========================================================================================+
```

### Import Complete with Summary

```
+----------------------------------------------------------------------------------------+
| Bulk Import Warranties                                                              [X] |
+=========================================================================================+
|                                                                                         |
|  +--- IMPORT COMPLETE -------------------------------------------------------------+   |
|  |                                                                                  |   |
|  |                     [large checkmark in circle]                                  |   |
|  |                                                                                  |   |
|  |                     Import Completed Successfully                                |   |
|  |                                                                                  |   |
|  |  +--- SUMMARY CARDS --------------------------------------------------------+   |   |
|  |  |                                                                          |   |   |
|  |  |  +----------------+  +----------------+  +----------------+              |   |   |
|  |  |  | Imported       |  | Skipped        |  | Total Time     |              |   |   |
|  |  |  | 42             |  | 3              |  | 0:45           |              |   |   |
|  |  |  | warranties     |  | errors         |  | seconds        |              |   |   |
|  |  |  +----------------+  +----------------+  +----------------+              |   |   |
|  |  |                                                                          |   |   |
|  |  +--------------------------------------------------------------------------+   |   |
|  |                                                                                  |   |
|  |  +--- DETAILS --------------------------------------------------------------+   |   |
|  |  |                                                                          |   |   |
|  |  |  Customer:          Brisbane Solar Cooration                                     |   |   |
|  |  |  Policy:            12-Month Standard                                    |   |   |
|  |  |  Registration Date: January 10, 2026                                     |   |   |
|  |  |  Expiry Date:       January 10, 2027 (all)                               |   |   |
|  |  |                                                                          |   |   |
|  |  +--------------------------------------------------------------------------+   |   |
|  |                                                                                  |   |
|  |  +--- SKIPPED ITEMS --------------------------------------------------------+   |   |
|  |  | 3 items were skipped due to errors:                                      |   |   |
|  |  | - KC-2024-003: Already registered to another customer                    |   |   |
|  |  | - WN-2024-002: Invalid serial number format                              |   |   |
|  |  | - HV-2024-002: Product SKU not found in inventory                        |   |   |
|  |  |                                                                          |   |   |
|  |  | [Download Skipped Items CSV]                                             |   |   |
|  |  +--------------------------------------------------------------------------+   |   |
|  |                                                                                  |   |
|  +---------------------------------------------------------------------------------+   |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |                                                                                   |  |
|  |  (Close)                              [VIEW IMPORTED WARRANTIES]                  |  |
|  |                                                                                   |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
+=========================================================================================+
```

---

## Drag-Drop Interaction

### Drop Zone States

```
DEFAULT STATE:
+------------------------------------------+
|                                          |
|           [cloud upload icon]            |
|                                          |
|    Drag and drop your CSV file here      |
|    or click to browse                    |
|                                          |
|    Accepted: .csv | Max: 1000 rows, 5MB  |
|                                          |
+------------------------------------------+
  Border: dashed gray-300
  Background: gray-50

DRAG OVER (Valid File):
+==========================================+
||                                        ||
||         [cloud upload icon]            ||
||           (animated bounce)            ||
||                                        ||
||    Drop your file to upload            ||
||                                        ||
+==========================================+
  Border: solid blue-500 (2px)
  Background: blue-50
  Icon: scale pulse animation

DRAG OVER (Invalid File):
+==========================================+
||                                        ||
||         [X error icon]                 ||
||                                        ||
||    Invalid file type                   ||
||    Only .csv files accepted            ||
||                                        ||
+==========================================+
  Border: solid red-500 (2px)
  Background: red-50

FILE UPLOADED:
+------------------------------------------+
| [file icon] warranty-batch-jan.csv       |
|             45 rows | 12KB               |
|                                          |
|             [Remove]    [Change File]    |
+------------------------------------------+
  Border: solid green-500
  Background: green-50
```

---

## Validation Status Badges

```
+--- STATUS BADGES ------------------------------------+
|                                                      |
|  VALID:                                              |
|  +----------+                                        |
|  | [check]  |  Background: green-100                 |
|  | Valid    |  Text: green-700                       |
|  +----------+  Icon: check circle                    |
|                                                      |
|  ERROR:                                              |
|  +----------+                                        |
|  | [!]      |  Background: red-100                   |
|  | Error    |  Text: red-700                         |
|  +----------+  Icon: exclamation circle              |
|              + Error message below row               |
|                                                      |
|  DUPLICATE:                                          |
|  +----------+                                        |
|  | [copy]   |  Background: yellow-100                |
|  | Duplicate|  Text: yellow-700                      |
|  +----------+  Icon: copy/duplicate                  |
|                                                      |
|  PROCESSING:                                         |
|  +----------+                                        |
|  | [spin]   |  Background: blue-100                  |
|  | Checking |  Text: blue-700                        |
|  +----------+  Icon: spinner                         |
|                                                      |
+------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
FILE PARSING:
+------------------------------------------+
|                                          |
|    [spinner] Parsing CSV file...         |
|                                          |
|    Reading 45 rows                       |
|                                          |
+------------------------------------------+

VALIDATING:
+------------------------------------------+
|                                          |
|    [spinner] Validating entries...       |
|                                          |
|    Checking serial numbers, products,    |
|    and existing registrations            |
|                                          |
|    [============..............] 40%      |
|                                          |
+------------------------------------------+

TABLE LOADING:
+--------------------------------+
| # | Serial      | Prod | Stat |
+---+-------------+------+------+
| 1 | [.........] | [..] | [..] |
| 2 | [.........] | [..] | [..] |
| 3 | [.........] | [..] | [..] |
+--------------------------------+
  <- Skeleton rows with shimmer
```

### Empty States

```
NO FILE UPLOADED:
+------------------------------------------+
|                                          |
|           [upload cloud icon]            |
|                                          |
|    Upload a CSV file to get started      |
|                                          |
|    [Download CSV Template]               |
|                                          |
+------------------------------------------+

PREVIEW EMPTY (before validation):
+--------------------------------+
|                                |
|    Upload and validate a       |
|    CSV file to preview         |
|    warranty registrations      |
|                                |
+--------------------------------+
```

### Error States

```
INVALID FILE FORMAT:
+------------------------------------------+
|                                          |
|    [!] Invalid file format               |
|                                          |
|    The uploaded file is not a valid CSV. |
|    Please check the file format and      |
|    try again.                            |
|                                          |
|    [Try Again]                           |
|                                          |
+------------------------------------------+

MISSING REQUIRED COLUMNS:
+------------------------------------------+
|                                          |
|    [!] Missing required columns          |
|                                          |
|    Your CSV is missing these columns:    |
|    - serial_number                       |
|    - product_sku                         |
|                                          |
|    [Download Template]  [Try Again]      |
|                                          |
+------------------------------------------+

FILE TOO LARGE:
+------------------------------------------+
|                                          |
|    [!] File too large                    |
|                                          |
|    Maximum file size is 5MB.             |
|    Your file is 8.5MB.                   |
|                                          |
|    Try splitting into smaller batches.   |
|                                          |
|    [Try Again]                           |
|                                          |
+------------------------------------------+

IMPORT FAILED:
+------------------------------------------+
|                                          |
|    [!] Import failed                     |
|                                          |
|    An error occurred during import.      |
|    15 of 42 warranties were registered.  |
|                                          |
|    [Download Remaining Items]            |
|    [Retry Remaining]  [Close]            |
|                                          |
+------------------------------------------+
```

### Success States

```
VALIDATION COMPLETE:
+------------------------------------------+
|  [check] Validation complete             |
|                                          |
|  42 valid, 3 errors                      |
|  Ready to import                         |
+------------------------------------------+

IMPORT COMPLETE:
+------------------------------------------+
|  [check] Import successful               |
|                                          |
|  42 warranties registered                |
|  for Brisbane Solar Cooration                    |
+------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Initial State**
   - Tab: File upload zone -> Download template -> Customer select -> Policy select -> Cancel -> Validate

2. **After Validation**
   - Tab: Filter toggles -> Preview table -> Download errors -> Cancel -> Import

3. **Progress State**
   - Focus on progress message
   - Progress updates announced

4. **Complete State**
   - Tab: Summary cards -> Skipped items -> Download -> Close -> View Warranties

### ARIA Requirements

```html
<!-- Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="bulk-import-title"
>
  <h2 id="bulk-import-title">Bulk Import Warranties</h2>
</dialog>

<!-- File Upload Zone -->
<div
  role="button"
  tabindex="0"
  aria-label="Upload CSV file. Drag and drop or press Enter to browse."
  aria-describedby="upload-help"
>
  <input
    type="file"
    accept=".csv"
    aria-hidden="true"
  />
</div>
<span id="upload-help" class="sr-only">
  Maximum 1000 rows, 5MB file size
</span>

<!-- Validation Preview Table -->
<table
  role="table"
  aria-label="CSV validation preview"
  aria-describedby="validation-summary"
>
  <caption id="validation-summary" class="sr-only">
    45 total rows, 42 valid, 3 errors
  </caption>
</table>

<!-- Progress Bar -->
<div
  role="progressbar"
  aria-valuenow="75"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Import progress: 32 of 42 warranties registered"
>
  <div class="progress-fill"></div>
</div>

<!-- Status Badge -->
<span
  role="status"
  aria-label="Valid entry"
  class="badge badge-valid"
>
  Valid
</span>

<span
  role="alert"
  aria-label="Error: Already registered"
  class="badge badge-error"
>
  Error
</span>
```

### Screen Reader Announcements

- File selected: "File warranty-batch-jan.csv selected. 45 rows, 12 kilobytes."
- Validation started: "Validating CSV file. Please wait."
- Validation complete: "Validation complete. 42 valid entries, 3 errors found."
- Import started: "Importing 42 warranties. Progress: 0 percent."
- Progress update: "32 of 42 warranties registered. 75 percent complete."
- Import complete: "Import completed. 42 warranties successfully registered for Brisbane Solar Cooration."
- Error: "Import failed. 15 of 42 warranties were registered before the error occurred."

---

## Animation Choreography

### File Upload

```
DRAG ENTER:
- Duration: 150ms
- Border: color transition to blue-500
- Background: fade to blue-50
- Icon: scale(1) -> scale(1.1) with bounce

DRAG LEAVE:
- Duration: 150ms
- Reverse of enter

DROP SUCCESS:
- Duration: 300ms
- Icon: upload cloud -> checkmark morph
- Border: blue -> green transition
- File info: fade in from opacity(0) translateY(8px)

PARSE PROGRESS:
- Duration: variable
- Spinner: rotate 360deg per 1s
- Progress text: count up animation
```

### Validation Preview

```
ROW APPEAR:
- Duration: 200ms (staggered 30ms)
- Each row: opacity(0) translateX(-8px) -> opacity(1) translateX(0)

STATUS BADGE:
- Duration: 150ms
- Valid: scale bounce with green flash
- Error: shake animation with red flash

ERROR EXPAND:
- Duration: 200ms
- Height: 0 -> auto
- Error text: fade in
```

### Import Progress

```
PROGRESS BAR:
- Duration: continuous
- Fill: width transition based on actual progress
- Color: blue-500

CURRENT ITEM:
- Duration: 150ms per item
- Fade out old -> fade in new

COMPLETION:
- Duration: 500ms
- Progress bar: flash green
- Checkmark: scale bounce from center
- Summary cards: stagger fade in (100ms each)
```

### Dialog Transitions

```
OPEN:
- Duration: 250ms
- Overlay: opacity(0) -> opacity(0.5)
- Dialog: scale(0.95) opacity(0) -> scale(1) opacity(1)

CLOSE:
- Duration: 200ms
- Reverse of open
```

---

## Component Props Interface

```typescript
// Main Dialog Component
interface BulkWarrantyCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: BulkImportResult) => void;
}

// File Upload Component
interface CsvFileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  file: File | null;
  isValidating: boolean;
  error: string | null;
  maxSize?: number; // bytes
  maxRows?: number;
}

// Customer Select Component
interface CustomerSelectProps {
  value: string | null;
  onChange: (customerId: string | null) => void;
  disabled?: boolean;
  error?: string;
}

// Validation Preview Table
interface ValidationPreviewTableProps {
  rows: ValidationRow[];
  isLoading: boolean;
  filter: 'all' | 'valid' | 'errors';
  onFilterChange: (filter: 'all' | 'valid' | 'errors') => void;
  onDownloadErrors: () => void;
}

interface ValidationRow {
  rowNumber: number;
  serialNumber: string;
  productSku: string;
  productName: string | null;
  status: 'valid' | 'error' | 'duplicate' | 'processing';
  errorMessage?: string;
  errorCode?: string;
}

// Import Progress Component
interface ImportProgressProps {
  totalCount: number;
  completedCount: number;
  currentItem: string | null;
  isComplete: boolean;
  error: Error | null;
}

// Import Result Summary
interface ImportResultSummaryProps {
  result: BulkImportResult;
  onViewWarranties: () => void;
  onDownloadSkipped: () => void;
  onClose: () => void;
}

interface BulkImportResult {
  importedCount: number;
  skippedCount: number;
  totalTime: number; // seconds
  customerId: string;
  customerName: string;
  policyName: string;
  registrationDate: Date;
  expiryDate: Date;
  skippedItems: SkippedItem[];
  importedWarrantyIds: string[];
}

interface SkippedItem {
  rowNumber: number;
  serialNumber: string;
  reason: string;
}

// Hook for Bulk Import
interface UseBulkWarrantyImportOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: BulkImportResult) => void;
  onError?: (error: Error) => void;
}

interface UseBulkWarrantyImportReturn {
  validateCsv: (file: File) => Promise<ValidationResult>;
  importWarranties: (config: ImportConfig) => Promise<BulkImportResult>;
  validationResult: ValidationResult | null;
  isValidating: boolean;
  isImporting: boolean;
  progress: number;
  error: Error | null;
  reset: () => void;
}

interface ValidationResult {
  totalRows: number;
  validRows: ValidationRow[];
  errorRows: ValidationRow[];
  duplicateRows: ValidationRow[];
}

interface ImportConfig {
  validRows: ValidationRow[];
  customerId: string;
  policyId: string;
  registrationDate: Date;
}
```

---

## CSV Template Format

```csv
serial_number,product_sku,notes
KC-2024-001,KC-OAK-001,"Kitchen inverter installation"
KC-2024-002,KC-OAK-001,""
WN-2024-001,WN-DBL-001,"Living room batterys"
HV-2024-001,HV-COM-001,"Commercial HVAC unit"
```

### Template Columns

| Column | Required | Description |
|--------|----------|-------------|
| serial_number | Yes | Unique serial number for the unit |
| product_sku | Yes | Product SKU matching inventory |
| notes | No | Optional notes for the warranty |

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/support/bulk-warranty-csv-dialog.tsx` | Main dialog component |
| `src/components/domain/support/csv-file-upload.tsx` | Drag-drop upload zone |
| `src/components/domain/support/csv-validation-preview.tsx` | Preview table |
| `src/components/domain/support/import-progress.tsx` | Progress display |
| `src/components/domain/support/import-result-summary.tsx` | Completion summary |
| `src/hooks/use-bulk-warranty-import.ts` | Import logic hook |
| `src/routes/support/warranties/index.tsx` | Integration point |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-005b
