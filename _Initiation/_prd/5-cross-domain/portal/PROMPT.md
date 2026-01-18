# Ralph Loop: Customer Self-Service Portal

## Objective
Build a customer-facing portal for viewing quotes, tracking orders/jobs, viewing invoices, and submitting support tickets. This portal reduces office calls for status updates by giving customers self-service access to their data.

## Required Reading

Before implementing any story, review these critical resources:

### Frontend Components
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

### Pattern Files

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Magic Link Auth, Quote Acceptance | Email failure recovery, saga for quote->order conversion |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | All UI stories | Portal pages <1s, mobile-responsive |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | Dashboard, Quote Acceptance | Quote accept (2 clicks), track order (1 click) |

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CROSS-PORTAL-001.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/5-cross-domain/portal/portal.prd.json` - Customer portal stories

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Magic link authentication (custom implementation)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **File Upload**: Supabase Storage
- **Email**: Resend for magic link delivery

## Security Requirements

### Authentication
- Magic link login (no passwords)
- Token expires after 15 minutes for security
- Session expires after 30 days of inactivity
- Rate limiting: 5 login attempts per 15 minutes per email

### Authorization
- Row-level security: customers only see their own data
- No internal user data exposed (names only, no contact info for staff)
- No internal notes, costs, or margin data exposed
- All routes require portal authentication

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
   - Output `<promise>[STORY_COMPLETION_PROMISE]</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase: Customer Portal (CROSS-PORTAL)
Execute stories in priority order from portal.prd.json:

1. CROSS-PORTAL-001: Portal Authentication
2. CROSS-PORTAL-002: Customer Dashboard
3. CROSS-PORTAL-003: Quote Viewing & Acceptance
4. CROSS-PORTAL-004: Order Tracking
5. CROSS-PORTAL-005: Job Status Tracking
6. CROSS-PORTAL-006: Invoice Viewing
7. CROSS-PORTAL-007: Support Ticket Submission
8. CROSS-PORTAL-008: Portal Branding

## Completion

When ALL portal stories pass:
```xml
<promise>CROSS_PORTAL_PHASE_COMPLETE</promise>
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
- Implement row-level security for all data access
- Use mobile-first responsive design
- Add proper rate limiting on authentication
- Validate all customer data access against customer_id
- Use Resend for sending magic link emails

### DO NOT
- Modify files outside portal scope
- Skip acceptance criteria
- Expose internal user phone numbers or emails
- Expose internal notes, costs, or margin data
- Allow cross-customer data access
- Store passwords (magic link only)
- Create separate mobile and desktop routes (responsive only)
- Implement real-time chat (out of scope)
- Process payments directly (link to external provider)

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── portal/                    # Portal routes (public auth pages)
│   │   │   ├── login.tsx              # Magic link request
│   │   │   ├── verify.tsx             # Magic link verification
│   │   │   └── _authed/               # Authenticated portal routes
│   │   │       ├── dashboard.tsx
│   │   │       ├── quotes/
│   │   │       │   ├── index.tsx
│   │   │       │   └── $quoteId.tsx
│   │   │       ├── orders/
│   │   │       │   ├── index.tsx
│   │   │       │   └── $orderId.tsx
│   │   │       ├── jobs/
│   │   │       │   ├── index.tsx
│   │   │       │   └── $jobId.tsx
│   │   │       ├── invoices/
│   │   │       │   ├── index.tsx
│   │   │       │   └── $invoiceId.tsx
│   │   │       └── support/
│   │   │           ├── index.tsx
│   │   │           ├── new.tsx
│   │   │           └── $ticketId.tsx
│   ├── components/
│   │   ├── portal/                    # Portal-specific components
│   │   │   ├── PortalLayout.tsx
│   │   │   ├── PortalNav.tsx
│   │   │   ├── CustomerDashboard.tsx
│   │   │   ├── QuoteCard.tsx
│   │   │   ├── QuoteDetail.tsx
│   │   │   ├── QuoteAcceptDialog.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobProgress.tsx
│   │   │   ├── InvoiceCard.tsx
│   │   │   ├── InvoiceDetail.tsx
│   │   │   ├── TicketCard.tsx
│   │   │   ├── TicketThread.tsx
│   │   │   ├── TicketForm.tsx
│   │   │   └── PortalBranding.tsx
│   │   └── shared/
│   └── lib/
│       ├── portal/                    # Portal business logic
│       │   ├── auth.ts                # Magic link authentication
│       │   ├── session.ts             # Session management
│       │   └── branding.ts            # Branding utilities
│       ├── server/
│       │   └── portal/                # Portal server functions
│       │       ├── auth.ts
│       │       ├── quotes.ts
│       │       ├── orders.ts
│       │       ├── jobs.ts
│       │       ├── invoices.ts
│       │       └── support.ts
│       └── schemas/
│           └── portal/                # Portal Zod schemas
├── drizzle/
│   └── schema/
│       └── portal-tokens.ts           # Magic link tokens table
└── tests/
    └── portal/
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Magic link token expiry -> Check token creation timestamp
  - Row-level security -> Verify customer_id filtering in all queries
  - Cross-customer access -> Double-check authorization middleware
  - File upload limits -> Verify Supabase Storage configuration
  - Email delivery -> Check Resend API configuration
  - Branding not applying -> Verify organization lookup by subdomain

## Progress Template

```markdown
# Customer Portal Progress
# PRD: portal.prd.json
# Started: [DATE]
# Updated: [DATE]

## Stories (8 total)

- [ ] CROSS-PORTAL-001: Portal Authentication
- [ ] CROSS-PORTAL-002: Customer Dashboard
- [ ] CROSS-PORTAL-003: Quote Viewing & Acceptance
- [ ] CROSS-PORTAL-004: Order Tracking
- [ ] CROSS-PORTAL-005: Job Status Tracking
- [ ] CROSS-PORTAL-006: Invoice Viewing
- [ ] CROSS-PORTAL-007: Support Ticket Submission
- [ ] CROSS-PORTAL-008: Portal Branding

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
**Created:** 2026-01-17
**Target:** renoz-v3 Customer Portal Phase
**Completion Promise:** CROSS_PORTAL_PHASE_COMPLETE
