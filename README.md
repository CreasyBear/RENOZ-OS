# RENOZ-V3

RENOZ-V3 is a multi-tenant lithium-ion battery OEM operations platform for RENOZ Energy.

It is built with TanStack Start, React 19, Supabase, and Drizzle ORM. The current codebase supports RENOZ Energy workflows across ordering, customers and partners, products and serial numbers, procurement, inventory, warehouse management, warranties, support, RMAs, documents, communications, and finance.

Services and projects exist, but they are secondary workflows. The center of gravity is battery OEM operations.

## What This Repo Contains

The product currently centers on a few major workflow areas:

- `orders / fulfillment`: commercial order truth, delivery state, shipment history, and operational closeout
- `products / serialized assets`: SKU, product, serial number, and battery asset lifecycle tracking
- `procurement / receiving / warehouse`: supplier intake, purchase orders, receiving, locations, transfers, and stock movement
- `inventory / valuation`: serialized inventory, reservations, FIFO cost layers, returns, and warehouse integrity
- `support / issues / RMAs`: issue intake, diagnosis, RMA creation handoff, remedy execution, and operator closeout
- `warranty / entitlements / claims`: entitlement activation, claimant-aware warranty claims, and warranty-first support context
- `finance / documents / communications`: operational finance artifacts, customer communications, and workflow records

## Tech Stack

- `TanStack Start` for routing, server functions, and SSR
- `React 19` for UI
- `TanStack Query` for server-state management
- `Drizzle ORM` with PostgreSQL / Supabase
- `Tailwind CSS 4` and `shadcn/ui` primitives for UI
- `Trigger.dev` for background jobs
- `Zod` for contracts and validation
- `Vitest` and Testing Library for unit and component coverage

## Quick Start

### Prerequisites

- `Node.js 22`
- `Bun 1.3.9`
- a Supabase project and working environment variables

### Local development

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Quality Gates

Core local checks:

```bash
bun run lint
bun run lint:reliability
bun run typecheck
bun run test:unit
bun run build
```

Run `bun run reliability:serialized-read-policy` only for slices that
deliberately touch serialized lineage, inventory identity, serialized movement,
warranty/RMA serial continuity, or related repair scripts.

Canonical PR/merge gate:

```bash
bun run predeploy
```

Release-only verification before deploying:

```bash
bun run release:verify
```

## Deployment

This repo is set up for a single production deployment model:

- merge into `master`
- GitHub Actions runs the canonical checks
- GitHub Actions deploys to Vercel via Vercel CLI
- post-deploy verification runs via the production probe

- [docs/operations/deployment.md](./docs/operations/deployment.md): deploy setup, environment variables, migration guidance, and rollback notes
- [docs/operations/pre-deployment-checklist.md](./docs/operations/pre-deployment-checklist.md): final readiness checklist before production deploys

## Repository Guide

### Key directories

```text
src/
  components/            UI primitives, shared UI, and domain components
  hooks/                 domain hooks and query integrations
  lib/                   shared schemas, query keys, utilities, and server helpers
  routes/                TanStack file-based routes and route handlers
  server/functions/      domain server functions and shared workflow helpers
  trigger/jobs/          background job definitions

drizzle/
  schema/               database schema definitions
  migrations/           SQL migrations and metadata

docs/
  architecture/         long-lived domain and product-model references
  code-traces/          workflow-grade traces of critical paths
  inventory/            inventory and operator workflow docs
  operations/           deploy, auth, and integration runbooks
  reference/            engineering standards and methodology
  reliability/          mutation, rollout, and release-hardening standards
  workflows/            operator-facing workflow companions

tests/
  unit/                 Vitest unit and component coverage
```

### Important top-level docs

- [ARCHITECTURE.md](./ARCHITECTURE.md): public engineering overview for the app and repo
- [docs/README.md](./docs/README.md): curated documentation index
- [docs/reference/maintainer-sprint-process.md](./docs/reference/maintainer-sprint-process.md): repo-maintainer process for triage, issue slicing, architecture, implementation, remediation, verification, and closeout
- [CLAUDE.md](./CLAUDE.md): local contributor/agent operating guidance used in this repo
- [SECURITY.md](./SECURITY.md): security reporting guidance

## Documentation Map

Start here based on what you are trying to understand:

- product and operator flows: [docs/workflows/warranty-support-phase2-workflows.md](./docs/workflows/warranty-support-phase2-workflows.md)
- support and RMA architecture: [docs/architecture/support-issue-rma-b2b2c.md](./docs/architecture/support-issue-rma-b2b2c.md)
- inventory and valuation model: [docs/inventory/README.md](./docs/inventory/README.md)
- workflow-grade technical traces: [docs/code-traces/README.md](./docs/code-traces/README.md)
- reliability and rollout standards: [docs/reliability/RELIABILITY-STANDARDS.md](./docs/reliability/RELIABILITY-STANDARDS.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup expectations, quality gates, and repo conventions.

## Current Repo Notes

This repository now reads much more cleanly than an internal working tree, but a few things are still intentionally opinionated:

- `CLAUDE.md` is kept because it captures high-signal local operating conventions
- this is a maintainer-led repo with a source-visible `UNLICENSED` policy unless maintainers choose a different license later
- the surviving docs are intentionally biased toward current operational truth, evergreen engineering reference, and a small set of architecture notes
- the codebase is large and workflow-heavy, so the docs index is the best entry point after this README
