# RENOZ-V3 Maintainer Sprint Process

This document captures the standing repo-maintainer operating model for RENOZ-V3.

The goal is a vision: own RENOZ-V3 as a saleable, scalable lithium-ion battery OEM operations platform for RENOZ Energy. The sprint process is how that vision becomes durable work.

RENOZ-V3 should become a strategic business asset, not a maintenance burden. Repo maintenance exists to make RENOZ Energy easier to run: cleaner sales and order flow, more reliable fulfillment, stronger warehouse truth, faster support, clearer warranty/RMA handling, better financial closeout, and less cognitive load for the people operating the business.

## Product Truth

RENOZ-V3 is a multi-tenant lithium-ion battery OEM operations platform built around RENOZ Energy's internal workflows.

Primary workflows:

- ordering and fulfillment
- customers, dealers, partners, and end users
- products, SKUs, serial numbers, and battery assets
- procurement, supplier intake, and receiving
- inventory and warehouse management
- stock movements, reservations, returns, and valuation
- warranties and entitlement
- support issues and claims
- RMAs, remedies, replacements, credits, and closeout
- documents, communications, and operational finance

Services and projects exist, but they are secondary workflows. They should not pull the architecture away from the battery OEM operations spine.

```text
Customer / partner / end user
        |
Order / procurement / receiving
        |
Serialized battery product + warehouse stock
        |
Fulfillment / install / delivery context
        |
Warranty entitlement
        |
Support issue / claim
        |
RMA / replacement / credit / remedy
        |
Inventory + finance + document closeout
```

## Business Asset Standard

Code quality is a means, not the end.

Every maintainer sprint should ask:

- Does this make RENOZ Energy easier to sell, fulfill, support, warranty, recover, report, or improve?
- Does this reduce cognitive load for Joel or future operators?
- Does this make a broken or confusing workflow dependable?
- Does this make the next product or engineering move easier?
- Does this turn the repo into compounding leverage instead of another thorn in the side?

Work that improves architecture but does not improve product trust, operator speed, business visibility, or future momentum should be challenged.

## Maintainer Posture

Act like a strong product engineer taking personal ownership of the repo.

Demand:

- clear domain ownership
- small, reviewable changes
- honest UI states
- explicit workflow contracts
- centralized query keys and cache invalidation
- tenant isolation in server functions, database queries, cache keys, and UI assumptions
- transactional inventory and finance integrity
- serialized lineage continuity for battery assets
- tests that protect real operator workflows
- business-value judgment in each sprint
- closeout notes that explain judgment, not only commands

Do not demand:

- a rewrite before progress
- broad cleanup without a domain slice
- feature expansion before reliability
- polish that hides broken operational truth
- abstraction that makes the next change harder to understand

## Sprint Loop

Every maintainer sprint follows this loop:

```text
1. Triage
   |
   v
2. Raise issue / slice
   |
   v
3. Architect
   |
   v
4. Implement
   |
   v
5. Remediate
   |
   v
6. Verify
   |
   v
7. Close out
```

### 1. Triage

Start from product risk, not code aesthetics.

Ask:

- Which operator workflow is broken, confusing, slow, or unsafe?
- What business value is blocked by this defect or friction?
- Which domain owns the failure?
- Which adjacent domains are touched?
- Is this a product-truth issue, architecture issue, UX issue, data-integrity issue, test issue, or DX issue?
- What is the smallest slice that makes the repo easier to reason about?

Triage output:

- one target workflow
- owning domain
- overlap seams
- business impact
- user/operator impact
- suspected code paths
- initial risk level

### 2. Raise Issue / Slice

Convert triage into a concrete maintainer slice.

Good slices:

- "Inventory receiving invalidates product movement caches through centralized query keys."
- "RMA receive flow distinguishes blocked, failed, and completed states."
- "Warranty claim detail stops leaking raw server errors to operators."
- "Support issue detail extracts remedy readiness into a tested subcomponent."

Bad slices:

- "Clean inventory."
- "Refactor support."
- "Improve UX."
- "Make errors better."

Issue output:

- domain
- workflow
- invariant to protect
- business value protected or unlocked
- files likely touched
- tests expected
- out-of-scope boundaries

### 3. Architect

Use the standard data-flow shape unless there is a documented reason not to.

```text
route
  -> container/page
  -> domain component
  -> hook
  -> server function
  -> schema/database
  -> query key/cache policy
```

Architecture checks:

- Does one domain own the workflow contract?
- Are route search schemas outside route files?
- Are query keys centralized in `src/lib/query-keys.ts`?
- Does every mutation state its invalidation and rollback behavior?
- Does every server function enforce organization/tenant scope?
- Are tenant IDs, organization IDs, or user-scoped assumptions explicit at every data boundary?
- Does the UI distinguish empty, loading, stale, failed, blocked, and degraded states?
- Are inventory, warranty, RMA, and finance side effects traceable?
- Do inventory mutations preserve quantity, movement, cost-layer, valuation, and serialized lineage continuity in one coherent transaction?

Architect output:

- data-flow map
- touched contracts
- failure modes
- test plan
- deliberate deferrals

### 4. Implement

Make the smallest change that cleanly expresses the architecture.

Rules:

- Do not mix structural rewrites and behavior changes unless the structure blocks safe behavior.
- Prefer local domain helpers over new shared abstractions.
- Split large files only along workflow responsibilities.
- Keep compatibility shims when removing them would widen the blast radius.
- Preserve existing domain patterns unless they are the defect.

Implementation output:

- code patch
- tests
- updated docs only where future maintainers benefit

### 5. Remediate

Before verification, remove the mess exposed by the slice.

Remediation checks:

- no new literal query keys when helpers exist
- no raw `error.message` in operator-facing surfaces without normalization
- no fake empty states for failed reads
- no broad invalidation where a narrower key is available
- no tenant-unsafe queries
- no untested status transitions or side effects
- no new large mixed-concern component without a reason

Remediation output:

- smells removed
- smells deferred with reason
- follow-up issue candidates

### 6. Verify

Gates are evidence, not proof of quality.

Run the narrowest meaningful gates first, then broader gates when risk justifies them.

Default closeout checks:

```bash
bun run lint
bun run typecheck
<focused test command for the touched workflow>
git diff --check
```

Broader gates should be risk-selected:

- Run `bun run test:unit` or `bun run build` when the slice touches shared contracts, build-time behavior, route loading, or a cross-domain workflow.
- Run `bun run lint:reliability` when the slice touches one of its guarded contracts: route casts, pending dialog guards, read-path query guards, or serialized read auto-upsert policy.
- The serialized gate pack is closed and no longer part of routine maintainer closeout. Future serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work should define focused evidence inside that slice instead of rerunning the old default gate pack.
- Run finance, document, release, or deploy gates only when the slice touches those contracts or when preparing a release.

If local `bun run` is broken, run the underlying direct tool commands and record the reason.

Verification output:

- focused tests run
- broad gates run or skipped
- manual QA run or deferred
- known environmental issues

### 7. Close Out

Every slice closes with maintainer judgment.

Closeout must state:

- touched domains
- workflow spine protected
- business value improved or protected
- standards checked
- smells removed
- smells deferred
- tests and gates run
- gates skipped and why
- goal adaptations made or declined
- residual risk

Use this shape:

```text
Touched domains:
Workflow protected:
Business value:
Standards checked:
Smells removed:
Deferred:
Verification:
Goal adaptation:
Residual risk:
```

## First Repo Slices

The current highest-leverage slices are:

1. Product truth: update top-level docs and agent guidance away from renovation/service framing and toward battery OEM operations.
2. Inventory and warehouse: audit serialized stock, receiving, product movement query keys, mutation invalidation, and operator error states. Active sprint artifact: `docs/inventory/MAINTAINER-SPRINT-1.md`.
3. Support/RMA/warranty: clarify support-owned UX versus order-owned RMA orchestration.
4. Error handling: standardize high-traffic operator error states.
5. Large-file risk: pick one workflow-heavy file and extract by responsibility with behavior tests.

## Sprint Artifact Rule

Each concerted sprint should leave an artifact in the owning domain docs before implementation starts. That artifact should include:

- business value
- workflow spine
- pattern map
- source references
- triage findings
- issue ledger
- recommended first implementation slice
- focused gates
- closeout criteria

The artifact is allowed to evolve as code reality disproves assumptions. Any meaningful adaptation should be recorded in the slice closeout.

## Standing Rule

Leave the repo easier to reason about than before. If a change passes gates but makes the next maintainer guess harder, it is not done.
