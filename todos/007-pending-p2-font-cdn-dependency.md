---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, performance, reliability, sprint-review]
dependencies: []
---

# Font Loading from External CDN

## Problem Statement

Fonts are loaded from Google Fonts CDN on every PDF render (if not cached). This adds 100-500ms latency on cold starts and creates an external dependency that could fail.

## Findings

**Source:** Performance Oracle Agent

**Current Implementation (fonts.ts):**
```typescript
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/...", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v12/...", fontWeight: 500 },
    // ...4 font weights total
  ],
});
```

**Impact:**
- 4 HTTP requests per cold render
- 80-200KB network transfer
- CDN failure = document generation failure
- 100-500ms latency on cold starts

## Proposed Solutions

### Option A: Bundle fonts locally (Recommended)
**Pros:** Eliminates CDN dependency, faster cold starts
**Cons:** Larger bundle size (~200KB)
**Effort:** Small (2 hours)
**Risk:** Low

```typescript
import path from 'path';

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(__dirname, '../../../public/fonts/Inter-Regular.ttf'), fontWeight: 400 },
    // ...
  ],
});
```

### Option B: Pre-warm fonts on startup
**Pros:** Keeps CDN, reduces cold start impact
**Cons:** Still has external dependency
**Effort:** Medium (3 hours)
**Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**File:** `src/lib/documents/fonts.ts`
**Font:** Inter (4 weights: 400, 500, 600, 700)
**Size:** ~50KB per weight = ~200KB total

## Acceptance Criteria

- [ ] Fonts bundled locally in public/fonts/
- [ ] No external HTTP requests during PDF generation
- [ ] Cold start latency reduced
- [ ] PDF renders correctly with bundled fonts

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Font files: https://fonts.google.com/specimen/Inter
- React-PDF fonts: https://react-pdf.org/fonts
