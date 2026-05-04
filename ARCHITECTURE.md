# Architecture

RENOZ-V3 is a multi-tenant lithium-ion battery OEM operations platform for RENOZ Energy.

This file is the public engineering overview. For deeper rules and operational detail, use the linked docs rather than treating this file as the single source of truth.

## System Shape

The app is organized around a few major domains:

- `orders / fulfillment`: commercial order truth, delivery state, shipment history, and operational closeout
- `products / serialized assets`: SKU, product, serial number, and battery asset lifecycle tracking
- `procurement / receiving / warehouse`: supplier intake, purchase orders, receiving, locations, transfers, and stock movement
- `inventory`: serialized stock, FIFO valuation, receiving, transfers, returns, and warehouse integrity
- `support`: issue intake, issue resolution, RMAs, remedy execution
- `warranty`: entitlements, warranties, claims, claimant-aware flows
- `finance / documents / communications`: operational finance artifacts, customer communications, and workflow records
- `service / projects`: secondary workflows for occasional service or project work

## Technical Stack

- `TanStack Start` for routing, SSR, and server functions
- `React 19` for UI
- `TanStack Query` for server-state fetching and invalidation
- `Drizzle ORM` over PostgreSQL / Supabase
- `Tailwind CSS 4` and `shadcn/ui` for UI primitives
- `Trigger.dev` for background jobs
- `Zod` for contracts and schema boundaries

## Repo Structure

High-signal areas:

- `src/routes/`: TanStack file-based routes and route handlers
- `src/server/functions/`: domain server functions and shared workflow helpers
- `src/hooks/`: data hooks and mutation orchestration
- `src/components/`: domain, shared, and UI components
- `src/lib/schemas/`: Zod contracts and shared wire types
- `drizzle/schema/` and `drizzle/migrations/`: schema truth and SQL migrations
- `docs/`: curated operational, architectural, and engineering-reference docs

## Documentation Guide

Start here depending on your goal:

- [docs/README.md](./docs/README.md): canonical docs index
- [docs/reference/product-owner-goal.md](./docs/reference/product-owner-goal.md): standing product-owner and repo-maintainer goal
- [docs/reference/maintainer-sprint-process.md](./docs/reference/maintainer-sprint-process.md): repo-maintainer sprint process and closeout model
- [docs/reference/repo-standards.md](./docs/reference/repo-standards.md): repo conventions and architectural standards
- [docs/reference/schema-trace.md](./docs/reference/schema-trace.md): data-flow and schema trace-through methodology
- [docs/operations/deployment.md](./docs/operations/deployment.md): deployment, migration, and rollback guide
- [docs/architecture/support-issue-rma-b2b2c.md](./docs/architecture/support-issue-rma-b2b2c.md): support/warranty/service product-model reference

## Public vs Internal Docs

This repository keeps a small amount of contributor-oriented material in-repo:

- [CLAUDE.md](./CLAUDE.md) is local contributor and agent guidance
- `docs/` is intentionally curated toward stable repo knowledge, not sprint-by-sprint history
- production release automation targets `main` and runs through GitHub Actions + Vercel CLI

If you are new to the repo, start with `README.md`, then this file, then `docs/README.md`.
