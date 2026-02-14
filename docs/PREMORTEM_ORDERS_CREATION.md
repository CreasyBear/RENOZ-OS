# Premortem: Orders / Creation

**Scope:** OrderCreationWizard — create order with customer, products, pricing, shipping, review.

**Audit date:** 2026-02-14

---

## Entry Points

| Location | Entry | Uses OrderCreationWizard? | Notes |
|----------|-------|---------------------------|-------|
| Orders list | "New Order" button | Yes | Navigates to `/orders/create` |
| Customer detail | Quick Actions → "Create Order" | Yes | Navigates to `/orders/create` (no customer pre-select) |
| Customer Orders tab | "New Order" / empty state CTA | Yes | Link to `/orders/create` |
| Command palette | "Create Order" | Yes | Route `/orders/create`, permission `order.create` |
| Keyboard shortcut | ⌘+Shift+O | Yes | `navigate({ to: '/orders/create' })` |
| Invoice action button | Link | Yes | `to="/orders/create"` |
| OrderCreateDialog | Fulfillment kanban | **No** | Exported but **not imported anywhere** — orphan |
| createOrderForKanban | Server fn | N/A | Exists; never called — dead code |

**Verified:** OrderCreateDialog and createOrderForKanban are orphan. Fulfillment dashboard has no "add order" in kanban columns.

**Quote-to-order:** Opportunity detail → "Convert to Order" → `convertToOrder` server fn. Uses `createOrder` internally but bypasses wizard. Documented as separate flow; out of scope.

---

## Standards & Design System Review

| Check | Result |
|-------|--------|
| Container/presenter | Page uses OrderCreationWizard (presenter); mutation in page (thin container). Wizard has internal state — acceptable for multi-step form. |
| Centralized query keys | useCreateOrder uses queryKeys.orders; invalidates lists + detail. Compliant. |
| Barrel exports | OrderCreationWizard from domain/orders. Compliant. |
| Route code-splitting | create.tsx lazy-loads -create-page. Compliant. |
| UI components | Wizard uses Form, Card, Button, Select, Input, Table from components/ui. Compliant. |
| Similar flows | Customer creation, quote creation — different patterns. No shared wizard/step indicator. |
| Money & Currency | createOrderSchema uses currencySchema; STANDARDS: dollars. Compliant. |

**Gaps:**
- Duplicate `createOrderSchema`: [order-create-dialog.schema.ts](src/components/domain/orders/cards/order-create-dialog.schema.ts) (minimal: customerId, orderNumber, dueDate, notes) vs [lib/schemas/orders/orders.ts](src/lib/schemas/orders/orders.ts) (full). OrderCreateDialog is orphan — schema in cards/ is dead.
- No shared step indicator component — wizard has inline step UI. Acceptable.

---

## User Expectations (5 Questions)

**Representative user:** Sales rep creating an order for a customer.

| # | Question | Answer |
|---|----------|--------|
| 1 | What does the end user expect? | Create an order with customer + items and get to order detail quickly. Flow should feel guided, not overwhelming. |
| 2 | How do I exceed? | Pre-fill customer when coming from customer page; save draft; copy from similar order; keyboard shortcuts; cancel confirmation. |
| 3 | Blockers | No `?customerId=` deep link; no draft save; cancel loses everything with no confirmation; Customer Orders tab link doesn't pass customerId. |
| 4 | Solutions + trade-offs | URL param (low effort, high impact) vs session draft (medium) vs full draft API (high). Cancel confirm: simple modal (low) vs "Save draft?" (medium). |
| 5 | Optimal | Add `?customerId=` for customer-context entry points. Add cancel confirmation ("Discard changes?"). |

---

## Walkthrough

**Scenario:** Sales rep creates order from Orders list. Then from Customer detail → Create Order.

**Flow traced:**
1. Orders list → "New Order" → `/orders/create`
2. Step 1: Select customer (CustomerSelectorContainer)
3. Step 2: Add products (ProductSelector)
4. Step 3: Pricing (discount)
5. Step 4: Shipping (address, due date)
6. Step 5: Review → Submit → createOrder → navigate to order detail

**Findings:**
- From Customer detail: navigates to `/orders/create` with no search params. User must re-select customer. Friction.
- Cancel: navigates to `/orders` immediately. No confirmation. User can lose work by accident.
- create route has no validateSearch; no support for `?customerId=`.

**Edge cases:**
- [x] Empty state: No customers — CustomerSelector shows empty list
- [x] Empty state: No products — ProductSelector allows add; step blocks proceed if empty
- [x] Partial data: Back loses step state (expected for wizard)
- [ ] URL params: No `?customerId=` support
- [ ] Permission boundary: Not tested (order.create required)

---

## Premortem

### Critical

- [ ] **No customer pre-selection from Customer context:** Customer detail, Customer Orders tab, and use-customer-detail onCreateOrder all navigate to `/orders/create` without `customerId`. User must re-select. High friction for common flow.
- [ ] **Cancel loses all progress with no confirmation:** User can accidentally click Cancel and lose everything. No "Discard changes?" dialog.
- [ ] **Products step can proceed with zero items?** Wizard blocks "Next" if lineItems empty — need to verify. createOrderSchema requires `lineItems.min(1)`.

### User Debt

- [ ] **Empty CustomerSelector / ProductSelector states:** Messaging could be clearer (e.g. "No customers match your search" vs generic empty).
- [ ] **No deep link `?customerId=`:** Entry points from customer context don't pass customer.
- [ ] **No draft save:** Long forms; user may need to leave. No way to save progress.

### Developer Debt

- [ ] **OrderCreateDialog + createOrderForKanban orphan:** Exported but never used. Dead code.
- [ ] **EnhancedOrderCreationWizard exists:** [enhanced-order-creation-wizard.tsx](src/components/domain/orders/creation/order-creation-wizard/enhanced-order-creation-wizard.tsx) — not used by create route. Which is canonical?
- [ ] **Duplicate createOrderSchema:** order-create-dialog.schema.ts vs lib/schemas/orders/orders.ts. Orphan schema in cards/.

---

## Broken Paths List

| ID | Item | Priority |
|----|------|----------|
| 1 | Add `?customerId=` support; pass from Customer detail, Customer Orders tab | P0 |
| 2 | Add cancel confirmation ("Discard changes?") | P0 |
| 3 | Verify products step blocks submit when empty | P1 |
| 4 | Improve empty states for CustomerSelector / ProductSelector | P1 |
| 5 | Remove or document OrderCreateDialog + createOrderForKanban | P2 |
| 6 | Clarify EnhancedOrderCreationWizard vs OrderCreationWizard | P2 |
| 7 | Consolidate createOrderSchema; remove orphan in cards/ | P2 |

---

## Remediation Plan

### P0 — DONE
- [x] Add `customerId` to create route search params; pass to OrderCreationWizard; pre-select in CustomerSelector
- [x] Update Customer detail, Customer Orders tab links to include `?customerId={id}`
- [x] Add cancel confirmation dialog before navigate to /orders

### P1 — DONE
- [x] Verify products step validation (block proceed if no items); add hint "Add at least one product to continue."
- [x] Improve empty state messaging (CustomerSelector/ProductSelector already clear)

### P2 — DONE
- [x] Deprecate OrderCreateDialog + createOrderForKanban (orphan; JSDoc @deprecated)
- [x] Document EnhancedOrderCreationWizard as deprecated; canonical is OrderCreationWizard
- [x] Consolidate createOrderSchema; deprecate order-create-dialog.schema.ts

### Draft Save — DONE
- [x] useOrderCreateDraft hook: localStorage persistence, debounced auto-save, revive dates
- [x] Restore banner when hasDraft; Restore / Discard actions
- [x] Clear draft on submit success; clear on cancel (via onDraftReady)
- [x] Skip draft when initialCustomerId (customer-context entry)

---

## Hardening

| Failure mode | Guard | Status |
|--------------|-------|--------|
| customerId invalid in URL | validateSearch: z.string().uuid().optional().catch(undefined) | Done |
| Submit with no line items | canProceed step 2: state.lineItems.length > 0; buildSubmitData throws if empty | Done |
| Cancel accidental | AlertDialog "Discard changes?" before navigate | Done |
| Stale customer pre-select | useCustomer fetches; onSelect only when customer loads; invalid ID = no pre-select | Done |
