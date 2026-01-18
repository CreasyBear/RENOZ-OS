# Wireframe Readiness Matrix

> **Purpose**: Map wireframes to schema availability and implementation readiness
> **Generated**: 2026-01-10
> **Renoz Context**: Australian B2B battery/window installation CRM

---

## Schema Availability Summary

### Target Schema (greenfield in `renoz-v3/lib/schema/`)

| Schema File | Tables | Status |
|-------------|--------|--------|
| `organizations.ts` | organizations | IMPLEMENTED |
| `users.ts` | users | IMPLEMENTED (basic) |
| `user-preferences.ts` | userPreferences | IMPLEMENTED |
| `audit-logs.ts` | auditLogs | IMPLEMENTED |
| `customers.ts` | customers | IMPLEMENTED |
| `contacts.ts` | contacts | IMPLEMENTED |
| `addresses.ts` | addresses | IMPLEMENTED |
| `customer-activities.ts` | customerActivities | IMPLEMENTED |
| `products.ts` | products, productCategories, inventoryItems, stockMovements | IMPLEMENTED |
| `opportunities.ts` | opportunities, opportunityItems, opportunityActivities | IMPLEMENTED |
| `orders.ts` | orders, orderItems, orderMilestones | IMPLEMENTED |
| `suppliers.ts` | suppliers | IMPLEMENTED |
| `purchase-orders.ts` | purchaseOrders, purchaseOrderItems | IMPLEMENTED |
| `warranties.ts` | warranties, warrantyClaims | IMPLEMENTED |
| `issues.ts` | issues, issueAttachments | IMPLEMENTED |
| `job-assignments.ts` | jobAssignments, jobPhotos | IMPLEMENTED (basic) |
| `activities.ts` | activities | IMPLEMENTED |
| `notifications.ts` | notifications | IMPLEMENTED |
| `email-history.ts` | emailHistory | IMPLEMENTED |
| `ai-conversations.ts` | aiConversations | IMPLEMENTED |

### Missing Schema (Referenced in Wireframes but NOT in codebase)

| Missing Table | Referenced By | PRD Story That Creates It |
|---------------|---------------|---------------------------|
| `creditNotes` | DOM-FIN-001c | DOM-FIN-001a |
| `paymentPlans`, `installments` | DOM-FIN-002c | DOM-FIN-002a |
| `statements`, `statementHistory` | DOM-FIN-004c | DOM-FIN-004a |
| `reminderTemplates`, `reminderHistory` | DOM-FIN-006c | DOM-FIN-006a |
| `revenueRecognition` | DOM-FIN-008c | DOM-FIN-008a |
| `jobTasks` | DOM-JOBS-001c | DOM-JOBS-001a |
| `jobMaterials` | DOM-JOBS-002c | DOM-JOBS-002a |
| `jobTimeEntries` | DOM-JOBS-003c | DOM-JOBS-003a |
| `checklists`, `checklistItems` | DOM-JOBS-004c | DOM-JOBS-004a |
| `jobTemplates` | DOM-JOBS-007c | DOM-JOBS-007a |
| `userGroups`, `userGroupMembers` | DOM-USER-002c | DOM-USER-002a |
| `userDelegations` | DOM-USER-003c | DOM-USER-003a |
| `userOnboarding` | DOM-USER-007c | DOM-USER-007a |
| `emailTemplates` | DOM-COMMS-001c | DOM-COMMS-001a |
| `campaigns` | DOM-COMMS-002c | DOM-COMMS-002a |
| `slaConfigs` | support-sla-tracking | DOM-SUP-001a |
| `rmas` | support-rma-workflow | DOM-SUP-003a |
| `issueTemplates` | support-issue-templates | DOM-SUP-004 |
| `knowledgeBase` | support-knowledge-base | DOM-SUP-007a |

---

## Wireframe Readiness Categories

### Ready Now (Schema Exists)

These wireframes can be implemented immediately - all required schema exists.

| Wireframe | Domain | Schema Available | Status |
|-----------|--------|------------------|--------|
| **Inventory Domain** | | | |
| DOM-INV-001c.wireframe.md | Inventory | products, inventoryItems | READY |
| DOM-INV-002c.wireframe.md | Inventory | inventoryItems, stockMovements | READY |
| DOM-INV-003c.wireframe.md | Inventory | stockMovements | READY |
| DOM-INV-004c.wireframe.md | Inventory | products, inventoryItems | READY |
| **Suppliers Domain** | | | |
| supplier-list.wireframe.md | Suppliers | suppliers | READY |
| supplier-detail.wireframe.md | Suppliers | suppliers | READY |
| po-list.wireframe.md | Suppliers | purchaseOrders | READY |
| po-detail.wireframe.md | Suppliers | purchaseOrders, purchaseOrderItems | READY |
| DOM-SUPP-002d.wireframe.md | Suppliers | suppliers | READY |
| DOM-SUPP-003.wireframe.md | Suppliers | suppliers | READY |
| **Customers Domain** | | | |
| DOM-CUST-001c.wireframe.md | Customers | customers | READY |
| DOM-CUST-002c.wireframe.md | Customers | contacts | READY |
| DOM-CUST-003b.wireframe.md | Customers | customerActivities | READY |
| DOM-CUST-004a.wireframe.md | Customers | customers | READY |
| DOM-CUST-004b.wireframe.md | Customers | customers | READY |
| DOM-CUST-005c.wireframe.md | Customers | customers | READY |
| DOM-CUST-006c.wireframe.md | Customers | customers | READY |
| DOM-CUST-007b.wireframe.md | Customers | customerActivities | READY |
| **Orders Domain** | | | |
| DOM-ORD-001c.wireframe.md | Orders | orders | READY |
| DOM-ORD-002c.wireframe.md | Orders | orders | READY |
| DOM-ORD-003c.wireframe.md | Orders | orders, orderItems | READY |
| DOM-ORD-004c.wireframe.md | Orders | orders | READY |
| DOM-ORD-005c.wireframe.md | Orders | orders | READY |
| DOM-ORD-006c.wireframe.md | Orders | orders | READY |
| DOM-ORD-007.wireframe.md | Orders | orders | READY |
| **Products Domain** | | | |
| DOM-PROD-001c.wireframe.md | Products | products | READY |
| DOM-PROD-002c.wireframe.md | Products | products | READY |
| DOM-PROD-003c.wireframe.md | Products | products, productCategories | READY |
| DOM-PROD-004c.wireframe.md | Products | products | READY |
| DOM-PROD-006c.wireframe.md | Products | products | READY |
| DOM-PROD-007c.wireframe.md | Products | products | READY |
| **Pipeline Domain** | | | |
| pipeline-kanban-board.wireframe.md | Pipeline | opportunities | READY |
| pipeline-forecasting-fields.wireframe.md | Pipeline | opportunities | READY |
| pipeline-quote-builder.wireframe.md | Pipeline | opportunities, opportunityItems | READY |
| pipeline-quote-validity.wireframe.md | Pipeline | opportunities | READY |
| pipeline-win-loss-reasons.wireframe.md | Pipeline | opportunities | READY |
| pipeline-forecasting-report.wireframe.md | Pipeline | opportunities | READY |
| pipeline-quick-quote.wireframe.md | Pipeline | opportunities | READY |
| **Warranty Domain** | | | |
| DOM-WAR-001c.wireframe.md | Warranty | warranties | READY |
| DOM-WAR-003b.wireframe.md | Warranty | warranties | READY |
| DOM-WAR-003c.wireframe.md | Warranty | warranties | READY |
| DOM-WAR-004c.wireframe.md | Warranty | warranties, warrantyClaims | READY |
| DOM-WAR-005b.wireframe.md | Warranty | warranties | READY |
| DOM-WAR-006c.wireframe.md | Warranty | warranties | READY |
| **Dashboard Domain** | | | |
| dashboard-main.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-kpi-cards.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-chart-widgets.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-activity-feed.wireframe.md | Dashboard | activities | READY |
| dashboard-date-range.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-targets.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-comparison.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-scheduled-reports.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-mobile.wireframe.md | Dashboard | Computed from existing | READY |
| dashboard-role-variations.wireframe.md | Dashboard | Computed from existing | READY |
| **Settings Domain** | | | |
| DOM-SET-001b.wireframe.md | Settings | (settings computed) | READY |
| DOM-SET-001c.wireframe.md | Settings | (settings computed) | READY |
| DOM-SET-002.wireframe.md | Settings | auditLogs | READY |
| DOM-SET-003b.wireframe.md | Settings | (export computed) | READY |
| DOM-SET-005b.wireframe.md | Settings | (settings computed) | READY |
| DOM-SET-006b.wireframe.md | Settings | (custom fields) | READY |
| DOM-SET-006c.wireframe.md | Settings | (custom fields) | READY |
| DOM-SET-006d.wireframe.md | Settings | (custom fields) | READY |
| DOM-SET-007.wireframe.md | Settings | (integrations) | READY |
| DOM-SET-008.wireframe.md | Settings | (search) | READY |
| **Users Domain (Partial)** | | | |
| DOM-USER-001.wireframe.md | Users | activities | READY |
| DOM-USER-004.wireframe.md | Users | users.avatarUrl | READY |
| DOM-USER-005c.wireframe.md | Users | users.lastActiveAt | READY |
| DOM-USER-006b.wireframe.md | Users | users | READY |
| DOM-USER-008c.wireframe.md | Users | users.invitedAt, users.status | READY |

**Total Ready: ~65 wireframes**

---

### Needs Backend First (Schema Must Be Created)

These wireframes require schema/server function stories to complete first.

| Wireframe | Missing Schema | PRD Prerequisite Stories |
|-----------|----------------|--------------------------|
| **Financial Domain** | | |
| DOM-FIN-001c.wireframe.md | creditNotes | DOM-FIN-001a, DOM-FIN-001b |
| DOM-FIN-002c.wireframe.md | paymentPlans, installments | DOM-FIN-002a, DOM-FIN-002b |
| DOM-FIN-003b.wireframe.md | (computed, but needs AR logic) | DOM-FIN-003a |
| DOM-FIN-004c.wireframe.md | statements, statementHistory | DOM-FIN-004a, DOM-FIN-004b |
| DOM-FIN-005b.wireframe.md | xeroSyncQueue | DOM-FIN-005a |
| DOM-FIN-006c.wireframe.md | reminderTemplates, reminderHistory | DOM-FIN-006a, DOM-FIN-006b |
| DOM-FIN-007b.wireframe.md | (computed from existing) | READY (actually) |
| DOM-FIN-008c.wireframe.md | revenueRecognition | DOM-FIN-008a, DOM-FIN-008b |
| **Jobs Domain** | | |
| jobs-task-management.wireframe.md | jobTasks | DOM-JOBS-001a, DOM-JOBS-001b |
| jobs-bom-tracking.wireframe.md | jobMaterials | DOM-JOBS-002a, DOM-JOBS-002b |
| jobs-time-tracking.wireframe.md | jobTimeEntries | DOM-JOBS-003a, DOM-JOBS-003b |
| jobs-checklist.wireframe.md | checklists, checklistItems | DOM-JOBS-004a, DOM-JOBS-004b |
| jobs-scheduling-calendar.wireframe.md | jobAssignments (enhanced) | DOM-JOBS-005a, DOM-JOBS-005b |
| jobs-templates.wireframe.md | jobTemplates | DOM-JOBS-007a, DOM-JOBS-007b |
| jobs-costing-report.wireframe.md | jobTimeEntries, jobMaterials | DOM-JOBS-008a, DOM-JOBS-008b |
| **Users Domain (Partial)** | | |
| DOM-USER-002c.wireframe.md | userGroups, userGroupMembers | DOM-USER-002a, DOM-USER-002b |
| DOM-USER-003c.wireframe.md | userDelegations | DOM-USER-003a, DOM-USER-003b |
| DOM-USER-007c.wireframe.md | userOnboarding | DOM-USER-007a, DOM-USER-007b |
| **Communications Domain** | | |
| DOM-COMMS-001c.wireframe.md | emailTemplates | DOM-COMMS-001a, DOM-COMMS-001b |
| DOM-COMMS-002c.wireframe.md | campaigns | DOM-COMMS-002a, DOM-COMMS-002b |
| DOM-COMMS-003d.wireframe.md | (enhanced emailHistory) | DOM-COMMS-003a, DOM-COMMS-003b, DOM-COMMS-003c |
| DOM-COMMS-004c.wireframe.md | notifications (enhanced) | DOM-COMMS-004a, DOM-COMMS-004b |
| DOM-COMMS-005.wireframe.md | (communication preferences) | READY (actually) |
| DOM-COMMS-006.wireframe.md | (communication hub) | READY (actually) |
| **Support Domain** | | |
| support-sla-tracking.wireframe.md | slaConfigs | DOM-SUP-001a, DOM-SUP-001b |
| support-escalation.wireframe.md | (escalation rules) | DOM-SUP-002a, DOM-SUP-002b |
| support-rma-workflow.wireframe.md | rmas | DOM-SUP-003a, DOM-SUP-003b |
| support-issue-templates.wireframe.md | issueTemplates | DOM-SUP-004 |
| support-csat-feedback.wireframe.md | csatResponses | DOM-SUP-005a, DOM-SUP-005b |
| support-dashboard.wireframe.md | (computed, some new tables) | DOM-SUP-006 |
| support-knowledge-base.wireframe.md | knowledgeBase, kbArticles | DOM-SUP-007a, DOM-SUP-007b |
| support-issue-kanban.wireframe.md | issues (enhanced) | DOM-SUP-008 |
| **Reports Domain** | | |
| DOM-RPT-004.wireframe.md | (report configs) | DOM-RPT-004 |
| DOM-RPT-005c.wireframe.md | (report schedules) | DOM-RPT-005a, DOM-RPT-005b |
| DOM-RPT-006c.wireframe.md | (report templates) | DOM-RPT-006a, DOM-RPT-006b |
| DOM-RPT-007.wireframe.md | (analytics) | DOM-RPT-007 |

**Total Needs Backend: ~35 wireframes**

---

### Vision Documents (Long-term Features)

These wireframes represent future capabilities not in current scope.

| Wireframe | Feature | Target Phase |
|-----------|---------|--------------|
| dashboard-ai-insights.wireframe.md | AI-powered insights | v3+ |

**Total Vision: ~1 wireframe**

---

## Implementation Priority Matrix

### Phase 0: Immediate (Schema Exists)

| Priority | Domain | Wireframes Count | Business Impact |
|----------|--------|------------------|-----------------|
| P0 | Inventory | 4 | FULLY IMPLEMENTED - verify wireframes match |
| P0 | Suppliers | 4 | FULLY IMPLEMENTED - verify wireframes match |
| P1 | Orders | 7 | Core fulfillment workflow |
| P1 | Customers | 8 | Core CRM workflow |
| P1 | Pipeline | 7 | Sales velocity |
| P2 | Products | 6 | Catalog management |
| P2 | Dashboard | 10 | Operations visibility |
| P2 | Settings | 10 | System configuration |

### Phase 1: Backend First (Schema Required)

| Priority | Domain | Wireframes Count | Prerequisite Stories |
|----------|--------|------------------|---------------------|
| P0 | Jobs | 7 | DOM-JOBS-001a through DOM-JOBS-008b |
| P1 | Financial | 7 | DOM-FIN-001a through DOM-FIN-008b |
| P1 | Users | 3 | DOM-USER-002a through DOM-USER-007b |
| P2 | Communications | 6 | DOM-COMMS-001a through DOM-COMMS-004b |
| P2 | Support | 8 | DOM-SUP-001a through DOM-SUP-008 |
| P3 | Reports | 4 | DOM-RPT-004 through DOM-RPT-007 |

---

## Renoz Business Context (For Wireframe Review)

### Key Business Rules

| Rule | Wireframe Impact |
|------|-----------------|
| **Australian B2B** | AUD currency, GST 10%, DD/MM/YYYY dates |
| **Single Organization** | No org switcher in UI |
| **4 Roles** | Admin, Sales, Warehouse, Viewer - role-based views |
| **Xero Integration** | Financial data syncs TO Xero, not replicated |
| **Battery/Window OEM** | Products are battery systems, inverters, window tinting |

### Product Types (NOT "PowerWall" - Generic Terms)

| Type | Examples |
|------|----------|
| **Battery System** | Home battery, Commercial battery pack |
| **Inverter** | Hybrid inverter, Grid-tie inverter |
| **Solar Panel** | Residential panel, Commercial array |
| **Window Tinting** | Residential tint, Commercial film |
| **Installation Service** | Battery install, Solar install, Tinting service |

### User Roles in Wireframes

| Role | Primary Screens |
|------|-----------------|
| **Admin** | Settings, Users, Full Dashboard |
| **Sales** | Pipeline, Customers, Quotes, Dashboard |
| **Warehouse** | Inventory, Orders, Fulfillment, Receiving |
| **Viewer** | Reports, Read-only views |

---

## Next Steps

1. **Verify "Ready" wireframes** match actual schema structure
2. **Add dependency headers** to all "Needs Backend" wireframes
3. **Cross-reference with UX debt** to ensure coverage
4. **Update wireframes** with Renoz-specific terminology (no Tesla product names)

---

*This matrix should be updated as schema stories are completed.*
