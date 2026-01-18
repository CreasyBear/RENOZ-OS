# Wireframe: DOM-COMMS-006 - Email Signature Management

## Story Reference

- **Story ID**: DOM-COMMS-006
- **Name**: Add Email Signature Management
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: RichTextEditor with SignatureSelector

## Overview

Personal and company email signature management. Users can create personal signatures with a rich text editor, admins can manage company default signatures, and signatures can be selected/previewed in the email composer.

## UI Patterns (Reference Implementation)

### RichTextEditor
- **Pattern**: Custom editor based on Tiptap/ProseMirror
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/editor.tsx` (if available), otherwise RE-UI Textarea
- **Features**:
  - Floating toolbar with bold, italic, underline, link, image
  - Color picker for text/background customization
  - Alignment controls (left, center, right, justify)
  - Undo/redo with keyboard shortcuts (Ctrl+Z, Ctrl+Y)

### SignatureSelector
- **Pattern**: RE-UI Select + RadioGroup
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`, `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Dropdown showing personal + company signatures
  - Preview thumbnail for each signature option
  - "No Signature" option for plain emails
  - Auto-selects default signature on composer load

### SignaturePreview
- **Pattern**: RE-UI Card + ScrollArea
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/scroll-area.tsx`
- **Features**:
  - Live preview panel updating as user types in editor
  - Email context frame (To/Subject headers) for realistic preview
  - Sample data substitution for testing variables
  - Responsive preview adjusting to mobile/desktop widths

### SignatureCard
- **Pattern**: RE-UI Card + Badge + DropdownMenu
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`, `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`
- **Features**:
  - Signature name with "Default" star badge
  - Truncated preview (first 3 lines) with expand option
  - Role assignment display (Sales, Support, Admin)
  - Actions menu: Edit, Make Default, Clone, Delete

---

## Mobile Wireframe (375px)

### Settings - My Signature

```
+=========================================+
| < Settings                              |
+-----------------------------------------+
|                                         |
|  Email Signature                        |
|  ─────────────────────────────────────  |
|                                         |
|  Your personal email signature          |
|                                         |
|  +-------------------------------------+|
|  | [B] [I] [U] [Link] [---]            ||
|  |-------------------------------------|
|  |                                     ||
|  | Best regards,                       ||
|  |                                     ||
|  | Joel Chan                           ||
|  | Sales Manager                       ||
|  | Renoz Building Materials            ||
|  |                                     ||
|  | P: +1 555-0123                      ||
|  | E: joel@renoz.com                   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [x] Include in all outgoing emails     |
|                                         |
|  +-------------------------------------+|
|  | PREVIEW                             ||
|  |-------------------------------------|
|  |                                     ||
|  | Best regards,                       ||
|  |                                     ||
|  | Joel Chan                           ||
|  | Sales Manager                       ||
|  | Renoz Building Materials            ||
|  |                                     ||
|  | P: +1 555-0123                      ||
|  | E: joel@renoz.com                   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |         [Save Signature]            ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Rich Text Editor Toolbar (Mobile)

```
+=========================================+
|                                         |
|  +-------------------------------------+|
|  | [B] [I] [U] [S] [---] [More v]      ||
|  +-------------------------------------+|
|                                         |
|  More Options:                          |
|  +-------------------------------------+|
|  | [Link] Insert hyperlink             ||
|  | [Image] Add image                   ||
|  | [Color] Text color                  ||
|  | [Align] Text alignment              ||
|  | [Clear] Remove formatting           ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Email Composer - Signature Selection

```
+=========================================+
| Compose Email                     [X]   |
+-----------------------------------------+
|                                         |
|  To                                     |
|  +-------------------------------------+|
|  | john@acme.com                       ||
|  +-------------------------------------+|
|                                         |
|  Subject                                |
|  +-------------------------------------+|
|  | Following up on your order          ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  | Hi John,                            ||
|  |                                     ||
|  | Just wanted to check in on...       ||
|  |                                     ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Signature                              |
|  +----------------------------------v--+|
|  | My Signature                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Best regards,                       ||
|  |                                     ||
|  | Joel Chan                           ||
|  | Sales Manager                       ||
|  | Renoz Building Materials            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |           [Send Email]              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Signature Selector (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  SELECT SIGNATURE                       |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | (o) My Signature                    ||
|  |                                     ||
|  |     Best regards,                   ||
|  |     Joel Chan                       ||
|  |     Sales Manager...                ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ( ) Company Default                 ||
|  |                                     ||
|  |     Thank you for your business,    ||
|  |                                     ||
|  |     The Renoz Team                  ||
|  |     www.renoz.com...                ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ( ) No Signature                    ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |           [Apply]                   ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Admin - Company Signatures (Settings)

```
+=========================================+
| < Settings                              |
+-----------------------------------------+
|                                         |
|  Company Signatures             [+New]  |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | Default Signature           [Star]  ||
|  |                                     ||
|  | Thank you for your business,        ||
|  |                                     ||
|  | The Renoz Team                      ||
|  | www.renoz.com                       ||
|  |                                     ||
|  |         [Edit]  [Delete]            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Sales Team Signature                ||
|  |                                     ||
|  | Your partner in building supplies,  ||
|  |                                     ||
|  | Renoz Sales Team                    ||
|  | sales@renoz.com                     ||
|  |                                     ||
|  |         [Edit]  [Delete]            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Support Signature                   ||
|  |                                     ||
|  | Here to help,                       ||
|  |                                     ||
|  | Renoz Support                       ||
|  | support@renoz.com                   ||
|  |                                     ||
|  |         [Edit]  [Delete]            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State (Mobile)

```
+=========================================+
| < Settings                              |
+-----------------------------------------+
|                                         |
|  Email Signature                        |
|  ─────────────────────────────────────  |
|                                         |
|            +-------------+              |
|            |   [pen]     |              |
|            +-------------+              |
|                                         |
|       No Signature Set                  |
|                                         |
|   Create a signature to include         |
|   in your outgoing emails. Add          |
|   your name, title, and contact         |
|   information.                          |
|                                         |
|   +-------------------------------+     |
|   |                               |     |
|   |    [Create Signature]         |     |
|   |                               |     |
|   +-------------------------------+     |
|                                         |
+=========================================+
```

### Loading Skeleton (Mobile)

```
+=========================================+
| < Settings                              |
+-----------------------------------------+
|                                         |
|  Email Signature                        |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | [...] [...] [...] [...] [...]       ||
|  |-------------------------------------|
|  |                                     ||
|  | .............................       ||
|  |                                     ||
|  | ...............                     ||
|  | ................                    ||
|  | ............................        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Settings - Email Signature with Preview

```
+=========================================================================+
| < Settings                                                               |
+-------------------------------------------------------------------------+
|                                                                          |
|  Email Signature                                                         |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  +-- EDITOR --------------------------------+  +-- PREVIEW ------------+ |
|  |                                          |  |                       | |
|  |  [B] [I] [U] [S] | [Link] [Img] [Color]  |  |  How your signature   | |
|  |  [Left] [Center] [Right] | [Clear]       |  |  will appear:         | |
|  |------------------------------------------|  |                       | |
|  |                                          |  |  Best regards,        | |
|  |  Best regards,                           |  |                       | |
|  |                                          |  |  Joel Chan            | |
|  |  Joel Chan                               |  |  Sales Manager        | |
|  |  Sales Manager                           |  |  Renoz Building       | |
|  |  Renoz Building Materials                |  |  Materials            | |
|  |                                          |  |                       | |
|  |  P: +1 555-0123                          |  |  P: +1 555-0123       | |
|  |  E: joel@renoz.com                       |  |  E: joel@renoz.com    | |
|  |                                          |  |                       | |
|  +------------------------------------------+  +-----------------------+ |
|                                                                          |
|  [x] Include in all outgoing emails                                      |
|  [ ] Make this the default for my team (Admin only)                      |
|                                                                          |
|                                       ( Reset )    [ Save Signature ]    |
|                                                                          |
+=========================================================================+
```

### Email Composer with Signature Dropdown

```
+=========================================================================+
| Compose Email                                                      [X]   |
+-------------------------------------------------------------------------+
|                                                                          |
|  To: john@acme.com                                                       |
|  Subject: Following up on your order                                     |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  +--------------------------------------------------------------------+ |
|  |                                                                    | |
|  |  Hi John,                                                          | |
|  |                                                                    | |
|  |  Just wanted to check in on your recent order and make sure        | |
|  |  everything arrived as expected.                                   | |
|  |                                                                    | |
|  |  Please let me know if you have any questions.                     | |
|  |                                                                    | |
|  |  ─────────────────────────────────────────────────────────────     | |
|  |                                                                    | |
|  |  Best regards,                                                     | |
|  |                                                                    | |
|  |  Joel Chan                                                         | |
|  |  Sales Manager                                                     | |
|  |  Renoz Building Materials                                          | |
|  |                                                                    | |
|  |  P: +1 555-0123                                                    | |
|  |  E: joel@renoz.com                                                 | |
|  |                                                                    | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
|  Signature: [My Signature v]                                             |
|                                                                          |
|                                        ( Cancel )     [ Send Email ]     |
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Settings - Email Signatures Section

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Email Signatures                                                           |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  [Personal] [Company]                                                                  |
| Jobs        |  ========                                                                              |
| Pipeline    |                                                                                        |
| Support     |  +-- MY SIGNATURE -----------------------------------------------------------------------+
| Communi..   |  |                                                                                      |
| Settings    |  |  +-- EDITOR -----------------------------------------+  +-- PREVIEW ---------------+ |
|   <         |  |  |                                                   |  |                          | |
|             |  |  |  +---------------------------------------------+  |  |  Live Preview            | |
|             |  |  |  | [B] [I] [U] [S] | [Link] [Img] [Color]      |  |  |                          | |
|             |  |  |  | [Left] [Center] [Right] [Justify] | [Clear] |  |  |  ──────────────────────  | |
|             |  |  |  +---------------------------------------------+  |  |                          | |
|             |  |  |                                                   |  |  Best regards,           | |
|             |  |  |  Best regards,                                    |  |                          | |
|             |  |  |                                                   |  |  Joel Chan               | |
|             |  |  |  Joel Chan                                        |  |  Sales Manager           | |
|             |  |  |  Sales Manager                                    |  |  Renoz Building Materia  | |
|             |  |  |  Renoz Building Materials                         |  |                          | |
|             |  |  |                                                   |  |  P: +1 555-0123          | |
|             |  |  |  P: +1 555-0123                                   |  |  E: joel@renoz.com       | |
|             |  |  |  E: joel@renoz.com                                |  |                          | |
|             |  |  |                                                   |  |  [Renoz Logo]            | |
|             |  |  |  [Renoz Logo]                                     |  |                          | |
|             |  |  |                                                   |  +---------------------------+
|             |  |  +---------------------------------------------------+                             |
|             |  |                                                                                      |
|             |  |  OPTIONS                                                                             |
|             |  |  [x] Include in all outgoing emails                                                  |
|             |  |  [ ] Use as default when composing new emails                                        |
|             |  |                                                                                      |
|             |  |                                            ( Reset to Default )    [ Save Changes ]  |
|             |  |                                                                                      |
|             |  +-------------------------------------------------------------------------------------+
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Company Signatures (Admin View)

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Email Signatures                                                           |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  [Personal] [Company]                                                                  |
| Jobs        |             =======                                                                    |
| Pipeline    |                                                                                        |
| Support     |  +-- COMPANY SIGNATURES -----------------------------------------------+  [+ Create]   |
| Communi..   |  |                                                                     |              |
| Settings    |  |  +-- DEFAULT SIGNATURE (active) --------------------------------+   |              |
|   <         |  |  |                                                              |   |              |
|             |  |  |  [Star] Default Signature                                    |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  Thank you for your business,                                |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  The Renoz Team                                              |   |              |
|             |  |  |  www.renoz.com | support@renoz.com                           |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  Used by: All team members by default                        |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |                              [Edit]  [Make Default]           |   |              |
|             |  |  +--------------------------------------------------------------+   |              |
|             |  |                                                                     |              |
|             |  |  +-- Sales Team Signature -------------------------------------------+              |
|             |  |  |                                                              |   |              |
|             |  |  |  Your partner in building supplies,                          |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  Renoz Sales Team                                            |   |              |
|             |  |  |  sales@renoz.com                                             |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  Assigned to: Sales role                                     |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |                      [Edit]  [Make Default]  [Delete]         |   |              |
|             |  |  +--------------------------------------------------------------+   |              |
|             |  |                                                                     |              |
|             |  |  +-- Support Signature ---------------------------------------------+              |
|             |  |  |                                                              |   |              |
|             |  |  |  Here to help,                                               |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  Renoz Support                                               |   |              |
|             |  |  |  support@renoz.com | 1-800-RENOZ                             |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |  Assigned to: Support role                                   |   |              |
|             |  |  |                                                              |   |              |
|             |  |  |                      [Edit]  [Make Default]  [Delete]         |   |              |
|             |  |  +--------------------------------------------------------------+   |              |
|             |  |                                                                     |              |
|             |  +---------------------------------------------------------------------+              |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Create/Edit Company Signature Dialog

```
+============================================================================+
| Create Company Signature                                              [X]   |
+=============================================================================+
|                                                                             |
|  Signature Name *                                                           |
|  +-----------------------------------------------------------------------+ |
|  | Support Team Signature                                                | |
|  +-----------------------------------------------------------------------+ |
|                                                                             |
|  +-- EDITOR ------------------------------------+  +-- PREVIEW -----------+|
|  |                                              |  |                      ||
|  |  +----------------------------------------+  |  |  Here to help,       ||
|  |  | [B] [I] [U] | [Link] [Img] | [Color]   |  |  |                      ||
|  |  +----------------------------------------+  |  |  Renoz Support       ||
|  |                                              |  |  support@renoz.com   ||
|  |  Here to help,                               |  |  1-800-RENOZ         ||
|  |                                              |  |                      ||
|  |  Renoz Support                               |  |  [Renoz Logo]        ||
|  |  support@renoz.com                           |  |                      ||
|  |  1-800-RENOZ                                 |  +----------------------+|
|  |                                              |                          |
|  |  [Renoz Logo]                                |                          |
|  |                                              |                          |
|  +----------------------------------------------+                          |
|                                                                             |
|  ASSIGNMENT                                                                 |
|  +-----------------------------------------------------------------------+ |
|  | Assign to roles:                                                      | |
|  | [x] Support    [ ] Sales    [ ] Admin    [ ] Warehouse                | |
|  +-----------------------------------------------------------------------+ |
|                                                                             |
|  [x] Make this the default signature for assigned roles                     |
|                                                                             |
|                                        ( Cancel )     [ Create Signature ]  |
|                                                                             |
+=============================================================================+
```

---

## Interaction States

### Loading States

```
EDITOR LOADING:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  | [...] [...] [...] [...] [...]    ||
|  |----------------------------------|
|  |                                  ||
|  |  Loading signature...            ||
|  |                                  ||
|  |  [spinner]                       ||
|  |                                  ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+

SAVING:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  |    [spinner]                     ||
|  |    Saving signature...           ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+

PREVIEW RENDERING:
+--------------------------------------+
|  PREVIEW                             |
|  +----------------------------------+|
|  |                                  ||
|  |  Rendering preview...            ||
|  |                                  ||
|  |  [.......shimmer......]          ||
|  |  [.......shimmer......]          ||
|  |                                  ||
|  +----------------------------------+|
+--------------------------------------+
```

### Empty States

```
NO PERSONAL SIGNATURE:
+--------------------------------------+
|                                      |
|          +------------+              |
|          |   [pen]    |              |
|          +------------+              |
|                                      |
|     No Signature Created             |
|                                      |
|  Create a personal email signature   |
|  to automatically include in your    |
|  outgoing emails.                    |
|                                      |
|      [Create My Signature]           |
|                                      |
+--------------------------------------+

NO COMPANY SIGNATURES (Admin):
+--------------------------------------+
|                                      |
|          +------------+              |
|          | [building] |              |
|          +------------+              |
|                                      |
|     No Company Signatures            |
|                                      |
|  Create company signatures that      |
|  team members can use in their       |
|  communications.                     |
|                                      |
|   [Create Company Signature]         |
|                                      |
+--------------------------------------+
```

### Error States

```
SAVE FAILED:
+--------------------------------------+
|                                      |
|  [!] Failed to save signature        |
|                                      |
|  Please check your connection        |
|  and try again.                      |
|                                      |
|  [Retry Save]                        |
|                                      |
+--------------------------------------+

IMAGE UPLOAD FAILED:
+--------------------------------------+
|                                      |
|  [!] Image upload failed             |
|                                      |
|  The image is too large (max 1MB)    |
|  or invalid format.                  |
|                                      |
|  [Try Different Image]               |
|                                      |
+--------------------------------------+

SIGNATURE LIMIT:
+--------------------------------------+
|                                      |
|  [!] Signature limit reached         |
|                                      |
|  You can create up to 5 company      |
|  signatures. Delete an existing      |
|  signature to create a new one.      |
|                                      |
+--------------------------------------+
```

### Success States

```
SIGNATURE SAVED:
+--------------------------------------+
|                                      |
|  * Signature Saved                   |
|                                      |
|  Your signature will be included     |
|  in outgoing emails.                 |
|                                      |
+--------------------------------------+

SIGNATURE DELETED:
+--------------------------------------+
|                                      |
|  * Signature Deleted                 |
|                                      |
|  "Support Signature" has been        |
|  removed.                            |
|                                      |
|  [Undo - 5s]                         |
+--------------------------------------+

DEFAULT SET:
+--------------------------------------+
|                                      |
|  * Default Signature Updated         |
|                                      |
|  "Sales Team Signature" is now       |
|  the default for Sales role.         |
|                                      |
+--------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Signature Editor**
   - Toolbar buttons (left to right)
   - Editor content area
   - Options checkboxes
   - Action buttons (Reset, Save)

2. **Signature Selector (Composer)**
   - Dropdown trigger
   - Signature options (radio buttons)
   - Apply button

3. **Company Signatures List**
   - Create button
   - Tab through signature cards
   - Within card: Edit, Make Default, Delete

### ARIA Requirements

```html
<!-- Rich Text Editor -->
<div
  role="application"
  aria-label="Signature editor"
>
  <div
    role="toolbar"
    aria-label="Formatting options"
  >
    <button
      aria-label="Bold"
      aria-pressed="false"
    >[B]</button>
    <button
      aria-label="Italic"
      aria-pressed="true"
    >[I]</button>
    <!-- ... -->
  </div>

  <div
    role="textbox"
    aria-multiline="true"
    aria-label="Signature content"
    contenteditable="true"
  >
    Best regards, ...
  </div>
</div>

<!-- Preview Panel -->
<div
  role="region"
  aria-label="Signature preview"
  aria-live="polite"
>
  <!-- Preview content -->
</div>

<!-- Signature Selector -->
<fieldset role="radiogroup" aria-label="Select signature">
  <legend class="sr-only">Choose a signature</legend>

  <label>
    <input
      type="radio"
      name="signature"
      value="personal"
      aria-checked="true"
    />
    My Signature
  </label>

  <label>
    <input
      type="radio"
      name="signature"
      value="company"
      aria-checked="false"
    />
    Company Default
  </label>

  <label>
    <input
      type="radio"
      name="signature"
      value="none"
      aria-checked="false"
    />
    No Signature
  </label>
</fieldset>

<!-- Company Signature Card -->
<article
  role="article"
  aria-labelledby="sig-1-name"
>
  <h3 id="sig-1-name">Default Signature</h3>
  <span aria-label="Default signature for all team members">Default</span>
  <div aria-label="Signature preview">
    Thank you for your business...
  </div>
  <div role="group" aria-label="Signature actions">
    <button aria-label="Edit Default Signature">Edit</button>
    <button aria-label="Delete Default Signature">Delete</button>
  </div>
</article>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Editor | Move through toolbar buttons |
| Enter | Toolbar button | Apply formatting |
| Ctrl+B | Editor | Bold |
| Ctrl+I | Editor | Italic |
| Ctrl+U | Editor | Underline |
| Ctrl+K | Editor | Insert link |
| Tab | Selector | Navigate options |
| Space/Enter | Radio option | Select signature |
| Escape | Dialog | Close |

### Screen Reader Announcements

- Format applied: "Bold formatting applied"
- Preview updated: "Preview updated"
- Signature saved: "Signature saved successfully"
- Signature selected: "My Signature selected for email"
- Default changed: "Default signature updated to Sales Team Signature"

---

## Animation Choreography

### Editor Toolbar

```
BUTTON PRESS:
- Duration: 100ms
- Scale: 1 -> 0.95 -> 1
- Background: highlight flash

FORMAT TOGGLE:
- Duration: 150ms
- Active state: background color change
- Icon color transition
```

### Preview Update

```
ON CONTENT CHANGE:
- Duration: 300ms
- Debounce: 500ms after typing stops
- Fade: old content fades, new content fades in
- No layout shift
```

### Signature Card

```
HOVER (Desktop):
- Duration: 150ms
- Shadow elevation increase
- Background subtle highlight

DELETE:
- Duration: 200ms
- Easing: ease-out
- Opacity: 1 -> 0
- Height: auto -> 0
- Other cards slide up

CREATE:
- Duration: 300ms
- Easing: spring
- Slide down from top
- Opacity: 0 -> 1
```

### Signature Selector

```
DROPDOWN OPEN:
- Duration: 200ms
- Easing: ease-out
- Scale Y: 0.95 -> 1
- Opacity: 0 -> 1

OPTION SELECT:
- Duration: 150ms
- Radio check animation
- Row highlight

APPLY:
- Duration: 200ms
- Dropdown closes
- Preview updates with signature
```

### Image Upload

```
UPLOADING:
- Duration: continuous
- Progress bar animation
- Placeholder with shimmer

SUCCESS:
- Duration: 300ms
- Image fades in
- Green checkmark flash

ERROR:
- Duration: 200ms
- Shake animation
- Red border flash
```

---

## Component Props Interfaces

```typescript
// RichTextEditor
interface RichTextEditorProps {
  /** Editor content (HTML) */
  value: string;
  /** Change handler */
  onChange: (html: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Toolbar options to show */
  toolbar?: Array<'bold' | 'italic' | 'underline' | 'strikethrough' | 'link' | 'image' | 'color' | 'align' | 'clear'>;
  /** Maximum content length */
  maxLength?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Minimum height */
  minHeight?: string;
  /** Maximum height */
  maxHeight?: string;
  /** Image upload handler */
  onImageUpload?: (file: File) => Promise<string>;
}

// SignatureSelector
interface SignatureSelectorProps {
  /** Available signatures */
  signatures: Array<{
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
    type: 'personal' | 'company';
  }>;
  /** Selected signature ID (null for no signature) */
  value: string | null;
  /** Change handler */
  onChange: (signatureId: string | null) => void;
  /** Allow no signature option */
  allowNone?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

// SignaturePreview
interface SignaturePreviewProps {
  /** HTML content to preview */
  content: string;
  /** Show email context */
  showContext?: boolean;
  /** Custom heading */
  heading?: string;
  /** Loading state */
  isLoading?: boolean;
}

// SignatureCard
interface SignatureCardProps {
  signature: {
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
    assignedRoles?: string[];
    usedBy?: number;
  };
  /** Edit handler */
  onEdit: () => void;
  /** Delete handler */
  onDelete: () => void;
  /** Make default handler */
  onMakeDefault?: () => void;
  /** Is deleting */
  isDeleting?: boolean;
  /** Show role assignment info */
  showRoleAssignment?: boolean;
}

// SignatureEditorDialog
interface SignatureEditorDialogProps {
  /** Signature to edit (null for create) */
  signature?: {
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
    assignedRoles?: string[];
  };
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (data: {
    name: string;
    content: string;
    isDefault: boolean;
    assignedRoles?: string[];
  }) => void;
  /** Saving state */
  isSaving?: boolean;
  /** Available roles for assignment (admin only) */
  availableRoles?: Array<{ id: string; name: string }>;
}

// PersonalSignatureSettings
interface PersonalSignatureSettingsProps {
  /** Current signature content */
  signature?: string;
  /** Auto-include preference */
  autoInclude: boolean;
  /** Save handler */
  onSave: (data: {
    content: string;
    autoInclude: boolean;
  }) => void;
  /** Saving state */
  isSaving?: boolean;
  /** Has unsaved changes */
  hasChanges?: boolean;
  /** Reset to last saved */
  onReset: () => void;
}

// CompanySignaturesSettings
interface CompanySignaturesSettingsProps {
  /** Company signatures */
  signatures: Array<{
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
    assignedRoles: string[];
    usedBy: number;
  }>;
  /** Loading state */
  isLoading?: boolean;
  /** Create handler */
  onCreate: () => void;
  /** Edit handler */
  onEdit: (id: string) => void;
  /** Delete handler */
  onDelete: (id: string) => void;
  /** Make default handler */
  onMakeDefault: (id: string) => void;
  /** Maximum signatures allowed */
  maxSignatures?: number;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/ui/rich-text-editor.tsx` | Rich text editing component |
| `src/components/domain/communications/signature-selector.tsx` | Dropdown signature picker |
| `src/components/domain/communications/signature-preview.tsx` | Signature preview panel |
| `src/components/domain/communications/signature-card.tsx` | Signature list item |
| `src/components/domain/communications/signature-editor-dialog.tsx` | Create/edit dialog |
| `src/components/domain/settings/personal-signature-settings.tsx` | Personal signature page |
| `src/components/domain/settings/company-signatures-settings.tsx` | Admin signatures page |
| `src/routes/_authed/settings/signature.tsx` | Personal signature route |
| `src/routes/_authed/settings/signatures.tsx` | Company signatures route |
