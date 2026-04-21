# Domain Housekeeping Audit

Living stewardship audit for the repo after the large support, warranty, service, and release-normalization pushes.

This document is intentionally:
- domain-first, not folder-first
- report-first, not remediation-first
- cumulative, so each audited domain can be added without scattering point-in-time notes

## Canonical Domain Inventory

| Domain | Primary ownership paths | Public workflow surface | Overlap seams | Risk | Recommended tools |
|---|---|---|---|---|---|
| Support Operations | `src/components/domain/support`, `src/hooks/support`, `src/server/functions/support`, `src/server/functions/orders`, `src/lib/schemas/support` | `/support`, `/support/issues`, `/support/rmas`, support dashboard | support ↔ orders/RMA execution, support ↔ warranty, support ↔ service | High | `review`, `audit`, `qa-only`, `browse`, `plan-eng-review` |
| Warranty Lifecycle | `src/components/domain/warranty`, `src/hooks/warranty`, `src/server/functions/warranty`, `src/lib/schemas/warranty` | `/support/warranties`, `/support/claims`, `/support/warranty-entitlements` | warranty exposed through support routes, warranty ↔ service | High | `review`, `audit`, `qa-only`, `plan-eng-review` |
| Service Systems | `src/components/domain/service`, `src/hooks/service`, `src/server/functions/service`, `src/lib/schemas/service` | `/support/service-systems`, `/support/service-linkage-reviews` | service ↔ support ↔ warranty | High | `review`, `audit`, `qa-only`, `browse`, `plan-eng-review` |
| Orders and Fulfillment | `src/components/domain/orders`, `src/hooks/orders`, `src/server/functions/orders`, `src/lib/schemas/orders` | `/orders` | orders ↔ inventory, orders ↔ financial, orders ↔ support RMA | High | `review`, `qa-only`, `browse`, `plan-eng-review` |
| Inventory and Receiving | `src/components/domain/inventory`, `src/hooks/inventory`, `src/server/functions/inventory`, `src/lib/schemas/inventory` | `/inventory` | inventory ↔ procurement/receiving, inventory ↔ orders fulfillment | High | `review`, `audit`, `qa-only`, `browse` |
| Financial and Invoicing | `src/components/domain/financial`, `src/components/domain/invoices`, `src/hooks/financial`, `src/hooks/invoices`, `src/server/functions/financial`, `src/server/functions/invoices`, `src/lib/schemas/financial`, `src/lib/schemas/invoices` | `/financial`, `/financial/invoices`, legacy `/invoices` | `financial` ↔ `invoices`, finance ↔ orders/payments, finance ↔ documents/reports | High | `review`, `qa-only`, `cso`, `plan-eng-review` |
| Customers, Pipeline, Jobs, Communications | `src/components/domain/customers`, `pipeline`, `jobs`, `communications`; matching hooks/server/schema roots | `/customers`, `/pipeline`, `/jobs`, `/communications/*` | jobs legacy root, communications ↔ customers, pipeline ↔ jobs/customers | Medium | `review`, `audit`, `qa-only` selectively |
| Auth, Routing, Shared Platform | auth, oauth, route handlers, shared schemas, query keys, release/deploy docs, shared `src/lib/*` | auth routes, API routes, shared protected/authenticated layers | auth ↔ every domain, route/schema drift, legacy shared roots | High | `review`, `cso`, `plan-eng-review` |

## Cross-Domain Overlap Seams

- `financial` vs `invoices`: split UI, hook, schema, server, and route ownership.
- `procurement` vs `purchase-orders`: duplicated top-level domain roots across components, hooks, schemas, and routes.
- `support` / `warranty` / `service`: unified operator surfaces under support routes with split implementation ownership.
- `support` / `orders`: RMA creation and remedy execution live on order-native server paths while presenting as support workflows.
- `inventory` / `orders` / `procurement`: receiving, fulfillment, serialized stock, and PO-adjacent flows likely share hidden contract seams.
- `src/components/jobs` vs `src/components/domain/jobs`: legacy presentation root still exists beside the domain-owned jobs tree.
- legacy/shared roots to watch in the platform pass: `src/actions`, `src/schemas`, `src/routes/_protected`, and broad `_shared` server helpers.

## Audit Order

1. Support Operations
2. Warranty Lifecycle
3. Service Systems
4. Orders and Fulfillment
5. Inventory and Receiving
6. Financial and Invoicing
7. Customers, Pipeline, Jobs, Communications
8. Auth, Routing, Shared Platform

Rationale:
- Support goes first because it is recently touched, operator-critical, and structurally cross-cutting.
- Warranty and service follow because they share the same support-facing operator surface.
- Orders, inventory, and finance come after because they are downstream of support/RMA outcomes and contain the heavier release-critical workflows.
- Auth and shared platform stay last so that cross-domain cleanup is informed by earlier findings instead of guessed upfront.

---

## Domain 1: Support Operations

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/support` passed with 13 files / 76 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/support/issues`, `src/components/domain/support/rma`, plus support landing/CSAT/SLA/escalation surfaces.
- Hooks: `src/hooks/support/*`
- Server: `src/server/functions/support/*` plus order-native RMA entrypoints in `src/server/functions/orders/rma.ts`
- Schemas: `src/lib/schemas/support/*`
- Routes: `/support`, `/support/issues`, `/support/rmas`, plus support umbrella routes for claims, service linkage reviews, service systems, warranties, and warranty entitlements.

### Public Workflow Surface

- Support landing and support dashboard
- New issue intake from serial, warranty, order, or customer context
- Issue queue, issue board, issue detail, status changes, and escalation
- RMA list, RMA detail, receipt, remedy execution, and linked-issue follow-through

### Shared-Contract Dependencies

- `src/server/functions/support/_shared/issue-anchor-resolution.ts`
- `src/server/functions/support/_shared/issue-remedy-context.ts`
- `src/server/functions/orders/_shared/rma-read-model.ts`
- `src/server/functions/orders/_shared/rma-execution-state.ts`
- shared query keys, detail-view primitives, and confirmation flows

### Executive Read

What is solid:
- The support surface now has a coherent operator story: anchor-first issue intake, issue detail as the triage workspace, and linked RMA remedy follow-through.
- Support docs are relatively strong compared with most domains: the architecture reference and workflow guide actually describe the shipped model.
- The support test pack is meaningful and currently green, especially around RMA contracts, execution state, URL filters, and guard rails.

What is fragile:
- Support implementation ownership is still split between support-owned issue code and order-owned RMA orchestration.
- The issue domain has very large UI and server files, which raises regression risk for routine cleanup.
- The umbrella `/support` route surface bundles multiple adjacent domains, so “support” is both a product domain and a navigation umbrella.

What is messy:
- Support has several workflow-heavy pages whose size makes intent hard to read quickly.
- Test coverage is noticeably stronger for RMA than for issue detail and issue server behavior.

### Findings

#### P2

- **Issue detail concentration remains too high for safe routine change**
  - Files: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-detail-container.tsx`
  - `issue-detail-view.tsx` is 1,629 lines and still carries a very broad slice of the issue operator experience: header actions, alerts, tabs, related context, remedy readiness, and linked artifacts. This is not a correctness bug today, but it increases review cost and makes small changes to issue workflow presentation feel riskier than they should.

- **Issue server orchestration is still a domain god-file**
  - File: `src/server/functions/support/issues.ts`
  - `issues.ts` is 1,358 lines and mixes list filtering, detail loading, issue creation, issue updates, SLA orchestration, anchor normalization, remedy context projection, and cursor logic. That concentration makes the issue domain harder to reason about than its test coverage currently supports.

- **Support-owned RMA UX still depends on order-owned server orchestration**
  - Files: `src/hooks/support/use-rma.ts`, `src/server/functions/orders/rma.ts`
  - The support hook surface imports RMA list/detail/workflow mutations from the orders server layer. This is a valid runtime choice, but it is a real ownership seam: support audit findings and future cleanup will keep colliding with the orders domain until the read/workflow seam is treated more explicitly.

- **Issue coverage is thinner than RMA coverage**
  - Evidence: `tests/unit/support/*`
  - The support test pack strongly covers RMA contracts, execution state, sort/filter behavior, and guard rails. It has much less direct protection for the heavy issue detail workflow and for server-side issue list/detail/update behavior. That leaves the largest issue files under-protected relative to their complexity.

- **Support route ownership is broader than the support implementation tree**
  - Files: `src/routes/_authenticated/support/*`
  - The support route umbrella includes claims, service linkage reviews, service systems, warranties, and warranty entitlements. That may be the correct operator IA, but it means future “support cleanup” work can easily drift into warranty/service cleanup unless the audit keeps those boundaries explicit.

#### P3

- **Issue intake route is another large single-file surface**
  - File: `src/routes/_authenticated/support/issues/new.tsx`
  - At 912 lines, the new-issue route is a second concentration point after issue detail. It combines search hydration, form composition, preview logic, anchor selection, and submission handling. This is a cleanup target, but it is less urgent than the issue detail/server concentration.

- **Knowledge-base and support-adjacent surfaces are present but clearly secondary**
  - Files: `src/components/domain/support/knowledge-base/*`, `src/server/functions/support/knowledge-base.ts`
  - These do not look like the highest-risk support cleanup targets right now. They belong in the domain inventory, but they should not distract the early housekeeping passes from issues and RMA.

### Test and Gate Read

Protected well:
- RMA contract normalization
- RMA execution-state shaping
- remedy dialog behavior
- issue quick filters and URL filter behavior
- issue anchor validation
- support metrics structure
- pending-dialog guard expectations

Under-protected:
- issue detail rendering and action branching
- issue status-change workflow beyond schema-level validation
- support issue server list/detail/update regression paths
- support landing workflow assumptions

### Docs and Runbooks

Strong docs:
- `docs/architecture/support-issue-rma-b2b2c.md`
- `docs/workflows/warranty-support-phase2-workflows.md`

Audit note:
- the workflow doc still openly says browser-driven workflow QA remains to be completed before calling the support flow fully dogfooded. That is useful honesty, but it means code/document confidence is still ahead of real operator QA confidence.

### Recommended Next Audit Tools

- `review` for a deeper structure-and-contract pass across issues + RMA boundaries
- `audit` for support landing, issue detail, and RMA detail/list UI quality
- `qa-only` or `browse` once we want live evidence for the operator path
- `plan-eng-review` only after the support findings are ready to convert into a cleanup plan

### Deferred Cleanup Candidates

Safe short-term:
- split issue detail into clearer feature-local sections
- split issue server functions by read-model vs mutation/orchestration seams
- add issue-detail and issue-server regression tests to rebalance support coverage

Structural medium-term:
- make the support-to-orders RMA seam more explicit in ownership and documentation
- decide whether `/support` should remain the umbrella for adjacent domains or whether the UI umbrella and implementation ownership need a more explicit translation layer

---

## Domain 2: Warranty Lifecycle

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/warranty` passed with 5 files / 32 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/warranty/*`
- Hooks: `src/hooks/warranty/*`
- Server: `src/server/functions/warranty/*`
- Schemas: `src/lib/schemas/warranty/*`
- Routes: `/support/warranties`, `/support/claims`, `/support/warranty-entitlements`

### Public Workflow Surface

- Warranty entitlement queue and activation
- Warranty detail as the warranty-first operator hub
- Claim filing, review, approval, denial, and resolution
- Warranty extensions, ownership transfer, certificates, and policy/admin settings

### Shared-Contract Dependencies

- `src/server/functions/warranty/_shared/entitlement-core.ts`
- `src/server/functions/warranty/_shared/policy-resolution.ts`
- service linkage helpers in `src/server/functions/service/_shared/*`
- support workflow and support architecture docs for the operator-facing entry path

### Executive Read

What is solid:
- Warranty has a clearer domain-submodule split than support: claims, core, entitlements, extensions, certificates, analytics, policies, and bulk import are explicit.
- The warranty workflows are documented reasonably well in the support/warranty workflow guide, and the domain intent is understandable from the tree.
- The warranty detail surface appears intentionally warranty-first even though navigation is support-rooted.

What is fragile:
- The biggest claim and warranty files are very large, and the direct regression coverage around them is much thinner than their complexity suggests.
- Warranty implementation ownership is clean in `src/server/functions/warranty/*`, but the operator route layer still lives under `/support`, which keeps the domain boundary fuzzy at the product surface.
- Service linkage is important to the warranty story, but that truth lives partly outside the warranty domain.

What is messy:
- Claimant-aware claim logic, SLA behavior, activity logging, idempotency, and lineage helpers all converge in one claims server file.
- Warranty detail has become a broad operator hub with many responsibilities in one view.

### Findings

#### P1

- **Warranty release confidence is lower than the domain complexity warrants**
  - Evidence: `tests/unit/warranty/*`
  - The current warranty test pack passes, but it only covers schema/config/sorting-level concerns. There is no direct regression protection for the 1,762-line claims server, the 1,116-line core warranties server, or the 1,493-line warranty detail view. For a domain carrying claimant truth, entitlement activation, service linkage context, and operator workflow branching, that is a real shipping-confidence gap.

#### P2

- **Claims orchestration is concentrated in a single server god-file**
  - File: `src/server/functions/warranty/claims/warranty-claims.ts`
  - `warranty-claims.ts` mixes claim numbering, claimant derivation, status transitions, SLA logic, activity logging, idempotency checks, serialized lineage helpers, and service-context loading. The subdomain exists, but the implementation is still concentrated enough to make careful review expensive.

- **Warranty detail is doing too much in one view**
  - File: `src/components/domain/warranty/views/warranty-detail-view.tsx`
  - At 1,493 lines, the warranty detail view is acting as the operator hub for overview, claims, extensions, service linkage context, certificate actions, timeline activity, opt-out behavior, and claim dialogs. This increases the cost of small UI changes and makes warranty behavior harder to audit confidently.

- **Support-rooted routing still blurs warranty ownership**
  - Files: `src/routes/_authenticated/support/warranties/*`, `src/routes/_authenticated/support/claims/*`, `src/routes/_authenticated/support/warranty-entitlements/*`
  - Warranty implementation is owned by the warranty domain, but all major operator entrypoints sit under `/support`. That may be correct IA, but it is a real ownership seam the audit needs to preserve explicitly so warranty cleanup does not get folded into generic support cleanup.

- **Entitlements, claims, and service linkage share business truth across domains**
  - Files: `src/server/functions/warranty/entitlements.ts`, `src/server/functions/warranty/core/warranties.ts`, service `_shared` helpers
  - Warranty activation and warranty detail depend on service linkage and policy resolution beyond the warranty domain alone. That is not wrong, but it means warranty cleanup will need to keep service-domain contracts in view.

#### P3

- **Secondary warranty surfaces are also large, but not the first cleanup target**
  - Files: `src/components/domain/warranty/dialogs/bulk-warranty-import-dialog.tsx`, `src/components/domain/warranty/templates/warranty-certificate-template.tsx`
  - Bulk import and certificate generation are substantial, but they are less urgent housekeeping targets than claims, entitlements, and warranty detail.

### Test and Gate Read

Protected well:
- claim creation schema
- warranty extension schema
- warranty claim options/config
- warranty list filter config
- warranty sort behavior

Under-protected:
- claims server lifecycle and transitions
- claimant-aware behavior beyond schema validation
- entitlement activation flow behavior
- warranty detail rendering and action branching
- service-linkage behavior as surfaced from warranty detail

### Docs and Runbooks

Strong docs:
- `docs/workflows/warranty-support-phase2-workflows.md`
- `docs/architecture/support-issue-rma-b2b2c.md`

Audit note:
- warranty operator truth is documented mostly through shared support/warranty docs, not a warranty-only long-lived runbook. That is workable, but it reinforces the route/ownership seam.

### Recommended Next Audit Tools

- `review` for a deeper pass on claims + warranty core server concentration
- `audit` for warranty detail, entitlement queue, and claim-detail/list UI quality
- `qa-only` once we want live operator evidence for entitlement activation and claim filing
- `plan-eng-review` only after the warranty findings are ready to become a cleanup plan

### Deferred Cleanup Candidates

Safe short-term:
- add direct regression tests for claims lifecycle, entitlement activation, and warranty detail action branching
- split the highest-concentration warranty view/server files into clearer feature-local seams

Structural medium-term:
- make the boundary between support-rooted navigation and warranty-owned implementation more explicit
- document service-linkage dependencies as first-class warranty audit inputs rather than implicit shared context

---

## Domain 3: Service Systems

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/service` passed with 1 file / 2 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/service/*`
- Hooks: `src/hooks/service/*`
- Server: `src/server/functions/service/*`
- Schemas: `src/lib/schemas/service/*`
- Routes: `/support/service-systems`, `/support/service-linkage-reviews`

### Public Workflow Surface

- Service systems list and detail
- Service linkage review queue and review detail
- Service-system ownership transfer
- Canonical system history and linked-warranty context

### Shared-Contract Dependencies

- `src/server/functions/service/_shared/service-resolver.ts`
- `src/server/functions/service/_shared/service-writer.ts`
- `src/server/functions/service/_shared/service-normalization.ts`
- warranty and support flows that surface service linkage as adjacent context

### Executive Read

What is solid:
- The public service surface is comparatively compact and easier to enumerate than support or warranty.
- Route, container, and hook layering is reasonably clean at the top level.
- Service has a clear product role: canonical installed-system record plus linkage-review workflow.

What is fragile:
- Most of the actual business complexity sits in `_shared` helpers, not the top-level service entrypoints.
- Coverage is almost nonexistent relative to the importance of ownership transfer and service-linkage behavior.
- The service domain is operationally presented inside `/support`, which reinforces the cross-domain seam.

What is messy:
- Service looks small if you only read routes and views, but the real logic is hidden in shared resolver/writer helpers used by warranty and support context loading.

### Findings

#### P1

- **Service domain regression coverage is far too thin for the business role it plays**
  - Evidence: `tests/unit/service/*`
  - The current service test pack contains only search-schema coverage. There is no direct regression protection for service linkage resolution, service-system ownership transfer, resolver behavior, or the shared writer/resolver helpers that warranty and support depend on. For a domain carrying canonical ownership truth, this is a major confidence gap.

#### P2

- **Critical service behavior is concentrated in shared helpers rather than visible entrypoints**
  - Files: `src/server/functions/service/_shared/service-writer.ts`, `src/server/functions/service/_shared/service-resolver.ts`
  - The top-level service handlers are small, but the real complexity lives in `service-writer.ts` (898 lines) and `service-resolver.ts` (642 lines). This is workable architecture, but it hides the true maintenance surface and makes cross-domain effects harder to audit quickly.

- **Service behavior is cross-domain truth, not a standalone feature**
  - Files: service `_shared` helpers plus warranty/support consumers
  - Service linkage and service ownership are consumed by warranty detail, warranty activation/review flows, and support issue context. That means service cleanup cannot be treated as an isolated mini-domain even though the file tree is smaller.

- **Support-rooted routing still blurs service ownership**
  - Files: `src/routes/_authenticated/support/service-systems/*`, `src/routes/_authenticated/support/service-linkage-reviews/*`
  - Service systems and linkage reviews are implemented cleanly in the service domain, but their operator entrypoints sit under `/support`. That is a recurring ownership seam rather than a one-off issue.

#### P3

- **The public service UI is not the first housekeeping problem**
  - Files: `src/components/domain/service/views/*`
  - Compared with support and warranty, the service views are relatively modest in size. The higher-value housekeeping work is in shared logic coverage and cross-domain contract visibility rather than UI decomposition.

### Test and Gate Read

Protected well:
- service search schema shape

Under-protected:
- service-system detail loading
- service linkage review resolution flow
- service-system ownership transfer
- shared resolver behavior
- shared writer behavior
- warranty/support integration assumptions that depend on service truth

### Docs and Runbooks

Strong docs:
- `docs/architecture/support-issue-rma-b2b2c.md`
- `docs/workflows/warranty-support-phase2-workflows.md`

Audit note:
- service behavior is documented mainly as part of the larger support/warranty architecture, not through a dedicated service-domain runbook. That matches the product surface, but it also makes service-specific operational truth easier to overlook.

### Recommended Next Audit Tools

- `review` for a deeper pass on service resolver/writer structure and cross-domain effects
- `qa-only` only after support/warranty operator paths need browser evidence around service linkage
- `plan-eng-review` if the support/warranty/service seam turns into a structural cleanup proposal

### Deferred Cleanup Candidates

Safe short-term:
- add direct tests for linkage-review resolution, ownership transfer, and shared resolver/writer behavior
- document service-domain invariants where warranty and support rely on them

Structural medium-term:
- make the service shared-helper seam more legible in future audits and cleanup plans
- decide whether support-rooted navigation should remain the only operator entry path for service workflows

---

## Domain 4: Orders and Fulfillment

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/orders` passed with 22 files / 64 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/orders/*`
- Hooks: `src/hooks/orders/*`
- Server: `src/server/functions/orders/*`
- Schemas: `src/lib/schemas/orders/*`
- Routes: `/orders`, `/orders/$orderId`, `/orders/fulfillment`, create/edit/detail flows

### Public Workflow Surface

- Order creation and order detail
- Fulfillment dashboard and shipment execution
- Amendment request and approval flows
- Order documents, payments, and downstream shipment state
- Support-adjacent RMA creation and execution seams

### Shared-Contract Dependencies

- inventory planning and fulfillment stock contracts
- financial invoice/payment contracts
- support/RMA orchestration through `src/server/functions/orders/rma.ts`
- document generation and route/page context contracts

### Executive Read

What is solid:
- Orders is one of the best-tested release-critical domains in the repo right now.
- The test pack covers list/detail contracts, mutation invalidation, workflow options, document surfaces, shipment facade compatibility, and several fulfillment-specific paths.
- The domain is large, but the public surface is still understandable from the tree.

What is fragile:
- Several of the highest-risk operator surfaces are still very large single files.
- Orders is a real system hub: support, inventory, and finance all depend on it.
- The order-native RMA implementation means support housekeeping cannot fully escape orders-domain debt.

What is messy:
- Fulfillment, amendments, order detail, and RMA orchestration each have their own concentration point rather than one clean seam.
- The domain is structurally healthier than support or warranty, but still expensive to review because complexity is spread across several large files.

### Findings

#### P2

- **Order fulfillment and order detail still rely on several oversized operator surfaces**
  - Files: `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`, `src/components/domain/orders/fulfillment/fulfillment-dashboard.tsx`, `src/components/domain/orders/containers/order-detail-container.tsx`, `src/components/domain/orders/amendments/amendment-request-dialog.tsx`
  - These files range from 1,143 to 1,548 lines. That is not a correctness failure by itself, but it raises the cost of shipping routine workflow changes in a domain that already sits on several cross-domain seams.

- **Orders owns another major orchestration god-file through RMA**
  - File: `src/server/functions/orders/rma.ts`
  - `rma.ts` is 1,779 lines and remains one of the clearest cross-domain concentration points in the repo. Even after the recent normalization work, the actual workflow truth for support-facing RMAs still lives in an orders-native orchestration file.

- **Shipment state and lifecycle transitions are still concentrated in large server files**
  - Files: `src/server/functions/orders/order-shipments-finalization.ts`, `src/server/functions/orders/order-status.ts`
  - These are 971 and 951 lines respectively. The test coverage helps, but they remain central coordination points for side-effect-heavy workflow behavior.

- **Orders is the main downstream seam for support, inventory, and finance**
  - Files: orders domain broadly
  - This is the domain most likely to accumulate “just one more integration edge case.” The current audit suggests that future housekeeping work should treat orders as an integration hub, not just a product workflow.

### Test and Gate Read

Protected well:
- order list/query contracts
- order status contracts and workflow options
- mutation invalidation
- shipment availability and shipping UI behavior
- order documents and facade compatibility
- amendment wire types and write contracts

Under-protected:
- the full order detail UI branching surface
- the largest amendment and fulfillment dialogs as rendered operator flows
- cross-domain seams where inventory/finance/support side effects meet the same order action

### Docs and Runbooks

Audit note:
- orders is well represented in code and test coverage, but it does not have the same level of curated architecture documentation as support or finance. That makes the tests carry more of the stewardship burden.

### Recommended Next Audit Tools

- `review` for a deeper structure-and-side-effects pass across fulfillment, amendments, and RMA orchestration
- `qa-only` or `browse` if shipment and fulfillment workflows need live operator evidence
- `plan-eng-review` if the orders integration-hub problem becomes a decomposition plan

### Deferred Cleanup Candidates

Safe short-term:
- split the largest fulfillment and amendment dialogs into clearer feature-local sections
- add focused order-detail workflow coverage where current tests stop at contracts

Structural medium-term:
- make the orders/support RMA seam more intentionally documented
- identify the minimum seams between orders, inventory, and finance that deserve first-class shared contracts

---

## Domain 5: Inventory and Receiving

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/purchase-orders` passed with 9 files / 28 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/inventory/*`
- Hooks: `src/hooks/inventory/*`
- Server: `src/server/functions/inventory/*`
- Schemas: `src/lib/schemas/inventory/*`
- Routes: `/inventory`, plus adjacent receiving/procurement entrypoints in `/procurement` and `/purchase-orders`

### Public Workflow Surface

- Unified inventory dashboard and inventory detail
- Alerts, counts, analytics, locations, and forecasting
- Receiving flows
- Procurement and purchase-order-adjacent receiving workflows

### Shared-Contract Dependencies

- orders fulfillment planning
- procurement and purchase-order contracts
- serialized stock and valuation logic
- receiving route context and stock-mutation contracts

### Executive Read

What is solid:
- Inventory clearly represents a real product area with dashboard, detail, alerting, counting, and receiving surfaces.
- The existing tests cover several practical route and receiving contexts.
- The inventory area already exposes its adjacent seams openly: inventory, procurement, and purchase orders are visibly related rather than secretly coupled.

What is fragile:
- Core inventory logic is heavily concentrated in very large server and schema files.
- Coverage is much thinner than the operational importance of valuation, alerts, counts, and core item mutation logic.
- Ownership is split across inventory, procurement, and purchase-order route roots.

What is messy:
- Inventory is simultaneously a domain and a substrate for receiving/procurement workflows.
- The heaviest concentrations are not just in server logic; the schema layer is also unusually large, which makes contract cleanup harder.

### Findings

#### P1

- **Inventory release confidence is lower than the domain complexity warrants**
  - Evidence: `tests/unit/inventory/*`, `tests/unit/purchase-orders/*`
  - The combined inventory/purchase-order test pack passes, but it only covers 9 files / 28 tests while the domain contains a 2,968-line inventory server, a 1,750-line inventory schema file, a 1,528-line valuation server, and several 1,000+ line operator surfaces. That is a real confidence gap for a stock-and-receiving domain.

#### P2

- **Inventory core behavior is concentrated in a small number of very large files**
  - Files: `src/server/functions/inventory/inventory.ts`, `src/lib/schemas/inventory/inventory.ts`, `src/server/functions/inventory/valuation.ts`, `src/server/functions/inventory/stock-counts.ts`, `src/server/functions/inventory/alerts.ts`
  - These are the clearest housekeeping hotspots in the domain. The size alone is not the bug; the problem is that stock truth, contract truth, valuation logic, and alert/count behavior are all expensive to audit independently.

- **Inventory ownership is split across inventory, procurement, and purchase-order roots**
  - Files: route and schema roots under `src/routes/_authenticated/inventory`, `procurement`, `purchase-orders`, plus matching schema/test roots
  - This seam is not theoretical. It shows up directly in routes, tests, and schema folders, which means future cleanup or onboarding work will keep paying a translation tax unless the relationship is made more explicit.

- **Inventory UI concentration is secondary, but still meaningful**
  - Files: `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/components/domain/inventory/views/inventory-detail-view.tsx`
  - At 1,264 and 1,196 lines, the dashboard and detail view are sizeable. They are not the first housekeeping target, but they do contribute to review drag in a domain that already has large server/schema surfaces.

### Test and Gate Read

Protected well:
- receiving page context
- receiving hook behavior
- alert sorting
- purchase-order query building and approval hardening

Under-protected:
- core inventory read/write behavior
- valuation logic
- count workflows and reconciliation
- alert generation logic
- inventory detail/dashboard operator branching

### Docs and Runbooks

Audit note:
- inventory currently reads more as code-and-route structure than as a curated operationally documented domain. That is workable, but it means the code organization carries most of the discoverability burden.

### Recommended Next Audit Tools

- `review` for a structure-and-contract pass on inventory core plus procurement/purchase-order seams
- `audit` only after inventory operator dashboards or receiving UI need closer technical UX scrutiny
- `plan-eng-review` if procurement/purchase-order normalization becomes a deliberate follow-up project

### Deferred Cleanup Candidates

Safe short-term:
- add direct tests for inventory core, valuation, and count behavior
- document the intended relationship between inventory, procurement, and purchase orders more explicitly

Structural medium-term:
- split the largest inventory server/schema files along clearer responsibility seams
- decide whether receiving should be inventory-owned with procurement views, or truly co-owned across domain roots

---

## Domain 6: Financial and Invoicing

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/financial tests/unit/invoices` passed with 9 files / 25 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/financial/*`, `src/components/domain/invoices/*`
- Hooks: `src/hooks/financial/*`, `src/hooks/invoices/*`
- Server: `src/server/functions/financial/*`, `src/server/functions/invoices/*`
- Schemas: `src/lib/schemas/financial/*`, `src/lib/schemas/invoices/*`
- Routes: `/financial/*` plus legacy `/invoices/*`

### Public Workflow Surface

- Financial landing, analytics, AR aging, payment plans, reminders, revenue
- Invoice list and invoice detail
- Credit notes
- Xero sync status and Xero-backed invoice/payment synchronization

### Shared-Contract Dependencies

- orders payments and invoice generation
- document/rendering surfaces
- Xero OAuth and webhook infrastructure
- customer Xero contact mapping

### Executive Read

What is solid:
- Finance is one of the better-documented operational domains thanks to the Xero runbook.
- The external-integration hardening story is meaningful: the test pack covers Xero adapter, webhook batch policy, sync contract, and fail-closed payment application behavior.
- The domain already contains machine-readable safety framing rather than vague “best effort” sync assumptions.

What is fragile:
- Ownership is still split across `financial` and `invoices` at every layer: routes, components, hooks, server functions, and schemas.
- Several high-value UI and hook surfaces are still very large.
- The strongest tests are around Xero hardening, not around the broader invoice/operator surface.

What is messy:
- The public workflow is reasonably coherent, but the codebase still reads like two partially merged domains.
- Finance has one of the clearest “docs are ahead of structural normalization” stories in the repo.

### Findings

#### P2

- **`financial` vs `invoices` is still a real ownership seam, not just a naming artifact**
  - Files: both route roots and both domain roots
  - The split is visible in routes (`/financial/invoices` and legacy `/invoices`), components, hooks, server functions, and schemas. This means future housekeeping and contributor onboarding will keep paying for duplicate mental models until the repo chooses a clearer ownership center.

- **Core finance and Xero orchestration still concentrate in large files**
  - Files: `src/server/functions/financial/xero-invoice-sync.ts`, `src/server/functions/financial/credit-notes.tsx`, `src/server/functions/financial/payment-schedules.ts`, `src/hooks/financial/use-financial.ts`
  - The Xero sync server alone is 1,391 lines. Combined with large credit-note, payment-schedule, and hook surfaces, this keeps the financial domain expensive to reason about even though the external-integration safeguards are stronger than in many other domains.

- **Invoice and Xero operator UI still carry large single-file surfaces**
  - Files: `src/components/domain/invoices/detail/invoice-detail-view.tsx`, `src/components/domain/financial/xero-sync-status.tsx`
  - At 1,032 and 967 lines, these remain meaningful review hotspots. They are not the first thing to fix, but they are part of why finance still feels structurally unfinished.

- **Coverage is stronger for external sync safety than for general invoice/operator behavior**
  - Evidence: `tests/unit/financial/*`, `tests/unit/invoices/*`
  - That bias is understandable, but it leaves some ordinary financial UI and route behavior less directly protected than the Xero paths.

### Test and Gate Read

Protected well:
- fail-closed Xero adapter behavior
- Xero sync contract
- payment over-application safeguards
- webhook batch policy
- Xero sync status rendering

Under-protected:
- invoice detail workflow branching
- broader financial landing/list/operator surfaces
- financial/invoices route duplication behavior
- credit-note and payment-plan UI surfaces

### Docs and Runbooks

Strong docs:
- `docs/operations/xero-integration.md`

Audit note:
- the Xero doc is one of the stronger operational docs in the repo and clearly expresses the fail-closed safety model. The main stewardship gap is structural normalization, not missing intent.

### Recommended Next Audit Tools

- `review` for structure/ownership cleanup pressure across `financial` and `invoices`
- `cso` for any deeper pass on OAuth/webhook/integration trust boundaries
- `qa-only` if invoice/operator UI flows need browser evidence beyond the current test pack

### Deferred Cleanup Candidates

Safe short-term:
- add direct invoice-detail and financial-list/operator regression tests
- document the intended long-term ownership of `financial` vs `invoices`

Structural medium-term:
- consolidate the split domain roots around one primary ownership model
- separate finance operator UI concerns more clearly from Xero synchronization infrastructure

---

## Domain 7: Customers, Pipeline, Jobs, Communications

**Status:** Initial housekeeping audit complete  
**Risk level:** Medium  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/customers tests/unit/pipeline tests/unit/jobs tests/unit/communications` passed with 20 files / 144 tests on 2026-04-17.

### Primary Ownership Paths

- Components: `src/components/domain/customers/*`, `pipeline/*`, `jobs/*`, `communications/*`, plus legacy `src/components/jobs/*`
- Hooks: matching `src/hooks/*` roots
- Server: matching `src/server/functions/*` roots
- Schemas: matching `src/lib/schemas/*` roots
- Routes: `/customers`, `/pipeline`, `/jobs`, `/communications/*`

### Public Workflow Surface

- Customer directory, customer detail, segments, duplicates, bulk tools, health
- Pipeline opportunities, quotes, quote versions, activity timeline
- Jobs/projects, schedule, assignments, tasks, costing
- Communications inbox, campaigns, email templates, signatures, scheduled emails/calls

### Shared-Contract Dependencies

- customers ↔ Xero contact mapping
- pipeline ↔ quotes ↔ orders
- jobs ↔ documents, notes, workstreams, scheduling
- communications ↔ customers and OAuth email/account connections

### Executive Read

What is solid:
- This broad CRM layer has the healthiest aggregate test footprint in the repo after orders.
- The domain trees are rich and intentionally split by product area rather than one giant catch-all.
- Customer, pipeline, and jobs all have enough route/hook/schema presence to look like first-class domains rather than leftovers.

What is fragile:
- The aggregate domain is too broad to reason about as one unit, and the biggest server files are still very large.
- Communications has a large surface area but comparatively light direct test coverage.
- A legacy jobs component root still exists beside the domain-owned jobs tree.

What is messy:
- Customers and pipeline each hide large server concentrations under otherwise well-organized folder trees.
- Jobs looks mostly normalized until the legacy `src/components/jobs` compatibility root reappears.

### Findings

#### P2

- **Customers and pipeline both still rely on major server god-files**
  - Files: `src/server/functions/customers/customers.ts`, `src/server/functions/pipeline/pipeline.ts`, `src/server/functions/pipeline/quote-versions.tsx`, `src/server/functions/customers/customer-analytics.ts`
  - `customers.ts` is 2,290 lines and `pipeline.ts` is 2,615 lines, with additional large companions for quote versions and customer analytics. This is the clearest structural blind spot in the CRM layer.

- **Communications looks larger than its direct regression coverage suggests**
  - Files: `src/server/functions/communications/email-campaigns.ts`, `src/components/domain/communications/campaigns/campaign-detail-panel.tsx`, `src/components/domain/communications/campaigns/campaign-wizard.tsx`
  - Communications has meaningful operator surface area, but the direct test pack is thin relative to that breadth. Campaigns look like the highest-leverage follow-up target inside this domain slice.

- **Jobs still carries a legacy root beside the normalized domain tree**
  - File: `src/components/jobs/index.ts`
  - The legacy jobs root still exports presentation components from a parallel path. Even if it remains compatible today, it is exactly the kind of ambiguous structure that makes repo-wide housekeeping harder than it should be.

- **The broad CRM slice is healthier than it looks, but unevenly**
  - Evidence: `tests/unit/customers/*`, `pipeline/*`, `jobs/*`, `communications/*`
  - Customers, pipeline, and jobs have meaningful test coverage. Communications is the relative outlier, and that mismatch is worth preserving explicitly in future cleanup prioritization.

#### P3

- **Jobs UI has several large operator views, but they are not the first structural concern**
  - Files: `src/components/domain/jobs/projects/project-tasks-tab.tsx`, `src/components/domain/jobs/projects/project-bom-tab.tsx`, `src/components/domain/jobs/schedule/schedule-dashboard.tsx`
  - These are large enough to merit future cleanup, but the immediate structural debt is still in server ownership and legacy-root ambiguity.

### Test and Gate Read

Protected well:
- customer query/mutation contracts
- customer write helpers and import/merge surfaces
- pipeline list/query and quote mutation contracts
- jobs derived state, costing, alerts, sorting

Under-protected:
- communications campaigns and inbox workflow behavior
- the largest customer and pipeline server orchestration paths
- legacy jobs compatibility assumptions

### Docs and Runbooks

Audit note:
- these domains are mostly discoverable from code structure and tests rather than from heavily curated architecture docs. That is acceptable, but it raises the value of good structural naming and clear root ownership.

### Recommended Next Audit Tools

- `review` for deeper structure work on customers/pipeline server concentrations
- `audit` if customer detail, jobs schedule, or communications campaign UX needs closer technical quality review
- `qa-only` selectively for communications or jobs operator flows

### Deferred Cleanup Candidates

Safe short-term:
- add direct communications campaign/inbox regression coverage
- document the purpose of the legacy jobs root if it must remain temporarily

Structural medium-term:
- split the largest customer and pipeline server files
- fully retire or formally encapsulate the legacy jobs compatibility layer

---

## Domain 8: Auth, Routing, Shared Platform

**Status:** Initial housekeeping audit complete  
**Risk level:** High  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/auth tests/unit/routes` passed with 21 files / 86 tests on 2026-04-17.

### Primary Ownership Paths

- Auth components and hooks under `src/components/auth` and `src/hooks/auth`
- Auth and OAuth server functions under `src/server/functions/auth` and `src/server/functions/oauth`
- Auth schemas under `src/lib/schemas/auth`
- Shared platform glue under `src/lib/*`, `src/lib/server/*`, `src/lib/oauth/*`, and API routes under `src/routes/api/*`

### Public Workflow Surface

- login, reset, password change, invitation, and confirmation flows
- OAuth connection setup and callback handling
- webhook ingress for Xero and Resend
- shared protected-route behavior and search-schema routing contracts

### Shared-Contract Dependencies

- every domain using `withAuth`, permissions, protected server functions, and query keys
- OAuth token storage/refresh/encryption
- webhook handlers
- release, routing, and API route conventions

### Executive Read

What is solid:
- This is one of the stronger test-backed infrastructure surfaces in the repo.
- Auth and route tests cover route policy, redirects, login/logout/update-password behavior, OAuth callback/pending-selection routes, webhook routes, and search-schema smoke tests.
- The finance/Xero security-critical route is small, explicit, and directly tested.

What is fragile:
- Shared platform truth is spread across many files and directories rather than one intentionally small platform core.
- `src/lib/query-keys.ts` has become a very large cross-domain contract hub.
- Platform discoverability still depends heavily on tribal understanding of which shared layer to read first.

What is messy:
- Shared platform code mixes clearly infrastructure-level modules with domain-adjacent utilities in the same broad `src/lib/*` surface.
- The repo has largely improved route/deploy hygiene, but the remaining platform debt is organizational rather than immediately behavioral.

### Findings

#### P2

- **`query-keys.ts` has become a shared-platform monolith**
  - File: `src/lib/query-keys.ts`
  - At 2,324 lines, the query-key factory now acts as a cross-domain cache contract registry. It even imports domain sorting/filter types from component and schema layers, which is a sign that shared platform truth and domain UI truth are bleeding together.

- **Shared auth/protection contracts are reasonably sound but still broad**
  - Files: `src/lib/server/protected.ts`, `src/lib/auth/route-auth.ts`, `src/lib/server/errors.ts`
  - These files are not alarmingly large, but they are central to almost every server-facing domain. Any cleanup here should be deliberate because the blast radius is repo-wide.

- **OAuth and webhook safety looks better than most other cross-domain seams**
  - Files: `src/routes/api/webhooks/xero.ts`, `src/server/functions/oauth/handle-oauth-callback.ts`, `docs/operations/xero-integration.md`
  - This is a positive finding more than a debt item: the Xero webhook route is small, fail-closed, and directly tested, and the OAuth callback wrapper is intentionally narrow. The blind spot is not obvious insecurity here; it is that the surrounding shared-platform surface is so broad.

- **The platform layer still contains broad, mixed-purpose utility territory**
  - Paths: `src/lib/*`, `src/lib/server/*`, `src/routes/api/*`
  - This is where future repo housekeeping can easily become noisy. The audit should keep distinguishing true platform contracts from domain-adjacent utility drift.

### Test and Gate Read

Protected well:
- route-auth and route-policy behavior
- login/logout/update-password/reset flows
- OAuth callback and pending-selection routes
- Xero webhook route behavior
- authenticated search-schema smoke coverage

Under-protected:
- shared query-key contract drift across domains
- broader shared `src/lib/*` utility cohesion
- AI route surface as part of the platform footprint

### Docs and Runbooks

Strong docs:
- `docs/operations/xero-integration.md`
- deploy and repo stewardship docs updated in the remediation pass

Audit note:
- the repo now has a much better public-facing ops layer than before, but platform/internal contributor discoverability still depends more on code reading than on one clear “platform architecture” reference.

### Recommended Next Audit Tools

- `review` for cross-domain platform structure and shared-contract drift
- `cso` for any future deeper pass on auth/OAuth/webhook trust boundaries
- `plan-eng-review` only once platform findings are ready to become a normalization plan

### Deferred Cleanup Candidates

Safe short-term:
- document the intended ownership of `query-keys.ts` and identify the first extraction seams
- add focused tests where shared platform helpers are most likely to drift silently

Structural medium-term:
- reduce the size and centrality of `src/lib/query-keys.ts`
- define a clearer boundary between platform contracts and domain-adjacent utilities in `src/lib/*`

---

## Specialized Addendum A: Trust Boundary and Security Pass

**Status:** Initial trust-boundary audit complete  
**Scope:** auth, OAuth, webhooks, unsubscribe/tracking, AI API routes, shared auth/rate-limit helpers  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/auth tests/unit/routes` passed with 21 files / 86 tests on 2026-04-17, plus direct inspection of auth/OAuth/webhook/AI route sources.

### Executive Read

What is solid:
- Auth, route-policy, OAuth callback, and Xero webhook routes are materially better tested than most infrastructure surfaces in the repo.
- The Xero webhook route is small, raw-body verified, fail-closed, and backed by route tests.
- AI routes consistently require `withAuth`, which is better than the “forgot to protect one endpoint” pattern that often shows up in fast-moving integration code.

What is fragile:
- The unsubscribe flow still carries a legacy token path that does not meet the newer signed-token security model.
- Public endpoint throttling depends on an in-memory rate limiter that is not a strong fit for multi-instance deploys.
- A few debug and permission-fallback patterns remain in shipped code, even if they are not all active failures today.

What is messy:
- Trust-boundary truth is split across modern hardened paths and older compatibility behavior.
- The platform layer often documents the stronger model while still allowing weaker transitional behavior in code.

### Findings

#### P1

- **The unsubscribe endpoint still accepts unsigned legacy tokens**
  - Files: `src/routes/api/unsubscribe.$token.ts`, `src/lib/server/communication-preferences.ts`, `src/lib/server/unsubscribe-tokens.ts`
  - The secure unsubscribe implementation uses HMAC-signed, expiring tokens, but the route still falls back to `verifyLegacyToken`, which only base64-decodes JSON containing `contactId` and `channel`. That legacy format has no signature and no expiry. In practice, that means an attacker who can guess or obtain a valid contact ID can forge a token shape that the route will accept. This is the strongest security finding in the deeper audit pass.

#### P2

- **Public endpoint throttling relies on a non-distributed in-memory limiter**
  - Files: `src/lib/server/rate-limit.ts`, `src/routes/api/unsubscribe.$token.ts`, `src/routes/api/webhooks/resend.ts`, `src/routes/api/oauth/initiate.ts`, `src/server/functions/auth/confirm.ts`
  - The shared public-endpoint rate limiter is explicitly in-memory. In a multi-instance deployment, that means protections are per-instance rather than global. It also falls back to `'default-client'` when proxy headers are not trusted, which can collapse unrelated traffic into the same bucket or make rate limiting behave unpredictably. This is less severe than the unsubscribe token issue, but it is still real operational/security debt.

- **AI debug endpoints remain exposed without auth**
  - Files: `src/routes/api/ai/debug-ping.ts`, `src/routes/api/ai/debug-rls-clash.ts`
  - `debug-ping` is intentionally public, and `debug-rls-clash` is only blocked in production. That means non-production environments can expose an unauthenticated endpoint that accepts an arbitrary `orgId` and returns customer/revenue comparisons after manually setting organization context. This is acceptable only if preview/dev environments are treated as private; otherwise it is a trust-boundary footgun.

- **Permission fallback strings create silent authorization-drift risk**
  - Files: `src/server/functions/jobs/checklists.ts`, `src/server/functions/jobs/job-time.ts`, `src/server/functions/jobs/job-materials.ts`, `src/server/functions/jobs/job-tasks.ts`, `src/server/functions/pipeline/pipeline.ts`, `src/server/functions/support/issues.ts`, `src/server/functions/orders/rma.ts`
  - Multiple server functions use optional chaining plus raw-string fallbacks for permissions. The jobs domain is the worst example: several handlers fall back to `customer.read`, `customer.create`, `customer.update`, or `customer.delete` if `PERMISSIONS.job` is missing. Today `PERMISSIONS.job` exists, so this is not a live exploit, but it is exactly the kind of latent auth bug that can appear during refactors or partial migrations.

#### P3

- **The stronger security model is not yet fully enforced by tests**
  - Evidence: route/auth/financial test packs
  - The stronger paths are tested around Xero webhooks and auth routes, but there is no direct regression coverage proving that legacy unsubscribe tokens are retired, that public throttling behaves correctly behind proxy/config permutations, or that debug endpoints stay non-public where intended.

### Positive Findings

- `src/routes/api/webhooks/xero.ts` verifies the raw request body and signature before parsing JSON.
- `src/routes/api/track/open.$emailId.ts` and `src/routes/api/track/click.$emailId.$linkId.ts` validate tracking signatures, and the click route validates the target against stored link metadata to avoid open redirects.
- `src/server/functions/oauth/handle-oauth-callback.ts` is intentionally narrow and pushes complexity into the OAuth flow library rather than bloating the route wrapper.
- All current `src/routes/api/ai/*` endpoints except the two explicit debug routes require `withAuth`.

### Deferred Cleanup Candidates

Safe short-term:
- remove or hard-disable the legacy unsubscribe token path
- add regression tests proving unsigned unsubscribe tokens are rejected
- decide whether public debug AI routes should exist at all in shipped code

Structural medium-term:
- move public endpoint throttling onto a distributed limiter
- remove permission fallback strings in favor of canonical permission constants only

---

## Specialized Addendum B: Cross-Cutting Housekeeping Signals

**Status:** Initial cross-cutting sweep complete  
**Scope:** debug endpoints, compatibility layers, `_shared` clusters, deprecated exports, TODO/follow-up markers

### Executive Read

What is solid:
- Most of the repo’s “we know this is transitional” spots are at least visible in code comments or folder names.
- Compatibility layers are not completely hidden; many are clearly marked as deprecated or legacy.

What is fragile:
- The remaining transitional surface area is large enough to keep confusing ownership and cleanup planning.
- The densest examples sit in exactly the domains the baseline audit already flagged: jobs, platform glue, and Trigger.dev compatibility exports.

### Signals Worth Keeping in View

- **Legacy compatibility surfaces still exist in runtime paths**
  - Files/paths: `src/components/jobs/presentation`, `src/components/jobs/index.ts`, `src/server/functions/automation-jobs.ts`, `src/server/jobs.ts`, several `src/trigger/jobs/*` files with deprecated exports
  - These are not all urgent, but they are evidence that the repo still carries active migration layers rather than a fully settled shape.

- **`_shared` server folders are carrying a lot of invisible system weight**
  - Paths: `src/server/functions/_shared`, `orders/_shared`, `service/_shared`, `support/_shared`, `warranty/_shared`
  - This is not inherently wrong, but it is a strong signal that several “small” domains actually depend on hidden shared orchestration layers.

- **Cross-domain TODOs still sit in operationally meaningful code**
  - Examples: job timeline/task/materials follow-ups, reports/Trigger integration notes, AI approval notification TODOs
  - None of the discovered TODOs looked like immediate blockers, but they are reminders that some workflows are still deliberately incomplete behind otherwise mature surfaces.

### Deferred Cleanup Candidates

Safe short-term:
- classify the remaining compatibility exports into “must keep” vs “ready to retire”
- record which `_shared` folders represent intentional architecture versus cleanup debt

Structural medium-term:
- reduce parallel compatibility layers as each affected domain gets a cleanup pass
- convert the most important transitional assumptions into explicit docs or tests instead of relying on comments

---

## Specialized Addendum C: Error Handling and Resilience Pass

**Status:** Initial resilience/error-handling audit complete  
**Scope:** shared error normalization, route error responses, retry semantics, user-facing error surfaces, public endpoint degradation  
**Validation evidence:** `./node_modules/.bin/vitest run tests/unit/query-error-normalization.test.ts tests/unit/server/protected-auth-context.test.ts` passed with 2 files / 5 tests on 2026-04-17, plus previously-run auth/route/webhook test packs and direct inspection of shared error and route helpers.

### Executive Read

What is solid:
- The repo has a genuinely useful centralized error layer in `src/lib/error-handling.ts`, including normalization, user-friendly messages, and retry guidance.
- Route/webhook handlers in the better-hardened areas already do explicit status mapping and fail-closed behavior instead of dumping raw exceptions.
- Shared auth context setup is tested directly, which is better than relying on convention alone.

What is fragile:
- Error-handling quality is inconsistent across the repo: some routes are careful and sanitized, while others still return raw `error.message` or raw validation details.
- Many UI surfaces still display `error instanceof Error ? error.message : 'Unknown error'` directly, which makes operator UX noisy and can leak internal phrasing.
- The stronger normalization/retry model exists, but it has not yet become the default path everywhere.

What is messy:
- Resilience is implemented as a mix of strong patterns, local conventions, and ad hoc fallbacks.
- The app has enough “gold standard” code now that inconsistency stands out more sharply than missing capability.

### Findings

#### P2

- **Route-level error responses are not consistently sanitized**
  - Files: `src/routes/api/oauth/initiate.ts`, `src/server/functions/oauth/handle-oauth-callback.ts`, `src/routes/api/ai/debug-rls-clash.ts`
  - Some routes still return raw error text back to the client. `oauth/initiate` returns `details: parsed.error` for invalid input and raw `errorMessage` on 500 responses; `handle-oauth-callback` embeds `Internal server error: ${errorMessage}` into the result payload; `debug-rls-clash` returns the caught message directly. That is inconsistent with the stronger “generic client message, detailed server log” pattern used elsewhere.

- **User-facing surfaces still often expose raw technical error strings**
  - Files: `src/routes/_authenticated/support/support-page.tsx`, `src/routes/_authenticated/support/dashboard.tsx`, `src/components/domain/warranty/containers/warranty-detail-container.tsx`, `src/components/domain/customers/components/xero-contact-manager.tsx`, `src/components/domain/jobs/projects/task-dialogs.tsx`
  - A recurring pattern in UI containers and dialogs is direct rendering of `error.message` or `'Unknown error'`. This is fast to implement, but it creates inconsistent operator messaging and can expose internal wording that the centralized error helper was clearly designed to normalize.

- **The repo has a strong centralized resilience helper, but adoption is incomplete**
  - Files: `src/lib/error-handling.ts`, `tests/unit/query-error-normalization.test.ts`
  - `normalizeQueryError`, `getUserFriendlyMessage`, and `isRetryableError` are strong primitives. The debt is that they are not yet the universal path for query/mutation/UI error handling, so resilience quality varies widely by feature.

- **Public-endpoint degradation paths are real but uneven**
  - Files: `src/lib/server/rate-limit.ts`, `src/routes/api/webhooks/resend.ts`, `src/routes/api/unsubscribe.$token.ts`, `src/server/functions/auth/confirm.ts`
  - Some public endpoints return explicit 429/503 behavior with retry headers, which is good. But the shared in-memory rate limiter and mixed fallback behavior mean degradation semantics are only partially standardized across the public edge.

#### P3

- **Retry semantics are present conceptually, but not clearly carried through UI decisions everywhere**
  - Files: `src/lib/error-handling.ts`, assorted UI containers/hooks
  - The central helper knows that 429 and 5xx errors are retryable and 4xx/auth errors are not, but many surfaces still reduce everything to a generic inline message or toast without clear recovery guidance.

### Positive Findings

- `src/lib/error-handling.ts` is one of the cleaner cross-cutting infrastructure pieces in the repo.
- `tests/unit/query-error-normalization.test.ts` proves that raw validation issues are normalized into safe, user-friendly query errors.
- `tests/unit/server/protected-auth-context.test.ts` proves the organization context is set explicitly in auth helpers.
- The Resend and Xero webhook routes are stronger than average examples of specific status handling, logging, and retriable failure signaling.

### Deferred Cleanup Candidates

Safe short-term:
- stop returning raw server error messages from route handlers where the client does not need them
- route more UI-level query/mutation failures through the centralized normalization layer
- replace direct `error.message` rendering in the highest-traffic operator surfaces with normalized user-facing copy

Structural medium-term:
- define one canonical error-response pattern for API routes
- make retryability and recovery guidance visible in the most important operator flows instead of leaving it implicit in logs or helper code

---

## Specialized Addendum D: Query Degradation and Silent Failure Pass

**Status:** Initial query-failure audit complete  
**Scope:** TanStack Query hooks, normalized query errors, partial-summary warnings, null-result handling, silent degradation patterns  
**Validation evidence:** direct inspection of hook/query usage across support, service, warranty, customers, orders, communications, jobs, and dashboard surfaces, plus existing `tests/unit/query-error-normalization.test.ts` and `tests/unit/dashboard/overview-metrics.test.ts`.

### Executive Read

What is solid:
- The repo does have a real mechanism for safe query normalization via `normalizeQueryError`.
- There are already some good “don’t silently zero this out” patterns, especially in dashboard summary handling.
- A few domains, especially warranty, service, orders, and activities, are already using better fallback messages.

What is fragile:
- Hook adoption is inconsistent. Some queries normalize failures; many still just throw `new Error('Query returned no data')`.
- Partial degradation is sometimes surfaced only as a small warning string while the rest of the page keeps rendering incomplete headline data.
- The difference between “query failed loudly,” “query failed but got normalized,” and “query degraded into partial state” is not consistent enough for operators.

What is messy:
- The app has at least three query-failure styles at once:
  1. normalized user-facing fallback errors
  2. raw `Query returned no data`
  3. partial-page warning banners with incomplete metrics
- That inconsistency is exactly why these failures feel silent and annoying rather than explicit and actionable.

### Findings

#### P2

- **Many hooks still collapse null results into generic `Query returned no data` failures**
  - Files: `src/hooks/support/use-issues.ts`, `src/hooks/users/use-users.ts`, `src/hooks/communications/use-campaigns.ts`, `src/hooks/jobs/use-job-scheduling.ts`, `src/hooks/support/use-sla.ts`, and many others
  - This pattern is widespread. When the query result is unexpectedly null, many hooks throw a generic error string without normalization. That means operators often get poor feedback, and developers lose the domain-specific context that the query normalization helper was designed to preserve.

- **Normalized query handling is good where it exists, but it is not the default**
  - Files: `src/hooks/service/use-service-systems.ts`, `src/hooks/warranty/claims/use-warranty-claims.ts`, `src/hooks/orders/use-orders.ts`, `src/hooks/activities/use-activities.ts`
  - These are the healthier examples: they catch failures, normalize them, and attach domain-specific fallback copy. The blind spot is not capability, it is uneven adoption across the repo.

- **Partial-summary degradation can still feel too subtle for high-value operator pages**
  - Files: `src/hooks/customers/use-customer-detail.ts`, dashboard overview metrics
  - The customer detail hook uses `extendedDataWarning` to say order metrics are temporarily unavailable while still rendering the rest of the page. That is better than silently zeroing values out, but it can still be too quiet for a critical summary surface. The dashboard test proves the repo is aware of this failure mode; the UX treatment is just not consistently strong enough yet.

- **Silent degradation is especially risky on composite detail pages**
  - Files: customer detail, support landing/dashboard, warranty detail containers, other container-heavy views
  - When a page composes several queries and only one degrades, the resulting page can look “mostly fine” while a key metric or action surface is missing or stale. This is the exact class of failure that annoys operators most because it erodes trust without producing a clear broken-state moment.

#### P3

- **There is not yet a canonical rule for when a composite page should warn, hard-fail, or degrade gracefully**
  - Evidence: mixed hook/container patterns
  - Some pages hard-fail, some pages show a warning, and some pages quietly rely on default or absent values. The repo needs a clearer standard for “headline data failure” versus “secondary panel failure.”

### Positive Findings

- `src/lib/error-handling.ts` provides a solid base for query normalization.
- `tests/unit/query-error-normalization.test.ts` proves validation-heavy query failures can be sanitized well.
- `tests/unit/dashboard/overview-metrics.test.ts` explicitly protects against silently zeroing unavailable summaries.
- The better query hooks already demonstrate the pattern worth standardizing.

### Deferred Cleanup Candidates

Safe short-term:
- replace generic `Query returned no data` throws in the highest-traffic hooks with `normalizeQueryError(...)`
- identify which composite pages need stronger visible degradation states when headline queries fail
- add regression tests for “partial summary unavailable” behavior on other important detail views

Structural medium-term:
- define one canonical query-failure standard for hooks:
  - null result handling
  - domain-specific fallback messages
  - when to hard-fail vs warn vs degrade
- standardize composite page behavior so operators can immediately tell when key data is unavailable
