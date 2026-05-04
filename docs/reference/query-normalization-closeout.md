# Query Normalization Closeout

Normalization closeout memo for Waves `1` through `7`. This memo applies only to the normalization slice defined by the registry in `docs/reference/query-normalization-tracker.md`, the shared policy layer in `src/lib/read-path-policy.ts`, the read-path guard/baseline, and the focused wave suites.

## Disposition Policy

- Default rule: every file listed in the tracker with status `verified` is `keep`.
- Explicit overrides:
  - `tighten`: behavior is correct, but the artifact needed stronger process guardrails, docs, or program-level assertions.
  - `simplify`: behavior is correct, but the file had repeated or bespoke normalization structure that should collapse into the shared house pattern.

## What I Liked

- `src/lib/read-path-policy.ts`
  Strong abstraction boundary. `normalizeReadQueryError(...)`, `requireReadResult(...)`, and the explicit contract/failure taxonomy are the best part of the program and should remain the canonical read-path API.
- `docs/reference/query-normalization-tracker.md`
  Once made truthful, the tracker became a good implementation registry: backing function, contract, consumer criticality, render policy, and test file all in one place.
- Headline consumer patterns across the verified waves
  The best containers reserve empty copy for healthy success, keep stale data visible on refetch failure, and hide fake zero metrics when the authoritative summary is unavailable.
- Focused wave suites
  The bay-style tests made each migration reviewable and cheap to validate.

## What I Did Not Like

- Guard and tracker drifted apart more than once.
  The program looked closed before multiline raw null-sentinel patterns were actually gone.
- Too much bespoke read-query bridge code accumulated in later waves.
  The logic was correct, but the same `try`/`catch` + `requireReadResult(...)` structure kept reappearing.
- Program-level confidence was thinner than wave-level confidence.
  The wave suites were good, but the closeout still needed a thinner invariant layer around the tracker, guard, and representative headline seams.
- Reviewability degraded in a noisy worktree.
  The normalization slice needed its own explicit closeout artifacts so it could be judged independently from unrelated churn.

## Cleanup Applied

- `tighten`
  - `docs/reference/query-normalization-tracker.md`
    Added a program closeout section with lessons learned and an explicit disposition rule.
  - `scripts/check-read-path-query-guards.mjs`
    Guard already hardened in Wave 7; closeout keeps it as the standing protection against tracker optimism.
  - `scripts/README.md`
    Documentation now reflects generic read `queryFn` guard semantics rather than the legacy exact-string smell only.
  - `tests/unit/system/query-normalization-wave7a.test.tsx`
    Remains the guard-focused reconciliation suite proving multiline raw null-sentinel hooks are blocked and mutation-only checks stay out of scope.
  - `tests/unit/system/query-normalization-closeout.test.ts`
    Added as the thin program-level confidence layer for baseline emptiness, tracker closeout note, and representative headline seam coverage.

- `simplify`
  - `src/lib/read-path-policy.ts`
    Added `resolveReadResult(...)` so hooks can use one shared null-sentinel bridge instead of bespoke `try`/`catch` normalization wrappers.
  - `src/hooks/inventory/use-wms-dashboard.ts`
  - `src/hooks/inventory/use-valuation.ts`
  - `src/hooks/inventory/use-inventory.ts`
  - `src/hooks/suppliers/use-suppliers.ts`
  - `src/hooks/suppliers/use-purchase-orders.ts`
  - `src/components/domain/dashboard/overview/overview-container.tsx`
    These files now collapse repeated read-query bridging onto `resolveReadResult(...)` and keep only local logic that is actually specific to the surface.

- `keep`
  - Every remaining `verified` tracker row not named above.
    Those files match the final house style well enough that further abstraction or copy churn would likely make review worse, not better.

## Residual Concerns

- The tracker is now honest, but future waves still need discipline: guard first, registry second, then hook migration, then consumer truthfulness, then focused tests.
- There is still unavoidable variation in localized degraded copy across domains. That is acceptable as long as the underlying state contract stays consistent.
- This memo does not try to reclassify unrelated dirty worktree files. It closes the normalization slice only.
