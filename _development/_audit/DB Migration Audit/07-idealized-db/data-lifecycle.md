# Data Lifecycle and Retention

## Retention
- Soft delete only where required: customers, orders, products, suppliers.
- Hard delete for ephemeral entities (sessions, tokens) with TTL.

## Archival
- Archive historical `activities` and `email_history` after 12-24 months if needed.
- Keep `statement_history`, `credit_notes` per compliance requirements.

## Audit
- `activities` is immutable append-only.
- Approval decisions and financial changes must be recorded in activities.
