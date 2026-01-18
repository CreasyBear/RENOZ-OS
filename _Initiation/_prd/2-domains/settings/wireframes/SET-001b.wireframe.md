# Wireframe: DOM-SET-001b - System Defaults Settings Page

## Story Reference

- **Story ID**: DOM-SET-001b
- **Name**: System Defaults Settings Page
- **PRD**: memory-bank/prd/domains/settings.prd.json
- **Type**: Settings Form Page
- **Component Type**: Form with NumberInput, Select, validation

## Overview

Admin UI page to view and edit system defaults including payment terms, tax rate, currency, order status, and quote validity. Uses Form component with Zod validation and persists to database.

## UI Patterns (Reference Implementation)

### Form Layout
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Zod-based validation schema with field-level error handling
  - Controlled form state with React Hook Form integration
  - Automatic error message display and accessibility attributes

### Number Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Input type="number" with min/max constraints for payment terms and tax rate
  - Validation error states with red border and error icon
  - Helper text below input for field descriptions

### Select Dropdown
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Dropdown selection for currency and order status
  - Keyboard navigation with arrow keys and Enter to select
  - Visual indicator for selected value

### Toast Notifications
- **Pattern**: RE-UI Toast
- **Reference**: `_reference/.reui-reference/registry/default/ui/toast.tsx`
- **Features**:
  - Success toast on save with auto-dismiss after 3s
  - Error toast on save failure with manual dismiss
  - Positioned at top of viewport with slide-in animation

### Card Container
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Section grouping with CardHeader, CardContent layout
  - Responsive padding and margin
  - Separator lines between sections (Financial, Order, Quote defaults)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | organizations (settings stored) | IMPLEMENTED |
| **Server Functions** | Standard settings CRUD | AVAILABLE |
| **PRD Stories** | DOM-SET-001b | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/organizations.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Timezone**: Australia/Brisbane (AEST/AEDT)
- **Date Format**: DD/MM/YYYY
- **Custom Fields**: Battery capacity (kWh), Inverter power (kW), Installation type
- **Integrations**: Xero (accounting), BMS monitoring systems

---

## Mobile Wireframe (375px)

### Main View

```
┌────────────────────────────────────────┐
│ ← Settings                             │
├────────────────────────────────────────┤
│                                        │
│  System Defaults                       │
│  ─────────────────────────────────     │
│  Configure organization-wide           │
│  default values for forms              │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  FINANCIAL DEFAULTS                    │
│                                        │
│  Payment Terms (days) *                │
│  ┌──────────────────────────────────┐  │
│  │ 30                               │  │
│  └──────────────────────────────────┘  │
│  Days until payment is due             │
│                                        │
│  Tax Rate (%) *                        │
│  ┌──────────────────────────────────┐  │
│  │ 10.00                            │  │
│  └──────────────────────────────────┘  │
│  Default GST/VAT percentage            │
│                                        │
│  Currency *                            │
│  ┌─────────────────────────────── ▼┐   │
│  │ AUD - Australian Dollar         │   │
│  └──────────────────────────────────┘  │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  ORDER DEFAULTS                        │
│                                        │
│  Default Order Status *                │
│  ┌─────────────────────────────── ▼┐   │
│  │ Draft                           │   │
│  └──────────────────────────────────┘  │
│  Initial status for new orders         │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  QUOTE DEFAULTS                        │
│                                        │
│  Quote Validity (days) *               │
│  ┌──────────────────────────────────┐  │
│  │ 30                               │  │
│  └──────────────────────────────────┘  │
│  Days before quote expires             │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  [ Save Defaults ]                     │
│                                        │
└────────────────────────────────────────┘
```

### Loading State

```
┌────────────────────────────────────────┐
│ ← Settings                             │
├────────────────────────────────────────┤
│                                        │
│  System Defaults                       │
│  ─────────────────────────────────     │
│                                        │
│  FINANCIAL DEFAULTS                    │
│                                        │
│  Payment Terms (days) *                │
│  ┌──────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░                 │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Tax Rate (%) *                        │
│  ┌──────────────────────────────────┐  │
│  │ ░░░░░░░░░                        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Currency *                            │
│  ┌──────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ORDER DEFAULTS                        │
│                                        │
│  Default Order Status *                │
│  ┌──────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  QUOTE DEFAULTS                        │
│                                        │
│  Quote Validity (days) *               │
│  ┌──────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░                 │  │
│  └──────────────────────────────────┘  │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  [ ░░░░░░░░░░░░░░░░ ]                  │
│                                        │
└────────────────────────────────────────┘
```

### Error State (Failed to Load)

```
┌────────────────────────────────────────┐
│ ← Settings                             │
├────────────────────────────────────────┤
│                                        │
│  System Defaults                       │
│  ─────────────────────────────────     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │     ┌─────────────┐              │  │
│  │     │     [!]     │              │  │
│  │     └─────────────┘              │  │
│  │                                  │  │
│  │   Failed to load settings        │  │
│  │                                  │  │
│  │   Unable to retrieve system      │  │
│  │   defaults. Please check your    │  │
│  │   connection and try again.      │  │
│  │                                  │  │
│  │        [ Retry ]                 │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Validation Error State

```
┌────────────────────────────────────────┐
│ ← Settings                             │
├────────────────────────────────────────┤
│                                        │
│  System Defaults                       │
│  ─────────────────────────────────     │
│                                        │
│  FINANCIAL DEFAULTS                    │
│                                        │
│  Payment Terms (days) *                │
│  ┌──────────────────────────────────┐  │
│  │ -5                     ◉ Error   │  │
│  └──────────────────────────────────┘  │
│  ◉ Must be a positive number           │
│                                        │
│  Tax Rate (%) *                        │
│  ┌──────────────────────────────────┐  │
│  │ 150                    ◉ Error   │  │
│  └──────────────────────────────────┘  │
│  ◉ Tax rate must be between 0-100%     │
│                                        │
│  ...                                   │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  [ Save Defaults ]                     │
│  ↑ Disabled until errors fixed         │
│                                        │
└────────────────────────────────────────┘
```

### Save Success Toast

```
┌────────────────────────────────────────┐
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ● Settings saved successfully    │  │
│  │   System defaults updated        │  │
│  └──────────────────────────────────┘  │
│  ↑ Toast appears at top, auto-dismiss  │
│                                        │
└────────────────────────────────────────┘
```

---

## Tablet Wireframe (768px)

### Main View

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Settings > System Defaults                                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  System Defaults                                            [ Save ]      │
│  Configure organization-wide default values                               │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  FINANCIAL DEFAULTS                                                       │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐    │
│  │ Payment Terms (days) *        │  │ Tax Rate (%) *                │    │
│  │ ┌─────────────────────────┐   │  │ ┌─────────────────────────┐   │    │
│  │ │ 30                      │   │  │ │ 10.00                   │   │    │
│  │ └─────────────────────────┘   │  │ └─────────────────────────┘   │    │
│  │ Days until payment due        │  │ Default GST/VAT percentage    │    │
│  └───────────────────────────────┘  └───────────────────────────────┘    │
│                                                                           │
│  ┌───────────────────────────────┐                                       │
│  │ Currency *                    │                                       │
│  │ ┌─────────────────────── ▼┐   │                                       │
│  │ │ AUD - Australian Dollar │   │                                       │
│  │ └─────────────────────────┘   │                                       │
│  └───────────────────────────────┘                                       │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  ORDER DEFAULTS                                                           │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐    │
│  │ Default Order Status *        │  │                               │    │
│  │ ┌─────────────────────── ▼┐   │  │                               │    │
│  │ │ Draft                   │   │  │                               │    │
│  │ └─────────────────────────┘   │  │                               │    │
│  │ Initial status for new orders │  │                               │    │
│  └───────────────────────────────┘  └───────────────────────────────┘    │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  QUOTE DEFAULTS                                                           │
│  ┌───────────────────────────────┐                                       │
│  │ Quote Validity (days) *       │                                       │
│  │ ┌─────────────────────────┐   │                                       │
│  │ │ 30                      │   │                                       │
│  │ └─────────────────────────┘   │                                       │
│  │ Days before quote expires     │                                       │
│  └───────────────────────────────┘                                       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Desktop Wireframe (1280px+)

### Main View

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Renoz CRM        Dashboard | Customers | Orders | Products | Settings            [Bell][User]│
├──────────┬──────────────────────────────────────────────────────────────────────────────────────────┤
│          │                                                                                          │
│ Settings │  System Defaults                                                         [ Save ]        │
│ ──────── │  ───────────────────────────────────────────────────────────────────────────             │
│ Profile  │  Configure organization-wide default values for forms and workflows                      │
│ Org      │                                                                                          │
│ Defaults │ ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│ Templates│ │                                                                                     │  │
│ Integrat │ │  FINANCIAL DEFAULTS                                                                 │  │
│ Audit    │ │  ─────────────────────────────────────────────────────────────────────────────────  │  │
│ Export   │ │                                                                                     │  │
│ B. Hours │ │  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐│  │
│ Custom F │ │  │ Payment Terms (days) *   │  │ Tax Rate (%) *           │  │ Currency *         ││  │
│          │ │  │ ┌────────────────────┐   │  │ ┌────────────────────┐   │  │ ┌─────────────── ▼┐││  │
│          │ │  │ │ 30                 │   │  │ │ 10.00              │   │  │ │ AUD             │││  │
│          │ │  │ └────────────────────┘   │  │ └────────────────────┘   │  │ └─────────────────┘││  │
│          │ │  │ Days until payment due   │  │ Default GST percentage   │  │ Default currency   ││  │
│          │ │  └──────────────────────────┘  └──────────────────────────┘  └────────────────────┘│  │
│          │ │                                                                                     │  │
│          │ │  ORDER DEFAULTS                                                                     │  │
│          │ │  ─────────────────────────────────────────────────────────────────────────────────  │  │
│          │ │                                                                                     │  │
│          │ │  ┌──────────────────────────┐  ┌──────────────────────────┐                        │  │
│          │ │  │ Default Order Status *   │  │ Info                     │                        │  │
│          │ │  │ ┌─────────────────── ▼┐  │  │ ─────────────────────    │                        │  │
│          │ │  │ │ Draft              │   │  │ New orders will be       │                        │  │
│          │ │  │ └────────────────────┘   │  │ created with this status │                        │  │
│          │ │  │ Initial status           │  │ until manually changed.  │                        │  │
│          │ │  └──────────────────────────┘  └──────────────────────────┘                        │  │
│          │ │                                                                                     │  │
│          │ │  QUOTE DEFAULTS                                                                     │  │
│          │ │  ─────────────────────────────────────────────────────────────────────────────────  │  │
│          │ │                                                                                     │  │
│          │ │  ┌──────────────────────────┐  ┌──────────────────────────┐                        │  │
│          │ │  │ Quote Validity (days) *  │  │ Info                     │                        │  │
│          │ │  │ ┌────────────────────┐   │  │ ─────────────────────    │                        │  │
│          │ │  │ │ 30                 │   │  │ Quotes will expire after │                        │  │
│          │ │  │ └────────────────────┘   │  │ this many days unless    │                        │  │
│          │ │  │ Days before expiration   │  │ extended or accepted.    │                        │  │
│          │ │  └──────────────────────────┘  └──────────────────────────┘                        │  │
│          │ │                                                                                     │  │
│          │ └─────────────────────────────────────────────────────────────────────────────────────┘  │
│          │                                                                                          │
└──────────┴──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Save In Progress State

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  System Defaults                               [ Saving... ]  │
│                                                  ↑ Spinner    │
│  Fields disabled during save                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Interaction States

### Loading States

```
FORM SKELETON:
┌──────────────────────────────────────┐
│ [░░░░░░░░░░░░]                       │
│ ┌────────────────────────────────┐   │
│ │ ░░░░░░░░░░░░░░░░░░░░           │   │
│ └────────────────────────────────┘   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░           │
└──────────────────────────────────────┘
↑ Skeleton fields with shimmer animation

SAVE BUTTON LOADING:
┌────────────────────────┐
│ [⟳] Saving...          │
└────────────────────────┘
↑ Spinner + disabled state
```

### Empty States

```
NOT APPLICABLE:
System defaults always have values (hardcoded fallbacks if no DB record)
```

### Error States

```
FIELD VALIDATION ERROR:
┌──────────────────────────────────────┐
│ Payment Terms (days) *               │
│ ┌────────────────────────────────┐   │
│ │ -5                    ◉        │   │
│ └────────────────────────────────┘   │
│ ◉ Payment terms must be positive     │
│   ↑ Red text, red border             │
└──────────────────────────────────────┘

SAVE FAILED:
┌──────────────────────────────────────┐
│ ◉ Failed to save settings            │
│                                      │
│   Unable to update system defaults.  │
│   Please try again.                  │
│                        [ Retry ]     │
└──────────────────────────────────────┘
↑ Toast notification with retry action

NETWORK ERROR:
┌──────────────────────────────────────┐
│ [!] Connection Error                 │
│                                      │
│  Your changes couldn't be saved.     │
│  Check your internet connection.     │
│                                      │
│  [Retry]   [Cancel]                  │
└──────────────────────────────────────┘
```

### Success States

```
SAVE SUCCESS TOAST:
┌──────────────────────────────────────┐
│ ● Settings saved                     │
│   System defaults have been updated  │
│                                      │
│   ↑ Green checkmark, auto-dismiss 3s │
└──────────────────────────────────────┘

FIELD SAVED INDICATOR (optional):
┌──────────────────────────────────────┐
│ Payment Terms (days) *   ●           │
│ ┌────────────────────────────────┐   │
│ │ 30                             │   │
│ └────────────────────────────────┘   │
│                   ↑ Brief checkmark  │
└──────────────────────────────────────┘
```

---

## Accessibility Notes

### Focus Order

1. **Page Load**
   - Focus moves to first form field (Payment Terms input)
   - Skip link available to jump to Save button

2. **Form Navigation**
   - Tab: Navigate through all form fields in order
   - Tab sequence: Payment Terms -> Tax Rate -> Currency -> Order Status -> Quote Validity -> Save button
   - Shift+Tab: Reverse navigation

3. **Error Handling**
   - On validation error: Focus moves to first field with error
   - Error message announced to screen readers

4. **After Save**
   - Success: Focus remains on Save button, toast announced
   - Error: Focus moves to retry button or first error field

### ARIA Requirements

```html
<!-- Page Region -->
<main
  role="main"
  aria-label="System Defaults Settings"
>
  <!-- Form -->
  <form
    aria-label="System defaults form"
    aria-describedby="form-description"
  >
    <p id="form-description">
      Configure organization-wide default values
    </p>

    <!-- Section -->
    <fieldset>
      <legend>Financial Defaults</legend>

      <!-- Field -->
      <div>
        <label for="payment-terms">
          Payment Terms (days) *
        </label>
        <input
          id="payment-terms"
          type="number"
          aria-required="true"
          aria-describedby="payment-terms-help"
          aria-invalid="false"
        />
        <span id="payment-terms-help">
          Days until payment is due
        </span>
      </div>
    </fieldset>

    <!-- Save Button -->
    <button
      type="submit"
      aria-label="Save system defaults"
      aria-busy="false"
    >
      Save Defaults
    </button>
  </form>
</main>

<!-- Success Toast -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  Settings saved successfully
</div>

<!-- Error Toast -->
<div
  role="alert"
  aria-live="assertive"
>
  Failed to save settings
</div>
```

### Screen Reader Announcements

- Page load: "System Defaults Settings page. Form has 5 fields."
- Field focus: "Payment Terms, required, number input, 30, Days until payment is due"
- Validation error: "Error: Payment terms must be a positive number"
- Save in progress: "Saving settings"
- Save success: "Settings saved successfully"
- Save error: "Failed to save settings. Retry button available."

### Keyboard Navigation

```
Tab           - Move to next field
Shift+Tab     - Move to previous field
Enter         - Submit form (when focused on Save button)
Arrow Up/Down - Increment/decrement number inputs
Space         - Open select dropdown
Escape        - Close dropdown, dismiss error toast
```

---

## Animation Choreography

### Page Load

```
FORM ENTRY:
- Duration: 300ms
- Easing: ease-out
- Sequence:
  1. Page header fades in (0-100ms)
  2. Form sections stagger in (100-300ms)
     - Each section: translateY(8px) -> translateY(0)
     - Opacity: 0 -> 1
```

### Form Interactions

```
FIELD FOCUS:
- Duration: 150ms
- Border: transition color to primary
- Label: subtle scale 0.98 -> 1

DROPDOWN OPEN:
- Duration: 200ms
- Easing: ease-out
- Transform: translateY(-4px) -> translateY(0)
- Opacity: 0 -> 1

DROPDOWN CLOSE:
- Duration: 150ms
- Easing: ease-in
- Opacity: 1 -> 0
```

### Save States

```
BUTTON LOADING:
- Duration: continuous
- Spinner rotation: 1s linear infinite
- Text: "Save" -> "Saving..."

SUCCESS CHECKMARK:
- Duration: 400ms
- Icon entry: scale(0) -> scale(1.1) -> scale(1)
- Background: brief green pulse (200ms)

TOAST ENTRY:
- Duration: 250ms
- Transform: translateY(-20px) -> translateY(0)
- Opacity: 0 -> 1

TOAST EXIT:
- Duration: 200ms (after 3s hold)
- Transform: translateY(0) -> translateY(-10px)
- Opacity: 1 -> 0
```

### Error States

```
FIELD ERROR SHAKE:
- Duration: 400ms
- Transform: translateX sequence (0, -4px, 4px, -4px, 4px, 0)
- Border: transition to error color (150ms)

ERROR MESSAGE ENTRY:
- Duration: 200ms
- Transform: translateY(-4px) -> translateY(0)
- Opacity: 0 -> 1
```

---

## Component Props Interface

```typescript
interface SystemDefaultsFormProps {
  // Initial data
  initialValues?: SystemDefaults;

  // Callbacks
  onSave: (values: SystemDefaults) => Promise<void>;
  onCancel?: () => void;

  // State
  isLoading?: boolean;
  isSaving?: boolean;
  error?: Error | null;
}

interface SystemDefaults {
  paymentTerms: number;      // Positive integer, days
  taxRate: number;           // 0-100, percentage
  currency: CurrencyCode;    // ISO 4217 code
  defaultOrderStatus: OrderStatus;
  quoteValidity: number;     // Positive integer, days
}

type CurrencyCode = 'AUD' | 'USD' | 'GBP' | 'EUR' | 'NZD';

type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready'
  | 'delivered';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  placeholder?: string;
}

// Currency options
const CURRENCY_OPTIONS = [
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'NZD', label: 'NZD - New Zealand Dollar' },
];

// Order status options
const ORDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
];
```

---

## Validation Rules (Zod Schema)

```typescript
import { z } from 'zod';

const systemDefaultsSchema = z.object({
  paymentTerms: z
    .number()
    .int('Must be a whole number')
    .positive('Must be a positive number')
    .max(365, 'Cannot exceed 365 days'),

  taxRate: z
    .number()
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100%'),

  currency: z
    .enum(['AUD', 'USD', 'GBP', 'EUR', 'NZD'], {
      errorMap: () => ({ message: 'Invalid currency code' }),
    }),

  defaultOrderStatus: z
    .enum(['draft', 'pending', 'confirmed', 'processing', 'ready'], {
      errorMap: () => ({ message: 'Invalid order status' }),
    }),

  quoteValidity: z
    .number()
    .int('Must be a whole number')
    .positive('Must be a positive number')
    .max(365, 'Cannot exceed 365 days'),
});
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/settings/defaults.tsx` | Route component with role guard |
| `src/components/domain/settings/system-defaults-form.tsx` | Main form component |
| `src/lib/server/settings.ts` | Server functions for CRUD |
| `lib/schema/system-settings.ts` | Zod validation schema |

---

## Design References

- **Form Layout**: `.reui-reference/components/forms/form-layout.tsx`
- **Number Input**: `.reui-reference/components/ui/input.tsx`
- **Select**: `.reui-reference/components/ui/select.tsx`
- **Toast**: `.reui-reference/components/ui/toast.tsx`
- **Settings Pattern**: `.square-ui-reference/templates/settings/`

---

## Success Metrics

- Form loads within 500ms
- All fields visible without scrolling on tablet/desktop
- Save operation completes within 1s
- Error messages are clear and actionable
- Keyboard-only users can complete all tasks
- Screen reader users understand form structure and status
