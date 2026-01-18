# App Shell Layout Wireframe

**Version:** 1.1
**Date:** 2026-01-10
**Component Type:** Foundation Layout
**Status:** Updated with Design System Tokens

---

## Overview

The app shell provides the foundational layout structure for the Renoz Energy CRM. It includes persistent navigation, header utilities, and a responsive content area that adapts to different screen sizes and user roles.

**Design Philosophy:** Refined Professional (Stripe/Notion-inspired) with warm stone neutrals, deep teal primary, and warm amber accents.

---

## Layout Structure

### Desktop View (≥1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────────────────────────────────────┐ │
│  │          │  │  Header                                          │ │
│  │          │  │  ┌────────────────┬──────────────┬──────────────┐│ │
│  │  Sidebar │  │  │ Breadcrumbs    │   Search ⌘K  │  🔔  👤      ││ │
│  │          │  │  └────────────────┴──────────────┴──────────────┘│ │
│  │          │  └──────────────────────────────────────────────────┘ │
│  │          │  ┌──────────────────────────────────────────────────┐ │
│  │   Nav    │  │                                                  │ │
│  │  Items   │  │                                                  │ │
│  │          │  │                                                  │ │
│  │          │  │         Main Content Area                        │ │
│  │          │  │                                                  │ │
│  │          │  │                                                  │ │
│  │          │  │                                                  │ │
│  │          │  │                                                  │ │
│  │          │  │                                                  │ │
│  │  User    │  │                                                  │ │
│  │  Menu    │  │                                                  │ │
│  └──────────┘  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Tablet View (768px - 1023px)

```
┌───────────────────────────────────────────────────────────────┐
│ ┌────┐  ┌──────────────────────────────────────────────────┐ │
│ │Side│  │  Header                                          │ │
│ │bar │  │  ┌──────────────┬──────────────┬──────────────┐  │ │
│ │    │  │  │ Breadcrumbs  │   Search ⌘K  │  🔔  👤      │  │ │
│ │Nav │  │  └──────────────┴──────────────┴──────────────┘  │ │
│ │    │  └──────────────────────────────────────────────────┘ │
│ │    │  ┌──────────────────────────────────────────────────┐ │
│ │    │  │                                                  │ │
│ │    │  │         Main Content Area                        │ │
│ │    │  │         (Optimized for tablet)                   │ │
│ │    │  │                                                  │ │
│ │    │  │                                                  │ │
│ └────┘  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Mobile View (<768px)

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │  Header                         │ │
│ │  ┌──────┬───────────┬─────────┐ │ │
│ │  │  ☰   │ Breadcr…  │  🔔  👤 │ │ │
│ │  └──────┴───────────┴─────────┘ │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │                                 │ │
│ │      Main Content Area          │ │
│ │      (Full width)               │ │
│ │                                 │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Component Specifications

### 1. Sidebar Navigation

#### Desktop/Tablet Layout
```
┌────────────────────┐
│  ┌──────────────┐  │
│  │   [LOGO]     │  │
│  │   Renoz      │  │
│  └──────────────┘  │
│                    │
│  ┌──────────────┐  │
│  │ 📊 Dashboard │  │ ← Active state (highlighted)
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ 👥 Customers │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ 🔄 Pipeline  │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ 📦 Orders    │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ 🏢 Inventory │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ 🛡️  Issues   │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ ⚙️  Settings │  │
│  └──────────────┘  │
│                    │
│       ︙︙︙          │ ← Spacer
│                    │
│  ┌──────────────┐  │
│  │ ◀  Collapse  │  │ ← Collapse toggle
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ 👤 John Doe  │  │
│  │ Sales Rep    │  │
│  │ 🚪 Logout    │  │
│  └──────────────┘  │
└────────────────────┘
```

#### Collapsed State (Desktop)
```
┌────┐
│ [R]│ ← Logo icon only
│    │
│ 📊 │
│ 👥 │
│ 🔄 │
│ 📦 │
│ 🏢 │
│ 🛡️  │
│ ⚙️  │
│    │
│ ︙  │
│    │
│ ▶  │ ← Expand toggle
│ 👤 │
└────┘
```

#### Features:
- **Width:** 240px expanded, 64px collapsed
- **Logo:** Renoz Energy branding, clickable to Dashboard
- **Navigation Items:** Icon + label, role-based filtering
- **Active State:** Highlighted background with teal accent, left border accent
- **Collapse Toggle:** Icon rotates, label hidden when collapsed
- **User Section:** Avatar, name, role badge, logout button
- **Tooltips:** Show labels on hover when collapsed

#### Navigation Items (Updated)

**Primary Navigation:**
- 📊 Dashboard - Overview, metrics, KPIs
- 👥 Customers - Customer list and details
- 🔄 Pipeline - Sales pipeline, lead tracking
- 📦 Orders - Order management

**Secondary Navigation:**
- 🏢 Inventory - Stock levels, locations
- 🛠️ Warranties - Warranty management
- 🛡️ Issues - Issue tracking

**Admin/Settings:**
- ⚙️ Settings - System configuration

#### Role-Based Navigation:

| Nav Item   | Admin | Sales | Warehouse | Viewer |
|------------|-------|-------|-----------|--------|
| Dashboard  | ✓     | ✓     | ✓         | ✓      |
| Customers  | ✓     | ✓     | ✗         | ✓      |
| Pipeline   | ✓     | ✓     | ✗         | ✓      |
| Orders     | ✓     | ✓     | ✓         | ✓      |
| Inventory  | ✓     | ✗     | ✓         | ✓      |
| Warranties | ✓     | ✓     | ✓         | ✓      |
| Issues     | ✓     | ✓     | ✓         | ✓      |
| Settings   | ✓     | ✗     | ✗         | ✗      |

---

### 2. Header Bar (TopBar)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │ Home > Customers >   │  │  🔍 Search │  │  🔔(3)  👤▼    │ │
│  │ Customer Details     │  │     ⌘K     │  │                 │ │
│  └──────────────────────┘  └────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Components:

**A. Breadcrumbs**
```
Home > Customers > Customer Details
 ↑       ↑              ↑
Link    Link         Current (not clickable)
```
- Clickable links to parent pages
- Current page in semibold, stone-700
- Truncate on mobile: "… > Current Page"
- Separator: `/` in stone-400

**B. Search Trigger**
```
┌──────────────────┐
│  🔍 Search  ⌘K   │ ← Click or Cmd+K to open
└──────────────────┘
```
- Opens global search modal
- Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
- Placeholder text on desktop, icon only on mobile
- Background: white, border: stone-200

**C. Notifications**
```
┌────┐
│ 🔔 │ ← Badge shows unread count
│ (3)│
└────┘
```
- Dropdown on click showing recent notifications
- Badge: error-500 (red), white text
- Badge with count (max 9+)
- Mark as read functionality

**D. User Menu**
```
┌──────────────┐
│ 👤 John Doe ▼│ ← Dropdown trigger
└──────────────┘
     ↓
┌──────────────────┐
│ 👤 Profile       │
│ ⚙️  Settings     │
│ 🌙 Dark Mode     │ ← Toggle switch
│ ─────────────    │
│ 🚪 Logout        │
└──────────────────┘
```

---

### 3. Main Content Area

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │         Page-specific content rendered here          │  │
│  │                                                      │  │
│  │         - Forms                                      │  │
│  │         - Tables                                     │  │
│  │         - Cards                                      │  │
│  │         - Charts                                     │  │
│  │                                                      │  │
│  │         Maintains consistent padding and spacing    │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### Specifications:
- **Padding:**
  - Desktop: --spacing-6 (24px)
  - Tablet: --spacing-4 (16px)
  - Mobile: --spacing-3 (12px)
- **Max Width:** None (fluid), but content can use container classes
- **Background:** --background (stone-50) or white based on page needs
- **Scroll:** Vertical scroll within content area only

---

## Responsive Behavior

### Breakpoints

| Breakpoint | Width    | Sidebar State         | Header Adjustments          |
|------------|----------|-----------------------|-----------------------------|
| Desktop    | ≥1024px  | Visible (default)     | Full breadcrumbs, all icons |
| Tablet     | 768-1023 | Collapsible/overlay   | Truncated breadcrumbs       |
| Mobile     | <768px   | Hidden (hamburger)    | Icon-only, minimal text     |

### Sidebar Transitions

**Desktop → Tablet:**
- Sidebar collapses to icon-only by default
- Can be toggled to overlay full width
- Overlay has backdrop blur (glassmorphism)

**Tablet → Mobile:**
- Sidebar hidden completely
- Hamburger menu in header
- Sidebar slides in from left as overlay
- Full-screen on mobile (<375px)

### Mobile Drawer
```
┌─────────────────────────────────────┐
│ [Overlay with backdrop blur]        │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  Sidebar (full height)       │   │
│  │                              │   │
│  │  [All nav items]             │   │
│  │                              │   │
│  │  [User section at bottom]    │   │
│  └──────────────────────────────┘   │
│                                     │
│  ← Tap outside to close             │
└─────────────────────────────────────┘
```

---

## Interaction States

### Navigation Items

**Default:**
```
┌──────────────┐
│ 👥 Customers │  ← stone-600 text, no background
└──────────────┘
```

**Hover:**
```
┌──────────────┐
│ 👥 Customers │  ← stone-100 background, stone-900 text
└──────────────┘
```

**Active:**
```
┌──────────────┐
│ 👥 Customers │  ← primary-100 (teal) background, primary-700 text
│ ▌            │  ← Left accent border (primary-600)
└──────────────┘
```

**Focus (Keyboard):**
```
┌──────────────┐
│ 👥 Customers │  ← Focus ring: --shadow-ring (primary-500)
└──────────────┘
```

### Sidebar Collapse/Expand

**Transition:** --duration-moderate (200ms) --ease-out
**Animation:** Smooth width change, icons stay centered
**Preference:** Save state to localStorage

---

## Accessibility

### ARIA Labels
- `<nav aria-label="Main navigation">`
- `<button aria-label="Toggle sidebar" aria-expanded="true/false">`
- `<button aria-label="Notifications" aria-describedby="notification-count">`
- `<nav aria-label="Breadcrumb">`

### Keyboard Navigation
- **Tab:** Navigate through sidebar items, header actions
- **Enter/Space:** Activate links and buttons
- **Escape:** Close mobile drawer, dropdowns
- **Cmd+K:** Open search modal

### Screen Reader Support
- Announce active navigation item
- Announce notification count
- Announce sidebar state changes
- Skip to content link for keyboard users

### Focus Management
- Focus trap in mobile drawer when open
- Return focus to hamburger when drawer closes
- Focus visible on all interactive elements (--shadow-ring)

---

## Design System Tokens (Renoz v3)

### Colors

| Element                  | CSS Variable              | Light Value    | Dark Value     |
|--------------------------|---------------------------|----------------|----------------|
| Sidebar Background       | --card                    | #FFFFFF        | stone-900      |
| Sidebar Border           | --card-border             | stone-200      | stone-800      |
| Sidebar Text             | --color-stone-600         | #57534e        | stone-400      |
| Active Nav Item BG       | --color-primary-100       | #ccfbf1        | primary-900    |
| Active Nav Item Text     | --color-primary-700       | #0f766e        | primary-100    |
| Active Nav Border        | --color-primary-600       | #0d9488        | primary-500    |
| Header Background        | --card                    | #FFFFFF        | stone-900      |
| Header Border            | --border                  | stone-200      | stone-800      |
| Main Content BG          | --background              | stone-50       | stone-950      |
| Border                   | --border                  | stone-200      | stone-800      |
| Border Subtle            | --border-subtle           | stone-100      | stone-900      |
| Notification Badge       | --color-error-500         | #ef4444        | error-600      |

### Typography

| Element                  | Font Family               | Size           | Weight         |
|--------------------------|---------------------------|----------------|----------------|
| Logo                     | --font-display (Fraunces) | --text-xl      | 700            |
| Nav Items                | --font-body (Plus Jakarta)| --text-sm      | 500            |
| Breadcrumbs              | --font-body               | --text-sm      | 400            |
| Current Breadcrumb       | --font-body               | --text-sm      | 500            |
| User Name                | --font-body               | --text-sm      | 500            |
| User Role                | --font-body               | --text-xs      | 500 (uppercase)|

### Spacing

| Element                  | Spacing Token             | Value (px)     |
|--------------------------|---------------------------|----------------|
| Sidebar Width Expanded   | 240px                     | 240            |
| Sidebar Width Collapsed  | 64px                      | 64             |
| Sidebar Padding          | --spacing-4               | 16             |
| Nav Item Height          | --spacing-11              | 44             |
| Nav Item Padding         | --spacing-3 --spacing-4   | 12px 16px      |
| Nav Item Gap             | --spacing-1               | 4              |
| Icon Size                | 20px                      | 20             |
| Header Height            | 64px                      | 64             |
| Content Padding Desktop  | --spacing-6               | 24             |
| Content Padding Tablet   | --spacing-4               | 16             |
| Content Padding Mobile   | --spacing-3               | 12             |

### Shadows

| Element                  | Shadow Token              | Value                      |
|--------------------------|---------------------------|----------------------------|
| Sidebar (desktop)        | --shadow-sm               | Subtle elevation           |
| Header                   | --shadow-xs               | Minimal border shadow      |
| Mobile Drawer Backdrop   | --shadow-2xl              | Deep overlay shadow        |
| Active Nav Item          | none                      | -                          |
| Dropdown Menus           | --shadow-lg               | Elevated shadow            |

### Border Radius

| Element                  | Radius Token              | Value          |
|--------------------------|---------------------------|----------------|
| Nav Items                | --radius-lg               | 12px           |
| Sidebar                  | none                      | 0              |
| Badge                    | --radius-full             | 9999px         |
| Search Input             | --radius-md               | 8px            |
| User Avatar              | --radius-full             | 9999px         |

### Animations

| Element                  | Duration                  | Easing         |
|--------------------------|---------------------------|----------------|
| Sidebar Collapse         | --duration-moderate       | --ease-out     |
| Nav Item Hover           | --duration-fast           | --ease-out     |
| Mobile Drawer Slide      | --duration-slow           | --ease-out     |
| Backdrop Fade            | --duration-moderate       | --ease-out     |

---

## Technical Notes

### State Management
- Sidebar collapsed state: localStorage `sidebar-collapsed`
- Active route: TanStack Router location
- User session: Context API / Zustand

### Performance Considerations
- Lazy load user avatar images
- Virtualize long navigation lists (if extended)
- Debounce search input
- Optimize sidebar transition animations (--duration-moderate)

### Component Dependencies
- **Sidebar:** shadcn/ui Sheet (mobile), custom component (desktop)
- **Header:** Custom component with shadcn/ui Dropdown
- **Search:** Cmdk (Command palette library)
- **Notifications:** shadcn/ui Popover + Badge
- **Icons:** Lucide React

---

## Future Enhancements

1. **Quick Actions:** Global action button in header (e.g., "+ New Order")
2. **Favorites:** Pin frequently used nav items to top
3. **Search History:** Recently searched items in search modal
4. **Customizable Layout:** Allow users to reorder nav items
5. **Multi-tenancy:** Company switcher in sidebar (if applicable)
6. **Keyboard Shortcuts:** Hotkeys for navigation items (1-9)

---

## References

- **Design System:** /renoz-v3/src/styles.css
- **Typography:** Fraunces (display), Plus Jakarta Sans (body), JetBrains Mono (mono)
- **Color Palette:** Stone neutrals, Teal primary, Amber accent
- **Icons:** Lucide React (consistent icon set)
- **Routing:** TanStack Router (type-safe navigation)
- **Analytics:** Track navigation patterns for UX optimization

---

**Related Wireframes:**
- `/foundation/sidebar-navigation.wireframe.md`
- `/foundation/header.wireframe.md`
- `/foundation/breadcrumb-patterns.wireframe.md`
- `/modules/dashboard/dashboard-layout.wireframe.md` (TBD)

---

**Change Log:**
- 2026-01-10: Initial wireframe created
- 2026-01-10: Updated with Renoz v3 design system tokens (stone neutrals, teal primary, spacing tokens)
