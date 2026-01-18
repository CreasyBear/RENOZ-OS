# Implementation Report: Add Pattern References to Foundation PRDs
Generated: 2026-01-17

## Task
Add explicit references to the pattern files in foundation PRD JSON files and PROMPT.md files.

## Summary

Added `pattern_references` arrays to 5 foundation PRD JSON files and "Required Reading" sections to their corresponding PROMPT.md files. This ensures implementers are aware of and follow the cross-cutting patterns for testing, error recovery, and performance.

## Pattern Files Referenced

| Pattern | Path | Purpose |
|---------|------|---------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | Story-level testing requirements, TDD flow |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | 5 patterns: sync failure, offline conflict, saga, email, payment |
| Performance Benchmarks | `_Initiation/_meta/patterns/performance-benchmarks.md` | Response time targets, data volume projections |

## Files Modified

### 1. Auth Foundation
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/auth/auth-foundation.prd.json`
  - Added `pattern_references` array with testing, error recovery, and performance patterns
  - Error recovery applies to server layer stories (FOUND-AUTH-005, 007b, 010)

- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/auth/PROMPT.md`
  - Added "Required Reading" section with pattern table

### 2. Schema Foundation
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/schema/schema-foundation.prd.json`
  - Added `pattern_references` array
  - Performance benchmarks critical for index design decisions

- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/schema/PROMPT.md`
  - Added "Required Reading" section

### 3. Notifications
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/notifications/notifications.prd.json`
  - Added `pattern_references` array
  - Error recovery Pattern 1 (retry with dead letter) applies to job progress stories

- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/notifications/PROMPT.md`
  - Added "Required Reading" section

### 4. Data Migration
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/data-migration/data-migration.prd.json`
  - Added `pattern_references` array
  - **CRITICAL**: Error recovery Pattern 3 (Saga with compensation) mandatory for all stories

- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/data-migration/PROMPT.md`
  - Added "Required Reading" section with extra emphasis on saga pattern for batch rollback

### 5. Realtime & Webhooks
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/realtime/realtime-webhooks-foundation.prd.json`
  - Added `pattern_references` array
  - Pattern 1 (Sync Failure Recovery) for webhook retries
  - Pattern 4 (Email Send Failure) for notification delivery

- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/1-foundation/realtime/PROMPT.md`
  - Added "Required Reading" section with specific pattern numbers

## JSON Schema for pattern_references

```json
"pattern_references": [
  {
    "file": "_Initiation/_meta/patterns/<pattern-file>.md",
    "applies_to": "<story IDs or 'all stories'>",
    "reason": "<why this pattern is relevant>"
  }
]
```

## PROMPT.md Required Reading Format

```markdown
## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_meta/patterns/testing-standards.md` | All stories - ... |
| Error Recovery | `_meta/patterns/error-recovery.md` | Server stories - ... |

**IMPORTANT**: Foundation code is used by all domains. Pattern compliance is mandatory.
```

## Pattern Applicability Summary

| PRD | Testing | Error Recovery Patterns | Performance |
|-----|---------|------------------------|-------------|
| Auth | All stories | Pattern 1 (server stories) | Auth operations critical path |
| Schema | All stories | Pattern 1 (server functions) | Index design, query times |
| Notifications | All stories | Pattern 1 (job progress) | Toast render non-blocking |
| Data Migration | All stories | **Pattern 3 (Saga) - CRITICAL** | Batch streaming |
| Realtime | All stories | Pattern 1 + 4 (webhooks) | Reconnection, Edge Function response |

## Notes

- Data migration PRD has the strongest emphasis on error recovery due to batch transaction rollback requirements
- Realtime/webhooks PRD specifically references Pattern 1 (exponential backoff) and Pattern 4 (email retry) by number
- All PRDs include the standard disclaimer: "Foundation code is used by all domains. Pattern compliance is mandatory."
