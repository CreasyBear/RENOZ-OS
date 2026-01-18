# Wireframe: DOM-WAR-001c - Warranty Policies: UI

## Story Reference

- **Story ID**: DOM-WAR-001c
- **Name**: Warranty Policies: UI
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: Settings page with DataTable and Form Dialog

## Overview

Warranty Policy management UI in Settings, including policy list (DataTable), create/edit dialog (Form), default policy toggle, and integration with product/category forms.

---

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Use**: Policy list with columns (name, duration, default, actions)
- **Features**: Sorting, filtering, pagination, skeleton loading states

### Dialog/Modal
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Use**: Create/Edit policy form, Delete confirmation
- **Variants**: Modal (desktop), Bottom Sheet (mobile), Side Panel (tablet)

### Form Controls
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form.tsx`
- **Use**: Policy name input, duration number field, terms textarea
- **Validation**: Required fields, min/max constraints

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Use**: Default policy indicator
- **Variant**: Primary with checkmark icon

### Toggle/Switch
- **Pattern**: RE-UI Switch
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-switch.tsx`
- **Use**: Set as default policy toggle
- **State**: On/Off with animation

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Use**: Policy terms preview, empty states
- **Components**: CardHeader, CardContent, CardFooter

### Button
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-button.tsx`
- **Use**: Create, Edit, Delete, Save, Cancel actions
- **Variants**: Primary (save), Secondary (cancel), Destructive (delete)

### Toast
- **Pattern**: RE-UI Toast
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-toast.tsx`
- **Use**: Success/error notifications for policy operations
- **Duration**: 3-5 seconds auto-dismiss

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | warranties | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-WAR-001c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/warranties.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Warranty Terms**: Batteries 10-year / 10,000 cycles, Inverters 5-year, Installation 2-year
- **Common Claims**: Cell degradation, BMS faults, inverter failures, installation defects

---

## Mobile Wireframe (375px)

### Policy List (Full Screen)

```
+=========================================+
| < Settings                         [*]  |
+-----------------------------------------+
|                                         |
|  Warranty Policies                      |
|  Manage warranty terms for products     |
|                                         |
+-----------------------------------------+
|  [+ Create Policy]                      |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | Battery Performance Warranty        ||
|  | Duration: 120 months (10 years)     ||
|  | [DEFAULT]              [E] [D]      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Inverter Manufacturer Warranty      ||
|  | Duration: 60 months (5 years)       ||
|  |                        [E] [D]      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Installation Workmanship Warranty   ||
|  | Duration: 24 months (2 years)       ||
|  |                        [E] [D]      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Cycle Performance Warranty          ||
|  | Duration: 10,000 cycles             ||
|  |                        [E] [D]      ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Create/Edit Policy Dialog (Bottom Sheet)

```
+=========================================+
|                                         |
|  =====================================  |
|         <- drag handle                  |
|                                         |
|  Create Warranty Policy           [X]   |
|  =====================================  |
|                                         |
|  Policy Name *                          |
|  +-------------------------------------+|
|  | Battery Performance Warranty        ||
|  +-------------------------------------+|
|                                         |
|  Duration (Months) *                    |
|  +-------------------------------------+|
|  | 120                                 ||
|  +-------------------------------------+|
|                                         |
|  Terms & Conditions                     |
|  +-------------------------------------+|
|  | Covers battery capacity degradation||
|  | below 80% within 10 years or 10,000||
|  | cycles. Includes cell replacement, ||
|  | BMS faults, and thermal management ||
|  | system defects.                     ||
|  +-------------------------------------+|
|                                         |
|  Set as Default Policy                  |
|  [====*] ON                             |
|                                         |
|  +-------------------------------------+|
|  |           [SAVE POLICY]             ||
|  +-------------------------------------+|
|                                         |
|  (Cancel)                               |
|                                         |
+=========================================+
```

### Product Form with Policy Select

```
+=========================================+
| < Edit Product                          |
+-----------------------------------------+
|                                         |
|  Product Name *                         |
|  +-------------------------------------+|
|  | Kitchen Inverter Set - Oak           ||
|  +-------------------------------------+|
|                                         |
|  Category                               |
|  +--------------------------------- v--+|
|  | Kitchen & Bath                      ||
|  +-------------------------------------+|
|                                         |
|  Warranty Policy                        |
|  +--------------------------------- v--+|
|  | 24-Month Extended                   ||
|  +-------------------------------------+|
|  Inherits: Category default (12-Month)  |
|  <- Shows fallback info                 |
|                                         |
|  ...                                    |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Policy List with Table

```
+=======================================================================+
| < Settings                                                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  Warranty Policies                                        [+ Create]    |
|  Configure warranty terms and conditions for your products              |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Name                    | Duration  | Default | Actions          |  |
|  +--------------------------+-----------+---------+------------------+  |
|  | 12-Month Standard        | 12 mo     | [*]     | [Edit] [Delete]  |  |
|  | 24-Month Extended        | 24 mo     | [ ]     | [Edit] [Delete]  |  |
|  | 6-Month Limited          | 6 mo      | [ ]     | [Edit] [Delete]  |  |
|  | 36-Month Premium         | 36 mo     | [ ]     | [Edit] [Delete]  |  |
|  | Lifetime (Electronics)   | 120 mo    | [ ]     | [Edit] [Delete]  |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  Showing 1-5 of 5 policies                                              |
|                                                                         |
+=======================================================================+
```

### Create/Edit Policy Dialog (Slide-Over Panel)

```
+=======================================================================+
|  Settings > Warranty Policies              +-------------------------+ |
|                                            | Create Warranty Policy  | |
|  +-------------------------------------+   |                         | |
|  | Name             | Dur | Def | Act  |   | Policy Name *           | |
|  +------------------+-----+-----+------+   | +---------------------+ | |
|  | 12-Month Std     | 12  | [*] | [E]  |   | | New Premium Plan    | | |
|  | 24-Month Ext     | 24  | [ ] | [E]  |   | +---------------------+ | |
|  | 6-Month Limited  | 6   | [ ] | [E]  |   |                         | |
|  +-------------------------------------+   | Duration (Months) *     | |
|                                            | +---------------------+ | |
|                                            | | 48                  | | |
|                                            | +---------------------+ | |
|                                            |                         | |
|                                            | Terms & Conditions      | |
|                                            | +---------------------+ | |
|                                            | | Coverage includes:  | | |
|                                            | | - Parts & labor     | | |
|                                            | | - Manufacturing def | | |
|                                            | | - Normal wear excl  | | |
|                                            | +---------------------+ | |
|                                            |                         | |
|                                            | [*====] Set as Default  | |
|                                            |                         | |
|                                            | (Cancel)  [Save Policy] | |
|                                            +-------------------------+ |
|                                                                         |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Policy Management Page

```
+================================================================================================+
| [Logo] Renoz CRM                                                    [Bell] [User v]            |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Settings |  Warranty Policies                                                  [+ Create Policy]|
| -------- |  ==================================================================================  |
| General  |  Define warranty terms and conditions. Assign policies to products or categories.   |
| Users    |                                                                                      |
| Roles    |  +--------------------------------------------------------------------------------+  |
| Tags     |  |                                                                                |  |
| WARRANTY |  |  [Search policies...________________________]   [All Durations v]             |  |
| POLICIES |  |                                                                                |  |
| ...      |  +--------------------------------------------------------------------------------+  |
|          |                                                                                      |
|          |  +--------------------------------------------------------------------------------+  |
|          |  |                                                                                |  |
|          |  |  Name                    Duration    Products    Default    Actions            |  |
|          |  |  -------------------------------------------------------------------------     |  |
|          |  |  12-Month Standard       12 months   45          [*]        [Edit] [Delete]   |  |
|          |  |  24-Month Extended       24 months   23          [ ]        [Edit] [Delete]   |  |
|          |  |  6-Month Limited         6 months    12          [ ]        [Edit] [Delete]   |  |
|          |  |  36-Month Premium        36 months   8           [ ]        [Edit] [Delete]   |  |
|          |  |  Lifetime (Electronics)  120 months  3           [ ]        [Edit] [Delete]   |  |
|          |  |                                                                                |  |
|          |  +--------------------------------------------------------------------------------+  |
|          |                                                                                      |
|          |  Showing 1-5 of 5 policies                           < 1 >                          |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+
```

### Create/Edit Policy Dialog (Modal)

```
+================================================================================================+
|                                                                                                 |
|     +--------------------------------------------------------------------+                      |
|     | Create Warranty Policy                                         [X] |                      |
|     +====================================================================+                      |
|     |                                                                    |                      |
|     |  +-----------------------------+  +------------------------------+ |                      |
|     |  | Policy Name *               |  | Duration (Months) *          | |                      |
|     |  | +-------------------------+ |  | +------------------+ +-----+ | |                      |
|     |  | | 48-Month Premium Plus   | |  | | 48               | | mo  | | |                      |
|     |  | +-------------------------+ |  | +------------------+ +-----+ | |                      |
|     |  +-----------------------------+  +------------------------------+ |                      |
|     |                                                                    |                      |
|     |  Terms & Conditions                                                |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |  | [B] [I] [U] | [List] | [Link]                                | |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |  |                                                              | |                      |
|     |  | This warranty covers:                                        | |                      |
|     |  |                                                              | |                      |
|     |  | * Defects in materials and workmanship                       | |                      |
|     |  | * Manufacturing defects under normal use                     | |                      |
|     |  | * Parts and labor for covered repairs                        | |                      |
|     |  |                                                              | |                      |
|     |  | Exclusions:                                                  | |                      |
|     |  | * Normal wear and tear                                       | |                      |
|     |  | * Damage from misuse or neglect                              | |                      |
|     |  | * Unauthorized modifications                                 | |                      |
|     |  |                                                              | |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |                                                                    |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |  | [*====] Set as organization default policy                   | |                      |
|     |  |                                                              | |                      |
|     |  | This policy will apply to all products without a specific    | |                      |
|     |  | policy assigned.                                             | |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |                                                                    |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |  |                                                              | |                      |
|     |  |                      (Cancel)    [CREATE POLICY]             | |                      |
|     |  |                                                              | |                      |
|     |  +--------------------------------------------------------------+ |                      |
|     |                                                                    |                      |
|     +--------------------------------------------------------------------+                      |
|                                                                                                 |
+================================================================================================+
```

### Warranty Detail Page - Policy Terms Section

```
+================================================================================================+
| < Warranties                                                                                    |
+------------------------------------------------------------------------------------------------+
|                                                                                                 |
|  WARRANTY-2026-00123                                           [Generate Certificate] [Edit]   |
|  Kitchen Inverter Set - Oak                                                                      |
|  Acme Corporation | Serial: KC-2024-78901                                                       |
|                                                                                                 |
+------------------------------------------------------------------------------------------------+
|                                                                                                 |
|  [Overview] [Claims] [Extensions] [Activity]                                                    |
|                                                                                                 |
|  +--- WARRANTY DETAILS ---+  +--- POLICY TERMS (Expandable Card) ---------------------------+  |
|  |                        |  |                                                              |  |
|  | Registration Date:     |  | [-] 24-Month Extended Warranty                      [View] |  |
|  | January 5, 2026        |  |                                                              |  |
|  |                        |  | Duration: 24 months                                         |  |
|  | Expiry Date:           |  |                                                              |  |
|  | January 5, 2028        |  | Coverage Includes:                                          |  |
|  |                        |  | * Defects in materials and workmanship                      |  |
|  | Status:                |  | * Manufacturing defects under normal use                    |  |
|  | [Active] 730 days left |  | * Parts and labor for covered repairs                       |  |
|  |                        |  |                                                              |  |
|  | Policy:                |  | Exclusions:                                                 |  |
|  | 24-Month Extended      |  | * Normal wear and tear                                      |  |
|  |                        |  | * Damage from misuse or neglect                             |  |
|  +------------------------+  | * Unauthorized modifications                                |  |
|                              |                                                              |  |
|                              +--------------------------------------------------------------+  |
|                                                                                                 |
+------------------------------------------------------------------------------------------------+
```

### Product Form - Policy Selection

```
+================================================================================================+
|                                                                                                 |
|  Edit Product: Kitchen Inverter Set - Oak                                                        |
|  ============================================================================================== |
|                                                                                                 |
|  +--- BASIC INFO ---+  +--- PRICING ---+  +--- WARRANTY ---+  +--- INVENTORY ---+              |
|  |                  |  |               |  |                |  |                 |              |
|  | Product Name *   |  | Base Price    |  | Warranty Policy|  | SKU             |              |
|  | [Inverter Set   ] |  | [$1,299.00  ] |  | [24-Month Ext v]|  | [KC-OAK-001   ] |              |
|  |                  |  |               |  |                |  |                 |              |
|  | Category         |  | Cost          |  | +------------+ |  | Current Stock   |              |
|  | [Kitchen & Bath] |  | [$650.00    ] |  | | Options:   | |  | [45           ] |              |
|  |                  |  |               |  | | ---------- | |  |                 |              |
|  +------------------+  +---------------+  | | [DEFAULT]  | |  +-----------------+              |
|                                           | | 12-Mo Std  | |                                   |
|                                           | | 24-Mo Ext  | | <- Currently selected             |
|                                           | | 6-Mo Ltd   | |                                   |
|                                           | | 36-Mo Prm  | |                                   |
|                                           | +------------+ |                                   |
|                                           |                |                                   |
|                                           | Expiry Preview:|                                   |
|                                           | If purchased   |                                   |
|                                           | today, expires |                                   |
|                                           | Jan 10, 2028   |                                   |
|                                           +----------------+                                   |
|                                                                                                 |
+================================================================================================+
```

---

## Interaction States

### Loading States

```
POLICY LIST LOADING:
+-----------------------------------------------------------------------+
|  Warranty Policies                                      [+ Create]     |
+-----------------------------------------------------------------------+
|                                                                        |
|  +------------------------------------------------------------------+ |
|  | [....................................] [.......] [...] [........] | |
|  | [....................................] [.......] [...] [........] | |
|  | [....................................] [.......] [...] [........] | |
|  | [....................................] [.......] [...] [........] | |
|  +------------------------------------------------------------------+ |
|  <- Skeleton rows with shimmer animation                               |
|                                                                        |
+-----------------------------------------------------------------------+

FORM LOADING (while fetching policy data):
+--------------------------------------------+
| Edit Warranty Policy                   [X] |
+--------------------------------------------+
|                                            |
|  Policy Name                               |
|  [................................]        |
|                                            |
|  Duration                                  |
|  [................]                        |
|                                            |
|  Terms & Conditions                        |
|  [................................]        |
|  [................................]        |
|  [................................]        |
|                                            |
+--------------------------------------------+

SAVE IN PROGRESS:
+--------------------------------------------+
| Create Warranty Policy                 [X] |
+--------------------------------------------+
|                                            |
|  ... form fields ...                       |
|                                            |
|  +--------------------------------------+  |
|  |  [spinner]  Saving policy...         |  |
|  +--------------------------------------+  |
|                                            |
|                  (Cancel)  [SAVING...]     |
|                            disabled        |
+--------------------------------------------+
```

### Empty States

```
NO POLICIES CREATED:
+-----------------------------------------------------------------------+
|  Warranty Policies                                      [+ Create]     |
+-----------------------------------------------------------------------+
|                                                                        |
|  +------------------------------------------------------------------+ |
|  |                                                                  | |
|  |                    +------------------+                          | |
|  |                    |   [warranty]     |                          | |
|  |                    |      icon        |                          | |
|  |                    +------------------+                          | |
|  |                                                                  | |
|  |                No warranty policies defined                      | |
|  |                                                                  | |
|  |     Create warranty policies to define coverage terms for       | |
|  |     your products. Policies can be assigned to products or      | |
|  |     categories, with organization defaults as fallback.         | |
|  |                                                                  | |
|  |                  [+ Create Your First Policy]                    | |
|  |                                                                  | |
|  +------------------------------------------------------------------+ |
|                                                                        |
+-----------------------------------------------------------------------+

NO SEARCH RESULTS:
+-----------------------------------------------------------------------+
|  [Search: "lifetime"_____________]                                     |
|                                                                        |
|  No policies matching "lifetime"                                       |
|                                                                        |
|  [Clear Search]                                                        |
+-----------------------------------------------------------------------+
```

### Error States

```
FAILED TO LOAD POLICIES:
+-----------------------------------------------------------------------+
|  Warranty Policies                                                     |
+-----------------------------------------------------------------------+
|                                                                        |
|  +------------------------------------------------------------------+ |
|  |                                                                  | |
|  |  [!] Unable to load warranty policies                            | |
|  |                                                                  | |
|  |  There was a problem loading your policies. Please try again.    | |
|  |                                                                  | |
|  |                        [Retry]                                   | |
|  |                                                                  | |
|  +------------------------------------------------------------------+ |
|                                                                        |
+-----------------------------------------------------------------------+

FORM VALIDATION ERROR:
+--------------------------------------------+
| Create Warranty Policy                 [X] |
+--------------------------------------------+
|                                            |
|  Policy Name *                             |
|  +--------------------------------------+  |
|  |                                      |  |
|  +--------------------------------------+  |
|  [!] Policy name is required               |
|                                            |
|  Duration (Months) *                       |
|  +--------------------------------------+  |
|  | 0                                    |  |
|  +--------------------------------------+  |
|  [!] Duration must be at least 1 month     |
|                                            |
+--------------------------------------------+

DELETE CONFIRMATION (with constraint):
+--------------------------------------------+
| Cannot Delete Policy                   [X] |
+--------------------------------------------+
|                                            |
|  [!] "24-Month Extended" cannot be         |
|      deleted because it is assigned        |
|      to 23 products.                       |
|                                            |
|  Options:                                  |
|  1. Reassign products to another policy    |
|  2. Archive this policy instead            |
|                                            |
|                            [OK]            |
+--------------------------------------------+
```

### Success States

```
POLICY CREATED:
+-----------------------------------------------------------------------+
|  [check] Policy "24-Month Extended" created successfully               |
|                                           <- Toast notification (3s)   |
+-----------------------------------------------------------------------+

POLICY UPDATED:
+-----------------------------------------------------------------------+
|  [check] Policy updated and applied to 23 products                     |
+-----------------------------------------------------------------------+

DEFAULT POLICY CHANGED:
+-----------------------------------------------------------------------+
|  [check] "12-Month Standard" is now the default warranty policy        |
+-----------------------------------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Policy List Page**
   - Tab: Search input -> Create button -> First table row
   - Tab through rows: Edit button -> Delete button -> Next row
   - Enter on row: Opens edit dialog
   - Delete/Backspace on row: Opens delete confirmation

2. **Create/Edit Dialog**
   - Focus trapped within dialog
   - Tab: Policy name -> Duration -> Terms editor -> Default toggle -> Cancel -> Save
   - Escape: Close dialog (with unsaved changes confirmation if dirty)
   - Return focus to trigger element on close

3. **Product Form Policy Select**
   - Arrow Up/Down: Navigate options
   - Enter: Select option
   - Escape: Close dropdown

### ARIA Requirements

```html
<!-- Policy Table -->
<table
  role="table"
  aria-label="Warranty policies"
>
  <thead>
    <tr role="row">
      <th role="columnheader" scope="col">Name</th>
      <th role="columnheader" scope="col">Duration</th>
      <th role="columnheader" scope="col">Default</th>
      <th role="columnheader" scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" tabindex="0" aria-label="12-Month Standard, 12 months, default policy">
      ...
    </tr>
  </tbody>
</table>

<!-- Create/Edit Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="policy-dialog-title"
>
  <h2 id="policy-dialog-title">Create Warranty Policy</h2>
</dialog>

<!-- Default Toggle -->
<button
  role="switch"
  aria-checked="true"
  aria-label="Set as default policy"
>
  <span class="sr-only">Default policy: On</span>
</button>

<!-- Policy Select in Product Form -->
<select
  aria-label="Select warranty policy"
  aria-describedby="policy-fallback-hint"
>
  <option>24-Month Extended</option>
</select>
<span id="policy-fallback-hint">
  Inherits: Category default (12-Month Standard)
</span>
```

### Screen Reader Announcements

- Policy created: "Warranty policy 24-Month Extended created successfully"
- Policy updated: "Policy updated and applied to 23 products"
- Default changed: "12-Month Standard is now the default warranty policy"
- Delete blocked: "Cannot delete policy. It is assigned to 23 products."
- Loading: "Loading warranty policies"
- Form error: "Form has 2 errors. Policy name is required. Duration must be at least 1 month."

---

## Animation Choreography

### Dialog Open/Close

```
OPEN:
- Duration: 250ms (Complex timing)
- Easing: cubic-bezier(0.16, 1, 0.3, 1)
- Overlay: opacity 0 -> 0.5
- Dialog:
  - Mobile: translateY(100%) -> translateY(0)
  - Tablet: translateX(100%) -> translateX(0)
  - Desktop: scale(0.95) opacity(0) -> scale(1) opacity(1)

CLOSE:
- Duration: 200ms
- Easing: ease-in
- Reverse of open animation
```

### Default Toggle Change

```
TOGGLE ANIMATION:
- Duration: 150ms (Micro timing)
- Switch thumb: translateX with bounce
- Previous default row: flash highlight then fade
- New default row: pulse highlight (green)
- Badge: fade out on old, fade in on new
```

### Table Row Operations

```
CREATE (new row):
- Duration: 200ms
- Row height: 0 -> full height
- Content: opacity 0 -> 1, translateY(-8px) -> 0
- Other rows: shift down smoothly

DELETE (row removal):
- Duration: 150ms
- Row: opacity 1 -> 0, translateX(0) -> translateX(-20px)
- Row height: full -> 0
- Other rows: shift up smoothly

UPDATE (row content):
- Duration: 100ms
- Changed cells: brief yellow highlight -> fade to normal
```

### Loading States

```
SKELETON SHIMMER:
- Duration: 1.5s
- Easing: linear
- Animation: gradient sweep left to right
- Loop: infinite

SAVE SPINNER:
- Duration: 1s
- Animation: rotation 360deg
- Loop: infinite until complete
```

---

## Component Props Interface

```typescript
// Policy List Component
interface WarrantyPolicyListProps {
  policies: WarrantyPolicy[];
  isLoading: boolean;
  error: Error | null;
  onCreateClick: () => void;
  onEditClick: (policyId: string) => void;
  onDeleteClick: (policyId: string) => void;
  onSetDefault: (policyId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface WarrantyPolicy {
  id: string;
  organizationId: string;
  name: string;
  durationMonths: number;
  terms: PolicyTerms;
  isDefault: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PolicyTerms {
  coverage: string[];
  exclusions: string[];
  rawHtml?: string;
}

// Policy Form Dialog Component
interface WarrantyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  policy?: WarrantyPolicy;
  onSubmit: (data: PolicyFormData) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}

interface PolicyFormData {
  name: string;
  durationMonths: number;
  terms: string;
  isDefault: boolean;
}

// Policy Select Component (for Product/Category forms)
interface WarrantyPolicySelectProps {
  value: string | null;
  onChange: (policyId: string | null) => void;
  policies: WarrantyPolicy[];
  fallbackPolicy?: {
    source: 'category' | 'organization';
    policy: WarrantyPolicy;
  };
  disabled?: boolean;
  error?: string;
}

// Policy Terms Display Component
interface PolicyTermsCardProps {
  policy: WarrantyPolicy;
  expandedByDefault?: boolean;
  showFullTerms?: boolean;
}

// Delete Confirmation Dialog
interface DeletePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: WarrantyPolicy;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  canDelete: boolean;
  blockReason?: string;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/settings/warranty-policies.tsx` | Settings page route |
| `src/components/domain/settings/warranty-policy-manager.tsx` | Main policy management component |
| `src/components/domain/settings/warranty-policy-dialog.tsx` | Create/Edit policy dialog |
| `src/components/domain/settings/warranty-policy-table.tsx` | Policy list DataTable |
| `src/components/domain/settings/warranty-policy-select.tsx` | Policy dropdown for forms |
| `src/components/domain/support/policy-terms-card.tsx` | Expandable terms display |
| `src/components/domain/products/product-form.tsx` | Integration point (modify) |
| `src/routes/support/warranties/$warrantyId.tsx` | Integration point (modify) |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-001c
