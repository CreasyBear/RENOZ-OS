# Order Creation Wizard

Enterprise-grade order creation system with real-time GST calculations, comprehensive validation, and accessibility compliance.

## Architecture

### Components Overview

```
OrderCreationWizard/
├── enhanced-order-creation-wizard.tsx    # Main wizard component
├── order-form-context.tsx               # React Hook Form context & providers
├── order-line-items.tsx                 # Dynamic line items management
├── order-summary.tsx                    # Real-time calculations display
├── order-customer-selector.tsx          # Customer selection (placeholder)
├── hooks/
│   └── use-order-wizard.ts              # Legacy wizard hook (deprecated)
├── steps/                               # Legacy step components (deprecated)
│   ├── customer-step.tsx
│   ├── products-step.tsx
│   ├── pricing-step.tsx
│   └── review-step.tsx
└── types.ts                            # TypeScript definitions
```

### Form Architecture

The new architecture uses **React Hook Form** with **Zod validation** for enterprise-grade form management:

- **Real-time validation** with immediate feedback
- **GST calculations** updated automatically as users type
- **Business rule enforcement** preventing invalid states
- **Template customization** for different order types
- **Accessibility compliance** with keyboard navigation and screen readers

## Usage

### Basic Usage

```tsx
import { EnhancedOrderCreationWizard } from "@/components/domain/orders/order-creation-wizard";

function CreateOrderPage() {
  const handleComplete = (orderId: string, orderNumber: string) => {
    // Navigate to order details or show success message
    navigate(`/orders/${orderId}`);
  };

  const handleCancel = () => {
    navigate("/orders");
  };

  return (
    <EnhancedOrderCreationWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
```

### Advanced Usage with Templates

```tsx
import { OrderFormProvider } from "@/components/domain/orders/order-creation-wizard";

// Custom template for export orders
const exportTemplate = {
  includeGst: false,
  includeDiscounts: true,
  includeShipping: true,
  autoGenerateOrderNumber: true,
};

function ExportOrderPage() {
  return (
    <OrderFormProvider template={exportTemplate}>
      <CustomOrderForm />
    </OrderFormProvider>
  );
}
```

## Features

### Real-Time Calculations

- **GST Compliance**: Automatic 10% GST calculations
- **Live Updates**: Totals update as users modify quantities/prices
- **Discount Handling**: Percentage and fixed discounts with validation
- **Business Rules**: Prevents invalid discount combinations

### Form Validation

- **Schema Validation**: Zod schemas ensure data integrity
- **Business Rules**: Order-level validation (minimum values, etc.)
- **Real-time Feedback**: Immediate validation as users type
- **Accessible Errors**: Clear error messages with focus management

### Accessibility

- **Keyboard Navigation**: Full keyboard support throughout
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Touch Targets**: 44px minimum for mobile devices
- **Focus Management**: Proper focus flow and visible focus indicators

### Performance

- **React.memo**: Components memoized to prevent unnecessary re-renders
- **Dynamic Imports**: Summary component lazy-loaded for bundle optimization
- **Efficient Calculations**: Memoized calculation results
- **Virtual Scrolling**: Ready for large line item lists

## API Reference

### EnhancedOrderCreationWizard Props

```tsx
interface OrderCreationWizardProps {
  onComplete: (orderId: string, orderNumber: string) => void;
  onCancel: () => void;
  className?: string;
}
```

### OrderFormProvider Props

```tsx
interface OrderFormProviderProps {
  children: ReactNode;
  defaultValues?: DefaultValues<OrderFormData>;
  template?: Partial<OrderFormTemplate>;
  onCalculationChange?: (calculations: OrderFormCalculations) => void;
}
```

### Form Context Hooks

```tsx
// Access form state and calculations
const { formData, calculations, isValid, hasLineItems } = useOrderForm();

// Access line item operations
const { addLineItem, removeLineItem, duplicateLineItem } = useOrderFormLineItems();

// Access template settings
const { template, updateTemplate } = useOrderFormTemplate();

// Access form state helpers
const { isDirty, isValid, hasLineItems, resetForm } = useOrderFormState();
```

## Data Flow

```
User Input → Form Context → Zod Validation → Calculation Engine → UI Updates
      ↓              ↓              ↓              ↓              ↓
   React Hook Form → State Updates → Business Rules → GST Engine → Real-time Display
```

## Business Rules

### GST Compliance

- **Rate**: 10% on taxable amounts
- **Calculation**: `(subtotal - discounts + shipping) × 0.10`
- **Rounding**: Banker's rounding to 2 decimal places
- **Exemptions**: Export orders can exclude GST

### Order Validation

- **Required Fields**: Customer selection, at least one line item
- **Quantity**: Must be > 0
- **Prices**: Must be ≥ 0
- **Discounts**: Cannot exceed line item total
- **Maximum Items**: 100 line items per order

### Discount Rules

- **Single Type**: Cannot specify both percentage and fixed discount
- **Line Item Level**: Discounts apply before GST calculation
- **Order Level**: Additional discounts on subtotal
- **Validation**: Prevents negative totals

## Migration Guide

### From Legacy Wizard

1. **Replace imports**:

   ```tsx
   // Old
   import { OrderCreationWizard } from "@/components/domain/orders";

   // New
   import { EnhancedOrderCreationWizard } from "@/components/domain/orders/order-creation-wizard";
   ```

2. **Update props** (interface is the same)

3. **Remove step-specific logic** (now handled internally)

### Form Data Changes

The new system uses different data structures:

```tsx
// Old: Basic state management
{
  lineItems: [{ productId: "123", quantity: 2, unitPrice: 10.00 }]
}

// New: Comprehensive form data with validation
{
  customerId: "customer-uuid",
  lineItems: [{
    description: "Product Name",
    quantity: 2,
    unitPrice: 10.00,
    discountPercent: 0,
    taxType: "gst"
  }]
}
```

## Testing

### Unit Tests

```bash
# Run calculation tests
npm test tests/unit/lib/order-calculations.test.ts

# Run schema validation tests
npm test tests/unit/schemas/order-form-schemas.test.ts

# Run integration tests
npm test tests/unit/components/orders/order-form-integration.test.ts
```

### Test Coverage

- **Calculations**: 36 tests covering GST, discounts, edge cases
- **Schemas**: 24 tests for validation rules and business logic
- **Integration**: 11 tests for form behavior and calculations

## Performance Characteristics

- **Bundle Size**: ~15KB additional for form system
- **Runtime**: Real-time calculations with <10ms response time
- **Memory**: Efficient state management with proper cleanup
- **Accessibility**: WCAG 2.1 AA compliant

## Browser Support

- **Modern Browsers**: Full feature support
- **Mobile**: Touch-optimized with 44px+ touch targets
- **Keyboard**: Full keyboard navigation support
- **Screen Readers**: Comprehensive ARIA support

## Future Enhancements

- **Drag & Drop**: Visual reordering of line items
- **Bulk Import**: CSV upload for large orders
- **Templates**: Saved order templates
- **Approval Workflow**: Multi-step approval process
- **Real-time Collaboration**: Multiple users editing simultaneously
