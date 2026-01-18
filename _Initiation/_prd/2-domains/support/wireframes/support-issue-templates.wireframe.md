# Support Issue Templates Wireframe

**Story ID:** DOM-SUP-004
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**Version:** v1.1 - Added Renoz battery support context
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `issueTemplates` | NOT CREATED |
| **Server Functions Required** | Template CRUD, template application to issues | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-004 | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer and installation services
- **Product Focus**: LiFePO4 battery systems, inverters, BMS (Battery Management Systems)
- **Issue Categories (Battery-Specific)**:
  - Battery not charging
  - Inverter fault code
  - Communication error (BMS)
  - Physical damage (shipping)
  - Capacity degradation
  - Overheating alarm
  - Grid sync failure
- **Support Types**: Warranty claims, technical service requests, installation support, product questions
- **Priority**: low, normal, high, urgent
- **Typical Data Points**: Serial number, installation date, SoH reading, inverter error logs, CEC installer number

---

## Overview

Issue templates provide pre-configured issue types for quick creation. This wireframe covers:
- Template management in settings
- Quick issue creation from templates
- Template suggestions based on usage
- Description prompts and required fields
- Battery-specific data collection

---

## UI Patterns (Reference Implementation)

### Template Card
- **Pattern**: RE-UI Card + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Card-based display for each template
  - Active/Disabled state with visual differentiation (gray-50 background for disabled)
  - Usage counter badge showing number of times used
  - Icon prefix for template type (battery, inverter, connection)
  - Action buttons for Edit, Duplicate, Disable/Enable

### Template List View
- **Pattern**: RE-UI Card Grid with Search + Filter
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/input.tsx`, `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Search input for filtering templates
  - Type filter dropdown (All, Claim, Return, Question, Other)
  - Sort dropdown (Usage, Name, Created)
  - Grouped sections: "Most Used" and "Other Templates"
  - Create Template button in header

### Create/Edit Template Dialog
- **Pattern**: RE-UI Dialog + Form + Multi-Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/input.tsx`, `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Large modal dialog with sections (Defaults, Prompts, Required Fields, SLA)
  - Priority button group (Low, Medium, High, Urgent)
  - Assignee select dropdown (teams/users)
  - Dynamic prompt list with add/remove functionality
  - Checkbox group for required fields
  - SLA policy select dropdown
  - Active/Inactive toggle

### Template Picker (Selection)
- **Pattern**: RE-UI Dialog + Grid + Search
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Suggested templates section with large card format
  - All templates section grouped by category (accordion/expandable)
  - Search input for filtering
  - Radio group behavior for template selection
  - "Create Blank Issue" option
  - Selected state with orange-50 background and border

### Template Picker Card (Suggested)
- **Pattern**: RE-UI Custom Card Component
- **Reference**: Build on `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Large format for featured templates
  - Icon display for template type
  - Template name and usage count
  - Hover effect (scale 1.02, shadow)
  - Selected state with ring and background color

### Create Issue From Template Form
- **Pattern**: RE-UI Form + Multi-Field
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`, `_reference/.reui-reference/registry/default/ui/textarea.tsx`, `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Pre-filled defaults from template (type, priority, assignee)
  - Customer and Order select dropdowns (cascading)
  - Description textarea pre-populated with prompt questions
  - Serial number input with format validation
  - Installation date picker with calendar
  - SoH reading numeric input (0-100%)
  - Installer CEC number input
  - Priority button group (pre-selected from template)
  - File upload for attachments (photos/logs)
  - Suggested subject format based on template

---

## Desktop View (1280px+)

### Settings - Template Management

```
+================================================================================+
| Settings > Support > Issue Templates                                            |
+================================================================================+
|                                                                                 |
| Issue Templates                                        [ + Create Template ]    |
| Pre-configured issue types for faster support ticket creation                   |
|                                                                                 |
| +-----------------------------------------------------------------------------+ |
| | [Search templates...________________________]  [Type: All v]  [Sort: Usage v]| |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +== MOST USED (Battery Support) ===============================================+ |
| |                                                                            | |
| |  +-- Battery Not Charging to Full Capacity ---------------------------------+ |
| |  | [battery icon]                                                         |  |
| |  | Type: Claim  |  Priority: High  |  Uses: 156                         |  |
| |  |                                                                      |  |
| |  | Prompts: Serial number, Date of installation, SoH reading,           |  |
| |  |          Inverter error logs, Current charge capacity                |  |
| |  | Required: Customer, Order, Serial Number, Installation Date          |  |
| |  | Auto-assign: Battery Support Team                                    |  |
| |  |                                                                      |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| |  +-- Inverter Fault Code Error -------------------------------------------+ |
| |  | [inverter icon]                                                      |  |
| |  | Type: Claim  |  Priority: Urgent  |  Uses: 98                        |  |
| |  |                                                                      |  |
| |  | Prompts: Fault code number, Inverter model, When did fault occur,   |  |
| |  |          LED indicator status, Grid connection status                |  |
| |  | Required: Customer, Serial Number, Fault Code, Description           |  |
| |  | Auto-assign: Inverter Support Team                                   |  |
| |  |                                                                      |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| |  +-- BMS Communication Timeout -------------------------------------------+ |
| |  | [connection icon]                                                    |  |
| |  | Type: Other  |  Priority: High  |  Uses: 87                         |  |
| |  |                                                                      |  |
| |  | Prompts: BMS firmware version, Connection type (CAN/Modbus),        |  |
| |  |          Error messages, When did communication stop                 |  |
| |  | Required: Customer, Serial Number, BMS Model, Description            |  |
| |  | Auto-assign: Technical Support Team                                 |  |
| |  |                                                                      |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| +============================================================================+ |
|                                                                                 |
| +== OTHER TEMPLATES ========================================================+ |
| |                                                                            | |
| |  +-- Physical Damage (Shipping) -----------------------------------------+  |
| |  | Type: Claim  |  Priority: High  |  Uses: 45                          |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| |  +-- Capacity Degradation Alert -----------------------------------------+  |
| |  | Type: Claim  |  Priority: Medium  |  Uses: 34                        |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| |  +-- Overheating Alarm ---------------------------------------------------+  |
| |  | Type: Claim  |  Priority: Urgent  |  Uses: 28                        |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| |  +-- Grid Sync Failure ---------------------------------------------------+  |
| |  | Type: Claim  |  Priority: High  |  Uses: 23                          |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [*] Active  |  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| |  +-- Installation Support (On-site) --------------------------------------+  |
| |  | Type: Question  |  Priority: Medium  |  Uses: 19                     |  |
| |  | [ Edit ]  [ Duplicate ]  [ Disable ]                     [ ] Disabled|  |
| |  +----------------------------------------------------------------------+  |
| |                                                                            |
| +============================================================================+ |
|                                                                                 |
+=================================================================================+
```

### Create/Edit Template Dialog

```
+================================================================+
| Create Issue Template                                     [X]  |
+================================================================+
|                                                                |
|  Template Name *                                               |
|  +----------------------------------------------------------+  |
|  | Battery Not Charging to Full Capacity                     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|  DEFAULTS                                                      |
|  ----------------------------------------------------------    |
|                                                                |
|  Issue Type *                                                  |
|  +---------------------------------------------- v-----------+  |
|  | Claim                                                     |  |
|  +----------------------------------------------------------+  |
|    Options: Claim, Return, Question, Other                     |
|                                                                |
|  Default Priority *                                            |
|  +----------+ +----------+ +----------+ +----------+           |
|  |   Low    | | Medium   | |   High   | |  Urgent  |           |
|  |    ( )   | |    ( )   | |   (o)    | |    ( )   |           |
|  +----------+ +----------+ +----------+ +----------+           |
|                                                                |
|  Default Assignee                                              |
|  +---------------------------------------------- v-----------+  |
|  | Battery Support Team                                      |  |
|  +----------------------------------------------------------+  |
|    Options: Unassigned, [Users], [Teams]                       |
|                                                                |
|  ----------------------------------------------------------    |
|  DESCRIPTION PROMPTS                                           |
|  Help guide users to provide necessary information             |
|  ----------------------------------------------------------    |
|                                                                |
|  +----------------------------------------------------------+  |
|  | Prompt 1                                                  |  |
|  | [Battery serial number (on unit label)      ] [X]        |  |
|  +----------------------------------------------------------+  |
|  | Prompt 2                                                  |  |
|  | [Date of installation (DD/MM/YYYY)          ] [X]        |  |
|  +----------------------------------------------------------+  |
|  | Prompt 3                                                  |  |
|  | [Current State of Health (SoH) reading      ] [X]        |  |
|  +----------------------------------------------------------+  |
|  | Prompt 4                                                  |  |
|  | [What is the maximum charge capacity reached?] [X]       |  |
|  +----------------------------------------------------------+  |
|  | Prompt 5                                                  |  |
|  | [Inverter error logs (if available)         ] [X]        |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [ + Add Prompt ]                                              |
|                                                                |
|  ----------------------------------------------------------    |
|  REQUIRED FIELDS                                               |
|  Users must provide these before submitting                    |
|  ----------------------------------------------------------    |
|                                                                |
|  +----------------------------------------------------------+  |
|  | [x] Customer                                              |  |
|  | [x] Order (linked)                                        |  |
|  | [x] Serial Number                                         |  |
|  | [x] Installation Date                                     |  |
|  | [x] Description                                           |  |
|  | [ ] SoH Reading                                           |  |
|  | [ ] Attachments (photos/logs)                             |  |
|  | [ ] Priority                                              |  |
|  | [ ] Installer CEC Number                                  |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|  SLA POLICY                                                    |
|  ----------------------------------------------------------    |
|                                                                |
|  Apply SLA Policy                                              |
|  +---------------------------------------------- v-----------+  |
|  | Critical Support (4h response / 24h resolution)           |  |
|  +----------------------------------------------------------+  |
|    Options: Critical (4h), Priority (24h), Standard (48h)      |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  [x] Active (Available for use)                                |
|                                                                |
|                         ( Cancel )  [ Save Template ]          |
+================================================================+
```

### Create Issue - Template Selection

```
+================================================================================+
| Create Issue                                                              [X]  |
+================================================================================+
|                                                                                 |
|  Choose how to create your issue:                                               |
|                                                                                 |
|  +-- SUGGESTED TEMPLATES (Based on usage) ------------------------------------+ |
|  |                                                                            | |
|  |  +------------------+  +------------------+  +------------------+          | |
|  |  | [battery icon]   |  | [inverter icon]  |  | [connect icon]   |          | |
|  |  |                  |  |                  |  |                  |          | |
|  |  | Battery Not      |  | Inverter Fault   |  | BMS Communication|          | |
|  |  | Charging         |  | Code Error       |  | Timeout          |          | |
|  |  |                  |  |                  |  |                  |          | |
|  |  | Most used        |  | 98 uses          |  | 87 uses          |          | |
|  |  |                  |  |                  |  |                  |          | |
|  |  +------------------+  +------------------+  +------------------+          | |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  +-- ALL TEMPLATES -----------------------------------------------------------+ |
|  |                                                                            | |
|  |  [Search templates...________________________]                             | |
|  |                                                                            | |
|  |  +-- Battery Issues -------------------------------------------------------+| |
|  |  |  [*] Battery Not Charging to Full Capacity                             || |
|  |  |  [*] Capacity Degradation Alert                                        || |
|  |  |  [*] Overheating Alarm                                                 || |
|  |  +------------------------------------------------------------------------+| |
|  |                                                                            | |
|  |  +-- Inverter Issues -------------------------------------------------------+| |
|  |  |  [*] Inverter Fault Code Error                                         || |
|  |  |  [*] Grid Sync Failure                                                 || |
|  |  +------------------------------------------------------------------------+| |
|  |                                                                            | |
|  |  +-- Communication/BMS Issues ----------------------------------------------+| |
|  |  |  [*] BMS Communication Timeout                                         || |
|  |  +------------------------------------------------------------------------+| |
|  |                                                                            | |
|  |  +-- Physical Damage -------------------------------------------------------+| |
|  |  |  [*] Physical Damage (Shipping)                                        || |
|  |  +------------------------------------------------------------------------+| |
|  |                                                                            | |
|  |  +-- Installation Support -------------------------------------------------+| |
|  |  |  [*] Installation Support (On-site)                                    || |
|  |  +------------------------------------------------------------------------+| |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  ----------------------------------------------------------                     |
|                                                                                 |
|  ( Create Blank Issue )  <- Start without template                              |
|                                                                                 |
+=================================================================================+
```

### Create Issue From Template

```
+================================================================================+
| Create Issue: Battery Not Charging to Full Capacity                      [X]  |
+================================================================================+
|                                                                                 |
|  Template: Battery Not Charging to Full Capacity                                |
|  Type: Claim  |  Priority: High (default)                                       |
|                                                                                 |
|  ----------------------------------------------------------                     |
|                                                                                 |
|  Customer *                                                                     |
|  +---------------------------------------------------------------------- v---+  |
|  | [search icon] Search customers...                                         |  |
|  +------------------------------------------------------------------------+  |
|                                                                                 |
|  Linked Order *                                                                 |
|  +---------------------------------------------------------------------- v---+  |
|  | [search icon] Search orders... (filtered by customer)                     |  |
|  +------------------------------------------------------------------------+  |
|    Will populate after customer selection                                       |
|                                                                                 |
|  ----------------------------------------------------------                     |
|  ISSUE DETAILS                                                                  |
|  ----------------------------------------------------------                     |
|                                                                                 |
|  Subject *                                                                      |
|  +------------------------------------------------------------------------+  |
|  | Battery not charging - [customer name] - [serial number]              |  |
|  +------------------------------------------------------------------------+  |
|    Suggested format based on template                                           |
|                                                                                 |
|  Description *                                                                  |
|  +------------------------------------------------------------------------+  |
|  |                                                                         |  |
|  | ** Battery serial number (on unit label) **                            |  |
|  | [answer here]                                                           |  |
|  |                                                                         |  |
|  | ** Date of installation (DD/MM/YYYY) **                                |  |
|  | [answer here]                                                           |  |
|  |                                                                         |  |
|  | ** Current State of Health (SoH) reading **                            |  |
|  | [answer here]                                                           |  |
|  |                                                                         |  |
|  | ** What is the maximum charge capacity reached? **                     |  |
|  | [answer here]                                                           |  |
|  |                                                                         |  |
|  | ** Inverter error logs (if available) **                               |  |
|  | [answer here]                                                           |  |
|  |                                                                         |  |
|  +------------------------------------------------------------------------+  |
|    Pre-filled with prompt questions from template                               |
|                                                                                 |
|  Serial Number *                                                                |
|  +---------------------------------------------------------------------- v---+  |
|  | [format: BAT-YYYY-XXXXX]                                                  |  |
|  +------------------------------------------------------------------------+  |
|                                                                                 |
|  Installation Date *                                                            |
|  +------------------------------------------------------------------------+  |
|  | [DD/MM/YYYY]                                               [calendar]   |  |
|  +------------------------------------------------------------------------+  |
|    Determines warranty coverage eligibility                                     |
|                                                                                 |
|  SoH Reading (%)                                                                |
|  +------------------------------------------------------------------------+  |
|  | [0-100%]                                                                |  |
|  +------------------------------------------------------------------------+  |
|    Battery State of Health reading from BMS (optional)                          |
|                                                                                 |
|  Installer CEC Number                                                           |
|  +------------------------------------------------------------------------+  |
|  | [CEC accredited installer number]                                       |  |
|  +------------------------------------------------------------------------+  |
|    Required for installation-related issues                                     |
|                                                                                 |
|  Priority                                                                       |
|  +----------+ +----------+ +----------+ +----------+                            |
|  |   Low    | | Medium   | |  [High]  | |  Urgent  |                            |
|  +----------+ +----------+ +----------+ +----------+                            |
|    High pre-selected from template                                              |
|                                                                                 |
|  Attachments (Photos/Logs)                                                      |
|  +------------------------------------------------------------------------+  |
|  |  [+ Add attachments]                                                    |  |
|  |                                                                         |  |
|  |  Drag files here or click to browse                                     |  |
|  |  Supported: JPG, PNG, PDF, LOG, CSV                                     |  |
|  +------------------------------------------------------------------------+  |
|    Helpful: Photos of battery label, inverter screen, BMS error logs            |
|                                                                                 |
|  ----------------------------------------------------------                     |
|                                                                                 |
|  Assign To: Battery Support Team (from template)                                |
|  SLA Policy: Critical Support (4h response / 24h resolution)                    |
|                                                                                 |
|                                  ( Cancel )  [ Create Issue ]                   |
|                                                                                 |
+=================================================================================+
```

---

## Tablet View (768px)

### Template List (Tablet)

```
+================================================================+
| Issue Templates                              [ + Create ]       |
+================================================================+
|                                                                 |
| [Search..._______________] [Type v] [Sort: Usage v]             |
|                                                                 |
| MOST USED (Battery Support)                                     |
|                                                                 |
| +-------------------------------------------------------------+ |
| | [battery] Battery Not Charging to Full Capacity             | |
| | Type: Claim  |  Priority: High  |  Uses: 156                | |
| | Prompts: 5  |  Required: Customer, Order, Serial, Install   | |
| |                                            [Edit] [Disable] | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | [inverter] Inverter Fault Code Error                        | |
| | Type: Claim  |  Priority: Urgent  |  Uses: 98               | |
| | Prompts: 4  |  Required: Customer, Serial, Fault Code       | |
| |                                            [Edit] [Disable] | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| | [connection] BMS Communication Timeout                      | |
| | Type: Other  |  Priority: High  |  Uses: 87                 | |
| | Prompts: 4  |  Required: Customer, Serial, BMS Model        | |
| |                                            [Edit] [Disable] | |
| +-------------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

### Template Selection (Tablet)

```
+================================================================+
| Create Issue                                              [X]  |
+================================================================+
|                                                                 |
| SUGGESTED TEMPLATES                                             |
|                                                                 |
| +------------------+ +------------------+ +------------------+  |
| | [battery]        | | [inverter]       | | [connection]     |  |
| | Battery Not      | | Inverter Fault   | | BMS Comm         |  |
| | Charging         | | Code             | | Timeout          |  |
| +------------------+ +------------------+ +------------------+  |
|                                                                 |
| ALL TEMPLATES                                                   |
|                                                                 |
| [Search..._______________]                                      |
|                                                                 |
| [>] Battery Issues (3)                                          |
| [>] Inverter Issues (2)                                         |
| [>] Communication/BMS Issues (1)                                |
| [>] Physical Damage (1)                                         |
| [>] Installation Support (1)                                    |
|                                                                 |
| ( Create Blank Issue )                                          |
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### Template Management (Mobile)

```
+================================+
| < Settings                     |
+================================+
| Issue Templates           [+]  |
+================================+
|                                |
| [Search...________] [Sort v]   |
|                                |
| MOST USED                      |
|                                |
| +----------------------------+ |
| | [battery]                  | |
| | Battery Not Charging       | |
| | Type: Claim | High         | |
| | Uses: 156                  | |
| |                            | |
| | [Edit] [Disable]           | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [inverter]                 | |
| | Inverter Fault Code        | |
| | Type: Claim | Urgent       | |
| | Uses: 98                   | |
| |                            | |
| | [Edit] [Disable]           | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [connection]               | |
| | BMS Communication          | |
| | Type: Other | High         | |
| | Uses: 87                   | |
| |                            | |
| | [Edit] [Disable]           | |
| +----------------------------+ |
|                                |
| OTHER TEMPLATES                |
|                                |
| +----------------------------+ |
| | [damage]                   | |
| | Physical Damage (Ship)     | |
| | Type: Claim | High         | |
| | Uses: 45                   | |
| +----------------------------+ |
|                                |
+================================+
```

### Template Selection (Mobile)

```
+================================+
| Create Issue              [X]  |
+================================+
|                                |
| Choose a template:             |
|                                |
| SUGGESTED                      |
|                                |
| +----------------------------+ |
| | [battery]                  | |
| |                            | |
| | Battery Not Charging       | |
| |                            | |
| | Most used                  | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [inverter]                 | |
| |                            | |
| | Inverter Fault Code        | |
| |                            | |
| | 98 uses                    | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [connection]               | |
| |                            | |
| | BMS Communication          | |
| |                            | |
| | 87 uses                    | |
| +----------------------------+ |
|                                |
| [Search all templates...]      |
|                                |
| +----------------------------+ |
| |                            | |
| | ( Create Blank Issue )     | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### Create Issue From Template (Mobile)

```
+================================+
| ============================== | <- Drag handle
|                                |
| NEW ISSUE                 [X]  |
| Battery Not Charging           |
| =============================== |
|                                |
| Type: Claim | Priority: High   |
|                                |
| Customer *                     |
| +----------------------------+ |
| | Search customers...     v  | |
| +----------------------------+ |
|                                |
| Order *                        |
| +----------------------------+ |
| | Search orders...        v  | |
| +----------------------------+ |
|                                |
| Subject *                      |
| +----------------------------+ |
| | Battery not charging...    | |
| +----------------------------+ |
|                                |
| Description *                  |
| +----------------------------+ |
| | ** Battery serial number   | |
| | (on unit label) **         | |
| |                            | |
| | ** Date of installation ** | |
| |                            | |
| | ** Current SoH reading **  | |
| |                            | |
| | ** Max charge capacity? ** | |
| |                            | |
| | ** Inverter error logs **  | |
| |                            | |
| +----------------------------+ |
|                                |
| Serial Number *                |
| +----------------------------+ |
| | BAT-YYYY-XXXXX          v  | |
| +----------------------------+ |
|                                |
| Installation Date *            |
| +----------------------------+ |
| | DD/MM/YYYY         [cal]   | |
| +----------------------------+ |
|                                |
| SoH Reading (%)                |
| +----------------------------+ |
| | [0-100%]                   | |
| +----------------------------+ |
|                                |
| Priority                       |
| [Low] [Med] [[High]] [Urgent]  |
|                                |
| Attachments                    |
| [+ Add photos/logs]            |
|                                |
| +----------------------------+ |
| |                            | |
| |     [ Create Issue ]       | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### Edit Template (Mobile Bottom Sheet)

```
+================================+
| ============================== |
|                                |
| EDIT TEMPLATE             [X]  |
| =============================== |
|                                |
| Template Name *                |
| +----------------------------+ |
| | Battery Not Charging       | |
| +----------------------------+ |
|                                |
| Issue Type *                   |
| +----------------------------+ |
| | Claim                   v  | |
| +----------------------------+ |
|                                |
| Priority *                     |
| [Low] [Med] [[High]] [Urgent]  |
|                                |
| Assignee                       |
| +----------------------------+ |
| | Battery Support Team    v  | |
| +----------------------------+ |
|                                |
| PROMPTS                        |
| +----------------------------+ |
| | Battery serial number      | |
| |                       [X]  | |
| +----------------------------+ |
| +----------------------------+ |
| | Date of installation       | |
| |                       [X]  | |
| +----------------------------+ |
| +----------------------------+ |
| | Current SoH reading        | |
| |                       [X]  | |
| +----------------------------+ |
| +----------------------------+ |
| | Max charge capacity        | |
| |                       [X]  | |
| +----------------------------+ |
| +----------------------------+ |
| | Inverter error logs        | |
| |                       [X]  | |
| +----------------------------+ |
| [ + Add Prompt ]               |
|                                |
| REQUIRED FIELDS                |
| [x] Customer                   |
| [x] Order                      |
| [x] Serial Number              |
| [x] Installation Date          |
| [x] Description                |
|                                |
| SLA Policy                     |
| +----------------------------+ |
| | Critical Support (4h)   v  | |
| +----------------------------+ |
|                                |
| [*====] Active                 |
|                                |
| +----------------------------+ |
| |                            | |
| |    [ Save Template ]       | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Template Card States

```
+-- ACTIVE TEMPLATE ------------------------------+
|  [icon] Template Name                           |
|  Type: Claim  |  Priority: High  |  Uses: 156   |
|  Background: white                              |
|  Border: gray-200                               |
|  Badge: [*] Active (green)                      |
+-------------------------------------------------+

+-- DISABLED TEMPLATE ----------------------------+
|  [icon] Template Name                           |
|  Type: Question  |  Priority: Low  |  Uses: 12  |
|  Background: gray-50                            |
|  Border: gray-200 (dashed)                      |
|  Text: gray-500 (muted)                         |
|  Badge: [ ] Disabled (gray)                     |
+-------------------------------------------------+

+-- SELECTED TEMPLATE (in picker) ----------------+
|  [icon] Template Name                           |
|  ============================================   |
|  Background: orange-50                          |
|  Border: 2px solid orange-500                   |
|  Shadow: ring                                   |
+-------------------------------------------------+

+-- SUGGESTED TEMPLATE CARD ----------------------+
|  +------------------+                           |
|  | [large icon]     |                           |
|  |                  |                           |
|  | Template Name    |                           |
|  |                  |                           |
|  | "Most used"      |                           |
|  +------------------+                           |
|  Larger card format for featured templates      |
|  Hover: scale(1.02), shadow                     |
+-------------------------------------------------+
```

---

## Loading States

### Template List Loading

```
+-- ISSUE TEMPLATES (Loading) ------------------------------------------+
|                                                                       |
|  +-- [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~] --+   |
|  | [shimmer~~~~~~~~~~~]  |  [shimmer~~~~~~]  |  [shimmer~~~~]    |   |
|  | [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]             |   |
|  +----------------------------------------------------------------+   |
|                                                                       |
|  +-- [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~] --+   |
|  | [shimmer~~~~~~~~~~~]  |  [shimmer~~~~~~]  |  [shimmer~~~~]    |   |
|  +----------------------------------------------------------------+   |
|                                                                       |
|  +-- [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~] --+   |
|  | [shimmer~~~~~~~~~~~]  |  [shimmer~~~~~~]  |  [shimmer~~~~]    |   |
|  +----------------------------------------------------------------+   |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Template Selection Loading

```
+-- SUGGESTED TEMPLATES (Loading) --------------------------+
|                                                           |
|  +~~~~~~~~~~~~~+  +~~~~~~~~~~~~~+  +~~~~~~~~~~~~~+        |
|  | [shimmer]   |  | [shimmer]   |  | [shimmer]   |        |
|  | [shimmer]   |  | [shimmer]   |  | [shimmer]   |        |
|  | [shimmer]   |  | [shimmer]   |  | [shimmer]   |        |
|  +~~~~~~~~~~~~~+  +~~~~~~~~~~~~~+  +~~~~~~~~~~~~~+        |
|                                                           |
+-----------------------------------------------------------+
```

---

## Empty States

### No Templates Created

```
+===============================================================+
|                                                               |
| ISSUE TEMPLATES                            [ + Create ]       |
|                                                               |
+===============================================================+
|                                                               |
|                    [illustration]                             |
|                                                               |
|           No issue templates yet                              |
|                                                               |
|    Templates help your team create consistent                 |
|    support tickets with guided prompts and                    |
|    pre-filled defaults for battery support issues.            |
|                                                               |
|    [ + Create First Template ]                                |
|                                                               |
+===============================================================+
```

### No Matching Templates (Search)

```
+===============================================================+
|                                                               |
| [Search: "warranty extension"]                                |
|                                                               |
+===============================================================+
|                                                               |
|                    [search icon]                              |
|                                                               |
|           No templates match "warranty extension"             |
|                                                               |
|    Try a different search term or                             |
|    [ Create New Template ]                                    |
|                                                               |
+===============================================================+
```

---

## Error States

### Failed to Load Templates

```
+===============================================================+
|                                                               |
| [!] Unable to load templates                                  |
|                                                               |
| There was a problem loading issue templates.                  |
| Please try again.                                             |
|                                                               |
| [Retry]                                                       |
|                                                               |
+===============================================================+
```

### Failed to Save Template

```
+================================================================+
| [!] Template Save Failed                                       |
+================================================================+
|                                                                |
|  Could not save the template.                                  |
|                                                                |
|  Error: A template with this name already exists.              |
|                                                                |
|  [ Dismiss ]  [ Try Again ]                                    |
|                                                                |
+================================================================+
```

---

## Success States

### Template Created

```
+================================================================+
| [success] Template Created                                     |
|                                                                |
| "Battery Not Charging to Full Capacity" is now available.      |
|                                                                |
| [ Dismiss ]                                                    |
+================================================================+
```

### Issue Created From Template

```
+================================================================+
| [success] Issue Created                                        |
|                                                                |
| ISS-1300 has been created from "Battery Not Charging".         |
| Assigned to: Battery Support Team                              |
| SLA: Critical Support (4h response)                            |
|                                                                |
| [ View Issue ]  [ Create Another ]                             |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// Template List
<section
  role="region"
  aria-label="Issue templates"
>
  <h2>Issue Templates</h2>
  <div role="list" aria-label="Available templates">
    <article
      role="listitem"
      aria-label="Battery Not Charging to Full Capacity template, Claim type, High priority, 156 uses, Active"
    >
      <!-- Template card content -->
    </article>
  </div>
</section>

// Template Selection Grid
<div
  role="radiogroup"
  aria-label="Select an issue template"
>
  <div
    role="radio"
    aria-checked={isSelected}
    tabIndex={isSelected ? 0 : -1}
    aria-label="Battery Not Charging to Full Capacity template, Most used"
  >
    <!-- Template card -->
  </div>
</div>

// Create Issue Form
<form aria-label="Create issue from Battery Not Charging to Full Capacity template">
  <fieldset>
    <legend>Issue Details</legend>
    <!-- Form fields -->
  </fieldset>
</form>

// Description Prompts
<div
  role="group"
  aria-labelledby="description-prompts-label"
>
  <span id="description-prompts-label">
    Answer the following questions in your description:
  </span>
  <textarea
    aria-describedby="prompt-list"
    placeholder="Follow the prompts below..."
  />
  <ul id="prompt-list">
    <li>Battery serial number (on unit label)</li>
    <li>Date of installation (DD/MM/YYYY)</li>
    <li>Current State of Health (SoH) reading</li>
    <li>What is the maximum charge capacity reached?</li>
    <li>Inverter error logs (if available)</li>
  </ul>
</div>
```

### Keyboard Navigation

```
Template List (Settings):
1. Tab to search field
2. Tab to filter dropdowns
3. Tab to each template card
4. Enter/Space on card: opens edit dialog
5. Tab to Edit button within card
6. Tab to Disable/Enable button
7. Tab to Create Template button

Template Selection:
1. Focus moves to first suggested template
2. Arrow keys navigate between template cards
3. Enter/Space selects template
4. Tab moves to search field
5. Tab to "Create Blank Issue" button
6. Escape closes picker

Create Issue Form:
1. Focus on first required field (Customer)
2. Tab through form fields in order
3. Tab to priority buttons (radio group behavior)
4. Tab to Create button
5. Enter submits form
```

### Screen Reader Announcements

```
On template list load:
  "Issue templates. 8 templates available.
   Most used: Battery Not Charging to Full Capacity, 156 uses."

On template selection:
  "Selected Battery Not Charging to Full Capacity template.
   Issue type: Claim, Priority: High.
   5 description prompts, 5 required fields."

On form load with template:
  "Create issue form. Using Battery Not Charging to Full Capacity template.
   5 required fields: Customer, Order, Serial Number, Installation Date, Description."

On issue creation:
  "Issue ISS-1300 created successfully from Battery Not Charging to Full Capacity template.
   Assigned to Battery Support Team. SLA: Critical Support."
```

---

## Animation Choreography

### Template Selection

```
Card Selection Animation:

FRAME 1 (0ms):
  Card at rest (white background)

FRAME 2 (100ms):
  Background transitions to orange-50
  Border appears (orange-500)

FRAME 3 (200ms):
  Card scales slightly (1.02)
  Ring shadow appears

Duration: 200ms
Easing: ease-out
```

### Form Pre-fill from Template

```
Field Population Animation:

FRAME 1: Empty form fields
FRAME 2 (0-100ms): Type field populates (fade in)
FRAME 3 (100-200ms): Priority highlights selected option
FRAME 4 (200-400ms): Description prompts appear one by one
FRAME 5 (400-500ms): Required field indicators appear

Duration: 500ms total
Staggered: 100ms per field
```

### Usage Counter Update

```
Counter Increment Animation:

On successful issue creation:
FRAME 1: Current count "156"
FRAME 2 (0-150ms): Number scales up slightly
FRAME 3 (150-300ms): Counter animates to "157"
FRAME 4 (300-400ms): Brief highlight pulse

Duration: 400ms
Only visible on template list page
```

---

## Component Props Interface

```typescript
// Issue Template
interface IssueTemplate {
  id: string;
  name: string;
  type: IssueType;
  defaultPriority: Priority;
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;
  descriptionPrompts: string[];
  requiredFields: RequiredField[];
  slaPolicyId?: string;
  slaPolicyName?: string;
  usageCount: number;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

type IssueType = 'claim' | 'return' | 'question' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type RequiredField =
  | 'customer'
  | 'order'
  | 'serial_number'
  | 'installation_date'
  | 'soh_reading'
  | 'description'
  | 'attachments'
  | 'priority'
  | 'installer_cec_number';

// Template List
interface TemplateListProps {
  templates: IssueTemplate[];
  onEdit: (templateId: string) => void;
  onCreate: () => void;
  onToggleActive: (templateId: string, active: boolean) => void;
  onDuplicate: (templateId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  typeFilter?: IssueType | 'all';
  onTypeFilterChange?: (type: IssueType | 'all') => void;
  sortBy?: 'usage' | 'name' | 'created';
  onSortChange?: (sort: 'usage' | 'name' | 'created') => void;
  isLoading?: boolean;
}

// Template Card
interface TemplateCardProps {
  template: IssueTemplate;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onDuplicate: () => void;
  variant?: 'list' | 'grid';
}

// Create/Edit Template Dialog
interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template?: IssueTemplate; // Undefined for create, defined for edit
  onSave: (data: TemplateFormData) => Promise<void>;
  assignees: Array<{ id: string; name: string; type: 'user' | 'team' }>;
  slaPolicies: Array<{ id: string; name: string; description: string }>;
  isSubmitting?: boolean;
}

interface TemplateFormData {
  name: string;
  type: IssueType;
  defaultPriority: Priority;
  defaultAssigneeId?: string;
  descriptionPrompts: string[];
  requiredFields: RequiredField[];
  slaPolicyId?: string;
  isActive: boolean;
}

// Template Picker (for issue creation)
interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  onCreateBlank: () => void;
  suggestedTemplates: IssueTemplate[];
  allTemplates: IssueTemplate[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
}

// Template Picker Card
interface TemplatePickerCardProps {
  template: IssueTemplate;
  isSelected: boolean;
  isSuggested: boolean;
  onClick: () => void;
}

// Create Issue From Template Form
interface CreateIssueFromTemplateProps {
  template: IssueTemplate;
  onSubmit: (data: CreateIssueData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface CreateIssueData {
  templateId: string;
  customerId: string;
  orderId?: string;
  subject: string;
  description: string;
  serialNumber: string;
  installationDate: Date;
  sohReading?: number; // 0-100 percentage
  installerCecNumber?: string;
  priority: Priority;
  attachments?: File[];
}

// Prompt Editor (for template creation)
interface PromptEditorProps {
  prompts: string[];
  onChange: (prompts: string[]) => void;
  maxPrompts?: number;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Template list load | < 300ms | Settings page |
| Template picker load | < 200ms | Create issue modal |
| Template selection | < 100ms | Visual feedback |
| Form pre-fill | < 200ms | From selection to form populated |
| Issue creation | < 2s | From submit to success |
| Template save | < 1s | Create or update |

---

## Related Wireframes

- [Issue List](./support-issue-list.wireframe.md) - Create issue button
- [Issue Detail](./support-issue-detail.wireframe.md) - Template-based issue view
- [Support Settings](./support-settings.wireframe.md) - Template management location
- [Support SLA Tracking](./support-sla-tracking.wireframe.md) - SLA policy assignment

---

**Document Version:** v1.1
**Created:** 2026-01-10
**Updated:** 2026-01-10 - Added Renoz battery support context
**Author:** UI Skill
