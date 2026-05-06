# Operations Maintainer Sprint 85: Project Number Race Handling

## Status

Closed in commit-ready state.

## Issue 1: Project Creation Generated A Single Project Number Before Insert

### Problem

`createProject` generated `PRJ-XXXX` once before inserting the project. If concurrent project creation selected the same next number, the database unique index would reject the insert with a raw unique-constraint failure. That is a production reliability smell in an operator workflow that should either succeed on a retry or fail with typed, operator-safe feedback.

### Workflow Spine

Project create dialog
-> `useCreateProject`
-> `createProject`
-> customer/order relation validation
-> project number generation
-> atomic `projects` + owner `project_members` insert
-> project list/detail/customer cache invalidation
-> formatted operator-safe mutation feedback.

### Touched Domains

- Jobs project create server function.
- Project number generation helper.
- Project numbering source-contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Project creation is the start of an operational work container. Operators should not lose a create action to a transient number collision, and RENOZ should not expose raw database errors when project numbers collide under concurrent use.

### Scope Constraints

- Do not change visible project number format.
- Do not change the project create form UI or payload schema.
- Do not change customer/order relation validation from Sprint 84.
- Do not change query keys or cache invalidation behavior.
- Do not change database indexes or introduce a sequence table in this slice.
- Do not reopen serialized gates for this non-serialized project creation slice.

### Changes

- Added `MAX_PROJECT_NUMBER_RETRIES = 5`.
- Added a narrow Postgres unique-violation guard for error code `23505`.
- Extracted project insertion into `createProjectWithUniqueNumber`.
- Moved number generation into the retry loop.
- Preserved the atomic transaction that inserts both `projects` and creator `project_members`.
- Added an attempt offset to `generateProjectNumber` so immediate retries advance the candidate number.
- Added a typed `ConflictError` if all project number retries are exhausted.
- Added `project-numbering-contract.test.ts`.

### Standards Checked

- Domain ownership: project number generation and create retry behavior remain server-owned in the projects server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked create dialog hook path, create server function, project number unique index, project/member transaction, and existing cache invalidation.
- Tenant isolation/data integrity: preserved. Customer/order scope validation still runs before number generation, and inserts still use `ctx.organizationId`.
- Safe mutation/cache contracts: preserved. `useCreateProject` cache invalidation behavior was not changed.
- Honest UI states/operator-safe errors: improved. Exhausted number collisions now surface as typed conflict rather than raw database failure.
- Reviewability: the diff is bounded to project create numbering, one focused test, and this closeout.

### Smells Removed

- Single-shot project number generation before insert.
- Raw unique-constraint exposure risk on project number collision.
- No source contract protecting atomic project/member insert during numbering retries.

### Deferred

- A database-backed counter or sequence table remains out of scope.
- Number generation still considers deleted projects when picking the next sequence, which avoids reuse but remains a product policy decision.
- Existing historical number gaps are not backfilled.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-numbering-contract.test.ts tests/unit/jobs/project-create-relation-scope-contract.test.ts tests/unit/jobs/project-create-edit-mutation-contract.test.ts tests/unit/jobs/project-active-record-contract.test.ts tests/unit/jobs/project-actions-mutation-contract.test.ts tests/unit/jobs/project-members-mutation-contract.test.ts` - 6 files, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: serialized gates. They are retired as routine closeout evidence and this slice did not touch serialized lineage, inventory identity, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, tenant isolation, data-integrity implications, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for transient project number collisions. Medium for long-term numbering architecture if project volume or concurrency grows enough to justify a dedicated counter table or database sequence.
