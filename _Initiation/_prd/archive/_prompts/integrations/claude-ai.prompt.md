# Task: Implement Claude AI Integration

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/integrations/claude-ai.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/int-claude-ai.progress.txt

## PRD ID
INT-CLAUDE-AI

## Phase
integrations

## Priority
3

## Dependencies
- Foundation PRDs complete

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Anthropic API key configured
# Check .env for ANTHROPIC_API_KEY
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/lib/ai/` | AI integration code |
| `src/server/functions/ai.ts` | AI server functions |
| Anthropic API docs | External API reference |

---

## AI Use Cases

- **Quote Generation**: AI-assisted quote content
- **Email Drafting**: AI-suggested email responses
- **Data Insights**: AI-powered analytics

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. Run `npm run typecheck` to verify
5. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
6. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Integration Guidelines

### DO
- Use streaming for long responses
- Provide context in prompts
- Handle rate limits
- Cache common responses
- Track token usage

### DON'T
- Send sensitive data unnecessarily
- Block UI on AI responses
- Skip error handling

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>INT_CLAUDE_AI_COMPLETE</promise>
```

---

*Integration PRD - Claude AI assistance*
