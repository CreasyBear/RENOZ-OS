# Products Maintainer Sprint 15

## Status

Closed in commit-ready state.

## Issue 1: Product Mutation Unsafe-Message Classifier

### Problem

The product mutation formatter already owned catalogue, pricing, image, attribute, bundle, and import feedback copy, but its unsafe-message classifier only blocked a narrow set of infrastructure terms. HTTP-shaped backend failures could still expose JavaScript runtime errors, SQL parser text, undefined/null property access, or stack-frame-shaped messages when a server returned those details as validation-like copy.

### Workflow Spine

Product mutation feedback workflow
-> products route/dialog/component action
-> product hook or product-owned form submitter
-> product mutation formatter
-> product server function/schema/database failure
-> toast, form summary, import feedback, or dialog error copy
-> query key/cache policy unchanged.

### Touched Domains

- Products mutation feedback helpers.
- Products formatter contract tests.
- Products maintainer closeout docs.

### Business Value Protected

Product catalogue and SKU workflows sit near ordering, inventory, warranty, and support. Operators need product action failures to stay recoverable without seeing backend implementation details, especially during catalogue setup, CSV import, image management, pricing maintenance, bundle assembly, and battery attribute updates.

### Scope Constraints

- Do not change product server functions, schemas, database writes, query keys, invalidation, route layout, dialog behavior, CSV parsing, import result rows, image storage behavior, pricing semantics, bundle semantics, inventory behavior, or finance behavior.
- Keep safe validation and permission guidance available.
- Change only the product-domain unsafe-message classifier and focused contract coverage.
- Browser QA is skipped because this is pure copy classification with no intended layout, navigation, or interaction change.

### Changes

- Exported the product unsafe-message classifier as `isUnsafeProductMutationMessage`.
- Expanded the classifier to suppress SQL-shaped, JavaScript runtime-shaped, undefined/null property access, `not a function`, and stack-frame-shaped messages.
- Kept existing infrastructure suppression for API keys, secrets, duplicate keys, constraints, Supabase/Postgres/database text, stack text, tokens, and internal server errors.
- Added focused coverage proving the shared classifier protects core catalogue, import preview, pricing, images, attributes, and bundles.

### Standards Checked

- Domain ownership: product mutation feedback remains owned by `src/hooks/products/product-mutation-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the product-owned formatter boundary after existing failures reach the client.
- Query/cache policy: unchanged. No query key, invalidation, optimistic update, or cache lifetime behavior changed.
- Tenant isolation/data integrity: unchanged. No tenant predicate, organization scope, product write, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Operator-facing mutation feedback falls back to product-owned recovery copy when server text looks implementation-shaped, while safe validation and permission copy still flows.
- Reviewability: the diff is limited to one formatter helper, one focused test file, and this closeout note.

### Smells Removed

- Product unsafe-message classifier lagging behind stronger customer/support/report classifiers.
- Missing product-domain regression coverage for SQL parser text, JavaScript runtime errors, undefined/null property access, `not a function`, and stack-frame-shaped messages.

### Deferred

- Deeper extraction into a shared cross-domain unsafe-message utility remains deferred because current domains have slightly different provider terms and fallback policies.
- Live backend fixtures for every product mutation error shape remain future hardening.
- Browser QA was not run because this slice changes pure formatter behavior with no intended UI layout or route interaction change.

### Gates

- Passed: focused product mutation feedback tests, `./node_modules/.bin/vitest run tests/unit/products/product-core-mutation-errors.test.ts tests/unit/products/product-pricing-mutation-errors.test.ts tests/unit/products/product-image-mutation-errors.test.ts tests/unit/products/product-attribute-mutation-errors.test.ts tests/unit/products/product-bundle-mutation-errors.test.ts tests/unit/products/product-import-feedback-errors.test.ts` - 6 files, 18 tests.
- Passed: broader products suite, `./node_modules/.bin/vitest run tests/unit/products` - 19 files, 39 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader products suite still emits the existing `--localstorage-file` jsdom warning and existing `useRouter` warning in `query-normalization-wave5b`; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended visual or route interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, or cross-domain contracts beyond the product formatter; typecheck, lint, focused formatter coverage, and the full products suite covered the risk.

### Goal Adaptation

Accepted runtime correction: retired serialized gates are not listed as routine skipped evidence for unrelated slices. Declined changing the standing product-owner goal because serialized lineage continuity remains a battery OEM domain invariant when a slice actually touches serial identity, movement, warranty/RMA continuity, or repair work.

### Residual Risk

Low for product mutation feedback copy. Remaining product-domain risk is live backend fixture coverage for uncommon server error shapes and the possibility that future domains duplicate unsafe-message policy instead of converging intentionally.
