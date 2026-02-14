# Premortem: Orders / Shipping

**Scope:** ShipOrderDialog — create shipment, optionally mark as shipped.

**Audit date:** 2026-02-14

---

## Entry Points

| Location | Entry | Uses ShipOrderDialog? | Notes |
|----------|-------|------------------------|-------|
| Order detail | Fulfillment tab → "Ship Order" / "Ship Remaining" | Yes | |
| Fulfillment dashboard | Shipping queue table → "Ship" per row | Yes | |
| Toast after picking | "Ship Order" action | Yes | Opens ShipOrderDialog |
| Orders list | Bulk "Go to Fulfillment" | Yes | Replaced Ship with Go to Fulfillment; passes highlightOrderIds |
| Dashboard | "Orders to Fulfill" metric card | N/A | Renamed; links to /orders/fulfillment |
| Fulfillment kanban | — | N/A | Removed orphan kanban; table view only |

---

## Walkthrough

**Scenario:** Order ORD-xxx in "picked" status. User clicks "Ship Order" from fulfillment tab.

**Flow:** Form (items + address + carrier) → optional Confirm step (partial/quantity change) → submit → createShipment → if shipNow, markShipped.

**Edge cases checked:**
- [x] Empty state — all items shipped
- [x] Serialized without allocation — "Pick items first"
- [x] Partial address — validation (inline field errors)
- [x] shipNow without carrier — disabled
- [x] createShipment succeeds, markShipped fails — handled
- [x] Order with zero line items — empty state
- [x] shippingCost invalid (NaN, negative) — validated before submit
- [x] Refetch overwrites form — guard: reset initialized when availableQty decreases

---

## Premortem

### Critical — REMEDIATED

- [x] **All items already shipped — no empty state:** Empty state added with "View Shipments" link and Close.
- [x] **Order with no line items:** Empty state added.
- [x] **Serialized item with wrong serial count:** Pre-validate before submit.

### User Debt — REMEDIATED

- [x] **Address partially filled — confusing validation:** Inline field-level errors (FormMessage pattern); expand address section; border-destructive on invalid fields.
- [x] **No "ship and continue" mode:** Ship-and-continue implemented; dialog stays open for partial shipments.
- [x] **Carrier "Other" has no service options:** Added other: ["Standard"] to CARRIER_SERVICES.
- [x] **Shipping cost invalid input:** Validated before submit; inputmode="decimal".

### Developer Debt — REMEDIATED

- [x] **initialized state vs refetch:** Refetch race guard: when availableQty decreases, reset initialized.
- [x] **Inline errors keyed by lineItemId:** Server ValidationError mapping in place.
- [x] **No URL param for ship:** ?ship=1 added to order detail route.

---

## Broken Paths List

| ID | Item | Priority |
|----|------|----------|
| 1 | All items shipped — add empty state message | P0 |
| 2 | No line items — add empty state | P0 |
| 3 | Serialized serial count mismatch — pre-validate before submit | P1 |
| 4 | Address validation — clearer messaging | P1 |
| 5 | Shipping cost NaN/negative — validate before submit | P1 |
| 6 | Refetch race — consider resetting when availableQty changes externally | P2 |
| 7 | Ship and continue — keep dialog open for partial (like Pick) | P2 |
| 8 | ?ship=1 URL param — parity with pick | P2 |

---

## Remediation Plan

### P0 — DONE
- [x] Add empty state when totalAvailableQty === 0: "All items have been shipped. No items to ship."
- [x] Add empty state when itemSelections.length === 0: "Order has no line items."

### P1 — DONE
- [x] Before submit: validate serialized items have selectedSerials.length === selectedQty.
- [x] Validate shippingCost: if not empty, must be finite number >= 0.
- [x] Inline address validation with field-level errors.

### P2 — DONE
- [x] Refetch race guard: reset initialized when availableQty decreased.
- [x] Ship-and-continue: dialog stays open for partial shipments.
- [x] ?ship=1 URL param on order detail route.

---

## Hardening

| Failure mode | Guard |
|--------------|-------|
| Empty items to ship | Explicit empty state + disabled CTA with reason |
| Invalid shipping cost | toCents guard: isFinite, >= 0 |
| Serial count mismatch | Pre-submit validation loop |
| Stale data after refetch | Compare availableQty before/after; re-sync if changed |

---

## Remediation Complete (2026-02-14)

**Summary of changes:**
- **Phase 1:** Replaced bulk Ship with "Go to Fulfillment"; passes highlightOrderIds to fulfillment dashboard.
- **Phase 2.1:** Dashboard "Orders to Ship" → "Orders to Fulfill"; links to /orders/fulfillment.
- **Phase 2.2:** PickItemsDialog: onShipOrder callback; toast "Ship Order" action; auto-open ShipOrderDialog when picked.
- **Phase 3.1:** ?ship=1 URL param for deep-link parity with pick.
- **Phase 3.2:** Refetch race guard in ShipOrderDialog.
- **Phase 3.3:** Ship-and-continue: dialog stays open for partial shipments.
- **Phase 4:** Inline address validation; carrier Other + Standard; "View Shipments" link in empty state.
- **Phase 4.5:** UI/UX Pro Max audit — step indicator, aria-labels, inputmode, touch targets.
- **Phase 5:** Removed orphan fulfillment kanban (fulfillment-dashboard/ folder).
