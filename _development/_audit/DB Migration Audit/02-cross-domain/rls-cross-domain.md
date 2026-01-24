# RLS Cross-Domain Assessment

This document lists cross-domain query paths and RLS considerations for multi-tenant isolation.

## Cross-Domain Query Paths

| Query Path | Tables | RLS Considerations |
| --- | --- | --- |
| Customer profile → orders | customers → orders → orderLineItems | Ensure orgId filter on all tables; orderLineItems includes orgId. |
| Customer profile → communications | customers → email_history / scheduled_emails / scheduled_calls | OrgId exists on comms tables; contact joins via customers domain. |
| Customer profile → pipeline | customers → opportunities / quotes | OrgId on pipeline tables; ensure contactId belongs to same org. |
| Customer profile → support | customers → issues / return_authorizations / csat_responses | Issues has orgId but lacks explicit FK enforcement. |
| Customer profile → warranty | customers → warranties / warranty_claims | OrgId on warranty tables; warranty_claims includes customerId. |
| Order detail → financial | orders → credit_notes / payment_schedules / reminder_history / revenue_recognition | OrgId exists on financial tables; ensure orderId belongs to org. |
| Order detail → supplier returns | orders → return_authorizations / rma_line_items | rma_line_items has no orgId; must join via return_authorizations or orderLineItems. |
| Product detail → inventory | products → inventory / inventoryMovements / inventoryForecasts | OrgId exists; ensure productId scope. |
| Product detail → supplier pricing | products → supplier_price_lists / supplier_price_history | OrgId exists; ensure supplier/product same org. |
| Job assignment → SLA | job_assignments → sla_tracking | SLA tables use orgId but entity linkage is polymorphic. |
| Warranty claim → SLA | warranty_claims → sla_tracking | Same as above. |
| Support issue → SLA | issues → sla_tracking | Issues has orgId; FK not declared. |
| Activity feed → entities | activities (entityType/entityId) → any domain | Polymorphic access requires explicit orgId filtering on activities. |
| Custom fields → entities | custom_field_values (entityId) → any domain | Requires org-level enforcement via custom_fields.organizationId. |

## Tables Without Organization ID

These rely on joins to enforce org scoping and should be reviewed for explicit RLS policy coverage:

- `user_sessions`
- `user_preferences`
- `user_onboarding`
- `campaign_recipients`
- `rma_line_items`

## High-Risk RLS Paths (Polymorphic)

- `activities`: entityType/entityId polymorphic references with no FK constraints.
- `custom_field_values`: entityId polymorphic references with no orgId column.
- `sla_tracking`: entityType/entityId polymorphic references; ensure orgId is authoritative.

## RLS Recommendations

- Require `organizationId = auth.orgId()` on all tables with orgId.
- For tables without orgId, enforce join-based policies (e.g., session user → users.organizationId).
- For polymorphic tables, restrict access by organizationId and validate entity ownership in application logic.
