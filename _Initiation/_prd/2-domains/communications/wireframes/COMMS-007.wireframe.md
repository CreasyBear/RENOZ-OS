# Wireframe: DOM-COMMS-007 - Custom Email Templates Management

## Story Reference

- **Story ID**: DOM-COMMS-007
- **Name**: Add Custom Email Templates Management
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: TemplateEditor with CategoryTabs and VersionHistory

## Overview

Database-stored custom email templates with visual editor, complementing existing React Email templates. Includes CRUD operations, rich text editor with variable insertion, preview with sample data, template categories, cloning, and version history.

## UI Patterns (Reference Implementation)

### TemplateEditor
- **Pattern**: RE-UI Form + RichTextEditor + SplitView
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`, custom RichTextEditor component
- **Features**:
  - Split-pane layout: Editor on left, live preview on right
  - Template name, category, and subject line inputs
  - Variable insertion dropdown with customer/custom fields
  - Auto-save draft with visual indicator

### CategoryTabs
- **Pattern**: RE-UI Tabs + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Filter tabs: All, Sales, Support, Custom
  - Count badges showing number of templates per category
  - Active tab indicator with smooth underline animation
  - Responsive collapse to dropdown on mobile

### TemplateCard
- **Pattern**: RE-UI Card + Badge + HoverCard
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`, `_reference/.reui-reference/registry/default/ui/hover-card.tsx`
- **Features**:
  - Template name with version badge (v1, v2, etc.)
  - Status badge: Active, Draft, Archived
  - System vs Custom indicator
  - Quick actions: Edit, Clone, View History, Delete

### VariableToolbar
- **Pattern**: RE-UI DropdownMenu + Combobox
- **Reference**: `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`, `_reference/.reui-reference/registry/default/ui/combobox.tsx`
- **Features**:
  - Grouped variable categories (Customer, Order, Custom)
  - Search/filter variables by name
  - Click to insert variable at cursor position
  - Add custom variable dialog with name/description

### VersionHistory
- **Pattern**: RE-UI Dialog + Timeline + Diff View
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, custom Timeline component
- **Features**:
  - Chronological version list with timestamps and authors
  - Change summary for each version
  - Compare mode showing side-by-side diff
  - Restore version button with confirmation dialog

---

## Mobile Wireframe (375px)

### Template List View

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Emails] [Templates] [Campaigns]        |
|          =========                      |
+-----------------------------------------+
|                                         |
|  Email Templates               [+New]   |
|  ─────────────────────────────────────  |
|                                         |
|  [All] [Sales] [Support] [Custom]       |
|   ===                                   |
|                                         |
|  SYSTEM TEMPLATES                       |
|  +-------------------------------------+|
|  | Quote Sent                    [v4]  ||
|  | Sends quote details to customer     ||
|  |                                     ||
|  | [Sales]                             ||
|  |                        [View] [Clone]||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Order Confirmation            [v3]  ||
|  | Confirms order placement            ||
|  |                                     ||
|  | [Sales]                             ||
|  |                        [View] [Clone]||
|  +-------------------------------------+|
|                                         |
|  CUSTOM TEMPLATES                       |
|  +-------------------------------------+|
|  | Holiday Promotion             [v2]  ||
|  | Seasonal sale announcement          ||
|  |                                     ||
|  | [Custom]           [*Active]        ||
|  |                  [Edit] [...]       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | VIP Welcome                   [v1]  ||
|  | Welcome email for VIP customers     ||
|  |                                     ||
|  | [Custom]           [*Active]        ||
|  |                  [Edit] [...]       ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Template Editor (Full Screen)

```
+=========================================+
| Edit Template                     [X]   |
+-----------------------------------------+
|                                         |
|  Template Name *                        |
|  +-------------------------------------+|
|  | Holiday Promotion                   ||
|  +-------------------------------------+|
|                                         |
|  Category                               |
|  +----------------------------------v--+|
|  | Custom                              ||
|  +-------------------------------------+|
|                                         |
|  Subject Line *                         |
|  +-------------------------------------+|
|  | [gift] Holiday Sale: {{discount}}%  ||
|  | off!                                ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  BODY                                   |
|  +-------------------------------------+|
|  | [B] [I] | [Link] [Img] [Var v]      ||
|  |-------------------------------------|
|  |                                     ||
|  | Hi {{firstName}},                   ||
|  |                                     ||
|  | We're excited to announce our       ||
|  | holiday sale! Get {{discount}}%     ||
|  | off all orders.                     ||
|  |                                     ||
|  | Shop Now: {{shopUrl}}               ||
|  |                                     ||
|  | Happy Holidays,                     ||
|  | The Renoz Team                      ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [Preview with Sample Data]             |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [Save Draft]  [Publish]        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Variable Insertion Menu (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  INSERT VARIABLE                        |
|  ─────────────────────────────────────  |
|                                         |
|  CUSTOMER                               |
|  +-------------------------------------+|
|  | {{firstName}}   First name          ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | {{lastName}}    Last name           ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | {{companyName}} Company             ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | {{email}}       Email address       ||
|  +-------------------------------------+|
|                                         |
|  CUSTOM                                 |
|  +-------------------------------------+|
|  | {{discount}}    Discount %          ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | {{shopUrl}}     Shop link           ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | + Add Custom Variable               ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Template Preview (Full Screen)

```
+=========================================+
| Preview Template                  [X]   |
+-----------------------------------------+
|                                         |
|  Preview with sample data               |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | To: john@acme.com                   ||
|  | Subject: Holiday Sale: 25% off!     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [Renoz Logo]                       ||
|  |                                     ||
|  |  Hi John,                           ||
|  |                                     ||
|  |  We're excited to announce our      ||
|  |  holiday sale! Get 25% off all      ||
|  |  orders.                            ||
|  |                                     ||
|  |  [Shop Now]                         ||
|  |                                     ||
|  |  Happy Holidays,                    ||
|  |  The Renoz Team                     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  SAMPLE DATA                            |
|  +-------------------------------------+|
|  | firstName: John                     ||
|  | discount: 25                        ||
|  | shopUrl: https://shop.renoz.com     ||
|  |                                     ||
|  | [Edit Sample Data]                  ||
|  +-------------------------------------+|
|                                         |
|  [Send Test Email]                      |
|                                         |
+=========================================+
```

### Version History (Full Screen)

```
+=========================================+
| Version History                   [X]   |
+-----------------------------------------+
|                                         |
|  Holiday Promotion                      |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | v2 (Current)            [*Active]   ||
|  |                                     ||
|  | Jan 10, 2026 at 3:45 PM             ||
|  | By: Joel Chan                       ||
|  |                                     ||
|  | Changes: Updated discount to 25%    ||
|  |                                     ||
|  |          [View] [Compare]           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | v1                                  ||
|  |                                     ||
|  | Jan 5, 2026 at 10:00 AM             ||
|  | By: Sarah Kim                       ||
|  |                                     ||
|  | Changes: Initial version            ||
|  |                                     ||
|  |          [View] [Restore]           ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Emails] [Templates] [Campaigns]        |
|          =========                      |
+-----------------------------------------+
|                                         |
|  CUSTOM TEMPLATES                       |
|                                         |
|            +-------------+              |
|            |   [mail]    |              |
|            +-------------+              |
|                                         |
|      No Custom Templates                |
|                                         |
|   Create custom templates to send       |
|   personalized emails. Use variables    |
|   to dynamically insert customer        |
|   information.                          |
|                                         |
|   +-------------------------------+     |
|   |                               |     |
|   |    [Create Template]          |     |
|   |                               |     |
|   +-------------------------------+     |
|                                         |
+=========================================+
```

### Loading Skeleton (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Emails] [Templates] [Campaigns]        |
|          =========                      |
+-----------------------------------------+
|                                         |
|  Email Templates                        |
|  ─────────────────────────────────────  |
|                                         |
|  [...] [.....] [.......] [......]       |
|                                         |
|  +-------------------------------------+|
|  | .........................   [...]   ||
|  | .............................       ||
|  |                                     ||
|  | [......]                            ||
|  |                     [...] [....]    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | .........................   [...]   ||
|  | .............................       ||
|  |                                     ||
|  | [......]                            ||
|  |                     [...] [....]    ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Template List with Preview Panel

```
+=========================================================================+
| Communications                                                           |
+-------------------------------------------------------------------------+
| [Summary] [Emails] [Templates] [Campaigns] [Calls]                       |
|                     =========                                            |
+-------------------------------------------------------------------------+
|                                                                          |
|  Email Templates                                   [+ Create Template]   |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  [All] [Sales] [Support] [Custom]                                        |
|   ===                                                                    |
|                                                                          |
|  +-- TEMPLATE LIST ---------------------+  +-- PREVIEW ----------------+ |
|  |                                      |  |                           | |
|  | +----------------------------------+ |  |  Quote Sent (v4)          | |
|  | |*Quote Sent            [v4]       | |  |                           | |
|  | | Sends quote to customer          | |  |  Subject:                 | |
|  | | [Sales]                          | |  |  Your Quote from Renoz    | |
|  | +----------------------------------+ |  |                           | |
|  |                                      |  |  +---------------------+  | |
|  | +----------------------------------+ |  |  |                     |  | |
|  | | Order Confirmation      [v3]     | |  |  |  [Renoz Logo]       |  | |
|  | | Confirms order placement         | |  |  |                     |  | |
|  | | [Sales]                          | |  |  |  Hi {{firstName}},  |  | |
|  | +----------------------------------+ |  |  |                     |  | |
|  |                                      |  |  |  Here's your quote  |  | |
|  | +----------------------------------+ |  |  |  for {{quoteName}}  |  | |
|  | | Holiday Promotion       [v2]     | |  |  |                     |  | |
|  | | Seasonal sale announcement       | |  |  |  [View Quote]       |  | |
|  | | [Custom]       [Active]          | |  |  |                     |  | |
|  | +----------------------------------+ |  |  +---------------------+  | |
|  |                                      |  |                           | |
|  | +----------------------------------+ |  |  Variables used:          | |
|  | | VIP Welcome             [v1]     | |  |  firstName, quoteName,    | |
|  | | Welcome for VIP customers        | |  |  quoteLink                | |
|  | | [Custom]       [Active]          | |  |                           | |
|  | +----------------------------------+ |  |  [Edit] [Clone] [History] | |
|  +--------------------------------------+  +---------------------------+ |
|                                                                          |
+=========================================================================+
```

### Template Editor (Split View)

```
+=========================================================================+
| Edit: Holiday Promotion                                            [X]   |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-- EDITOR -----------------------------+  +-- PREVIEW ---------------+ |
|  |                                       |  |                          | |
|  |  Template Name *                      |  |  Live Preview            | |
|  |  +--------------------------------+   |  |                          | |
|  |  | Holiday Promotion              |   |  |  +--------------------+  | |
|  |  +--------------------------------+   |  |  |                    |  | |
|  |                                       |  |  |  [Renoz Logo]      |  | |
|  |  Category          Subject Line      |  |  |                    |  | |
|  |  +------------+   +---------------+   |  |  |  Hi John,          |  | |
|  |  | Custom   v |   | [gift] Holiday|   |  |  |                    |  | |
|  |  +------------+   +---------------+   |  |  |  Get 25% off!      |  | |
|  |                                       |  |  |                    |  | |
|  |  Body                                 |  |  |  [Shop Now]        |  | |
|  |  +--------------------------------+   |  |  |                    |  | |
|  |  | [B][I][U] | [Link][Img][Var v] |   |  |  +--------------------+  | |
|  |  +--------------------------------+   |  |                          | |
|  |  +--------------------------------+   |  |  Sample Data:            | |
|  |  |                                |   |  |  firstName: John         | |
|  |  | Hi {{firstName}},              |   |  |  discount: 25            | |
|  |  |                                |   |  |  [Edit]                  | |
|  |  | We're excited...               |   |  |                          | |
|  |  |                                |   |  +---------------------------+
|  |  | Get {{discount}}% off!         |   |                            |
|  |  |                                |   |                            |
|  |  +--------------------------------+   |                            |
|  |                                       |                            |
|  +---------------------------------------+                            |
|                                                                          |
|  [Version History]            ( Save Draft )  [ Publish Changes ]       |
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Templates Tab - Three Column Layout

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Communications > Templates                                                            |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  +-- CATEGORIES --+  +-- TEMPLATE LIST -----------------+  +-- PREVIEW --------------+|
| Jobs        |  |                |  |                                  |  |                          ||
| Pipeline    |  | [All]     (12) |  | [+ Create Template]              |  |  Quote Sent              ||
| Support     |  | [Sales]    (5) |  |                                  |  |  Version 4               ||
| Communi..   |  | [Support]  (3) |  | [Search____________]             |  |                          ||
|   <         |  | [Custom]   (4) |  |                                  |  |  Subject:                ||
|             |  |                |  | SYSTEM                           |  |  Your Quote from Renoz   ||
|             |  | ────────────   |  | +------------------------------+ |  |                          ||
|             |  |                |  | | Quote Sent          [v4]     | |  |  +--------------------+  ||
|             |  | QUICK ACTIONS  |  | | Sends quote to customer      | |  |  |                    |  ||
|             |  | [+ New]        |  | | [Sales]      [View][Clone]   | |  |  |  [Renoz Logo]      |  ||
|             |  | [Import]       |  | +------------------------------+ |  |  |                    |  ||
|             |  |                |  |                                  |  |  |  Hi {{firstName}}, |  ||
|             |  +----------------+  | +------------------------------+ |  |  |                    |  ||
|             |                      | | Order Confirmation   [v3]    | |  |  |  Here's your quote |  ||
|             |                      | | Confirms order placement     | |  |  |  for {{quoteName}}:|  ||
|             |                      | | [Sales]      [View][Clone]   | |  |  |  {{quoteTotal}}    |  ||
|             |                      | +------------------------------+ |  |  |                    |  ||
|             |                      |                                  |  |  |  [View Quote]      |  ||
|             |                      | CUSTOM                           |  |  |                    |  ||
|             |                      | +------------------------------+ |  |  +--------------------+  ||
|             |                      | | Holiday Promotion   [v2] [*] | |  |                          ||
|             |                      | | Seasonal sale announcement   | |  |  Variables:              ||
|             |                      | | [Custom] [Edit][...][History]| |  |  firstName, quoteName,   ||
|             |                      | +------------------------------+ |  |  quoteTotal, quoteLink   ||
|             |                      |                                  |  |                          ||
|             |                      | +------------------------------+ |  |  Used: 156 times         ||
|             |                      | | VIP Welcome         [v1] [*] | |  |  Open rate: 57.1%        ||
|             |                      | | Welcome for VIP customers    | |  |                          ||
|             |                      | | [Custom] [Edit][...][History]| |  |  [Edit] [Clone] [Test]   ||
|             |                      | +------------------------------+ |  |  [View History]          ||
|             |                      +----------------------------------+  +---------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Template Editor (Full Page)

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Templates                                                                   |
| Customers   |                                                                                        |
| Orders      |  Edit: Holiday Promotion                                 [Version History] [Preview]   |
| Products    |  ─────────────────────────────────────────────────────────────────────────────────     |
| Jobs        |                                                                                        |
| Pipeline    |  +-- TEMPLATE DETAILS ----------------------------+  +-- LIVE PREVIEW ---------------+|
| Support     |  |                                                 |  |                               ||
| Communi..   |  |  Template Name *            Category            |  |  +---------------------------+||
|             |  |  +-------------------------+ +---------------+  |  |  |                           |||
|             |  |  | Holiday Promotion       | | Custom      v |  |  |  |  [Renoz Logo]             |||
|             |  |  +-------------------------+ +---------------+  |  |  |                           |||
|             |  |                                                 |  |  |  [gift] Holiday Sale!     |||
|             |  |  Subject Line *                                 |  |  |                           |||
|             |  |  +--------------------------------------------+ |  |  |  Hi John,                 |||
|             |  |  | [gift] Holiday Sale: {{discount}}% off!    | |  |  |                           |||
|             |  |  +--------------------------------------------+ |  |  |  We're excited to         |||
|             |  |                                                 |  |  |  announce our holiday     |||
|             |  +--------------------------------------------------  |  |  sale! Get 25% off all    |||
|             |                                                       |  |  orders.                  |||
|             |  +-- BODY EDITOR ----------------------------------+  |  |                           |||
|             |  |                                                 |  |  |  [Shop Now]               |||
|             |  |  +--------------------------------------------+|  |  |                           |||
|             |  |  | [B] [I] [U] [S] | [H1] [H2] | [Link] [Img]  ||  |  |  Happy Holidays,          |||
|             |  |  | [List] [Quote] | [Color v] | [Variable v]   ||  |  |  The Renoz Team           |||
|             |  |  +--------------------------------------------+|  |  |                           |||
|             |  |                                                 |  |  +---------------------------+||
|             |  |  Hi {{firstName}},                              |  |                               ||
|             |  |                                                 |  |  SAMPLE DATA                  ||
|             |  |  We're excited to announce our holiday sale!    |  |  +---------------------------+||
|             |  |  Get {{discount}}% off all orders.              |  |  | firstName: John           |||
|             |  |                                                 |  |  | lastName: Smith           |||
|             |  |  [Shop Now]({{shopUrl}})                        |  |  | discount: 25              |||
|             |  |                                                 |  |  | shopUrl: https://shop...  |||
|             |  |  Happy Holidays,                                |  |  +---------------------------+||
|             |  |  The Renoz Team                                 |  |  [Edit Sample Data]           ||
|             |  |                                                 |  |                               ||
|             |  +--------------------------------------------------  +-------------------------------+|
|             |                                                                                        |
|             |  +-- VARIABLES USED ----------------------------------------------------------------+  |
|             |  |  {{firstName}}  {{lastName}}  {{discount}}  {{shopUrl}}                          |  |
|             |  |                                                        [+ Add Custom Variable]   |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |                          [Delete Draft]  ( Save Draft )  [ Publish Changes ]          |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Version History Panel

```
+============================================================================+
| Version History: Holiday Promotion                                    [X]   |
+=============================================================================+
|                                                                             |
|  +-- VERSION LIST -----------------------------+  +-- COMPARISON ----------+|
|  |                                             |  |                        ||
|  |  +---------------------------------------+  |  |  v2 vs v1 Changes:     ||
|  |  | v2 (Current)              [*Active]   |  |  |                        ||
|  |  |                                       |  |  |  Subject:              ||
|  |  | Jan 10, 2026 at 3:45 PM               |  |  |  - "20% off!"          ||
|  |  | By: Joel Chan                         |  |  |  + "25% off!"          ||
|  |  |                                       |  |  |                        ||
|  |  | Message: Updated discount percentage  |  |  |  Body:                 ||
|  |  |                                       |  |  |  Line 5:               ||
|  |  |      [View]  [Compare with v1]        |  |  |  - Get 20% off         ||
|  |  +---------------------------------------+  |  |  + Get 25% off         ||
|  |                                             |  |                        ||
|  |  +---------------------------------------+  |  |                        ||
|  |  | v1                                    |  |  |                        ||
|  |  |                                       |  |  |                        ||
|  |  | Jan 5, 2026 at 10:00 AM               |  |  |                        ||
|  |  | By: Sarah Kim                         |  |  |                        ||
|  |  |                                       |  |  |                        ||
|  |  | Message: Initial template creation    |  |  |                        ||
|  |  |                                       |  |  |                        ||
|  |  |      [View]  [Restore this version]   |  |  |                        ||
|  |  +---------------------------------------+  |  |                        ||
|  |                                             |  |                        ||
|  +---------------------------------------------+  +------------------------+|
|                                                                             |
+=============================================================================+
```

---

## Interaction States

### Loading States

```
TEMPLATE LIST LOADING:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  | ...................... [...]     ||
|  | ..........................       ||
|  | [........]                       ||
|  +----------------------------------+|
|                                      |
|  +----------------------------------+|
|  | ...................... [...]     ||
|  | ..........................       ||
|  | [........]                       ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+
  ^ Shimmer animation

PREVIEW RENDERING:
+--------------------------------------+
|  PREVIEW                             |
|  +----------------------------------+|
|  |                                  ||
|  |     Rendering preview...         ||
|  |                                  ||
|  |     [spinner]                    ||
|  |                                  ||
|  +----------------------------------+|
+--------------------------------------+

PUBLISHING:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  |     [spinner]                    ||
|  |     Publishing template...       ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+
```

### Empty States

```
NO CUSTOM TEMPLATES:
+--------------------------------------+
|  CUSTOM TEMPLATES                    |
|                                      |
|          +------------+              |
|          |  [mail]    |              |
|          +------------+              |
|                                      |
|    No Custom Templates               |
|                                      |
|  Create your own email templates     |
|  with custom content and variables.  |
|                                      |
|      [Create Template]               |
|                                      |
+--------------------------------------+

NO SEARCH RESULTS:
+--------------------------------------+
|                                      |
|  No templates matching "xyz"         |
|                                      |
|  Try a different search term or      |
|  [Create Template "xyz"]             |
|                                      |
+--------------------------------------+

NO VERSION HISTORY:
+--------------------------------------+
|  VERSION HISTORY                     |
|                                      |
|  +----------------------------------+|
|  | v1 (Current)        [*Active]    ||
|  |                                  ||
|  | Created: Just now               ||
|  | By: Joel Chan                    ||
|  |                                  ||
|  | No previous versions available.  ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+
```

### Error States

```
SAVE FAILED:
+--------------------------------------+
|                                      |
|  [!] Failed to save template         |
|                                      |
|  Please check your connection        |
|  and try again.                      |
|                                      |
|  [Retry]                             |
|                                      |
+--------------------------------------+

INVALID VARIABLE:
+--------------------------------------+
|                                      |
|  [!] Invalid variable: {{unknown}}   |
|                                      |
|  This variable is not defined.       |
|  Did you mean {{firstName}}?         |
|                                      |
|  [Fix Variable]  [Add as Custom]     |
|                                      |
+--------------------------------------+

TEMPLATE NAME EXISTS:
+--------------------------------------+
|                                      |
|  [!] Template name already exists    |
|                                      |
|  A template named "Holiday Promo"    |
|  already exists. Please choose       |
|  a different name.                   |
|                                      |
+--------------------------------------+

RESTORE FAILED:
+--------------------------------------+
|                                      |
|  [!] Could not restore version       |
|                                      |
|  The selected version could not      |
|  be restored. Please try again.      |
|                                      |
|  [Retry]  [Cancel]                   |
|                                      |
+--------------------------------------+
```

### Success States

```
TEMPLATE PUBLISHED:
+--------------------------------------+
|                                      |
|  * Template Published                |
|                                      |
|  "Holiday Promotion" is now          |
|  available for use.                  |
|                                      |
+--------------------------------------+

TEMPLATE CLONED:
+--------------------------------------+
|                                      |
|  * Template Cloned                   |
|                                      |
|  "Holiday Promotion (Copy)" created. |
|                                      |
|  [Edit Clone]                        |
|                                      |
+--------------------------------------+

VERSION RESTORED:
+--------------------------------------+
|                                      |
|  * Version Restored                  |
|                                      |
|  Template restored to v1.            |
|  New version v3 created.             |
|                                      |
+--------------------------------------+

TEST EMAIL SENT:
+--------------------------------------+
|                                      |
|  * Test Email Sent                   |
|                                      |
|  Check your inbox at                 |
|  joel@renoz.com                      |
|                                      |
+--------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Template List**
   - Category tabs
   - Create button
   - Search input
   - Template cards (Tab through)
   - Action buttons within cards

2. **Template Editor**
   - Template name -> Category -> Subject
   - Editor toolbar -> Editor content
   - Variable toolbar
   - Action buttons (Save, Publish)

3. **Version History**
   - Version list items
   - View/Compare/Restore buttons
   - Close button

### ARIA Requirements

```html
<!-- Category Tabs -->
<div role="tablist" aria-label="Template categories">
  <button
    role="tab"
    aria-selected="true"
    aria-controls="all-templates"
  >All (12)</button>
  <button
    role="tab"
    aria-selected="false"
    aria-controls="sales-templates"
  >Sales (5)</button>
</div>

<div
  role="tabpanel"
  id="all-templates"
  aria-labelledby="all-tab"
>
  <!-- Template list -->
</div>

<!-- Template Card -->
<article
  role="article"
  aria-labelledby="template-1-name"
>
  <h3 id="template-1-name">Holiday Promotion</h3>
  <span aria-label="Version 2">v2</span>
  <span role="status" aria-label="Active template">Active</span>
  <p>Seasonal sale announcement</p>
  <div role="group" aria-label="Template actions">
    <button aria-label="Edit Holiday Promotion">Edit</button>
    <button aria-label="Clone Holiday Promotion">Clone</button>
    <button aria-label="View version history">History</button>
  </div>
</article>

<!-- Variable Insertion -->
<button
  aria-haspopup="menu"
  aria-expanded="false"
  aria-label="Insert variable"
>
  Variable
</button>

<menu role="menu" aria-label="Available variables">
  <div role="group" aria-label="Customer variables">
    <button role="menuitem">{{firstName}} - First name</button>
    <button role="menuitem">{{lastName}} - Last name</button>
  </div>
</menu>

<!-- Rich Text Editor -->
<div
  role="application"
  aria-label="Template body editor"
>
  <div
    role="toolbar"
    aria-label="Formatting options"
  >
    <button aria-label="Bold" aria-pressed="false">[B]</button>
    <!-- ... -->
  </div>

  <div
    role="textbox"
    aria-multiline="true"
    aria-label="Email body content"
    contenteditable="true"
  >
    Hi {{firstName}}...
  </div>
</div>

<!-- Preview Panel -->
<section
  aria-labelledby="preview-heading"
  aria-live="polite"
>
  <h2 id="preview-heading">Live Preview</h2>
  <!-- Preview content -->
</section>

<!-- Version History -->
<ol
  role="list"
  aria-label="Version history, newest first"
>
  <li aria-label="Version 2, current, created January 10 by Joel Chan">
    <span>v2 (Current)</span>
    <time datetime="2026-01-10T15:45:00">Jan 10, 2026</time>
    <span>By: Joel Chan</span>
  </li>
</ol>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | List | Navigate between templates |
| Enter | Template card | Open editor |
| Tab | Editor | Move through toolbar |
| Enter | Toolbar button | Apply format |
| Ctrl+S | Editor | Save draft |
| Ctrl+Shift+P | Editor | Publish |
| Escape | Variable menu | Close menu |
| Arrow Up/Down | Variable menu | Navigate options |
| Enter | Variable | Insert variable |

### Screen Reader Announcements

- Category changed: "Showing 5 Sales templates"
- Template selected: "Holiday Promotion template selected, version 2, active"
- Variable inserted: "Variable firstName inserted"
- Format applied: "Bold formatting applied"
- Preview updated: "Preview updated with changes"
- Published: "Template Holiday Promotion published, version 3 created"

---

## Animation Choreography

### Category Tab Switch

```
SWITCH:
- Duration: 200ms
- Easing: ease-out
- Active indicator slides to new tab
- Content cross-fade

TAB HOVER:
- Duration: 100ms
- Background highlight
```

### Template Card

```
HOVER (Desktop):
- Duration: 150ms
- Shadow elevation
- Transform: translateY(-2px)

SELECT:
- Duration: 200ms
- Border highlight
- Scale: 1 -> 1.02 -> 1

DELETE:
- Duration: 200ms
- Opacity: 1 -> 0
- Height collapse
- Other cards slide up
```

### Editor

```
TOOLBAR BUTTON PRESS:
- Duration: 100ms
- Scale: 1 -> 0.95 -> 1
- Active state toggle

VARIABLE INSERT:
- Duration: 200ms
- Variable text highlights
- Cursor repositions after

PREVIEW UPDATE:
- Duration: 300ms
- Debounce: 500ms
- Content fade transition
```

### Version History

```
PANEL OPEN:
- Duration: 250ms
- Slide in from right
- Backdrop fade

COMPARE MODE:
- Duration: 300ms
- Diff highlights appear
- Green for additions
- Red for deletions

RESTORE:
- Duration: 400ms
- Version highlights
- Progress indication
- Success checkmark
```

### Variable Menu

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Scale Y: 0.95 -> 1
- Opacity: 0 -> 1

OPTION HOVER:
- Duration: 100ms
- Background highlight

SELECT:
- Duration: 150ms
- Menu closes
- Variable appears in editor
```

---

## Component Props Interfaces

```typescript
// TemplateEditorSkeleton
interface TemplateEditorSkeletonProps {
  /** Show full editor or list */
  variant?: 'editor' | 'list';
  /** Number of list items */
  listCount?: number;
}

// TemplateEditor
interface TemplateEditorProps {
  /** Template to edit (null for create) */
  template?: {
    id: string;
    name: string;
    category: string;
    subject: string;
    bodyHtml: string;
    variables: Array<{ name: string; description: string }>;
    version: number;
    isActive: boolean;
  };
  /** Available categories */
  categories: Array<{ value: string; label: string }>;
  /** Available system variables */
  systemVariables: Array<{ name: string; description: string }>;
  /** Save draft handler */
  onSaveDraft: (data: {
    name: string;
    category: string;
    subject: string;
    bodyHtml: string;
    variables: string[];
  }) => void;
  /** Publish handler */
  onPublish: (data: {
    name: string;
    category: string;
    subject: string;
    bodyHtml: string;
    variables: string[];
  }) => void;
  /** Send test email handler */
  onSendTest?: (email: string) => void;
  /** Saving state */
  isSaving?: boolean;
  /** Has unsaved changes */
  hasChanges?: boolean;
}

// CategoryTabs
interface CategoryTabsProps {
  /** Available categories with counts */
  categories: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  /** Selected category */
  value: string;
  /** Change handler */
  onChange: (category: string) => void;
}

// TemplateCard
interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description?: string;
    category: string;
    version: number;
    isActive: boolean;
    isSystem: boolean;
    usageCount?: number;
    lastUsed?: string;
  };
  /** Selected state */
  selected?: boolean;
  /** Select handler */
  onSelect?: () => void;
  /** Edit handler (custom templates) */
  onEdit?: () => void;
  /** Clone handler */
  onClone?: () => void;
  /** View history handler */
  onViewHistory?: () => void;
  /** Delete handler (custom templates) */
  onDelete?: () => void;
}

// VariableToolbar
interface VariableToolbarProps {
  /** System variables */
  systemVariables: Array<{ name: string; description: string; category: string }>;
  /** Custom variables */
  customVariables: Array<{ name: string; description: string }>;
  /** Insert handler */
  onInsert: (variableName: string) => void;
  /** Add custom variable handler */
  onAddCustom: () => void;
}

// PreviewPanel
interface PreviewPanelProps {
  /** Template subject */
  subject: string;
  /** Template HTML body */
  bodyHtml: string;
  /** Sample data for variable substitution */
  sampleData: Record<string, string>;
  /** Edit sample data handler */
  onEditSampleData: () => void;
  /** Send test email handler */
  onSendTest?: () => void;
  /** Loading state */
  isLoading?: boolean;
}

// VersionHistory
interface VersionHistoryProps {
  /** Template ID */
  templateId: string;
  /** Template name */
  templateName: string;
  /** Versions */
  versions: Array<{
    version: number;
    createdAt: string;
    createdBy: { id: string; name: string };
    message?: string;
    isCurrent: boolean;
  }>;
  /** View version handler */
  onViewVersion: (version: number) => void;
  /** Compare versions handler */
  onCompareVersions: (v1: number, v2: number) => void;
  /** Restore version handler */
  onRestoreVersion: (version: number) => void;
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

// SampleDataEditor
interface SampleDataEditorProps {
  /** Current sample data */
  data: Record<string, string>;
  /** Variables used in template */
  variables: string[];
  /** Save handler */
  onSave: (data: Record<string, string>) => void;
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

// TemplateList
interface TemplateListProps {
  /** Templates */
  templates: Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    version: number;
    isActive: boolean;
    isSystem: boolean;
  }>;
  /** Selected template ID */
  selectedId?: string;
  /** Select handler */
  onSelect: (id: string) => void;
  /** Edit handler */
  onEdit: (id: string) => void;
  /** Clone handler */
  onClone: (id: string) => void;
  /** Delete handler */
  onDelete: (id: string) => void;
  /** View history handler */
  onViewHistory: (id: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Search query */
  searchQuery?: string;
  /** Search change handler */
  onSearchChange?: (query: string) => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/template-editor.tsx` | Full template editor |
| `src/components/domain/communications/category-tabs.tsx` | Category filter tabs |
| `src/components/domain/communications/template-card.tsx` | Template list item |
| `src/components/domain/communications/variable-toolbar.tsx` | Variable insertion UI |
| `src/components/domain/communications/preview-panel.tsx` | Live preview |
| `src/components/domain/communications/version-history.tsx` | Version history dialog |
| `src/components/domain/communications/sample-data-editor.tsx` | Edit preview data |
| `src/components/domain/communications/template-list-skeleton.tsx` | Loading skeleton |
| `src/routes/_authed/communications/templates/index.tsx` | Template list route |
| `src/routes/_authed/communications/templates/$templateId.tsx` | Template editor route |
