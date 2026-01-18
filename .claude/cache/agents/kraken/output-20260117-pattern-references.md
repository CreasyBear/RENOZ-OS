# Implementation Report: Pattern References Added to PRD Files
Generated: 2026-01-17

## Task
Add explicit references to 4 pattern files in all relevant PRD JSON files and PROMPT.md files:
- `_Initiation/_meta/patterns/error-recovery.md` - Error handling patterns
- `_Initiation/_meta/patterns/testing-standards.md` - Testing requirements
- `_Initiation/_meta/patterns/performance-benchmarks.md` - Performance targets
- `_Initiation/_meta/patterns/ux-3-click-rule.md` - UX friction standards

## Summary

Successfully added `pattern_references` arrays to 8 PRD JSON files and "Required Reading" sections to 8 PROMPT.md files. Pattern references were selectively applied based on story types (schema, server, UI).

## Changes Made

### PRD JSON Files (pattern_references array added)

| File | Patterns Applied |
|------|------------------|
| `2-domains/customers/customers.prd.json` | All 4 patterns |
| `2-domains/pipeline/pipeline.prd.json` | All 4 patterns |
| `2-domains/orders/orders.prd.json` | All 4 patterns |
| `2-domains/jobs/jobs.prd.json` | All 4 patterns |
| `3-integrations/xero.prd.json` | All 4 patterns (error-recovery marked PRIMARY) |
| `5-cross-domain/search/search.prd.json` | 3 patterns (no error-recovery - no server-heavy ops) |
| `5-cross-domain/portal/portal.prd.json` | All 4 patterns |
| `5-cross-domain/timeline/timeline.prd.json` | All 4 patterns |

### PROMPT.md Files (Required Reading section added)

| File | Location |
|------|----------|
| `2-domains/customers/PROMPT.md` | After "Current State", before "Context" |
| `2-domains/pipeline/PROMPT.md` | After "Current State", before "Context" |
| `2-domains/orders/PROMPT.md` | After "Current State", before "Context" |
| `2-domains/jobs/PROMPT.md` | After "Objective", before "Premortem Remediation" |
| `3-integrations/xero/PROMPT.md` | After "Current State", before "Context" |
| `5-cross-domain/search/PROMPT.md` | After "Current State", before "Context" |
| `5-cross-domain/portal/PROMPT.md` | After "Current State", before "Context" |
| `5-cross-domain/timeline/PROMPT.md` | After "Current State", before "Context" |

## Pattern Application Logic

### Testing Standards
- Applied to: ALL stories in all domains
- Reason: TDD flow, coverage expectations are universal

### Error Recovery
- Applied to: Server function stories, integration stories
- Specific patterns per domain:
  - **Xero**: Pattern 1 (Sync Failure) PRIMARY, Pattern 5 (Payment)
  - **Jobs**: Pattern 2 (Offline Conflict) for mobile time tracking
  - **Orders/Pipeline**: Pattern 3 (Saga) for multi-step workflows
  - **Portal**: Pattern 4 (Email) for magic links
  - **Timeline**: Pattern 4 (Email) for webhook handling

### Performance Benchmarks
- Applied to: API and UI stories
- Domain-specific targets referenced from existing success_criteria

### 3-Click Rule
- Applied to: UI stories only
- Role-specific shortcuts referenced:
  - Sales: Cmd+Q, Cmd+N, Cmd+L
  - Finance: Cmd+I, Cmd+P, Sync Now
  - Field Tech: FAB timer, swipe gestures
  - Operations: Swipe-to-pick, one-click PO

## Format Used

### PRD JSON (pattern_references array)
```json
"pattern_references": [
  {
    "file": "_Initiation/_meta/patterns/testing-standards.md",
    "applies_to": "all stories",
    "reason": "Description of why and what to implement"
  }
]
```

### PROMPT.md (Required Reading section)
```markdown
## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage |
```

## Notes

1. **xero.prd.json location**: Found at `3-integrations/xero.prd.json` (root level), not in subdirectory. Updated PROMPT.md to note correct path.

2. **Cross-domain files**: Located in `5-cross-domain/` not `4-cross-cutting/` as originally specified.

3. **Search domain**: Only 3 patterns applied (no error-recovery) since it has no external API integrations or complex multi-step workflows.

4. **Selective application**: Each domain's pattern_references are customized based on the story types present (schema, server, UI) rather than applying all patterns uniformly.
