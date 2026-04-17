# Read-Contract Registry

Execution artifact for the read-path error handling program. This replaces the old query-normalization tracker as the source of truth for read contracts, visible failure policy, and verification.

## Program Rules

- Preserve server truth first. Classify the backing server function before changing the hook.
- Use only these read contract types:
  - `always-shaped`
  - `detail-not-found`
  - `nullable-by-design`
- Use only these read failure kinds:
  - `unauthorized`
  - `forbidden`
  - `not-found`
  - `validation`
  - `rate-limited`
  - `system`
  - `unknown`
- Use only these consumer criticality levels:
  - `headline`
  - `secondary`
  - `optional`
- Never convert valid empty arrays, zero summaries, or domain-valid `null` into synthetic “unavailable” states.
- Preserve raw error signal before normalization. Serialized plain-object errors can lose `code` or `status` if we classify only after generic normalization.
- When a headline summary is unavailable, hide every dependent count/card/tab label that would otherwise look like a healthy zero or stale metric.
- New raw `throw new Error('Query returned no data')` patterns in `src/hooks/**` are blocked by `scripts/check-read-path-query-guards.mjs`.
- While the program is in flight, untouched legacy files stay in the file-by-file backlog and are guarded by the baseline.

## Normalization Matrix

| Contract type | Server truth | Hook rule | Consumer rule |
| --- | --- | --- | --- |
| `always-shaped` | Success returns arrays/objects/zero metrics even when empty | Remove fake null-sentinel throws. Normalize only real thrown failures. | Empty state is healthy. Headline failures must render unavailable/degraded explicitly. |
| `detail-not-found` | Missing record is a real semantic outcome | Preserve `404` as `not-found`. Do not blur with generic unavailable. | Render not-found intentionally. Reserve unavailable copy for transport/system failures. |
| `nullable-by-design` | `null` is a valid domain answer | Return `null` as success. Normalize only thrown failures. | Render explicit absent state, not misleading success and not generic failure. |

## Canonical Examples

| Surface | Backing server fn | Contract type | Why |
| --- | --- | --- | --- |
| Issue list | `getIssues`, `getIssuesWithSlaMetrics` | `always-shaped` | Lists return `[]` when no issues match. |
| Issue detail | `getIssueById` | `detail-not-found` | Missing issue throws `NotFoundError`. |
| Issue feedback | `getIssueFeedback` | `nullable-by-design` | No feedback yet returns `null`. |

## Contributor Checklist

- Backing server function identified from the hook import.
- Contract type chosen from server behavior, not from the existing hook.
- Failure kinds preserved when the server throws typed errors.
- Consumer criticality declared for the visible surface.
- Render policy chosen explicitly: unavailable, localized degrade, or absent state.
- Tests added or updated for success, semantic missing states, and thrown failures.

## Active Registry

### Wave 1: Support + Service

| File | Backing server fn | Contract type | Semantic outcomes | Consumer criticality | Render policy | Test file | Status | Deferred reason / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/hooks/support/use-issues.ts` | `getIssues`, `getIssuesWithSlaMetrics`, `getIssueById`, `previewIssueIntake` | mixed: `always-shaped`, `detail-not-found` | empty issue lists are healthy; missing issue detail is `not-found`; preview is shaped success | `headline` | queue/detail surfaces must show explicit unavailable or not-found state | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | Hook migrated to `normalizeReadQueryError` and fake null throws removed. |
| `src/hooks/support/use-support-metrics.ts` | `getSupportMetrics` | `always-shaped` | zero metrics are healthy; thrown failures are unavailable | `headline` | support landing/dashboard show visible unavailable state | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | Metrics route already had a prominent error card. |
| `src/hooks/support/use-sla.ts` | `getSlaConfigurations`, `getSlaConfiguration`, `getDefaultSlaConfiguration`, `hasSlsConfigurations`, `getSlaMetrics`, `getSlaReportByIssueType`, `getSlaState`, `getSlaEvents` | mixed: `always-shaped`, `detail-not-found`, `nullable-by-design` | list/report/event reads are shaped; missing config/tracking is `not-found`; default config may be `null` | `secondary` | localized unavailable sections for SLA panels; preserve not-found semantics for detail reads | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | Default config remains nullable by design. |
| `src/hooks/support/use-csat.ts` | `getIssueFeedback`, `listFeedback`, `getCsatMetrics`, `validateFeedbackToken` | mixed: `nullable-by-design`, `always-shaped` | feedback may be `null`; list/metrics/token validation return shaped objects | `secondary` | localized unavailable cards; explicit absent state when no feedback exists yet | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | CSAT widgets already accept `error` and empty data separately. |
| `src/hooks/service/use-service-systems.ts` | `getServiceSystem`, `listServiceSystems`, `getServiceLinkageReview`, `listServiceLinkageReviews` | mixed: `detail-not-found`, `always-shaped` | service lists are shaped; missing detail/review is `not-found` | `headline` | detail pages show not-found intentionally; lists degrade visibly on transport failure | `tests/unit/service/query-normalization-wave1.test.tsx` | `verified` | Baseline support/service pattern for later waves. |
| `src/routes/_authenticated/support/support-page.tsx` | `useSupportMetrics` consumer | n/a | headline triage metrics already treat hook failure as unavailable | `headline` | visible error card with retry | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | Existing consumer behavior already matched the policy. |
| `src/routes/_authenticated/support/dashboard.tsx` | `useSupportMetrics`, `useCsatMetrics` consumer | n/a | headline metrics and CSAT cards already accept explicit error states | `headline` + `secondary` | visible route-level metrics error, widget-level CSAT unavailable state | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | Existing widget error props preserved. |
| `src/routes/_authenticated/support/issues/issues-page.tsx` | `useIssuesWithSlaMetrics` consumer | n/a | queue error remains explicit, empty queue remains healthy | `headline` | full-page error state or empty state, never misleading partial success | `tests/unit/support/query-normalization-wave1.test.tsx` | `verified` | Existing `ErrorState` / `EmptyState` split is aligned. |
| `tests/unit/read-path-policy.test.ts` | shared primitive | n/a | failure-kind classification | n/a | n/a | self | `verified` | Covers semantic classification and read-query annotations. |
| `tests/unit/support/query-normalization-wave1.test.tsx` | support slice tests | n/a | hook contract verification | n/a | n/a | self | `verified` | Covers always-shaped, detail-not-found, nullable-by-design. |
| `tests/unit/service/query-normalization-wave1.test.tsx` | service slice tests | n/a | hook contract verification | n/a | n/a | self | `verified` | Confirms list/detail semantics for service baseline. |

### Wave 2: Customers + Orders

| File | Backing server fn | Contract type | Semantic outcomes | Consumer criticality | Render policy | Test file | Status | Deferred reason / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/hooks/customers/use-customer-detail-extended.ts` | `getCustomerAlerts`, `getCustomerActiveItems`, `getCustomerOrderSummary` | `always-shaped` | alerts, active items, and order summary all return shaped zero/empty results | `headline` for order summary, `secondary` for alerts/active items | headline order summary failure gets a visible degraded banner and unavailable recent-order surfaces | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Fake null-sentinel throws removed. |
| `src/hooks/customers/use-customer-triage.ts` | `getCustomerTriage` | `always-shaped` | empty triage buckets are healthy success | `secondary` | triage section can render empty state without implying failure | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Shaped response preserved. |
| `src/hooks/customers/use-duplicate-detection.ts` | `detectDuplicates` | `always-shaped` | empty duplicate result is healthy success; thrown failures surface explicit unavailable copy | `secondary` | duplicate checker keeps form usable while showing localized failure copy | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Debounced duplicate checks now normalize transport/system failures. |
| `src/hooks/customers/use-customer-detail.ts` | consumer hook over `useCustomerOrderSummary` | n/a | summary failure should not masquerade as “no orders” | `headline` | exposes `orderSummaryState` plus degraded warning copy | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Customer detail hook now carries explicit summary state. |
| `src/components/domain/customers/containers/customer-detail-container.tsx` | `useCustomerDetail` consumer | n/a | passes through degraded state to presenter | `headline` | presenter receives `orderSummaryState` directly | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Thin container alignment fix. |
| `src/components/domain/customers/views/customer-detail-view.tsx` | customer detail presenter | n/a | banner plus per-tab unavailable rendering | `headline` | degraded banner stays prominent; order surfaces receive summary state, and headline metrics/tab counts are hidden when summary data is unavailable | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Review fix: warning copy now matches actual hidden surfaces. |
| `src/components/domain/customers/tabs/customer-overview-tab.tsx` | `customer.orderSummary` consumer | n/a | summary unavailable is distinct from no recent orders | `headline` | Recent Orders section shows unavailable alert instead of “No orders yet” | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Fixes silent degradation on overview. |
| `src/components/domain/customers/tabs/customer-orders-tab.tsx` | `customer.orderSummary` consumer | n/a | summary unavailable is distinct from no order history | `headline` | orders tab shows unavailable alert and Orders-module escape hatch | `tests/unit/customers/query-normalization-wave2.test.tsx` | `verified` | Fixes silent degradation on orders tab. |
| `src/hooks/orders/use-orders.ts` | `listOrders`, `getOrder`, `getOrderStats`, `getFulfillmentDashboardSummary` | mixed: `always-shaped`, `detail-not-found` | list/stats/fulfillment reads return shaped success; missing detail is `not-found` | `headline` | list/stats degrade visibly on thrown failure; order detail preserves not-found semantics | `tests/unit/orders/query-normalization-wave2.test.tsx` | `verified` | Removed order-list synthetic fallbacks and fulfillment null-sentinel throw; classified reads from server truth. |
| `src/hooks/orders/use-order-detail.ts` | `getOrderWithCustomer` | `detail-not-found` | missing order remains `not-found`; successful detail stays shaped | `headline` | detail pages preserve not-found vs unavailable distinction | `tests/unit/orders/query-normalization-wave2.test.tsx` | `verified` | Order-with-customer hook now uses read-path policy instead of generic normalization. |
| `src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx` | `useFulfillmentDashboardSummary` consumer | n/a | summary unavailable already distinct from empty queue | `headline` | visible banner plus hidden headline cards | `tests/unit/orders/fulfillment-metrics.test.ts` | `verified` | Existing consumer policy was already aligned; Wave 2 order-hook normalization now feeds the same summary-state contract. |
| `src/components/domain/orders/fulfillment/fulfillment-dashboard.tsx` | fulfillment presenter | n/a | headline summary already withheld on unavailable state | `headline` | explicit unavailable subtitles and warning banner | `tests/unit/orders/fulfillment-metrics.test.ts` | `verified` | Presenter behavior is enforced through `buildFulfillmentStats` and summary-state-driven metric hiding. |
| `tests/unit/customers/query-normalization-wave2.test.tsx` | wave test | n/a | hook and consumer verification | n/a | n/a | self | `verified` | Covers always-shaped hook success/failure and unavailable tab rendering. |
| `tests/unit/orders/query-normalization-wave2.test.tsx` | orders wave test | n/a | order hook verification | n/a | n/a | self | `verified` | Covers always-shaped order list/stats/fulfillment reads and detail not-found semantics. |
| `tests/unit/orders/fulfillment-metrics.test.ts` | fulfillment consumer policy test | n/a | summary-state verification | n/a | n/a | self | `verified` | Confirms fulfillment headline metrics stay hidden when authoritative summary is loading or unavailable. |

### Wave 3: Warranty + Inventory + Procurement

| File | Backing server fn | Contract type | Semantic outcomes | Consumer criticality | Render policy | Test file | Status | Deferred reason / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/hooks/warranty/core/use-warranties.ts` | `listWarranties`, `getWarrantyStatusCounts`, `getWarranty` | mixed: `always-shaped`, `detail-not-found` | list/count reads return empty/zero success; missing warranty detail is `not-found` | `headline` for detail/list, `secondary` for status counts | list/count surfaces degrade visibly on failure; detail preserves not-found semantics | `tests/unit/warranty/query-normalization-wave3.test.tsx` | `verified` | Removed raw null-sentinel throws and normalized from server truth. |
| `src/hooks/warranty/core/use-expiring-warranties.ts` | `getExpiringWarranties`, `getExpiringWarrantiesReport`, `getExpiringWarrantiesFilterOptions` | `always-shaped` | empty expiring-warranty results and filter options are healthy success | `headline` for dashboard/report list, `secondary` for filter options | report and dashboard surfaces should show explicit unavailable states only on thrown failures | `tests/unit/warranty/query-normalization-wave3.test.tsx` | `verified` | First Wave 3 warranty bay; report/filter-option reads no longer use raw query guards. |
| `src/hooks/warranty/extensions/use-warranty-extensions.ts` | `listWarrantyExtensions`, `getExtensionHistory`, `getExtensionById` | mixed: `always-shaped`, `detail-not-found` | extension lists/history accept empty success; missing extension detail is `not-found` | `secondary` | history/list panels degrade locally on failure; extension detail preserves not-found semantics | `tests/unit/warranty/query-normalization-wave3-extensions.test.tsx` | `verified` | Warranty extension reads now follow the read-path policy without raw null guards. |
| `src/hooks/warranty/policies/use-warranty-policies.ts` | `listWarrantyPolicies`, `getWarrantyPoliciesWithSla`, `getWarrantyPolicy`, `getDefaultWarrantyPolicy`, `resolveWarrantyPolicy` | mixed: `always-shaped`, `detail-not-found`, `nullable-by-design` | policy lists/SLA joins and resolution results are shaped success; missing policy detail is `not-found`; default policy can validly be `null` | `headline` for settings list/detail, `secondary` for resolution helpers | settings surfaces degrade explicitly on thrown failures while preserving missing-policy semantics and nullable defaults | `tests/unit/warranty/query-normalization-wave3-policies.test.tsx` | `verified` | Resolution reads stay shaped even when no policy matches; default policy remains nullable by design. |
| `src/hooks/warranty/analytics/use-warranty-analytics.ts` | `getWarrantyAnalyticsSummary`, `getClaimsByProduct`, `getClaimsTrend`, `getClaimsByType`, `getSlaComplianceMetrics`, `getCycleCountAtClaim`, `getExtensionVsResolution`, `getWarrantyAnalyticsFilterOptions` | `always-shaped` | zero-value summaries, empty chart datasets, and filter-option lists are healthy success states; only thrown failures should degrade the dashboard | `headline` for summary, `secondary` for charts and filter options | summary and chart cards should rely on localized query error state rather than synthetic null failures | `tests/unit/warranty/query-normalization-wave3-analytics.test.tsx` | `verified` | Analytics dashboard already consumes panel-level `isError`; this slice removes raw null guards and preserves combined-dashboard error state for real failures. |
| `src/hooks/warranty/certificates/use-warranty-certificates.ts` | `getWarrantyCertificate` | `always-shaped` | absent certificates and even missing backing warranties resolve to shaped success; only thrown failures should surface as unavailable certificate status | `secondary` | warranty detail certificate panel should show unavailable status on thrown failures, not collapse to “No certificate generated yet” | `tests/unit/warranty/query-normalization-wave3-certificates.test.tsx` | `verified` | Certificate status now follows server truth and no longer invents synthetic null failures. |
| `src/components/domain/warranty/views/warranty-detail-view.tsx` | certificate status from `useWarrantyCertificate` | n/a | certificate card previously treated read failure like missing certificate | `secondary` | certificate card now shows unavailable copy plus retry affordance when the status read fails | `tests/unit/warranty/query-normalization-wave3-certificates.test.tsx` | `verified` | Closed the secondary-panel trust gap so certificate read failure is not rendered as “No certificate generated yet.” |
| `tests/unit/warranty/query-normalization-wave3.test.tsx` | warranty wave test | n/a | hook contract verification | n/a | n/a | self | `verified` | Covers warranty list/count/detail plus expiring-report/filter-option semantics. |
| `tests/unit/warranty/query-normalization-wave3-extensions.test.tsx` | warranty extensions wave test | n/a | hook contract verification | n/a | n/a | self | `verified` | Covers extension list/history success and extension-detail not-found semantics. |
| `tests/unit/warranty/query-normalization-wave3-policies.test.tsx` | warranty policies wave test | n/a | hook contract verification | n/a | n/a | self | `verified` | Covers policy list/detail/default/resolve semantics, including nullable default policy success. |
| `tests/unit/warranty/query-normalization-wave3-analytics.test.tsx` | warranty analytics wave test | n/a | hook and combined-dashboard verification | n/a | n/a | self | `verified` | Covers always-shaped analytics success, filter-option success, normalized system failure, and combined-dashboard error propagation. |
| `tests/unit/warranty/query-normalization-wave3-certificates.test.tsx` | warranty certificates wave test | n/a | hook and consumer verification | n/a | n/a | self | `verified` | Covers always-shaped certificate status, normalized failure semantics, and unavailable certificate card copy. |

## Backlog Inventory

Detailed contract rows exist for active slices above. Untouched waves remain explicit file-by-file checklists until each file is classified from server truth.

### Remaining Wave 2 Backlog

### Wave 3: Warranty + Inventory + Procurement

- `src/hooks/warranty/claims/use-warranty-claims.ts`
- `src/hooks/inventory/use-alerts.ts`
- `src/hooks/inventory/use-forecasting.ts`
- `src/hooks/inventory/use-locations.ts`
- `src/hooks/inventory/use-quality.ts`
- `src/hooks/inventory/use-stock-counts.ts`
- `src/hooks/inventory/use-valuation.ts`
- `src/hooks/inventory/use-wms-dashboard.ts`
- `src/hooks/suppliers/use-approvals.ts`
- `src/hooks/suppliers/use-bulk-purchase-orders.ts`
- `src/hooks/suppliers/use-goods-receipt.ts`
- `src/hooks/suppliers/use-po-costs.ts`
- `src/hooks/suppliers/use-procurement-analytics.ts`
- `src/hooks/suppliers/use-purchase-orders.ts`
- `src/hooks/suppliers/use-suppliers.ts`
- `tests/unit/warranty/query-normalization-wave3.test.ts`
- `tests/unit/inventory/query-normalization-wave3.test.ts`
- `tests/unit/purchase-orders/query-normalization-wave3.test.ts`

### Wave 4: Jobs + Communications + Reports

- `src/hooks/jobs/use-files.ts`
- `src/hooks/jobs/use-installers.ts`
- `src/hooks/jobs/use-job-documents.ts`
- `src/hooks/jobs/use-job-resources.ts`
- `src/hooks/jobs/use-job-scheduling.ts`
- `src/hooks/jobs/use-job-templates-config.ts`
- `src/hooks/jobs/use-notes.ts`
- `src/hooks/jobs/use-project-alerts.ts`
- `src/hooks/jobs/use-project-bom.ts`
- `src/hooks/jobs/use-site-visits.ts`
- `src/hooks/jobs/use-workstreams.ts`
- `src/hooks/communications/use-campaigns.ts`
- `src/hooks/communications/use-contact-preferences.ts`
- `src/hooks/communications/use-customer-communications.ts`
- `src/hooks/communications/use-email-history.ts`
- `src/hooks/communications/use-email-preview.ts`
- `src/hooks/communications/use-email-suppression.ts`
- `src/hooks/communications/use-inbox.ts`
- `src/hooks/communications/use-scheduled-calls.ts`
- `src/hooks/communications/use-scheduled-emails.ts`
- `src/hooks/communications/use-signatures.ts`
- `src/hooks/communications/use-templates.ts`
- `src/hooks/reports/use-custom-reports.ts`
- `src/hooks/reports/use-report-favorites.ts`
- `src/hooks/reports/use-scheduled-reports.ts`
- `src/hooks/reports/use-win-loss.ts`
- `tests/unit/jobs/query-normalization-wave4.test.ts`
- `tests/unit/communications/query-normalization-wave4.test.ts`
- `tests/unit/reports/query-normalization-wave4.test.ts`

### Wave 5: Long Tail

- `src/hooks/_shared/use-audit-logs.ts`
- `src/hooks/dashboard/use-dashboard-layouts.ts`
- `src/hooks/dashboard/use-inventory-counts.ts`
- `src/hooks/dashboard/use-recent-items.ts`
- `src/hooks/dashboard/use-tracked-products.ts`
- `src/hooks/documents/use-generate-document.ts`
- `src/hooks/invoices/use-invoice-summary.ts`
- `src/hooks/invoices/use-invoices.ts`
- `src/hooks/portal/use-portal-data.ts`
- `src/hooks/products/use-product-bundles.ts`
- `src/hooks/products/use-product-images.ts`
- `src/hooks/products/use-product-inventory.ts`
- `src/hooks/products/use-product-pricing.ts`
- `src/hooks/products/use-product-search-advanced.ts`
- `src/hooks/products/use-products.ts`
- `src/hooks/profile/use-notification-preferences.ts`
- `src/hooks/settings/use-win-loss-reasons.ts`
- `src/hooks/users/use-delegations.ts`
- `src/hooks/users/use-invitations.ts`
- `src/hooks/users/use-my-activity.ts`
- `src/hooks/users/use-sessions.ts`
- `src/hooks/users/use-users.ts`
- `tests/unit/users/query-normalization-wave5.test.ts`
- `tests/unit/query-error-normalization-wave5.test.ts`
