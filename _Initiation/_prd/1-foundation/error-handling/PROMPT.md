# Ralph Loop: Error Handling (CC-ERROR)

## Objective
Implement consistent error handling patterns across the Renoz application. Establish AppError class hierarchy, error boundary components, user-friendly error messages, error logging/reporting, and offline error handling. Ensure users understand what went wrong and what they can do about it.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CC-ERR-001.

## Context

### PRD File
- `opc/_Initiation/_prd/cross-cutting/error-handling.prd.json` - Complete error handling specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/1-foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Error Logging**: Sentry integration
- **State Management**: TanStack Query

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `./wireframes/CC-ERROR-*`
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

Execute stories in dependency order from error-handling.prd.json:

### Phase 1: Error Class Hierarchy and Boundaries
1. **CC-ERR-001** - AppError Class Hierarchy and Custom Error Types
   - Wireframes: `CC-ERROR-001a.wireframe.md`
   - Dependencies: Foundation
   - Creates: AppError base class, 10+ specific error types with proper inheritance
   - Promise: `CC_ERR_001_COMPLETE`

2. **CC-ERR-002** - Global Error Boundary Implementation
   - Wireframes: `CC-ERROR-002a.wireframe.md`
   - Dependencies: CC-ERR-001
   - Creates: Global error boundary, error fallback UI, error recovery actions
   - Promise: `CC_ERR_002_COMPLETE`

3. **CC-ERR-003** - Widget-Level and Auth Error Boundaries
   - Wireframes: `CC-ERROR-003a.wireframe.md`
   - Dependencies: CC-ERR-002
   - Creates: Widget error boundaries, auth error boundary with reset
   - Promise: `CC_ERR_003_COMPLETE`

### Phase 2: User-Friendly Error Messages and Display
4. **CC-ERR-004** - Error Message Formatting and Display
   - Wireframes: `CC-ERROR-004a.wireframe.md`
   - Dependencies: CC-ERR-001
   - Creates: formatError, formatValidationError functions, error message localization
   - Promise: `CC_ERR_004_COMPLETE`

5. **CC-ERR-005** - Form Error Display and Validation
   - Wireframes: `CC-ERROR-005a.wireframe.md`
   - Dependencies: CC-ERR-004
   - Creates: Form error field mapping, inline error display, error summary component
   - Promise: `CC_ERR_005_COMPLETE`

6. **CC-ERR-006** - Toast and Toast-Style Error Notifications
   - Wireframes: `CC-ERROR-006a.wireframe.md`
   - Dependencies: CC-ERR-004
   - Creates: Error toast component, dismissable error notifications, error action buttons
   - Promise: `CC_ERR_006_COMPLETE`

### Phase 3: Error Logging and Recovery
7. **CC-ERR-007** - Error Logging and Sentry Integration
   - Wireframes: `CC-ERROR-007a.wireframe.md`
   - Dependencies: CC-ERR-001
   - Creates: Error logging utility, Sentry initialization, error context tracking
   - Promise: `CC_ERR_007_COMPLETE`

8. **CC-ERR-008** - Retry Logic and Error Recovery
   - Wireframes: `CC-ERROR-008a.wireframe.md`
   - Dependencies: CC-ERR-001, CC-ERR-006
   - Creates: Retry mechanism with exponential backoff, retry UI feedback, resilience manager
   - Promise: `CC_ERR_008_COMPLETE`

### Phase 4: Advanced Error Handling
9. **CC-ERR-009** - Offline Detection and Offline Error Handling
   - Wireframes: `CC-ERROR-009a.wireframe.md`
   - Dependencies: CC-ERR-001, CC-ERR-006
   - Creates: Offline detection hook, offline queue management, offline sync logic
   - Promise: `CC_ERR_009_COMPLETE`

10. **CC-ERR-010** - Error Analytics and Monitoring
    - Dependencies: CC-ERR-007
    - Creates: Error metrics, error reporting dashboard, monitoring integration
    - Promise: `CC_ERR_010_COMPLETE`

## Wireframe References

All error handling wireframes follow the naming pattern `CC-ERROR-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| CC-ERROR-001a | CC-ERR-001 | Error class hierarchy and types |
| CC-ERROR-002a | CC-ERR-002 | Global error boundary fallback UI |
| CC-ERROR-003a | CC-ERR-003 | Widget and auth error boundaries |
| CC-ERROR-004a | CC-ERR-004 | Error message formatting and display |
| CC-ERROR-005a | CC-ERR-005 | Form error display patterns |
| CC-ERROR-006a | CC-ERR-006 | Toast-style error notifications |
| CC-ERROR-007a | CC-ERR-007 | Error logging UI and context |
| CC-ERROR-008a | CC-ERR-008 | Retry progress and recovery UI |
| CC-ERROR-009a | CC-ERR-009 | Offline detection and sync UI |

Wireframes are located in: `./wireframes/`

## Completion Promise

When ALL error handling stories pass successfully:
```xml
<promise>CC_ERROR_HANDLING_COMPLETE</promise>
```

## Constraints

### DO
- Follow AppError hierarchy patterns (never throw generic Error)
- Implement all custom error types with meaningful context
- Create user-friendly messages for each error type
- Use error boundaries at global, auth, and widget levels
- Log all errors with context (user, action, timestamp)
- Implement retry mechanisms with exponential backoff
- Handle offline scenarios gracefully
- Use TanStack Query retry configuration
- Test error scenarios with manual and automated tests
- Follow Sentry integration patterns

### DO NOT
- Expose technical error details to users (sanitize messages)
- Use generic error messages (be specific about what failed)
- Forget to handle error boundary fallback states
- Skip offline error handling
- Use synchronous try/catch for async operations
- Create unhandled promise rejections
- Log sensitive data in error context
- Repeat error handling logic (create reusable utilities)

## File Structure

Error handling pattern files follow this structure:

```
renoz-v3/
├── src/
│   ├── server/
│   │   ├── errors.ts (AppError hierarchy)
│   │   └── error-logging.ts (Sentry integration)
│   ├── lib/
│   │   ├── error/
│   │   │   ├── helpers.ts (formatError, formatValidationError)
│   │   │   ├── hooks/
│   │   │   │   ├── use-error-handler.ts
│   │   │   │   ├── use-offline-detection.ts
│   │   │   │   └── use-retry.ts
│   │   │   └── types.ts (error type definitions)
│   │   └── constants/
│   │       └── error-messages.ts
│   ├── components/
│   │   └── shared/
│   │       ├── error-boundary.tsx
│   │       ├── widget-error-boundary.tsx
│   │       ├── auth-error-boundary.tsx
│   │       ├── error-toast.tsx
│   │       ├── error-summary.tsx
│   │       ├── retry-button.tsx
│   │       └── offline-indicator.tsx
│   └── routes/
│       └── _authed/
│           └── error-log/
│               └── index.tsx
```

## Key Success Metrics

- All errors inherit from AppError base class
- Global, widget, and auth error boundaries functional
- Error messages are user-friendly and actionable
- All errors logged with proper context
- Retry mechanisms work with exponential backoff
- Offline errors handled gracefully
- Zero unhandled errors in production
- Error recovery flows complete successfully
- TypeScript errors < 5
- All tests passing

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Error boundary not catching → Check error boundary scope and component tree
  - Retry not working → Verify TanStack Query retry config and timeout values
  - Offline detection → Check navigator.onLine API and network event listeners
  - Error logging → Verify Sentry initialization and API key configuration
  - Message formatting → Check error type matching in formatError function

## Progress Template

```markdown
# Error Handling (CC-ERROR) Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] CC-ERR-001: AppError Class Hierarchy and Custom Error Types
- [ ] CC-ERR-002: Global Error Boundary Implementation
- [ ] CC-ERR-003: Widget-Level and Auth Error Boundaries
- [ ] CC-ERR-004: Error Message Formatting and Display
- [ ] CC-ERR-005: Form Error Display and Validation
- [ ] CC-ERR-006: Toast and Toast-Style Error Notifications
- [ ] CC-ERR-007: Error Logging and Sentry Integration
- [ ] CC-ERR-008: Retry Logic and Error Recovery
- [ ] CC-ERR-009: Offline Detection and Offline Error Handling
- [ ] CC-ERR-010: Error Analytics and Monitoring

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
**Target:** renoz-v3 Error Handling (CC-ERROR)
**Completion Promise:** CC_ERROR_HANDLING_COMPLETE
