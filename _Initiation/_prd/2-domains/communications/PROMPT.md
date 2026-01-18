# Ralph Loop: Communications Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## UI Implementation Constraints

> **IMPORTANT:** All UI stories MUST follow these constraints from the project's /ui skill.

### Critical Requirements (Block Deployment)

| Component | Requirement |
|-----------|-------------|
| All inputs | `aria-label` on icon-only buttons, associated labels |
| Navigation | Use `<a>`/`<Link>` not `div onClick` |
| Focus | Visible `:focus-visible` rings on all interactive elements |
| Keyboard | Full keyboard support per WAI-ARIA APG patterns |

### Communications-Specific UI Rules

#### DOM-COMMS-001c (Email Tracking Stats)
- [ ] StatsCard MUST use `tabular-nums` for percentages
- [ ] DetailDialog MUST trap focus and return focus on close
- [ ] Timestamps MUST use `Intl.DateTimeFormat` for locale-awareness

#### DOM-COMMS-002c (Email Scheduling)
- [ ] DateTimePicker MUST have full keyboard navigation
- [ ] Timezone selector MUST follow combobox pattern (searchable)
- [ ] Scheduled emails list MUST reflect sort/filter in URL

#### DOM-COMMS-003d (Campaign Management)
- [ ] MultiStepWizard URL MUST reflect current step
- [ ] FilterBuilder MUST support keyboard add/remove conditions
- [ ] Recipient preview MUST virtualize if >50 recipients
- [ ] Batch sending progress MUST use `aria-live` updates
- [ ] MUST use `AlertDialog` for campaign send confirmation

#### DOM-COMMS-004c (Call Scheduling)
- [ ] FormDialog MUST autofocus first input (desktop only)
- [ ] Snooze/reschedule dropdown MUST have keyboard support
- [ ] Upcoming calls widget MUST have empty state with action
- [ ] Overdue calls MUST use color + icon indicator (not color-only)

#### DOM-COMMS-005 (Communication Preferences)
- [ ] Preference toggles MUST be keyboard accessible
- [ ] Opt-out confirmation MUST use `AlertDialog`
- [ ] Audit history table MUST use `tabular-nums` for dates

#### DOM-COMMS-006 (Email Signatures)
- [ ] RichTextEditor MUST preserve focus on hydration
- [ ] Preview MUST match email client rendering
- [ ] Save MUST use optimistic UI with rollback on error
- [ ] Signature selector MUST be keyboard navigable

#### DOM-COMMS-007 (Custom Email Templates)
- [ ] Variable insertion popover MUST be keyboard accessible
- [ ] Version history restore MUST use `AlertDialog` confirmation
- [ ] Three-column layout MUST collapse responsively on mobile
- [ ] Template list MUST virtualize if >50 templates

#### DOM-COMMS-008 (Timeline Enhancement)
- [ ] Filter bar MUST reflect state in URL
- [ ] Export menu MUST be keyboard accessible
- [ ] Timeline items MUST use semantic list structure
- [ ] Quick actions MUST have visible focus states

### Rich Text Editor Requirements (Tiptap)
- MUST preserve focus and cursor position on hydration
- MUST support keyboard shortcuts (Cmd/Ctrl+B, I, U, etc.)
- MUST have accessible toolbar with `aria-label` on buttons
- MUST handle paste from Word/Google Docs gracefully
- Variable insertion MUST use `{{variable}}` syntax with autocomplete

### Animation Rules
- NEVER add animation unless explicitly requested in wireframe
- MUST honor `prefers-reduced-motion`
- MUST animate only `transform`/`opacity` (compositor props)
- NEVER use `transition: all` - list properties explicitly
- NEVER exceed 200ms for interaction feedback

### Component Primitives
Use existing shadcn/ui components:
- Dialogs: `Dialog` (Radix-based)
- Tabs: `Tabs` from shadcn
- Data Tables: `DataTable` + TanStack Table
- Rich Text: Tiptap editor
- Date/Time: `date-fns` + shadcn DatePicker
- Virtualization: `@tanstack/react-virtual`

## Objective
Build the communications domain for renoz-v3: email tracking, scheduling, bulk campaigns, call management, communication preferences, email signatures, custom templates, and enhanced timeline. This enables unified tracking and templated communications for battery business interactions.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with DOM-COMMS-001a.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/communications/communications.prd.json` - Stories and acceptance criteria

### Wireframes
All wireframes located in `./wireframes/`:
- `DOM-COMMS-001c.wireframe.md` - Email tracking stats display
- `DOM-COMMS-002c.wireframe.md` - Email scheduling UI
- `DOM-COMMS-003d.wireframe.md` - Campaign management wizard
- `DOM-COMMS-004c.wireframe.md` - Call scheduling UI
- `DOM-COMMS-005.wireframe.md` - Communication preferences
- `DOM-COMMS-006.wireframe.md` - Email signature management
- `DOM-COMMS-007.wireframe.md` - Custom email templates
- `DOM-COMMS-008.wireframe.md` - Enhanced communications timeline

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui + Resend + Trigger.dev

### Dependencies
**Must Complete Before Starting:**
- schema-foundation (database schema tables)
- DOM-CUSTOMERS (customer and contact data)

### Enables
- DOM-SUPPORT (issue-related email templates)
- DOM-FINANCIAL (invoice and reminder emails)
- DOM-WARRANTY (registration and expiry emails)

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** for UI pattern details
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

Execute stories in this strict order (by priority in PRD):

### Phase 1: Email Tracking (DOM-COMMS-001)
- **DOM-COMMS-001a**: Add Email Tracking Schema
  - Add openedAt, clickedAt, linkClicks columns to email_history table
  - **Priority**: 1 | **Est. Iterations**: 2
  - **Completion Promise**: DOM_COMMS_001A_COMPLETE

- **DOM-COMMS-001b**: Implement Email Tracking Service
  - Create tracking pixel endpoint and link wrapper service
  - **Priority**: 2 | **Est. Iterations**: 3 | **Ref**: `DOM-COMMS-001c.wireframe.md`
  - **Completion Promise**: DOM_COMMS_001B_COMPLETE

- **DOM-COMMS-001c**: Add Email Tracking Stats UI
  - Display open/click stats on email detail view and template stats
  - **Priority**: 3 | **Est. Iterations**: 3 | **Type**: ui-component | **Ref**: `DOM-COMMS-001c.wireframe.md`
  - **Completion Promise**: DOM_COMMS_001C_COMPLETE

### Phase 2: Email Scheduling (DOM-COMMS-002)
- **DOM-COMMS-002a**: Add Scheduled Emails Schema
  - Create scheduled_emails table
  - **Priority**: 4 | **Est. Iterations**: 2
  - **Completion Promise**: DOM_COMMS_002A_COMPLETE

- **DOM-COMMS-002b**: Implement Email Scheduling Service
  - Create Trigger.dev scheduled task and CRUD server functions
  - **Priority**: 5 | **Est. Iterations**: 3
  - **Completion Promise**: DOM_COMMS_002B_COMPLETE

- **DOM-COMMS-002c**: Add Email Scheduling UI
  - Add schedule send option to email composer and scheduled emails management
  - **Priority**: 6 | **Est. Iterations**: 3 | **Type**: ui-component | **Ref**: `DOM-COMMS-002c.wireframe.md`
  - **Completion Promise**: DOM_COMMS_002C_COMPLETE

### Phase 3: Email Campaigns (DOM-COMMS-003)
- **DOM-COMMS-003a**: Add Email Campaigns Schema
  - Create email_campaigns and campaign_recipients tables
  - **Priority**: 7 | **Est. Iterations**: 2
  - **Completion Promise**: DOM_COMMS_003A_COMPLETE

- **DOM-COMMS-003b**: Implement Campaign Recipient Selection
  - Server functions for campaign creation with recipient filtering
  - **Priority**: 8 | **Est. Iterations**: 2
  - **Completion Promise**: DOM_COMMS_003B_COMPLETE

- **DOM-COMMS-003c**: Implement Campaign Batch Sending
  - Trigger.dev task for sending campaign emails in batches
  - **Priority**: 9 | **Est. Iterations**: 3
  - **Completion Promise**: DOM_COMMS_003C_COMPLETE

- **DOM-COMMS-003d**: Add Campaign Management UI
  - Create campaign management interface with preview and stats
  - **Priority**: 10 | **Est. Iterations**: 4 | **Type**: ui-component | **Ref**: `DOM-COMMS-003d.wireframe.md`
  - **Completion Promise**: DOM_COMMS_003D_COMPLETE

### Phase 4: Call Scheduling (DOM-COMMS-004)
- **DOM-COMMS-004a**: Add Scheduled Calls Schema
  - Create scheduled_calls table for call scheduling
  - **Priority**: 11 | **Est. Iterations**: 2
  - **Completion Promise**: DOM_COMMS_004A_COMPLETE

- **DOM-COMMS-004b**: Implement Call Scheduling Service
  - Server functions and Trigger.dev reminder task for scheduled calls
  - **Priority**: 12 | **Est. Iterations**: 2
  - **Completion Promise**: DOM_COMMS_004B_COMPLETE

- **DOM-COMMS-004c**: Add Call Scheduling UI
  - UI for scheduling follow-up calls for quote discussions, installation coordination, and technical support
  - **Priority**: 13 | **Est. Iterations**: 3 | **Type**: ui-component | **Ref**: `DOM-COMMS-004c.wireframe.md`
  - **Completion Promise**: DOM_COMMS_004C_COMPLETE

### Phase 5: Communication Preferences (DOM-COMMS-005)
- **DOM-COMMS-005**: Add Communication Preferences
  - Track customer communication preferences (emailOptIn, smsOptIn)
  - **Priority**: 14 | **Est. Iterations**: 4 | **Type**: ui-component | **Ref**: `DOM-COMMS-005.wireframe.md`
  - **Completion Promise**: DOM_COMMS_005_COMPLETE

### Phase 6: Email Signatures (DOM-COMMS-006)
- **DOM-COMMS-006**: Add Email Signature Management
  - Personal and company email signatures
  - **Priority**: 15 | **Est. Iterations**: 4 | **Type**: ui-component | **Ref**: `DOM-COMMS-006.wireframe.md`
  - **Completion Promise**: DOM_COMMS_006_COMPLETE

### Phase 7: Custom Email Templates (DOM-COMMS-007)
- **DOM-COMMS-007**: Add Custom Email Templates Management
  - Add database-stored custom email templates with visual editor
  - **Priority**: 16 | **Est. Iterations**: 5 | **Type**: ui-component | **Ref**: `DOM-COMMS-007.wireframe.md`
  - **Completion Promise**: DOM_COMMS_007_COMPLETE

### Phase 8: Timeline Enhancement (DOM-COMMS-008)
- **DOM-COMMS-008**: Fix and Enhance Communications Timeline
  - Fix bugs in existing communication-history.tsx and add filtering, search, export features
  - **Priority**: 17 | **Est. Iterations**: 4 | **Type**: ui-component | **Ref**: `DOM-COMMS-008.wireframe.md`
  - **Completion Promise**: DOM_COMMS_008_COMPLETE

### Phase 9: Activity Auto-Capture (COMMS-AUTO)
- **COMMS-AUTO-001**: Email-to-Activity Bridge
  - Automatically create activity record when email is sent via Resend
  - **Priority**: 18 | **Est. Iterations**: 2 | **Layers**: server
  - **Dependencies**: INT-RES-001-A (Resend webhook handling)
  - **Completion Promise**: COMMS_AUTO_001_COMPLETE

- **COMMS-AUTO-002**: Activity Source Tracking
  - Track how activities were created (manual vs auto-capture)
  - **Priority**: 19 | **Est. Iterations**: 1 | **Layers**: schema, server
  - **Completion Promise**: COMMS_AUTO_002_COMPLETE

- **COMMS-AUTO-003**: Quick Log UI Enhancement
  - Streamlined UI for manually logging calls and notes
  - **Priority**: 20 | **Est. Iterations**: 2 | **Type**: ui-component | **Layers**: ui
  - **Dependencies**: COMMS-AUTO-002
  - **Completion Promise**: COMMS_AUTO_003_COMPLETE

## Activity Linking Patterns

When creating activities from emails or other sources:
- **Customer Linking**: Match recipient email to contacts.email to find customer_id
- **Opportunity Linking**: Pass opportunity_id in email context/metadata
- **Source Tracking**: Always set `source` field ('email', 'webhook', 'system', 'manual')
- **Source Ref**: Store the source record ID (email_id, webhook_id) in `source_ref`

## Completion

When ALL communications domain stories pass:
```xml
<promise>DOM_COMMUNICATIONS_COMPLETE</promise>
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
- Reference wireframes for UI patterns
- Use Resend for email sending
- Use Trigger.dev for scheduled tasks
- Respect email preferences before sending

### DO NOT
- Modify files outside communications domain scope
- Skip acceptance criteria
- Hardcode configuration values
- Create components that duplicate shadcn/ui primitives
- Send emails without preference checks
- Ignore timezone handling in scheduling

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   └── _authed/
│   │       └── communications/          # Communications routes
│   │           ├── index.tsx
│   │           ├── emails/
│   │           ├── scheduled/
│   │           ├── templates/
│   │           ├── campaigns/
│   │           ├── calls/
│   │           ├── preferences/
│   │           └── ...
│   ├── components/
│   │   └── communications/              # Communications components
│   │       ├── email-composer.tsx
│   │       ├── timeline.tsx
│   │       ├── campaign-wizard.tsx
│   │       ├── call-scheduler.tsx
│   │       └── ...
│   └── lib/
│       ├── server/
│       │   └── functions/
│       │       └── communications.ts   # Server functions
│       └── schemas/
│           ├── email-tracking.ts
│           ├── scheduled-emails.ts
│           ├── campaigns.ts
│           └── ...
├── drizzle/
│   ├── migrations/                     # Drizzle migrations
│   └── schema/
│       └── communications.ts           # Communications tables
└── trigger/
    └── email-jobs.ts                  # Trigger.dev tasks
```

## Key Technologies

### Email
- **Sending**: Resend API
- **Templates**: React Email (system) + Custom DB templates
- **Tracking**: Pixel + link wrapper

### Scheduling
- **Task Queue**: Trigger.dev
- **Cron**: Check scheduled items every minute
- **Timezone**: Store in DB, apply on client

### UI Components
- **Rich Editor**: Tiptap for signatures and templates
- **DateTime**: shadcn/ui DatePicker + custom TimezoneSelect
- **Tables**: TanStack Table for lists
- **Modals**: shadcn/ui Dialog
- **Forms**: React Hook Form + Zod

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Email sending failures → Check Resend API key and rate limits
  - Timezone issues → Verify timezone library usage
  - Tracking pixel not firing → Check image URL generation
  - Trigger.dev task delays → Check cron configuration and logs
  - UI pattern mismatch → Reference wireframes and test accessibility

## Progress Template

```markdown
# Communications Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] DOM-COMMS-001a: Add Email Tracking Schema
- [ ] DOM-COMMS-001b: Implement Email Tracking Service
- [ ] DOM-COMMS-001c: Add Email Tracking Stats UI
- [ ] DOM-COMMS-002a: Add Scheduled Emails Schema
- [ ] DOM-COMMS-002b: Implement Email Scheduling Service
- [ ] DOM-COMMS-002c: Add Email Scheduling UI
- [ ] DOM-COMMS-003a: Add Email Campaigns Schema
- [ ] DOM-COMMS-003b: Implement Campaign Recipient Selection
- [ ] DOM-COMMS-003c: Implement Campaign Batch Sending
- [ ] DOM-COMMS-003d: Add Campaign Management UI
- [ ] DOM-COMMS-004a: Add Scheduled Calls Schema
- [ ] DOM-COMMS-004b: Implement Call Scheduling Service
- [ ] DOM-COMMS-004c: Add Call Scheduling UI
- [ ] DOM-COMMS-005: Add Communication Preferences
- [ ] DOM-COMMS-006: Add Email Signature Management
- [ ] DOM-COMMS-007: Add Custom Email Templates Management
- [ ] DOM-COMMS-008: Fix and Enhance Communications Timeline

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
**Target:** renoz-v3 Communications Domain
**Completion Promise:** DOM_COMMUNICATIONS_COMPLETE
