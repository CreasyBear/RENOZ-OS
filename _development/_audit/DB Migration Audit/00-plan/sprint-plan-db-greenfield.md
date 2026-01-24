# Sprint Plan - Renoz v3 DB Greenfield Alignment

This plan assumes no prior knowledge of the renoz-v3 data model and treats the Supabase project as greenfield while acknowledging existing tables. The goal is to align domains, foreign keys, query patterns, and cross-domain interactions before any migrations or implementation.

## Domain Diff Standard (Greenfield)

- For each domain, the `domain-<name>-diff.md` compares **PRD vs Drizzle** only.
- Supabase diffs are deferred unless explicitly requested.

## Scope and Outputs

- Primary outputs are audit artifacts in `renoz-v3/_development/_audit/`.
- Each task is atomic, testable, and builds on prior tasks.
- Validation uses tests when applicable; otherwise a concrete verification artifact is required.

## Progress Update (Current)

- Sprint 1 domain audits completed:
  - activities, communications, customers, dashboard, financial, inventory, jobs,
    orders, pipeline, products, reports, settings, suppliers, support, users, warranty
- Sprint 0 artifacts (domains list, Supabase snapshot, glossary, checklist) not yet captured in this plan.

## Sprint 0 - Orientation and Baseline Capture

Goal: establish ground truth for current DB and renoz-v3 domain assumptions.

### 0.1 Inventory renoz-v3 domains

- Task: Identify major business domains from codebase and docs.
- Validation: Create `domains.md` with domain list and 1-2 sentence descriptions.

### 0.2 Capture current Supabase schema snapshot

- Task: Use Supabase MCP to extract tables, columns, FKs, indexes, RLS, enums.
- Validation: Create `schema-snapshot.json` (raw) and `schema-snapshot.md` (readable summary).

### 0.3 Build entity glossary

- Task: Map business terms to likely entities and tables.
- Validation: Create `glossary.md` with term, definition, and table mapping.

### 0.4 Establish audit checklist

- Task: Define FK, index, RLS, naming, and data consistency review checklist.
- Validation: Create `audit-checklist.md` with pass/fail criteria.

### Sprint 0 Review Checklist

- Domains documented and mapped to likely entities.
- Supabase schema snapshot complete and readable.
- Audit checklist defined with explicit pass/fail criteria.

## Sprint 1 - Domain Modeling (Single-Domain Focus)

Goal: define ideal schema per domain without cross-domain coupling.

Repeat tasks below for each domain (auth/identity, orgs/memberships, CRM core, activities, products/services, orders/fulfillment, billing, audit/events).

### 1.x.1 Define domain tables and columns

- Task: Draft table list, columns, data types, and nullability per domain.
- Validation: `domain-<name>-tables.md` for each domain.

### 1.x.2 Define domain-internal constraints

- Task: Specify FKs, uniqueness, checks, default values within the domain.
- Validation: `domain-<name>-constraints.md` with explicit constraints.

### 1.x.3 Diff vs PRD

- Task: Compare current Drizzle schema to PRD for that domain.
- Validation: `domain-<name>-diff.md` with table-level differences (PRD vs Drizzle).

### Sprint 1 Review Checklist

- Each domain has tables, constraints, and diff artifacts.
- No cross-domain dependencies introduced yet.

## Sprint 2 - Cross-Domain Relationships

Goal: align inter-domain FKs, ownership boundaries, and interaction rules.

### 2.1 Build cross-domain FK map

- Task: Enumerate cross-domain relationships with cardinality.
- Validation: `cross-domain-fk-map.md` with relationship table.

### 2.2 Define ownership boundaries

- Task: Define which domain owns each shared entity and lifecycle rules.
- Validation: `ownership-boundaries.md` with ownership and lifecycle notes.

### 2.3 RLS impact assessment

- Task: For each cross-domain query path, confirm RLS compatibility.
- Validation: `rls-cross-domain.md` listing query paths and expected policies.

### Sprint 2 Review Checklist

- All cross-domain relationships identified with ownership and RLS notes.
- Any ambiguous ownership documented for resolution.

## Sprint 3 - Query Patterns and Index Design

Goal: ensure schema supports intended read/write patterns.

### 3.1 Define critical queries per domain

- Task: List primary list/detail/search/rollup queries per domain.
- Validation: `queries-<domain>.md` for each domain.

### 3.2 Validate FK and index coverage

- Task: Ensure indexes support filters, joins, and sort orders.
- Validation: `indexes-coverage.md` mapping queries to indexes.

### 3.3 Validate cardinality assumptions

- Task: Confirm FK cardinalities do not create fan-out or dead-end queries.
- Validation: `cardinality-review.md` with assumptions and evidence.

### Sprint 3 Review Checklist

- Each critical query has index support.
- Cardinality assumptions documented and consistent.

## Sprint 4 - Target Schema Alignment

Goal: consolidate into a final target schema aligned with existing Supabase state.

### 4.1 Target schema specification

- Task: Compile final schema definition (tables, columns, FKs, indexes, enums, RLS).
- Validation: `target-schema.md` with full schema description.

### 4.2 Resolve conflicts and gaps

- Task: Identify keep/modify/deprecate decisions for existing tables.
- Validation: `schema-conflicts.md` with resolution decisions.

### 4.3 Migration-readiness checklist (no execution)

- Task: Define readiness checklist for future migration work.
- Validation: `migration-readiness.md` with explicit pass/fail gates.

### Sprint 4 Review Checklist

- Target schema aligned to existing DB state.
- Conflict resolutions documented and approved.

## Sprint 5 - Pre-Mortem and Risk Review

Goal: de-risk design before implementation.

### 5.1 Run deep pre-mortem on schema design

- Task: Apply pre-mortem checklist to target schema and interactions.
- Validation: `premortem-db-design.md` with tigers, elephants, and papers.

### 5.2 Map mitigations and acceptance

- Task: Provide mitigation or acceptance rationale per risk.
- Validation: `premortem-mitigations.md` with decisions and owners.

### Sprint 5 Review Checklist

- High risks mitigated or explicitly accepted.
- Pre-mortem artifacts complete and reviewed.

## Definition of Done (Plan Level)

- All audit artifacts produced in `_development/_audit/`.
- Each sprint review checklist passes.
- Target schema and risk review are ready for implementation planning.
