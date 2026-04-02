# Operator Stock-In Workflows

This guide explains which workflow operators should use for product setup, supplier replenishment, and stock intake.

## Workflow Map

Use these labels as the source of truth:

1. `Create Product` creates the catalogue item only. It does not add stock.
2. `Create Supplier` creates the supplier record only. It does not create a purchase order.
3. `Receive Inventory` is for non-PO inbound stock only.
4. `Receive Goods` is for supplier deliveries against a purchase order.
5. `Adjust Stock` is for corrections only.
6. `Order Stock` starts supplier-backed replenishment by creating a purchase order.

## Which Workflow To Use

### Create Product

Use when:

1. A new SKU needs to exist in the system.

What happens:

1. Start at `/products/new`.
2. Save the product.
3. The app lands on product detail.
4. From product detail, choose the next real action:
   - `Receive Inventory` for non-PO starting stock
   - `Order Stock` for supplier replenishment
   - `Adjust Stock` only if correcting an existing quantity

### Create Supplier

Use when:

1. A supplier needs to be available for procurement and pricing.

What happens:

1. Start at `/suppliers/create`.
2. Save the supplier.
3. The app lands on supplier detail.

### Receive Inventory

Use when:

1. Initial stock is being loaded without a purchase order.
2. Found stock is being added.
3. Samples or promo units are being received.
4. Another approved non-supplier inbound exception applies.

Do not use when:

1. A supplier delivery is arriving against a PO.

What happens:

1. Start from `/inventory/receiving`, mobile receiving, or product detail.
2. Choose a non-PO receipt reason.
3. Enter quantity, cost, location, and notes when needed.
4. Submit the receipt.

If launched from product detail:

1. The product is preselected and locked.
2. The header shows product context.
3. Cancel and successful submit both return to product detail.

### Order Stock

Use when:

1. The business needs supplier-backed replenishment for a product.

What happens from product detail:

1. Click `Order Stock`.
2. The app opens the PO create flow for that product.
3. The product is seeded as the first line item.
4. If a real preferred supplier exists in pricing data, that supplier is preselected and the wizard starts on line items.
5. If no preferred supplier exists, the wizard starts on supplier selection and keeps the seeded product ready for the next step.
6. Submitting the wizard lands on PO detail.

### Receive Goods

Use when:

1. A supplier shipment is arriving against a purchase order.

What happens:

1. Launch from PO detail, PO list, or procurement receiving.
2. Receive against the PO’s pending quantities.
3. The flow updates receipt records, PO receiving state, inventory, and cost layers.

Do not replace this with `Receive Inventory`.

### Adjust Stock

Use when:

1. Inventory needs a correction.
2. A count variance needs to be recorded.
3. Stock needs a manual admin fix.

Do not use when:

1. Recording a real inbound receipt.
2. Recording a supplier delivery.

## Common Operator Journeys

### New product with starting stock already on hand

1. Create the product.
2. Land on product detail.
3. Click `Receive Inventory`.
4. Record the non-PO receipt with reason `Initial Stock`.

### Product needs supplier replenishment

1. Open product detail.
2. Click `Order Stock`.
3. Confirm supplier and quantity in the PO wizard.
4. Submit the PO.
5. Later, use `Receive Goods` when the supplier shipment arrives.

### Warehouse operator receiving non-PO inbound stock

1. Use desktop `/inventory/receiving` or mobile receiving.
2. Record the receipt with a non-PO reason.
3. Do not use PO receiving unless there is an actual purchase order.

### Operator finds an incorrect on-hand quantity

1. Open product detail.
2. Click `Adjust Stock`.
3. Record the correction.

## Screen Expectations

### Product detail

Operators should expect:

1. `Receive Inventory` for non-PO inbound stock
2. `Order Stock` for supplier replenishment
3. `Adjust Stock` for corrections

Operators should not expect:

1. A generic `Add Stock` shortcut
2. A supplier delivery to be processed without a PO

### Manual receiving page

Operators should expect:

1. Non-PO wording
2. Required receipt reason
3. A focused contextual experience when launched from product detail

Operators should not expect:

1. Purchase-order receiving behavior
2. PO reference selection

### PO receiving surfaces

Operators should expect:

1. `Receive Goods` wording
2. PO-aware receiving behavior
3. Receipt and procurement state updates

## Recovery and Edge Cases

### Product context no longer available

If a product is deleted or inactive after launching a contextual flow:

1. The app shows a blocking message.
2. The operator can return to product detail.
3. The operator can clear context and continue generically where safe.

### No preferred supplier exists

1. `Order Stock` still works.
2. The PO wizard starts at supplier selection.
3. The product line item remains seeded for the next step.

## Short Rule Of Thumb

1. `Receive Inventory` = non-PO inbound stock
2. `Receive Goods` = supplier delivery against a PO
3. `Adjust Stock` = correction
4. `Order Stock` = start procurement
