# Implementation Report: Pattern References in Role PRDs
Generated: 2026-01-17

## Task
Add explicit references to pattern files (error-recovery.md, testing-standards.md, performance-benchmarks.md, ux-3-click-rule.md) in all 4 role PRD JSON files and PROMPT.md files.

## Summary

Added pattern references to 8 files across 4 roles:
- Sales
- Field Tech (with extra error-recovery.md reference for offline sync)
- Operations
- Finance

## Changes Made

### JSON Files (4 files)

Each JSON file received a new `pattern_references` array at the end:

**1. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/sales.prd.json`**
- Added `pattern_references` array with 3 entries: testing-standards, ux-3-click-rule, performance-benchmarks

**2. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/field-tech.prd.json`**
- Added `pattern_references` array with 4 entries: testing-standards, ux-3-click-rule, performance-benchmarks, error-recovery
- Extra error-recovery.md reference applies to "offline sync stories"

**3. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/operations.prd.json`**
- Added `pattern_references` array with 3 entries: testing-standards, ux-3-click-rule, performance-benchmarks

**4. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/finance.prd.json`**
- Added `pattern_references` array with 3 entries: testing-standards, ux-3-click-rule, performance-benchmarks

### PROMPT.md Files (4 files)

Each PROMPT.md file received a new "Required Reading" section after the Objective:

**1. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/sales/PROMPT.md`**
- Added Required Reading table with 3 patterns

**2. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/field-tech/PROMPT.md`**
- Added Required Reading table with 4 patterns (includes error-recovery for offline sync)

**3. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/operations/PROMPT.md`**
- Added Required Reading table with 3 patterns

**4. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/4-roles/finance/PROMPT.md`**
- Added Required Reading table with 3 patterns

## Pattern Reference Structure

### JSON Format
```json
"pattern_references": [
  {
    "file": "_Initiation/_meta/patterns/testing-standards.md",
    "applies_to": "all stories",
    "reason": "All stories must follow testing standards"
  },
  {
    "file": "_Initiation/_meta/patterns/ux-3-click-rule.md",
    "applies_to": "ui layer stories",
    "reason": "UI must comply with 3-click rule"
  },
  {
    "file": "_Initiation/_meta/patterns/performance-benchmarks.md",
    "applies_to": "server and ui stories",
    "reason": "Must meet response time targets"
  }
]
```

### PROMPT.md Format
```markdown
## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_meta/patterns/testing-standards.md` | All stories |
| 3-Click Rule | `_meta/patterns/ux-3-click-rule.md` | UI stories - verify click counts |
| Performance | `_meta/patterns/performance-benchmarks.md` | API endpoints - verify response times |

**IMPORTANT**: Pattern compliance is part of acceptance criteria.
```

## Notes
- Field-tech role has the additional error-recovery.md reference for offline conflict patterns
- All paths use relative format from `_Initiation/` directory
- Pattern compliance is marked as part of acceptance criteria in PROMPT.md files
