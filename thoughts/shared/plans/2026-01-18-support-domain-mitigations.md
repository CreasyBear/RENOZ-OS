# Support Domain Premortem Mitigation Plan

**Generated:** 2026-01-18
**Source:** Multi-agent premortem analysis
**Status:** Pending Implementation

---

## Priority 1: HIGH Severity Tigers

### TIGER 1: In-Memory Rate Limiting

**Risk:** Rate limiter uses in-memory Map - doesn't scale across instances
**File:** `src/server/functions/csat-responses.ts:580-599`
**Impact:** 5 requests × N instances allowed, memory leak

**Mitigation:**
```typescript
// Option A: Redis-based rate limiting (Recommended)
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:public-feedback:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 300); // 5 min window
  }
  return count <= 5;
}

// Option B: Database-backed (if no Redis)
// Add rate_limits table with (ip, count, window_start) columns
// Use atomic UPDATE with WHERE clause
```

**Tasks:**
- [ ] Add Redis client if not exists
- [ ] Replace in-memory Map with Redis INCR/EXPIRE
- [ ] Add cleanup job for orphaned keys (optional)

---

### TIGER 2: Race Condition in Token Submission

**Risk:** Check-then-act allows duplicate submissions
**File:** `src/server/functions/csat-responses.ts:612-638`
**Impact:** Same token can be used twice with concurrent requests

**Mitigation:**
```typescript
// CURRENT (unsafe):
const existing = await db.query...;
if (existing.tokenUsedAt) throw new Error("Already used");
await db.update(csatResponses).set({ tokenUsedAt: new Date() });

// FIXED (atomic):
const [updated] = await db
  .update(csatResponses)
  .set({
    rating: data.rating,
    feedback: data.feedback,
    tokenUsedAt: new Date(),
    submittedAt: new Date(),
  })
  .where(
    and(
      eq(csatResponses.token, data.token),
      isNull(csatResponses.tokenUsedAt), // Only update if not used
      gt(csatResponses.tokenExpiresAt, new Date()) // And not expired
    )
  )
  .returning();

if (!updated) {
  // Either already used or expired
  const existing = await db.query...; // Check which
  if (existing?.tokenUsedAt) throw new Error("Already submitted");
  throw new Error("Token expired or invalid");
}
```

**Tasks:**
- [ ] Refactor `submitPublicFeedback` to use atomic UPDATE...WHERE pattern
- [ ] Add test for concurrent submission scenario

---

### TIGER 3: TypeScript Type Safety

**Risk:** `any` and `as never` assertions hide runtime errors
**Files:** Multiple components

**Mitigation:**
```typescript
// 1. Define API response type (issues-board.tsx)
interface IssueWithSlaMetrics {
  id: string;
  issueNumber: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "on_hold" | "resolved" | "closed";
  type: string;
  customer: { name: string } | null;
  assignedTo: { name: string | null; email: string } | null;
  createdAt: string;
  slaStatus?: "on_track" | "at_risk" | "breached" | null;
  slaResponseDue?: string | null;
  slaResolutionDue?: string | null;
}

// Replace: (issue: any) => ({...})
// With: (issue: IssueWithSlaMetrics) => ({...})

// 2. Remove 'as never' from zodResolver (kb-category-form-dialog.tsx)
// The resolver type mismatch is usually from mismatched zod/react-hook-form versions
// Fix: Ensure zod and @hookform/resolvers are compatible versions

// 3. Define action value types (issues-board.tsx)
type IssuePriority = "low" | "medium" | "high" | "critical";
type IssueStatus = "open" | "in_progress" | "on_hold" | "resolved" | "closed";

// Replace: event.value as any
// With: event.value as IssuePriority (or IssueStatus)
```

**Tasks:**
- [ ] Create `src/lib/types/support.ts` with shared types
- [ ] Update `issues-board.tsx` to use typed API response
- [ ] Remove all `any` and `as never` assertions
- [ ] Ensure zod/react-hook-form version compatibility

---

## Priority 2: MEDIUM Severity Tigers

### TIGER 4: API Response Structure Inconsistency

**Risk:** Support uses different response shape than other domains
**Files:** All list functions in Support domain

**Mitigation:**
```typescript
// CURRENT:
return {
  data: results.map(toArticleResponse),
  pagination: { page, pageSize, totalCount, totalPages }
};

// STANDARDIZED:
return {
  items: results.map(toArticleResponse),
  pagination: { page, pageSize, totalItems, totalPages }
};
```

**Tasks:**
- [ ] Update `knowledge-base.ts` listArticles response
- [ ] Update `csat-responses.ts` listFeedback response
- [ ] Update `issue-templates.ts` listIssueTemplates response
- [ ] Update corresponding Zod response schemas
- [ ] Update frontend hooks to use new structure

---

### TIGER 5: ILIKE Search Vulnerability

**Risk:** Special chars in search can cause slow queries
**File:** `src/server/functions/knowledge-base.ts:391`

**Mitigation:**
```typescript
// Add escape helper
function escapeLikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

// Use in search
if (data.search) {
  const escapedSearch = escapeLikePattern(data.search);
  conditions.push(
    sql`(${kbArticles.title} ILIKE ${`%${escapedSearch}%`} ESCAPE '\\'
     OR ${kbArticles.content} ILIKE ${`%${escapedSearch}%`} ESCAPE '\\')`
  );
}
```

**Tasks:**
- [ ] Create `escapeLikePattern` utility in `src/lib/utils.ts`
- [ ] Apply to all ILIKE searches in Support domain
- [ ] Add test for special character search

---

## Priority 3: Elephants (Should Address)

### ELEPHANT 1: No Bulk Update Function

**Current:** Sequential API calls for bulk actions
**File:** `src/routes/_authenticated/support/issues-board.tsx:204-224`

**Mitigation:**
```typescript
// New server function: src/server/functions/issues.ts
export const bulkUpdateIssues = createServerFn({ method: "POST" })
  .inputValidator(bulkUpdateIssuesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return db.transaction(async (tx) => {
      const results = await Promise.all(
        data.updates.map(async (update) => {
          const [updated] = await tx
            .update(issues)
            .set({
              ...update.changes,
              updatedBy: ctx.user.id,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(issues.id, update.issueId),
                eq(issues.organizationId, ctx.organizationId)
              )
            )
            .returning({ id: issues.id });
          return updated;
        })
      );
      return { updated: results.length };
    });
  });
```

**Tasks:**
- [ ] Create `bulkUpdateIssues` server function
- [ ] Create `bulkUpdateIssuesSchema` in schemas
- [ ] Update `issues-board.tsx` to use bulk endpoint
- [ ] Add `useBulkUpdateIssues` hook

---

### ELEPHANT 2: View Increment on Hover

**Current:** View count increments when popover opens
**File:** `src/components/domain/support/kb-suggested-articles.tsx:40-43`

**Mitigation:**
```typescript
// CURRENT (side effect on render):
const { data: fullArticle } = useKbArticle({
  articleId: article.id,
  incrementViews: true, // Fires on hover!
});

// FIXED (explicit action):
const { data: fullArticle } = useKbArticle({
  articleId: article.id,
  incrementViews: false, // Don't auto-increment
});

const incrementViewsMutation = useIncrementArticleViews();

// Only increment when user clicks "Read More" or spends time
const handleReadArticle = () => {
  incrementViewsMutation.mutate(article.id);
  // Navigate to full article
};
```

**Tasks:**
- [ ] Add separate `incrementArticleViews` server function
- [ ] Remove `incrementViews: true` from preview hooks
- [ ] Add view tracking on explicit read action only

---

### ELEPHANT 3: Missing Keyboard Accessibility

**Current:** Clickable divs without keyboard handlers
**Files:** `kb-category-tree.tsx:137`, `kb-popular-articles.tsx:30`

**Mitigation:**
```typescript
// CURRENT:
<div onClick={() => onSelect?.(node)}>

// FIXED:
<button
  type="button"
  className={cn("w-full text-left", ...)}
  onClick={() => onSelect?.(node)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(node);
    }
  }}
  aria-selected={isSelected}
  role="treeitem"
>
```

**Tasks:**
- [ ] Replace clickable divs with buttons in `kb-category-tree.tsx`
- [ ] Add keyboard handlers to `kb-popular-articles.tsx`
- [ ] Add appropriate ARIA roles (treeitem, tree, etc.)
- [ ] Test with keyboard-only navigation

---

## Implementation Order

### Phase 1: Critical Security (Before Production)
1. Fix race condition in token submission
2. Replace in-memory rate limiting with Redis

### Phase 2: Type Safety (Before Code Review)
3. Remove all `any` and `as never` assertions
4. Add proper TypeScript interfaces

### Phase 3: Consistency (Before Merge)
5. Standardize API response structure
6. Escape ILIKE patterns

### Phase 4: Polish (Follow-up PR)
7. Add bulk update endpoint
8. Fix view tracking logic
9. Add keyboard accessibility

---

## Risk Mitigations Summary

| Tiger | Severity | Mitigation | Phase |
|-------|----------|------------|-------|
| Rate limiting | HIGH | Redis-based solution | 1 |
| Race condition | HIGH | Atomic UPDATE...WHERE | 1 |
| Type safety | HIGH | Proper interfaces | 2 |
| API consistency | MEDIUM | Standardize response | 3 |
| ILIKE injection | MEDIUM | Escape special chars | 3 |

| Elephant | Mitigation | Phase |
|----------|------------|-------|
| No bulk update | New server function | 4 |
| View on hover | Explicit action | 4 |
| Keyboard a11y | Button + ARIA | 4 |

---

## Premortem Metadata

- **Date:** 2026-01-18
- **Mode:** Deep (multi-agent)
- **Tigers Found:** 5
- **Elephants Found:** 3
- **Paper Tigers:** 3 (verified safe)
- **Agents Used:** scout, critic, code-reviewer, liaison
