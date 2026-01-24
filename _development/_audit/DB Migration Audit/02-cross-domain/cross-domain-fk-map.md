# Cross-Domain FK Map

This map captures cross-domain relationships observed in Drizzle schemas, with notes on
missing explicit FKs or PRD alignment gaps.

## Relationships

| From Domain | To Domain | Relationship | Notes |
| --- | --- | --- | --- |
| users | settings | `users.organizationId -> organizations.id` | Organizations live in settings domain. |
| users | users | `user_sessions.userId -> users.id` | Session tables lack organizationId; rely on user join. |
| users | users | `user_preferences.userId -> users.id` | Preferences table has no organizationId. |
| users | users | `user_onboarding.userId -> users.id` | No organizationId; relies on user join. |
| settings | users | `data_exports.requestedBy -> users.id` | Cross-domain requestor. |
| customers | users | `customerActivities.assignedTo -> users.id` (implicit) | Column exists; FK not declared. |
| customers | customers | `contacts.customerId -> customers.id` | In-domain FK. |
| customers | customers | `addresses.customerId -> customers.id` | In-domain FK. |
| pipeline | customers | `opportunities.customerId -> customers.id` | Sales workflow. |
| pipeline | customers | `quotes.customerId -> customers.id` | Legacy/current quote. |
| pipeline | customers | `opportunities.contactId -> contacts.id` | Contacts live under customers domain. |
| pipeline | users | `opportunities.assignedTo -> users.id` | Cross-domain assignee. |
| pipeline | pipeline | `opportunityActivities.opportunityId -> opportunities.id` | In-domain. |
| pipeline | pipeline | `quoteVersions.opportunityId -> opportunities.id` | In-domain. |
| orders | customers | `orders.customerId -> customers.id` | Core CRM linkage. |
| orders | products | `orderLineItems.productId -> products.id` | Nullable product reference. |
| orders | orders | `orderLineItems.orderId -> orders.id` | In-domain. |
| orders | orders | `orderShipments.orderId -> orders.id` | In-domain. |
| orders | orders | `shipmentItems.orderLineItemId -> orderLineItems.id` | In-domain. |
| orders | customers | `orderTemplates.defaultCustomerId -> customers.id` | Template default. |
| orders | products | `orderTemplateItems.productId -> products.id` | Nullable product reference. |
| products | products | `categories.parentId -> categories.id` | Hierarchy. |
| products | warranty | `products.warrantyPolicyId -> warranty_policies.id` | Cross-domain policy. |
| products | warranty | `categories.defaultWarrantyPolicyId -> warranty_policies.id` | Cross-domain policy. |
| products | customers | `customerProductPrices.customerId -> customers.id` | Per-customer price. |
| products | products | `productPriceTiers.productId -> products.id` | In-domain. |
| products | products | `productBundles.*ProductId -> products.id` | In-domain bundle. |
| products | products | `productImages.productId -> products.id` | In-domain. |
| products | products | `productAttributeValues.productId -> products.id` | In-domain. |
| inventory | products | `inventory.productId -> products.id` | Stock by product. |
| inventory | inventory | `inventory.locationId -> locations.id` | In-domain. |
| inventory | products | `inventoryMovements.productId -> products.id` | Movement references product. |
| inventory | inventory | `inventoryMovements.locationId -> locations.id` | Movement references location. |
| inventory | inventory | `stockCounts.locationId -> warehouseLocations.id` | In-domain. |
| inventory | inventory | `stockCountItems.inventoryId -> inventory.id` | In-domain. |
| inventory | products | `inventoryForecasts.productId -> products.id` | In-domain. |
| inventory | inventory | `inventoryAlerts.locationId -> warehouseLocations.id` | In-domain. |
| inventory | products | `inventoryAlerts.productId -> products.id` | In-domain. |
| jobs | orders | `job_assignments.orderId -> orders.id` | Nullable order linkage. |
| jobs | customers | `job_assignments.customerId -> customers.id` | Job target. |
| jobs | users | `job_assignments.installerId -> users.id` | Assignee. |
| jobs | support | `job_assignments.slaTrackingId -> sla_tracking.id` | SLA linkage. |
| jobs | jobs | `job_tasks.jobId -> job_assignments.id` | In-domain. |
| jobs | users | `job_tasks.assigneeId -> users.id` | Task assignee. |
| jobs | products | `job_materials.productId -> products.id` | Materials usage. |
| jobs | users | `job_time_entries.userId -> users.id` | Time entry user. |
| jobs | support | `job_templates.slaConfigurationId -> sla_configurations.id` | SLA template. |
| communications | users | `email_history.senderId -> users.id` | Nullable sender. |
| communications | customers | `email_history.customerId -> customers.id` | Nullable recipient linkage. |
| communications | customers | `scheduled_emails.customerId -> customers.id` | Nullable recipient linkage. |
| communications | users | `scheduled_emails.userId -> users.id` | Sender. |
| communications | communications | `campaign_recipients.campaignId -> email_campaigns.id` | In-domain. |
| communications | customers | `campaign_recipients.contactId -> contacts.id` | Contact linkage. |
| communications | customers | `scheduled_calls.customerId -> customers.id` | Call subject. |
| communications | users | `scheduled_calls.assigneeId -> users.id` | Call assignee. |
| communications | users | `email_signatures.userId -> users.id` | Optional user signature. |
| financial | orders | `credit_notes.orderId -> orders.id` | Optional linkage. |
| financial | orders | `credit_notes.appliedToOrderId -> orders.id` | Optional linkage. |
| financial | customers | `credit_notes.customerId -> customers.id` | Customer credit. |
| financial | orders | `payment_schedules.orderId -> orders.id` | Payment plan. |
| financial | orders | `reminder_history.orderId -> orders.id` | Reminder target. |
| financial | customers | `statement_history.customerId -> customers.id` | Statement owner. |
| financial | orders | `revenue_recognition.orderId -> orders.id` | Revenue schedule. |
| financial | orders | `deferred_revenue.orderId -> orders.id` | Deferral schedule. |
| suppliers | suppliers | `purchase_orders.supplierId -> suppliers.id` | Core supplier link. |
| suppliers | users | `purchase_orders.orderedBy -> users.id` | Nullable in schema. |
| suppliers | users | `purchase_orders.approvedBy -> users.id` | Nullable in schema. |
| suppliers | products | `purchase_order_items.productId -> products.id` | Nullable product link. |
| suppliers | suppliers | `purchase_order_receipts.purchaseOrderId -> purchase_orders.id` | In-domain. |
| suppliers | suppliers | `purchase_order_receipt_items.purchaseOrderItemId -> purchase_order_items.id` | In-domain. |
| suppliers | users | `purchase_order_approvals.approverId -> users.id` | Approver. |
| suppliers | suppliers | `price_agreements.supplierId -> suppliers.id` | In-domain. |
| suppliers | products | `supplier_price_lists.productId -> products.id` | Pricing by product. |
| suppliers | suppliers | `supplier_price_history.supplierId -> suppliers.id` | In-domain. |
| suppliers | products | `supplier_price_history.productId -> products.id` | In-domain. |
| suppliers | suppliers | `price_change_history.agreementId -> price_agreements.id` | In-domain. |
| support | customers | `issues.customerId -> customers.id` | Column present; FK not declared. |
| support | users | `issues.assignedToUserId -> users.id` | Column present; FK not declared. |
| support | support | `issues.slaTrackingId -> sla_tracking.id` | Column present; FK not declared. |
| support | support | `return_authorizations.issueId -> issues.id` | Column present; FK not declared. |
| support | customers | `return_authorizations.customerId -> customers.id` | Column present; FK not declared. |
| support | orders | `return_authorizations.orderId -> orders.id` | Column present; FK not declared. |
| support | orders | `rma_line_items.orderLineItemId -> order_line_items.id` | Cross-domain order item. |
| support | support | `csat_responses.issueId -> issues.id` | In-domain. |
| support | support | `sla_tracking.slaConfigurationId -> sla_configurations.id` | In-domain. |
| support | support | `sla_events.slaTrackingId -> sla_tracking.id` | In-domain. |
| support | support | `escalation_history.escalationRuleId -> escalation_rules.id` | In-domain. |
| support | support | `kb_articles.categoryId -> kb_categories.id` | In-domain. |
| warranty | support | `warranty_policies.slaConfigurationId -> sla_configurations.id` | SLA shared infra. |
| warranty | customers | `warranties.customerId -> customers.id` | Customer warranty. |
| warranty | products | `warranties.productId -> products.id` | Product warranty. |
| warranty | warranty | `warranties.warrantyPolicyId -> warranty_policies.id` | In-domain. |
| warranty | orders | `warranties.orderId -> orders.id` | Optional linkage. |
| warranty | users | `warranty_claims.assignedUserId -> users.id` | Assignee. |
| warranty | support | `warranty_claims.slaTrackingId -> sla_tracking.id` | SLA shared infra. |
| warranty | warranty | `warranty_extensions.warrantyId -> warranties.id` | In-domain. |
| activities | users | `activities.userId -> users.id` (optional) | Audit actor. |
| activities | users | `activities.createdBy -> users.id` | Audit creator. |
| activities | all | `activities.entityType/entityId` | Polymorphic references (no FK). |
