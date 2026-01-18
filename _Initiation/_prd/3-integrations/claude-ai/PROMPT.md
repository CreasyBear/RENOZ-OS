# Ralph Loop: Claude AI Integration

## Objective
Implement comprehensive Claude AI assistant integration providing conversation persistence, context injection, scheduled reporting, usage analytics, custom personas, action auditing, and rate limit management across the CRM system.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with INT-AI-001.

## Context

### PRD File
- `opc/_Initiation/_prd/3-integrations/claude-ai/claude-ai.prd.json` - Complete Claude AI integration specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **State Management**: TanStack Query
- **External**: Anthropic Claude API, Trigger.dev for scheduled jobs

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `opc/_Initiation/_prd/_wireframes/integrations/INT-AI-*` (if available)
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

Execute stories in dependency order from claude-ai.prd.json:

### Phase 1: Core Features (INT-AI-CORE)
1. **INT-AI-001** - Add Conversation Persistence UI
   - Creates: Conversation history interface, storage integration
   - Promise: `INT_AI_001_COMPLETE`

2. **INT-AI-002** - Add Page Context Injection
   - Creates: Context provider, automatic data extraction
   - Promise: `INT_AI_002_COMPLETE`

3. **INT-AI-003** - Add Proactive AI Suggestions
   - Creates: Suggestion engine, notification UI
   - Promise: `INT_AI_003_COMPLETE`

### Phase 2: Reporting & Analytics (INT-AI-ANALYTICS)
4. **INT-AI-004-A** - Create AI Report Trigger.dev Job
   - Creates: Scheduled job infrastructure, report generation
   - Promise: `INT_AI_004_A_COMPLETE`

5. **INT-AI-004-B** - Create AI Reports UI and Scheduling
   - Creates: Reports dashboard, scheduling interface
   - Promise: `INT_AI_004_B_COMPLETE`

6. **INT-AI-005-A** - Create AI Usage Tracking Schema and Server
   - Creates: Usage logging schema, server functions
   - Promise: `INT_AI_005_A_COMPLETE`

7. **INT-AI-005-B** - Create AI Usage Dashboard
   - Creates: Analytics dashboard, cost tracking
   - Promise: `INT_AI_005_B_COMPLETE`

### Phase 3: Advanced Features (INT-AI-ADVANCED)
8. **INT-AI-006** - Add Custom AI Personas
   - Creates: Persona management, prompt templates
   - Promise: `INT_AI_006_COMPLETE`

9. **INT-AI-007-A** - AI Actions Audit Schema and Logging
   - Creates: Audit trail schema, logging functions
   - Promise: `INT_AI_007_A_COMPLETE`

10. **INT-AI-007-B** - AI Actions Audit UI
    - Creates: Audit dashboard, action history
    - Promise: `INT_AI_007_B_COMPLETE`

11. **INT-AI-008** - Add AI Rate Limit Management
    - Creates: Rate limiting logic, quota management
    - Promise: `INT_AI_008_COMPLETE`

## Wireframe References

Integration wireframes follow the naming pattern `INT-AI-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| INT-AI-001 | INT-AI-001 | Conversation persistence UI design |
| INT-AI-002 | INT-AI-002 | Context injection visualization |
| INT-AI-003 | INT-AI-003 | Suggestion interface |
| INT-AI-004 | INT-AI-004-B | Reports dashboard layout |
| INT-AI-005 | INT-AI-005-B | Usage analytics dashboard |
| INT-AI-006 | INT-AI-006 | Persona management interface |
| INT-AI-007 | INT-AI-007-B | Audit dashboard design |
| INT-AI-008 | INT-AI-008 | Rate limit management UI |

Wireframes are located in: `opc/_Initiation/_prd/_wireframes/integrations/`

## Completion Promise

When ALL Claude AI integration stories pass successfully:
```xml
<promise>INT_CLAUDE_COMPLETE</promise>
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
- Use Anthropic SDK for Claude API interactions
- Integrate with Trigger.dev for scheduled jobs

### DO NOT
- Modify files outside Claude AI integration scope
- Skip acceptance criteria from PRD
- Use client-side validation alone (always server-side)
- Create components that duplicate shadcn/ui
- Hardcode API keys or configuration values
- Create database tables without migrations
- Bypass RLS policies for performance

## File Structure

Claude AI integration files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── ai-conversations.ts
│   │   │   ├── ai-usage-logs.ts
│   │   │   ├── ai-audit-logs.ts
│   │   │   ├── ai-personas.ts
│   │   │   └── index.ts
│   │   └── server/
│   │       ├── functions/
│   │       │   ├── ai-conversations.ts
│   │       │   ├── ai-context.ts
│   │       │   ├── ai-suggestions.ts
│   │       │   ├── ai-reports.ts
│   │       │   ├── ai-usage.ts
│   │       │   ├── ai-personas.ts
│   │       │   ├── ai-audit.ts
│   │       │   ├── ai-rate-limits.ts
│   │       │   └── index.ts
│   │       └── schemas/
│   │           └── ai.ts
│   ├── contexts/
│   │   └── ai-context.tsx
│   ├── hooks/
│   │   ├── use-ai-conversations.ts
│   │   ├── use-ai-context.ts
│   │   ├── use-ai-suggestions.ts
│   │   └── use-ai-usage.ts
│   ├── components/
│   │   └── integrations/
│   │       └── ai/
│   │           ├── conversation-panel.tsx
│   │           ├── context-injector.tsx
│   │           ├── suggestion-widget.tsx
│   │           ├── reports-dashboard.tsx
│   │           ├── usage-analytics.tsx
│   │           ├── persona-manager.tsx
│   │           ├── audit-dashboard.tsx
│   │           ├── rate-limit-manager.tsx
│   │           └── ... (other components)
│   └── routes/
│       └── _authed/
│           └── ai/
│               ├── conversations.tsx
│               ├── reports.tsx
│               ├── usage.tsx
│               ├── personas.tsx
│               ├── audit.tsx
│               └── settings.tsx
└── drizzle/
    └── migrations/
        └── 020_ai-integration.ts
```

## Key Success Metrics

- Complete conversation persistence with history
- Context injection working across all domains
- Proactive suggestions generating correctly
- Scheduled reports executing on time
- Usage analytics tracking accurately
- Custom personas functioning properly
- Audit trail capturing all actions
- Rate limiting preventing API overages
- Zero TypeScript errors
- All tests passing
- Performance targets met:
  - Conversation load < 500ms
  - Context injection < 100ms
  - Suggestion generation < 2s
  - Report generation < 5s

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Anthropic API rate limits → Check rate limit management
  - Trigger.dev job scheduling → Verify job configuration
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - Context injection conflicts → Verify provider hierarchy
  - RLS policy conflicts → Verify policy SQL syntax

## Progress Template

```markdown
# Claude AI Integration Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] INT-AI-001: Add Conversation Persistence UI
- [ ] INT-AI-002: Add Page Context Injection
- [ ] INT-AI-003: Add Proactive AI Suggestions
- [ ] INT-AI-004-A: Create AI Report Trigger.dev Job
- [ ] INT-AI-004-B: Create AI Reports UI and Scheduling
- [ ] INT-AI-005-A: Create AI Usage Tracking Schema and Server
- [ ] INT-AI-005-B: Create AI Usage Dashboard
- [ ] INT-AI-006: Add Custom AI Personas
- [ ] INT-AI-007-A: AI Actions Audit Schema and Logging
- [ ] INT-AI-007-B: AI Actions Audit UI
- [ ] INT-AI-008: Add AI Rate Limit Management

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Claude AI Integration
**Completion Promise:** INT_CLAUDE_COMPLETE
