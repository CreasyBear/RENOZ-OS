# Active Context

## Current Focus
- Standardize reports domain end-to-end (Drizzle, Zod, server functions, hooks, UI, jobs).
- Consolidate scheduled reports and targets under reports domain ownership.

## Recent Changes
- Reports schema now includes scheduled reports and targets.
- Reports Zod schemas added for scheduled reports and targets.
- Reports server functions and hooks added, with dashboard proxies retained.
- Query keys extended with reports scheduled reports and targets.
- Settings routes/forms updated to use reports domain.
- Trigger job updated to use reports scheduled reports schema.

## Next Steps
- Finish any remaining dashboard references to reports schemas.
- Run lint on touched files.
