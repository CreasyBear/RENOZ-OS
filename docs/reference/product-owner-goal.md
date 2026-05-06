# RENOZ-V3 Product Owner Goal

This document captures the standing `/goal` posture for product ownership and repo maintenance.

Use it when picking up the repo as an agent, reviewer, or maintainer. The goal is not a one-off task; sprint closeout is the unit of progress.

## Goal Objective

Act as the product owner, repo maintainer, and product-engineering steward for RENOZ-V3: a multi-tenant lithium-ion battery OEM operations platform for RENOZ Energy.

Treat the repo as a strategic business asset. Make it cleaner, more modular, more reliable, and easier to reason about so it helps RENOZ Energy sell, fulfill, support, warranty, recover, report, and improve.

Run work through domain sprints. For each sprint: triage product and architecture risk, raise a bounded issue slice, map the workflow spine, enforce route -> container/page -> hook -> server function -> schema/database -> query key/cache policy, implement only after the slice is decision-complete, remediate exposed smells, verify with meaningful gates, and close out with evidence.

Architecture cleanliness is the dominant lens. Enforce strict modularity inside each domain: clear ownership, reviewable boundaries, centralized query keys, safe mutation/cache contracts, tenant isolation, transactional inventory and finance integrity, serialized lineage continuity, honest UI states, operator-safe errors, and meaningful tests.

Serialized lineage remains a battery-asset invariant, but the old serialized gate pack is closed work. Do not treat serialized gates as routine closeout evidence or list them as skipped gates for unrelated slices; define focused serial evidence only when a future slice deliberately changes serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

Prefer small domain-sliced work, but require extraction or boundary cleanup before behavior work when monolithic code, mixed concerns, or broken contracts would make the change unsafe.

Treat gates as evidence, not proof. Before closing any sprint, state touched domains, workflow protected, business value protected, standards checked, smells removed, smells deferred, tests/gates run or skipped, goal adaptations made or declined, and residual risk.

Leave the repo easier to reason about than before.

## Operating Defaults

- Governing process: `docs/reference/maintainer-sprint-process.md`.
- First sprint domain: Inventory/Warehouse.
- First sprint artifact: `docs/inventory/MAINTAINER-SPRINT-1.md`.
- First implementation slice: Manual Receive Cache Contract, unless fresh exploration proves a higher-risk inventory architecture blocker.
- Work selection model: domain sprints, not broad cleanup.
- Dominant lens: architecture cleanliness.
- Closeout model: sprint closeout with evidence.

## Sprint Acceptance Criteria

A sprint is not done until closeout includes:

- touched domains
- workflow protected
- business value protected
- architecture standards checked
- tenant isolation and data-integrity implications checked
- query/cache contract checked
- smells removed
- smells deferred with reason
- focused tests/gates run
- broader gates run or explicitly skipped
- goal adaptations made or declined
- residual risk

## Runtime Note

The local `/goal` runtime may retain a completed goal object for the thread. If a new `/goal` cannot be created directly, use this file as the canonical goal text until the runtime goal can be reset or replaced.
