# Jobs Domain Wireframe: Punchlist/Checklist (DOM-JOBS-004c)

**Story ID:** DOM-JOBS-004c
**Component Type:** Checklist with photo attachments
**Aesthetic:** Rugged Utilitarian - designed for harsh field conditions
**Primary Device:** Mobile (field technicians)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Checkbox with State
- **Pattern**: RE-UI Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Large touch targets (44px min) for glove-friendly operation
  - Visual states for pending, in-progress, checked, and blocked items
  - Haptic feedback on state changes

### Swipeable Cards
- **Pattern**: Custom Swipeable Card with RE-UI Card base
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Swipe-left reveals PHOTO and COMPLETE actions (48px)
  - Swipe-right reveals UNDO action for completed items
  - Color-coded border-left for status (green=complete, blue=in-progress, red=blocked)

### Form Components
- **Pattern**: RE-UI Form + Input + Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`, `input.tsx`, `textarea.tsx`
- **Features**:
  - Photo capture integration with camera preview
  - Signature pad for customer sign-off
  - Notes field for checklist item annotations

### Sheet/Dialog with Camera
- **Pattern**: RE-UI Sheet (mobile bottom sheet)
- **Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`
- **Features**:
  - Full-screen camera viewfinder for photo capture
  - Preview/retake workflow before saving
  - Drag handle for dismissible sheet on mobile

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `checklists`, `checklistItems` tables in `renoz-v2/lib/schema/checklists.ts` | NOT CREATED |
| **Server Functions Required** | `getChecklists`, `getChecklistItems`, `createChecklist`, `updateChecklistItem`, `completeChecklistItem` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-JOBS-004a (Schema), DOM-JOBS-004b (Server Functions) | PENDING |

### Existing Schema Available
- `jobAssignments` in `renoz-v2/lib/schema/job-assignments.ts`
- `jobPhotos` in `renoz-v2/lib/schema/job-assignments.ts`
- `users` in `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer providing installation services
- **Use Case**: Field technicians completing installation checklists on job sites
- **Checklists**: Pre-installation safety, Electrical isolation, Battery mounting torque specs, BMS firmware version
- **Key Features**: Photo attachments for quality assurance, customer signature capture for job sign-off
- **Offline Support**: Checklists must work offline and sync when connection restored

---

## Design Principles for Field Use

- **Touch targets:** Minimum 44px (prefer 48px for primary actions)
- **High contrast:** Dark text on light backgrounds, clear check states
- **One-handed operation:** Swipe to complete items
- **Glove-friendly:** Large checkboxes, forgiving hit areas
- **Outdoor visibility:** Bold typography, high contrast icons
- **Quick photo capture:** Camera integration for documentation
- **Signature capture:** Touch-friendly signature pad

---

## Mobile Wireframe (Primary - 375px)

### Checklist View (With Items)

```
+=========================================+
| < Job #JOB-1234                    [*]  | <- Sync indicator
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] | <- Scrollable tabs
|                               =======   |
+-----------------------------------------+
|                                         |
|  CHECKLIST PROGRESS                     |
|  +-------------------------------------+|
|  | Battery Installation Checklist      ||
|  | ################################... || <- Bold progress
|  |         8/12 Complete (67%)         ||
|  +-------------------------------------+|
|                                         |
|  PRE-INSTALLATION SAFETY                |
|  +-------------------------------------+|
|  | [X] Site electrical isolation       || <- 48px row height
|  |     Checked by Mike - 9:15 AM       ||
|  |                            <- SWIPE ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [X] Mounting location verified      ||
|  |     Checked by Mike - 9:20 AM       ||
|  |     [photo] 1 photo attached        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [X] Ventilation requirements met    ||
|  |     Checked by Mike - 9:25 AM       ||
|  +-------------------------------------+|
|                                         |
|  BATTERY INSTALLATION                   |
|  +-------------------------------------+|
|  | [X] Battery units mounted level     ||
|  |     Checked by Mike - 11:30 AM      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [X] Torque specs verified           ||
|  |     Checked by Mike - 11:45 AM      ||
|  |     [photo] 2 photos attached       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] DC connections secure           || <- Unchecked
|  |     Required                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Inverter installation complete  ||
|  |     Required                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] BMS firmware version confirmed  ||
|  |     Required                        ||
|  +-------------------------------------+|
|                                         |
|  COMMISSIONING & FINAL CHECKS           |
|  +-------------------------------------+|
|  | [ ] Grid connection tested          ||
|  |     Required                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] System performance verified     ||
|  |     Required                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Customer training completed     ||
|  |     Required - with signature       || <- Signature required
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Customer signature              || <- Final sign-off
|  |     Required for completion         ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Checklist Item States

```
+-- UNCHECKED (PENDING) -------------------------+
|  +--------------------------------------------+|
|  | [ ] Item description                       || <- 28px checkbox
|  |     Required                               ||
|  |                                    SWIPE > ||
|  +--------------------------------------------+|
|  Background: white                             |
|  Border-left: none                             |
+------------------------------------------------+

+-- CHECKED (COMPLETED) -------------------------+
|  +--------------------------------------------+|
|  | [X] Item description                       || <- Green checkmark
|  |     Checked by Mike - 11:45 AM             ||
|  |                                    SWIPE > ||
|  +--------------------------------------------+|
|  Background: green-50                          |
|  Border-left: 4px solid green-500              |
+------------------------------------------------+

+-- CHECKED WITH PHOTO --------------------------+
|  +--------------------------------------------+|
|  | [X] Item description                       ||
|  |     Checked by Mike - 11:45 AM             ||
|  |     [camera] 2 photos attached    SWIPE > ||
|  +--------------------------------------------+|
|  Background: green-50                          |
|  Border-left: 4px solid green-500              |
+------------------------------------------------+

+-- CHECKED WITH NOTES --------------------------+
|  +--------------------------------------------+|
|  | [X] Item description                       ||
|  |     Checked by Mike - 11:45 AM             ||
|  |     [note] "Minor adjustment needed"       ||
|  |     [camera] 1 photo attached     SWIPE > ||
|  +--------------------------------------------+|
|  Background: green-50                          |
|  Border-left: 4px solid green-500              |
+------------------------------------------------+

+-- REQUIRES PHOTO (MANDATORY) ------------------+
|  +--------------------------------------------+|
|  | [ ] Item description              [camera] || <- Camera icon
|  |     Photo required                         ||
|  |                                    SWIPE > ||
|  +--------------------------------------------+|
|  Background: white                             |
|  Right icon: camera badge                      |
+------------------------------------------------+

+-- REQUIRES SIGNATURE --------------------------+
|  +--------------------------------------------+|
|  | [ ] Customer signature             [sign]  || <- Signature icon
|  |     Signature required                     ||
|  |                                    SWIPE > ||
|  +--------------------------------------------+|
|  Background: blue-50                           |
|  Border-left: 4px solid blue-500               |
+------------------------------------------------+
```

### Swipe Actions (48px reveal)

```
+-------------------------------------------------------------+
|                                                             |
|  <- SWIPE LEFT reveals:                                     |
|  +--------------------------------------+-------+-----------+
|  | [ ] Upper inverters level            | PHOTO | COMPLETE  |
|  |     Required                        | [cam] |    [X]    |
|  |                                     | gray  |   green   |
|  +--------------------------------------+-------+-----------+
|                                                             |
|  For completed items, swipe reveals:                        |
|  +--------------------------------------+-------+-----------+
|  | [X] Base inverters level             | PHOTO |   UNDO    |
|  |     Checked by Mike                 | [cam] |   [<-]    |
|  |                                     | gray  |   orange  |
|  +--------------------------------------+-------+-----------+
|                                                             |
+-------------------------------------------------------------+
```

### Quick Complete with Photo (Tap Item)

```
+-- TAP TO COMPLETE FLOW --------------------------------+
|                                                        |
|  1. User taps unchecked item:                          |
|                                                        |
|  +--------------------------------------------------+  |
|  |                                                  |  |
|  |  COMPLETE ITEM                          [X]      |  |
|  |  ----------------------------------------        |  |
|  |                                                  |  |
|  |  "Upper inverters level"                          |  |
|  |                                                  |  |
|  |  +--------------------------------------------+  |  |
|  |  |                                            |  |  |
|  |  |    [camera]  TAKE PHOTO (Optional)         |  |  | <- 56px button
|  |  |                                            |  |  |
|  |  +--------------------------------------------+  |  |
|  |                                                  |  |
|  |  Add note (optional)                             |  |
|  |  +--------------------------------------------+  |  |
|  |  |                                            |  |  |
|  |  +--------------------------------------------+  |  |
|  |                                                  |  |
|  |  +--------------------------------------------+  |  |
|  |  |                                            |  |  |
|  |  |      [X] MARK COMPLETE                     |  |  | <- 56px primary
|  |  |                                            |  |  |
|  |  +--------------------------------------------+  |  |
|  |                                                  |  |
|  +--------------------------------------------------+  |
|                                                        |
+--------------------------------------------------------+
```

### Photo Capture Flow

```
+-- PHOTO CAPTURE --------------------------------------+
|                                                       |
|  Camera opens fullscreen:                             |
|  +---------------------------------------------------+|
|  |                                                   ||
|  |  +-----------------------------------------------+||
|  |  |                                               |||
|  |  |                                               |||
|  |  |            CAMERA VIEWFINDER                  |||
|  |  |                                               |||
|  |  |                                               |||
|  |  +-----------------------------------------------+||
|  |                                                   ||
|  |  [flash]                                 [X]      ||
|  |                                                   ||
|  |           +------------------+                    ||
|  |           |                  |                    ||
|  |           |    [CAPTURE]     |                    || <- 72px button
|  |           |                  |                    ||
|  |           +------------------+                    ||
|  |                                                   ||
|  +---------------------------------------------------+|
|                                                       |
|  After capture:                                       |
|  +---------------------------------------------------+|
|  |                                                   ||
|  |  +-----------------------------------------------+||
|  |  |                                               |||
|  |  |            PHOTO PREVIEW                      |||
|  |  |                                               |||
|  |  +-----------------------------------------------+||
|  |                                                   ||
|  |  +----------+                      +----------+   ||
|  |  |  RETAKE  |                      |   SAVE   |   || <- 48px buttons
|  |  +----------+                      +----------+   ||
|  |                                                   ||
|  +---------------------------------------------------+|
|                                                       |
+-------------------------------------------------------+
```

### Signature Capture Flow

```
+-- SIGNATURE CAPTURE ----------------------------------+
|                                                       |
|  +---------------------------------------------------+|
|  |                                                   ||
|  |  CUSTOMER SIGNATURE                       [X]     ||
|  |  ------------------------------------------------ ||
|  |                                                   ||
|  |  Please sign below to confirm the work            ||
|  |  has been completed to your satisfaction.         ||
|  |                                                   ||
|  |  +-----------------------------------------------+||
|  |  |                                               |||
|  |  |                                               |||
|  |  |    [Signature Area - touch to sign]           ||| <- Large touch area
|  |  |                                               |||
|  |  |         _____________________________         |||
|  |  |                                               |||
|  |  |                                               |||
|  |  +-----------------------------------------------+||
|  |                                                   ||
|  |  Customer name                                    ||
|  |  +-----------------------------------------------+||
|  |  | John Smith                                    |||
|  |  +-----------------------------------------------+||
|  |                                                   ||
|  |  +----------+                      +----------+   ||
|  |  |  CLEAR   |                      |  SUBMIT  |   || <- 48px buttons
|  |  +----------+                      +----------+   ||
|  |                                                   ||
|  +---------------------------------------------------+|
|                                                       |
+-------------------------------------------------------+
```

### No Checklist Applied (Empty State)

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                               =======   |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |  [list-X]   |              |
|            +-------------+              |
|                                         |
|       NO CHECKLIST APPLIED              |
|                                         |
|   Apply a checklist template to         |
|   ensure quality and track completion   |
|   of all required steps.                |
|                                         |
|   +-----------------------------+       |
|   |                             |       |
|   |   [+] APPLY TEMPLATE        |       | <- 56px CTA
|   |                             |       |
|   +-----------------------------+       |
|                                         |
|   Available templates:                  |
|   +-----------------------------+       |
|   | Kitchen Installation (12)   |       | <- Quick apply
|   +-----------------------------+       |
|   +-----------------------------+       |
|   | Bathroom Renovation (8)     |       |
|   +-----------------------------+       |
|   +-----------------------------+       |
|   | Battery Install (6)          |       |
|   +-----------------------------+       |
|                                         |
+=========================================+
```

### Apply Template Dialog

```
+=========================================+
| ====================================    |
|                                         |
|  APPLY CHECKLIST                [X]     |
|  -----------------------------------    |
|                                         |
|  Select a template:                     |
|                                         |
|  +-------------------------------------+|
|  | [X] Kitchen Installation            ||
|  |     12 items - Est. 2h              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Bathroom Renovation             ||
|  |     8 items - Est. 1h               ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] Battery Installation             ||
|  |     6 items - Est. 45m              ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [ ] General Inspection              ||
|  |     10 items - Est. 30m             ||
|  +-------------------------------------+|
|                                         |
|  Preview:                               |
|  +-------------------------------------+|
|  | 1. Verify measurements              ||
|  | 2. Confirm electrical locations     ||
|  | 3. Protect flooring                 ||
|  | 4. Base inverters level              ||
|  | ... and 8 more items                ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [APPLY TO JOB]                 || <- 56px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
| < Job #JOB-1234                    [*]  |
| 45 Industrial Rd - Install 10kWh battery system        |
+-----------------------------------------+
| [Overview] [Tasks] [BOM] [Time] [Check] |
|                               =======   |
+-----------------------------------------+
|                                         |
|  CHECKLIST PROGRESS                     |
|  +-------------------------------------+|
|  | ....................................||
|  | ................................    ||
|  +-------------------------------------+|
|                                         |
|  .................                      |
|  +-------------------------------------+|
|  | [.] .............................   ||
|  |     .....................           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [.] .............................   ||
|  |     .....................           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [.] .............................   ||
|  |     .....................           ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px - Office Use)

```
+=======================================================================+
| < Back | Job #JOB-1234 - Install 10kWh battery system       [Sync *] [Actions v]|
+-----------------------------------------------------------------------+
| [Overview] [Tasks] [Materials] [Time] [Checklist] [Photos] [Notes]    |
|                                        ===========                    |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- PROGRESS ----------------------+  +-- SUMMARY -------------------+
|  |                                  |  |                              |
|  |  Kitchen Installation Checklist  |  |  Completed:  8/12 (67%)      |
|  |  ##############################..|  |  Remaining:  4 items         |
|  |  67% Complete                    |  |  Photos:     5 attached      |
|  |                                  |  |  Signature:  Pending         |
|  +----------------------------------+  +------------------------------+
|                                                                       |
|  +-- CHECKLIST --------------------------------------------------------+
|  |                                                                     |
|  |  PRE-INSTALLATION                                                   |
|  |  +-- Item ---------------------+-- Status ---+-- Photo --+-- Time --+
|  |  | Verify measurements          | [X] Done   |           | 9:15 AM |
|  |  | Confirm electrical locations | [X] Done   | [2 imgs]  | 9:20 AM |
|  |  | Protect flooring             | [X] Done   |           | 9:25 AM |
|  |  +----------------------------------------------------------------------+
|  |                                                                     |
|  |  CABINET INSTALLATION                                               |
|  |  +-- Item ---------------------+-- Status ---+-- Photo --+-- Time --+
|  |  | Base inverters level          | [X] Done   |           | 11:30AM |
|  |  | Base inverters secured        | [X] Done   | [2 imgs]  | 11:45AM |
|  |  | Upper inverters level         | [ ] Pending|           |         |
|  |  | Upper inverters secured       | [ ] Pending|           |         |
|  |  | Doors aligned and adjusted   | [ ] Pending|           |         |
|  |  +----------------------------------------------------------------------+
|  |                                                                     |
|  |  FINAL CHECKS                                                       |
|  |  +-- Item ---------------------+-- Status ---+-- Photo --+-- Time --+
|  |  | All hardware installed       | [ ] Pending|           |         |
|  |  | Cleanup complete             | [ ] Pending|           |         |
|  |  | Customer walkthrough         | [ ] Pending|           |         |
|  |  | Customer signature           | [ ] Pending| [sign req]|         |
|  |  +----------------------------------------------------------------------+
|  |                                                                     |
|  +---------------------------------------------------------------------+
|                                                                       |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+ - Checklist Template Management)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Checklist Templates                                                        |
| Customers   |  ============================================================================          |
| Orders      |                                                                                        |
| Products    |  Manage checklist templates for your jobs                    [+ Create Template]       |
| Jobs        |                                                                                        |
| Settings <  |  +-- TEMPLATES LIST ------------------------------------------------------------------+
|  > General  |  |                                                                                    |
|  > Users    |  |  [search] Search templates...                                                      |
|  > Templates|  |                                                                                    |
|  > Checklst<|  |  +-- Template ---------------+-- Items --+-- Used --+-- Status --+-- Actions -----+|
|             |  |  | Kitchen Installation       |    12     |   45x    |  Active    | [Edit] [Copy]  ||
|             |  |  | Standard inverter install   |           |          |            | [Deactivate]   ||
|             |  |  +-------------------------------------------------------------------------------- ||
|             |  |  | Bathroom Renovation        |     8     |   23x    |  Active    | [Edit] [Copy]  ||
|             |  |  | Full bathroom remodel      |           |          |            | [Deactivate]   ||
|             |  |  +-------------------------------------------------------------------------------- ||
|             |  |  | Battery Installation        |     6     |   67x    |  Active    | [Edit] [Copy]  ||
|             |  |  | Single/double battery       |           |          |            | [Deactivate]   ||
|             |  |  +-------------------------------------------------------------------------------- ||
|             |  |  | General Inspection         |    10     |   12x    |  Active    | [Edit] [Copy]  ||
|             |  |  | Pre-delivery check         |           |          |            | [Deactivate]   ||
|             |  |  +-------------------------------------------------------------------------------- ||
|             |  |  | HVAC Installation          |    15     |    8x    | Inactive   | [Edit] [Copy]  ||
|             |  |  | Heating/cooling system     |           |          |            | [Activate]     ||
|             |  |  +-------------------------------------------------------------------------------- ||
|             |  |                                                                                    |
|             |  +------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Template Editor (Desktop)

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Templates                                                                   |
| Settings <  |                                                                                        |
|  > Checklst<|  Edit Template: Kitchen Installation                        [Save] [Cancel]            |
|             |  ============================================================================          |
|             |                                                                                        |
|             |  Template Name *                                                                       |
|             |  +---------------------------------------------------------------------------------+   |
|             |  | Kitchen Installation                                                           |   |
|             |  +---------------------------------------------------------------------------------+   |
|             |                                                                                        |
|             |  Description                                                                           |
|             |  +---------------------------------------------------------------------------------+   |
|             |  | Standard checklist for inverter and countertop installation                     |   |
|             |  +---------------------------------------------------------------------------------+   |
|             |                                                                                        |
|             |  CHECKLIST ITEMS                                          [+ Add Section] [+ Add Item] |
|             |  +-- Section: Pre-Installation ----------------------------------------------------------+
|             |  |  [=] 1. Verify measurements                              [camera] [edit] [delete]    |
|             |  |  [=] 2. Confirm electrical locations                     [camera] [edit] [delete]    |
|             |  |  [=] 3. Protect flooring                                 [    ]   [edit] [delete]    |
|             |  +--------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  +-- Section: Inverter Installation ------------------------------------------------------+
|             |  |  [=] 4. Base inverters level                              [    ]   [edit] [delete]    |
|             |  |  [=] 5. Base inverters secured                            [camera] [edit] [delete]    |
|             |  |  [=] 6. Upper inverters level                             [    ]   [edit] [delete]    |
|             |  |  [=] 7. Upper inverters secured                           [camera] [edit] [delete]    |
|             |  |  [=] 8. Doors aligned and adjusted                       [    ]   [edit] [delete]    |
|             |  +--------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  +-- Section: Final Checks --------------------------------------------------------------+
|             |  |  [=] 9. All hardware installed                           [    ]   [edit] [delete]    |
|             |  |  [=] 10. Cleanup complete                                [    ]   [edit] [delete]    |
|             |  |  [=] 11. Customer walkthrough                            [    ]   [edit] [delete]    |
|             |  |  [=] 12. Customer signature                              [sign]   [edit] [delete]    |
|             |  +--------------------------------------------------------------------------------------+
|             |                                                                                        |
|             |  [=] = drag handle for reordering                                                      |
|             |  [camera] = photo required                                                             |
|             |  [sign] = signature required                                                           |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction Specifications

### Complete Item Flow (Mobile)

```
+-- QUICK COMPLETE (TAP) --------------------------------+
|                                                        |
|  Option A: Tap checkbox directly                       |
|  - Immediate completion                                |
|  - Haptic feedback                                     |
|  - Green flash animation                               |
|  - Progress bar updates                                |
|  - Can add photo/note after                            |
|                                                        |
|  Option B: Tap item row                                |
|  - Opens completion dialog                             |
|  - Can add photo before completing                     |
|  - Can add note before completing                      |
|  - Then tap "Mark Complete"                            |
|                                                        |
+--------------------------------------------------------+

+-- SWIPE COMPLETE (FASTER) -----------------------------+
|                                                        |
|  Swipe left > 50% reveals green "COMPLETE"             |
|  - Release to complete                                 |
|  - Haptic feedback                                     |
|  - Item animates to checked state                      |
|  - No dialog, instant completion                       |
|                                                        |
+--------------------------------------------------------+
```

### Photo Attachment Flow

```
+-- ATTACH PHOTO ----------------------------------------+
|                                                        |
|  1. Tap camera icon on item OR swipe to reveal PHOTO   |
|                                                        |
|  2. Camera opens:                                      |
|     - Native camera (better quality)                   |
|     - In-app camera (faster)                           |
|     - Photo gallery option                             |
|                                                        |
|  3. After capture:                                     |
|     - Preview shown                                    |
|     - [Retake] or [Use Photo]                          |
|     - Photo compressed for upload                      |
|                                                        |
|  4. Photo attached:                                    |
|     - Thumbnail appears on item                        |
|     - Count badge updates (e.g., "2 photos")           |
|     - Uploads in background                            |
|                                                        |
|  5. Tap thumbnail to view:                             |
|     - Full-screen photo viewer                         |
|     - Swipe between photos                             |
|     - [Delete] option                                  |
|                                                        |
+--------------------------------------------------------+
```

---

## Accessibility Requirements

| Element | ARIA | Keyboard | Touch Target |
|---------|------|----------|--------------|
| Checkbox | role="checkbox", aria-checked | Space | 44x44px min |
| Item row | role="listitem" | Tab, Enter | Full row |
| Photo button | aria-label="Attach photo" | Enter | 48px |
| Signature pad | role="img", aria-label | Touch only | Full area |
| Progress bar | role="progressbar" | - | - |
| Section header | role="heading" | - | - |

---

## Offline Behavior

```
+-- OFFLINE MODE ----------------------------------------+
|                                                        |
|  Checklist completion:                                 |
|  - Works fully offline                                 |
|  - Completions queued for sync                         |
|  - Dashed border on pending items                      |
|                                                        |
|  Photo capture:                                        |
|  - Photos saved locally first                          |
|  - Compressed and queued for upload                    |
|  - Thumbnail shows immediately                         |
|  - Upload icon indicates pending                       |
|                                                        |
|  Signature capture:                                    |
|  - Works offline                                       |
|  - Signature saved as image                            |
|  - Queued for sync                                     |
|                                                        |
|  When back online:                                     |
|  - Auto-sync all pending items                         |
|  - Photos upload in background                         |
|  - Progress shown in header                            |
|                                                        |
+--------------------------------------------------------+
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Checklist tab | JobChecklistTab | - |
| Checklist progress | ChecklistProgress | Progress |
| Section header | ChecklistSection | - |
| Checklist item | ChecklistItem | Card |
| Item checkbox | ChecklistCheckbox | Checkbox |
| Photo attachment | PhotoAttachment | - |
| Photo capture | PhotoCapture | Dialog |
| Signature pad | SignaturePad | - (custom) |
| Apply template dialog | ApplyTemplateDialog | Sheet |
| Empty state | EmptyState | - |
| Loading skeleton | ChecklistSkeleton | Skeleton |

---

## Files to Create/Modify

- src/routes/_authed/settings/checklist-templates.tsx (create)
- src/components/domain/jobs/job-checklist-tab.tsx (create)
- src/components/domain/jobs/checklist-item.tsx (create)
- src/components/domain/jobs/checklist-section.tsx (create)
- src/components/domain/jobs/photo-capture.tsx (create)
- src/components/domain/jobs/signature-pad.tsx (create)
- src/components/domain/jobs/apply-template-dialog.tsx (create)
- src/routes/installer/jobs/$jobId.tsx (modify: add Checklist tab)
