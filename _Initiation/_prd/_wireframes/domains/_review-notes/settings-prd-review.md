# Settings PRD UI Pattern Enhancement Review

**Date:** 2026-01-10
**PRD:** `opc/_Initiation/_prd/domains/settings.prd.json`
**Version:** 1.1 (updated from 1.0)

## Summary

Enhanced the Settings domain PRD with UI pattern specifications for all UI-component stories. Each story now includes a `uiPatterns` field with concrete implementation guidance based on Midday (reference implementation) and shadcn/ui components.

## Changes Made

### 1. Added `uiPatterns` Field to All Stories

All 12 stories now have structured UI pattern guidance:
- **Pattern name**: High-level UI approach
- **Components**: Specific shadcn/ui components to use
- **References**: Actual code examples from Midday reference
- **Implementation notes**: Key details for developers

### 2. Primary UI Patterns Identified

| Pattern | Stories Using It | Key Components |
|---------|------------------|----------------|
| **Vertical Card Stack** | SET-ORGANIZATION-UI, SET-PREFERENCES-UI, SET-SYSTEM-DEFAULTS-UI | Card, CardHeader, CardContent, CardFooter, Form |
| **Tabs + DataTable** | SET-USERS-UI, SET-CUSTOM-FIELDS-UI, SET-AUDIT-UI | Tabs, TabsList, DataTable, Suspense |
| **SecondaryMenu Navigation** | SET-NAVIGATION-UI | SecondaryMenu (custom), max-w-[800px] layout |
| **Grid of Cards** | SET-INTEGRATIONS-UI | Card grid, Badge, Dialog |
| **Wizard + Status Table** | SET-DATA-EXPORT-UI | Multi-step form, DataTable, Progress |
| **Custom Schedule UI** | SET-BUSINESS-HOURS-UI | Card, Grid, Switch, Time pickers |

### 3. Midday Reference Components Used

All patterns reference actual Midday implementation files:

**Navigation & Layout:**
- `settings/layout.tsx` - SecondaryMenu navigation pattern
- `secondary-menu.tsx` - Horizontal tab navigation component

**Forms & Settings:**
- `company-name.tsx` - Vertical card stack with form
- `display-name.tsx` - User profile editing pattern
- `account-settings.tsx` - Space-y-12 vertical stack
- `change-theme.tsx` - Theme selector reference

**Complex UIs:**
- `team-members.tsx` - Tabs with DataTable pattern
- `base-currency.tsx` - Dropdown selector in card
- `apps.tsx` - Grid layout for integration cards

### 4. Key Design Principles Identified

From analyzing Midday components:

1. **Max-width constraint:** Settings pages use `max-w-[800px]` for readability
2. **Vertical spacing:** `space-y-12` between Card components
3. **Card structure:** Consistent CardHeader → CardContent → CardFooter flow
4. **Input constraints:** Forms use `max-w-[300px]` on input fields
5. **Tab styling:** Transparent background with border-bottom for TabsList
6. **Loading states:** SubmitButton with `isSubmitting` prop
7. **Data loading:** Suspense boundaries with custom skeletons
8. **Minimal padding:** TabsTrigger uses `p-0 m-0` with manual spacing

## Story-by-Story Pattern Assignments

### Schema & API Stories (No UI)
- **SET-CORE-SCHEMA**: Schema-only (no UI patterns)
- **SET-CORE-API**: Server API-only (no UI patterns)
- **SET-INTEGRATION-API**: Integration layer (React patterns but no direct UI)

### UI Stories with Patterns

#### SET-NAVIGATION-UI
**Pattern:** SecondaryMenu Navigation + Max-Width Layout
- Horizontal tab-style navigation with border-bottom
- Max-width container (800px) for content
- Shared layout wrapper for all settings routes
- Active state handled by routing

**Reference:** Midday settings layout

#### SET-ORGANIZATION-UI
**Pattern:** Vertical Card Stack
- Each setting in separate Card (space-y-12)
- Form validation with Zod
- SubmitButton with loading states
- CardFooter split layout (help text left, button right)

**Reference:** Midday company-name.tsx, display-name.tsx

#### SET-USERS-UI
**Pattern:** Tabs + DataTable
- Tabs for Active Users vs Pending Invitations
- Transparent TabsList with border-bottom
- DataTable wrapped in Suspense with skeleton
- Independent data fetching per tab

**Reference:** Midday team-members.tsx

#### SET-SYSTEM-DEFAULTS-UI
**Pattern:** Vertical Card Stack with Category Grouping
- Grouped related defaults in single Card
- Descriptive CardDescription for impact
- Consider accordion for collapsible sections
- Visual preview when values change

**Reference:** Midday company-name.tsx, display-name.tsx

#### SET-BUSINESS-HOURS-UI
**Pattern:** Card-Based Form with Visual Schedule
- Grid layout for days of week
- Each row: Day name + Toggle + Start/End time pickers
- Client-side validation (end > start)
- Visual conflict highlighting
- Separate card for holidays

**Reference:** Midday base-currency.tsx (for selector pattern)

#### SET-CUSTOM-FIELDS-UI
**Pattern:** Tabs + DataTable + Dialog
- Top-level tabs for entity types
- DataTable of fields per entity
- Add Field button opens Dialog with multi-step form
- Drag-and-drop field reordering
- Conditional form fields based on field type

**Reference:** Midday team-members.tsx (tabs + table pattern)

#### SET-INTEGRATIONS-UI
**Pattern:** Grid of Integration Cards
- Grid layout (2-3 columns)
- Card per integration with logo, name, status badge
- Click to open Dialog with config form
- Visual status indicators (green/red dots)
- Test Connection button per integration

**Reference:** Midday apps.tsx, app.tsx

#### SET-AUDIT-UI
**Pattern:** Filters + DataTable + Export Actions
- Filter bar above DataTable
- Advanced filters in collapsible/Dialog
- Expandable rows for old/new values diff
- Color-coded Badge for action types
- Export button in table header

**Reference:** Midday team-members.tsx (table structure)

#### SET-DATA-EXPORT-UI
**Pattern:** Wizard Form + Status Table
- Top: Create New Export card with wizard steps
  - Step 1: Select entities (checkboxes + warnings)
  - Step 2: Choose format with preview
  - Step 3: Review and submit
- Bottom: Export History DataTable with download links
- Progress bars for in-progress exports

**Reference:** Midday company-name.tsx (card structure)

#### SET-PREFERENCES-UI
**Pattern:** Vertical Card Stack
- Card per preference category (space-y-12)
- Personal settings (avatar, name) first
- Theme selector with visual previews
- Switch components for toggles
- Separate save button per card

**Reference:** Midday account-settings.tsx, change-theme.tsx

## Implementation Recommendations

### Component Library Stack
- **Base:** shadcn/ui (Card, Form, Input, Button, Tabs, etc.)
- **Forms:** react-hook-form + zod validation
- **Data:** TanStack Query / tRPC for data fetching
- **Tables:** TanStack Table or custom DataTable component

### Styling Approach
- **Container:** `max-w-[800px]` for settings pages
- **Spacing:** `space-y-12` for vertical card layouts
- **Inputs:** `max-w-[300px]` for form inputs
- **Tabs:** `bg-transparent border-b-[1px]` for TabsList
- **Padding:** Minimal on TabsTrigger (`p-0 m-0`), manual spacing with `mr-4`

### State Management
- **Forms:** react-hook-form with Zod schemas
- **Loading:** SubmitButton `isSubmitting` prop
- **Data fetching:** Suspense boundaries with skeletons
- **Mutations:** Track `isPending` state for optimistic updates

### Accessibility
- Use semantic HTML via shadcn/ui components
- FormField components handle label/error association
- Keyboard navigation in Tabs and navigation
- ARIA labels on action buttons

## Next Steps

1. **Create component stubs** for each UI story based on patterns
2. **Build shared components:**
   - SecondaryMenu navigation
   - DataTable with expandable rows
   - SettingsCard wrapper (standardized Card layout)
   - SubmitButton with loading states
3. **Implement form patterns:**
   - Create Zod schemas for each settings form
   - Build form hooks for common patterns
4. **Add Suspense/Error boundaries** for all data-loading components
5. **Create skeleton loaders** matching each pattern

## Files Modified

1. **Updated:** `opc/_Initiation/_prd/domains/settings.prd.json`
   - Version bumped to 1.1
   - Added `uiPatterns` field to all 12 stories
   - References to Midday components added

2. **Created:** This review document
   - `opc/_Initiation/_prd/_wireframes/domains/_review-notes/settings-prd-review.md`

## Validation

- JSON structure validated (no syntax errors)
- All references point to existing Midday files in `_reference/.midday-reference/`
- Pattern assignments match story requirements
- Component recommendations align with existing UI library (shadcn/ui)

## Notes

- **Midday as reference:** Patterns based on production-ready Midday implementation
- **shadcn/ui consistency:** All recommended components available in shadcn/ui library
- **TanStack alignment:** Data fetching patterns assume TanStack Router + Query (as used in Renoz v3)
- **Responsive design:** All patterns support mobile via Card/Dialog responsive behavior

---

**Review Status:** Complete
**Ready for Implementation:** Yes
**Blockers:** None - all patterns have working reference implementations
