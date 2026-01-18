# Ralph Loop: Settings Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Build the complete configuration management system for renoz-v3: organizational settings, user preferences, business hours, custom fields, audit logging, and data export capabilities. This domain provides centralized configuration and governance across the entire application.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with SET-CORE-SCHEMA.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/settings/settings.prd.json` - Complete settings domain specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **AI**: Vercel AI SDK + Anthropic

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase 1: Core Database Schema (SET-CORE-SCHEMA)

**Story**: SET-CORE-SCHEMA - Configuration Core Schema
**Description**: Create all settings-related database tables with proper relationships and constraints
**Type**: schema
**Wireframes**: None (schema-only)

Acceptance criteria:
- Complete organizations, users, userPreferences tables with all fields
- systemSettings table for global configuration
- businessHours and holidays tables for scheduling
- auditLogs table for comprehensive change tracking
- customFields and customFieldValues tables for extensibility
- dataExports table for backup and portability
- All foreign key relationships and indexes properly defined
- RLS policies for organization-level data isolation
- TypeScript types exported for all entities

Files to modify:
- src/lib/schema/organizations.ts
- src/lib/schema/users.ts
- src/lib/schema/user-preferences.ts
- src/lib/schema/system-settings.ts
- src/lib/schema/business-hours.ts
- src/lib/schema/holidays.ts
- src/lib/schema/audit-logs.ts
- src/lib/schema/custom-fields.ts
- src/lib/schema/custom-field-values.ts
- src/lib/schema/data-exports.ts
- src/lib/schema/index.ts
- drizzle/migrations/007_settings.ts

Estimated iterations: 2

### Phase 2: Core API Layer (SET-CORE-API)

**Story**: SET-CORE-API - Configuration Core API
**Description**: Implement CRUD operations and queries for all settings entities
**Type**: server-function
**Wireframes**: None (server API-only)
**Dependencies**: SET-CORE-SCHEMA

Acceptance criteria:
- Complete organizations API with settings management
- Full users API with preferences and profile management
- Comprehensive systemSettings API with validation
- Business hours and holidays management endpoints
- Audit log API with advanced filtering and search
- Custom fields CRUD with validation and ordering
- Data export job management and file handling
- All endpoints include proper error handling and RLS
- Zod schemas for all request/response validation

Files to modify:
- src/server/functions/organizations.ts
- src/server/functions/users.ts
- src/server/functions/system-settings.ts
- src/server/functions/business-hours.ts
- src/server/functions/holidays.ts
- src/server/functions/audit-logs.ts
- src/server/functions/custom-fields.ts
- src/server/functions/data-exports.ts
- src/lib/schemas/settings.ts

Estimated iterations: 3

### Phase 3: Settings Navigation (SET-NAVIGATION-UI)

**Story**: SET-NAVIGATION-UI - Settings Navigation System
**Description**: Create unified navigation and layout for all settings sections
**Type**: ui-component
**Wireframes**: settings-index.md
**Dependencies**: SET-CORE-API

Acceptance criteria:
- Responsive sidebar navigation with all settings sections
- Search functionality across all settings pages
- Breadcrumb navigation for deep settings
- Role-based menu visibility (admin vs regular users)
- Recently visited settings tracking
- Keyboard shortcuts for quick navigation
- Mobile-responsive drawer navigation
- Loading states and error boundaries

Files to modify:
- src/routes/_authed/settings/index.tsx
- src/components/settings/settings-navigation.tsx
- src/components/settings/settings-layout.tsx
- src/components/settings/settings-search.tsx

UI Pattern: SecondaryMenu Navigation + Max-Width Layout
Components:
- SecondaryMenu (Midday) - Horizontal tab-style navigation with border-bottom
- Max-width container (800px) for content focus
- Nested route layout with shared navigation wrapper

References:
- _reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/layout.tsx
- _reference/.midday-reference/apps/dashboard/src/components/secondary-menu.tsx

Implementation notes:
- Use SecondaryMenu with items array for tab-like navigation
- Wrap content in max-w-[800px] container for readability
- Navigation persists across all settings pages via shared layout
- Active state automatically handled by routing

Estimated iterations: 3

### Phase 4: Organization Settings (SET-ORGANIZATION-UI)

**Story**: SET-ORGANIZATION-UI - Organization Settings Interface
**Description**: Organization profile, branding, and basic configuration UI
**Type**: ui-component
**Wireframes**: DOM-SET-001b.wireframe.md, DOM-SET-001c.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Organization name, domain, and contact information forms
- Timezone, locale, and currency selection
- Logo upload and branding customization
- Settings validation and conflict detection
- Change preview and confirmation dialogs
- Integration status display for connected systems
- Audit trail for organization changes

Files to modify:
- src/routes/_authed/settings/organization.tsx
- src/components/settings/organization-form.tsx
- src/components/settings/branding-upload.tsx
- src/components/settings/integration-status.tsx

UI Pattern: Vertical Card Stack Pattern
Components:
- Card (shadcn/ui) - Container for each setting section
- CardHeader with CardTitle and CardDescription
- CardContent for form inputs
- CardFooter for help text + SubmitButton
- Form + FormField (react-hook-form + zod)

References:
- _reference/.midday-reference/apps/dashboard/src/components/company-name.tsx
- _reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/page.tsx

Implementation notes:
- Each setting = separate Card in space-y-12 container
- Form validation with zod schema
- SubmitButton shows loading state during mutation
- CardFooter split: left for help text, right for action button
- Use max-w-[300px] on inputs for visual consistency

Estimated iterations: 3

### Phase 5: User Management (SET-USERS-UI)

**Story**: SET-USERS-UI - User Management Interface
**Description**: Complete user administration with roles and permissions
**Type**: ui-component
**Wireframes**: DOM-SET-002.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- User list with roles, status, and activity indicators
- Add/edit user forms with role assignment
- Bulk user operations (activate, deactivate, change roles)
- Password reset and account recovery
- User activity logs and login history
- Permission matrix visualization
- Two-factor authentication setup
- Account deactivation and data export

Files to modify:
- src/routes/_authed/settings/users.tsx
- src/components/settings/user-list.tsx
- src/components/settings/user-form.tsx
- src/components/settings/role-management.tsx

UI Pattern: Tabs + DataTable Pattern
Components:
- Tabs (shadcn/ui) - Section switcher
- TabsList with transparent background + border-bottom
- DataTable component for user lists
- Suspense boundaries with skeleton loaders

References:
- _reference/.midday-reference/apps/dashboard/src/components/team-members.tsx
- _reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/members/page.tsx

Implementation notes:
- Tabs for Active Users vs Pending Invitations
- TabsList uses transparent bg + border-bottom styling
- DataTable wrapped in Suspense with custom skeleton
- Each tab fetches data independently via tRPC prefetch
- Use TabsTrigger with minimal padding (p-0 m-0)

Estimated iterations: 3

### Phase 6: System Defaults (SET-SYSTEM-DEFAULTS-UI)

**Story**: SET-SYSTEM-DEFAULTS-UI - System Defaults Configuration
**Description**: Global default values for orders, quotes, and business rules
**Type**: ui-component
**Wireframes**: DOM-SET-003b.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Organized categories: Orders, Quotes, Financial, Formatting
- Default value forms with validation
- Preview of how defaults appear in forms
- Override capability indicators
- Default usage analytics and adoption tracking
- Reset to system defaults option
- Change impact assessment before saving

Files to modify:
- src/routes/_authed/settings/defaults.tsx
- src/components/settings/defaults-form.tsx
- src/components/settings/defaults-preview.tsx
- src/components/settings/defaults-analytics.tsx

UI Pattern: Vertical Card Stack with Category Grouping
Components:
- Card components for each category (Orders, Quotes, Financial, Formatting)
- Nested CardContent sections for related settings
- Form components with Zod validation
- SubmitButton with loading states

References:
- _reference/.midday-reference/apps/dashboard/src/components/company-name.tsx
- _reference/.midday-reference/apps/dashboard/src/components/display-name.tsx

Implementation notes:
- Group related defaults in single Card (e.g., all financial settings together)
- Use descriptive CardDescription to explain impact of defaults
- Consider accordion pattern for collapsible category sections
- Show visual preview or example when default value changes

Estimated iterations: 3

### Phase 7: Business Hours (SET-BUSINESS-HOURS-UI)

**Story**: SET-BUSINESS-HOURS-UI - Business Hours Configuration
**Description**: Weekly schedule and holiday management interface
**Type**: ui-component
**Wireframes**: DOM-SET-005b.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Visual weekly calendar with time slot selection
- Day enable/disable toggles with visual feedback
- Holiday calendar with recurring holiday support
- Timezone selection with automatic conversion
- Business hours conflict detection
- SLA calculation preview
- Bulk schedule operations
- Schedule export and import

Files to modify:
- src/routes/_authed/settings/business-hours.tsx
- src/components/settings/business-hours-calendar.tsx
- src/components/settings/holidays-manager.tsx
- src/components/settings/timezone-selector.tsx

UI Pattern: Card-Based Form with Visual Schedule
Components:
- Card wrapper for business hours section
- Custom weekly calendar component (7 rows for days)
- Time pickers for start/end times
- Switch/Toggle for day enable/disable
- Separate Card for holidays list/calendar

References:
- _reference/.midday-reference/apps/dashboard/src/components/base-currency/base-currency.tsx

Implementation notes:
- Use grid layout for days of week (Monday-Sunday)
- Each day row: Day name + Enable toggle + Start time + End time
- Validate end time > start time client-side
- Highlight conflicts visually (overlapping times)
- Holiday management in separate card below schedule

Estimated iterations: 3

### Phase 8: Custom Fields (SET-CUSTOM-FIELDS-UI)

**Story**: SET-CUSTOM-FIELDS-UI - Custom Fields Builder
**Description**: Dynamic field creation and management for all entity types
**Type**: ui-component
**Wireframes**: DOM-SET-006b.wireframe.md, DOM-SET-006c.wireframe.md, DOM-SET-006d.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Entity type selection and field list management
- Field creation wizard with type selection
- Field configuration: validation rules, options, defaults
- Drag-and-drop field ordering
- Field usage analytics and reporting
- Field migration tools for existing data
- Field permissions and visibility controls
- Field testing and validation tools

Files to modify:
- src/routes/_authed/settings/custom-fields.tsx
- src/components/settings/field-builder.tsx
- src/components/settings/field-configurator.tsx
- src/components/settings/field-ordering.tsx

UI Pattern: Tabs + DataTable + Dialog Pattern
Components:
- Tabs for entity type selection (Customers, Orders, Products, Suppliers)
- DataTable showing existing custom fields
- Dialog for adding/editing fields
- Drag-and-drop reorder component
- Form with conditional fields based on field type

References:
- _reference/.midday-reference/apps/dashboard/src/components/team-members.tsx

Implementation notes:
- Top-level tabs for entity types
- Each tab shows DataTable of fields for that entity
- Add Field button opens Dialog with multi-step form
- Field list supports drag-and-drop reordering
- Field type selection changes available configuration options

Estimated iterations: 3

### Phase 9: Integrations (SET-INTEGRATIONS-UI)

**Story**: SET-INTEGRATIONS-UI - Integrations Management Hub
**Description**: Third-party integration configuration and monitoring
**Type**: ui-component
**Wireframes**: DOM-SET-007.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Integration cards with status indicators
- Connection configuration forms
- Health check and testing capabilities
- Usage statistics and rate limiting display
- Integration event logs and error tracking
- Reconnect and disconnect workflows
- API key management with security
- Integration documentation and help

Files to modify:
- src/routes/_authed/settings/integrations.tsx
- src/components/settings/integration-card.tsx
- src/components/settings/integration-config.tsx
- src/components/settings/integration-monitor.tsx

UI Pattern: Grid of Integration Cards
Components:
- Grid layout for integration cards (2-3 columns)
- Card per integration with logo/icon
- Badge for connection status (Connected/Disconnected/Error)
- Dialog for configuration settings
- Alert/Banner for connection issues

References:
- _reference/.midday-reference/apps/dashboard/src/components/apps.tsx
- _reference/.midday-reference/apps/dashboard/src/components/app.tsx

Implementation notes:
- Grid of Cards, each representing one integration
- Card shows: Integration logo, name, status badge, brief description
- Click card to open Dialog with configuration form
- Visual status indicators (green dot = connected, red = error)
- Test Connection button to verify integration health

Estimated iterations: 3

### Phase 10: Audit Log (SET-AUDIT-UI)

**Story**: SET-AUDIT-UI - Audit Log Explorer
**Description**: Comprehensive audit trail viewing and analysis
**Type**: ui-component
**Wireframes**: DOM-SET-008.wireframe.md
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Advanced filtering: user, action, entity, date range
- Real-time audit streaming
- Search across all audit fields
- Export capabilities with format options
- Audit visualization and trends
- Compliance reporting tools
- Audit retention management
- Anomaly detection and alerting

Files to modify:
- src/routes/_authed/settings/audit-log.tsx
- src/components/settings/audit-filters.tsx
- src/components/settings/audit-table.tsx
- src/components/settings/audit-export.tsx

UI Pattern: Filters + DataTable + Export Actions
Components:
- Filter bar with user, action, entity, date range selectors
- DataTable with expandable rows for details
- Export button with format selection (CSV, PDF)
- Badge components for action types
- Pagination for large result sets

References:
- _reference/.midday-reference/apps/dashboard/src/components/team-members.tsx

Implementation notes:
- Filter bar above DataTable with common filters always visible
- Advanced filters in collapsible section or Dialog
- Expandable table rows show old/new values diff
- Use Badge components to color-code action types (create=green, delete=red, etc.)
- Export button in table header with format dropdown

Estimated iterations: 3

### Phase 11: Data Export (SET-DATA-EXPORT-UI)

**Story**: SET-DATA-EXPORT-UI - Data Export Portal
**Description**: Data portability and backup management interface
**Type**: ui-component
**Wireframes**: None (generic export workflow)
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Entity selection with dependency awareness
- Export format options with previews
- Background job status tracking
- Download management with expiration handling
- Scheduled export configuration
- Export history and re-download
- Data anonymization options
- Export size and performance warnings

Files to modify:
- src/routes/_authed/settings/data-export.tsx
- src/components/settings/export-wizard.tsx
- src/components/settings/export-history.tsx
- src/components/settings/export-scheduler.tsx

UI Pattern: Wizard Form + Status Table
Components:
- Multi-step wizard in Card for new export
- Checkbox group for entity selection
- Radio group for format selection (CSV, JSON, XLSX)
- DataTable showing export history with status badges
- Progress indicator for in-progress exports

References:
- _reference/.midday-reference/apps/dashboard/src/components/company-name.tsx

Implementation notes:
- Top section: Create New Export card with wizard steps
- Step 1: Select entities (checkboxes with dependency warnings)
- Step 2: Choose format with preview
- Step 3: Review and submit
- Bottom section: Export History table with download links
- Show progress bar or spinner for processing exports

Estimated iterations: 3

### Phase 12: User Preferences (SET-PREFERENCES-UI)

**Story**: SET-PREFERENCES-UI - User Preferences Interface
**Description**: Personal user settings and preferences management
**Type**: ui-component
**Wireframes**: None (personal preferences workflow)
**Dependencies**: SET-NAVIGATION-UI

Acceptance criteria:
- Theme and appearance preferences
- Notification and communication settings
- Language and localization options
- Dashboard and layout preferences
- Shortcut and accessibility settings
- Data export and privacy preferences
- Preference categories with search
- Preference reset and backup

Files to modify:
- src/routes/_authed/settings/preferences.tsx
- src/components/settings/preference-categories.tsx
- src/components/settings/theme-selector.tsx
- src/components/settings/notification-settings.tsx

UI Pattern: Vertical Card Stack Pattern
Components:
- Card per preference category
- Theme selector with visual previews
- Switch/Toggle components for boolean preferences
- Select dropdowns for options (language, locale)
- CardFooter with save buttons per section

References:
- _reference/.midday-reference/apps/dashboard/src/components/account-settings.tsx
- _reference/.midday-reference/apps/dashboard/src/components/display-name.tsx
- _reference/.midday-reference/apps/dashboard/src/components/change-theme.tsx

Implementation notes:
- Each preference category in separate Card (space-y-12 container)
- Personal settings like avatar, display name first
- Theme selector shows visual theme previews
- Use Switch components for toggles (notifications on/off)
- Separate save button per card for granular updates

Estimated iterations: 3

### Phase 13: Settings Integration Layer (SET-INTEGRATION-API)

**Story**: SET-INTEGRATION-API - Settings Integration Layer
**Description**: Integration points for settings usage throughout the application
**Type**: server-function
**Wireframes**: None (integration layer - no UI)
**Dependencies**: SET-CORE-API

Acceptance criteria:
- Settings context provider for React components
- Settings hooks for common setting access patterns
- Settings caching and performance optimization
- Settings validation middleware
- Settings change broadcasting and cache invalidation
- Settings migration utilities for updates
- Settings testing utilities and mocks

Files to modify:
- src/contexts/settings-context.tsx
- src/hooks/use-settings.ts
- src/lib/settings-cache.ts
- src/middleware/settings-validation.ts

UI Pattern: n/a (integration layer - uses React hooks and context patterns but no direct UI)

Estimated iterations: 3

## Completion

When ALL settings domain stories pass:
```xml
<promise>DOM_SETTINGS_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Implement RLS policies for data isolation
- Track all changes in audit logs

### DO NOT
- Modify files outside settings domain scope
- Skip acceptance criteria
- Use client-side auth checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values
- Bypass RLS policies
- Store sensitive data unencrypted

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   └── _authed/
│   │       └── settings/
│   │           ├── index.tsx                    # Settings index/navigation
│   │           ├── organization.tsx             # Organization settings
│   │           ├── users.tsx                    # User management
│   │           ├── defaults.tsx                 # System defaults
│   │           ├── business-hours.tsx           # Business hours config
│   │           ├── custom-fields.tsx            # Custom fields builder
│   │           ├── integrations.tsx             # Integrations hub
│   │           ├── audit-log.tsx                # Audit log viewer
│   │           ├── data-export.tsx              # Data export portal
│   │           └── preferences.tsx              # User preferences
│   ├── components/
│   │   └── settings/
│   │       ├── settings-navigation.tsx
│   │       ├── settings-layout.tsx
│   │       ├── settings-search.tsx
│   │       ├── organization-form.tsx
│   │       ├── branding-upload.tsx
│   │       ├── integration-status.tsx
│   │       ├── user-list.tsx
│   │       ├── user-form.tsx
│   │       ├── role-management.tsx
│   │       ├── defaults-form.tsx
│   │       ├── defaults-preview.tsx
│   │       ├── defaults-analytics.tsx
│   │       ├── business-hours-calendar.tsx
│   │       ├── holidays-manager.tsx
│   │       ├── timezone-selector.tsx
│   │       ├── field-builder.tsx
│   │       ├── field-configurator.tsx
│   │       ├── field-ordering.tsx
│   │       ├── integration-card.tsx
│   │       ├── integration-config.tsx
│   │       ├── integration-monitor.tsx
│   │       ├── audit-filters.tsx
│   │       ├── audit-table.tsx
│   │       ├── audit-export.tsx
│   │       ├── export-wizard.tsx
│   │       ├── export-history.tsx
│   │       ├── export-scheduler.tsx
│   │       ├── preference-categories.tsx
│   │       ├── theme-selector.tsx
│   │       └── notification-settings.tsx
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── organizations.ts
│   │   │   ├── users.ts
│   │   │   ├── user-preferences.ts
│   │   │   ├── system-settings.ts
│   │   │   ├── business-hours.ts
│   │   │   ├── holidays.ts
│   │   │   ├── audit-logs.ts
│   │   │   ├── custom-fields.ts
│   │   │   ├── custom-field-values.ts
│   │   │   ├── data-exports.ts
│   │   │   └── index.ts
│   │   ├── server/
│   │   │   ├── functions/
│   │   │   │   ├── organizations.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── system-settings.ts
│   │   │   │   ├── business-hours.ts
│   │   │   │   ├── holidays.ts
│   │   │   │   ├── audit-logs.ts
│   │   │   │   ├── custom-fields.ts
│   │   │   │   └── data-exports.ts
│   │   ├── schemas/
│   │   │   └── settings.ts
│   │   ├── settings-cache.ts
│   │   └── settings-context.tsx
│   ├── hooks/
│   │   └── use-settings.ts
│   ├── contexts/
│   │   └── settings-context.tsx
│   └── middleware/
│       └── settings-validation.ts
└── drizzle/
    └── migrations/
        └── 007_settings.ts
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Form validation → Check Zod schema structure

## Progress Template

```markdown
# Settings Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] SET-CORE-SCHEMA: Configuration Core Schema
- [ ] SET-CORE-API: Configuration Core API
- [ ] SET-NAVIGATION-UI: Settings Navigation System
- [ ] SET-ORGANIZATION-UI: Organization Settings Interface
- [ ] SET-USERS-UI: User Management Interface
- [ ] SET-SYSTEM-DEFAULTS-UI: System Defaults Configuration
- [ ] SET-BUSINESS-HOURS-UI: Business Hours Configuration
- [ ] SET-CUSTOM-FIELDS-UI: Custom Fields Builder
- [ ] SET-INTEGRATIONS-UI: Integrations Management Hub
- [ ] SET-AUDIT-UI: Audit Log Explorer
- [ ] SET-DATA-EXPORT-UI: Data Export Portal
- [ ] SET-PREFERENCES-UI: User Preferences Interface
- [ ] SET-INTEGRATION-API: Settings Integration Layer

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Settings Domain
**Completion Promise:** DOM_SETTINGS_COMPLETE
