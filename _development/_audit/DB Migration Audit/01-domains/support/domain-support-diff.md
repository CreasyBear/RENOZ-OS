# Domain: Support — Diff (PRD vs Drizzle)

## issues
- PRD expects `sla_tracking_id` FK and explicit user/customer relations; Drizzle uses `slaTrackingId` but does not declare FK references for `customerId`, `assignedToUserId`, or `slaTrackingId`.
- Drizzle adds escalation and hold fields (`escalatedAt`, `holdReason`, `escalationReason`) beyond PRD.

## sla_configurations / sla_tracking / sla_events
- PRD specifies SLA configuration and tracking using the unified SLA engine; Drizzle aligns and also adds `sla_events` audit table (not explicitly listed in PRD stories).
- Drizzle uses `business_hours_config` and `organization_holidays` tables for SLA timing rather than `business_hours`/`holidays` naming in settings PRD.

## escalation_rules
- PRD expects escalation rules and manual escalation improvements; Drizzle adds `escalation_history` table for audit trail (not explicitly listed).

## return_authorizations
- PRD expects `return_authorizations` with items; Drizzle models item linkage via separate `rma_line_items` table.
- Drizzle adds workflow timestamps and resolution/inspection JSON beyond PRD.

## issue_templates
- PRD includes templates with required fields and usage count; Drizzle aligns and adds `titleTemplate`, `defaults`, and soft delete.

## issue_feedback vs csat_responses
- PRD names `issue_feedback`; Drizzle implements `csat_responses` with token-based submission, source tracking, and user/customer attribution.

## knowledge base
- PRD defines `kb_articles` and `kb_categories`; Drizzle aligns and adds SEO fields, view/helpful counters, and soft delete.

## Resolutions
- Keep `csat_responses` as the canonical table; map PRD `issue_feedback` to it in docs.
- Business hours/holidays are canonicalized under settings, with SLA referencing settings.
 
## Open Questions
- Should we add explicit FK constraints on `issues.customerId`, `issues.assignedToUserId`, and `issues.slaTrackingId` to match PRD intent?
