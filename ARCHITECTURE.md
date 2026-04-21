# Architecture

Renoz CRM v3 is a multi-tenant operations platform for renovation, warranty, service, support, and return-management workflows.

This file is the public engineering overview. For deeper rules and operational detail, use the linked docs rather than treating this file as the single source of truth.

## System Shape

The app is organized around a few major domains:

- `support`: issue intake, issue resolution, RMAs, remedy execution
- `warranty`: entitlements, warranties, claims, claimant-aware flows
- `service`: service owners, service systems, linkage reviews, system history
- `orders / fulfillment / finance`: commercial order truth, payments, credit notes, inventory-linked outcomes
- `inventory`: serialized stock, FIFO valuation, receiving, transfers, returns

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
