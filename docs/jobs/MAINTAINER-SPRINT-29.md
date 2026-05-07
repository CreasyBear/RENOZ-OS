# Jobs Maintainer Sprint 29: Scheduling Priority Honesty

## Status

Closed in commit-ready state.

## Issue 1: Scheduling DTOs Exposed Invented Priority

### Problem

Jobs timeline and calendar-kanban DTOs returned `priority: 'medium'` even though `job_assignments` has no priority field and current scheduling UI does not consume that value. This made the API contract less honest and could mislead future UI work into treating fake priority as real domain state.

### Workflow Spine

Schedule/timeline route
-> scheduling hooks
-> `listTimelineJobs` / `listCalendarTasksForKanban`
-> `job_assignments`
-> timeline/calendar DTOs
-> query key cache.

### Touched Domains

- Jobs scheduling server functions.
- Jobs scheduling DTO schemas.
- Jobs scheduling source contracts.
- Jobs maintainer closeout docs.

### Business Value Protected

Scheduling should show real operational state. RENOZ operators should not see or build decisions on a priority signal that the field-work assignment model does not actually store.

### Scope Constraints

- Do not add a priority column to `job_assignments`.
- Do not invent derived priority rules.
- Do not change query keys, cache behavior, scheduling UI layout, or mutation paths.
- Keep the change to unused scheduling DTO fields.

### Changes

- Removed `priority` from `TimelineJobItem`.
- Removed `priority` from `CalendarKanbanTask`.
- Removed hardcoded `priority: 'medium'` from timeline and calendar-kanban server responses.
- Removed fake priority round-tripping from scheduling job view model mappers.
- Added a focused source contract that rejects fake priority values and stale priority TODO copy.

### Standards Checked

- Domain ownership: scheduling DTOs now reflect the actual Jobs assignment model.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server/schema contract cleaned; hooks/cache unchanged.
- Tenant isolation/data integrity: not touched.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: avoids exposing fake priority state to scheduling consumers.
- Reviewability: two DTO interfaces, two server return objects, mapper cleanup, one focused test, one closeout doc.

### Smells Removed

- Hardcoded timeline `priority: 'medium'`.
- Hardcoded calendar-kanban `priority: 'medium'`.
- Stale comments explaining that the returned priority did not exist in the database.

### Deferred

- A real assignment priority model remains future product work if operators need priority in scheduling.
- Job materials inventory reservation integration remains separate.
- Browser QA was not selected because this removes unused DTO fields with no intended layout change.

### Gates

- Passed: focused Jobs scheduling priority contract.
- Passed: focused ESLint on touched Jobs scheduling files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This follows the standing maintainer goal; serialized gates remain retired from routine closeout evidence.

### Residual Risk

Low. Current in-repo scheduling consumers do not read the removed priority fields; typecheck covers internal consumers.
