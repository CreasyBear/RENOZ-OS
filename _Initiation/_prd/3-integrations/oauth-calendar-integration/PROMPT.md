# Ralph Loop: OAuth Calendar Integration

## Objective

Implement comprehensive OAuth 2.0 integration suite providing secure access to Google Workspace and Microsoft 365 services including Calendar, Email (Gmail/Outlook), and Contacts for enhanced productivity, communication automation, and unified contact management.

## Required Reading

Before implementing UI components, review:

- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with INT-OAUTH-001-A.

## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, mock OAuth APIs |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | **ALL stories (PRIMARY)** | Pattern 1: Exponential backoff, dead letter queue, 5 retries. Pattern 5: OAuth token refresh |
| Security | `_Initiation/_meta/patterns/oauth-security.md` | **ALL stories (PRIMARY)** | AES-256 token encryption, secure state management, audit logging |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | Sync operations, UI | Handle 1000+ events, sync <30s, UI <1s |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | Connection UI, Error UI | Connect calendar (2 clicks), error retry accessible |

## Context

### PRD File

- `opc/_Initiation/_prd/3-integrations/oauth-calendar-integration.prd.json` - Complete OAuth calendar integration specification

### Reference Files

- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/foundation/PROMPT.md`

### Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth (separate from calendar OAuth)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State Management**: TanStack Query
- **External**: Google Calendar API v3, Microsoft Graph API, Trigger.dev for background sync
- **Security**: AES-256 token encryption, HMAC state verification

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `opc/_Initiation/_prd/_wireframes/integrations/INT-OAUTH-*` (if available)
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

Execute stories in dependency order from oauth-calendar-integration.prd.json:

### Phase 1: Database & Security Foundation (INT-OAUTH-CORE)

1. **INT-OAUTH-001-A** - OAuth Connections Database Schema
   - Creates: oauth_connections table, indexes, RLS policies for multi-service support
   - Promise: `INT_OAUTH_001_A_COMPLETE`

2. **INT-OAUTH-001-B** - OAuth Token Encryption & Audit Schema
   - Creates: AES-256 encryption utilities, HMAC state verification, oauth_sync_logs and oauth_service_permissions tables
   - Promise: `INT_OAUTH_001_B_COMPLETE`

### Phase 2: OAuth Core Infrastructure (INT-OAUTH-FLOW)

1. **INT-OAUTH-002-A** - Multi-Service OAuth Implementation
   - Creates: OAuth initiation with service selection, callback handling for Google Workspace and Microsoft 365, token exchange for all services
   - Promise: `INT_OAUTH_002_A_COMPLETE`

2. **INT-OAUTH-002-B** - OAuth State & Permission Management
   - Creates: Secure state encryption, granular permission verification, organization-scoped state handling
   - Promise: `INT_OAUTH_002_B_COMPLETE`

### Phase 3: Connection Management (INT-OAUTH-CONNECTIONS)

1. **INT-OAUTH-003-A** - OAuth Connection CRUD Server
   - Creates: Create, read, update, delete OAuth connections with service granularity
   - Promise: `INT_OAUTH_003_A_COMPLETE`

2. **INT-OAUTH-003-B** - OAuth Connection UI
   - Creates: Multi-service connection setup, permission management interface, status dashboards
   - Promise: `INT_OAUTH_003_B_COMPLETE`

3. **INT-OAUTH-003-C** - Token Refresh & Health Monitoring
   - Creates: Background token refresh for all services, expiry monitoring, connection health validation
   - Promise: `INT_OAUTH_003_C_COMPLETE`

### Phase 4: Calendar Sync Engine (INT-OAUTH-CALENDAR)

1. **INT-OAUTH-004-A** - Calendar Service Implementation
   - Creates: Google Calendar API client, Outlook Graph API client, bidirectional event sync
   - Promise: `INT_OAUTH_004_A_COMPLETE`

2. **INT-OAUTH-004-B** - Job to Calendar Mapping
   - Creates: Bidirectional mapping logic, calendar-specific conflict resolution, event lifecycle management
   - Promise: `INT_OAUTH_004_B_COMPLETE`

### Phase 5: Email Integration (INT-OAUTH-EMAIL)

1. **INT-OAUTH-005-A** - Email Service Implementation
    - Creates: Gmail API client, Outlook Mail API client, message fetching and processing
    - Promise: `INT_OAUTH_005_A_COMPLETE`

2. **INT-OAUTH-005-B** - Email Processing Pipeline
    - Creates: Email filtering, attachment handling, communication log integration
    - Promise: `INT_OAUTH_005_B_COMPLETE`

### Phase 6: Contacts Integration (INT-OAUTH-CONTACTS)

1. **INT-OAUTH-006-A** - Contacts Service Implementation
    - Creates: Google Contacts API client, Microsoft Contacts API client, contact synchronization
    - Promise: `INT_OAUTH_006_A_COMPLETE`

2. **INT-OAUTH-006-B** - Contact Deduplication & Mapping
    - Creates: Contact merging logic, field mapping, duplicate detection algorithms
    - Promise: `INT_OAUTH_006_B_COMPLETE`

### Phase 7: User Interface & Monitoring (INT-OAUTH-UI)

1. **INT-OAUTH-007-A** - Unified Service Dashboard
    - Creates: Multi-service connection management, sync status monitoring, service configuration panels
    - Promise: `INT_OAUTH_007_A_COMPLETE`

2. **INT-OAUTH-007-B** - Audit Logging & Monitoring
    - Creates: Comprehensive audit trails, service health monitoring, admin dashboards
    - Promise: `INT_OAUTH_007_B_COMPLETE`

### Phase 5: User Interface (INT-OAUTH-UI)

1. **INT-OAUTH-005-A** - Calendar Selection UI
    - Creates: Available calendar picker, primary calendar detection
    - Promise: `INT_OAUTH_005_A_COMPLETE`

2. **INT-OAUTH-005-B** - Sync Status Dashboard
    - Creates: Real-time sync status, error displays, retry mechanisms
    - Promise: `INT_OAUTH_005_B_COMPLETE`

3. **INT-OAUTH-005-C** - Conflict Resolution UI
    - Creates: Manual conflict resolution interface, override capabilities
    - Promise: `INT_OAUTH_005_C_COMPLETE`

### Phase 6: Integration & Testing (INT-OAUTH-INTEGRATION)

1. **INT-OAUTH-006-A** - Job Assignment Integration
    - Creates: Automatic sync triggers, job lifecycle integration
    - Promise: `INT_OAUTH_006_A_COMPLETE`

2. **INT-OAUTH-006-B** - End-to-End Testing
    - Creates: Complete OAuth flow tests, sync reliability validation
    - Promise: `INT_OAUTH_006_B_COMPLETE`

3. **INT-OAUTH-006-C** - Production Readiness
    - Creates: Monitoring, alerting, performance optimization, documentation
    - Promise: `INT_OAUTH_006_C_COMPLETE`

## Wireframe References

Integration wireframes follow the naming pattern `INT-OAUTH-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| INT-OAUTH-001 | INT-OAUTH-003-B | Calendar connection management |
| INT-OAUTH-002 | INT-OAUTH-005-A | Calendar selection interface |
| INT-OAUTH-003 | INT-OAUTH-005-B | Sync status dashboard |
| INT-OAUTH-004 | INT-OAUTH-005-C | Conflict resolution UI |

Wireframes are located in: `opc/_Initiation/_prd/_wireframes/integrations/`

## Completion Promise

When ALL OAuth calendar integration stories pass successfully:

```xml
<promise>INT_OAUTH_COMPLETE</promise>
```

## Constraints

### DO

- Follow TanStack Start file-router conventions
- Use `src/` directory structure for all files
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Implement RLS policies for organization isolation
- Run `bun run typecheck` after each story
- Reference wireframes for UI/UX compliance
- Use AES-256 encryption for all tokens
- Implement HMAC state verification
- Follow OAuth 2.0 RFC 6749 standards
- Handle token refresh automatically
- Log all OAuth operations for audit
- Use Trigger.dev for background sync jobs

### DO NOT

- Modify files outside OAuth integration scope
- Skip acceptance criteria from PRD
- Store OAuth tokens in plain text
- Use client-side token storage
- Bypass RLS policies for performance
- Exceed API rate limits without throttling
- Create components that duplicate shadcn/ui
- Hardcode API keys or configuration values
- Create database tables without migrations
- Skip security audit logging
- Use insecure state parameters

## File Structure

OAuth calendar integration files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── calendar-connections.ts
│   │   │   └── index.ts
│   │   └── server/
│   │       ├── functions/
│   │       │   ├── calendar-oauth.ts
│   │       │   ├── calendar-connections.ts
│   │       │   ├── calendar-sync.ts
│   │       │   └── index.ts
│   │       └── schemas/
│   │           └── calendar-oauth.ts
│   ├── contexts/
│   │   └── calendar-oauth-context.tsx
│   ├── hooks/
│   │   ├── use-calendar-connections.ts
│   │   ├── use-calendar-sync.ts
│   │   ├── use-oauth-flow.ts
│   │   └── use-calendar-events.ts
│   ├── components/
│   │   └── integrations/
│   │       └── calendar-oauth/
│   │           ├── connection-manager.tsx
│   │           ├── calendar-selector.tsx
│   │           ├── sync-status-dashboard.tsx
│   │           ├── conflict-resolver.tsx
│   │           ├── oauth-callback.tsx
│   │           └── ... (other components)
│   └── routes/
│       └── _authed/
│           └── integrations/
│               └── calendar/
│                   ├── connections.tsx
│                   ├── sync.tsx
│                   ├── settings.tsx
│                   └── callback.tsx
└── drizzle/
    └── migrations/
        └── 023_calendar-oauth-integration.ts
```

## Key Success Metrics

- OAuth authorization flows working for both Google and Outlook
- Calendar connections securely stored and managed
- Automatic token refresh functioning reliably
- Bidirectional sync working with conflict resolution
- Real-time sync status and error reporting
- Manual conflict resolution capabilities
- Integration with job assignment lifecycle
- Zero TypeScript errors
- All tests passing
- Performance targets met:
  - OAuth flow < 5s end-to-end
  - Token refresh < 2s
  - Event sync < 30s for 1000 events
  - UI response < 1s
  - Memory usage < 50MB during sync

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - OAuth provider API changes → Check API documentation and update client
  - Token encryption failures → Verify key management and encryption implementation
  - CORS issues → Check OAuth redirect URI configuration
  - State verification failures → Debug HMAC implementation
  - Rate limiting → Implement exponential backoff
  - Database connection issues → Check RLS policies and connection configuration

## Progress Template

```markdown
# OAuth Calendar Integration Progress
# Started: [DATE]
# Updated: [DATE]

## Stories (17 total)
- [ ] INT-OAUTH-001-A: Calendar Connections Database Schema
- [ ] INT-OAUTH-001-B: OAuth Token Encryption Utilities
- [ ] INT-OAUTH-002-A: Google OAuth Implementation
- [ ] INT-OAUTH-002-B: Outlook OAuth Implementation
- [ ] INT-OAUTH-002-C: OAuth State Management
- [ ] INT-OAUTH-003-A: Calendar Connection CRUD Server
- [ ] INT-OAUTH-003-B: Calendar Connection UI
- [ ] INT-OAUTH-003-C: Token Refresh Automation
- [ ] INT-OAUTH-004-A: Calendar Event Fetching
- [ ] INT-OAUTH-004-B: Job to Event Mapping
- [ ] INT-OAUTH-004-C: Sync Engine Core
- [ ] INT-OAUTH-005-A: Calendar Selection UI
- [ ] INT-OAUTH-005-B: Sync Status Dashboard
- [ ] INT-OAUTH-005-C: Conflict Resolution UI
- [ ] INT-OAUTH-006-A: Job Assignment Integration
- [ ] INT-OAUTH-006-B: End-to-End Testing
- [ ] INT-OAUTH-006-C: Production Readiness

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- Progress tracking initialized
```

---

## Premortem Remediation

### Critical Risks Addressed

#### 1. OAuth Token Security (INT-OAUTH-007)

- **Risk:** OAuth tokens compromised leading to calendar data breaches
- **Solution:** AES-256 encryption with organization-specific keys, HMAC state verification, secure key rotation
- **Files Created:** `src/lib/oauth/token-encryption.ts`, `src/lib/oauth/state-verification.ts`

#### 2. API Rate Limiting (INT-OAUTH-008)

- **Risk:** Google/Outlook API rate limits causing sync failures during peak usage
- **Solution:** Redis-based rate limiter with proactive throttling, exponential backoff, usage monitoring
- **Files Created:** `src/lib/oauth/rate-limiter.ts`, `src/lib/oauth/queue.ts`

#### 3. Sync Conflicts (INT-OAUTH-009)

- **Risk:** Concurrent modifications causing data inconsistency between systems
- **Solution:** Optimistic locking, conflict detection, manual resolution UI, last-write-wins policy
- **Files Created:** `src/lib/oauth/conflict-resolver.ts`, `src/lib/oauth/sync-engine.ts`

#### 4. Connection Reliability (INT-OAUTH-010)

- **Risk:** Network failures causing sync interruptions without recovery
- **Solution:** Circuit breaker pattern, retry queues, offline sync capabilities
- **Files Created:** `src/lib/oauth/circuit-breaker.ts`, `src/lib/oauth/retry-queue.ts`

#### 5. Audit Compliance (INT-OAUTH-011)

- **Risk:** Insufficient logging for security and compliance requirements
- **Solution:** Comprehensive audit logging, OAuth operation tracking, data access monitoring
- **Files Created:** `src/lib/oauth/audit-logger.ts`, `src/server/functions/oauth/audit.ts`

### New Database Tables

From remediation:

- `calendar_sync_logs` - Sync operation history and audit trail
- `calendar_sync_errors` - Error tracking and resolution workflow
- `oauth_audit_logs` - Security event logging for compliance

### Success Criteria (Updated)

Original criteria plus:

- **Token Security:** AES-256 encryption verified, zero plaintext token storage
- **Rate Limit Compliance:** Zero 429 errors under normal load (1000 events/hour)
- **Sync Reliability:** >99.5% sync success rate within 3 retries
- **Conflict Resolution:** Manual override available within 30 seconds of detection
- **Audit Compliance:** All OAuth operations logged with tamper-proof timestamps
- **Recovery Time:** Failed connections auto-recover within 5 minutes

### Implementation Order

Execute remediation stories in this order (after core OAuth stories):

1. **INT-OAUTH-007** - Token Security Infrastructure (2 iterations)
2. **INT-OAUTH-008** - Rate Limiting & Queue Management (3 iterations)
3. **INT-OAUTH-009** - Conflict Resolution Engine (4 iterations)
4. **INT-OAUTH-010** - Connection Reliability Patterns (3 iterations)
5. **INT-OAUTH-011** - Audit Logging & Compliance (2 iterations)
6. **INT-OAUTH-012** - Remediation UI Dashboard (3 iterations)

**Total Additional Effort:** 17 iterations

---

## Error Recovery Patterns

This integration uses patterns from the central error recovery documentation.

**Reference:** `opc/_Initiation/_meta/patterns/error-recovery.md`

### Applicable Patterns

#### Pattern 1: OAuth Failure Recovery

Used for all OAuth token operations and API calls.

```
Retry Schedule:
- Attempt 1: Immediate
- Attempt 2: 5 seconds (token refresh if 401)
- Attempt 3: 30 seconds
- Attempt 4: 2 minutes
- Attempt 5: 10 minutes
- After 5 failures: Circuit breaker + alert user
```

#### Pattern 3: Sync Operation Recovery

Used for calendar synchronization operations.

```
Strategy: Idempotent batch processing with progress tracking
- Process events in batches of 50
- Track progress in database
- Resume from last successful batch
- Manual retry capability in UI
```

Key implementations:

- Calendar sync failures → `calendar_sync_errors` table
- OAuth token failures → Automatic refresh with fallback
- Network failures → Exponential backoff with circuit breaker

---

**Document Version:** 1.0
**Created:** 2026-01-19
**Updated:** 2026-01-19
**Target:** renoz-v3 OAuth Calendar Integration
**Completion Promise:** INT_OAUTH_COMPLETE
