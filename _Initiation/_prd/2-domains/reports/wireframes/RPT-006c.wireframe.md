# DOM-RPT-006c: Report Favorites UI

> **PRD**: reports.prd.json
> **Story**: DOM-RPT-006c - Favorites UI
> **Priority**: 7
> **Dependencies**: DOM-RPT-006a (schema), DOM-RPT-006b (server functions)

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | report_favorites | NOT CREATED |
| **Server Functions Required** | addFavorite, removeFavorite, getFavorites, updateFavorite | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-RPT-006a, DOM-RPT-006b | PENDING |

### Existing Schema Available
- `orders` in `renoz-v2/lib/schema/orders.ts` - provides data for favorited reports
- `opportunities` in `renoz-v2/lib/schema/opportunities.ts` - provides pipeline data for favorited reports
- `products`, `inventoryItems` in `renoz-v2/lib/schema/products.ts` - provides inventory data for favorited reports
- `customers` in `renoz-v2/lib/schema/customers.ts` - provides customer data for favorited reports

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Key Metrics**: kWh deployed, Quote win rate, Installation completion rate, Warranty claim rate
- **Product Categories**: Battery Systems, Inverters, Solar, Services
- **Currency**: AUD with GST (10%)
- **Fiscal Year**: July-June (Australian)
- **Report Users**: Admin, Sales, Installation managers

---

## Overview

Star button on reports and favorites section in reports hub. Users can save reports with specific filter configurations for quick access. Favorites preserve the exact view (filters, date range) the user had when they starred the report.

**Design Aesthetic**: Quick Access - minimal friction to save and access favorite views
**Primary Device**: Desktop/Tablet (report access)
**Secondary**: Mobile (quick reference)

---

## UI Patterns (Reference Implementation)

### Button
- **Pattern**: RE-UI Button
- **Reference**: `_reference/.reui-reference/registry/default/ui/button.tsx`
- **Features**:
  - Star toggle button with filled/outline states
  - Primary action buttons (Add to Favorites, Save)
  - Icon-only action buttons (Edit, Remove)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Add to Favorites modal with optional name input
  - Edit Favorite dialog with name editing
  - Remove confirmation dialog

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Favorite cards in grid layout showing report preview
  - Compact favorite cards in hub section
  - Detailed favorite view with metadata

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Custom name input for favorites
  - Search favorites input with icon
  - Filter input with live search

### DropdownMenu
- **Pattern**: RE-UI DropdownMenu
- **Reference**: `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx`
- **Features**:
  - Favorite actions menu (Open, Edit, Remove)
  - Sort options dropdown (Recent, Name, Type)
  - Mobile context menu with tap-and-hold

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Filter tags showing saved filters
  - Metadata badges (date added, last viewed)
  - Count badges for total favorites

---

## Desktop Wireframe (1280px+)

### Favorite Star Button on Report Header

```
+================================================================================+
| Renoz CRM                                                    [bell] [Joel v]   |
+-------------+------------------------------------------------------------------+
|             |                                                                  |
| Reports <   |  Reports > Sales Report                                          |
|             |  ================================================================|
|             |                                                                  |
|             |  +-- HEADER ACTIONS ------------------------------------------------+
|             |  |                                                                |
|             |  |  [star]     [calendar]     [Export v]    [Print]              |
|             |  |  ^^^^^                                                        |
|             |  |  Unfavorited (outline)                                        |
|             |  |                                                                |
|             |  +----------------------------------------------------------------+
|             |                                                                  |
|             |  +-- CURRENT FILTERS -------------------------------------------+
|             |  |                                                              |
|             |  |  Period: This Month   |   Category: All   |   Region: West   |
|             |  |                                                              |
|             |  +--------------------------------------------------------------+
|             |                                                                  |
+-------------+------------------------------------------------------------------+
```

### Favorited State

```
+-- HEADER ACTIONS ------------------------------------------------+
|                                                                  |
|  [star-filled]  [calendar]     [Export v]    [Print]            |
|  ^^^^^^^^^^^^^                                                  |
|  Favorited (filled, gold color)                                 |
|                                                                  |
|  Tooltip: "Sales Report (MTD, West Region) saved to favorites"  |
|                                                                  |
+------------------------------------------------------------------+
```

### Add to Favorites Dialog (Optional Name)

```
+== ADD TO FAVORITES ==========================================+
|                                                        [X]   |
+==============================================================+
|                                                              |
|  Save this report view to your favorites.                    |
|                                                              |
|  +-- REPORT DETAILS ----------------------------------------+|
|  |                                                          ||
|  |  Report: Sales Report                                    ||
|  |  Current Filters:                                        ||
|  |  - Period: This Month                                    ||
|  |  - Category: All                                         ||
|  |  - Region: West                                          ||
|  |                                                          ||
|  +----------------------------------------------------------+|
|                                                              |
|  Name (optional):                                            |
|  +----------------------------------------------------------+|
|  | Sales Report - West Region MTD                           ||
|  +----------------------------------------------------------+|
|  Leave blank to use default: "Sales Report (This Month)"     |
|                                                              |
+==============================================================+
|                                                              |
|               ( Cancel )        [ Add to Favorites ]         |
|                                                              |
+==============================================================+
```

---

## Reports Hub - Favorites Section

### Reports Hub with Favorites

```
+================================================================================+
| Renoz CRM                                                    [bell] [Joel v]   |
+-------------+------------------------------------------------------------------+
|             |                                                                  |
| Dashboard   |  Reports Hub                                                     |
| Customers   |  ================================================================|
| Orders      |                                                                  |
| Products    |  +-- MY FAVORITES (5) -----------------------------------------+
| Jobs        |  |                                                             |
| Reports <   |  |  +------------+ +------------+ +------------+ +------------+|
|             |  |  |            | |            | |            | |            ||
|             |  |  | [chart]    | | [chart]    | | [chart]    | | [chart]    ||
|             |  |  |            | |            | |            | |            ||
|             |  |  | Battery Sales MTD  | | Install Pipeline   | | Financial  | | Warranty  ||
|             |  |  | West       | | Weekly     | | Q4 2025    | | Low Stock  ||
|             |  |  |            | |            | |            | |            ||
|             |  |  | [star] [...| | [star] [...| | [star] [...| | [star] [...||
|             |  |  +------------+ +------------+ +------------+ +------------+|
|             |  |                                                             |
|             |  |  + 1 more                                   [See All]      |
|             |  |                                                             |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
|             |  +-- SCHEDULED REPORTS ----------------------------------------+
|             |  |  ...                                                        |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
|             |  +-- SALES & REVENUE ------------------------------------------+
|             |  |  [Sales Report]  [Install Pipeline Report]  [Financial Summary]     |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
+-------------+------------------------------------------------------------------+
```

### Favorite Card Hover State

```
+------------+
|            |
| [chart]    |
|            |
| Battery Sales MTD  |
| West       |
|            |
| [star] [...]|  <- Actions dropdown
+------------+

Hover shows:
- Subtle elevation/shadow
- Border highlight
- Full card is clickable

Actions dropdown:
+-------------------+
| Open Report       |
| Edit Name         |
| -----------------
| Remove Favorite   |
+-------------------+
```

### See All Favorites (Expanded View)

```
+================================================================================+
| Renoz CRM                                                    [bell] [Joel v]   |
+-------------+------------------------------------------------------------------+
|             |                                                                  |
| Reports <   |  Reports > My Favorites                                          |
|             |  ================================================================|
|             |                                                                  |
|             |  Quick access to your saved report views.                        |
|             |                                                                  |
|             |  +-- SEARCH & FILTER ------------------------------------------+
|             |  |                                                             |
|             |  |  [Search favorites...]                   Sort: [Recent v]  |
|             |  |                                                             |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
|             |  +-- FAVORITES GRID -------------------------------------------+
|             |  |                                                             |
|             |  |  +------------+ +------------+ +------------+ +------------+|
|             |  |  | [chart]    | | [chart]    | | [chart]    | | [chart]    ||
|             |  |  | Battery Sales MTD  | | Install Pipeline   | | Financial  | | Warranty  ||
|             |  |  | West       | | Weekly     | | Q4 2025    | | Low Stock  ||
|             |  |  | [star] [...| | [star] [...| | [star] [...| | [star] [...||
|             |  |  +------------+ +------------+ +------------+ +------------+|
|             |  |                                                             |
|             |  |  +------------+ +------------+                              |
|             |  |  | [chart]    | | [Add New]  |                              |
|             |  |  | Customer   | |            |                              |
|             |  |  | Top 20     | | + Add a    |                              |
|             |  |  | [star] [...| |   report   |                              |
|             |  |  +------------+ +------------+                              |
|             |  |                                                             |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
+-------------+------------------------------------------------------------------+
```

### Favorite Card (Detailed View)

```
+-- FAVORITE CARD (Expanded) ----------------------------------+
|                                                              |
| +----------------------------------------------------------+ |
| |                                                          | |
| |  [chart icon]                                            | |
| |                                                          | |
| |  SALES REPORT - WEST REGION MTD                          | |
| |                                                          | |
| |  Filters:                                                | |
| |  - Period: This Month                                    | |
| |  - Region: West                                          | |
| |                                                          | |
| |  Added: Jan 8, 2026                                      | |
| |  Last viewed: 2 hours ago                                | |
| |                                                          | |
| +----------------------------------------------------------+ |
|                                                              |
|  [star-filled]                               [Edit] [Remove] |
|                                                              |
+--------------------------------------------------------------+
```

---

## Edit Favorite Dialog

```
+== EDIT FAVORITE =============================================+
|                                                        [X]   |
+==============================================================+
|                                                              |
|  Edit your favorite report view.                             |
|                                                              |
|  Name:                                                       |
|  +----------------------------------------------------------+|
|  | Sales Report - West Region MTD                           ||
|  +----------------------------------------------------------+|
|                                                              |
|  +-- SAVED FILTERS (read-only) -----------------------------+|
|  |                                                          ||
|  |  Report: Sales Report                                    ||
|  |  Period: This Month                                      ||
|  |  Region: West                                            ||
|  |                                                          ||
|  |  [!] To change filters, open the report and              ||
|  |      re-save with updated filters.                       ||
|  |                                                          ||
|  +----------------------------------------------------------+|
|                                                              |
+==============================================================+
|                                                              |
|               ( Cancel )             [ Save Changes ]        |
|                                                              |
+==============================================================+
```

---

## Remove Favorite Confirmation

```
+== REMOVE FAVORITE ===========================================+
|                                                        [X]   |
+==============================================================+
|                                                              |
|  Remove this favorite?                                       |
|                                                              |
|  "Sales Report - West Region MTD" will be removed            |
|  from your favorites. You can re-add it anytime.             |
|                                                              |
+==============================================================+
|                                                              |
|               ( Cancel )             [ Remove Favorite ]     |
|                                                              |
+==============================================================+
```

---

## Tablet Wireframe (768px)

### Reports Hub - Favorites Section (Tablet)

```
+================================================================+
| Reports Hub                                                      |
| ================================================================|
+----------------------------------------------------------------+
|                                                                  |
|  MY FAVORITES (5)                               [See All >]      |
|                                                                  |
|  +----------+ +----------+ +----------+                          |
|  |          | |          | |          |                          |
|  | [chart]  | | [chart]  | | [chart]  |                          |
|  |          | |          | |          |                          |
|  | Sales    | | Install Pipeline | | Fin.     |                          |
|  | MTD West | | Weekly   | | Q4 2025  |                          |
|  +----------+ +----------+ +----------+                          |
|                                                                  |
|  [swipe for more ->]                                             |
|                                                                  |
+----------------------------------------------------------------+
```

### Favorite Card Actions (Tablet)

```
+-- TAP & HOLD CONTEXT MENU --------------------------------+
|                                                           |
|  [open] Open Report                                       |
|  [edit] Edit Name                                         |
|  ------------------------------------------------------- |
|  [trash] Remove from Favorites                            |
|                                                           |
+-----------------------------------------------------------+
```

### Add to Favorites Dialog (Tablet)

```
+================================================================+
| Add to Favorites                                          [X]   |
+----------------------------------------------------------------+
|                                                                  |
|  Report: Sales Report                                            |
|                                                                  |
|  Filters: This Month, West Region                                |
|                                                                  |
|  Name (optional):                                                |
|  +------------------------------------------------------------+ |
|  | Sales Report - West Region MTD                              | |
|  +------------------------------------------------------------+ |
|                                                                  |
+----------------------------------------------------------------+
|                                                                  |
|  ( Cancel )                           [ Add to Favorites ]       |
|                                                                  |
+================================================================+
```

---

## Mobile Wireframe (375px)

### Report Header with Favorite Star

```
+========================================+
| < Sales Report                         |
+----------------------------------------+
|                                        |
|  [star]  [clock]  [share]  [...]       |
|  ^^^^^                                 |
|  Favorite button                       |
|                                        |
+----------------------------------------+
|                                        |
|  Period: [This Month v]                |
|  Region: [West v]                      |
|                                        |
+----------------------------------------+
```

### Tap to Favorite (Instant Add)

```
+========================================+
| < Sales Report                         |
+----------------------------------------+
|                                        |
|  [star-filled]  [clock] [share] [...]  |
|  ^^^^^^^^^^^^^^                        |
|  Filled star = favorited               |
|                                        |
+----------------------------------------+
|                                        |
|  +----------------------------------+  |
|  | [check] Added to favorites       |  |
|  | Tap star again to remove         |  |
|  +----------------------------------+  |
|  ^ Toast notification (auto-dismiss)   |
|                                        |
+----------------------------------------+
```

### Reports Hub - Favorites (Mobile)

```
+========================================+
| Reports                                |
+----------------------------------------+
|                                        |
|  MY FAVORITES                          |
|                                        |
|  +----------------------------------+  |
|  | [chart] Battery Sales MTD West      [>] |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [chart] Install Pipeline Weekly     [>] |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [chart] Financial Q4 2025   [>] |  |
|  +----------------------------------+  |
|                                        |
|  [See All Favorites (5)]               |
|                                        |
+----------------------------------------+
|                                        |
|  ALL REPORTS                           |
|                                        |
|  +----------------------------------+  |
|  | [>] Sales Report                 |  |
|  +----------------------------------+  |
|  | [>] Install Pipeline Report              |  |
|  +----------------------------------+  |
|  ...                                   |
|                                        |
+========================================+
```

### Favorites List View (Mobile)

```
+========================================+
| < My Favorites                         |
+----------------------------------------+
|                                        |
|  [Search favorites...]                 |
|                                        |
+----------------------------------------+
|                                        |
|  +----------------------------------+  |
|  | [chart]                          |  |
|  |                                  |  |
|  | Battery Sales MTD - West Region          |  |
|  | Period: This Month | Region: West|  |
|  |                                  |  |
|  | Added Jan 8    [star]   [...]    |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [chart]                          |  |
|  |                                  |  |
|  | Install Pipeline Weekly                  |  |
|  | Period: Last 7 Days              |  |
|  |                                  |  |
|  | Added Jan 5    [star]   [...]    |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [chart]                          |  |
|  |                                  |  |
|  | Financial Q4 2025                |  |
|  | Period: Oct-Dec 2025             |  |
|  |                                  |  |
|  | Added Dec 15   [star]   [...]    |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

### Edit/Remove Bottom Sheet (Mobile)

```
+========================================+
|                                        |
|    --- drag handle ---                 |
|                                        |
+----------------------------------------+
|                                        |
|  Battery Sales MTD - West Region               |
|                                        |
+----------------------------------------+
|                                        |
|  [open]  Open Report                   |
|                                        |
|  [edit]  Edit Name                     |
|                                        |
|  --------------------------------      |
|                                        |
|  [trash] Remove from Favorites         |
|                                        |
+----------------------------------------+
|                                        |
|  [ Cancel ]                            |
|                                        |
+========================================+
```

---

## Loading States

### Favorites Section Loading

```
+-- MY FAVORITES ---------------------------------------------+
|                                                             |
|  +------------+ +------------+ +------------+ +------------+|
|  | [shimmer]  | | [shimmer]  | | [shimmer]  | | [shimmer]  ||
|  | [shimmer]  | | [shimmer]  | | [shimmer]  | | [shimmer]  ||
|  | [shimmer]  | | [shimmer]  | | [shimmer]  | | [shimmer]  ||
|  +------------+ +------------+ +------------+ +------------+|
|                                                             |
+-------------------------------------------------------------+

aria-busy="true"
aria-label="Loading favorites"
```

### Adding to Favorites

```
+-- HEADER ACTIONS ------------------------------------------------+
|                                                                  |
|  [spinner]    [calendar]     [Export v]    [Print]              |
|  ^^^^^^^^^                                                      |
|  Star button shows spinner while saving                         |
|                                                                  |
+------------------------------------------------------------------+
```

### Opening Favorite

```
+-- FAVORITE CARD (Loading) -----------------------------------+
|                                                              |
|  +----------------------------------------------------------+|
|  |                                                          ||
|  |  [spinner]                                               ||
|  |                                                          ||
|  |  Loading report...                                       ||
|  |                                                          ||
|  +----------------------------------------------------------+|
|                                                              |
+--------------------------------------------------------------+
```

---

## Empty States

### No Favorites Yet

```
+-- MY FAVORITES ---------------------------------------------+
|                                                             |
|         [star outline illustration]                         |
|                                                             |
|     No favorites yet                                        |
|                                                             |
|  Star any report to save it here for quick access.          |
|  Your filters and date range will be preserved.             |
|                                                             |
|  [Browse Reports]                                           |
|                                                             |
+-------------------------------------------------------------+
```

### No Search Results

```
+-- FAVORITES LIST -------------------------------------------+
|                                                             |
|  [Search: "inventory"]                                      |
|                                                             |
|         [empty search illustration]                         |
|                                                             |
|     No favorites match "inventory"                          |
|                                                             |
|  Try a different search term or browse                      |
|  all reports to find what you're looking for.               |
|                                                             |
|  [Clear Search]   [Browse All Reports]                      |
|                                                             |
+-------------------------------------------------------------+
```

---

## Error States

### Failed to Load Favorites

```
+-- MY FAVORITES ---------------------------------------------+
|                                                             |
|  [!] Couldn't load favorites                                |
|                                                             |
|  There was a problem loading your favorites.                |
|  Please try again.                                          |
|                                                             |
|  [Retry]                                                    |
|                                                             |
+-------------------------------------------------------------+

role="alert"
```

### Failed to Add Favorite

```
+-- TOAST ERROR ----------------------------------------------+
|                                                             |
|  [!] Couldn't add to favorites                              |
|                                                             |
|  Unable to save this report. Please try again.              |
|                                                             |
|  [Retry]  [x]                                               |
|                                                             |
+-------------------------------------------------------------+
```

### Failed to Remove Favorite

```
+-- TOAST ERROR ----------------------------------------------+
|                                                             |
|  [!] Couldn't remove favorite                               |
|                                                             |
|  Unable to remove from favorites. Please try again.         |
|                                                             |
|  [Retry]  [x]                                               |
|                                                             |
+-------------------------------------------------------------+
```

### Report No Longer Available

```
+-- FAVORITE CARD (Error) ------------------------------------+
|                                                             |
|  +----------------------------------------------------------+|
|  |                                                          ||
|  |  [!] Report unavailable                                  ||
|  |                                                          ||
|  |  This report may have been removed or                    ||
|  |  you no longer have access.                              ||
|  |                                                          ||
|  |  [Remove from Favorites]                                 ||
|  |                                                          ||
|  +----------------------------------------------------------+|
|                                                             |
+-------------------------------------------------------------+
```

---

## Success States

### Added to Favorites

```
+-- TOAST SUCCESS --------------------------------------------+
|                                                             |
|  [star-filled] Added to favorites                           |
|                                                             |
|  "Sales Report - West Region MTD" saved                     |
|                                                             |
|  [View Favorites]  [x]                                      |
|                                                             |
+-------------------------------------------------------------+

role="status"
aria-live="polite"
Auto-dismiss: 4 seconds
```

### Removed from Favorites

```
+-- TOAST SUCCESS --------------------------------------------+
|                                                             |
|  [check] Removed from favorites                             |
|                                                             |
|  "Sales Report - West Region MTD" removed                   |
|                                                             |
|  [Undo]  [x]                                                |
|                                                             |
+-------------------------------------------------------------+

Undo available for 5 seconds
```

### Favorite Updated

```
+-- TOAST SUCCESS --------------------------------------------+
|                                                             |
|  [check] Favorite updated                                   |
|                                                             |
|  Name changed to "Sales - West Q1"                          |
|                                                             |
|  [x]                                                        |
|                                                             |
+-------------------------------------------------------------+
```

---

## Accessibility Specification

### ARIA Landmarks and Roles

```html
<!-- Favorites Section on Hub -->
<section aria-labelledby="favorites-heading">
  <h2 id="favorites-heading">My Favorites</h2>

  <ul role="list" aria-label="Favorite reports">
    <li>
      <a
        href="/reports/sales?filters=..."
        aria-label="Sales Report, West Region, This Month. Added January 8"
      >
        <div role="img" aria-hidden="true"><!-- chart icon --></div>
        <span>Battery Sales MTD - West Region</span>
      </a>
      <button
        aria-label="Actions for Battery Sales MTD - West Region favorite"
        aria-haspopup="menu"
        aria-expanded="false"
      >
        ...
      </button>
    </li>
  </ul>
</section>

<!-- Favorite Star Button -->
<button
  aria-pressed="false"
  aria-label="Add Sales Report to favorites"
>
  <StarIcon aria-hidden="true" />
</button>

<!-- Favorited state -->
<button
  aria-pressed="true"
  aria-label="Sales Report is in favorites. Click to remove"
>
  <StarFilledIcon aria-hidden="true" />
</button>

<!-- Add to Favorites Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="add-fav-title"
>
  <h2 id="add-fav-title">Add to Favorites</h2>
  ...
</dialog>
```

### Keyboard Navigation

```
Favorite Star Button:
- Tab: Focus star button
- Enter/Space: Toggle favorite (add/remove)

Favorites Grid:
- Tab: Navigate between favorite cards
- Enter: Open favorite report
- Arrow keys: Navigate within grid (optional enhancement)

Favorite Card Actions:
- Tab: Focus actions button (...)
- Enter/Space: Open actions menu
- Arrow Down/Up: Navigate menu items
- Enter: Select action
- Escape: Close menu

Add/Edit Dialog:
- Tab: Navigate between fields and buttons
- Enter: Submit form
- Escape: Close dialog
```

### Screen Reader Announcements

```
On add to favorites:
  "Sales Report with filters This Month, West Region
   added to favorites."

On remove from favorites:
  "Sales Report removed from favorites. Press Z to undo
   within 5 seconds."

On favorite undo:
  "Sales Report restored to favorites."

On navigate to favorite:
  "Opening Sales Report with saved filters: This Month,
   West Region."

On favorites load:
  "5 favorite reports loaded. Use Tab to navigate."
```

---

## Animation Choreography

### Star Toggle Animation

```
Add to favorites (unfilled -> filled):

0ms   - Scale star down slightly
        transform: scale(1) -> scale(0.8)
        duration: 100ms

100ms - Star fills with color
        fill: transparent -> gold
        duration: 150ms

100ms - Scale back up with overshoot
        transform: scale(0.8) -> scale(1.1) -> scale(1)
        duration: 200ms
        easing: spring(300, 20)

300ms - Subtle particle burst effect (optional)
        Small golden dots expand outward
        opacity: 1 -> 0
        duration: 300ms


Remove from favorites (filled -> unfilled):

0ms   - Star color fades
        fill: gold -> transparent
        duration: 150ms

0ms   - Subtle scale pulse
        transform: scale(1) -> scale(0.95) -> scale(1)
        duration: 200ms


prefers-reduced-motion:
- Skip scale animations
- Keep color transition only (100ms)
```

### Favorite Card Appearance

```
Cards appearing in grid:

0ms   - First card fades in
        opacity: 0 -> 1
        transform: translateY(8px) -> translateY(0)
        duration: 200ms

50ms  - Second card (staggered)
        Same animation
        delay: 50ms

...continue stagger for remaining cards


Card removal:

0ms   - Card scales down and fades
        transform: scale(1) -> scale(0.95)
        opacity: 1 -> 0
        duration: 200ms

200ms - Remaining cards slide to fill gap
        transform: translateX(cardWidth) -> translateX(0)
        duration: 300ms
        easing: ease-out
```

### Toast Notifications

```
Toast appearance:

0ms   - Slide in from bottom/right
        transform: translateY(100%) -> translateY(0)
        opacity: 0 -> 1
        duration: 250ms
        easing: ease-out

4000ms - Auto-dismiss begins
        opacity: 1 -> 0
        transform: translateY(0) -> translateY(10px)
        duration: 200ms
```

---

## Component Props Interfaces (TypeScript)

```typescript
// Favorite Star Button
interface FavoriteStarButtonProps {
  /** Report type */
  reportType: ReportType;
  /** Current filters applied to report */
  currentFilters: ReportFilters;
  /** Whether report is currently favorited */
  isFavorited: boolean;
  /** Existing favorite ID (if favorited) */
  favoriteId?: string;
  /** Add to favorites handler */
  onAdd: (config: FavoriteConfig) => Promise<void>;
  /** Remove from favorites handler */
  onRemove: (favoriteId: string) => Promise<void>;
  /** Show name dialog (optional - can be instant add) */
  showNameDialog?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// Favorite Configuration
interface FavoriteConfig {
  /** Report type */
  reportType: ReportType;
  /** Custom name (optional) */
  name?: string;
  /** Saved filters */
  filters: ReportFilters;
}

// Report Favorite (from database)
interface ReportFavorite {
  id: string;
  userId: string;
  reportType: ReportType;
  name: string;
  filters: ReportFilters;
  createdAt: string;
  lastViewedAt?: string;
}

// Report Filters (generic)
interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
    preset?: string;
  };
  [key: string]: unknown;
}

type ReportType =
  | 'sales'
  | 'pipeline'
  | 'inventory'
  | 'financial'
  | 'customer'
  | 'warranty';

// Favorites Section Component (for hub)
interface FavoritesSectionProps {
  /** List of user favorites */
  favorites: ReportFavorite[];
  /** Maximum items to show before "See All" */
  maxVisible?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Navigate to favorite handler */
  onNavigate: (favorite: ReportFavorite) => void;
  /** Remove favorite handler */
  onRemove: (favoriteId: string) => Promise<void>;
  /** Edit favorite handler */
  onEdit: (favorite: ReportFavorite) => void;
}

// Favorite Card Component
interface FavoriteCardProps {
  /** Favorite data */
  favorite: ReportFavorite;
  /** Card size variant */
  variant?: 'compact' | 'detailed';
  /** Click handler */
  onClick: () => void;
  /** Actions */
  actions: FavoriteAction[];
  /** Loading state (when navigating) */
  isLoading?: boolean;
  /** Error state */
  error?: string;
}

interface FavoriteAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

// Favorites List Page Component
interface FavoritesListPageProps {
  /** All favorites */
  favorites: ReportFavorite[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Sort order */
  sortBy?: 'recent' | 'name' | 'type';
  /** Sort change handler */
  onSortChange?: (sort: 'recent' | 'name' | 'type') => void;
  /** Search query */
  searchQuery?: string;
  /** Search change handler */
  onSearchChange?: (query: string) => void;
}

// Add to Favorites Dialog
interface AddFavoriteDialogProps {
  /** Report type being favorited */
  reportType: ReportType;
  /** Report display name */
  reportName: string;
  /** Current filters */
  filters: ReportFilters;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (name: string) => Promise<void>;
  /** Saving state */
  isSaving?: boolean;
}

// Edit Favorite Dialog
interface EditFavoriteDialogProps {
  /** Favorite being edited */
  favorite: ReportFavorite;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (name: string) => Promise<void>;
  /** Saving state */
  isSaving?: boolean;
}

// Remove Favorite Dialog
interface RemoveFavoriteDialogProps {
  /** Favorite being removed */
  favorite: ReportFavorite;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm handler */
  onConfirm: () => Promise<void>;
  /** Removing state */
  isRemoving?: boolean;
}

// Report Icon Component (for cards)
interface ReportIconProps {
  /** Report type */
  reportType: ReportType;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}
```

---

## Component Mapping

| Wireframe Element | React Component | shadcn/ui Base |
|-------------------|-----------------|----------------|
| Favorite star button | FavoriteStarButton | Button |
| Favorites section | FavoritesSection | Card |
| Favorite card (grid) | FavoriteCard | Card |
| Favorite card (list) | FavoriteListItem | - |
| Add dialog | AddFavoriteDialog | Dialog |
| Edit dialog | EditFavoriteDialog | Dialog |
| Remove dialog | RemoveFavoriteDialog | AlertDialog |
| Actions dropdown | FavoriteActions | DropdownMenu |
| Report icon | ReportIcon | - |
| Empty state | FavoritesEmptyState | - |
| Search input | SearchInput | Input |
| Sort select | SortSelect | Select |
| Toast notification | Toast (existing) | Toast |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Star toggle response | < 100ms | Visual feedback |
| Add to favorites | < 500ms | Saved & confirmed |
| Remove from favorites | < 500ms | Removed & confirmed |
| Favorites load | < 300ms | Section populated |
| Navigate to favorite | < 1s | Report loaded with filters |
| Search/filter | < 100ms | Results updated |

---

## Integration Notes

### URL Structure for Favorites

```
When clicking a favorite, navigate to:
/reports/[reportType]?filters=[encodedFilters]

Example:
/reports/sales?filters=eyJkYXRlUmFuZ2UiOnsic3RhcnQiOiIyMDI2LTAxLTAxIiwiZW5kIjoiMjAyNi0wMS0zMSJ9LCJyZWdpb24iOiJ3ZXN0In0=

The report page reads the filters query param and applies them on load.
```

### Filter Serialization

```typescript
// Encode filters for URL
const encodeFilters = (filters: ReportFilters): string => {
  return btoa(JSON.stringify(filters));
};

// Decode filters from URL
const decodeFilters = (encoded: string): ReportFilters => {
  return JSON.parse(atob(encoded));
};
```

---

## Files to Create/Modify

```
src/routes/_authed/reports/favorites.tsx (create)
src/components/domain/reports/favorites/
  - favorite-star-button.tsx (create)
  - favorites-section.tsx (create)
  - favorite-card.tsx (create)
  - favorite-list-item.tsx (create)
  - add-favorite-dialog.tsx (create)
  - edit-favorite-dialog.tsx (create)
  - remove-favorite-dialog.tsx (create)
  - report-icon.tsx (create)
  - favorites-empty-state.tsx (create)
src/components/domain/reports/report-layout.tsx (modify - add star button)
src/routes/_authed/reports/index.tsx (modify - add favorites section)
src/server/functions/report-favorites.ts (from DOM-RPT-006b)
```

---

## Related Wireframes

- [Financial Summary Report](./DOM-RPT-004.wireframe.md)
- [Report Schedule UI](./DOM-RPT-005c.wireframe.md)
- [Report Builder](./DOM-RPT-007.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** Claude Code
