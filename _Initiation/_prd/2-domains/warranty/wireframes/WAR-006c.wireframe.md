# Wireframe: DOM-WAR-006c - Warranty Claim Workflow: UI

## Story Reference

- **Story ID**: DOM-WAR-006c
- **Name**: Warranty Claim Workflow: UI
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: Form Dialog with Tab and DataTable

## Overview

Warranty claim submission, approval workflow, and claim history UI. Includes claim form dialog, resolution preference selection, issue linking, claim approval dialog for high-value claims, and claim history tab on warranty detail.

## UI Patterns (Reference Implementation)

### Dialog & Sheet Components
- **Pattern**: RE-UI Dialog/Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `sheet.tsx`
- **Features**:
  - File claim bottom sheet on mobile
  - Claim approval modal for high-value claims
  - Form dialogs with multi-step validation

### RadioGroup Component
- **Pattern**: RE-UI RadioGroup
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Resolution preference selection (Repair/Replace/Refund)
  - Descriptive options with sub-labels
  - Required field validation

### Textarea Component
- **Pattern**: RE-UI Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/textarea.tsx`
- **Features**:
  - Issue description input with character count
  - Approval/denial comments field
  - Auto-resizing for long text

### Badge Component
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Claim status badges (Submitted/Under Review/Approved/Denied/Resolved)
  - Resolution type badges (Repair/Replace/Refund)
  - Color-coded urgency indicators

### DataTable Component
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Claims history table on warranty detail tab
  - Sortable columns by date, status, cost
  - Click-to-expand claim details

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | warranties | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-WAR-006c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/warranties.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Warranty Detail with File Claim Button

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
|  |          [FILE A CLAIM]             ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|  [Overview] [Claims] [Extensions]       |
|             ======                      |
+-----------------------------------------+
|                                         |
|  Claims History                         |
|  ---------------------------------      |
|                                         |
|  +-------------------------------------+|
|  | CLM-2026-00001                      ||
|  | Jan 8, 2026                         ||
|  | ---------------------------------   ||
|  | Issue: Door hinge defective         ||
|  | Resolution: [Repair]                ||
|  | Status: [Approved]                  ||
|  | Cost: $150.00                       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | CLM-2026-00002                      ||
|  | Jan 10, 2026                        ||
|  | ---------------------------------   ||
|  | Issue: Drawer slide broken          ||
|  | Resolution: [Replace]               ||
|  | Status: [Under Review]              ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### File Claim Dialog (Bottom Sheet)

```
+=========================================+
|                                         |
|  =====================================  |
|         <- drag handle                  |
|                                         |
|  File Warranty Claim              [X]   |
|  =====================================  |
|                                         |
|  WAR-2026-00123                         |
|  Kitchen Inverter Set - Oak              |
|                                         |
|  ---------------------------------      |
|                                         |
|  Issue Description *                    |
|  +-------------------------------------+|
|  | The door hinge on the upper        ||
|  | inverter has broken. The door       ||
|  | no longer closes properly and      ||
|  | swings open on its own.            ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Preferred Resolution *                 |
|  +-------------------------------------+|
|  | (o) Repair                          ||
|  |     Fix the existing product        ||
|  |                                     ||
|  | ( ) Replace                         ||
|  |     Provide new replacement         ||
|  |                                     ||
|  | ( ) Refund                          ||
|  |     Return for full refund          ||
|  +-------------------------------------+|
|                                         |
|  Supporting Photos                      |
|  +-------------------------------------+|
|  | [+] Add photos (optional)           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |           [SUBMIT CLAIM]            ||
|  +-------------------------------------+|
|                                         |
|  (Cancel)                               |
|                                         |
+=========================================+
```

### Claim Detail View (Expanded Card)

```
+=========================================+
| < Claims                           [*]  |
+-----------------------------------------+
|                                         |
|  Claim CLM-2026-00001                   |
|  =====================================  |
|                                         |
|  Status: [Under Review]                 |
|  Filed: January 8, 2026                 |
|                                         |
+-----------------------------------------+
|                                         |
|  Warranty                               |
|  +-------------------------------------+|
|  | WAR-2026-00123                      ||
|  | Kitchen Inverter Set - Oak           ||
|  | Brisbane Solar Cooration                    ||
|  +-------------------------------------+|
|                                         |
|  Issue Details                          |
|  +-------------------------------------+|
|  | Door hinge defective on upper       ||
|  | inverter. Door swings open on its    ||
|  | own and doesn't close properly.     ||
|  +-------------------------------------+|
|                                         |
|  Preferred Resolution                   |
|  [Repair]                               |
|                                         |
|  Linked Issue                           |
|  +-------------------------------------+|
|  | ISS-2026-00045 - Inverter Repair    ||
|  | Status: [In Progress]               ||
|  | [View Issue ->]                     ||
|  +-------------------------------------+|
|                                         |
|  Photos                                 |
|  +----------+ +----------+              |
|  | [photo1] | | [photo2] |              |
|  +----------+ +----------+              |
|                                         |
+-----------------------------------------+
|                                         |
|  Timeline                               |
|  ---------------------------------      |
|  [o] Submitted - Jan 8, 10:30 AM        |
|   |  By: John Smith                     |
|  [o] Under Review - Jan 8, 2:00 PM      |
|   |  Assigned to: Sarah Wilson          |
|  [ ] Pending approval...                |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Warranty Detail with Claims Tab

```
+=======================================================================+
| < Warranties                                                           |
+------------------------------------------------------------------------+
|                                                                        |
|  WAR-2026-00123                                [File Claim] [Edit]     |
|  Kitchen Inverter Set - Oak | Brisbane Solar Cooration                          |
|  Status: [Active]  |  Expires: January 5, 2028  |  730 days            |
|                                                                        |
+------------------------------------------------------------------------+
|  [Overview] [Claims] [Extensions] [Activity]                           |
|             ======                                                     |
+------------------------------------------------------------------------+
|                                                                        |
|  Claims History                                           [+ New Claim]|
|  ---------------------------------------------------------------------  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | Claim #     | Date       | Issue           | Resolution| Status |  |
|  +-------------+------------+-----------------+-----------+--------+  |
|  | CLM-00001   | Jan 8      | Door hinge      | Repair    | [Apprd]|  |
|  |             |            | defective       | $150      |        |  |
|  +-------------+------------+-----------------+-----------+--------+  |
|  | CLM-00002   | Jan 10     | Drawer slide    | Replace   | [Revw] |  |
|  |             |            | broken          | Pending   |        |  |
|  +-------------+------------+-----------------+-----------+--------+  |
|  | CLM-00003   | Jan 5      | Finish scratch  | Repair    | [Deny] |  |
|  |             |            |                 | N/A       |        |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  Showing 3 claims | Total resolved: $150.00                            |
|                                                                        |
+=======================================================================+
```

### File Claim Dialog (Side Panel)

```
+=======================================================================+
|  Warranty Detail                         +---------------------------+ |
|                                          | File Warranty Claim   [X] | |
|  +--- WARRANTY INFO ---+                 | ------------------------- | |
|  |                     |                 |                           | |
|  | WAR-2026-00123      |                 | Warranty: WAR-2026-00123  | |
|  | Kitchen Inverter     |                 | Product: Kitchen Inverter  | |
|  | Set - Oak           |                 |                           | |
|  |                     |                 | Issue Description *       | |
|  | Status: [Active]    |                 | +------------------------+| |
|  |                     |                 | | The door hinge on the  || |
|  +---------------------+                 | | upper inverter has      || |
|                                          | | broken...              || |
|  +--- CLAIMS ---+                        | +------------------------+| |
|  |              |                        |                           | |
|  | CLM-00001    |                        | Preferred Resolution *    | |
|  | CLM-00002    |                        | +------------------------+| |
|  | CLM-00003    |                        | | (o) Repair             || |
|  |              |                        | | ( ) Replace            || |
|  +--------------+                        | | ( ) Refund             || |
|                                          | +------------------------+| |
|                                          |                           | |
|                                          | Attach Photos             | |
|                                          | [+] Add photos            | |
|                                          |                           | |
|                                          | (Cancel) [SUBMIT CLAIM]   | |
|                                          +---------------------------+ |
|                                                                         |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Warranty Detail with Claims Tab

```
+================================================================================================+
| [Logo] Renoz CRM                                                         [Bell] [User v]       |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Support  |  < Back to Warranties                                                               |
| -------  |                                                                                      |
| Issues   |  WAR-2026-00123                                          [File a Claim] [Edit]      |
| Warranty<|  Kitchen Inverter Set - Oak                                                          |
|          |  Brisbane Solar Cooration | John Smith | john@acme.com                                      |
|          |  ==================================================================================  |
|          |                                                                                      |
|          |  +--- STATUS BAR -------------------------------------------------------------+      |
|          |  | [Active]  |  Registered: Jan 5, 2026  |  Expires: Jan 5, 2028  |  730 days |      |
|          |  +----------------------------------------------------------------------------+      |
|          |                                                                                      |
|          |  [Overview] [Claims] [Extensions] [Certificate] [Activity]                           |
|          |             ======                                                                   |
|          |                                                                                      |
|          |  +--- CLAIMS HISTORY --------------------------------------------------------+       |
|          |  |                                                                          |       |
|          |  |  Claims Summary                                          [+ New Claim]   |       |
|          |  |  Total Claims: 3  |  Approved: 1 ($150)  |  Pending: 1  |  Denied: 1    |       |
|          |  |                                                                          |       |
|          |  |  +--------------------------------------------------------------------+  |       |
|          |  |  |                                                                    |  |       |
|          |  |  | Claim #       | Filed      | Issue            | Resolution | Cost |  |       |
|          |  |  |               |            |                  | Preference | Stat |  |       |
|          |  |  |---------------+------------+------------------+------------+------|  |       |
|          |  |  | CLM-2026-0001 | Jan 8      | Door hinge       | Repair     | $150 |  |       |
|          |  |  |               | 10:30 AM   | defective        |            |[Appr]|  |       |
|          |  |  |               |            | ISS-00045 [link] |            |      |  |       |
|          |  |  |---------------+------------+------------------+------------+------|  |       |
|          |  |  | CLM-2026-0002 | Jan 10     | Drawer slide     | Replace    |  --  |  |       |
|          |  |  |               | 2:15 PM    | broken           |            |[Revw]|  |       |
|          |  |  |               |            | ISS-00048 [link] |            |      |  |       |
|          |  |  |---------------+------------+------------------+------------+------|  |       |
|          |  |  | CLM-2026-0003 | Jan 5      | Finish scratch   | Repair     |  --  |  |       |
|          |  |  |               | 9:00 AM    | (cosmetic)       |            |[Deny]|  |       |
|          |  |  |               |            |                  |            |      |  |       |
|          |  |  +--------------------------------------------------------------------+  |       |
|          |  |                                                                          |       |
|          |  +--------------------------------------------------------------------------+       |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+
```

### File Claim Modal (Desktop)

```
+================================================================================================+
|                                                                                                 |
|     +------------------------------------------------------------------------+                 |
|     | File Warranty Claim                                                [X] |                 |
|     +========================================================================+                 |
|     |                                                                        |                 |
|     |  +--- WARRANTY SUMMARY ---+  +--- CLAIM DETAILS ----------------------+|                 |
|     |  |                        |  |                                        ||                 |
|     |  | WAR-2026-00123         |  | Issue Description *                    ||                 |
|     |  | Kitchen Inverter Set    |  | +------------------------------------+ ||                 |
|     |  | Brisbane Solar Cooration       |  | | Describe the issue with the       | ||                 |
|     |  |                        |  | | product. Include when it started  | ||                 |
|     |  | Policy:                |  | | and any relevant details.         | ||                 |
|     |  | 24-Month Extended      |  | |                                    | ||                 |
|     |  |                        |  | |                                    | ||                 |
|     |  | Coverage:              |  | +------------------------------------+ ||                 |
|     |  | - Materials defects    |  |                                        ||                 |
|     |  | - Workmanship          |  | Preferred Resolution *                 ||                 |
|     |  | - Manufacturing        |  | +------------------------------------+ ||                 |
|     |  |                        |  | | (o) Repair                         | ||                 |
|     |  | Exclusions:            |  | |     Fix the existing product       | ||                 |
|     |  | - Normal wear          |  | |                                    | ||                 |
|     |  | - Misuse               |  | | ( ) Replace                        | ||                 |
|     |  |                        |  | |     Provide new replacement unit   | ||                 |
|     |  +------------------------+  | |                                    | ||                 |
|     |                              | | ( ) Refund                         | ||                 |
|     |                              | |     Full refund of purchase price  | ||                 |
|     |                              | +------------------------------------+ ||                 |
|     |                              |                                        ||                 |
|     |                              | Supporting Documentation               ||                 |
|     |                              | +------------------------------------+ ||                 |
|     |                              | | [+ Upload photos or documents]    | ||                 |
|     |                              | +------------------------------------+ ||                 |
|     |                              |                                        ||                 |
|     |                              +----------------------------------------+|                 |
|     |                                                                        |                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |  |                                                                    ||                 |
|     |  |                      (Cancel)       [SUBMIT CLAIM]                 ||                 |
|     |  |                                                                    ||                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |                                                                        |                 |
|     +------------------------------------------------------------------------+                 |
|                                                                                                 |
+================================================================================================+
```

### Claim Approval Dialog (High-Value Claims)

```
+================================================================================================+
|                                                                                                 |
|     +------------------------------------------------------------------------+                 |
|     | Claim Approval Required                                            [X] |                 |
|     +========================================================================+                 |
|     |                                                                        |                 |
|     |  [!] This claim requires manager approval                              |                 |
|     |      Estimated cost exceeds $500 threshold                             |                 |
|     |                                                                        |                 |
|     |  +--- CLAIM SUMMARY -----------------------------------------------+   |                 |
|     |  |                                                                 |   |                 |
|     |  |  Claim: CLM-2026-00002                                          |   |                 |
|     |  |  Warranty: WAR-2026-00123 - Kitchen Inverter Set                 |   |                 |
|     |  |  Customer: Brisbane Solar Cooration                                     |   |                 |
|     |  |                                                                 |   |                 |
|     |  |  Issue: Drawer slide broken on three inverter units              |   |                 |
|     |  |  Resolution Requested: Replace                                  |   |                 |
|     |  |  Estimated Cost: $750.00                                        |   |                 |
|     |  |                                                                 |   |                 |
|     |  +----------------------------------------------------------------+    |                 |
|     |                                                                        |                 |
|     |  Decision                                                              |                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |  | (o) Approve - Proceed with replacement                            ||                 |
|     |  |                                                                    ||                 |
|     |  | ( ) Approve with modification                                      ||                 |
|     |  |     [Adjust cost: $______]                                        ||                 |
|     |  |                                                                    ||                 |
|     |  | ( ) Deny - Reject this claim                                       ||                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |                                                                        |                 |
|     |  Comments                                                              |                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |  | Add notes for this decision (visible to customer)...              ||                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |                                                                        |                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |  |                                                                    ||                 |
|     |  |      (Cancel)         [DENY CLAIM]        [APPROVE CLAIM]          ||                 |
|     |  |                       (secondary)         (primary)                ||                 |
|     |  |                                                                    ||                 |
|     |  +--------------------------------------------------------------------+|                 |
|     |                                                                        |                 |
|     +------------------------------------------------------------------------+                 |
|                                                                                                 |
+================================================================================================+
```

---

## Claim Status Badges

```
+--- STATUS BADGES ------------------------------------+
|                                                      |
|  SUBMITTED:                                          |
|  +----------+                                        |
|  | [clock]  |  Background: blue-100                  |
|  | Submitted|  Text: blue-700                        |
|  +----------+  Initial state after filing            |
|                                                      |
|  UNDER REVIEW:                                       |
|  +----------+                                        |
|  | [eye]    |  Background: yellow-100                |
|  | Review   |  Text: yellow-700                      |
|  +----------+  Being evaluated by support            |
|                                                      |
|  APPROVED:                                           |
|  +----------+                                        |
|  | [check]  |  Background: green-100                 |
|  | Approved |  Text: green-700                       |
|  +----------+  Claim accepted for resolution         |
|                                                      |
|  DENIED:                                             |
|  +----------+                                        |
|  | [X]      |  Background: red-100                   |
|  | Denied   |  Text: red-700                         |
|  +----------+  Claim rejected                        |
|                                                      |
|  RESOLVED:                                           |
|  +----------+                                        |
|  | [check2] |  Background: emerald-100               |
|  | Resolved |  Text: emerald-700                     |
|  +----------+  Resolution completed                  |
|                                                      |
+------------------------------------------------------+
```

---

## Resolution Type Badges

```
+--- RESOLUTION BADGES --------------------------------+
|                                                      |
|  REPAIR:                                             |
|  +----------+                                        |
|  | [wrench] |  Background: blue-100                  |
|  | Repair   |  Text: blue-700                        |
|  +----------+  Fix existing product                  |
|                                                      |
|  REPLACE:                                            |
|  +----------+                                        |
|  | [refresh]|  Background: purple-100                |
|  | Replace  |  Text: purple-700                      |
|  +----------+  Provide new unit                      |
|                                                      |
|  REFUND:                                             |
|  +----------+                                        |
|  | [$]      |  Background: green-100                 |
|  | Refund   |  Text: green-700                       |
|  +----------+  Return purchase price                 |
|                                                      |
+------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
CLAIMS TAB LOADING:
+------------------------------------------------------------------+
|  Claims History                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  +--------------------------------------------------------------+|
|  | [..........................] | [.......] | [........] | [...] ||
|  | [..........................] | [.......] | [........] | [...] ||
|  | [..........................] | [.......] | [........] | [...] ||
|  +--------------------------------------------------------------+|
|  <- Skeleton rows with shimmer                                    |
|                                                                   |
+------------------------------------------------------------------+

SUBMITTING CLAIM:
+--------------------------------------------+
| File Warranty Claim                    [X] |
+--------------------------------------------+
|                                            |
|  +--------------------------------------+  |
|  |                                      |  |
|  |  [spinner] Submitting claim...       |  |
|  |                                      |  |
|  +--------------------------------------+  |
|                                            |
|                  (Cancel)  [SUBMITTING...] |
|                            disabled        |
+--------------------------------------------+

APPROVAL IN PROGRESS:
+--------------------------------------------+
| Claim Approval                         [X] |
+--------------------------------------------+
|                                            |
|  [spinner] Processing approval...          |
|                                            |
+--------------------------------------------+
```

### Empty States

```
NO CLAIMS:
+------------------------------------------------------------------+
|  Claims History                                     [+ New Claim] |
+------------------------------------------------------------------+
|                                                                   |
|  +--------------------------------------------------------------+|
|  |                                                              ||
|  |                  +------------------+                        ||
|  |                  |   [document]     |                        ||
|  |                  |      icon        |                        ||
|  |                  +------------------+                        ||
|  |                                                              ||
|  |               No claims filed yet                            ||
|  |                                                              ||
|  |     If you're experiencing issues with this product,         ||
|  |     you can file a warranty claim for repair, replacement,   ||
|  |     or refund.                                               ||
|  |                                                              ||
|  |                    [FILE A CLAIM]                            ||
|  |                                                              ||
|  +--------------------------------------------------------------+|
|                                                                   |
+------------------------------------------------------------------+
```

### Error States

```
CLAIM SUBMISSION FAILED:
+--------------------------------------------+
| File Warranty Claim                    [X] |
+--------------------------------------------+
|                                            |
|  [!] Failed to submit claim                |
|                                            |
|  There was a problem submitting your       |
|  claim. Please try again.                  |
|                                            |
|  Error: Server temporarily unavailable     |
|                                            |
|           (Cancel)    [Retry Submit]       |
|                                            |
+--------------------------------------------+

APPROVAL FAILED:
+--------------------------------------------+
| [!] Approval Failed                    [X] |
+--------------------------------------------+
|                                            |
|  Could not process the claim approval.     |
|  The claim status has not been changed.    |
|                                            |
|              [OK]    [Retry]               |
|                                            |
+--------------------------------------------+
```

### Success States

```
CLAIM SUBMITTED:
+--------------------------------------------+
|  [check] Claim submitted successfully      |
|                                            |
|  CLM-2026-00003 created                    |
|  We'll review your claim shortly.          |
|                                            |
|  <- Toast notification (5s)                |
+--------------------------------------------+

CLAIM APPROVED:
+--------------------------------------------+
|  [check] Claim approved                    |
|                                            |
|  CLM-2026-00002 approved for $750.00       |
|  Customer has been notified.               |
|                                            |
+--------------------------------------------+

CLAIM DENIED:
+--------------------------------------------+
|  [info] Claim denied                       |
|                                            |
|  CLM-2026-00003 has been denied.           |
|  Customer has been notified.               |
|                                            |
+--------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Claims Tab**
   - Tab: New Claim button -> First table row -> Pagination

2. **File Claim Dialog**
   - Focus trapped within dialog
   - Tab: Issue description -> Repair radio -> Replace radio -> Refund radio -> Upload button -> Cancel -> Submit
   - Escape: Close with unsaved changes confirmation

3. **Approval Dialog**
   - Focus: Decision options -> Comments -> Deny button -> Approve button
   - Enter on decision: Submits with that decision

### ARIA Requirements

```html
<!-- Claims Tab -->
<section
  role="tabpanel"
  aria-labelledby="claims-tab"
  aria-label="Claims history for warranty WAR-2026-00123"
>
  <table
    role="table"
    aria-label="Warranty claims"
  >
    <thead>
      <tr role="row">
        <th role="columnheader" scope="col">Claim #</th>
        <th role="columnheader" scope="col">Date</th>
        <th role="columnheader" scope="col">Issue</th>
        <th role="columnheader" scope="col">Resolution</th>
        <th role="columnheader" scope="col">Status</th>
      </tr>
    </thead>
  </table>
</section>

<!-- File Claim Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="claim-dialog-title"
>
  <h2 id="claim-dialog-title">File Warranty Claim</h2>

  <label for="issue-description">Issue Description</label>
  <textarea
    id="issue-description"
    aria-required="true"
    aria-describedby="issue-help"
  ></textarea>
  <span id="issue-help" class="sr-only">
    Describe the problem with your product in detail
  </span>

  <!-- Resolution RadioGroup -->
  <fieldset>
    <legend>Preferred Resolution</legend>
    <div role="radiogroup" aria-required="true">
      <label>
        <input type="radio" name="resolution" value="repair" />
        Repair - Fix the existing product
      </label>
      <label>
        <input type="radio" name="resolution" value="replace" />
        Replace - Provide new replacement unit
      </label>
      <label>
        <input type="radio" name="resolution" value="refund" />
        Refund - Full refund of purchase price
      </label>
    </div>
  </fieldset>
</dialog>

<!-- Status Badge -->
<span
  role="status"
  aria-label="Claim status: Approved"
  class="badge badge-approved"
>
  Approved
</span>

<!-- Approval Required Alert -->
<div
  role="alert"
  aria-live="assertive"
>
  This claim requires manager approval. Estimated cost exceeds $500.
</div>
```

### Screen Reader Announcements

- Tab selected: "Claims tab selected. Showing 3 claims for warranty WAR-2026-00123."
- Claim submitted: "Claim CLM-2026-00003 submitted successfully. We will review your claim shortly."
- Claim approved: "Claim CLM-2026-00002 approved. Resolution: Replace. Cost: $750."
- Claim denied: "Claim CLM-2026-00003 denied. Reason: Damage caused by misuse."
- Approval required: "High-value claim. Manager approval required for claims over $500."
- Loading: "Loading claims history."
- Error: "Failed to submit claim. Retry button available."

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

### Resolution Radio Selection

```
SELECT:
- Duration: 150ms (Micro timing)
- Radio button: scale bounce with color fill
- Option container: subtle background highlight
- Previous selection: fade out highlight
```

### Claim Submission

```
SUBMIT BUTTON:
- Duration: 150ms
- Button: scale(1) -> scale(0.95) -> scale(1)
- Transition to spinner

SUCCESS:
- Duration: 300ms
- Spinner -> checkmark morph
- Dialog: hold 500ms, then close
- Toast: slide in from right

TABLE UPDATE:
- Duration: 200ms
- New row: fade in at top, other rows shift down
```

### Status Badge Update

```
STATUS CHANGE:
- Duration: 200ms
- Old badge: fade out with scale(0.9)
- New badge: fade in with scale(1.1) -> scale(1)
- Row background: brief highlight flash
```

### Approval Dialog

```
DECISION SELECTION:
- Duration: 150ms
- Radio: scale bounce
- Action buttons: visibility transition based on selection
- Deny selected: Deny button highlighted
- Approve selected: Approve button highlighted

SUBMIT:
- Duration: 300ms
- Button: loading state
- On success: success indicator, then close
```

---

## Component Props Interface

```typescript
// Claims Tab Component
interface WarrantyClaimsTabProps {
  warrantyId: string;
  warranty: Warranty;
  claims: WarrantyClaim[];
  isLoading: boolean;
  onFileClaimClick: () => void;
  onClaimClick: (claimId: string) => void;
}

interface WarrantyClaim {
  id: string;
  claimNumber: string;
  warrantyId: string;
  issueId: string | null;
  status: ClaimStatus;
  description: string;
  resolutionType: ResolutionType;
  cost: number | null;
  approvedByUserId: string | null;
  approvedByUserName: string | null;
  approvedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'denied' | 'resolved';
type ResolutionType = 'repair' | 'replace' | 'refund';

// File Claim Dialog
interface FileClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty;
  onSubmit: (data: ClaimFormData) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}

interface ClaimFormData {
  description: string;
  resolutionType: ResolutionType;
  photos: File[];
}

// Claim Approval Dialog
interface ClaimApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: WarrantyClaim;
  onApprove: (data: ApprovalData) => Promise<void>;
  onDeny: (data: DenialData) => Promise<void>;
  isProcessing: boolean;
  error: Error | null;
}

interface ApprovalData {
  adjustedCost?: number;
  comments: string;
}

interface DenialData {
  reason: string;
  comments: string;
}

// Claim Detail Component
interface ClaimDetailProps {
  claim: WarrantyClaim;
  warranty: Warranty;
  linkedIssue: Issue | null;
  timeline: ClaimTimelineEvent[];
  onNavigateToIssue: () => void;
}

interface ClaimTimelineEvent {
  id: string;
  type: 'submitted' | 'status_change' | 'comment' | 'resolved';
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

// Status Badge Component
interface ClaimStatusBadgeProps {
  status: ClaimStatus;
  size?: 'sm' | 'md' | 'lg';
}

// Resolution Badge Component
interface ResolutionBadgeProps {
  resolution: ResolutionType;
  size?: 'sm' | 'md' | 'lg';
}

// Hook for Claim Management
interface UseWarrantyClaimsOptions {
  warrantyId: string;
}

interface UseWarrantyClaimsReturn {
  claims: WarrantyClaim[];
  isLoading: boolean;
  error: Error | null;
  fileClaim: (data: ClaimFormData) => Promise<WarrantyClaim>;
  approveClaim: (claimId: string, data: ApprovalData) => Promise<void>;
  denyClaim: (claimId: string, data: DenialData) => Promise<void>;
  resolveClaim: (claimId: string, resolution: ResolutionData) => Promise<void>;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/support/warranties/$warrantyId.tsx` | Integration point (modify) |
| `src/components/domain/support/warranty-claims-tab.tsx` | Claims tab content |
| `src/components/domain/support/warranty-claim-form.tsx` | File claim dialog |
| `src/components/domain/support/claim-approval-dialog.tsx` | Approval dialog |
| `src/components/domain/support/claim-detail-card.tsx` | Expanded claim view |
| `src/components/domain/support/claim-timeline.tsx` | Claim history timeline |
| `src/components/domain/support/claim-status-badge.tsx` | Status badge |
| `src/components/domain/support/resolution-badge.tsx` | Resolution type badge |
| `src/hooks/use-warranty-claims.ts` | Claims management hook |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-006c
