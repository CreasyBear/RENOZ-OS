# Foundation PRD Blindspot Analysis

> Analysis of gaps between documented backend patterns and foundation PRDs.
> Generated: 2026-01-10

## Summary

| PRD | Critical Gaps | Medium Gaps | Minor Gaps |
|-----|--------------|-------------|------------|
| schema-foundation | 3 | 4 | 2 |
| auth-foundation | 2 | 2 | 1 |
| appshell-foundation | 2 | 2 | 1 |
| **New PRDs Needed** | 3 | - | - |

---

## Schema Foundation (FOUND-SCHEMA)

### Critical Gaps

#### 1. Missing: Connection Pooling Configuration
**Pattern:** `postgres(URL, { prepare: false })`
**Issue:** PRD doesn't mention Supabase pooler compatibility requirement
**Impact:** Queries will fail with "prepared statement already exists" errors
**Fix:** Add story FOUND-SCHEMA-000 for DB client setup

```typescript
// MUST disable prepare for Supabase Transaction pooler mode
const client = postgres(DATABASE_URL, { prepare: false, max: 10 })
```

#### 2. Missing: numericCasted Custom Type
**Pattern:** Custom type for currency precision
**Issue:** PRD mentions numeric columns but not the pattern to avoid floating-point issues
**Impact:** Financial calculations may have precision errors
**Fix:** Add to FOUND-SCHEMA-005 (patterns module)

```typescript
export const numericCasted = customType<{
  data: number
  driverData: string
  config: { precision?: number; scale?: number }
}>({ ... })
```

#### 3. Missing: Read Replica Pattern
**Pattern:** Separate primary/replica connections with regional routing
**Issue:** No consideration for read scalability
**Impact:** All queries hit primary, limiting scale
**Fix:** Add to out_of_scope with note for V1 consideration

### Medium Gaps

#### 4. Missing: Query Organization Pattern
**Pattern:** `packages/db/src/queries/` folder with domain files
**Issue:** PRD focuses on schema, not query layer organization
**Impact:** Queries scattered across codebase, harder to maintain
**Fix:** Add story FOUND-SCHEMA-009 for query layer setup

#### 5. Missing: Full-Text Search Indexes
**Pattern:** GIN indexes with `to_tsvector()`
**Issue:** Only mentions "basic indexes" in success criteria
**Impact:** Customer/product search will be slow without proper FTS
**Fix:** Add to FOUND-SCHEMA-006 acceptance criteria

#### 6. Missing: JSONB $type<> Pattern
**Pattern:** Type-safe JSONB with `.$type<Interface>()`
**Issue:** PRD mentions JSONB but not typing pattern
**Impact:** JSONB columns lose type safety
**Fix:** Document in FOUND-SCHEMA-001 README

#### 7. Missing: Enum File Separation
**Pattern:** All enums in `drizzle/schema/enums.ts`
**Issue:** PRD doesn't specify enum organization
**Impact:** Enums scattered across files, circular import risk
**Fix:** Add to FOUND-SCHEMA-005 patterns module

### Minor Gaps

#### 8. Missing: Index Naming Convention
**Pattern:** `{table}_{column}_idx` format
**Issue:** Mentioned in patterns but not in PRD
**Fix:** Add to FOUND-SCHEMA-001 documentation

#### 9. Missing: Migration Workflow
**Pattern:** `bun run db:generate` vs `db:push` vs `db:migrate`
**Issue:** PRD mentions migration but not full workflow
**Fix:** Add to FOUND-SCHEMA-001 documentation

---

## Auth Foundation (FOUND-AUTH)

### Critical Gaps

#### 1. Missing: Rate Limiting
**Pattern:** Request rate limiting per user/IP
**Issue:** No rate limiting on auth endpoints or API tokens
**Impact:** Vulnerable to brute force attacks, API abuse
**Fix:** Add story FOUND-AUTH-010 for rate limiting middleware

```typescript
export const withRateLimit = (opts: { requests: number; window: string }) =>
  createMiddleware(async (ctx) => {
    const key = `rate:${ctx.userId}:${ctx.endpoint}`
    // Redis-based rate limiting
  })
```

#### 2. Missing: Webhook Authentication
**Pattern:** HMAC signature verification for incoming webhooks
**Issue:** No pattern for verifying external webhook signatures
**Impact:** Webhooks can be spoofed
**Fix:** Add to webhooks PRD (new)

### Medium Gaps

#### 3. Missing: Middleware Composition
**Pattern:** `withAuth`, `withRole`, `withRateLimit` composition
**Issue:** PRD has createProtectedFn but not composable middleware
**Impact:** Auth logic duplicated across server functions
**Fix:** Expand FOUND-AUTH-005 with middleware composition

#### 4. Missing: Session Refresh Pattern
**Pattern:** Auto-refresh JWT before expiry
**Issue:** PRD mentions sessions but not refresh strategy
**Impact:** Users logged out unexpectedly
**Fix:** Add to FOUND-AUTH-001 Supabase client setup

### Minor Gaps

#### 5. Missing: Auth Error Types
**Pattern:** Specific error classes with HTTP status codes
**Issue:** PRD mentions AuthError but not full error hierarchy
**Fix:** Expand FOUND-AUTH-005 with error types

---

## AppShell Foundation (FOUND-APPSHELL)

### Critical Gaps

#### 1. Missing: Realtime Integration
**Pattern:** Supabase realtime subscriptions with TanStack Query invalidation
**Issue:** No mention of realtime updates in UI
**Impact:** Users don't see live updates without refresh
**Fix:** Create new FOUND-REALTIME PRD or add stories to AppShell

```typescript
// Pattern needed in AppShell
useRealtimeSubscription(`orders:${orgId}`, () => {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
})
```

#### 2. Missing: AI Chat Integration
**Pattern:** Global AI sidebar/chat interface
**Issue:** No mention of AI chat in AppShell
**Impact:** AI features lack consistent entry point
**Fix:** Add story FOUND-APPSHELL-011 for AI sidebar

### Medium Gaps

#### 3. Missing: Optimistic Updates
**Pattern:** TanStack Query mutations with optimistic UI
**Issue:** PRD focuses on layout, not data patterns
**Impact:** UI feels slow without optimistic updates
**Fix:** Add to conventions.md or separate query patterns PRD

#### 4. Missing: Toast/Notification System
**Pattern:** Global toast provider for feedback
**Issue:** No mention of user feedback patterns
**Impact:** No consistent way to show success/error messages
**Fix:** Add story FOUND-APPSHELL-012 for toast provider

### Minor Gaps

#### 5. Missing: Loading States
**Pattern:** Skeleton components during data fetch
**Issue:** Mentioned in dashboard story but not systematized
**Fix:** Add to FOUND-APPSHELL-006 PageLayout

---

## New PRDs Needed

### 1. FOUND-REALTIME (Critical)
**Purpose:** Supabase Realtime integration patterns
**Stories:**
- Setup broadcast triggers for key tables
- Create useRealtimeSubscription hook
- TanStack Query integration pattern
- Channel authorization with RLS

### 2. FOUND-WEBHOOKS (Critical)
**Purpose:** Background jobs and webhook handling
**Stories:**
- Database webhook setup with pg_net
- Edge Function patterns for sync tasks
- Trigger.dev integration for async jobs
- Webhook signature verification

### 3. FOUND-QUERY-LAYER (Medium)
**Purpose:** Server function organization and patterns
**Stories:**
- Query file organization (`src/server/`)
- Prepared statement patterns for hot paths
- Pagination and filtering patterns
- Error handling middleware

---

## Recommended PRD Updates

### schema-foundation.prd.json

Add new stories:
```json
{
  "id": "FOUND-SCHEMA-000",
  "name": "Configure Database Client with Pooler Compatibility",
  "priority": 0,
  "acceptance_criteria": [
    "postgres client uses { prepare: false } for Supabase pooler",
    "Connection pool configured with max: 10, idle_timeout: 20",
    "drizzle client uses casing: 'snake_case'",
    "Database URL uses Supabase connection pooler URL"
  ]
}
```

Update FOUND-SCHEMA-005:
```json
{
  "acceptance_criteria": [
    // ... existing ...
    "numericCasted custom type for currency precision (12,2)",
    "File drizzle/schema/enums.ts consolidates all pgEnum definitions"
  ]
}
```

Update FOUND-SCHEMA-006:
```json
{
  "acceptance_criteria": [
    // ... existing ...
    "GIN index on customers.name for full-text search",
    "JSONB columns use $type<Interface>() for type safety"
  ]
}
```

### auth-foundation.prd.json

Add new story:
```json
{
  "id": "FOUND-AUTH-010",
  "name": "Add Rate Limiting Middleware",
  "priority": 10,
  "acceptance_criteria": [
    "withRateLimit middleware created in src/lib/server/middleware.ts",
    "Rate limit: 100 requests/minute for authenticated users",
    "Rate limit: 10 requests/minute for login attempts",
    "Rate limit: 1000 requests/minute for API tokens",
    "Redis-based rate limiting with sliding window",
    "429 response with Retry-After header"
  ]
}
```

### appshell-foundation.prd.json

Add new stories:
```json
{
  "id": "FOUND-APPSHELL-011",
  "name": "Add AI Chat Sidebar",
  "priority": 11,
  "acceptance_criteria": [
    "AI chat button in header (toggle)",
    "Slide-over panel for AI conversation",
    "Context-aware based on current page",
    "Persisted conversation history",
    "Integration with AI SDK streaming"
  ]
},
{
  "id": "FOUND-APPSHELL-012",
  "name": "Add Toast Notification Provider",
  "priority": 12,
  "acceptance_criteria": [
    "Sonner or shadcn toast provider in root layout",
    "Success/error/warning/info variants",
    "Auto-dismiss with configurable duration",
    "Action buttons in toasts",
    "useToast hook exported"
  ]
}
```

---

## Priority Matrix

| Gap | Effort | Impact | Priority |
|-----|--------|--------|----------|
| Connection pooling | Low | Critical | P0 |
| Rate limiting | Medium | High | P1 |
| Realtime integration | High | High | P1 |
| Query organization | Medium | Medium | P2 |
| AI chat sidebar | Medium | Medium | P2 |
| numericCasted type | Low | Medium | P2 |
| Webhook auth | Medium | High | P1 |
| Toast notifications | Low | Medium | P3 |

---

## Next Steps

1. **Immediate:** Update schema-foundation.prd.json with FOUND-SCHEMA-000 (connection pooling)
2. **This Sprint:** Create FOUND-REALTIME.prd.json and FOUND-WEBHOOKS.prd.json
3. **Backlog:** Add FOUND-AUTH-010 (rate limiting) and FOUND-APPSHELL-011/012
