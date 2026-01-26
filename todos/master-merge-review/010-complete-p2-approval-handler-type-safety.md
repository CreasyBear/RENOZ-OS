---
status: complete
priority: p2
issue_id: "MMR-010"
tags: [architecture, type-safety, ai-infrastructure]
dependencies: []
---

# Approval Handler Type Safety Risks

## Problem Statement

The AI approval handler has type safety gaps that could lead to runtime errors when processing approval payloads.

## Findings

- **Location:** AI approval handling code
- **Issue:** Payload types not fully validated at runtime
- **Risk:** Runtime errors on malformed approval data
- **Severity:** P2 HIGH - Could cause AI agent failures

## Proposed Solutions

### Option 1: Add Zod Runtime Validation (Recommended)

**Approach:** Add Zod schema validation for all approval payloads.

**Pros:**
- Runtime type safety
- Consistent with project patterns
- Good error messages

**Cons:**
- Slight performance overhead
- Need to maintain schemas

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: TypeScript Strict Mode

**Approach:** Enable stricter TypeScript settings to catch more issues at compile time.

**Pros:**
- Catches issues earlier
- No runtime overhead

**Cons:**
- Doesn't help with external data
- May require other fixes

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Pattern to implement:**
```typescript
import { z } from 'zod';

const approvalPayloadSchema = z.object({
  taskId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  context: z.record(z.unknown()),
});

export function handleApproval(rawPayload: unknown) {
  const payload = approvalPayloadSchema.parse(rawPayload);
  // Now type-safe
}
```

## Resources

- **Review Agent:** Architecture Strategist
- **Zod Documentation:** https://zod.dev

## Acceptance Criteria

- [x] All approval payloads validated with Zod
- [x] Invalid payloads return clear error messages
- [x] Type inference works correctly
- [x] No runtime type errors in approval flow

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Architecture Strategist Agent

**Actions:**
- Identified type safety gaps in approval handler
- Assessed runtime error risk
- Recommended Zod validation

**Learnings:**
- External data always needs runtime validation
- TypeScript types alone don't protect at runtime

### 2026-01-26 - Implementation Complete

**By:** Claude Code

**Actions:**
- Added 5 Zod validation schemas to `src/lib/ai/approvals/handlers.ts`:
  - `orderDraftSchema` for create_order
  - `quoteDraftSchema` for create_quote
  - `emailDraftSchema` for send_email
  - `deleteActionSchema` for delete_record
  - `updateNotesSchema` for update_customer_notes
- Updated all 5 handlers to use `safeParse()` with clear error messages
- Validated TypeScript compiles without errors

**Learnings:**
- Using `.passthrough()` allows flexibility for additional fields
- `safeParse()` returns errors without throwing for graceful handling
