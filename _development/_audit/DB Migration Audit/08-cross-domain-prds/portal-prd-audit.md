# Cross-Domain PRD Audit — Portal

## PRD Summary
- Customer self-service portal for quotes, orders, jobs, invoices, support tickets.
- Magic-link auth with 30-day session, rate limits.
- Own-data-only access; no internal notes or cost/margin exposure.

## Schema Expectations (from PRD)
- `customers`, `contacts`, `opportunities`, `orders`, `jobs`, `invoices`, `support_tickets`.
- Customer session/auth tokens for portal login.

## Current Model Alignment
- Quotes, orders, jobs exist.
- Financials use `orders` as invoice-of-record; no `invoices` table defined.
- Support uses `issues` (not `support_tickets`).

## Gaps / Mismatches
- **Invoices**: PRD expects `invoices` table; current model uses `orders`. Needs decision or mapping.
- **Support tickets**: PRD expects `support_tickets`; current model uses `issues`.
- **Portal auth**: no dedicated customer portal auth/session schema identified.
- **Portal branding**: needs org-level portal branding config (could live in `organizations.settings`).

## RLS / Security Notes
- Own-data-only RLS requires customer-scoped policies (not org-scoped).
- Must enforce suppression of internal notes, cost/margin, and internal-only fields.

## Recommendations
- Define a `customer_portal_sessions` table and magic-link tokens.
- Decide `orders` vs `invoices` for portal invoice views and document mapping.
- Map `issues` to `support_tickets` or add compatibility view.
