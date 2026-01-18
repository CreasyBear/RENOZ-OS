# Suppliers Domain: Complete Implementation Guide

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective

Build a comprehensive Supplier Relationship Management system enabling end-to-end procurement operations from supplier onboarding through purchase order fulfillment, performance tracking, and strategic relationship management.

## Current State

Check `opc/_Initiation/_prd/domains/suppliers/progress.txt` for current story execution status.

If progress.txt doesn't exist, start with **SUPP-CORE-SCHEMA**.

## Context

### PRD File
- **Location**: `opc/_Initiation/_prd/2-domains/suppliers/suppliers.prd.json`
- **Type**: Domain PRD with complete system requirements
- **Stories**: 12 core implementation stories
- **Completion Promise**: `DOM_SUPPLIERS_COMPLETE`

### Project Structure
- **Project Root**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- **Tech Stack**: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- **Business Context**: Australian B2B battery/installation industry, AUD currency with GST (10%)

### Wireframes Available
The following wireframes are available in `./wireframes/`:

- **DOM-SUPP-002d.wireframe.md** - PO Approval Workflow UI
- **DOM-SUPP-003.wireframe.md** - Supplier Directory List
- **DOM-SUPP-004.wireframe.md** - Supplier Detail View
- **DOM-SUPP-005c.wireframe.md** - Purchase Order Creation
- **DOM-SUPP-006c.wireframe.md** - Purchase Order Detail
- **DOM-SUPP-007c.wireframe.md** - Goods Receipt
- **DOM-SUPP-008.wireframe.md** - Procurement Dashboard

## Story Execution Order

### Phase 1: Core Schema & API (Foundation)

#### Story 1: SUPP-CORE-SCHEMA
**Name**: Supplier Management Core Schema
**Type**: Schema (Database)
**Dependencies**: None
**Estimated Iterations**: 2

Create complete supplier relationship management database schema:
- `suppliers` table with performance tracking fields
- `purchaseOrders` and `purchaseOrderItems` tables with full lifecycle
- `purchaseOrderApprovals` and `purchaseOrderApprovalRules` tables
- `supplierPerformanceMetrics` and `supplierPriceLists` tables
- `purchaseOrderReceipts` and `purchaseOrderReceiptItems` tables (quality control)
- `purchaseOrderAmendments` and `purchaseOrderCosts` tables
- Foreign key relationships and proper indexing
- RLS policies for organization data isolation
- TypeScript types exported for all entities

**Files to Modify**:
- `src/lib/schema/suppliers.ts`
- `src/lib/schema/purchase-orders.ts`
- `src/lib/schema/purchase-order-approvals.ts`
- `src/lib/schema/supplier-performance.ts`
- `src/lib/schema/supplier-pricing.ts`
- `src/lib/schema/purchase-receipts.ts`
- `src/lib/schema/purchase-amendments.ts`
- `src/lib/schema/purchase-costs.ts`
- `src/lib/schema/index.ts`
- `drizzle/migrations/010_suppliers.ts`

**Completion Promise**: `SUPP_CORE_SCHEMA_COMPLETE`

---

#### Story 2: SUPP-CORE-API
**Name**: Supplier Management Core API
**Type**: Server Functions
**Dependencies**: SUPP-CORE-SCHEMA
**Estimated Iterations**: 3

Implement comprehensive supplier and procurement operations:
- Complete supplier CRUD with performance tracking
- Full purchase order lifecycle management
- Approval workflow API with escalation
- Supplier pricing and performance APIs
- Goods receipt and quality control endpoints
- Amendment and cost tracking operations
- Proper error handling and RLS on all endpoints
- Comprehensive Zod validation schemas

**Files to Modify**:
- `src/server/functions/suppliers.ts`
- `src/server/functions/purchase-orders.ts`
- `src/server/functions/approvals.ts`
- `src/server/functions/receipts.ts`
- `src/server/functions/supplier-analytics.ts`
- `src/lib/schemas/suppliers.ts`

**Completion Promise**: `SUPP_CORE_API_COMPLETE`

---

### Phase 2: User Interfaces (Core Features)

#### Story 3: SUPP-SUPPLIER-DIRECTORY
**Name**: Supplier Directory Interface
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3
**Primary Wireframes**: DOM-SUPP-003, DOM-SUPP-004

Comprehensive supplier management and performance tracking:
- Responsive supplier list with advanced filtering
- Supplier detail view with performance metrics
- Supplier creation and qualification workflow
- Performance dashboard with trend analysis
- Supplier communication and document management
- Bulk supplier operations and reporting

**UI Patterns**:
- **DataGrid**: Supplier list with sortable columns, filtering, pagination
- **Filters**: Advanced supplier filtering by status, type, rating, performance
- **Tabs**: Detail view for Overview, Performance, Pricing, Orders, Contacts, Documents
- **Badge**: Status indicators (active/inactive/suspended/blacklisted)
- **Rating**: Display and edit supplier performance ratings
- **Card**: Summary cards for key supplier metrics
- **Command**: Quick search and navigation

**Files to Modify**:
- `src/routes/_authed/suppliers/index.tsx`
- `src/routes/_authed/suppliers/$supplierId.tsx`
- `src/components/domain/suppliers/supplier-list.tsx`
- `src/components/domain/suppliers/supplier-detail.tsx`
- `src/components/domain/suppliers/supplier-form.tsx`

**Completion Promise**: `SUPP_SUPPLIER_DIRECTORY_COMPLETE`

---

#### Story 4: SUPP-PO-MANAGEMENT
**Name**: Purchase Order Management Interface
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3
**Primary Wireframes**: DOM-SUPP-005c, DOM-SUPP-006c

Complete purchase order lifecycle management:
- PO list with comprehensive filtering and bulk actions
- PO creation wizard with supplier and item selection
- PO detail view with full lifecycle tracking
- Approval workflow interface with escalation
- Amendment request and approval process
- PO printing and document generation

**UI Patterns**:
- **DataGrid**: PO list with status, supplier, dates, amounts, actions
- **Dialog (Multi-step)**: PO creation wizard (Select Supplier > Add Items > Configure Terms > Review)
- **Tabs**: PO detail tabs (Overview, Items, Approvals, Receipts, Amendments, Costs, Documents)
- **Timeline**: Visual PO lifecycle timeline
- **Combobox**: Supplier and product selection with search
- **Badge**: PO status indicators
- **Alert**: Validation messages and approval requirements

**Files to Modify**:
- `src/routes/_authed/purchase-orders/index.tsx`
- `src/routes/_authed/purchase-orders/$poId.tsx`
- `src/components/domain/purchase-orders/po-list.tsx`
- `src/components/domain/purchase-orders/po-detail.tsx`
- `src/components/domain/purchase-orders/po-creation-wizard.tsx`

**Completion Promise**: `SUPP_PO_MANAGEMENT_COMPLETE`

---

#### Story 5: SUPP-APPROVAL-WORKFLOW
**Name**: Approval Workflow System
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3
**Primary Wireframes**: DOM-SUPP-002d

Multi-level purchase order approval and routing:
- Approval dashboard with pending queue
- Rule-based approval routing configuration
- Approval decision interface with comments
- Escalation management and notifications
- Approval history and audit trail
- Bulk approval operations

**UI Patterns**:
- **DataGrid**: Approval queue with pending items, urgency indicators, bulk actions
- **Sheet**: Approval decision panel with PO summary and decision controls
- **Timeline**: Approval history showing decision sequence
- **Badge**: Approval status indicators
- **AlertDialog**: Confirm bulk approval/rejection actions
- **Form**: Approval rule configuration
- **Textarea**: Comments field for decisions

**Files to Modify**:
- `src/routes/_authed/approvals/index.tsx`
- `src/components/domain/approvals/approval-dashboard.tsx`
- `src/components/domain/approvals/approval-rules.tsx`
- `src/components/domain/approvals/approval-decision.tsx`

**Completion Promise**: `SUPP_APPROVAL_WORKFLOW_COMPLETE`

---

#### Story 6: SUPP-GOODS-RECEIPT
**Name**: Goods Receipt System
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3
**Primary Wireframes**: DOM-SUPP-007c

Quality-controlled goods receipt and inspection:
- Receipt creation interface with item verification
- Quality inspection workflow with defect tracking
- Partial receipt handling and backorder management
- Receipt history and audit trail
- Quality metrics and reporting
- Supplier feedback integration

**UI Patterns**:
- **Dialog (Multi-step)**: Receipt creation wizard (PO Lookup > Item Verification > Quality Inspection > Confirm)
- **DataGrid**: Line items with received/accepted/rejected quantities
- **Timeline**: Receipt history showing events and quality checks
- **Select**: Rejection reason dropdown
- **Checkbox**: Quality check passed/failed indicators
- **Input**: Quantity fields with validation
- **Badge**: Receipt status indicators
- **Progress**: Visual indicator of quantity received vs ordered

**Files to Modify**:
- `src/components/domain/receipts/receipt-creation.tsx`
- `src/components/domain/receipts/quality-inspection.tsx`
- `src/components/domain/receipts/receipt-history.tsx`
- `src/components/domain/receipts/quality-dashboard.tsx`

**Completion Promise**: `SUPP_GOODS_RECEIPT_COMPLETE`

---

### Phase 3: Analytics & Management Features

#### Story 7: SUPP-PRICING-MANAGEMENT
**Name**: Supplier Pricing Management
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3

Supplier-specific pricing and agreement management:
- Supplier price list management
- Volume discount configuration
- Price comparison across suppliers
- Price agreement tracking and expiration
- Bulk price updates and imports
- Price change history and approval

**UI Patterns**:
- **DataGrid**: Price list table with products, tiers, effective dates, actions
- **Dialog**: Price agreement creation/editing with date range and discounts
- **DataGrid (comparison)**: Side-by-side price comparison across suppliers
- **DatePicker**: Effective date and expiry date selection
- **Input (currency)**: Price fields with currency formatting
- **Badge**: Price status (active, expired, preferred)
- **Alert**: Expiring price agreements warnings

**Files to Modify**:
- `src/components/domain/suppliers/pricing-management.tsx`
- `src/components/domain/suppliers/price-comparison.tsx`
- `src/components/domain/suppliers/price-agreements.tsx`

**Completion Promise**: `SUPP_PRICING_MANAGEMENT_COMPLETE`

---

#### Story 8: SUPP-PROCUREMENT-DASHBOARD
**Name**: Procurement Operations Dashboard
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3
**Primary Wireframes**: DOM-SUPP-008

Executive procurement overview and real-time monitoring:
- Comprehensive procurement metrics widgets
- Real-time order status and approval tracking
- Supplier performance overview
- Spend analysis and budget monitoring
- Procurement alerts and notifications
- Interactive drill-down capabilities

**UI Patterns**:
- **Card (Dashboard Widget)**: Metric cards for spend overview, order status, supplier performance, approval queue
- **Chart**: Spend trends, order volume, performance rankings
- **DataGrid (embedded)**: Top suppliers table, pending approvals list
- **Alert**: Procurement alerts (low stock, escalations, supplier issues)
- **Badge**: Alert counts and status indicators
- **Popover**: Quick metric details on hover
- **Filters**: Date range and supplier filters

**Files to Modify**:
- `src/routes/_authed/procurement/dashboard.tsx`
- `src/components/domain/procurement/dashboard-widgets.tsx`
- `src/components/domain/procurement/procurement-alerts.tsx`

**Completion Promise**: `SUPP_PROCUREMENT_DASHBOARD_COMPLETE`

---

#### Story 9: SUPP-ANALYTICS-REPORTING
**Name**: Procurement Analytics and Reporting
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3

Advanced procurement analytics and automated reporting:
- Supplier performance analytics and trends
- Spend analysis by category and supplier
- Procurement efficiency metrics
- Cost savings tracking and reporting
- Automated report generation and scheduling
- Custom report builder and dashboard integration

**UI Patterns**:
- **Chart**: Multi-dimensional charts (line, bar, pie, radar)
- **DataGrid**: Detailed report tables with export functionality
- **Tabs**: Report type tabs (Spend Analysis, Supplier Performance, Order Analytics, Cost Savings)
- **Filters**: Date range, supplier, category filters
- **Select**: Report template selection and grouping
- **Dialog**: Custom report builder configuration
- **Button**: Export actions (PDF, Excel, Email)

**Files to Modify**:
- `src/routes/_authed/reports/procurement/index.tsx`
- `src/components/domain/reports/supplier-performance.tsx`
- `src/components/domain/reports/spend-analysis.tsx`
- `src/components/domain/reports/procurement-metrics.tsx`

**Completion Promise**: `SUPP_ANALYTICS_REPORTING_COMPLETE`

---

### Phase 4: Integration & Advanced Features

#### Story 10: SUPP-INTEGRATION-API
**Name**: Supplier System Integration Layer
**Type**: Server Functions/Utilities
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3

Integration hooks and utilities for supplier system usage:
- Supplier context providers for React components
- Approval workflow integration hooks
- Supplier performance calculation utilities
- Purchase order lifecycle event handlers
- Receipt processing automation
- Audit logging integration for all supplier operations
- Real-time notification broadcasting

**Files to Modify**:
- `src/contexts/supplier-context.tsx`
- `src/hooks/use-suppliers.ts`
- `src/hooks/use-purchase-orders.ts`
- `src/lib/supplier-utils.ts`
- `src/lib/approval-workflow.ts`

**Completion Promise**: `SUPP_INTEGRATION_API_COMPLETE`

---

#### Story 11: SUPP-ONBOARDING-WORKFLOW
**Name**: Supplier Onboarding Workflow
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3

Streamlined supplier registration and qualification:
- Supplier registration form with qualification criteria
- Document upload and verification workflow
- Qualification scoring and approval process
- Onboarding checklist and progress tracking
- Supplier portal access provisioning
- Automated qualification notifications

**UI Patterns**:
- **Dialog (Multi-step)**: Onboarding wizard (Basic Info > Qualification > Documentation > Approval)
- **Form**: Comprehensive registration form with validation
- **Progress**: Onboarding completion progress bar
- **FileUpload**: Document upload (tax ID, insurance, certifications)
- **Checkbox**: Qualification checklist items
- **Badge**: Qualification status (preferred, approved, probationary, disqualified)
- **Alert**: Validation errors and qualification requirements

**Files to Modify**:
- `src/routes/_authed/suppliers/onboard.tsx`
- `src/components/domain/suppliers/onboarding-form.tsx`
- `src/components/domain/suppliers/qualification-checklist.tsx`

**Completion Promise**: `SUPP_ONBOARDING_WORKFLOW_COMPLETE`

---

#### Story 12: SUPP-BULK-OPERATIONS
**Name**: Bulk Procurement Operations
**Type**: UI Component
**Dependencies**: SUPP-CORE-API
**Estimated Iterations**: 3

Efficient bulk operations for supplier and order management:
- Bulk supplier data import and updates
- Bulk purchase order operations
- Bulk approval processing
- Bulk supplier communication
- Operation progress tracking and error handling
- Bulk operation history and rollback capabilities

**UI Patterns**:
- **Dialog (Multi-step)**: Bulk import wizard (Upload > Map Fields > Validate > Confirm)
- **DataGrid (selection)**: Bulk operation selection interface with row selection
- **Progress**: Bulk operation progress indicator
- **FileUpload**: CSV/Excel upload for bulk import
- **AlertDialog**: Confirm bulk operations
- **Alert**: Error summary for failed operations
- **Badge**: Operation status (pending, processing, completed, failed)

**Files to Modify**:
- `src/components/domain/suppliers/bulk-import.tsx`
- `src/components/domain/purchase-orders/bulk-operations.tsx`
- `src/components/domain/approvals/bulk-approvals.tsx`

**Completion Promise**: `SUPP_BULK_OPERATIONS_COMPLETE`

---

## Success Criteria

The Suppliers domain is complete when ALL of the following are achieved:

1. Complete supplier relationship management from onboarding to performance tracking
2. End-to-end purchase order lifecycle from creation to goods receipt
3. Multi-level approval workflow with escalation and audit trails
4. Quality-controlled goods receipt with defect tracking and supplier feedback
5. Supplier-specific pricing with volume discounts and agreement management
6. Comprehensive supplier performance analytics and scorecard management
7. Real-time procurement dashboard with alerts and drill-down capabilities
8. Automated spend analysis and procurement cost optimization
9. Mobile-responsive interfaces for warehouse and field operations
10. Integration with inventory, financial, and product catalog systems
11. Performance optimized for 1000+ suppliers and 10000+ monthly orders
12. Complete audit trail for all procurement transactions and decisions
13. Automated reporting and email notifications for procurement events
14. Flexible custom fields and workflow configuration
15. Advanced search and filtering across all procurement entities
16. Supplier portal for order status, delivery tracking, and communication

## Process

### For Each Story
1. **Read the PRD** section for the story (in `suppliers.prd.json`)
2. **Check wireframes** referenced in story definition
3. **Implement acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output completion promise: `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix issues
   - Stay on current story (max 3 iterations per story)

### Progress Tracking

Maintain `opc/_Initiation/_prd/domains/suppliers/progress.txt` with:

```markdown
# Suppliers Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] SUPP-CORE-SCHEMA: Supplier Management Core Schema
- [ ] SUPP-CORE-API: Supplier Management Core API
- [ ] SUPP-SUPPLIER-DIRECTORY: Supplier Directory Interface
- [ ] SUPP-PO-MANAGEMENT: Purchase Order Management Interface
- [ ] SUPP-APPROVAL-WORKFLOW: Approval Workflow System
- [ ] SUPP-GOODS-RECEIPT: Goods Receipt System
- [ ] SUPP-PRICING-MANAGEMENT: Supplier Pricing Management
- [ ] SUPP-PROCUREMENT-DASHBOARD: Procurement Operations Dashboard
- [ ] SUPP-ANALYTICS-REPORTING: Procurement Analytics and Reporting
- [ ] SUPP-INTEGRATION-API: Supplier System Integration Layer
- [ ] SUPP-ONBOARDING-WORKFLOW: Supplier Onboarding Workflow
- [ ] SUPP-BULK-OPERATIONS: Bulk Procurement Operations

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Reference wireframes in story implementation
- Maintain complete audit trails for all operations

### DO NOT
- Modify files outside suppliers scope
- Skip acceptance criteria
- Use client-side validation alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values
- Skip RLS policies for supplier data

## If Stuck

- **After 3 iterations on same issue**: Add blocker to progress.txt Notes
- **After 5 iterations total on story**: Output `<promise>SUPPLIERS_STUCK_NEEDS_HELP</promise>`
- **Common blockers**:
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Approval workflow complexity → Reference business rules in PRD

## Document Info

## Premortem Remediation

**IMPORTANT: Schema Migration Dependencies**

This domain depends on Products domain for foreign key references.

### Key Changes

1. **Migration Order Dependency**
   - The `purchaseOrderItems` table references `products(id)`
   - Therefore, `010_suppliers.ts` MUST run AFTER `008_products.ts`

2. **Migration Execution Order**
   ```
   007_inventory-core.ts  -- Shared inventory tables
   008_products.ts        -- Products domain (REQUIRED BEFORE suppliers)
   010_suppliers.ts       -- Suppliers domain (this migration)
   011_inventory.ts       -- Inventory domain
   ```

3. **Foreign Key Dependencies**
   | Table | FK Reference | Depends On |
   |-------|--------------|------------|
   | purchaseOrderItems.productId | products(id) | 008_products.ts |
   | supplierPriceLists.productId | products(id) | 008_products.ts |

4. **Reference Documentation**
   - See `_meta/remediation-schema-migrations.md` for full context

### Implementation Notes

- When implementing SUPP-CORE-SCHEMA, ensure 008_products.ts migration has run first
- The `purchaseOrderItems` and `supplierPriceLists` tables require products to exist
- Test FK constraints after migration to ensure proper ordering

---

**Document Version**: 1.0
**Created**: 2026-01-11
**Target**: Suppliers Domain Complete Implementation
**Completion Promise**: `DOM_SUPPLIERS_COMPLETE`
