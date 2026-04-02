# Code traces (workflow friction)

**Purpose:** Specification-grade documentation of user-visible workflows so **contracts, failures, side effects, and schema drift** are explicit. Used for audits, remediation, and onboarding senior engineers to a path without re-spelunking.

**Read-only audit artifact:** Describes current behavior. Fixes live in code + issues/PRs. Process context: [WORKFLOW-AUDIT-REMEDIATION-PROCESS.md](../WORKFLOW-AUDIT-REMEDIATION-PROCESS.md).

## Quality bar

Shallow file lists are **not** acceptable traces. Every completed trace must satisfy [TRACE-STANDARD.md](./TRACE-STANDARD.md) (minimum bar: trust boundary, canonical contract, sequence, persistence, failure matrix, cache, drift, verification).

- **Template:** [trace-template.md](./trace-template.md) (copy for new work)
- **Rubric:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## Ordered series

Traces use **`NN-slug.md`** prefixes so order stays stable in file listings and cross-links. When adding a trace, take the next number, update this table, and mark **DRAFT** until it meets TRACE-STANDARD.

| # | File | Workflow | Status |
|---|------|----------|--------|
| 01 | [01-customer-create.md](./01-customer-create.md) | New customer wizard → server create + related entities | **COMPLETE** (reference exemplar) |
| 02 | [02-inventory-stock-in.md](./02-inventory-stock-in.md) | Multiple “stock in” paths (`receiveInventory`, `receiveGoods`, `bulkReceiveStock`) | **COMPLETE** |
| 03 | [03-order-create.md](./03-order-create.md) | Order creation wizard → `createOrder` + idempotency | **COMPLETE** |
| 04 | [04-product-create.md](./04-product-create.md) | `/products/new` → `createProduct` | **COMPLETE** |
| 05 | [05-supplier-create.md](./05-supplier-create.md) | Supplier create container → `createSupplier` | **COMPLETE** |
| 06 | [06-opportunity-create.md](./06-opportunity-create.md) | New opportunity page / quick dialog → `createOpportunity` | **COMPLETE** |
| 07 | [07-customer-contact-address-create.md](./07-customer-contact-address-create.md) | `createContact` / `createAddress` (+ managers, saga with 01) | **COMPLETE** |
| 08 | [08-quote-version-create.md](./08-quote-version-create.md) | Quote builder → `createQuoteVersion` (immutable version + opportunity value) | **COMPLETE** |
| 09 | [09-purchase-order-create.md](./09-purchase-order-create.md) | PO wizard / dialogs → `createPurchaseOrder` | **COMPLETE** |
| 10 | [10-purchase-order-approval-workflow.md](./10-purchase-order-approval-workflow.md) | PO submit / approve / reject / mark ordered | **COMPLETE** |
| 11 | [11-quote-pdf-and-send.md](./11-quote-pdf-and-send.md) | `generateQuotePdf` + `sendQuote` (Resend, stage bump) | **COMPLETE** |
| 12 | [12-warranty-claim-create.md](./12-warranty-claim-create.md) | `createWarrantyClaim` + SLA + notification envelope | **COMPLETE** |
| 13 | [13-rma-receive-inventory.md](./13-rma-receive-inventory.md) | `receiveRma` / `bulkReceiveRma` — return stock + layers | **COMPLETE** |
| 14 | [14-rma-create.md](./14-rma-create.md) | `createRma` — order lines, shipped-serial validation | **COMPLETE** |
| 15 | [15-rma-process-resolution.md](./15-rma-process-resolution.md) | `processRma` — received → processed + resolution metadata | **COMPLETE** |
| 16 | [16-purchase-order-multi-level-approval.md](./16-purchase-order-multi-level-approval.md) | `evaluateApprovalRules` + per-level approve/reject | **COMPLETE** |
| 17 | [17-po-approval-escalate-delegate-bulk.md](./17-po-approval-escalate-delegate-bulk.md) | Escalate / delegate / revoke / bulk approve PO approvals | **COMPLETE** |
| 18 | [18-rma-field-update.md](./18-rma-field-update.md) | `updateRma` — non-status field patches | **COMPLETE** |
| 19 | [19-xero-order-invoice-sync.md](./19-xero-order-invoice-sync.md) | `syncInvoiceToXero` / `resyncInvoiceToXero` | **COMPLETE** |

## Related docs

- [WORKFLOW-AUDIT-REMEDIATION-PROCESS.md](../WORKFLOW-AUDIT-REMEDIATION-PROCESS.md)
- [inventory/README.md](../inventory/README.md)
- [SCHEMA-TRACE.md](../../SCHEMA-TRACE.md)
- [MUTATION-CONTRACT-STANDARD.md](../reliability/MUTATION-CONTRACT-STANDARD.md)
