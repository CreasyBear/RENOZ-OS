# Jobs Domain Wireframe: Job Templates (DOM-JOBS-007c)

**Story ID:** DOM-JOBS-007c
**Component Type:** DataTable with multi-step Form
**Aesthetic:** Rugged Utilitarian - optimized for office management
**Primary Device:** Desktop (office managers/admins)
**Secondary:** Tablet (office use)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### DataTable for Template List
- **Pattern**: RE-UI DataGrid
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Features**:
  - Template management table with column sorting (name, tasks, materials, status)
  - Row actions for edit, copy, preview, activate/deactivate
  - Search and filter by active/inactive status

### Stepper Form
- **Pattern**: RE-UI Stepper
- **Reference**: `_reference/.reui-reference/registry/default/ui/stepper.tsx`
- **Features**:
  - Multi-step template creation wizard (5 steps: info, tasks, materials, checklist, review)
  - Progress indicator with step labels
  - Previous/Next navigation with form validation

### Sortable Task Editor
- **Pattern**: RE-UI Sortable
- **Reference**: `_reference/.reui-reference/registry/default/ui/sortable.tsx`
- **Features**:
  - Drag-to-reorder template tasks with visual handles [=]
  - Inline add/remove task actions
  - Task description editing with expand/collapse

### Sheet Preview Panel
- **Pattern**: RE-UI Sheet
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Slide-in preview of template contents before applying
  - Full task, material, and checklist breakdown
  - "Use This Template" action button

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `jobTemplates`, `jobTemplateTasks`, `jobTemplateMaterials` tables in `renoz-v2/lib/schema/job-templates.ts` | NOT CREATED |
| **Server Functions Required** | `getJobTemplates`, `createJobTemplate`, `updateJobTemplate`, `applyTemplateToJob` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-007a (Schema), DOM-JOBS-007b (Server Functions) | PENDING |

### Existing Schema Available
- `products` in `renoz-v2/lib/schema/products.ts` - for material picker
- `checklists` (once created) - for linking checklist templates to job templates

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **Use Case**: Admin/office staff creating reusable job templates for common installation types
- **Job Types**: Battery installation, Inverter install, Full system commissioning, Warranty service
- **Key Features**: Multi-step template builder, pre-defined tasks/materials/checklists
- **Efficiency**: Templates reduce job setup time for repeat installation types (e.g., standard 10kWh residential install, commercial 50kW system)

---

## Design Principles

- **Desktop-first:** Template creation is an admin task
- **Multi-step form:** Complex templates built step-by-step
- **Preview:** See template contents before applying
- **Reusability:** Templates save time on repeated job types
- **Completeness:** Include tasks, materials, checklists

---

## Desktop Wireframe (1280px+ - Template Management)

### Template List Page

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Job Templates                                        [+ Create Template]   |
| Customers   |  =================================================================================     |
| Orders      |                                                                                        |
| Products    |  Create templates to quickly set up common job types with pre-defined                  |
| Jobs        |  tasks, materials, and checklists.                                                     |
| Settings <  |                                                                                        |
|  > General  |  +-- SEARCH & FILTER ---------------------------------------------------------------+ |
|  > Users    |  |                                                                                  | |
|  > Templates|  |  [search] Search templates...               [All] [Active] [Inactive]           | |
|  > Job Tmpl<|  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- TEMPLATES LIST ----------------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  +-- Name ---------------+-- Tasks --+-- Materials --+-- Check --+-- Est --+-- Status --+-- Actions ------+|
|             |  |  | Residential 10kWh      |    8      |      12       |    12     |  8h    |  Active    | [Edit] [Copy]    ||
|             |  |  | Standard battery inst  |           |               |           |        |            | [Preview]        ||
|             |  |  +---------------------------------------------------------------------------------------------+----------+|
|             |  |  | Commercial 50kW BESS   |    10     |      18       |    15     | 16h    |  Active    | [Edit] [Copy]    ||
|             |  |  | Large commercial system|           |               |           |        |            | [Preview]        ||
|             |  |  +---------------------------------------------------------------------------------------------+----------+|
|             |  |  | Inverter Replacement   |    5      |       6       |     8     |  4h    |  Active    | [Edit] [Copy]    ||
|             |  |  | Standard inverter swap |           |               |           |        |            | [Preview]        ||
|             |  |  +---------------------------------------------------------------------------------------------+----------+|
|             |  |  | Full System Commission |    8      |      15       |    10     | 12h    |  Active    | [Edit] [Copy]    ||
|             |  |  | Complete commissioning |           |               |           |        |            | [Preview]        ||
|             |  |  +---------------------------------------------------------------------------------------------+----------+|
|             |  |  | Warranty Service       |    4      |       2       |     6     |  2h    |  Active    | [Edit] [Copy]    ||
|             |  |  | Battery warranty check |           |               |           |        |            | [Preview]        ||
|             |  |  +---------------------------------------------------------------------------------------------+----------+|
|             |  |  | Custom Project         |    0      |       0       |     0     |   -    | Inactive   | [Edit] [Copy]    ||
|             |  |  | Blank template         |           |               |           |        |            | [Activate]       ||
|             |  |  +---------------------------------------------------------------------------------------------+----------+|
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Template Preview Panel (Click Preview)

```
+-- TEMPLATE PREVIEW PANEL (Slide-in Right) ----------------+
|                                                           |
|  Residential 10kWh Battery Install                [X]     |
|  =====================================================    |
|                                                           |
|  Description:                                             |
|  Standard residential battery installation including      |
|  10kWh LFP battery units, hybrid inverter, and BMS.       |
|                                                           |
|  Estimated Duration: 8 hours                              |
|  Status: Active                                           |
|                                                           |
|  +-- TASKS (8) ----------------------------------------+  |
|  |                                                     |  |
|  | 1. Site assessment                                  |  |
|  | 2. Electrical prep                                  |  |
|  | 3. Battery mounting                                 |  |
|  | 4. Inverter install                                 |  |
|  | 5. BMS configuration                                |  |
|  | 6. Grid connection                                  |  |
|  | 7. Commissioning                                    |  |
|  | 8. Customer handover                                |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-- MATERIALS (12) -----------------------------------+  |
|  |                                                     |  |
|  | - Battery Unit 10kWh LFP (qty: 2)                   |  |
|  | - Hybrid Inverter 5kW (qty: 1)                      |  |
|  | - DC Cable 50mm (qty: 20m)                          |  |
|  | - Circuit Breaker 100A (qty: 2)                     |  |
|  | - Mounting brackets (qty: 4)                        |  |
|  | - Cable glands (qty: 8)                             |  |
|  | - Cable ties (qty: 50)                              |  |
|  | ... and 5 more                                      |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-- CHECKLIST (12 items) -----------------------------+  |
|  |                                                     |  |
|  | Using: Battery Installation Checklist               |  |
|  | Includes:                                           |  |
|  | - Pre-installation safety (3)                       |  |
|  | - Installation verification (5)                     |  |
|  | - Commissioning checks (4)                          |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-----------------------------------------------------+  |
|  |                                                     |  |
|  |               [USE THIS TEMPLATE]                   |  | <- Opens in assign job
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  [Edit Template]                           [Duplicate]    |
|                                                           |
+-----------------------------------------------------------+
```

### Create/Edit Template (Multi-Step Form)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Settings <  |  < Back to Templates                                                                   |
|  > Job Tmpl<|                                                                                        |
|             |  Create Job Template                                            [Save Draft] [Publish]  |
|             |  =================================================================================     |
|             |                                                                                        |
|             |  +-- PROGRESS STEPS ----------------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  [1. Basic Info]  >  [2. Tasks]  >  [3. Materials]  >  [4. Checklist]  >  [5. Review]|
|             |  |  ============                                                                    | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- STEP 1: BASIC INFORMATION -----------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  Template Name *                                                                 | |
|             |  |  +-----------------------------------------------------------------------------+ | |
|             |  |  | Kitchen Installation                                                       | | |
|             |  |  +-----------------------------------------------------------------------------+ | |
|             |  |                                                                                  | |
|             |  |  Description                                                                     | |
|             |  |  +-----------------------------------------------------------------------------+ | |
|             |  |  | Full inverter installation including base and upper inverters,              | | |
|             |  |  | countertop, and all hardware.                                             | | |
|             |  |  +-----------------------------------------------------------------------------+ | |
|             |  |                                                                                  | |
|             |  |  Estimated Duration                                                              | |
|             |  |  +-------------------+                                                           | |
|             |  |  | 8 hours       [v] |                                                           | |
|             |  |  +-------------------+                                                           | |
|             |  |                                                                                  | |
|             |  |  Category                                                                        | |
|             |  |  +-------------------+                                                           | |
|             |  |  | Installation  [v] |                                                           | |
|             |  |  +-------------------+                                                           | |
|             |  |                                                                                  | |
|             |  |  Status                                                                          | |
|             |  |  ( ) Active - Available for use                                                  | |
|             |  |  ( ) Inactive - Hidden from selection                                            | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +---------------------------------------------------------------------------------+ |
|             |  |                                              [Previous]            [Next Step]  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Step 2: Tasks

```
+======================================================================================================+
|             |                                                                                        |
|             |  +-- PROGRESS STEPS ----------------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  [1. Basic Info]  >  [2. Tasks]  >  [3. Materials]  >  [4. Checklist]  >  [5. Review]|
|             |  |                      ==========                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- STEP 2: DEFAULT TASKS ---------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  Define the tasks that will be created when this template is applied.           | |
|             |  |  Tasks can be reordered by dragging.                                            | |
|             |  |                                                                                  | |
|             |  |  +-- Task List ---------------------------------------------------------------+  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 1. Verify measurements                                      [X]       |  | |
|             |  |  |         Confirm all inverter dimensions match layout plan                  |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 2. Protect flooring                                         [X]       |  | |
|             |  |  |         Lay protective covering on work area floors                       |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 3. Install base inverters                                    [X]       |  | |
|             |  |  |         Level and secure all base inverter units                           |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 4. Install upper inverters                                   [X]       |  | |
|             |  |  |         Mount and level all upper inverter units                           |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 5. Install countertop                                       [X]       |  | |
|             |  |  |         Set and secure countertop material                                |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 6. Install hardware                                         [X]       |  | |
|             |  |  |         Attach all handles, pulls, and hinges                             |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  [=] 7. Final cleanup                                            [X]       |  | |
|             |  |  |         Remove all packaging and clean work area                          |  | |
|             |  |  |                                                                            |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  |  +-- Add Task Inline ---------------------------------------------------------+  | |
|             |  |  | [+ Add task title...                                           ] [Add]   |  | |
|             |  |  +--------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +---------------------------------------------------------------------------------+ |
|             |  |                                              [Previous]            [Next Step]  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Step 3: Materials

```
+======================================================================================================+
|             |                                                                                        |
|             |  +-- PROGRESS STEPS ----------------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  [1. Basic Info]  >  [2. Tasks]  >  [3. Materials]  >  [4. Checklist]  >  [5. Review]|
|             |  |                                      =============                               | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- STEP 3: DEFAULT MATERIALS -----------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  Define materials commonly used for this job type.                              | |
|             |  |  Quantities can be adjusted when applying template.                             | |
|             |  |                                                                                  | |
|             |  |  [search] Search products to add...                                             | |
|             |  |                                                                                  | |
|             |  |  +-- Material List -----------------------------------------------------------+  | |
|             |  |  |                                                                            |  | |
|             |  |  |  +-- Product ------------------+-- SKU --------+-- Default Qty --+-- Del -+  | |
|             |  |  |  | Base Inverter Unit 24"       | CAB-BASE-24   |  [4] units      |  [X]   |  | |
|             |  |  |  |                             |               |  (adjustable)   |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |  | Upper Inverter Unit 36"      | CAB-UPPER-36  |  [3] units      |  [X]   |  | |
|             |  |  |  |                             |               |  (adjustable)   |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |  | Countertop Granite 8ft      | CT-GRANITE-8  |  [1] unit       |  [X]   |  | |
|             |  |  |  |                             |               |  (adjustable)   |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |  | Inverter Hardware Set        | HW-CAB-SET    |  [7] sets       |  [X]   |  | |
|             |  |  |  |                             |               |  (adjustable)   |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |  | Mounting Screws Box         | HW-SCREWS-100 |  [1] box        |  [X]   |  | |
|             |  |  |  |                             |               |  (fixed)        |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |  | Wood Shims Pack             | MISC-SHIMS    |  [2] packs      |  [X]   |  | |
|             |  |  |  |                             |               |  (fixed)        |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |  | Silicone Caulk Tube         | MISC-CAULK    |  [2] tubes      |  [X]   |  | |
|             |  |  |  |                             |               |  (fixed)        |        |  | |
|             |  |  |  +----------------------------------------------------------------------- +  | |
|             |  |  |                                                                            |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +---------------------------------------------------------------------------------+ |
|             |  |                                              [Previous]            [Next Step]  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Step 4: Checklist

```
+======================================================================================================+
|             |                                                                                        |
|             |  +-- PROGRESS STEPS ----------------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  [1. Basic Info]  >  [2. Tasks]  >  [3. Materials]  >  [4. Checklist]  >  [5. Review]|
|             |  |                                                       =============              | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- STEP 4: CHECKLIST TEMPLATE ----------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  Select a checklist template to automatically apply to jobs                     | |
|             |  |  using this job template.                                                       | |
|             |  |                                                                                  | |
|             |  |  +-- Available Checklists ----------------------------------------------------+  | |
|             |  |  |                                                                            |  | |
|             |  |  |  (*) Kitchen Installation Checklist (12 items)                            |  | |
|             |  |  |      Pre-installation (3) + Installation (5) + Final checks (4)          |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  ( ) Bathroom Renovation Checklist (8 items)                              |  | |
|             |  |  |      Pre-installation (2) + Installation (4) + Final checks (2)          |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  ( ) Battery Installation Checklist (6 items)                              |  | |
|             |  |  |      Pre-installation (2) + Installation (2) + Final checks (2)          |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  ( ) General Inspection Checklist (10 items)                              |  | |
|             |  |  |      Standard quality control checklist                                   |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  ( ) No checklist                                                         |  | |
|             |  |  |      Jobs will not have a checklist applied automatically                |  | |
|             |  |  |                                                                            |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  |  +-- Preview Selected Checklist ----------------------------------------------+  | |
|             |  |  |                                                                            |  | |
|             |  |  |  Kitchen Installation Checklist                                           |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  PRE-INSTALLATION:                                                        |  | |
|             |  |  |  [ ] Verify measurements                                                  |  | |
|             |  |  |  [ ] Confirm electrical locations                                         |  | |
|             |  |  |  [ ] Protect flooring                                                     |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  INSTALLATION:                                                            |  | |
|             |  |  |  [ ] Base inverters level                                                  |  | |
|             |  |  |  [ ] Base inverters secured                                                |  | |
|             |  |  |  [ ] Upper inverters level                                                 |  | |
|             |  |  |  [ ] Upper inverters secured                                               |  | |
|             |  |  |  [ ] Doors aligned                                                        |  | |
|             |  |  |                                                                            |  | |
|             |  |  |  FINAL CHECKS:                                                            |  | |
|             |  |  |  [ ] Hardware installed                                                   |  | |
|             |  |  |  [ ] Cleanup complete                                                     |  | |
|             |  |  |  [ ] Customer walkthrough                                                 |  | |
|             |  |  |  [ ] Customer signature                                                   |  | |
|             |  |  |                                                                            |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +---------------------------------------------------------------------------------+ |
|             |  |                                              [Previous]            [Next Step]  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Step 5: Review & Publish

```
+======================================================================================================+
|             |                                                                                        |
|             |  +-- PROGRESS STEPS ----------------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  [1. Basic Info]  >  [2. Tasks]  >  [3. Materials]  >  [4. Checklist]  >  [5. Review]|
|             |  |                                                                                ===========|
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- STEP 5: REVIEW & PUBLISH ------------------------------------------------------+ |
|             |  |                                                                                  | |
|             |  |  Review your template before publishing.                                        | |
|             |  |                                                                                  | |
|             |  |  +-- SUMMARY -----------------------------------------------------------------+  | |
|             |  |  |                                                                            |  | |
|             |  |  |  Name: Kitchen Installation                                               |  | |
|             |  |  |  Description: Full inverter installation including base and upper...       |  | |
|             |  |  |  Estimated Duration: 8 hours                                              |  | |
|             |  |  |  Category: Installation                                                  |  | |
|             |  |  |  Status: Active                                                           |  | |
|             |  |  |                                                                            |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  |  +-------+-------+-------+                                                       | |
|             |  |  | Tasks | Mater | Check |                                                       | |
|             |  |  |   7   |  12   |  12   |                                                       | |
|             |  |  +-------+-------+-------+                                                       | |
|             |  |                                                                                  | |
|             |  |  +-- TASKS (7) ---------------------------------------------------------------+  | |
|             |  |  | 1. Verify measurements                                                    |  | |
|             |  |  | 2. Protect flooring                                                       |  | |
|             |  |  | 3. Install base inverters                                                  |  | |
|             |  |  | 4. Install upper inverters                                                 |  | |
|             |  |  | 5. Install countertop                                                     |  | |
|             |  |  | 6. Install hardware                                                       |  | |
|             |  |  | 7. Final cleanup                                                          |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  |  +-- MATERIALS (12) ----------------------------------------------------------+  | |
|             |  |  | Base Inverter 24" x4, Upper Inverter 36" x3, Countertop x1, ...            |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  |  +-- CHECKLIST ---------------------------------------------------------------+  | |
|             |  |  | Kitchen Installation Checklist (12 items)                                 |  | |
|             |  |  +----------------------------------------------------------------------------+  | |
|             |  |                                                                                  | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +---------------------------------------------------------------------------------+ |
|             |  |                                 [Previous]    [Save Draft]    [Publish Template] | |
|             |  +---------------------------------------------------------------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Tablet Wireframe (768px)

### Template List

```
+=======================================================================+
| < Settings                                         [+ Create Template] |
+-----------------------------------------------------------------------+
| Job Templates                                                          |
| ==================================================================     |
+-----------------------------------------------------------------------+
|                                                                        |
|  [search] Search templates...           [All] [Active] [Inactive]      |
|                                                                        |
|  +-- Template Card Layout -----------------------------------------------+
|  |                                                                      |
|  |  +------------------------------+  +------------------------------+  |
|  |  | Kitchen Installation         |  | Bathroom Renovation          |  |
|  |  | Full inverter install         |  | Standard bathroom reno       |  |
|  |  |                              |  |                              |  |
|  |  | Tasks: 7 | Materials: 12     |  | Tasks: 5 | Materials: 8      |  |
|  |  | Checklist: 12 items          |  | Checklist: 8 items           |  |
|  |  | Est: 8h                      |  | Est: 6h                      |  |
|  |  |                              |  |                              |  |
|  |  | [Active]    [Edit] [Preview] |  | [Active]    [Edit] [Preview] |  |
|  |  +------------------------------+  +------------------------------+  |
|  |                                                                      |
|  |  +------------------------------+  +------------------------------+  |
|  |  | Battery Installation          |  | HVAC System Install          |  |
|  |  | Single/double battery         |  | Full HVAC replacement        |  |
|  |  |                              |  |                              |  |
|  |  | Tasks: 4 | Materials: 6      |  | Tasks: 8 | Materials: 15     |  |
|  |  | Checklist: 6 items           |  | Checklist: 10 items          |  |
|  |  | Est: 3h                      |  | Est: 12h                     |  |
|  |  |                              |  |                              |  |
|  |  | [Active]    [Edit] [Preview] |  | [Active]    [Edit] [Preview] |  |
|  |  +------------------------------+  +------------------------------+  |
|  |                                                                      |
|  +----------------------------------------------------------------------+
|                                                                        |
+=======================================================================+
```

---

## Template Selection in Assign Job Dialog

### Select Template (from Order/Opportunity)

```
+-- ASSIGN JOB DIALOG (with Template) ----------------------+
|                                                           |
|  Assign Job                                       [X]     |
|  =====================================================    |
|                                                           |
|  Customer: Acme Corporation                               |
|  Order: #ORD-1234 - Kitchen Inverters                      |
|                                                           |
|  +-- Select Template (Optional) -----------------------+  |
|  |                                                     |  |
|  |  [search] Search templates...                       |  |
|  |                                                     |  |
|  |  +-----------------------------------------------+  |  |
|  |  | (*) Kitchen Installation                      |  |  |
|  |  |     7 tasks | 12 materials | 8h estimated     |  |  |
|  |  |     [Preview]                                 |  |  |
|  |  +-----------------------------------------------+  |  |
|  |                                                     |  |
|  |  +-----------------------------------------------+  |  |
|  |  | ( ) Bathroom Renovation                       |  |  |
|  |  |     5 tasks | 8 materials | 6h estimated      |  |  |
|  |  +-----------------------------------------------+  |  |
|  |                                                     |  |
|  |  +-----------------------------------------------+  |  |
|  |  | ( ) No template (blank job)                   |  |  |
|  |  |     Create job without pre-defined items      |  |  |
|  |  +-----------------------------------------------+  |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  Job Details                                              |
|  ---------------------------------------------------------|
|                                                           |
|  Scheduled Date                                           |
|  +-----------------------------------------------------+  |
|  | [cal] Friday, January 10, 2026                  [v] |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  Assigned Technicians                                     |
|  +-----------------------------------------------------+  |
|  | [X] Mike Johnson                                    |  |
|  | [X] Sarah Williams                                  |  |
|  | [ ] Bob Smith                                       |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-----------------------------------------------------+  |
|  |                                                     |  |
|  |             [CREATE JOB]                            |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
+-----------------------------------------------------------+
```

### Template Preview in Dialog

```
+-- TEMPLATE PREVIEW (Inline Expand) -----------------------+
|                                                           |
|  +-- Select Template (Optional) -----------------------+  |
|  |                                                     |  |
|  |  +-----------------------------------------------+  |  |
|  |  | (*) Kitchen Installation                  [^] |  |  | <- Collapse arrow
|  |  |     7 tasks | 12 materials | 8h estimated     |  |  |
|  |  |                                               |  |  |
|  |  |  +-- Preview Content -----------------------+ |  |  |
|  |  |  |                                          | |  |  |
|  |  |  |  TASKS:                                  | |  |  |
|  |  |  |  1. Verify measurements                  | |  |  |
|  |  |  |  2. Protect flooring                     | |  |  |
|  |  |  |  3. Install base inverters                | |  |  |
|  |  |  |  4. Install upper inverters               | |  |  |
|  |  |  |  5. Install countertop                   | |  |  |
|  |  |  |  6. Install hardware                     | |  |  |
|  |  |  |  7. Final cleanup                        | |  |  |
|  |  |  |                                          | |  |  |
|  |  |  |  MATERIALS: 12 items                     | |  |  |
|  |  |  |  (quantities adjustable per job)         | |  |  |
|  |  |  |                                          | |  |  |
|  |  |  |  CHECKLIST: 12 items                     | |  |  |
|  |  |  |  (Kitchen Installation Checklist)        | |  |  |
|  |  |  |                                          | |  |  |
|  |  |  +------------------------------------------+ |  |  |
|  |  +-----------------------------------------------+  |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
+-----------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Template row | role="row" | Tab, Enter | Full row |
| Edit button | aria-label="Edit template" | Enter | 44px |
| Preview button | aria-label="Preview template" | Enter | 44px |
| Step indicator | role="tablist" | Arrow keys | - |
| Step content | role="tabpanel" | - | - |
| Task drag handle | aria-label="Reorder task" | Alt+Arrow | 44px |
| Radio option | role="radio" | Space | 44px |
| Form inputs | Standard form | Tab | 44px min |

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Template list | TemplateList | DataTable |
| Template card | TemplateCard | Card |
| Template preview | TemplatePreviewPanel | Sheet |
| Multi-step form | TemplateForm | Form, Tabs |
| Step indicator | FormSteps | - |
| Task list editor | TaskListEditor | - |
| Material picker | MaterialPicker | Combobox |
| Checklist selector | ChecklistSelector | RadioGroup |
| Template selector | TemplateSelector | RadioGroup |
| Assign job dialog | AssignJobDialog | Dialog |

---

## Files to Create/Modify

- src/routes/_authed/settings/job-templates.tsx (create)
- src/components/domain/jobs/job-template-form.tsx (create)
- src/components/domain/jobs/template-preview-panel.tsx (create)
- src/components/domain/jobs/template-task-editor.tsx (create)
- src/components/domain/jobs/template-material-picker.tsx (create)
- src/components/domain/jobs/template-selector.tsx (create)
- src/components/domain/orders/assign-job-dialog.tsx (modify: add template selector)
