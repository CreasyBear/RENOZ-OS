# 16 — Purchase order multi-level approval (rules engine)

**Status:** COMPLETE  
**Series order:** 16 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** For a PO, either **auto-approve** by rule threshold, or **materialize** one or more `purchase_order_approvals` rows (levels 1..N) and set the PO to **`pending_approval`**. Approvers then **approve** or **reject** their **level**; on final approval the PO becomes **`approved`**; level rejection sets PO back to **`draft`**.

**In scope:** `evaluateApprovalRules`, `approvePurchaseOrderAtLevel`, `rejectPurchaseOrderAtLevel` ([`approvals.ts`](../../src/server/functions/suppliers/approvals.ts)); schemas [`approveRejectSchema`](../../src/lib/schemas/approvals/index.ts), `rejectSchema`, `evaluateRulesSchema`; hooks [`useEvaluateApprovalRules`](../../src/hooks/suppliers/use-approvals.ts), `useApprovePurchaseOrderAtLevel`, etc.

**Out of scope:** Simple **single-step** PO workflow (`submitForApproval` / `approvePurchaseOrder` on `purchase_orders` only — [10](./10-purchase-order-approval-workflow.md)); escalation/delegate/bulk helpers in same file (separate trace if needed).

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `purchaseOrderId` | Client UUID on evaluate; must match org + not deleted |
| Rule selection | Server reads `purchase_order_approval_rules` filtered by org, `isActive`, min/max amount vs `po.totalAmount` |
| Auto-approve | If any matching rule has `autoApproveUnder > orderAmount` → PO **`approved`** immediately, **no** approval rows |
| Approver assignment | `findApproverByRoles` + workload sort; `validateApprover` (active user) |
| Level approve/reject | Acts on **`purchase_order_approvals.id`** (`approvalId`), status must be `pending` |
| Actor authorization | `verifyApproverAuthorization`: user must be `approverId` **or** `escalatedTo` |

---

## 2. Dual workflow warning (audit-critical)

The codebase supports **two** paths to “pending approval” / “approved”:

| Path | Mechanism | Tables |
|------|-----------|--------|
| **Simple** | `submitForApproval` → `approvePurchaseOrder` | Updates `purchase_orders` only ([10](./10-purchase-order-approval-workflow.md)) |
| **Multi-level** | `evaluateApprovalRules` → rows in `purchase_order_approvals` → `approvePurchaseOrderAtLevel` | `purchase_order_approvals` + `purchase_orders` |

If the product only calls **simple** submit without **evaluate**, `purchase_order_approvals` may stay empty while PO is `pending_approval` — **approvals UI** expecting rows will disagree with reality. Conversely, evaluate + levels must be wired before “my approval” queues work.

---

## 3. Sequence — evaluate

```mermaid
sequenceDiagram
  participant C as Client
  participant E as evaluateApprovalRules
  participant DB as Postgres

  C->>E: POST { purchaseOrderId }
  E->>E: withAuth(suppliers.create)
  E->>DB: load PO; sum rules by amount
  alt autoApproveUnder
    E->>DB: update PO status approved
    E-->>C: autoApproved true, no records
  else requiresApproval rules
    loop each rule level
      E->>DB: find approver by roles; validateApprover
      E->>DB: insert purchase_order_approvals pending + dueAt
    end
    E->>DB: update PO pending_approval
    E-->>C: approvalRecords[], requiredLevels
  end
```

**Permission on evaluate:** `PERMISSIONS.suppliers.create` — same as PO create, not `update`.

---

## 4. Sequence — approve at level

1. `withAuth({ permission: PERMISSIONS.suppliers.approve })`
2. Load approval row: `status = pending`, matching org
3. `verifyApproverAuthorization`
4. Update row → `approved`, `comments`, `approvedAt`
5. `checkAndUpdateFinalApprovalStatus(poId, currentLevel, userId)`:
   - If **no** higher `level` still `pending` → `update purchase_orders set status = approved`
   - Else PO stays `pending_approval` for next level

---

## 5. Sequence — reject at level

1. Same auth + load + `verifyApproverAuthorization`
2. Update approval → `rejected`, comments prefixed with `[reason]`
3. **`update purchase_orders set status = 'draft'`** — entire PO sent back (parallel to simple `rejectPurchaseOrder` behavior in trace 10)

---

## 6. Contracts

| Fn | Schema | Fields |
|----|--------|--------|
| Evaluate | `evaluateRulesSchema` | `purchaseOrderId` |
| Approve level | `approveRejectSchema` | `approvalId`, `comments?` |
| Reject level | `rejectSchema` | `approvalId`, `reason` (enum), `comments` (min 1) |

---

## 7. Failure matrix

| Condition | Error | Notes |
|-----------|-------|-------|
| PO not found (evaluate) | `NotFoundError` | — |
| Rule missing approver roles | `ValidationError` | Blocks evaluate |
| No users for roles | `ValidationError` | — |
| Approval not found / not pending | `NotFoundError` | “already processed” |
| Wrong user | `AuthError` | Not authorized to approve/reject |
| Inactive approver | `ValidationError` | At record creation |

---

## 8. Cache & read-after-write

[`use-approvals.ts`](../../src/hooks/suppliers/use-approvals.ts): evaluate + approve/reject hooks invalidate pending lists, PO detail, stats — read hook file for exact `queryKey`s when tightening UX.

---

## 9. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| **Evaluate uses `suppliers.create`** | Not `update` | Stricter/weaker than expected for “submit for approval” |
| **Simple vs multi-level coexist** | Two code paths | Wrong button sequence → broken queues |
| **`checkAndUpdateFinalApprovalStatus` string** | Uses `APPROVAL_STATUS.APPROVED` for PO | Must match `purchase_orders.status` enum |
| **Reject wipes PO to draft** | `rejectPurchaseOrderAtLevel` | Correct for revision; may surprise if user expected `cancelled` |

---

## 10. Verification

- Search `evaluateApprovalRules`, `approvePurchaseOrderAtLevel`, `rejectPurchaseOrderAtLevel` under `tests/`.
- **Gap:** Two-level PO: first approve leaves pending, second sets approved; auto-approve under threshold; unauthorized approver `AuthError`.

---

## 11. Follow-up traces

- `escalateApproval`, `delegateApproval`, `bulkApprovePurchaseOrders`.
- Wiring: where UI calls `evaluateApprovalRules` vs `submitForApproval` (product map).
