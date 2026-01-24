# Migration Sequence Plan (Pre-Deployment Cleanup)

This plan organizes migrations into coherent batches since no migrations have been run yet.
Goal: stable dependency order, predictable rollout, and minimal rework.

## Batch 00 — Foundation + Settings

- Organizations, users, roles, core enums.
- Settings domain: organizations, system settings, custom fields/values.
- Business hours + holidays (canonicalized under settings).
- Audit logs (dedicated table + RLS).
- Validation: schema applies with no cross-domain dependencies missing.

## Batch 01 — Core CRM Entities

- Customers + contacts + addresses.
- Products + categories + pricing tiers.
- Validation: all core entities create/relate correctly.

## Batch 02 — Sales + Orders

- Pipeline: opportunities, activities, quotes, quote versions.
- Orders + line items + templates.
- Order amendments, shipments, shipment items.
- Validation: order/quote flows insert cleanly with FKs.

## Batch 03 — Operations

- Jobs, tasks, materials, time entries, checklists.
- Inventory, movements, stock counts, alerts, cost layers.
- Suppliers, purchase orders, receipts, approvals, price lists.
- Validation: job/inventory/supplier flows pass with FKs + checks.

## Batch 04 — Support + Warranty

- Issues, SLA configuration/tracking, return authorizations, CSAT.
- Warranty policies/claims/extensions.
- Validation: SLA references business hours (settings) without circular deps.

## Batch 05 — Communications

- Email templates, campaigns, recipients.
- Email history (campaign/template FKs now UUID).
- Scheduled emails + history (ensure `email_history` exists before `scheduled_emails`).
- Validation: campaign send and scheduled send insert email_history.

## Batch 06 — Search + Timeline + Portal

- Search tables + outbox + RLS.
- Unified activities view/MV (create base tables before MV).
- Portal identities + portal RLS policies (identities before policies/tests).
- Validation: RLS scripts pass; portal reads scoped correctly.

## Batch 07 — Analytics (Materialized Views)

- Reports tables, dashboard targets/layouts.
- MVs: daily metrics, pipeline, jobs, warranty, current state.
- Validation: refresh jobs succeed, indexes present.

## Batch 08 — Constraints + Indexes

- PRD-required DESC indexes.
- Formula checks (line totals, supplier rating).
- Generated columns (`searchVector`, `quantityAvailable`, `overallRating`).
- Uniqueness constraints (campaign recipients).
- Validation: explain plans show intended index usage.

## Batch 09 — RLS Hardening + Review

- Join-table RLS, polymorphic allowlists.
- Full RLS validation scripts.
- Supabase schema snapshot reconciliation.
- Final schema snapshot reconciliation.

## Notes

- **Pre-flight (safety gates)**:
  - Confirm Supabase `project_id` and DB host match `renoz-website`.
  - Take a schema/data snapshot or export before destructive reset.
  - Require explicit confirmation before dropping `public` tables.

- **Post-flight (verification)**:
  - Apply `drizzle/migrations/0000_common_magneto.sql`.
  - Run `bun run validate:portal-rls`.
  - Run MV refresh job or manual `REFRESH MATERIALIZED VIEW` checks.
  - Sanity check core table counts (`organizations`, `users`, `orders`).

- Any data backfills should be placed in the same batch if small; otherwise split into add/backfill/constrain sub-steps.
- If a table is append-only, avoid update triggers to keep immutability.
