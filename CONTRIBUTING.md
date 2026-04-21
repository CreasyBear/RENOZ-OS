# Contributing

This repository has a lot of workflow-heavy product logic. The fastest way to make good changes is to work with the existing patterns instead of inventing new ones per feature.

## Before You Start

Read these first:

1. [README.md](./README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [docs/README.md](./docs/README.md)
4. [docs/reference/repo-standards.md](./docs/reference/repo-standards.md)
5. [docs/reference/schema-trace.md](./docs/reference/schema-trace.md)

For support, warranty, or RMA work, also read:

1. [docs/workflows/warranty-support-phase2-workflows.md](./docs/workflows/warranty-support-phase2-workflows.md)
2. [docs/architecture/support-issue-rma-b2b2c.md](./docs/architecture/support-issue-rma-b2b2c.md)

## Local Setup

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

The app runs on `http://localhost:3000`.

## Quality Bar

Run the relevant checks before opening or landing changes:

```bash
bun run lint
bun run lint:reliability
bun run typecheck
bun run test:unit
bun run build
```

For full release-style validation:

```bash
bun run predeploy
bun run release:verify
```

## Working Conventions

- Use shared schemas from `src/lib/schemas` instead of redefining route or UI contracts locally.
- Use centralized query keys from `src/lib/query-keys.ts`.
- Prefer route -> hook -> server-function -> database flow.
- Keep list/detail/mutation contracts aligned; do not let read-models and workflow responses drift.
- Use transactions for multi-step mutations.
- Avoid N+1 queries and query-in-loop patterns.
- Prefer updating the curated docs in `docs/operations/`, `docs/reference/`, `docs/workflows/`, and `docs/architecture/` instead of dropping new root-level notes.

## Documentation Expectations

When shipped behavior changes materially:

- update `README.md` if the repo front door is affected
- update `docs/README.md` if a new major doc should be discoverable
- update operational companions in `docs/workflows/`, `docs/reliability/`, or domain docs where appropriate

## Public Repo Notes

Some top-level files are intentionally more internal than a typical open-source repo:

- [CLAUDE.md](./CLAUDE.md) captures local contributor and agent operating guidance
- the rest of the human entry surface should stay small and curated

That is acceptable, but the public entry points should remain:

- `README.md`
- `ARCHITECTURE.md`
- `docs/README.md`
- `CONTRIBUTING.md`

## Pull Requests

Aim for:

- clean commit boundaries
- accurate documentation for shipped behavior
- no unrelated local tooling or generated clutter in the diff
- tests that protect the contract you changed, not just the exact implementation
- PRs should target `main`
