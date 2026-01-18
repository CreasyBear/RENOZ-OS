# PRD Atomization Summary

> **Generated**: 2026-01-16
> **Total PRDs**: 52
> **Total Stories**: 649
> **Total Estimated Iterations**: 1907

---

## Phase Summary

| Phase | PRDs | Stories | Est. Iterations |
|-------|------|---------|-----------------|
| foundation | 7 | 77 | 229 |
| integration | 7 | 76 | 248 |
| role | 5 | 68 | 136 |
| workflow | 8 | 108 | 358 |
| cross-cutting | 5 | 16 | 48 |
| refactoring | 4 | 70 | 206 |

---

## Story Type Distribution

| Type | Count | Percentage |
|------|-------|------------|
| unknown | 280 | 43.1% |
| ui-component | 147 | 22.7% |
| refactoring | 51 | 7.9% |
| server-function | 49 | 7.6% |
| schema | 40 | 6.2% |
| server | 23 | 3.5% |
| ui | 17 | 2.6% |
| foundation | 17 | 2.6% |
| documentation | 11 | 1.7% |
| route | 4 | 0.6% |
| edge-function | 3 | 0.5% |
| full-page | 2 | 0.3% |
| database | 2 | 0.3% |
| background-job | 1 | 0.2% |
| ai-integration | 1 | 0.2% |
| test | 1 | 0.2% |

---

## PRD Details

| PRD | Phase | Stories | Iterations | File |
|-----|-------|---------|------------|------|
| DOM-CUSTOMERS | core-business | 12 | 35 | `2-domains/customers/customers.prd.json` |
| DOM-DASHBOARD | core-business | 16 | 47 | `2-domains/dashboard/dashboard.prd.json` |
| DOM-ORDERS | core-business | 15 | 41 | `2-domains/orders/orders.prd.json` |
| DOM-PIPELINE | core-business | 15 | 44 | `2-domains/pipeline/pipeline.prd.json` |
| DOM-PRODUCTS | core-business | 18 | 53 | `2-domains/products/products.prd.json` |
| DOM-SETTINGS | core-business | 13 | 38 | `2-domains/settings/settings.prd.json` |
| DOM-SUPPLIERS | core-business | 12 | 35 | `2-domains/suppliers/suppliers.prd.json` |
| DOM-ACTIVITIES | core-foundation | 5 | 10 | `2-domains/activities/activities.prd.json` |
| DOM-USERS | core-foundation | 13 | 38 | `2-domains/users/users.prd.json` |
| DOM-INVENTORY | core-operations | 13 | 38 | `2-domains/inventory/inventory.prd.json` |
| CC-A11Y | cross-cutting | 4 | 12 | `1-foundation/accessibility/accessibility.prd.json` |
| CC-EMPTY | cross-cutting | 3 | 9 | `1-foundation/empty-states/empty-states.prd.json` |
| CC-ERROR | cross-cutting | 2 | 6 | `1-foundation/error-handling/error-handling.prd.json` |
| CC-LOADING | cross-cutting | 4 | 12 | `1-foundation/loading-states/loading-states.prd.json` |
| CC-NOTIFY | cross-cutting | 3 | 9 | `1-foundation/notifications/notifications.prd.json` |
| DOM-REPORTS | domain-system | 8 | 23 | `2-domains/reports/reports.prd.json` |
| DOM-COMMS | domain-v1 | 17 | 51 | `2-domains/communications/communications.prd.json` |
| DOM-FINANCIAL | domain-v1 | 21 | 64 | `2-domains/financial/financial.prd.json` |
| DOM-JOBS | domain-v1 | 19 | 51 | `2-domains/jobs/jobs.prd.json` |
| DOM-SUPPORT | domain-v2 | 17 | 44 | `2-domains/support/support.prd.json` |
| DOM-WARRANTY | domain-v2 | 20 | 70 | `2-domains/warranty/warranty.prd.json` |
| FOUND-APPSHELL | foundation | 18 | 54 | `1-foundation/appshell/appshell-foundation.prd.json` |
| FOUND-AUTH | foundation | 13 | 37 | `1-foundation/auth/auth-foundation.prd.json` |
| FOUND-AUTH-EXT | foundation | 8 | 24 | `1-foundation/auth-extensions/auth-extensions.prd.json` |
| FOUND-FILE-STORAGE | foundation | 7 | 23 | `1-foundation/file-storage/file-storage.prd.json` |
| FOUND-REALTIME | foundation | 9 | 27 | `1-foundation/realtime/realtime-webhooks-foundation.prd.json` |
| FOUND-SCHEMA | foundation | 12 | 34 | `1-foundation/schema/schema-foundation.prd.json` |
| FOUND-SHARED | foundation | 10 | 30 | `1-foundation/shared-components/shared-components-foundation.prd.json` |
| INT-AI-INFRA | integration | 19 | 73 | `3-integrations/ai-infrastructure/ai-infrastructure.prd.json` |
| INT-CLAUDE | integration | 9 | 27 | `3-integrations/claude-ai.prd.json` |
| INT-ERROR-TRACKING | integration | 4 | 10 | `3-integrations/error-tracking/error-tracking.prd.json` |
| INT-GDPR | integration | 4 | 15 | `3-integrations/gdpr-privacy/gdpr-privacy.prd.json` |
| INT-PAYMENTS | integration | 8 | 27 | `3-integrations/payment-processing/payment-processing.prd.json` |
| INT-RESEND | integration | 15 | 45 | `3-integrations/resend.prd.json` |
| INT-XERO | integration | 17 | 51 | `3-integrations/xero.prd.json` |
| REF-AI | refactoring | 19 | 57 | `archive/refactoring/ai-architecture.prd.json` |
| REF-COMPONENTS | refactoring | 19 | 57 | `archive/refactoring/components.prd.json` |
| REF-HOOKS | refactoring | 14 | 41 | `archive/refactoring/hooks.prd.json` |
| REF-SERVER | refactoring | 18 | 51 | `archive/refactoring/server-functions.prd.json` |
| ROLE-ADMIN | role | 21 | 42 | `4-roles/admin.prd.json` |
| ROLE-FIELD | role | 10 | 20 | `4-roles/field-tech.prd.json` |
| ROLE-FINANCE | role | 17 | 34 | `4-roles/finance.prd.json` |
| ROLE-OPS | role | 10 | 20 | `4-roles/operations.prd.json` |
| ROLE-SALES | role | 10 | 20 | `4-roles/sales.prd.json` |
| WF-FULFILLMENT | workflow | 7 | 26 | `archive/workflows/order-fulfillment.prd.json` |
| WF-INVOICING | workflow | 12 | 44 | `archive/workflows/invoicing.prd.json` |
| WF-JOB | workflow | 17 | 56 | `archive/workflows/job-completion.prd.json` |
| WF-LEAD-ORDER | workflow | 14 | 41 | `archive/workflows/lead-to-order.prd.json` |
| WF-ONBOARDING | workflow | 18 | 56 | `archive/workflows/customer-onboarding.prd.json` |
| WF-PROCUREMENT | workflow | 11 | 38 | `archive/workflows/procurement.prd.json` |
| WF-SUPPORT | workflow | 10 | 34 | `archive/workflows/support-resolution.prd.json` |
| WF-WARRANTY | workflow | 19 | 63 | `archive/workflows/warranty-claims.prd.json` |

---

*Generated by regenerate_meta.py on 2026-01-16*