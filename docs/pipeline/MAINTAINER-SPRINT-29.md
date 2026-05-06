# Pipeline Maintainer Sprint 29

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Kanban Used a Broad Opportunity Schema Cast

### Problem

`PipelineKanbanContainer` cast opportunity list rows to the full `Opportunity` schema because the API metadata shape did not satisfy the schema metadata index signature. The board and list presenters only need a small opportunity row shape, so the cast hid a boundary mismatch instead of making the presenter contract explicit.

### Workflow Spine

Pipeline route
-> `PipelineKanbanContainer`
-> `useOpportunitiesKanban`
-> `listOpportunities`
-> opportunity list rows
-> board/list presenter DTO
-> kanban and table views.

### Touched Domains

- Pipeline kanban container.
- Pipeline board and list presenters.
- Pipeline opportunity presenter type.
- Pipeline source contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators need the Pipeline board and list to remain a reliable sales workflow surface. Removing the full-schema cast makes future list-row changes easier to review and reduces the chance that board/list rendering silently depends on detail-only fields.

### Scope Constraints

- Do not change opportunity server functions, schemas, database selects, filters, query keys, cache invalidation, mutation behavior, UI rendering, routing, or won/lost dialog behavior.
- Keep this as a type-boundary cleanup for the existing board/list row contract.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added `PipelineOpportunityItem` as the minimal presenter DTO for Pipeline board/list rows.
- Updated `PipelineBoard` and `PipelineListView` props and internal card/pending-transition types to use the presenter DTO.
- Replaced the container's `as Opportunity[]` cast with a direct `PipelineOpportunityItem[]` assignment from hook data.
- Added a source contract that keeps the board/list DTO explicit and blocks the broad `Opportunity[]` cast from returning.

### Standards Checked

- Domain ownership: board/list row shape is now owned in the Pipeline component domain instead of borrowing the full schema output type.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: container-to-presenter boundary improved; hook, server function, schema, database query, query key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, database write, inventory transaction, or finance path touched.
- Query/cache contract: unchanged; no query keys or invalidation behavior touched.
- Honest UI states/operator-safe errors: unchanged; read and mutation feedback stayed centralized from prior sprints.
- Reviewability: bounded diff across presenter types, two presenters, one container, one focused test, and this closeout.

### Smells Removed

- Broad `as Opportunity[]` cast in the Pipeline kanban container.
- Inline comment documenting an unresolved API/schema metadata mismatch at the presenter boundary.
- Board/list props requiring the full opportunity schema when they only render list-row fields.

### Deferred

- The upstream metadata type mismatch between API rows and `Opportunity` remains outside this slice because board/list should not require metadata.
- The Pipeline container still owns local retry invalidations and quick-dialog success invalidations; cache helper cleanup remains a separate cache-policy slice.
- Browser QA remains deferred because this source-covered slice changes type contracts, not visual layout or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-kanban-opportunity-type-contract.test.ts` - 1 file, 1 test.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for the removed `Opportunity[]` cast and stale cast comment.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. The user's latest direction confirms serialized gates are done and should not appear in routine closeout. The canonical goal/process docs already capture this, so no standing goal file change was needed.

### Residual Risk

Low for the Pipeline board/list type boundary. Moderate for the broader API/schema metadata mismatch because it remains real, but it is no longer forced onto presenters that do not use metadata.
