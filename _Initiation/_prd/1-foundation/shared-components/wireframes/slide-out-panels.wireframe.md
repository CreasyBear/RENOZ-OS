# Slide-Out Panels Wireframe

**Version:** 1.0
**Last Updated:** 2026-01-10
**Purpose:** Define reusable slide-out panel/drawer patterns for quick views, forms, and filters.

---

## Overview

Slide-out panels provide contextual views and actions without leaving the current page. They slide in from the right (or left for filters) over the main content with a backdrop overlay.

### Common Behaviors

- **Animation:** 300ms ease-in-out slide transition
- **Backdrop:** Semi-transparent overlay (rgba(0,0,0,0.5))
- **Close Actions:**
  - Click backdrop
  - Press Escape key
  - Click X button in header
  - Complete action (save/create)
- **Focus Trap:** Tab cycles within panel while open
- **Scroll:** Panel content scrollable, main content locked
- **Z-Index:** Backdrop at 40, Panel at 50

---

## 1. Quick View Panel (Read-Only)

**Purpose:** Display entity details without navigating away from current page.

**Dimensions:**
- Narrow: 400px width
- Wide: 600px width

**Renoz Example:** Customer quick view from leads list

```
┌─────────────────────────────────────────────────────────────┐
│ [Main Page Content]                                         │
│                                                              │
│  ╔════════════════════════════════════════╗                 │
│  ║ Customer Quick View            [X]     ║ ← Header        │
│  ╠════════════════════════════════════════╣                 │
│  ║                                        ║                 │
│  ║ John Smith                             ║                 │
│  ║ john.smith@email.com                   ║                 │
│  ║ (555) 123-4567                         ║                 │
│  ║                                        ║                 │
│  ║ ─────────────────────────────          ║                 │
│  ║                                        ║                 │
│  ║ Status: Active Lead                    ║                 │
│  ║ Source: Website                        ║                 │
│  ║ Assigned: Sarah Johnson                ║                 │
│  ║                                        ║                 │
│  ║ ─────────────────────────────          ║ ← Scrollable    │
│  ║                                        ║   Content       │
│  ║ Recent Activity                        ║                 │
│  ║                                        ║                 │
│  ║ • Quote sent - Jan 8, 2026             ║                 │
│  ║ • Follow-up call - Jan 5, 2026         ║                 │
│  ║ • Initial contact - Jan 3, 2026        ║                 │
│  ║                                        ║                 │
│  ║ Open Quotes (2)                        ║                 │
│  ║                                        ║                 │
│  ║ • Bathroom Remodel - $15,420           ║                 │
│  ║ • Kitchen Update - $8,750              ║                 │
│  ║                                        ║                 │
│  ╠════════════════════════════════════════╣                 │
│  ║ [Open Full Customer View →]            ║ ← Footer        │
│  ╚════════════════════════════════════════╝                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ← Backdrop overlay (click to close)
```

### Structure

```
┌─ Header ──────────────────────────────────┐
│ {Entity Type} Quick View           [X]    │  ← Title + Close
└───────────────────────────────────────────┘
┌─ Content (Scrollable) ────────────────────┐
│                                            │
│ [Entity-specific read-only content]        │
│                                            │
│ - Key details                              │
│ - Related data                             │
│ - Recent activity                          │
│                                            │
└────────────────────────────────────────────┘
┌─ Footer ──────────────────────────────────┐
│ [Open Full View →]                         │  ← Link to detail page
└────────────────────────────────────────────┘
```

### Interactions

1. **Open:** Click entity name/row in list
2. **Close:**
   - Click [X]
   - Click backdrop
   - Press Escape
   - Click "Open Full View" (navigates to detail page)
3. **Keyboard:**
   - Tab cycles through interactive elements
   - Escape closes panel

---

## 2. Edit Panel (Form)

**Purpose:** Quick edits to entity without full page load.

**Dimensions:** 600px width (wide)

**Renoz Example:** Edit quote details

```
┌─────────────────────────────────────────────────────────────┐
│ [Main Page Content]                                         │
│                                                              │
│  ╔════════════════════════════════════════╗                 │
│  ║ Edit Quote                     [X]     ║ ← Header        │
│  ╠════════════════════════════════════════╣                 │
│  ║                                        ║                 │
│  ║ Quote Title *                          ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ Bathroom Remodel - Oak St         │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ Customer *                             ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ John Smith ▼                       │ ║ ← Dropdown      │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║ ← Scrollable    │
│  ║ Status *                               ║   Content       │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ ○ Draft  ● Sent  ○ Accepted       │ ║ ← Radio         │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ Valid Until                            ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ 01/20/2026       [📅]             │ ║ ← Date picker   │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ Notes                                  ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ Customer requested...              │ ║ ← Textarea      │
│  ║ │                                    │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ╠════════════════════════════════════════╣                 │
│  ║ [Cancel]              [Save Changes]   ║ ← Footer        │
│  ╚════════════════════════════════════════╝                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Structure

```
┌─ Header ──────────────────────────────────┐
│ Edit {Entity Type}                 [X]    │  ← Title + Close
└───────────────────────────────────────────┘
┌─ Content (Scrollable) ────────────────────┐
│                                            │
│ Field Label *                              │  ← * = required
│ ┌──────────────────────────────────────┐   │
│ │ [Input value]                        │   │
│ └──────────────────────────────────────┘   │
│ [Error message if validation fails]        │
│                                            │
│ [Repeat for each field]                    │
│                                            │
└────────────────────────────────────────────┘
┌─ Footer ──────────────────────────────────┐
│ [Cancel]                      [Save]       │  ← Actions
└────────────────────────────────────────────┘
```

### Unsaved Changes Warning

When user attempts to close with unsaved changes:

```
┌─────────────────────────────────────┐
│  ⚠️  Unsaved Changes                │
│                                     │
│  You have unsaved changes.          │
│  Are you sure you want to close?    │
│                                     │
│  [Keep Editing]  [Discard Changes]  │
└─────────────────────────────────────┘
```

### Interactions

1. **Open:** Click "Edit" button on entity
2. **Save:**
   - Click [Save Changes]
   - Validates form
   - Shows success toast
   - Closes panel
3. **Cancel:**
   - Click [Cancel]
   - Shows warning if changes exist
   - Closes panel if confirmed
4. **Close with changes:**
   - Shows confirmation modal
   - Prevents accidental data loss
5. **Keyboard:**
   - Enter to save (if no textarea focused)
   - Escape to cancel (with warning)

---

## 3. Create Panel

**Purpose:** Quick creation of new entities with minimal required fields.

**Dimensions:** 600px width (wide)

**Renoz Example:** Create new customer

```
┌─────────────────────────────────────────────────────────────┐
│ [Main Page Content]                                         │
│                                                              │
│  ╔════════════════════════════════════════╗                 │
│  ║ Create Customer                [X]     ║ ← Header        │
│  ╠════════════════════════════════════════╣                 │
│  ║                                        ║                 │
│  ║ First Name *                           ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │                                    │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ Last Name *                            ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │                                    │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║ ← Scrollable    │
│  ║ Email                                  ║   Content       │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │                                    │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ Phone                                  ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │                                    │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ Lead Source *                          ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ Select... ▼                        │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ╠════════════════════════════════════════╣                 │
│  ║ [Cancel]  [Create & Close] [Create &   ║ ← Footer        │
│  ║                             Open →]    ║                 │
│  ╚════════════════════════════════════════╝                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Structure

```
┌─ Header ──────────────────────────────────┐
│ Create {Entity Type}               [X]    │  ← Title + Close
└───────────────────────────────────────────┘
┌─ Content (Scrollable) ────────────────────┐
│                                            │
│ [Required fields marked with *]            │
│                                            │
│ Field Label *                              │
│ ┌──────────────────────────────────────┐   │
│ │ [Empty input]                        │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [Optional fields]                          │
│                                            │
└────────────────────────────────────────────┘
┌─ Footer ──────────────────────────────────┐
│ [Cancel]  [Create & Close]  [Create &      │  ← Actions
│                              Open →]       │
└────────────────────────────────────────────┘
```

### Interactions

1. **Open:** Click "+ New {Entity}" button
2. **Create & Close:**
   - Validates required fields
   - Creates entity
   - Shows success toast
   - Closes panel
   - Stays on current page
3. **Create & Open:**
   - Validates required fields
   - Creates entity
   - Navigates to new entity's detail page
4. **Cancel:**
   - Shows warning if any fields filled
   - Closes panel if confirmed
5. **Keyboard:**
   - Enter to submit (Create & Close)
   - Escape to cancel

---

## 4. Filter Panel

**Purpose:** Apply filters to list views without leaving the page.

**Dimensions:** 400px width (narrow)
**Position:** Can slide from left or right (configurable)

**Renoz Example:** Filter quotes list

```
┌─────────────────────────────────────────────────────────────┐
│ ╔════════════════════════════════════════╗                  │
│ ║ Filters                        [X]     ║ ← Header         │
│ ╠════════════════════════════════════════╣                  │
│ ║                                        ║                  │
│ ║ Status                                 ║                  │
│ ║ ☑ Draft (12)                           ║                  │
│ ║ ☑ Sent (8)                             ║                  │
│ ║ ☐ Accepted (5)                         ║                  │
│ ║ ☐ Rejected (3)                         ║                  │
│ ║                                        ║                  │
│ ║ ─────────────────────────────          ║                  │
│ ║                                        ║                  │
│ ║ Date Range                             ║                  │
│ ║ ┌────────────────────────────────────┐ ║ ← Scrollable    │
│ ║ │ Last 30 days ▼                     │ ║   Content       │
│ ║ └────────────────────────────────────┘ ║                  │
│ ║                                        ║                  │
│ ║ Custom:                                ║                  │
│ ║ From: [01/01/2026] [📅]                ║                  │
│ ║ To:   [01/31/2026] [📅]                ║                  │
│ ║                                        ║                  │
│ ║ ─────────────────────────────          ║                  │
│ ║                                        ║                  │
│ ║ Assigned To                            ║                  │
│ ║ ┌────────────────────────────────────┐ ║                  │
│ ║ │ All Users ▼                        │ ║                  │
│ ║ └────────────────────────────────────┘ ║                  │
│ ║                                        ║                  │
│ ║ ─────────────────────────────          ║                  │
│ ║                                        ║                  │
│ ║ Amount Range                           ║                  │
│ ║ Min: ┌────────────┐ Max: ┌──────────┐ ║                  │
│ ║      │ $0         │      │ $50,000  │ ║                  │
│ ║      └────────────┘      └──────────┘ ║                  │
│ ║                                        ║                  │
│ ╠════════════════════════════════════════╣                  │
│ ║ [Reset All]              [Apply] (4)   ║ ← Footer         │
│ ╚════════════════════════════════════════╝                  │
│                                                              │
│ [Main Page Content - Filtered Results]                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Structure

```
┌─ Header ──────────────────────────────────┐
│ Filters (3)                        [X]    │  ← Count of active
└───────────────────────────────────────────┘
┌─ Content (Scrollable) ────────────────────┐
│                                            │
│ Filter Group Name                          │
│ ☑ Option 1 (count)                         │  ← Checkboxes
│ ☐ Option 2 (count)                         │
│                                            │
│ ─────────────────────────                  │  ← Separator
│                                            │
│ Another Filter Group                       │
│ ┌──────────────────────────────────────┐   │
│ │ Dropdown options ▼                   │   │  ← Dropdown
│ └──────────────────────────────────────┘   │
│                                            │
│ [Additional filter groups]                 │
│                                            │
└────────────────────────────────────────────┘
┌─ Footer ──────────────────────────────────┐
│ [Reset All]                [Apply] (N)     │  ← N = active count
└────────────────────────────────────────────┘
```

### Active Filter Badge

In header/trigger button when panel closed:

```
┌──────────────────┐
│ Filters (3) 🔽   │  ← Badge shows count
└──────────────────┘
```

### Interactions

1. **Open:** Click "Filters" button
2. **Select filters:**
   - Check/uncheck options
   - Select from dropdowns
   - Enter values
   - Changes preview in badge (N)
3. **Apply:**
   - Click [Apply]
   - Updates main content
   - Closes panel
   - Badge shows active filter count
4. **Reset All:**
   - Clears all filters
   - Updates badge to (0)
   - Main content shows unfiltered results
5. **Close without applying:**
   - Click [X], backdrop, or Escape
   - Keeps previous filters
   - No changes to main content
6. **Keyboard:**
   - Tab through filter controls
   - Space to toggle checkboxes
   - Enter to apply
   - Escape to close

---

## 5. Notification Panel

**Purpose:** View and manage notifications without leaving current page.

**Dimensions:** 400px width (narrow)
**Position:** Slides from right

**Renoz Example:** Recent activity and alerts

```
┌─────────────────────────────────────────────────────────────┐
│ [Main Page Content]                                         │
│                                                              │
│  ╔════════════════════════════════════════╗                 │
│  ║ Notifications (5)              [X]     ║ ← Header        │
│  ╠════════════════════════════════════════╣                 │
│  ║ [Mark All Read]  [Clear All]           ║ ← Actions       │
│  ╠════════════════════════════════════════╣                 │
│  ║                                        ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ ● New quote request                │ ║ ← Unread        │
│  ║ │   Sarah Johnson assigned you...    │ ║                 │
│  ║ │   2 mins ago                  [×]  │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ ● Quote accepted                   │ ║ ← Unread        │
│  ║ │   John Smith accepted bathroom...  │ ║ ← Scrollable    │
│  ║ │   15 mins ago                 [×]  │ ║   Content       │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ ○ Follow-up reminder               │ ║ ← Read          │
│  ║ │   Contact Mike Davis about...      │ ║                 │
│  ║ │   1 hour ago                  [×]  │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ ○ Payment received                 │ ║ ← Read          │
│  ║ │   Invoice #1234 paid by...         │ ║                 │
│  ║ │   2 hours ago                 [×]  │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ ┌────────────────────────────────────┐ ║                 │
│  ║ │ ○ System update                    │ ║ ← Read          │
│  ║ │   New features available...        │ ║                 │
│  ║ │   1 day ago                   [×]  │ ║                 │
│  ║ └────────────────────────────────────┘ ║                 │
│  ║                                        ║                 │
│  ║ ─── End of notifications ───           ║                 │
│  ║                                        ║                 │
│  ╚════════════════════════════════════════╝                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Structure

```
┌─ Header ──────────────────────────────────┐
│ Notifications (N)                  [X]    │  ← N = unread count
└───────────────────────────────────────────┘
┌─ Actions ─────────────────────────────────┐
│ [Mark All Read]  [Clear All]              │
└───────────────────────────────────────────┘
┌─ Content (Scrollable) ────────────────────┐
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │ ● Title                              │   │  ← ● = unread
│ │   Description/preview text...        │   │    ○ = read
│ │   [time ago]                    [×]  │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [Repeat for each notification]             │
│                                            │
│ ─── End of notifications ───               │  ← Empty state
│                                            │     if no more
└────────────────────────────────────────────┘
```

### Notification States

**Unread:**
- Filled dot (●)
- Bold title
- Highlighted background

**Read:**
- Hollow dot (○)
- Normal weight title
- Standard background

**Empty State:**
```
┌────────────────────────────────────┐
│                                    │
│         🔔                         │
│                                    │
│    No new notifications            │
│                                    │
└────────────────────────────────────┘
```

### Interactions

1. **Open:** Click notification icon (bell)
2. **View notification:**
   - Click notification card
   - Marks as read
   - Navigates to related entity (optional)
3. **Dismiss individual:**
   - Click [×] on notification
   - Removes from list
   - Updates count
4. **Mark all read:**
   - Click [Mark All Read]
   - Changes all ● to ○
   - Updates count to 0
5. **Clear all:**
   - Click [Clear All]
   - Shows confirmation modal
   - Removes all notifications
6. **Close:**
   - Click [X], backdrop, or Escape
   - Notifications persist
7. **Keyboard:**
   - Arrow keys to navigate
   - Enter to open selected
   - Delete to dismiss selected
   - Escape to close

---

## Animation Specifications

### Open Animation (300ms)

```
Frame 1 (0ms):    Panel off-screen right
Frame 2 (100ms):  Panel 30% visible
Frame 3 (200ms):  Panel 70% visible
Frame 4 (300ms):  Panel fully visible

Backdrop: Fade in from 0 to 0.5 opacity
```

### Close Animation (200ms)

```
Frame 1 (0ms):    Panel fully visible
Frame 2 (100ms):  Panel 50% visible
Frame 3 (200ms):  Panel off-screen right

Backdrop: Fade out from 0.5 to 0 opacity
```

### Easing

- **Open:** `ease-out` (starts fast, ends slow)
- **Close:** `ease-in` (starts slow, ends fast)

---

## Accessibility

### Focus Management

1. **On open:**
   - Focus moves to panel close button [X]
   - Main content is `aria-hidden="true"`
   - Focus trapped within panel

2. **Tab order:**
   - Close button [X]
   - Header interactive elements
   - Content interactive elements
   - Footer buttons
   - Loops back to close button

3. **On close:**
   - Focus returns to trigger element
   - Main content `aria-hidden="false"`
   - Focus trap released

### Screen Reader

```html
<div role="dialog"
     aria-modal="true"
     aria-labelledby="panel-title"
     aria-describedby="panel-description">

  <h2 id="panel-title">Edit Quote</h2>
  <div id="panel-description">Edit quote details</div>

  <!-- Panel content -->

</div>
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Escape | Close panel |
| Tab | Next focusable element (trapped) |
| Shift+Tab | Previous focusable element (trapped) |
| Enter | Submit form / Select item |

---

## Responsive Behavior

### Desktop (>1024px)

- Panel slides from right
- Fixed width (400px or 600px)
- Backdrop covers remaining space

### Tablet (768px - 1024px)

- Panel slides from right
- Width: 50% of viewport
- Backdrop covers left 50%

### Mobile (<768px)

- Panel slides from right
- Width: 100% of viewport
- No backdrop (full takeover)
- Shows back arrow instead of [X]

```
┌───────────────────────────┐
│ [←] Edit Quote            │  ← Back instead of X
├───────────────────────────┤
│                           │
│ [Full width form]         │
│                           │
│                           │
├───────────────────────────┤
│ [Cancel]         [Save]   │
└───────────────────────────┘
```

---

## Component Props (Implementation Reference)

```typescript
interface SlideOutPanelProps {
  // Display
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: 'narrow' | 'wide' | 'full'; // 400px | 600px | 100%
  position?: 'left' | 'right'; // Default: right

  // Content
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;

  // Behavior
  closeOnBackdropClick?: boolean; // Default: true
  closeOnEscape?: boolean; // Default: true
  showBackdrop?: boolean; // Default: true
  trapFocus?: boolean; // Default: true

  // Unsaved changes
  hasUnsavedChanges?: boolean;
  onConfirmClose?: () => Promise<boolean>;

  // Style
  className?: string;
  backdropClassName?: string;
}
```

---

## Renoz-Specific Examples

### 1. Customer Quick View

**Trigger:** Click customer name in leads list
**Width:** Wide (600px)
**Content:**
- Contact details
- Current status
- Assigned rep
- Recent activity (calls, emails)
- Open quotes
- Project history

**Footer:** [Open Full Customer View →]

### 2. Quote Edit Panel

**Trigger:** Click "Edit" on quote card
**Width:** Wide (600px)
**Content:**
- Quote title (editable)
- Customer selection
- Status (Draft/Sent/Accepted)
- Valid until date
- Line items (brief list)
- Notes

**Footer:** [Cancel] [Save Changes]

### 3. Quick Add Customer

**Trigger:** "+ New Customer" button
**Width:** Wide (600px)
**Content:**
- First name (required)
- Last name (required)
- Email
- Phone
- Lead source (required)
- Address (optional)

**Footer:** [Cancel] [Create & Close] [Create & Open →]

### 4. Quote Filters

**Trigger:** "Filters" button on quotes list
**Width:** Narrow (400px)
**Position:** Right
**Content:**
- Status checkboxes
- Date range picker
- Assigned user dropdown
- Amount range inputs
- Customer search

**Footer:** [Reset All] [Apply] (N)

### 5. Activity Notifications

**Trigger:** Bell icon in header
**Width:** Narrow (400px)
**Content:**
- Quote status changes
- New customer assignments
- Follow-up reminders
- Payment confirmations
- System alerts

**Actions:** [Mark All Read] [Clear All]

---

## Implementation Notes

1. **Z-Index Layering:**
   - Main content: 1
   - Backdrop: 40
   - Panel: 50
   - Modals (if opened from panel): 60

2. **Scroll Lock:**
   - When panel opens, add `overflow: hidden` to body
   - Prevent background scroll on mobile
   - Restore scroll position on close

3. **Animation Performance:**
   - Use `transform: translateX()` not `left/right`
   - Use `will-change: transform` during animation
   - Remove after animation completes

4. **Nested Panels:**
   - Avoid opening panel from within panel
   - Use modal dialogs for secondary actions
   - If unavoidable, increase z-index by 10

5. **State Management:**
   - Panel state in URL for deep linking (optional)
   - Restore panel state on page refresh
   - Clear state on navigation

---

**End of Wireframe**
