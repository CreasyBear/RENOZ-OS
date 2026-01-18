# Modal/Dialog Patterns Wireframe

**Purpose:** Define modal and dialog patterns for Renoz CRM, covering confirmations, alerts, forms, selections, and full-screen workflows.

---

## 1. Confirmation Dialog

**Use cases:** Delete customer, archive project, cancel quote, void invoice

### Visual Structure

```
┌─────────────────────────────────────────┐
│  ⚠️  Delete Customer?                   │
│                                         │
│  Are you sure you want to delete        │
│  "John Smith"? This action cannot       │
│  be undone. All associated quotes       │
│  and projects will be archived.         │
│                                         │
│         [Cancel]    [Delete]            │
└─────────────────────────────────────────┘
```

### States & Variants

**Default Confirmation:**
- Icon: Info (blue) or Warning (amber)
- Confirm button: Primary blue
- Message: Neutral tone

**Destructive Confirmation:**
- Icon: Warning (red triangle) or Danger (red circle)
- Confirm button: Red/danger variant
- Message: Emphasizes irreversibility
- Example: "Delete Customer" button is red

**Loading State:**
```
┌─────────────────────────────────────────┐
│  ⚠️  Delete Customer?                   │
│                                         │
│  Are you sure you want to delete        │
│  "John Smith"? This action cannot       │
│  be undone.                             │
│                                         │
│         [Cancel]    [⏳ Deleting...]    │
└─────────────────────────────────────────┘
```
- Confirm button shows spinner + disabled state
- Cancel button disabled during action
- Backdrop click disabled

### Behavior

- **Size:** sm (400px max width)
- **Backdrop:** Semi-transparent overlay (bg-black/50)
- **Backdrop click:** Closes modal (unless loading)
- **Keyboard:**
  - `Escape`: Closes modal (same as Cancel)
  - `Enter`: Triggers confirm action
  - Focus trap: Tabs only within modal
- **Animation:** Fade in backdrop + scale modal from 95% to 100%
- **Focus:** Auto-focus Cancel button by default (destructive actions require explicit click on Confirm)

### Example Use Cases

1. **Delete Customer**
   - Icon: Red warning triangle
   - Title: "Delete Customer?"
   - Message: Lists consequences (archived quotes, projects)
   - Confirm: Red "Delete" button

2. **Archive Project**
   - Icon: Amber warning
   - Title: "Archive Project?"
   - Message: "Project will be moved to archive and hidden from active lists"
   - Confirm: Blue "Archive" button

3. **Cancel Quote**
   - Icon: Blue info
   - Title: "Cancel Quote #1234?"
   - Message: "Customer will be notified of cancellation"
   - Confirm: Blue "Cancel Quote" button

---

## 2. Alert/Info Dialog

**Use cases:** Success confirmations, error messages, informational notices

### Visual Structure

```
┌─────────────────────────────────────────┐
│  ✓  Quote Sent Successfully             │
│                                         │
│  Quote #1234 has been emailed to        │
│  john@example.com. Customer can         │
│  view and approve online.               │
│                                         │
│                  [OK]                   │
└─────────────────────────────────────────┘
```

### Variants

**Success:**
- Icon: Green checkmark circle
- Title: Positive confirmation
- Message: What happened next
- Button: Green "OK"

**Error:**
```
┌─────────────────────────────────────────┐
│  ✗  Payment Failed                      │
│                                         │
│  Unable to process payment. Card        │
│  was declined. Please try a different   │
│  payment method.                        │
│                                         │
│                  [OK]                   │
└─────────────────────────────────────────┘
```
- Icon: Red X circle
- Title: What failed
- Message: Why it failed + next steps
- Button: Red "OK"

**Warning:**
```
┌─────────────────────────────────────────┐
│  ⚠️  Session Expiring Soon              │
│                                         │
│  Your session will expire in 2 minutes. │
│  Save your work to avoid losing         │
│  changes.                               │
│                                         │
│                  [OK]                   │
└─────────────────────────────────────────┘
```
- Icon: Amber warning triangle
- Title: What's happening
- Message: Impact + action needed
- Button: Amber "OK"

**Info:**
- Icon: Blue info circle
- Title: Informational
- Message: Context or explanation
- Button: Blue "OK"

### Behavior

- **Size:** sm (400px max width)
- **Backdrop:** Semi-transparent overlay
- **Backdrop click:** Closes modal
- **Keyboard:**
  - `Escape` or `Enter`: Closes modal
  - Focus trap active
- **Animation:** Fade + scale
- **Focus:** Auto-focus "OK" button
- **Auto-dismiss:** Optional 5-second timeout for success messages (shows countdown)

---

## 3. Form Modal

**Use cases:** Add customer, create quote, edit product, update status

### Visual Structure

```
┌───────────────────────────────────────────────┐
│  Add Customer                            ✕    │
├───────────────────────────────────────────────┤
│                                               │
│  Customer Name *                              │
│  [________________________]                   │
│                                               │
│  Email *                                      │
│  [________________________]                   │
│                                               │
│  Phone                                        │
│  [________________________]                   │
│                                               │
│  Address                                      │
│  [________________________]                   │
│  [________________________]                   │
│                                               │
│  Notes                                        │
│  [________________________]                   │
│  [________________________]                   │
│  [________________________]                   │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Save]       │
└───────────────────────────────────────────────┘
```

### Features

**Header:**
- Title (modal purpose)
- Close button (X) top-right
- Optional subtitle/description

**Content:**
- Scrollable if content exceeds max height (70vh)
- Form fields with labels
- Required field indicators (*)
- Validation errors inline
- Helper text below fields

**Footer:**
- Sticky at bottom
- Cancel button (left or right depending on pattern)
- Submit button (primary action)
- Loading state on submit

### States

**Default:**
```
│                      [Cancel]    [Save]       │
```

**Validation Error:**
```
│  Email *                                      │
│  [john@invalid___________________]            │
│  ⚠️ Please enter a valid email address        │
```

**Loading/Submitting:**
```
│                      [Cancel]    [⏳ Saving...]│
```
- Submit button disabled with spinner
- Cancel button disabled
- Form fields disabled
- Backdrop click disabled

**Success (optional inline):**
```
│  ✓ Customer created successfully!            │
│                                               │
│                      [Cancel]    [Save]       │
```
- Brief success message at top
- Auto-closes after 1 second or requires OK

### Size Variants

- **sm:** 400px - Simple forms (2-3 fields)
- **md:** 600px - Standard forms (4-6 fields) - DEFAULT
- **lg:** 800px - Complex forms (7+ fields, multiple sections)

### Behavior

- **Backdrop:** Semi-transparent overlay
- **Backdrop click:** Shows confirmation if form is dirty ("Discard changes?")
- **Keyboard:**
  - `Escape`: Same as Cancel (confirms if dirty)
  - `Enter`: Submits form (if not in textarea)
  - Focus trap active
- **Animation:** Fade + slide up from bottom (mobile) or scale (desktop)
- **Focus:** Auto-focus first input field
- **Unsaved changes:** Warn on close if form modified

### Example: Add Customer

```
┌───────────────────────────────────────────────┐
│  Add Customer                            ✕    │
├───────────────────────────────────────────────┤
│                                               │
│  Customer Name *                              │
│  [John Smith_______________]                  │
│                                               │
│  Email *                                      │
│  [john@example.com_________]                  │
│                                               │
│  Phone                                        │
│  [(555) 123-4567___________]                  │
│                                               │
│  Company                                      │
│  [Smith Construction_______]                  │
│                                               │
│  Type                                         │
│  [Residential ▼____________]                  │
│                                               │
│  Address                                      │
│  [123 Main St______________]                  │
│  [Apt 2B___________________]                  │
│  [Springfield______________] [IL ▼] [62701__] │
│                                               │
│  Notes                                        │
│  [________________________]                   │
│  [________________________]                   │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Add Customer]│
└───────────────────────────────────────────────┘
```

---

## 4. Selection Modal

**Use cases:** Select product, choose template, pick customer, assign tech

### Visual Structure

```
┌───────────────────────────────────────────────┐
│  Select Product                          ✕    │
├───────────────────────────────────────────────┤
│  🔍 [Search products...________________]      │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ ☐ HVAC Repair - Service Call           │ │
│  │   $150.00                               │ │
│  ├─────────────────────────────────────────┤ │
│  │ ☑ AC Unit - 3 Ton Split System         │ │
│  │   $3,200.00                             │ │
│  ├─────────────────────────────────────────┤ │
│  │ ☑ Ductwork - per linear foot           │ │
│  │   $45.00                                │ │
│  ├─────────────────────────────────────────┤ │
│  │ ☐ Thermostat - Smart WiFi              │ │
│  │   $275.00                               │ │
│  ├─────────────────────────────────────────┤ │
│  │ ☐ Air Filter - HEPA Premium            │ │
│  │   $35.00                                │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  2 items selected                             │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Add Selected]│
└───────────────────────────────────────────────┘
```

### Features

**Search/Filter:**
- Search input at top
- Filters as needed (category, status, etc.)
- Real-time filtering
- Empty state if no results

**Selection List:**
- Scrollable list/grid
- Checkboxes for multi-select (or radio for single-select)
- Item preview (name, price, description, thumbnail)
- Visual selected state (highlighted row)
- Optional "Select All" checkbox

**Selection Counter:**
- Shows "X items selected" if multi-select
- Updates in real-time
- Hidden if single-select

**Footer:**
- Cancel button
- Confirm button (disabled if nothing selected)
- Button label reflects selection ("Add Selected", "Choose", etc.)

### Variants

**Single Selection (Radio):**
```
┌───────────────────────────────────────────────┐
│  Choose Template                         ✕    │
├───────────────────────────────────────────────┤
│  🔍 [Search templates..._______________]      │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ ○ Standard Quote                        │ │
│  │   Basic itemized quote                  │ │
│  ├─────────────────────────────────────────┤ │
│  │ ● Premium Quote                         │ │
│  │   Detailed with photos & diagrams       │ │
│  ├─────────────────────────────────────────┤ │
│  │ ○ Service Quote                         │ │
│  │   For repair & maintenance              │ │
│  └─────────────────────────────────────────┘ │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Use Template]│
└───────────────────────────────────────────────┘
```

**Grid View:**
```
┌───────────────────────────────────────────────┐
│  Select Photo                            ✕    │
├───────────────────────────────────────────────┤
│  🔍 [Search photos...________________]        │
│                                               │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐    │
│  │ ☑ [IMG]│ │   [IMG]│ │   [IMG]│ │   [IMG]│    │
│  │ Photo1 │ │ Photo2 │ │ Photo3 │ │ Photo4 │    │
│  └───────┘ └───────┘ └───────┘ └───────┘    │
│                                               │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐    │
│  │   [IMG]│ │ ☑ [IMG]│ │   [IMG]│ │   [IMG]│    │
│  │ Photo5 │ │ Photo6 │ │ Photo7 │ │ Photo8 │    │
│  └───────┘ └───────┘ └───────┘ └───────┘    │
│                                               │
│  2 photos selected                            │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Attach Photos]│
└───────────────────────────────────────────────┘
```

### Behavior

- **Size:** md (600px) or lg (800px) for grids
- **Backdrop:** Semi-transparent overlay
- **Backdrop click:** Closes modal (no confirmation needed)
- **Keyboard:**
  - `Escape`: Closes modal
  - `Enter`: Confirms selection (if item focused)
  - Arrow keys: Navigate list
  - Space: Toggle selection
  - Focus trap active
- **Animation:** Fade + scale
- **Focus:** Auto-focus search input
- **Loading:** Show skeleton loaders while fetching items
- **Pagination:** Load more on scroll or "Load More" button

### Example: Select Product (Renoz)

Used when adding line items to quotes or invoices. Products from inventory, with pricing and descriptions.

---

## 5. Full-Screen Modal

**Use cases:** Quote builder wizard, project workflow, photo gallery editor, complex multi-step forms

### Visual Structure

```
┌─────────────────────────────────────────────────────┐
│  Create Quote            Step 2 of 4            ✕   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │                                               │ │
│  │                                               │ │
│  │          FULL CONTENT AREA                    │ │
│  │          (Entire viewport height)             │ │
│  │                                               │ │
│  │                                               │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Cancel]                        [Back]    [Next]   │
└─────────────────────────────────────────────────────┘
```

### Features

**Header:**
- Title (workflow/modal name)
- Progress indicator (Step X of Y, or progress bar)
- Close button (X) - shows exit confirmation if dirty
- Optional secondary actions (Save Draft)

**Content:**
- Full viewport height (minus header/footer)
- Scrollable independently
- Can contain complex layouts (sidebar + main, tabs, etc.)
- No max-width constraint

**Footer:**
- Sticky at bottom
- Navigation buttons (Back, Next, Skip)
- Action buttons (Cancel, Save Draft, Submit)
- Progress dots/steps if applicable

### Wizard Variant

```
┌─────────────────────────────────────────────────────┐
│  Create Quote                                   ✕   │
│  ●───●───○───○                                      │
│  Customer  Products  Details  Review                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Step 1: Select Customer                            │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │  (Customer selection interface)             │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Cancel]                                   [Next]  │
└─────────────────────────────────────────────────────┘

(Step 2)
┌─────────────────────────────────────────────────────┐
│  Create Quote                                   ✕   │
│  ●───●───○───○                                      │
│  Customer  Products  Details  Review                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Step 2: Add Products                               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │  (Product selection + line items)           │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Cancel]                          [Back]    [Next] │
└─────────────────────────────────────────────────────┘
```

**Progress Steps:**
- Visual indicator at top (dots, line, or bar)
- Current step highlighted
- Completed steps marked (checkmark or filled)
- Future steps grayed out
- Step labels below indicators

### Complex Layout Variant

```
┌─────────────────────────────────────────────────────┐
│  Project Workflow                               ✕   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┬───────────────────────────────────┐   │
│  │ Steps   │                                   │   │
│  ├─────────┤                                   │   │
│  │ ✓ Quote │                                   │   │
│  │ ● Design│        MAIN CONTENT               │   │
│  │   Build │        (Active step interface)    │   │
│  │   Review│                                   │   │
│  │   Close │                                   │   │
│  └─────────┴───────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Save & Exit]                      [Back]  [Next]  │
└─────────────────────────────────────────────────────┘
```

**Sidebar Navigation:**
- Left sidebar with step list
- Click to jump between steps (if allowed)
- Visual state for completed/current/future
- Main content area on right

### Behavior

- **Size:** full - Takes entire viewport
- **Backdrop:** None (modal IS the viewport)
- **Backdrop click:** N/A
- **Keyboard:**
  - `Escape`: Shows exit confirmation ("Exit workflow?")
  - No Enter shortcut (prevents accidental submission)
  - Focus trap active
- **Animation:** Slide in from right (or fade in place)
- **Focus:** Auto-focus first input or main action
- **Exit confirmation:** Always confirm if data entered
- **State preservation:** Save draft state between sessions
- **Mobile:** Typically takes full screen (no difference)

### Example: Quote Builder Wizard (Renoz)

**Step 1 - Select Customer:**
- Search/select existing customer or create new
- Displays customer details when selected

**Step 2 - Add Products:**
- Product selection modal/interface
- Line item table with quantities, prices
- Add/remove line items
- Calculate subtotal

**Step 3 - Quote Details:**
- Quote title, description
- Expiration date
- Terms & conditions
- Discount/tax settings

**Step 4 - Review & Send:**
- Preview quote as customer will see it
- Send options (email, link, print)
- Save as draft or send immediately

---

## Shared Modal Behaviors

### Sizing System

| Size | Max Width | Use Case |
|------|-----------|----------|
| **xs** | 320px | Small alerts, simple prompts |
| **sm** | 400px | Confirmations, basic alerts |
| **md** | 600px | Standard forms, selections |
| **lg** | 800px | Complex forms, wide content |
| **xl** | 1000px | Very complex forms, galleries |
| **full** | 100vw | Wizards, workflows, builders |

### Responsive Behavior

**Desktop (≥768px):**
- Modal appears centered
- Max width respected
- Scale animation from center

**Mobile (<768px):**
- sm/md modals: Slide up from bottom, 90vh max height
- lg/xl modals: Full screen (like full variant)
- full modals: Always full screen

### Z-Index Layers

```
Backdrop:  z-40
Modal:     z-50
Dropdown:  z-60  (dropdowns within modal)
Toast:     z-70  (notifications above modal)
```

### Animation Timing

```css
/* Entry */
backdrop: fade-in 200ms ease-out
modal:    scale(0.95 → 1.0) + fade-in 200ms ease-out

/* Exit */
backdrop: fade-out 150ms ease-in
modal:    scale(1.0 → 0.95) + fade-out 150ms ease-in
```

### Accessibility

- **ARIA roles:** `role="dialog"`, `aria-modal="true"`
- **ARIA labels:** `aria-labelledby` (title), `aria-describedby` (description)
- **Focus trap:** Tab cycles only within modal
- **Focus restore:** Returns focus to trigger element on close
- **Screen reader:** Announces modal open/close
- **Keyboard:** Full keyboard navigation support

### Stacking Behavior

**Modal over modal:**
- Supported for selection modals inside form modals
- Max 2 levels deep
- Each level increases z-index by 10
- Each backdrop slightly darkens previous level

```
Form Modal (z-50)
  ↓ Opens selection modal
  Selection Modal (z-60)
    ↓ Closes
  Back to Form Modal (z-50)
```

---

## Implementation Notes

### State Management

All modals should manage:
- `isOpen` (boolean)
- `isLoading` (boolean) - for submit states
- `isDirty` (boolean) - for unsaved changes
- `data` (object) - modal-specific data

### Close Confirmation Pattern

```javascript
function handleClose() {
  if (isDirty) {
    showConfirmation({
      title: "Discard changes?",
      message: "You have unsaved changes. Are you sure you want to close?",
      onConfirm: () => modal.close()
    });
  } else {
    modal.close();
  }
}
```

### Loading State Pattern

```javascript
async function handleSubmit() {
  setIsLoading(true);
  try {
    await saveData(formData);
    showSuccess("Saved successfully!");
    modal.close();
  } catch (error) {
    showError(error.message);
  } finally {
    setIsLoading(false);
  }
}
```

---

## Renoz-Specific Examples

### Delete Customer Confirmation

```
┌─────────────────────────────────────────┐
│  ⚠️  Delete Customer?                   │
│                                         │
│  Are you sure you want to delete        │
│  "John Smith (Smith Construction)"?     │
│                                         │
│  This will:                             │
│  • Archive 3 quotes                     │
│  • Archive 2 active projects            │
│  • Remove from all follow-up lists      │
│                                         │
│  This action cannot be undone.          │
│                                         │
│         [Cancel]    [Delete Customer]   │
└─────────────────────────────────────────┘
```

### Select Product for Quote

```
┌───────────────────────────────────────────────┐
│  Add Line Item                           ✕    │
├───────────────────────────────────────────────┤
│  🔍 [Search products & services...______]     │
│                                               │
│  Products (8)  Services (4)  Materials (12)   │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ AC Unit - 3 Ton Split System            │ │
│  │ $3,200.00 · Product · In Stock          │ │
│  ├─────────────────────────────────────────┤ │
│  │ HVAC Repair - Service Call              │ │
│  │ $150.00/hr · Service                    │ │
│  ├─────────────────────────────────────────┤ │
│  │ Ductwork Installation                   │ │
│  │ $45.00/ft · Service                     │ │
│  ├─────────────────────────────────────────┤ │
│  │ Thermostat - Smart WiFi                 │ │
│  │ $275.00 · Product · In Stock            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Add to Quote]│
└───────────────────────────────────────────────┘
```

### Quote Status Change (Form Modal)

```
┌───────────────────────────────────────────────┐
│  Update Quote Status                     ✕    │
├───────────────────────────────────────────────┤
│                                               │
│  Quote #1234 - John Smith                     │
│                                               │
│  New Status *                                 │
│  ┌─────────────────────────────────────────┐ │
│  │ ○ Draft                                 │ │
│  │ ● Sent                                  │ │
│  │ ○ Approved                              │ │
│  │ ○ Declined                              │ │
│  │ ○ Expired                               │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ☑ Send notification to customer              │
│                                               │
│  Notes (optional)                             │
│  [Quote sent via email on 1/10/2026_____]    │
│  [_______________________________________]    │
│                                               │
├───────────────────────────────────────────────┤
│                      [Cancel]    [Update Status]│
└───────────────────────────────────────────────┘
```

---

## Design Tokens

### Spacing
- Modal padding: `p-6` (24px)
- Header/footer padding: `px-6 py-4` (24px/16px)
- Content padding: `p-6`
- Gap between elements: `gap-4` (16px)

### Colors
- Backdrop: `bg-gray-900/50` (50% opacity black)
- Modal background: `bg-white` (light mode), `bg-gray-800` (dark mode)
- Border: `border-gray-200` (light), `border-gray-700` (dark)

### Shadows
- Modal shadow: `shadow-2xl` (large, dramatic shadow)
- Elevated footer: `shadow-lg` (if sticky footer)

### Borders
- Modal border-radius: `rounded-lg` (8px)
- Inner sections: `border-t border-gray-200`

### Typography
- Modal title: `text-lg font-semibold` (18px, 600 weight)
- Modal description: `text-sm text-gray-600` (14px, muted)
- Button text: `text-sm font-medium` (14px, 500 weight)

---

**End of Modal Patterns Wireframe**
