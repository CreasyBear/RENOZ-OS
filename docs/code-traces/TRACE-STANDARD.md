# Code trace quality standard

A **shallow** trace lists files and says “validation happens here.” That is not sufficient for remediation or architecture review.

A **staff-level** trace is written so another engineer can **change the workflow safely** without re-spelunking: contracts, failure modes, side effects, and drift vectors are explicit.

---

## Minimum bar (every trace)

1. **Capability statement** — What user power is granted (one verb: create, transition, allocate, …). What is explicitly **out of scope** for this document.

2. **Trust boundary** — What crosses the wire (`createServerFn` payload). What the server **recomputes** (org id, user id). What must **never** be trusted from the client.

3. **Authoritative contract** — Name the **canonical** Zod schema (or OpenAPI) for the RPC. List **secondary** schemas (wizard form, step validators) and state whether they are subsets, duplicates, or divergent.

4. **Sequence / state** — Either a short **mermaid sequence** or a numbered call graph: who calls whom from button click through persistence. If the flow is a **saga** (multiple commits), say so and name **compensation** or **partial-success** behavior.

5. **Persistence & side effects** — Tables touched (or domains: search outbox, activity log, webhooks). Transaction **scope**: single tx vs multiple round-trips.

6. **Failure matrix** — Table of **failure kinds**: validation (4xx), conflict (409), authz (403), not found (404), invariant (4xx/5xx), unknown (5xx). Map each to **user-visible** outcome (toast, field errors, redirect, silent).

7. **Cache / read-after-write** — Which `queryKey`s are invalidated or must be refetched; known stale-read windows.

8. **Drift & debt** — Duplicate rules, `as` casts at the boundary, TODOs, “aligned in comment only” pairs of schemas.

9. **Verification hooks** — Existing tests (path). If none: state **gap** and suggested test type (contract test, integration, e2e).

---

## Strongly recommended (high-churn or money paths)

- **Concurrency** — Locks, `for('update')`, idempotency keys, double-submit.
- **Observability** — Logger names, metrics, support breadcrumbs.
- **Permission** — `PERMISSIONS.*` or policy module reference.
- **Entry-point completeness** — Grep hints to find **all** callers (`useX`, route imports).

---

## Anti-patterns (reject or mark INCOMPLETE)

- Only bullet “see `foo.tsx`” with no function/schema names.
- No mention of **partial success** when multiple mutations run in series.
- “Validation matches server” without naming **both** schema symbols or admitting drift.

---

## Trace status

| Status | Meaning |
|--------|--------|
| **DRAFT** | Entry points only; not safe for remediation |
| **COMPLETE** | Meets minimum bar above |
| **REVIEWED** | Second engineer signed off or linked PR that used trace as spec |

Update the trace header when promoting status.
