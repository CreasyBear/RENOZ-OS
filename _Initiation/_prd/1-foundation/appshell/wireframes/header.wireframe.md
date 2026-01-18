# Header Wireframe

**Component:** Global Application Header
**Context:** B2B Battery CRM for Australian Market
**Viewport:** Desktop (1440px), Tablet (768px), Mobile (375px)

---

## Desktop Layout (1440px)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz Energy    Home > Customers > Brisbane Solar Co                │
│                                                                              │
│                        [🔍 Search... ⌘K]  [+ New ▼] [🔔³] [JD Admin ▼]     │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Logo & Brand
```
┌──────────────────┐
│ [⚡] Renoz Energy │
└──────────────────┘
```
- **Logo:** Renoz Energy icon (lightning bolt)
- **Company Name:** "Renoz Energy" (always visible)
- **Action:** Clicking logo/name returns to Dashboard
- **Styling:** Primary brand color, semibold text

---

#### 2. Breadcrumbs
```
┌───────────────────────────────────────────┐
│ Home > Customers > Brisbane Solar Co      │
└───────────────────────────────────────────┘
```
- **Structure:** Hierarchical navigation path
- **Segments:**
  - `Home` - clickable, returns to dashboard
  - `Customers` - clickable, shows customer list
  - `Brisbane Solar Co` - current page (not linked, darker text)
- **Separator:** Chevron `>`
- **Max Depth:** 4 levels (auto-truncate with `...` if deeper)
- **Hover State:** Underline on clickable segments

---

#### 3. Search Trigger
```
┌──────────────────┐
│ 🔍 Search... ⌘K  │
└──────────────────┘
```
- **Icon:** Magnifying glass
- **Placeholder:** "Search... ⌘K"
- **Action:** Opens command palette (⌘K / Ctrl+K)
- **Behavior:**
  - Click to activate
  - Keyboard shortcut always works
  - Command palette overlays entire app
- **Width:** 240px
- **Styling:** Light background, subtle border

---

#### 4. Quick Actions - New Button
```
┌────────────┐
│ + New   ▼  │
└────────────┘
      ↓
┌──────────────┐
│ Customer     │
│ Quote        │
│ Order        │
│ ──────────   │
│ Import CSV   │
└──────────────┘
```
- **Label:** "+ New"
- **Dropdown:**
  - Customer (creates new customer record)
  - Quote (creates new quote)
  - Order (creates new order)
  - Divider
  - Import CSV (bulk import)
- **Styling:** Primary button, dropdown on click
- **Keyboard:** Arrow keys to navigate, Enter to select

---

#### 5. Notifications
```
┌──────┐
│ 🔔³  │
└──────┘
   ↓
┌─────────────────────────────────────┐
│ Notifications                   ⚙️  │
│ ─────────────────────────────────── │
│ New quote request - Brisbane Solar  │
│ 2 minutes ago                       │
│ ─────────────────────────────────── │
│ Payment received - $5,420           │
│ 1 hour ago                          │
│ ─────────────────────────────────── │
│ Order #1234 shipped                 │
│ Yesterday                           │
│ ─────────────────────────────────── │
│ View All Notifications              │
└─────────────────────────────────────┘
```
- **Icon:** Bell with badge count
- **Badge:** Red circle with count (max "9+")
- **Dropdown:**
  - Recent 3 notifications
  - Timestamp (relative)
  - Settings icon (top right)
  - "View All" link at bottom
- **Empty State:** "No new notifications"
- **Max Width:** 360px

---

#### 6. User Menu
```
┌───────────────┐
│ [JD] Admin ▼  │
└───────────────┘
       ↓
┌─────────────────────────┐
│ Joel Davis              │
│ joel@renoz.com.au       │
│ ─────────────────────── │
│ 👤 Profile              │
│ ⚙️  Settings            │
│ ❓ Help & Support       │
│ ─────────────────────── │
│ 🚪 Logout               │
└─────────────────────────┘
```
- **Avatar:** Initials in circle (JD)
- **Role Badge:** "Admin" / "Sales" / "Manager"
- **Dropdown:**
  - User name and email
  - Profile (user settings)
  - Settings (app preferences)
  - Help & Support (docs/chat)
  - Divider
  - Logout (red text)
- **Width:** 220px

---

## Tablet Layout (768px)

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Renoz    Home > ... > Brisbane Solar                  │
│                                                               │
│                 [🔍 Search]  [+ New] [🔔³] [JD ▼]            │
└──────────────────────────────────────────────────────────────┘
```

**Changes from Desktop:**
- Company name shortened to "Renoz"
- Breadcrumbs truncate middle segments with `...`
- Search placeholder: "Search" (no keyboard hint)
- User menu: Avatar + initials only

---

## Mobile Layout (375px)

```
┌─────────────────────────────────────────────┐
│ [☰] [⚡]  Brisbane Solar    [🔔³] [JD]      │
└─────────────────────────────────────────────┘
```

**Changes from Tablet:**
- **Hamburger Menu:** Toggles sidebar (left)
- **Logo Only:** Just icon (no text)
- **Breadcrumb:** Current page only
- **Search:** Hidden (available in hamburger menu)
- **New Button:** Hidden (available in hamburger menu)
- **Notifications:** Icon only (no dropdown, goes to full page)
- **User:** Avatar only

---

## Responsive Behavior

| Viewport    | Logo      | Breadcrumbs           | Search       | Actions        | User Menu      |
|-------------|-----------|-----------------------|--------------|----------------|----------------|
| Desktop     | Icon+Name | Full path (max 4)     | Full w/ ⌘K   | + New, Bell    | Avatar+Role    |
| Tablet      | Icon+Name | Truncated middle      | Icon+Text    | + New, Bell    | Avatar only    |
| Mobile      | Icon only | Current page only     | Hidden       | Hidden         | Avatar only    |

---

## Component States

### Search Field
- **Default:** Light gray background, border
- **Hover:** Darker border
- **Focus:** Primary color border, shadow
- **Active:** Command palette opens

### Notifications Badge
- **None:** No badge, gray bell
- **1-9:** Red circle with white number
- **10+:** Red circle with "9+"
- **Unread:** Bold text in dropdown

### User Avatar
- **Initials:** Auto-generated from name
- **Image:** If user uploads photo
- **Fallback:** Colored background based on name hash

---

## Accessibility

### Keyboard Navigation
- **Tab Order:** Logo → Breadcrumbs → Search → New → Notifications → User
- **⌘K / Ctrl+K:** Open search from anywhere
- **Esc:** Close dropdowns
- **Arrow Keys:** Navigate dropdown items
- **Enter:** Activate selected item

### Screen Readers
- Logo: "Renoz Energy, go to dashboard"
- Breadcrumbs: "Navigation breadcrumb: Home, Customers, Brisbane Solar Co"
- Search: "Search customers, quotes, and orders. Press Command K to open"
- New button: "Create new record. Opens menu with options"
- Notifications: "3 unread notifications. Open notifications menu"
- User menu: "User menu for Joel Davis, Admin. Open user options"

### ARIA Labels
```html
<nav aria-label="Breadcrumb">
<button aria-label="Search" aria-keyshortcuts="Control+K">
<button aria-label="Create new" aria-haspopup="true" aria-expanded="false">
<button aria-label="Notifications, 3 unread" aria-haspopup="true">
<button aria-label="User menu" aria-haspopup="true" aria-expanded="false">
```

---

## Interaction Patterns

### Breadcrumb Navigation
1. User clicks "Customers" segment
2. App navigates to `/customers` list view
3. Breadcrumb updates to: `Home > Customers`

### Search Activation
1. User clicks search field OR presses ⌘K
2. Command palette opens (modal overlay)
3. Focus moves to search input
4. Recent searches shown below input
5. Results update as user types
6. ESC or click outside closes palette

### Quick Create
1. User clicks "+ New" button
2. Dropdown appears below button
3. User clicks "Quote"
4. Modal opens: "Create New Quote"
5. Form appears with customer selector

### Notification Interaction
1. User clicks bell icon
2. Dropdown appears (right-aligned)
3. Badge count disappears (marks as "seen")
4. Click notification → navigates to detail page
5. Click "View All" → goes to `/notifications` page
6. Click settings icon → notification preferences

---

## Technical Notes

### Component Structure
```tsx
<Header>
  <HeaderLeft>
    <Logo />
    <Breadcrumbs items={breadcrumbPath} />
  </HeaderLeft>

  <HeaderRight>
    <SearchTrigger onOpen={openCommandPalette} />
    <QuickActions />
    <NotificationMenu count={unreadCount} />
    <UserMenu user={currentUser} />
  </HeaderRight>
</Header>
```

### Responsive Breakpoints
- Desktop: `min-width: 1024px`
- Tablet: `min-width: 768px and max-width: 1023px`
- Mobile: `max-width: 767px`

### Z-Index Layering
- Header: `z-index: 100`
- Dropdowns: `z-index: 110`
- Command Palette: `z-index: 200`
- Mobile Menu: `z-index: 150`

---

## Design Tokens

### Spacing
- Header height: 64px
- Logo width: 180px (desktop), 120px (tablet), 40px (mobile)
- Search width: 240px (desktop), 180px (tablet)
- Avatar size: 36px
- Badge size: 18px (min-width)

### Colors
- Background: White / `--background-primary`
- Border: `--border-subtle`
- Text: `--text-primary`
- Hover: `--background-hover`
- Badge: `--error-500` (red)
- Active: `--primary-500`

### Typography
- Company name: 18px, semibold
- Breadcrumbs: 14px, regular
- Buttons: 14px, medium
- Dropdown: 14px, regular
- Badge: 12px, bold

---

## Edge Cases

### Very Long Breadcrumbs
```
Home > Customers > Brisbane Solar Co > Quote #1234 > Line Items > Edit
```
**Behavior:** Truncate to 4 segments maximum
```
Home > ... > Line Items > Edit
```

### No Notifications
```
┌─────────────────────────┐
│ No new notifications    │
│                         │
│ You're all caught up!   │
└─────────────────────────┘
```

### Offline State
- Search: Disabled with tooltip "Search unavailable offline"
- Notifications: Shows cached (with warning icon)
- New button: Disabled

### Long User Names
```
┌─────────────────────────────┐
│ Dr. Alexandra Thompson III  │
│ alexandra.thompson@...      │
└─────────────────────────────┘
```
**Behavior:** Truncate email if too long

---

## Related Wireframes
- [Sidebar Navigation](./sidebar.wireframe.md)
- [Command Palette](./command-palette.wireframe.md)
- [Notification Center](./notifications.wireframe.md)

---

**Version:** 1.0
**Last Updated:** 2026-01-10
**Status:** Draft
