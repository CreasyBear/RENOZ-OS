---
status: pending
priority: p1
issue_id: "002"
tags: [prd-review, routing, tanstack-start, ai-infrastructure]
dependencies: []
---

# Fix API Route Path Structure (TanStack Start)

## Problem Statement

The PRD proposes Next.js App Router (`src/app/api/`) routing structure, but this is a **TanStack Start** application that uses `src/routes/api/` for API endpoints.

This is a CRITICAL violation that would cause implementers to create files in the wrong location.

## Findings

**Source:** Pattern Recognition Specialist Agent

**Location:** `ai-infrastructure.prd.json` throughout, specifically stories AI-INFRA-011, AI-INFRA-013, AI-INFRA-015, AI-INFRA-016

**PRD specifies (WRONG):**
```
"src/app/api/ai/chat/route.ts"
"src/app/api/ai/agent/route.ts"
"src/app/api/ai/agent/[taskId]/status/route.ts"
"src/app/api/ai/approve/route.ts"
"src/app/api/ai/artifacts/[id]/route.ts"
```

**Should be (per existing patterns):**
```
"src/routes/api/ai/chat.ts"
"src/routes/api/ai/agent.ts"
"src/routes/api/ai/agent.$taskId.status.ts"
"src/routes/api/ai/approve.ts"
"src/routes/api/ai/artifacts.$id.ts"
```

**Evidence:** Existing routes use `src/routes/api/oauth/callback.ts`, `src/routes/api/webhooks/resend.ts`, `src/routes/api/track/click.$emailId.$linkId.ts`

## Proposed Solutions

### Option A: Update PRD to TanStack Start Paths (Recommended)
- **Pros:** Correct from the start, matches existing codebase
- **Cons:** None
- **Effort:** Small (20 minutes)
- **Risk:** Low

### Option B: Document as Implementation Note
- **Pros:** PRD unchanged
- **Cons:** Confusion, potential for mistakes
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

Option A - Update all file paths in the PRD to use TanStack Start conventions.

## Technical Details

**Path conversion rules:**
- `src/app/api/` → `src/routes/api/`
- `route.ts` suffix removed
- `[param]` → `$param`
- Nested folders → dot notation

**Affected stories:**
- AI-INFRA-011: agent route
- AI-INFRA-013: chat route
- AI-INFRA-015: approve route
- AI-INFRA-016: artifacts route

## Acceptance Criteria

- [ ] All `src/app/api/` paths changed to `src/routes/api/`
- [ ] All `[param]` changed to `$param`
- [ ] All `route.ts` suffixes removed
- [ ] Nested paths use dot notation (e.g., `agent.$taskId.status.ts`)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from PRD review | Pattern recognition agent identified routing convention violation |

## Resources

- Existing API routes in `src/routes/api/`
- TanStack Start file-based routing docs
