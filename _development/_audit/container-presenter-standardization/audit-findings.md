# Container/Presenter Standardization - Audit Findings

## Status
- Overall status: In progress
- Last updated: 2026-01-23
- Next domain: Suppliers

## Audit Inventory by Domain (PRD Breakdown)

### Customers
- `src/routes/_authenticated/customers/index.tsx` -> `@/components/domain/customers` (barrel)
- `src/routes/_authenticated/customers/$customerId.tsx` -> `Customer360View`
- `src/routes/_authenticated/customers/$customerId_.edit.tsx` -> `CustomerForm`, `ContactManager`, `AddressManager`
- `src/routes/_authenticated/customers/new.tsx` -> `CustomerWizard`
- `src/routes/_authenticated/customers/segments/index.tsx` -> `SegmentManager`, `SegmentBuilder`, `SegmentAnalytics`
- `src/routes/_authenticated/customers/duplicates.tsx` -> `DuplicateDetection`, `MergeHistory`
- `src/routes/_authenticated/customers/communications.tsx` -> `CommunicationTimeline`, `CommunicationTemplates`, `BulkCommunications`

### Pipeline
- `src/routes/_authenticated/pipeline/index.tsx` -> `@/components/domain/pipeline` (barrel)
- `src/routes/_authenticated/pipeline/$opportunityId.tsx` -> `OpportunityDetail`, `OpportunityForm`, `WonLostDialog`

### Orders
- `src/routes/_authenticated/orders/index.tsx` -> `@/components/domain/orders` (barrel)
- `src/routes/_authenticated/orders/create.tsx` -> `EnhancedOrderCreationWizard`
- `src/routes/_authenticated/orders/$orderId.tsx` -> `OrderDetail`

### Products
- `src/routes/_authenticated/products/index.tsx` -> `ProductTable`, `CategorySidebar`
- `src/routes/_authenticated/products/new.tsx` -> `ProductForm`
- `src/routes/_authenticated/products/$productId/edit.tsx` -> `ProductForm`
- `src/routes/_authenticated/products/$productId.tsx` -> `ProductOverviewTab`, `ProductPricingTab`, `ProductInventoryTab`, `ProductImagesTab`, `ProductAttributesTab`, `ProductRelationsTab`
- `src/routes/_authenticated/settings/categories.tsx` -> `CategoryTree`, `CategoryEditor`

### Inventory
- `src/routes/_authenticated/inventory/index.tsx` -> `@/components/domain/inventory` (barrel)
- `src/routes/_authenticated/inventory/dashboard.tsx` -> `@/components/domain/inventory` (barrel)
- `src/routes/_authenticated/inventory/$itemId.tsx` -> `item-tabs`, `ItemDetailData`
- `src/routes/_authenticated/inventory/receiving.tsx` -> `ReceivingForm`, `ReceivingHistory`
- `src/routes/_authenticated/inventory/locations.tsx` -> `LocationTree`, `LocationForm`, `LocationDetail`
- `src/routes/_authenticated/inventory/counts.tsx` -> `StockCountList`, `CountSheet`, `VarianceReport`
- `src/routes/_authenticated/inventory/forecasting.tsx` -> `ReorderRecommendations`, `DemandForecastChart`
- `src/routes/_authenticated/inventory/analytics.tsx` -> `ValuationReport`, `AgingReport`, `TurnoverReport`, `MovementAnalytics`
- `src/routes/_authenticated/inventory/alerts.tsx` -> `AlertsPanel`, `AlertConfigForm`, `AlertsList`

### Jobs
- `src/routes/_authenticated/jobs/kanban.tsx` -> `@/components/domain/jobs` (barrel)
- `src/routes/_authenticated/jobs/timeline.tsx` -> `JobsTimelineView`, `UnifiedJobsProvider`, `useUnifiedJobs`
- `src/routes/_authenticated/jobs/calendar.tsx` -> `JobCalendarView`, `JobsTimelineView`, `UnifiedJobsProvider`, `useUnifiedJobs`, `JobsErrorBoundary`, `CalendarSkeleton`
- `src/routes/_authenticated/settings/job-templates.tsx` -> `JobTemplateList`, `JobTemplateFormDialog`

### Financial
- `src/routes/_authenticated/financial/revenue.tsx` -> `RevenueReports`
- `src/routes/_authenticated/financial/ar-aging.tsx` -> `ARAgingReport`
- `src/routes/_authenticated/financial/xero-sync.tsx` -> `XeroSyncStatus`
- `src/routes/_authenticated/financial/reminders.tsx` -> `PaymentReminders`

### Communications
- No route/component mapping captured yet.

### Support
- `src/routes/_authenticated/support/dashboard.tsx` -> `CsatMetricsWidget`, `CsatLowRatingAlerts`
- `src/routes/_authenticated/support/knowledge-base.tsx` -> `KbCategoryTree`, `KbArticleList`, `KbArticleFormDialog`
- `src/routes/_authenticated/support/issues-board.tsx` -> `IssueKanbanBoard`, `IssueQuickFilters`, `IssueBulkActions`, `IssueStatusChangeDialog`
- `src/routes/_authenticated/settings/knowledge-base.tsx` -> `KbCategoryTree`, `KbCategoryFormDialog`
- `src/routes/feedback.$token.tsx` -> `StarRating`

### Warranty
- `src/routes/_authenticated/support/warranties/$warrantyId.tsx` -> `@/components/domain/warranty` (barrel)
- `src/routes/_authenticated/settings/warranty-policies.tsx` -> `WarrantyPolicyList`, `WarrantyPolicyFormDialog`
- `src/routes/_authenticated/settings/warranty-import.tsx` -> `BulkWarrantyImportDialog`

### Suppliers
- `src/routes/_authenticated/suppliers/index.tsx` -> `@/components/domain/suppliers` (barrel)
- `src/routes/_authenticated/purchase-orders/index.tsx` -> `PODirectory`
- `src/routes/_authenticated/purchase-orders/$poId.tsx` -> `ApprovalActionBar`, `ApprovalHistory`, `ReceiptCreationDialog`, `ReceiptHistory`
- `src/routes/_authenticated/procurement/dashboard.tsx` -> `ProcurementDashboard` (dynamic)
- `src/routes/_authenticated/approvals/index.tsx` -> `ApprovalDashboard`

### Dashboard
- `src/routes/_authenticated/dashboard.tsx` -> `@/components/domain/dashboard` (barrel)

### Users
- `src/routes/_authenticated/admin/users/index.tsx` -> users admin UI (in-route)
- `src/routes/_authenticated/admin/users/$userId.tsx` -> user detail UI (in-route)
- `src/routes/_authenticated/admin/users/invite.tsx` -> invite form UI (in-route)
- `src/routes/_authenticated/admin/users/import.tsx` -> bulk import UI (in-route)
- `src/routes/_authenticated/admin/groups/index.tsx` -> groups admin UI (in-route)
- `src/routes/_authenticated/admin/groups/$groupId.tsx` -> group detail UI (in-route)
- `src/routes/_authenticated/admin/invitations/index.tsx` -> invitations UI (in-route)

### Settings
- `src/routes/_authenticated/admin/audit/index.tsx` -> audit log UI (in-route)

### Reports
- `src/routes/_authenticated/reports/warranties.tsx` -> `WarrantyAnalyticsCharts`
- `src/routes/_authenticated/reports/procurement/index.tsx` -> `ProcurementReports`
- `src/routes/_authenticated/reports/pipeline-forecast.tsx` -> `PipelineForecastChart`, `ForecastTable`
- `src/routes/_authenticated/reports/customers/index.tsx` -> `@/components/domain/customers` (barrel)

### Activities
- `src/routes/_authenticated/activities/index.tsx` -> `ActivityFeed` (components/activity)
- `src/routes/_authenticated/admin/activities/index.tsx` -> `ActivityDashboard` (components/activity)

## Presenter Components Using Data Hooks (Needs Review) by Domain

### Customers
- No presenter hooks flagged yet.

### Pipeline
- `src/components/domain/pipeline/activity-logger.tsx`
- `src/components/domain/pipeline/expired-quotes-alert.tsx`
- `src/components/domain/pipeline/extend-validity-dialog.tsx`
- `src/components/domain/pipeline/follow-up-scheduler.tsx`
- `src/components/domain/pipeline/opportunity-activity-timeline.tsx`
- `src/components/domain/pipeline/product-quick-add.tsx`
- `src/components/domain/pipeline/quick-quote-form.tsx`
- `src/components/domain/pipeline/quote-builder.tsx`
- `src/components/domain/pipeline/quote-pdf-preview.tsx`
- `src/components/domain/pipeline/quote-version-history.tsx`

### Orders
- `src/components/domain/orders/amendment-list.tsx`
- `src/components/domain/orders/amendment-request-dialog.tsx`
- `src/components/domain/orders/amendment-review-dialog.tsx`
- `src/components/domain/orders/confirm-delivery-dialog.tsx`
- `src/components/domain/orders/customer-selector.tsx`
- `src/components/domain/orders/order-create-dialog.tsx`
- `src/components/domain/orders/order-detail.tsx`
- `src/components/domain/orders/order-edit-dialog.tsx`
- `src/components/domain/orders/order-list.tsx`
- `src/components/domain/orders/order-creation-wizard/enhanced-order-creation-wizard.tsx`
- `src/components/domain/orders/order-creation-wizard/order-customer-selector.tsx`
- `src/components/domain/orders/product-selector.tsx`
- `src/components/domain/orders/ship-order-dialog.tsx`
- `src/components/domain/orders/shipment-list.tsx`
- `src/components/domain/orders/template-editor.tsx`
- `src/components/domain/orders/template-library.tsx`
- `src/components/domain/orders/template-selector.tsx`

### Products
- No presenter hooks flagged yet.

### Inventory
- No presenter hooks flagged yet.

### Jobs
- `src/components/domain/jobs/job-documents-tab.tsx` (refactored to container + presenter)

### Financial
- `src/components/domain/financial/ar-aging-report.tsx`
- `src/components/domain/financial/credit-notes-list.tsx`
- `src/components/domain/financial/customer-statements.tsx`
- `src/components/domain/financial/financial-dashboard.tsx`
- `src/components/domain/financial/payment-plans-list.tsx`
- `src/components/domain/financial/payment-reminders.tsx`
- `src/components/domain/financial/xero-sync-status.tsx`

### Communications
- `src/components/domain/communications/call-outcome-dialog.tsx`
- `src/components/domain/communications/campaign-detail-panel.tsx`
- `src/components/domain/communications/campaign-preview-panel.tsx`
- `src/components/domain/communications/campaign-wizard.tsx`
- `src/components/domain/communications/campaigns-list.tsx`
- `src/components/domain/communications/communication-preferences.tsx`
- `src/components/domain/communications/quick-log-dialog.tsx`
- `src/components/domain/communications/schedule-call-dialog.tsx`
- `src/components/domain/communications/schedule-email-dialog.tsx`
- `src/components/domain/communications/scheduled-call-action-menu.tsx`
- `src/components/domain/communications/scheduled-calls-list.tsx`
- `src/components/domain/communications/scheduled-emails-list.tsx`
- `src/components/domain/communications/signature-editor.tsx`
- `src/components/domain/communications/signature-selector.tsx`
- `src/components/domain/communications/signatures-list.tsx`
- `src/components/domain/communications/templates-list.tsx`
- `src/components/domain/communications/upcoming-calls-widget.tsx`

### Support
- No presenter hooks flagged yet.

### Warranty
- No presenter hooks flagged yet.

### Suppliers
- `src/components/domain/approvals/approval-dashboard.tsx`

### Dashboard
- `src/components/domain/dashboard/welcome-checklist.tsx`

### Users
- No presenter hooks flagged yet.

### Settings
- `src/components/domain/settings/win-loss-reasons-manager.tsx`

### Reports
- `src/components/domain/reports/procurement-reports.tsx`
- `src/components/domain/reports/win-loss-analysis.tsx`

### Activities
- No presenter hooks flagged yet.

## Findings Log by Domain

### Template
- Domain:
- Route (container):
- Presenter:
- Findings:
  - [ ] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other:
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Customers
- Route (container):
  - `src/routes/_authenticated/customers/index.tsx`
  - `src/routes/_authenticated/customers/$customerId.tsx`
  - `src/routes/_authenticated/customers/$customerId_.edit.tsx`
  - `src/routes/_authenticated/customers/new.tsx`
  - `src/routes/_authenticated/customers/segments/index.tsx`
  - `src/routes/_authenticated/customers/duplicates.tsx`
  - `src/routes/_authenticated/customers/communications.tsx`
- Presenter:
  - `src/components/domain/customers/customer-360-view.tsx`
  - `src/components/domain/customers/customer-form.tsx`
  - `src/components/domain/customers/contact-manager.tsx`
  - `src/components/domain/customers/address-manager.tsx`
  - `src/components/domain/customers/customer-wizard.tsx`
  - `src/components/domain/customers/segment-manager.tsx`
  - `src/components/domain/customers/segment-builder.tsx`
  - `src/components/domain/customers/segment-analytics.tsx`
  - `src/components/domain/customers/duplicate-detection.tsx`
  - `src/components/domain/customers/merge-history.tsx`
  - `src/components/domain/customers/communication-timeline.tsx`
  - `src/components/domain/customers/communication-templates.tsx`
  - `src/components/domain/customers/bulk-communications.tsx`
- Findings:
  - [x] Hooks in presenter (moved to container)
  - [x] Missing prop JSDoc (hook source added)
  - [x] Missing `isLoading` handling
  - [x] Other: Refactored `health-dashboard`, `communication-timeline`,
    and `communication-templates` to accept container data.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Pipeline
- Route (container):
  - `src/routes/_authenticated/pipeline/index.tsx`
  - `src/routes/_authenticated/pipeline/$opportunityId.tsx`
- Presenter:
  - `src/components/domain/pipeline/opportunity-detail.tsx`
  - `src/components/domain/pipeline/opportunity-form.tsx`
  - `src/components/domain/pipeline/won-lost-dialog.tsx`
  - `src/components/domain/pipeline/quote-builder.tsx`
  - `src/components/domain/pipeline/quote-pdf-preview.tsx`
  - `src/components/domain/pipeline/quote-version-history.tsx`
  - `src/components/domain/pipeline/quick-quote-form.tsx`
  - `src/components/domain/pipeline/product-quick-add.tsx`
  - `src/components/domain/pipeline/opportunity-activity-timeline.tsx`
  - `src/components/domain/pipeline/follow-up-scheduler.tsx`
  - `src/components/domain/pipeline/extend-validity-dialog.tsx`
  - `src/components/domain/pipeline/expired-quotes-alert.tsx`
  - `src/components/domain/pipeline/activity-logger.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [x] Missing prop JSDoc (hook source added)
  - [x] Missing `isLoading` handling
  - [x] Other: Quote/versions, follow-ups, quick quote widgets wired; expiry queries limited.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Orders
- Route (container):
  - `src/routes/_authenticated/orders/index.tsx`
  - `src/routes/_authenticated/orders/create.tsx`
  - `src/routes/_authenticated/orders/$orderId.tsx`
- Presenter:
  - `src/components/domain/orders/order-detail.tsx`
  - `src/components/domain/orders/order-list.tsx`
  - `src/components/domain/orders/order-create-dialog.tsx`
  - `src/components/domain/orders/order-edit-dialog.tsx`
  - `src/components/domain/orders/order-creation-wizard/enhanced-order-creation-wizard.tsx`
  - `src/components/domain/orders/order-creation-wizard/order-customer-selector.tsx`
  - `src/components/domain/orders/product-selector.tsx`
  - `src/components/domain/orders/customer-selector.tsx`
  - `src/components/domain/orders/shipment-list.tsx`
  - `src/components/domain/orders/ship-order-dialog.tsx`
  - `src/components/domain/orders/confirm-delivery-dialog.tsx`
  - `src/components/domain/orders/amendment-list.tsx`
  - `src/components/domain/orders/amendment-request-dialog.tsx`
  - `src/components/domain/orders/amendment-review-dialog.tsx`
  - `src/components/domain/orders/template-selector.tsx`
  - `src/components/domain/orders/template-library.tsx`
  - `src/components/domain/orders/template-editor.tsx`
- Findings:
  - [x] Hooks in presenter (moved to containers)
  - [x] Missing prop JSDoc (hook source added where applicable)
  - [x] Missing `isLoading` handling
  - [x] Other: Hook usage removed across list, detail, templates, dialogs, and fulfillment.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Products
- Route (container):
  - `src/routes/_authenticated/products/index.tsx`
  - `src/routes/_authenticated/products/new.tsx`
  - `src/routes/_authenticated/products/$productId/edit.tsx`
  - `src/routes/_authenticated/products/$productId.tsx`
  - `src/routes/_authenticated/settings/categories.tsx`
- Presenter:
  - `src/components/domain/products/product-table.tsx`
  - `src/components/domain/products/category-sidebar.tsx`
  - `src/components/domain/products/product-form/index.tsx`
  - `src/components/domain/products/tabs/overview-tab.tsx`
  - `src/components/domain/products/tabs/pricing-tab.tsx`
  - `src/components/domain/products/tabs/inventory-tab.tsx`
  - `src/components/domain/products/tabs/images-tab.tsx`
  - `src/components/domain/products/tabs/attributes-tab.tsx`
  - `src/components/domain/products/tabs/relations-tab.tsx`
  - `src/components/domain/products/category-tree.tsx`
  - `src/components/domain/products/category-editor.tsx`
- Findings:
  - [x] Hooks in presenter (moved to containers)
  - [x] Missing prop JSDoc (hook source added)
  - [x] Missing `isLoading` handling (tabs and inventory presenters)
  - [x] Other: Moved product form, tabs, category editor, inventory-history, and
    stock-adjustment data hooks to `new.tsx`, `$productId.tsx`, and
    `settings/categories.tsx`.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Inventory
- Route (container):
  - `src/routes/_authenticated/inventory/index.tsx`
  - `src/routes/_authenticated/inventory/dashboard.tsx`
  - `src/routes/_authenticated/inventory/$itemId.tsx`
  - `src/routes/_authenticated/inventory/receiving.tsx`
  - `src/routes/_authenticated/inventory/locations.tsx`
  - `src/routes/_authenticated/inventory/counts.tsx`
  - `src/routes/_authenticated/inventory/forecasting.tsx`
  - `src/routes/_authenticated/inventory/analytics.tsx`
  - `src/routes/_authenticated/inventory/alerts.tsx`
- Presenter:
  - `src/components/domain/inventory/item-tabs.tsx`
  - `src/components/domain/inventory/item-detail.tsx`
  - `src/components/domain/inventory/receiving-form.tsx`
  - `src/components/domain/inventory/receiving-history.tsx`
  - `src/components/domain/inventory/location-tree.tsx`
  - `src/components/domain/inventory/location-form.tsx`
  - `src/components/domain/inventory/location-detail.tsx`
  - `src/components/domain/inventory/stock-count-list.tsx`
  - `src/components/domain/inventory/count-sheet.tsx`
  - `src/components/domain/inventory/variance-report.tsx`
  - `src/components/domain/inventory/reorder-recommendations.tsx`
  - `src/components/domain/inventory/demand-forecast-chart.tsx`
  - `src/components/domain/inventory/valuation-report.tsx`
  - `src/components/domain/inventory/aging-report.tsx`
  - `src/components/domain/inventory/turnover-report.tsx`
  - `src/components/domain/inventory/movement-analytics.tsx`
  - `src/components/domain/inventory/alerts-panel.tsx`
  - `src/components/domain/inventory/alert-config-form.tsx`
  - `src/components/domain/inventory/alerts-list.tsx`
- Findings:
  - [ ] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: No presenter hook usage detected yet from inventory list.
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Jobs
- Route (container):
  - `src/routes/_authenticated/jobs/kanban.tsx`
  - `src/routes/_authenticated/jobs/timeline.tsx`
  - `src/routes/_authenticated/jobs/calendar.tsx`
  - `src/routes/_authenticated/settings/job-templates.tsx`
- Presenter:
  - `src/components/domain/jobs/job-documents-tab.tsx`
  - `src/components/domain/jobs/jobs-board.tsx`
  - `src/components/domain/jobs/jobs-card.tsx`
  - `src/components/domain/jobs/jobs-column.tsx`
  - `src/components/domain/jobs/timeline/jobs-timeline-view.tsx`
  - `src/components/domain/jobs/calendar/job-calendar-view.tsx`
  - `src/components/domain/jobs/job-template-list.tsx`
  - `src/components/domain/jobs/job-template-form-dialog.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [x] Missing prop JSDoc (add hook source)
  - [x] Missing `isLoading` handling
  - [x] Other: Core kanban/calendar/timeline presenters refactored; `job-documents-tab` containerized.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Financial
- Route (container):
  - `src/routes/_authenticated/financial/revenue.tsx`
  - `src/routes/_authenticated/financial/ar-aging.tsx`
  - `src/routes/_authenticated/financial/xero-sync.tsx`
  - `src/routes/_authenticated/financial/reminders.tsx`
- Presenter:
  - `src/components/domain/financial/revenue-reports.tsx`
  - `src/components/domain/financial/ar-aging-report.tsx`
  - `src/components/domain/financial/xero-sync-status.tsx`
  - `src/components/domain/financial/payment-reminders.tsx`
  - `src/components/domain/financial/payment-plans-list.tsx`
  - `src/components/domain/financial/customer-statements.tsx`
  - `src/components/domain/financial/credit-notes-list.tsx`
  - `src/components/domain/financial/financial-dashboard.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [x] Missing prop JSDoc (add hook source)
  - [x] Missing `isLoading` handling
  - [ ] Other: `revenue-reports` already refactored; remaining presenters listed above still
    include data hooks.
- Resolution:
  - [ ] Refactored

---

### Domain: Communications
- Route (container):
  - No dedicated communications routes found yet.
- Presenter:
  - `src/components/domain/communications/campaigns-list.tsx`
  - `src/components/domain/communications/campaign-wizard.tsx`
  - `src/components/domain/communications/campaign-preview-panel.tsx`
  - `src/components/domain/communications/campaign-detail-panel.tsx`
  - `src/components/domain/communications/scheduled-emails-list.tsx`
  - `src/components/domain/communications/schedule-email-dialog.tsx`
  - `src/components/domain/communications/templates-list.tsx`
  - `src/components/domain/communications/signatures-list.tsx`
  - `src/components/domain/communications/signature-selector.tsx`
  - `src/components/domain/communications/signature-editor.tsx`
  - `src/components/domain/communications/scheduled-calls-list.tsx`
  - `src/components/domain/communications/scheduled-call-action-menu.tsx`
  - `src/components/domain/communications/schedule-call-dialog.tsx`
  - `src/components/domain/communications/quick-log-dialog.tsx`
  - `src/components/domain/communications/communication-preferences.tsx`
  - `src/components/domain/communications/upcoming-calls-widget.tsx`
  - `src/components/domain/communications/call-outcome-dialog.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: Hook usage detected across communications presenters; routes not yet split.
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Support
- Route (container):
  - `src/routes/_authenticated/support/dashboard.tsx`
  - `src/routes/_authenticated/support/knowledge-base.tsx`
  - `src/routes/_authenticated/support/issues-board.tsx`
  - `src/routes/_authenticated/settings/knowledge-base.tsx`
  - `src/routes/feedback.$token.tsx`
- Presenter:
  - `src/components/domain/support/csat-metrics-widget.tsx`
  - `src/components/domain/support/csat-low-rating-alerts.tsx`
  - `src/components/domain/support/kb-category-tree.tsx`
  - `src/components/domain/support/kb-article-list.tsx`
  - `src/components/domain/support/kb-article-form-dialog.tsx`
  - `src/components/domain/support/kb-category-form-dialog.tsx`
  - `src/components/domain/support/issue-kanban-board.tsx`
  - `src/components/domain/support/issue-quick-filters.tsx`
  - `src/components/domain/support/issue-bulk-actions.tsx`
  - `src/components/domain/support/issue-status-change-dialog.tsx`
  - `src/components/domain/support/star-rating.tsx`
- Findings:
  - [x] Hooks in presenter (moved to container)
  - [x] Missing prop JSDoc (hook source added)
  - [x] Missing `isLoading` handling
  - [x] Other: CSAT, KB, issue templates, and RMA components now accept container data/handlers.
  - [x] Other: Issue Templates settings route added as container; CSAT public feedback
    flow now uses hooks; issue SLA list uses dedicated hook wrapper; duplicate helper
    extracted to shared support lib.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Warranty
- Route (container):
  - `src/routes/_authenticated/support/warranties/$warrantyId.tsx`
  - `src/routes/_authenticated/settings/warranty-policies.tsx`
  - `src/routes/_authenticated/settings/warranty-import.tsx`
- Presenter:
  - `src/components/domain/warranty/warranty-policy-list.tsx`
  - `src/components/domain/warranty/warranty-policy-form-dialog.tsx`
  - `src/components/domain/warranty/bulk-warranty-import-dialog.tsx`
  - `src/components/domain/warranty/extend-warranty-dialog.tsx`
  - `src/components/domain/warranty/warranty-claim-form-dialog.tsx`
  - `src/components/domain/warranty/warranty-extension-history.tsx`
  - `src/components/domain/warranty/warranty-certificate-template.tsx`
  - `src/components/domain/warranty/warranty-certificate-button.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [x] Missing prop JSDoc (add hook source)
  - [x] Missing `isLoading` handling
  - [x] Other: Warranty policy list/form, bulk import, claim dialogs, and certificate
    actions now receive container data/handlers.
  - [x] Other: Warranty detail now wires certificate, claim, and extension flows
    via hooks; extensions history rendered with retry.
  - [x] Other: Warranty server functions standardized on typed server fns; warranty
    schemas consolidated in `src/lib/schemas/warranty/warranties.ts`.
  - [x] Other: Warranty list route now implemented with DataTable and server list
    wiring; redirect shim removed.
- Resolution:
  - [x] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Suppliers
- Route (container):
  - `src/routes/_authenticated/suppliers/index.tsx`
  - `src/routes/_authenticated/purchase-orders/index.tsx`
  - `src/routes/_authenticated/purchase-orders/$poId.tsx`
  - `src/routes/_authenticated/procurement/dashboard.tsx`
  - `src/routes/_authenticated/approvals/index.tsx`
- Presenter:
  - `src/components/domain/suppliers/supplier-directory.tsx`
  - `src/components/domain/suppliers/supplier-table.tsx`
  - `src/components/domain/suppliers/supplier-filters.tsx`
  - `src/components/domain/purchase-orders/po-directory.tsx`
  - `src/components/domain/purchase-orders/po-table.tsx`
  - `src/components/domain/purchase-orders/po-filters.tsx`
  - `src/components/domain/procurement/procurement-dashboard.tsx`
  - `src/components/domain/procurement/procurement-stats.tsx`
  - `src/components/domain/procurement/procurement-alerts.tsx`
  - `src/components/domain/procurement/dashboard-widgets.tsx`
  - `src/components/domain/approvals/approval-dashboard.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: Hook usage detected in `src/components/domain/approvals/approval-dashboard.tsx`.
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Dashboard
- Route (container): `src/routes/_authenticated/dashboard.tsx`
- Presenter: `src/components/domain/dashboard/main-dashboard.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: Hook usage detected in `src/components/domain/dashboard/welcome-checklist.tsx`.
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Users
- Route (container):
  - `src/routes/_authenticated/admin/users/index.tsx`
  - `src/routes/_authenticated/admin/users/$userId.tsx`
  - `src/routes/_authenticated/admin/users/invite.tsx`
  - `src/routes/_authenticated/admin/users/import.tsx`
  - `src/routes/_authenticated/admin/groups/index.tsx`
  - `src/routes/_authenticated/admin/groups/$groupId.tsx`
  - `src/routes/_authenticated/admin/invitations/index.tsx`
- Presenter:
  - None (UI is defined in route files)
- Findings:
  - [ ] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: User management pages mix data hooks + UI in the route (no presenter split yet).
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Settings
- Route (container):
  - `src/routes/_authenticated/admin/audit/index.tsx`
- Presenter:
  - None (UI is defined in route file)
- Findings:
  - [ ] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: Audit log page mixes data hooks + UI in the route (no presenter split yet).
    Hook usage also detected in `src/components/domain/settings/win-loss-reasons-manager.tsx`.
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Reports
- Route (container):
  - `src/routes/_authenticated/reports/warranties.tsx`
  - `src/routes/_authenticated/reports/procurement/index.tsx`
  - `src/routes/_authenticated/reports/pipeline-forecast.tsx`
  - `src/routes/_authenticated/reports/customers/index.tsx`
- Presenter:
  - `src/components/domain/reports/procurement-reports.tsx`
  - `src/components/domain/reports/win-loss-analysis.tsx`
  - `src/components/domain/reports/pipeline-forecast-chart.tsx`
  - `src/components/domain/reports/forecast-table.tsx`
- Findings:
  - [x] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: Hook usage detected in `procurement-reports` and `win-loss-analysis`.
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

### Domain: Activities
- Route (container):
  - `src/routes/_authenticated/activities/index.tsx`
  - `src/routes/_authenticated/admin/activities/index.tsx`
- Presenter:
  - `src/components/activity/activity-feed.tsx`
  - `src/components/activity/activity-dashboard.tsx`
- Findings:
  - [ ] Hooks in presenter (move to container)
  - [ ] Missing prop JSDoc (add hook source)
  - [ ] Missing `isLoading` handling
  - [ ] Other: Activity presenters live in `src/components/activity/` (non-domain folder).
- Resolution:
  - [ ] Refactored
  - [ ] Not needed (already compliant)

---

## Open Questions / Risks
- Are there presenter components outside `src/components/domain/**` that should
  also follow this pattern?
- Are there pages using shared components that currently call data hooks?
