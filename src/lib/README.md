# Lib Utilities

Shared utility functions and business logic for the Renoz application.

## Order Calculations (`order-calculations.ts`)

Comprehensive order calculation utilities following midday invoice patterns, adapted for Australian GST compliance.

### Features

- **GST Compliance**: Australian GST (10%) calculations
- **Null Safety**: Handles undefined/null values gracefully with `?? 0` defaults
- **Type Safety**: Full TypeScript interfaces and validation
- **Business Rules**: Validates calculations against business logic
- **Currency Precision**: Banker's rounding to 2 decimal places

### Basic Usage

```typescript
import { calculateTotal, calculateLineItemTotal } from '@/lib/order-calculations';

// Calculate order total
const orderTotal = calculateTotal({
  lineItems: [
    { price: 100, quantity: 2 }, // $200 subtotal
    { price: 50, quantity: 1 },  // $50 subtotal
  ],
  discountPercent: 10, // 10% discount = $25
  shippingAmount: 15,   // $15 shipping
});

// Result: { subtotal: 250, gstAmount: 24, discountAmount: 25, shippingAmount: 15, total: 264 }
console.log(orderTotal.total); // 264

// Calculate individual line item
const lineItem = calculateLineItemTotal({
  price: 100,
  quantity: 2,
  discountPercent: 10, // 10% discount = $20
});

// Result: { subtotal: 200, discountAmount: 20, total: 180 }
console.log(lineItem.total); // 180
```

### Advanced Usage

```typescript
import {
  calculateTotal,
  validateCalculationInput,
  validateOrderBusinessRules,
  GST_RATE
} from '@/lib/order-calculations';

// Custom GST rate (for international orders)
const internationalOrder = calculateTotal({
  lineItems: [{ price: 100, quantity: 1 }],
  gstRate: 0, // No GST for export
});

// Validate input before calculation
const input = {
  lineItems: [{ price: 100, quantity: 1 }],
  discountPercent: 150, // Invalid: > 100%
};

const validation = validateCalculationInput(input);
if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
  // Handle validation errors
}

// Check business rules after calculation
const result = calculateTotal({ lineItems: [{ price: 100, quantity: 1 }] });
const businessCheck = validateOrderBusinessRules(result);

if (!businessCheck.isValid) {
  console.log('Business rule warnings:', businessCheck.warnings);
  // Handle business rule violations
}
```

### Business Rules

- **GST Rate**: 10% on taxable amounts (subtotal - discounts + shipping)
- **Rounding**: Banker's rounding to 2 decimal places for currency
- **Discount Limits**: Cannot exceed subtotal amount
- **GST Application**: Applied after discounts, before shipping in some cases
- **Negative Prevention**: Totals cannot go below zero

### Integration Examples

#### With Order Creation Wizard

```typescript
import { calculateTotal } from '@/lib/order-calculations';

function OrderSummary({ lineItems, discounts, shipping }) {
  const calculation = calculateTotal({
    lineItems,
    discountPercent: discounts.percentage,
    discountAmount: discounts.fixed,
    shippingAmount: shipping,
  });

  return (
    <div>
      <div>Subtotal: ${calculation.subtotal}</div>
      <div>GST (10%): ${calculation.gstAmount}</div>
      <div>Discount: -${calculation.discountAmount}</div>
      <div>Shipping: ${calculation.shippingAmount}</div>
      <div>Total: ${calculation.total}</div>
    </div>
  );
}
```

#### With Form Validation

```typescript
import { validateCalculationInput } from '@/lib/order-calculations';

function OrderForm({ formData, setErrors }) {
  const handleCalculate = () => {
    const validation = validateCalculationInput(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const result = calculateTotal(formData);
    // Use calculation result
  };
}
```

### Migration from Existing Calculations

If you're migrating from existing calculation logic:

1. **Replace inline calculations** with `calculateTotal()`
2. **Use `calculateLineItemTotal()`** for individual line items
3. **Add input validation** with `validateCalculationInput()`
4. **Check business rules** with `validateOrderBusinessRules()`
5. **Update tests** to use the new calculation utilities

### Error Handling

The utilities provide comprehensive error handling:

```typescript
try {
  const result = calculateTotal(orderData);

  // Check for business rule violations
  const businessCheck = validateOrderBusinessRules(result);
  if (!businessCheck.isValid) {
    // Handle warnings (e.g., excessive discounts)
  }

} catch (error) {
  // Handle unexpected errors
  console.error('Calculation error:', error);
}
```

### Testing

The utilities include comprehensive unit tests covering:

- GST calculation accuracy
- Edge cases (null values, zero amounts)
- Business rule validation
- Currency precision and rounding
- Input validation

Run tests with: `npm test tests/unit/lib/order-calculations.test.ts`

### Performance Notes

- Calculations are pure functions with no side effects
- Optimized for real-time form updates
- Memoization recommended for expensive calculations
- Handles large order volumes (100+ line items) efficiently

### Related Files

- **Schemas**: `src/lib/schemas/orders/orders.ts` - Order data structures
- **Tests**: `tests/unit/lib/order-calculations.test.ts` - Comprehensive test suite
- **Reference**: `renoz-v3/_reference/.midday-reference/` - Original midday patterns
