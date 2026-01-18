# Component Patterns Inventory

> **Analysis of existing component patterns in RENOZ codebase**
> **Date:** January 2026
> **Coverage:** 140+ domain components analyzed

---

## Executive Summary

**Existing Pattern Maturity: HIGH** - RENOZ has well-established, sophisticated component patterns that demonstrate enterprise-level architecture. The patterns are consistent across domains and follow Clean Architecture principles.

**Key Findings:**

- ✅ **Clean Architecture**: Dependency injection pattern consistently applied
- ✅ **Type Safety**: Comprehensive TypeScript usage with strict typing
- ✅ **Error Handling**: Sophisticated error boundaries and user-friendly messaging
- ✅ **Optimistic UI**: Advanced optimistic updates and concurrency control
- ✅ **Accessibility**: WCAG 2.1 AA compliance patterns built-in

**Ralph-Ready Assessment:** These patterns provide an excellent foundation for autonomous development, with clear structure and validation that Ralph can reliably follow.

---

## 1. Component Architecture Pattern

### Core Pattern: Clean Architecture with Dependency Injection

**Structure:**

```typescript
// ❌ Traditional approach: Direct server function imports
import { createCustomer } from '@/server/functions/customers'

export function CustomerForm() {
  const handleSubmit = (data) => createCustomer(data)
}

// ✅ RENOZ Pattern: Dependency injection via props
interface CustomerFormProps {
  onCreateCustomer?: (data) => Promise<any>
  validateCreate?: (data) => ValidationResult
  getCustomerFunction?: (params) => Promise<Customer>
}

export function CustomerForm({ onCreateCustomer, validateCreate, getCustomerFunction }: CustomerFormProps) {
  // Implementation uses injected functions
}
```

**Benefits:**

- **Testability**: Components can be tested with mock functions
- **Flexibility**: Different validation/functionality per context
- **Clean Architecture**: Presentation layer decoupled from infrastructure
- **Ralph-Compatible**: Clear interfaces make autonomous implementation predictable

**Examples Found:**

- `CustomerForm` - Full dependency injection pattern
- `SupplierForm` - Consistent implementation
- `OrderForm` - Complex multi-step injection
- `UserForm` - Role-based validation injection

---

## 2. Form Patterns

### TanStack Form + Injected Validation Pattern

**Structure:**

```typescript
// Form initialization with optimistic defaults
const form = useForm({
  defaultValues: customer ? mapCustomerToForm(customer) : getDefaultValues(),
  onSubmit: async ({ value }) => {
    // 1. Validate using injected validator
    const validationResult = validateFn ? validateFn(value) : { success: true, data: value }

    // 2. Handle validation errors
    if (!validationResult.success) {
      handleValidationErrors(validationResult.error, form)
      return
    }

    // 3. Execute with injected function
    if (customer) {
      await updateMutation.mutateAsync({ id: customer.id, version: customer.version, ...value })
    } else {
      await createMutation.mutateAsync(value)
    }
  }
})
```

**Key Features:**

- **Injected Validators**: Zod schemas or custom validation functions provided via props
- **Optimistic Defaults**: Smart default values based on entity state
- **Error Mapping**: Sophisticated error mapping between validation and form state
- **Draft Support**: Auto-save functionality for complex forms

**Examples:**

- **CustomerForm**: Full pattern implementation with draft saving
- **OrderForm**: Complex multi-entity validation
- **SupplierForm**: Business rule validation injection

### Form Field Wrapper Pattern

**Standardized Field Component:**

```typescript
interface FormFieldWrapperProps {
  label: string
  id: string
  required?: boolean
  error?: string
  description?: string
  children: ReactNode
  className?: string
  htmlFor?: string
}

export function FormFieldWrapper({ label, id, required, error, description, children }: FormFieldWrapperProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={error && 'text-destructive'} aria-required={required}>
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        {children}
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive mt-1 flex items-center gap-1" role="alert">
            <ErrorIcon />{error}
          </p>
        )}
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  )
}
```

**Benefits:**

- **Accessibility**: Proper ARIA labels, error associations, required indicators
- **Consistency**: Unified error display and styling
- **Reusable**: Works with any input component
- **Extensible**: Supports descriptions, custom styling

---

## 3. Data Fetching Patterns

### TanStack Query + Server Function Pattern

**Query Definition:**

```typescript
// Pattern: Descriptive query keys with entity relationships
const queryKeys = {
  customers: ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  customerSummary: (id: string) => ['customers', id, 'summary'] as const,
  customerOrders: (id: string) => ['customers', id, 'orders'] as const,
}

// Usage with server function
const { data: customer, isLoading, error } = useQuery({
  queryKey: queryKeys.customer(customerId),
  queryFn: () => getCustomerSummary({ data: { customerId } }),
  enabled: !!customerId
})
```

**Mutation Pattern:**

```typescript
const createMutation = useMutation({
  mutationFn: (data) => onCreateCustomer(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers })
    toast.success('Customer created successfully')
  },
  onError: (error) => {
    handleError(error, 'create', 'customer')
  }
})
```

**Key Features:**

- **Hierarchical Keys**: Clear relationship hierarchy in query keys
- **Optimistic Updates**: Cache invalidation patterns
- **Error Handling**: Centralized error handling with user-friendly messages
- **Loading States**: Consistent loading UI patterns

### Real-time Subscription Pattern

**Supabase Realtime Integration:**

```typescript
useEffect(() => {
  const channel = supabase
    .channel('orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: `organization_id=eq.${orgId}`
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })
    .subscribe()

  return () => channel.unsubscribe()
}, [orgId])
```

---

## 4. Error Handling Patterns

### Error Boundary Pattern

**Implementation:**

```typescript
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }
    return this.props.children
  }
}
```

### User-Friendly Error Handler Hook

**Pattern:**

```typescript
const { handleError } = useErrorHandler({
  entityType: 'customer',
  action: 'create'
})

// Usage in mutations
onError: (error) => {
  handleError(error)
}
```

**Error Translation:**

```typescript
export function handleApiError(error: unknown): UserFriendlyError {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return { message: 'Please check your input and try again' }
      case 401: return { message: 'Please sign in to continue' }
      case 403: return { message: 'You don\'t have permission for this action' }
      case 404: return { message: 'The item you\'re looking for doesn\'t exist' }
      case 500: return { message: 'Something went wrong on our end. Please try again' }
      default: return { message: 'An unexpected error occurred' }
    }
  }
  return { message: 'Network error. Please check your connection' }
}
```

---

## 5. State Management Patterns

### Optimistic Concurrency Control

**Pattern:**

```typescript
interface Entity {
  id: string
  version: number  // Incremented on each update
}

export const updateWithOCC = async (id: string, version: number, data: any) => {
  const result = await tx
    .update(table)
    .set({ ...data, version: version + 1 })
    .where(and(
      eq(table.id, id),
      eq(table.version, version)  // Conflict detection
    ))
    .returning()

  if (result.length === 0) {
    throw new ConcurrencyError()
  }
  return result[0]
}
```

### Draft Saving Pattern

**Form Draft Hook:**

```typescript
const { clearDraft, hasDraft } = useTanStackFormDraft({
  storageKey: customer ? `customer-edit-${customer.id}` : 'customer-create-draft',
  form,
  enabled: !customer, // Only for new entities
  onRestore: () => setShowDraftAlert(true)
})
```

---

## 6. Component Composition Patterns

### Shared Component Library

**Data Table Pattern:**

```typescript
interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[]
  data: TData[]
  isLoading?: boolean
  error?: Error
  onRetry?: () => void
  pagination?: PaginationState
  onPageChange?: (pagination: PaginationState) => void
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  enableRowSelection?: boolean
  onRowSelectionChange?: (selection: RowSelectionState) => void
  bulkActions?: BulkAction[]
  emptyState?: ReactNode
}

export function DataTable<TData>({ ...props }: DataTableProps<TData>) {
  // Comprehensive table implementation with sorting, filtering, selection, virtualization
}
```

**Metrics Pattern:**

```typescript
interface MetricCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: LucideIcon
  className?: string
}

export function MetricCard({ title, value, trend, icon, className }: MetricCardProps) {
  // Consistent metric display with trend indicators
}
```

---

## 7. Accessibility Patterns

### WCAG 2.1 AA Compliance

**Form Accessibility:**

```typescript
<Label
  htmlFor={fieldId}
  className={error && 'text-destructive'}
  aria-required={required}
>
  {label}
  {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
</Label>

{error && (
  <p
    id={`${fieldId}-error`}
    className="text-sm text-destructive"
    role="alert"
    aria-live="polite"
  >
    {error}
  </p>
)}
```

**Data Table Accessibility:**

- Proper table headers with scope
- Keyboard navigation support
- Screen reader announcements for actions
- Focus management for modals

---

## 8. File Organization Patterns

### Domain-Driven Structure

```
src/components/domain/[feature]/
├── [feature]-columns.tsx      # Data table definitions
├── [feature]-form.tsx         # Create/edit forms
├── [feature]-panel.tsx        # Detail view panels
├── [feature]-card.tsx         # List item cards
├── [feature]-tab.tsx          # Tab content
└── [feature]-dialog.tsx       # Modal dialogs
```

### Route Structure Pattern

```
routes/[domain]/
├── index.tsx                  # List page
├── $[entityId].tsx           # Detail page with dynamic ID
└── [subdomain]/
    ├── index.tsx
    └── $[subEntityId].tsx
```

---

## Ralph Compatibility Assessment

### ✅ HIGH COMPATIBILITY PATTERNS

**Predictable Structure:**

- Consistent prop interfaces across components
- Standardized error handling patterns
- Clear separation between UI and business logic

**Validation & Error Handling:**

- Injected validation functions with known interfaces
- User-friendly error translation patterns
- Optimistic concurrency control for data integrity

**Type Safety:**

- Comprehensive TypeScript usage
- Clear interfaces for all component props
- Type-safe server function calls

### ⚠️ AREAS FOR PATTERN ENHANCEMENT

**Code Generation Opportunities:**

- Form field generation based on schema
- CRUD component scaffolding
- Data table column definitions

**Consistency Improvements:**

- Some components still use direct server function imports
- Mixed approaches to loading/error states
- Inconsistent naming conventions in some areas

---

## Pattern Recommendations for Ralph

### 1. **Component Template**

```typescript
interface {{ComponentName}}Props {
  // Props interface with clear naming
  onSuccess?: () => void
  onError?: (error: Error) => void
  isLoading?: boolean
}

export function {{ComponentName}}({ onSuccess, onError, isLoading }: {{ComponentName}}Props) {
  // 1. Hook initialization
  // 2. State management
  // 3. Effects
  // 4. Event handlers
  // 5. Render with error/loading states
}
```

### 2. **Form Template**

```typescript
export function {{EntityName}}Form({ {{entity}}, onSuccess, validateFn, submitFn }: {{EntityName}}FormProps) {
  const form = useForm({ /* TanStack Form config */ })
  const mutation = useMutation({ /* Mutation config */ })

  // Form submission with injected validation
  const handleSubmit = form.handleSubmit(async (data) => {
    const validation = validateFn?.(data)
    if (!validation?.success) return

    await mutation.mutateAsync(data)
  })

  return (
    <Form form={form}>
      {/* FormFieldWrapper usage */}
    </Form>
  )
}
```

### 3. **Server Function Template**

```typescript
export const {{action}}{{EntityName}} = createServerFn({ method: 'POST' })
  .inputValidator({{EntityName}}Schema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    return await withRLSContext(ctx.session, async (tx) => {
      // Implementation with audit logging
    })
  })
```

---

## Summary

**RENOZ Component Patterns Assessment: EXCELLENT FOUNDATION**

The codebase demonstrates sophisticated, enterprise-grade component patterns that provide an excellent foundation for Ralph Wiggum autonomous development. The Clean Architecture approach, comprehensive type safety, and consistent error handling create predictable patterns that Ralph can reliably follow and extend.

**Key Strengths for Ralph:**

- Clear architectural boundaries
- Consistent interfaces and patterns
- Comprehensive error handling
- Type-safe development practices
- Modular, testable component design

**Ralph can confidently build upon these established patterns to implement the UX remediation roadmap.**
