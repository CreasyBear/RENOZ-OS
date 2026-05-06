# Products Maintainer Sprint 14

## Status

Closed in commit-ready state.

## Issue 1: Product Import Result-Row Error Copy

### Problem

Product import row failures were returned from the server with raw caught exception messages. Those messages flow into import result tables and can expose database, constraint, stack, or implementation details when an individual CSV row fails.

### Workflow Spine

Product import result workflow
-> products import route and bulk import dialog
-> import products hook
-> product bulk import server function
-> product/category database writes
-> import result row payload
-> operator-visible result table copy.

### Touched Domains

- Products bulk import server function.
- Products import result-row error tests.
- Products maintainer closeout docs.

### Business Value Protected

CSV import should help RENOZ onboard and maintain battery SKUs quickly without leaking backend details in row-level result tables. Operators need safe recovery guidance for failed rows while successful, skipped, created, and updated rows keep their existing semantics.

### Scope Constraints

- Do not change CSV parsing, validation schemas, import modes, category lookup/creation, product create/update writes, query invalidation, route/dialog layout, or import result table structure.
- Keep create/update/skipped result messages unchanged.
- Change only server failure copy for per-row import errors and batch-stop validation copy.
- Browser QA is skipped because this is server-returned copy with no intended layout or route interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added one product import row failure message constant.
- Replaced raw caught import row exception messages with the safe row failure message.
- Replaced batch-stop validation copy with safe row failure copy when `skipErrors` is false.
- Added a focused source contract for product import result-row error messages.

### Standards Checked

- Domain ownership: import result-row failure copy now belongs to the product import server function instead of leaking raw caught exceptions.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only server-returned failure copy after existing import logic.
- Query/cache policy: unchanged. Import hook invalidation remains untouched.
- Tenant isolation/data integrity: unchanged. No tenant predicate, category/product write, import transaction behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Result tables receive safe row failure copy while still identifying failed row and SKU.
- Reviewability: the diff is limited to one server function constant/catch block, one focused source contract, and this closeout note.

### Smells Removed

- Raw caught import row exception messages in result payloads.
- Raw caught import row exception messages in batch-stop validation errors.
- Missing source contract that import result rows stay operator-safe.

### Deferred

- Live database integration coverage for row-level import failures remains future hardening.
- Import transaction semantics and partial-success policy were not changed.
- Browser QA was not run because this is server-returned copy with no intended layout change.

### Gates

- Passed: focused product import result-row and import feedback tests, `./node_modules/.bin/vitest run tests/unit/products/product-import-result-row-errors.test.ts tests/unit/products/product-import-feedback-errors.test.ts` - 2 files, 3 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 19 files, 38 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is server-returned failure copy with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, production release paths, serialized lineage, or inventory identity contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, domain ownership, reviewable diffs, query/cache contracts, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence for unrelated product import result feedback work.

### Residual Risk

Low for product import result-row failure copy. Remaining product-domain risk is live integration coverage for import failure fixtures and deeper runtime/data-integrity coverage outside this error-feedback series.
