# Entity Glossary (Initial)

Each term maps to the intended renoz-v3 entity/table(s). Where the Supabase DB uses a different name, it is noted.

| Term | Definition | Intended Tables | Supabase Tables (if different) |
| --- | --- | --- | --- |
| Organization | Tenant/workspace boundary | `organizations` | `public.organizations` |
| User | App user with role and org membership | `users`, `user_sessions`, `user_preferences` | `public.users`, `public.user_preferences` |
| Customer | Company or buyer entity | `customers` | `public.customers` |
| Contact | Person linked to a customer | `contacts` | `public.contacts` |
| Address | Customer address record | `addresses` | `public.addresses` |
| Opportunity | Sales pipeline record | `opportunities` | `public.opportunities` |
| Opportunity Activity | Logged interaction on opportunity | `opportunity_activities` | `public.opportunity_activities` |
| Order | Order header with financials | `orders` | `public.orders` |
| Order Line Item | Product/service lines on an order | `order_line_items` | `public.order_items` |
| Shipment | Order shipment/fulfillment | `order_shipments`, `shipment_items` | not present |
| Order Amendment | Change record on an order | `order_amendments` | not present |
| Product | Catalog item | `products` | `public.products` |
| Inventory Item | Stock at location | `inventory` | `public.inventory_items` |
| Inventory Movement | Stock change audit | `inventory_movements` | `public.inventory_movements` |
| Job | Installation/work order | `jobs`, `job_assignments` | `public.job_assignments` |
| Job Photo | Job evidence/attachment | `job_photos` | `public.job_photos` |
| Issue | Support ticket | `issues` | `public.issues` |
| Issue Activity | Support timeline event | `issue_activities` | `public.issue_activities` |
| Warranty | Warranty record | `warranties` | `public.warranties` |
| Warranty Registration | External warranty form | `warranty_registrations` | `public.warranty_registrations` |
| Supplier | Vendor record | `suppliers` | `public.suppliers` |
| Purchase Order | Procurement order | `purchase_orders`, `purchase_order_items` | `public.purchase_orders`, `public.purchase_order_items` |
| Activity Log | Polymorphic audit feed | `activities` | not present |
| Audit Log | Immutable audit trail | `audit_logs` | `public.audit_logs` |
| Email History | Email delivery log | `email_history` | `public.email_history` |
| Notification | In-app notification | `notifications` | `public.notifications` |
| Dashboard Target | KPI target value | `targets` | not present |
| Scheduled Report | BI report schedule | `scheduled_reports` | not present |
| Dashboard Layout | User-specific layout | `dashboard_layouts` | not present |
