# Ralph Loop: Users Domain Implementation

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective

Build complete identity and access management system with user management, team organization, invitations, delegations, preferences, security controls, and audit logging. This domain provides secure user access control, team collaboration tools, and comprehensive user administration capabilities across the entire application.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with USER-CORE-SCHEMA.

## Context

### PRD Files (in execution order)

1. `opc/_Initiation/_prd/2-domains/users/users.prd.json` - Complete Users domain specification with all stories and system requirements

### Reference Files

- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Wireframes directory: `./wireframes/`

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
3. **Review wireframes** referenced in the story (if UI-related)
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase 1: Core Schema and API (USER-CORE)

Execute stories in dependency order:

- **USER-CORE-SCHEMA**: User Management Core Schema
  - Database tables: organizations, users, userPreferences, userGroups, userGroupMembers, userDelegations, userInvitations, userOnboarding, userSessions, auditLogs
  - All foreign keys, indexes, constraints, RLS policies
  - TypeScript types exported for all entities

- **USER-CORE-API**: User Management Core API
  - Authentication endpoints (login, logout, register, verify email, reset password)
  - User CRUD operations with authorization
  - Invitation management with token validation
  - Group and team management
  - Delegation system
  - User preferences and personalization
  - Audit and activity logging
  - Comprehensive Zod validation schemas

### Phase 2: Authentication & Registration UI (USER-AUTH)

Execute UI stories:

- **USER-AUTHENTICATION-UI**: Authentication and Registration Interface
  - Login form with email/password validation
  - Registration form with organization setup
  - Email verification flow
  - Password reset with secure token validation
  - Social login options (if available)
  - Multi-factor authentication setup (if available)
  - Remember me functionality

### Phase 3: User Management UI (USER-MGMT)

Execute user administration stories:

- **USER-MANAGEMENT-UI**: User Administration Interface
  - User list with advanced filtering and search
  - User detail view with profile management
  - Bulk user operations with progress tracking
  - Role and permission management
  - User status management
  - User activity and login history
  - Export capabilities

- **USER-TEAM-ORGANIZATION-UI**: Team Organization Interface
  - Group creation and management
  - Member addition and role assignment
  - Group hierarchy visualization
  - Cross-group collaboration
  - Group activity tracking

- **USER-DELEGATION-UI**: Delegation Management Interface
  - Delegation creation with delegate selection
  - Date range picker with validation
  - Task reassignment during delegation
  - Delegation history and audit trail
  - Automatic expiration handling

- **USER-INVITATION-UI**: Invitation and Onboarding Interface
  - Invitation creation with customization
  - Bulk invitation management
  - Invitation acceptance flow
  - Onboarding checklist and progress tracking
  - Role-based onboarding

### Phase 4: User Preferences & Security (USER-PREFS)

Execute settings stories:

- **USER-PREFERENCES-UI**: User Preferences Interface
  - Theme and appearance customization
  - Notification preferences
  - Language and localization settings
  - Dashboard personalization
  - Accessibility settings

- **USER-SECURITY-UI**: Security Management Interface
  - Password change and validation
  - Active session management
  - Two-factor authentication setup
  - Login attempt monitoring
  - Device and location tracking
  - Security event history

- **USER-ONBOARDING-SYSTEM**: User Onboarding System
  - Role-based onboarding flow
  - Interactive checklist
  - Progress tracking
  - Contextual help and guided tours
  - Onboarding analytics

### Phase 5: Advanced Features (USER-ADVANCED)

Execute bulk and audit stories:

- **USER-BULK-OPERATIONS-UI**: Bulk User Operations Interface
  - Advanced user selection
  - Bulk operation confirmation
  - Progress tracking for long operations
  - CSV import with validation
  - Export with filtering
  - Rollback capabilities

- **USER-AUDIT-COMPLIANCE-UI**: Audit and Compliance Interface
  - Advanced audit log searching
  - User activity timeline
  - Compliance report generation
  - Data retention management
  - GDPR compliance tools
  - Security incident investigation

### Phase 6: Integration (USER-INTEGRATION)

Execute system-wide integration:

- **USER-INTEGRATION-API**: User System Integration Layer
  - User context provider for React
  - Authentication middleware and guards
  - Permission checking utilities and hooks
  - User data caching and optimization
  - Delegation-aware permission checking
  - Audit logging integration hooks
  - User preference management utilities

## Completion

When ALL user domain stories pass:
```xml
<promise>DOM_USERS_COMPLETE</promise>
```

## Story Wireframes

The following wireframes are referenced by stories in this domain:

| Story ID | Wireframe File | Components |
|----------|----------------|------------|
| USER-CORE-SCHEMA | (Schema - no UI) | Database tables, migrations |
| USER-CORE-API | (API - no UI) | Server functions, validation |
| USER-AUTHENTICATION-UI | (Auth foundation) | Login form, registration, password reset |
| USER-MANAGEMENT-UI | DOM-USER-001 through DOM-USER-006b | User list, detail, bulk actions |
| USER-TEAM-ORGANIZATION-UI | DOM-USER-002c | Group list, member management |
| USER-DELEGATION-UI | DOM-USER-003c | Delegation form, active delegation banner |
| USER-INVITATION-UI | DOM-USER-008c | Invitation form, preview, bulk upload |
| USER-PREFERENCES-UI | (Settings foundation) | Preference forms, theme selector |
| USER-SECURITY-UI | (Settings foundation) | Password, sessions, 2FA |
| USER-ONBOARDING-SYSTEM | DOM-USER-007c | Checklist, progress, tutorials |
| USER-BULK-OPERATIONS-UI | DOM-USER-006b | Bulk action toolbar, progress |
| USER-AUDIT-COMPLIANCE-UI | DOM-USER-001 (activity export) | Audit log table, search, export |

### Available Wireframes

- **DOM-USER-001**: Enhance User Activity View - Activity tab with DataTable and pagination
  - Path: `./wireframes/USER-001.wireframe.md`
  - Components: Activity table, export dialog, pagination, filters
  - Priority: 1

- **DOM-USER-002c**: User Groups UI - Settings section with DataTable and Dialog
  - Path: `./wireframes/USER-002c.wireframe.md`
  - Components: Group table, create/edit dialog, member combobox
  - Priority: 4

- **DOM-USER-003c**: Delegation UI - Form section with Alert banner
  - Path: `./wireframes/USER-003c.wireframe.md`
  - Components: Delegation form, date picker, active delegation alert
  - Priority: 7

- **DOM-USER-004**: Avatar Image Cropper - Image Cropper Dialog
  - Path: `./wireframes/USER-004.wireframe.md`
  - Components: Image drop zone, cropper, zoom/rotation controls
  - Priority: 8

- **DOM-USER-005c**: Last Login UI Display - DataTable column with Badge
  - Path: `./wireframes/USER-005c.wireframe.md`
  - Components: Last login column, inactive badge, alert banner
  - Priority: 11

- **DOM-USER-006b**: Bulk User Operations UI - Bulk action toolbar with Dialog
  - Path: `./wireframes/USER-006b.wireframe.md`
  - Components: Floating action bar, role change, add to group, email, progress
  - Priority: 13

- **DOM-USER-007c**: User Onboarding UI - Dashboard Card with checklist
  - Path: `./wireframes/USER-007c.wireframe.md`
  - Components: Checklist card, progress bar, video player, celebrate
  - Priority: 16

- **DOM-USER-008c**: Invitation Enhancement UI - Form with preview Card
  - Path: `./wireframes/USER-008c.wireframe.md`
  - Components: Invitation form, preview card, CSV upload, pending table
  - Priority: 19

## Constraints

### DO

- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for UI components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Reference wireframes in PR/implementation notes
- Use proper role-based access control (RBAC) checks
- Implement row-level security (RLS) for multi-tenant isolation

### DO NOT

- Modify files outside users domain scope without approval
- Skip acceptance criteria
- Use client-side auth checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values or role names
- Skip audit logging for user lifecycle events

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── admin/
│   │   │   │   ├── users/
│   │   │   │   │   ├── index.tsx           # User list page
│   │   │   │   │   └── $userId.tsx         # User detail page
│   │   │   │   ├── groups/
│   │   │   │   │   ├── index.tsx           # Group list page
│   │   │   │   │   └── $groupId.tsx        # Group detail page
│   │   │   │   ├── audit/
│   │   │   │   │   └── index.tsx           # Audit log page
│   │   │   ├── settings/
│   │   │   │   ├── preferences.tsx         # User preferences
│   │   │   │   └── security.tsx            # Security settings
│   │   │   ├── profile.tsx                 # User profile
│   │   │   ├── onboarding.tsx              # Onboarding flow
│   │   ├── _authed.tsx                     # Authenticated layout wrapper
│   │   └── accept-invitation.tsx           # Public invitation acceptance
│   ├── components/
│   │   ├── domain/
│   │   │   └── users/
│   │   │       ├── user-activity-tab.tsx
│   │   │       ├── activity-table.tsx
│   │   │       ├── user-list.tsx
│   │   │       ├── user-detail.tsx
│   │   │       ├── group-table.tsx
│   │   │       ├── delegation-form.tsx
│   │   │       ├── invitation-form.tsx
│   │   │       ├── onboarding-checklist.tsx
│   │   │       ├── bulk-actions-toolbar.tsx
│   │   │       └── [other user components]
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── shared/                    # Custom shared components
│   │   └── layout/                    # Shell components
│   ├── lib/
│   │   ├── supabase/                  # Supabase clients
│   │   ├── auth/                      # Auth utilities
│   │   ├── server/                    # Server functions
│   │   │   └── users/
│   │   │       ├── auth.ts
│   │   │       ├── users.ts
│   │   │       ├── groups.ts
│   │   │       ├── invitations.ts
│   │   │       ├── delegations.ts
│   │   │       ├── preferences.ts
│   │   │       └── audit.ts
│   │   └── schemas/                   # Zod schemas
│   │       └── users.ts
│   ├── contexts/
│   │   └── user-context.tsx          # User context provider
│   ├── hooks/
│   │   ├── use-user.ts               # User query hook
│   │   ├── use-permissions.ts        # Permission checking
│   │   ├── use-user-activity.ts      # Activity loading
│   │   └── [other user hooks]
├── drizzle/
│   ├── schema/
│   │   ├── organizations.ts
│   │   ├── users.ts
│   │   ├── user-preferences.ts
│   │   ├── user-groups.ts
│   │   ├── user-delegations.ts
│   │   ├── user-invitations.ts
│   │   ├── user-onboarding.ts
│   │   ├── user-sessions.ts
│   │   └── audit-logs.ts
│   └── migrations/
│       ├── 009_users.ts              # Initial users schema
│       ├── 010_user_groups.ts        # Groups and members
│       └── [additional migrations]
└── tests/
    └── integration/
        └── users/
            └── [integration tests]
```

## Key Technologies & Patterns

### Database

- **Drizzle ORM** for type-safe database access
- **PostgreSQL** for persistence
- **Row-Level Security (RLS)** for multi-tenant isolation
- **Foreign key constraints** and proper indexing

### API

- **Server functions** (TanStack Start pattern)
- **Zod validation** for request/response
- **Error handling** with proper HTTP status codes
- **Pagination** for large datasets

### UI

- **React Server Components** where possible
- **React Hook Form** with Zod for client validation
- **TanStack Table** for advanced data tables
- **shadcn/ui** components as primitives
- **Responsive design** (mobile/tablet/desktop)

### Security

- **Role-Based Access Control (RBAC)** with owner/admin/manager/sales/operations/support/viewer roles
- **Permission matrix** for granular access
- **Audit logging** for compliance
- **Secure token generation** for invitations and password resets
- **Session management** with expiration and device tracking

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Role/permission issues → Check auth-foundation.prd.json for permission matrix

## Progress Template

```markdown
# Users Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] USER-CORE-SCHEMA: User Management Core Schema
- [ ] USER-CORE-API: User Management Core API
- [ ] USER-AUTHENTICATION-UI: Authentication and Registration Interface
- [ ] USER-MANAGEMENT-UI: User Administration Interface
- [ ] USER-TEAM-ORGANIZATION-UI: Team Organization Interface
- [ ] USER-DELEGATION-UI: Delegation Management Interface
- [ ] USER-INVITATION-UI: Invitation and Onboarding Interface
- [ ] USER-PREFERENCES-UI: User Preferences Interface
- [ ] USER-SECURITY-UI: Security Management Interface
- [ ] USER-ONBOARDING-SYSTEM: User Onboarding System
- [ ] USER-BULK-OPERATIONS-UI: Bulk User Operations Interface
- [ ] USER-AUDIT-COMPLIANCE-UI: Audit and Compliance Interface
- [ ] USER-INTEGRATION-API: User System Integration Layer

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
**Target:** renoz-v3 Users Domain
**Completion Promise:** DOM_USERS_COMPLETE
