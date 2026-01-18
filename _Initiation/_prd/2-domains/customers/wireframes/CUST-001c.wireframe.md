# Wireframe: DOM-CUST-001c - Customer Tags: UI Components
**Version: v1.1 - Added Renoz battery industry context**

## Story Reference

- **Story ID**: DOM-CUST-001c
- **Name**: Customer Tags: UI Components
- **PRD**: memory-bank/prd/domains/customers.prd.json
- **Type**: UI Component
- **Component Type**: MultiSelectCombobox

## Overview

UI for managing and displaying customer tags including tag badges, tag selector multi-select combobox, and tag management dialog for settings.

---

## UI Patterns (Reference Implementation)

### Multi-Select Combobox
- **Pattern**: RE-UI Command with multi-select
- **Reference**: `_reference/.reui-reference/registry/default/ui/command.tsx`
- **Features**:
  - Search/filter with keyboard navigation
  - Checkbox selection (multiple)
  - Keyboard shortcuts (Arrow keys, Enter, Escape)
  - Selected items shown as removable badges
  - Create new option inline

### Tag Badge Component
- **Pattern**: RE-UI Badge variants
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded with semantic meanings
  - Removable variant with X button
  - Pill shape for tag-like appearance
  - Hover states with subtle elevation

### Tag Manager Dialog
- **Pattern**: RE-UI Dialog with data table
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Modal overlay with focus trap
  - Scrollable content area
  - Action buttons in footer
  - Accessible close mechanisms

### Color Picker
- **Pattern**: Predefined palette selector
- **Features**:
  - 8-10 color swatches
  - Visual preview of selected color
  - WCAG contrast-safe combinations

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | customers | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-CUST-001c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/solar installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Customer Types**: Small Installers (1-10 systems/mo), Medium Installers (11-50 systems/mo), Large Integrators (50+ systems/mo), Commercial BESS Specialists, Government/Utility Partners
- **Common Tags**: Solar Installer, BESS Buyer, Residential Focus, Commercial BESS, CEC Accredited, Tier 1 Partner, Volume Buyer

---

## Mobile Wireframe (320px - 640px)

### Tag Badge Display (Customer Detail Header)

```
┌────────────────────────────────────────┐
│ ← Customers                            │
├────────────────────────────────────────┤
│                                        │
│  Sydney Solar Solutions                │
│  ──────────────────────────────────    │
│  [Solar Installer] [BESS Buyer] +2     │
│        ↑ max 2 tags, overflow badge    │
│                                        │
│  [+Add Tag]                            │
│                                        │
└────────────────────────────────────────┘
```

### Tag Selector (Expanded - Full Screen Modal)

```
┌────────────────────────────────────────┐
│ Select Tags                    [Done]  │
├────────────────────────────────────────┤
│                                        │
│  [Search tags___________________] [X]  │
│                                        │
│  Selected:                             │
│  [Solar Installer ×] [BESS Buyer ×]    │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  Available Tags:                       │
│  ┌──────────────────────────────────┐  │
│  │ [✓] Solar Installer  ● #4CAF50  │  │
│  ├──────────────────────────────────┤  │
│  │ [✓] BESS Buyer       ● #2196F3  │  │
│  ├──────────────────────────────────┤  │
│  │ [ ] Residential Focus● #F44336  │  │
│  ├──────────────────────────────────┤  │
│  │ [ ] Commercial BESS  ● #FF9800  │  │
│  ├──────────────────────────────────┤  │
│  │ [ ] CEC Accredited   ● #9C27B0  │  │
│  ├──────────────────────────────────┤  │
│  │ [ ] Tier 1 Partner   ● #795548  │  │
│  ├──────────────────────────────────┤  │
│  │ [ ] Volume Buyer     ● #00BCD4  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [+ Create New Tag]                    │
│                                        │
└────────────────────────────────────────┘
```

### Customer List - Tags Column (Mobile)

```
┌────────────────────────────────────────┐
│ Customers                    [+ New]   │
├────────────────────────────────────────┤
│ [Search_______________] [Filter ▼]     │
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Sydney Solar Solutions           │   │
│ │ mike@sydneysolar.com.au          │   │
│ │ [Solar Installer] [BESS] +1      │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ GreenPower Installations         │   │
│ │ info@greenpower.com.au           │   │
│ │ [Tier 1 Partner] [Volume Buyer]  │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Coast Energy Systems             │   │
│ │ contact@coastenergy.com.au       │   │
│ │ [Commercial BESS]                │   │
│ │                        Active ● │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Tag Manager Dialog (Mobile - Full Screen)

```
┌────────────────────────────────────────┐
│ ← Manage Tags                          │
├────────────────────────────────────────┤
│                                        │
│  [+ Create New Tag]                    │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● Solar Installer               │  │
│  │ Small to medium solar installers │  │
│  │                    [Edit] [Del] │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● BESS Buyer                    │  │
│  │ Battery energy storage buyers    │  │
│  │                    [Edit] [Del] │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● CEC Accredited                │  │
│  │ Clean Energy Council accredited  │  │
│  │                    [Edit] [Del] │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● Volume Buyer                  │  │
│  │ 50+ systems per month            │  │
│  │                    [Edit] [Del] │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px - 1024px)

### Tag Badge Display (Customer Detail Header)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Sydney Solar Solutions                    [Edit] [Actions ▼]  │
│  mike@sydneysolar.com.au | +61 2 9000 0123                                  │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│  [Solar Installer] [BESS Buyer] [Residential] [CEC] +2 more   │
│        ↑ max 4 tags inline, overflow badge                    │
│                                                               │
│  [+ Add Tag]                                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Tag Selector (Dropdown Panel)

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  Tags: [Solar Installer ×] [BESS Buyer ×]        [+ Add Tag]  │
│        ┌─────────────────────────────────────┐                │
│        │ [Search tags_______________] [X]    │                │
│        │                                     │                │
│        │ [✓] Solar Installer   ● #4CAF50    │                │
│        │ [✓] BESS Buyer        ● #2196F3    │                │
│        │ [ ] Residential Focus ● #F44336    │                │
│        │ [ ] Commercial BESS   ● #FF9800    │                │
│        │ [ ] CEC Accredited    ● #9C27B0    │                │
│        │ [ ] Tier 1 Partner    ● #795548    │                │
│        │ [ ] Volume Buyer      ● #00BCD4    │                │
│        │ ─────────────────────────────────  │                │
│        │ [+ Create New Tag]                  │                │
│        └─────────────────────────────────────┘                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Customer List with Tags Column

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Customers                                              [+ New Customer]   │
├───────────────────────────────────────────────────────────────────────────┤
│ [Search_____________________] [Status ▼] [Tags ▼] [Sort: Name ▼]         │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  □  Name              Email              Tags                    Status   │
│  ─────────────────────────────────────────────────────────────────────── │
│  □  Sydney Solar Solutions  mike@sydneysolar.com.au  [Solar][BESS][Res][CEC]  ● Active │
│  □  GreenPower Installations  info@greenpower.com.au   [Tier 1][Volume]         ● Active │
│  □  Coast Energy Systems     contact@coastenergy.com.au  [Commercial BESS]         ○ Inact. │
│  □  Queensland Solar         sales@qldsolar.com.au     [Solar][CEC][Volume]     ● Active │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Tag Manager Dialog (Modal)

```
┌─────────────────────────────────────────────────────────────┐
│ Manage Customer Tags                                   [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [+ Create New Tag]                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Name          Color      Description        Actions │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ ● Solar Installer  #4CAF50  Small-medium... [Ed][Del]│    │
│  │ ● BESS Buyer       #2196F3  Battery buyer   [Ed][Del]│    │
│  │ ● Residential      #F44336  Home systems    [Ed][Del]│    │
│  │ ● Commercial BESS  #FF9800  Large BESS      [Ed][Del]│    │
│  │ ● CEC Accredited   #9C27B0  CEC certified   [Ed][Del]│    │
│  │ ● Tier 1 Partner   #795548  Top tier buyer  [Ed][Del]│    │
│  │ ● Volume Buyer     #00BCD4  50+ systems/mo  [Ed][Del]│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                              [Close]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Tag Badge Display (Customer Detail Header)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products     [Bell] [User] │
├──────────┬──────────────────────────────────────────────────────────────────────────┤
│          │                                                                          │
│ Dashboard│  ← Back to Customers                                                     │
│ ──────── │                                                                          │
│ Customers│  Sydney Solar Solutions                     [New Order] [Edit] [More ▼]  │
│ Orders   │  mike@sydneysolar.com.au | +61 2 9000 0123 | ABN: 12345678901                          │
│ Quotes   │  ────────────────────────────────────────────────────────────────────    │
│ Products │                                                                          │
│ Settings │  [Solar Installer] [BESS Buyer] [Residential] [CEC] [Tier 1] [Volume]   │
│          │  ↑ All tags visible with horizontal scroll on overflow                   │
│          │                                                                          │
│          │  [+ Add Tag]                                                             │
│          │                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Tag Selector (Inline Dropdown)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  Tags:                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ [Solar Installer ×] [BESS Buyer ×] [Residential ×]         [+ Add ▼]  ││
│  │         ┌─────────────────────────────────────────────────────────┐         ││
│  │         │ [Search tags_________________________________] [X]     │         ││
│  │         │                                                         │         ││
│  │         │ Selected:                                               │         ││
│  │         │ [✓] Solar Installer     ● #4CAF50    Small-medium      │         ││
│  │         │ [✓] BESS Buyer          ● #2196F3    Battery buyer     │         ││
│  │         │ [✓] Residential Focus   ● #F44336    Home systems      │         ││
│  │         │                                                         │         ││
│  │         │ ─────────────────────────────────────────────────────  │         ││
│  │         │                                                         │         ││
│  │         │ Available:                                              │         ││
│  │         │ [ ] Commercial BESS     ● #FF9800    Large BESS        │         ││
│  │         │ [ ] CEC Accredited      ● #9C27B0    CEC certified     │         ││
│  │         │ [ ] Tier 1 Partner      ● #795548    Top tier buyer    │         ││
│  │         │ [ ] Volume Buyer        ● #00BCD4    50+ systems/mo    │         ││
│  │         │                                                         │         ││
│  │         │ ─────────────────────────────────────────────────────  │         ││
│  │         │ [+ Create New Tag]                                      │         ││
│  │         └─────────────────────────────────────────────────────────┘         ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Customer List with Tags Column

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ Customers                                                            [+ New Customer]      │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Search________________________] [Status ▼] [Tags ▼] [Credit ▼] [Health ▼] [Sort: Name ▼] │
│                                                                                            │
│ Active Filters: [Solar Installer ×] [BESS Buyer ×]                  [Clear All Filters]  │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  □  Name              Email              Phone          Tags                      Status   │
│  ─────────────────────────────────────────────────────────────────────────────────────── │
│  □  Sydney Solar Solutions   mike@sydneysolar.com.au  02-9000-0123  [Solar][BESS][Res]       ● Active │
│  □  GreenPower Installations info@greenpower.com.au   07-3000-0124  [Tier 1][Volume]          ● Active │
│  □  Coast Energy Systems    contact@coastenergy.com.au 02-9000-0125 [Commercial BESS]         ○ Inact. │
│  □  Queensland Solar        sales@qldsolar.com.au     07-3000-0126  [Solar][CEC][Volume]      ● Active │
│  □  Melbourne Battery Co    hello@melbattery.com.au   03-9000-0127  [BESS][Commercial]        ● Active │
│                                                                                            │
│  < 1 2 3 ... 10 >                                    Showing 1-25 of 234 customers        │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tag Manager Dialog (Settings Page)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Settings > Manage Customer Tags                                              [×]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  [+ Create New Tag]                                   [Search tags__________]     │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  Name            Color       Description                 Customers  Actions │  │
│  │  ───────────────────────────────────────────────────────────────────────── │  │
│  │  ● Solar Installer  #4CAF50  Small-medium installers         45   [Ed][De]│  │
│  │  ● BESS Buyer       #2196F3  Battery system buyers           67   [Ed][De]│  │
│  │  ● Residential      #F44336  Home system focus               89   [Ed][De]│  │
│  │  ● Commercial BESS  #FF9800  Large BESS specialists          23   [Ed][De]│  │
│  │  ● CEC Accredited   #9C27B0  Clean Energy Council cert       102  [Ed][De]│  │
│  │  ● Tier 1 Partner   #795548  Top tier volume buyers          18   [Ed][De]│  │
│  │  ● Volume Buyer     #00BCD4  50+ systems per month           31   [Ed][De]│  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  Create/Edit Tag Dialog:                                                          │
│  ┌─────────────────────────────────────────┐                                      │
│  │ Create New Tag                     [×]  │                                      │
│  │                                         │                                      │
│  │ Name *                                  │                                      │
│  │ [________________________]              │                                      │
│  │                                         │                                      │
│  │ Color *                                 │                                      │
│  │ [● #4CAF50 ▼] ● ● ● ● ● ● ● ● (palette)│                                      │
│  │                                         │                                      │
│  │ Description                             │                                      │
│  │ [________________________________]      │                                      │
│  │ [________________________________]      │                                      │
│  │                                         │                                      │
│  │              [Cancel]    [Create Tag]   │                                      │
│  └─────────────────────────────────────────┘                                      │
│                                                                                   │
│                                                         [Done]                    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
TAG BADGES LOADING:
┌────────────────────────────────────────┐
│  [.......] [..........] [....]         │
│  ↑ Skeleton badges with pulse          │
└────────────────────────────────────────┘

TAG SELECTOR LOADING:
┌─────────────────────────────────────┐
│ [Search tags_______________]        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [..........................] │  │
│  │ [..........................] │  │
│  │ [..........................] │  │
│  └───────────────────────────────┘  │
│  ↑ Skeleton rows with shimmer       │
└─────────────────────────────────────┘

TAG ASSIGNMENT IN PROGRESS:
┌────────────────────────────────────────┐
│  [Solar Installer ...] [BESS Buyer]    │
│                ↑ Pulse animation        │
└────────────────────────────────────────┘
```

### Empty States

```
NO TAGS CREATED (Tag Selector):
┌─────────────────────────────────────────┐
│                                         │
│           ┌─────────┐                   │
│           │  [tag]  │                   │
│           └─────────┘                   │
│                                         │
│         No tags yet                     │
│                                         │
│    Tags help you organize and           │
│    filter your customers                │
│                                         │
│      [+ Add your first tag]             │
│                                         │
└─────────────────────────────────────────┘

NO TAGS ON CUSTOMER:
┌────────────────────────────────────────┐
│  Tags: None                [+ Add Tag] │
└────────────────────────────────────────┘

NO MATCHING TAGS (Search):
┌─────────────────────────────────────────┐
│ [Search: "xyz"_________________]        │
│                                         │
│  No tags matching "xyz"                 │
│                                         │
│  [+ Create tag "xyz"]                   │
│                                         │
└─────────────────────────────────────────┘
```

### Error States

```
FAILED TO LOAD TAGS:
┌─────────────────────────────────────────┐
│  [!] Couldn't load tags                 │
│                                         │
│  [Retry]                                │
└─────────────────────────────────────────┘

FAILED TO ASSIGN TAG:
┌────────────────────────────────────────┐
│  [Solar Installer] [BESS Buyer [!]]    │
│         ↑ Error indicator               │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Failed to add "BESS Buyer"        │ │
│  │                        [Retry]    │ │
│  └───────────────────────────────────┘ │
└────────────────────────────────────────┘

TAG DELETION ERROR:
┌─────────────────────────────────────────┐
│                                         │
│  [!] Cannot delete tag                  │
│                                         │
│  "Solar Installer" is assigned to 45    │
│  customers. Remove from all customers   │
│  first.                                 │
│                                         │
│            [OK]                         │
│                                         │
└─────────────────────────────────────────┘
```

### Success States

```
TAG ASSIGNED:
┌────────────────────────────────────────┐
│  [Solar Installer ok] [BESS] [Res]     │
│      ↑ Brief checkmark animation        │
└────────────────────────────────────────┘

TAG CREATED:
┌─────────────────────────────────────────┐
│  [ok] Tag "Volume Buyer" created        │
│       successfully                      │
│                                         │
│  <- Toast notification (3s)             │
└─────────────────────────────────────────┘

TAG REMOVED:
┌────────────────────────────────────────┐
│  [Solar Installer] [Residential]       │
│  ↑ BESS Buyer removed, list reflows    │
└────────────────────────────────────────┘
```

---

## Accessibility Notes

### Focus Order

1. **Tag Badge List**
   - Tab: Navigate between tag badges
   - Enter/Space: Open tag detail popover
   - Delete/Backspace on focused tag: Remove tag (with confirmation)

2. **Tag Selector**
   - Tab to "Add Tag" button
   - Enter to open dropdown
   - Tab through search input and options
   - Arrow Up/Down: Navigate options
   - Enter/Space: Toggle selection
   - Escape: Close dropdown

3. **Tag Manager Dialog**
   - Focus trapped within dialog
   - Tab through: Search, Create button, tag rows, action buttons
   - Escape: Close dialog
   - Return focus to trigger element on close

### ARIA Requirements

```html
<!-- Tag Badge -->
<span
  role="status"
  aria-label="Tag: Solar Installer, color green"
  tabindex="0"
>
  Solar Installer
</span>

<!-- Remove Tag Button -->
<button
  aria-label="Remove tag: Solar Installer"
  tabindex="0"
>
  x
</button>

<!-- Tag Selector Trigger -->
<button
  aria-expanded="false"
  aria-haspopup="listbox"
  aria-label="Select tags, 2 selected"
>
  + Add Tag
</button>

<!-- Tag Selector Listbox -->
<div
  role="listbox"
  aria-label="Available tags"
  aria-multiselectable="true"
>
  <div
    role="option"
    aria-selected="true"
    aria-label="Solar Installer, color green, selected"
  >
    Solar Installer
  </div>
</div>

<!-- Tag Manager Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="tag-manager-title"
>
  <h2 id="tag-manager-title">Manage Customer Tags</h2>
</div>
```

### Screen Reader Announcements

- Tag added: "Tag Solar Installer added to customer"
- Tag removed: "Tag Solar Installer removed from customer"
- Tag created: "Tag Solar Installer created successfully"
- Loading: "Loading tags"
- Error: "Failed to load tags, retry button available"

---

## Animation Choreography

### Tag Badge Entry

```
APPEAR (new tag assigned):
- Duration: 200ms
- Easing: ease-out
- Transform: scale(0.8) -> scale(1)
- Opacity: 0 -> 1

REMOVE (tag unassigned):
- Duration: 150ms
- Easing: ease-in
- Transform: scale(1) -> scale(0.8)
- Opacity: 1 -> 0
- Remaining tags shift left: 200ms ease-out
```

### Tag Selector Dropdown

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: translateY(-8px) -> translateY(0)
- Opacity: 0 -> 1
- Scale: 0.95 -> 1

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Transform: translateY(0) -> translateY(-8px)
- Opacity: 1 -> 0
```

### Selection Toggle

```
CHECK/UNCHECK:
- Duration: 150ms
- Checkbox: scale bounce (1 -> 1.2 -> 1)
- Row background: subtle highlight flash (100ms)
```

### Loading States

```
SKELETON SHIMMER:
- Duration: 1.5s
- Easing: linear
- Animation: background gradient sweep left to right
- Loop: infinite

PULSE (assignment in progress):
- Duration: 1s
- Easing: ease-in-out
- Opacity: 1 -> 0.5 -> 1
- Loop: infinite until complete
```

### Success Feedback

```
CHECKMARK FLASH:
- Duration: 300ms
- Icon: fade in (100ms) -> hold (150ms) -> fade out (50ms)
- Background: green tint flash (200ms)
```

---

## Design Inspiration

### Aesthetic Direction

- **Reference**: Modern tag/label systems (GitHub labels, Linear tags, Notion tags)
- **Color System**: Predefined palette of 8-10 colors with good contrast ratios
- **Badge Style**: Rounded pills with subtle background, readable text
- **Hover Effect**: Slight elevation/shadow increase
- **Selection**: Clear visual distinction (checkmark, highlight)

### Visual Hierarchy

1. Tag badges should be scannable at a glance
2. Color is secondary to text for identification (accessibility)
3. Add tag action is discoverable but not dominant
4. Filter chips mirror tag badge styling for consistency

### Reference Files

- `.square-ui-reference/templates/leads/` - Tag filter chips pattern
- `.reui-reference/components/ui/badge.tsx` - Badge styling foundation

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/customers/tag-badge.tsx` | Individual tag badge display |
| `src/components/domain/customers/tag-selector.tsx` | Multi-select combobox for tags |
| `src/components/domain/customers/tag-manager-dialog.tsx` | CRUD UI for settings |
| `src/routes/_authed/customers/$customerId.tsx` | Integration point |
| `src/components/domain/customers/customer-columns.tsx` | List column integration |
