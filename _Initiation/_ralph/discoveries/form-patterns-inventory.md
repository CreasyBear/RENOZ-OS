# Form Patterns Inventory

> **Analysis of existing form handling and validation patterns in RENOZ**
> **Date:** January 2026
> **Coverage:** 15+ form components analyzed

---

## Executive Summary

**Existing Pattern Maturity: SOPHISTICATED** - RENOZ demonstrates advanced form patterns with comprehensive validation, user experience, and error handling that exceed typical enterprise applications.

**Key Findings:**

- ✅ **Injected Validation**: Clean Architecture with dependency injection
- ✅ **Draft Saving**: Automatic form state preservation
- ✅ **Optimistic Concurrency**: Version-based conflict resolution
- ✅ **Comprehensive UX**: Loading states, error handling, accessibility
- ✅ **Type Safety**: Full TypeScript integration with TanStack Form
- ✅ **Progressive Enhancement**: Feature-rich forms with graceful degradation

**Ralph-Ready Assessment:** These patterns provide an excellent foundation for autonomous form implementation, with clear interfaces and validation that Ralph can reliably follow.

---

## 1. Core Form Architecture Pattern

### TanStack Form + Dependency Injection Pattern

**Structure:**

```typescript
interface CustomerFormProps {
  customer?: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  // Injected functions (Clean Architecture)
  onCreateCustomer?: (data: CreateCustomerInput) => Promise<Customer>
  onUpdateCustomer?: (id: string, version: number, data: UpdateCustomerInput) => Promise<Customer>
  // Injected validation
  validateCreate?: (data: unknown) => ValidationResult
  validateUpdate?: (data: unknown) => ValidationResult
  // Injected data fetching
  getCustomerFunction?: (params: { id: string }) => Promise<Customer>
}

export function CustomerForm({
  customer, open, onOpenChange, onSuccess,
  onCreateCustomer, onUpdateCustomer, validateCreate, validateUpdate, getCustomerFunction
}: CustomerFormProps) {
  // Implementation uses injected dependencies
}
```

**Benefits:**

- **Testability**: Forms can be tested with mock functions
- **Flexibility**: Different validation/behavior per context
- **Clean Architecture**: Presentation layer decoupled from infrastructure
- **Ralph-Compatible**: Clear interfaces make autonomous implementation predictable

**Examples Found:**

- `CustomerForm` - Full dependency injection with draft saving
- `OrderForm` - Complex multi-entity form with business rules
- `SupplierForm` - Business validation injection
- `UserForm` - Role-based validation and permissions

---

## 2. Form State Management Pattern

### TanStack Form Configuration

**Standard Form Setup:**

```typescript
const form = useForm({
  defaultValues: customer
    ? mapCustomerToFormValues(customer)  // Entity → Form mapping
    : getDefaultFormValues(),            // Smart defaults

  onSubmit: async ({ value }) => {
    setIsSubmitting(true)
    try {
      // 1. Validate using injected validator
      const validationFn = customer ? validateUpdate : validateCreate
      const validationResult = validationFn ? validationFn(value) : { success: true, data: value }

      if (!validationResult.success) {
        handleValidationErrors(validationResult.error, form)
        return
      }

      // 2. Execute mutation
      if (customer) {
        await updateMutation.mutateAsync({
          id: customer.id,
          version: customer.version,  // Optimistic concurrency
          ...value
        })
      } else {
        await createMutation.mutateAsync(value)
      }
    } finally {
      setIsSubmitting(false)
    }
  }
})
```

**Key Features:**

- **Smart Defaults**: Context-aware default values
- **Validation Injection**: Flexible validation strategies
- **Error Mapping**: Sophisticated error-to-field mapping
- **Concurrency Control**: Version-based conflict prevention

### Form Reset & Synchronization

**Dialog Form Pattern:**

```typescript
// Reset form when dialog opens/closes or customer changes
useEffect(() => {
  if (open) {
    form.reset(
      customer ? mapCustomerToFormValues(customer) : getDefaultFormValues()
    )
  }
}, [open, customer, form])
```

---

## 3. Validation Patterns

### Injected Validation Functions

**Zod Schema Validation:**

```typescript
export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
})

// Server function validation
export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator(CreateCustomerSchema)  // Automatic validation
  .handler(async ({ data }) => {
    // Data is guaranteed to match schema
  })
```

**Custom Business Validation:**

```typescript
export function validateCustomerCreation(data: unknown): ValidationResult {
  const result = CreateCustomerSchema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: {
        issues: result.error.issues.map(issue => ({
          ...issue,
          message: getUserFriendlyMessage(issue)  // Business-friendly messages
        }))
      }
    }
  }

  // Additional business rules
  if (data.companyName.toLowerCase().includes('test')) {
    return {
      success: false,
      error: { message: 'Test companies are not allowed in production' }
    }
  }

  return { success: true, data: result.data }
}
```

### Error Mapping to Form Fields

**Sophisticated Error Handling:**

```typescript
function handleValidationErrors(error: any, form: any) {
  if (error?.issues) {
    // Zod-style errors
    error.issues.forEach((issue: any) => {
      const fieldName = issue.path[0] as keyof typeof form
      form.setFieldMeta(fieldName, (meta: any) => ({
        ...meta,
        errors: [issue.message]
      }))
    })
  } else if (error?.fieldErrors) {
    // Field-specific errors
    Object.entries(error.fieldErrors).forEach(([field, messages]) => {
      form.setFieldMeta(field, (meta: any) => ({
        ...meta,
        errors: Array.isArray(messages) ? messages : [messages]
      }))
    })
  } else {
    // Generic error
    form.setFieldMeta('root', (meta: any) => ({
      ...meta,
      errors: [error?.message || 'Validation failed']
    }))
  }
}
```

---

## 4. Draft Saving Pattern

### Automatic Form State Preservation

**Draft Hook Usage:**

```typescript
// Only enable draft for new entities (not editing)
const { clearDraft, hasDraft } = useTanStackFormDraft({
  storageKey: customer ? `customer-edit-${customer.id}` : 'customer-create-draft',
  form,
  enabled: !customer,  // Only for new entities
  onRestore: () => {
    setShowDraftAlert(true)
  }
})
```

**Draft Alert Pattern:**

```typescript
const [showDraftAlert, setShowDraftAlert] = useState(false)

{showDraftAlert && (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Unsaved Changes Found</AlertTitle>
    <AlertDescription>
      We found unsaved changes from your last session. Would you like to restore them?
    </AlertDescription>
    <AlertActions>
      <Button onClick={() => setShowDraftAlert(false)}>Discard</Button>
      <Button onClick={() => {/* Restore draft */}}>Restore</Button>
    </AlertActions>
  </Alert>
)}
```

---

## 5. Mutation Patterns

### TanStack Query Mutations with Optimistic Updates

**Create Mutation Pattern:**

```typescript
const createMutation = useMutation({
  mutationFn: (formData: CreateCustomerInput) => {
    if (!onCreateCustomer) throw new Error('Create function not provided')
    return onCreateCustomer(formData)
  },
  onSuccess: (newCustomer) => {
    // Update cache optimistically
    queryClient.invalidateQueries({ queryKey: queryKeys.customers })
    queryClient.setQueryData(queryKeys.customer(newCustomer.id), newCustomer)

    // Show success feedback
    toast.success('Customer created successfully')

    // Trigger success callback
    onSuccess?.()
    onOpenChange(false)
  },
  onError: (error) => {
    // Handle error with user-friendly messages
    handleError(error, 'create', 'customer')
  }
})
```

**Update Mutation with Concurrency:**

```typescript
const updateMutation = useMutation({
  mutationFn: (data: UpdateCustomerInput & { id: string, version: number }) => {
    if (!onUpdateCustomer) throw new Error('Update function not provided')
    return onUpdateCustomer(data.id, data.version, data)
  },
  onSuccess: (updatedCustomer) => {
    // Update cache with new version
    queryClient.setQueryData(queryKeys.customer(updatedCustomer.id), updatedCustomer)
    queryClient.invalidateQueries({ queryKey: queryKeys.customers })

    toast.success('Customer updated successfully')
    onSuccess?.()
    onOpenChange(false)
  },
  onError: (error) => {
    if (error instanceof ConcurrencyError) {
      // Handle concurrency conflicts
      setConcurrencyError(error)
      setConflictDialogOpen(true)
    } else {
      handleError(error, 'update', 'customer')
    }
  }
})
```

### Concurrency Conflict Resolution

**Conflict Dialog Pattern:**

```typescript
const [concurrencyError, setConcurrencyError] = useState<ConcurrencyError | null>(null)
const [conflictDialogOpen, setConflictDialogOpen] = useState(false)

{conflictDialogOpen && (
  <ConcurrencyConflictDialog
    error={concurrencyError}
    onRefresh={() => {
      // Reload latest data
      getCustomerFunction?.({ id: customer!.id })
      setConflictDialogOpen(false)
    }}
    onOverride={() => {
      // Force update with latest version
      updateMutation.mutateAsync({
        ...form.value,
        version: concurrencyError.latestVersion
      })
      setConflictDialogOpen(false)
    }}
  />
)}
```

---

## 6. UI/UX Patterns

### Loading States & Form Feedback

**Comprehensive Loading Pattern:**

```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

// Form submission with loading
const handleSubmit = form.handleSubmit(async (data) => {
  setIsSubmitting(true)
  try {
    // Validation and submission
  } finally {
    setIsSubmitting(false)
  }
})

// UI with loading states
<Form form={form}>
  <form onSubmit={handleSubmit}>
    <FormFieldWrapper label="Company Name" error={/* error */}>
      <Input {...form.register('companyName')} disabled={isSubmitting} />
    </FormFieldWrapper>

    <FormFooter>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting || !form.canSubmit}>
        {isSubmitting ? <Spinner /> : null}
        {customer ? 'Update' : 'Create'} Customer
      </Button>
    </FormFooter>
  </form>
</Form>
```

### Form Field Wrapper Component

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

export function FormFieldWrapper({
  label, id, required, error, description, children, className, htmlFor
}: FormFieldWrapperProps) {
  const fieldId = htmlFor || id

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId} className={cn(error && 'text-destructive')} aria-required={required}>
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </Label>
      <div className="relative">
        {children}
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive mt-1 flex items-center gap-1" role="alert" aria-live="polite">
            <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </p>
        )}
        {description && (
          <p id={`${id}-description`} className={cn("text-sm mt-1", error ? "text-muted-foreground/70" : "text-muted-foreground")}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
```

---

## 7. Accessibility Patterns

### WCAG 2.1 AA Form Compliance

**Complete Accessibility Implementation:**

```typescript
// Form structure
<Form form={form}>
  <form onSubmit={handleSubmit} noValidate> {/* Prevent browser validation */}

    {/* Field with proper labeling */}
    <FormFieldWrapper
      label="Company Name"
      id="companyName"
      required
      error={form.getFieldMeta('companyName').errors?.[0]}
      description="The legal name of the company"
    >
      <Input
        {...form.register('companyName')}
        id="companyName"
        aria-describedby="companyName-description companyName-error"
        aria-invalid={!!form.getFieldMeta('companyName').errors?.length}
      />
    </FormFieldWrapper>

    {/* Submit button */}
    <Button
      type="submit"
      disabled={!form.canSubmit || isSubmitting}
      aria-describedby={isSubmitting ? "submitting-status" : undefined}
    >
      {isSubmitting && <Spinner aria-hidden="true" />}
      <span id="submitting-status"} aria-live="polite">
        {isSubmitting ? 'Creating customer...' : 'Create Customer'}
      </span>
    </Button>
  </form>
</Form>
```

**Screen Reader Support:**

- Proper form labels and descriptions
- Error announcements with aria-live
- Loading state announcements
- Required field indicators
- Keyboard navigation support

---

## 8. Complex Form Patterns

### Multi-Step Form Pattern

**Wizard Form Structure:**

```typescript
const [currentStep, setCurrentStep] = useState(0)
const steps = [
  { id: 'basic', title: 'Basic Information', fields: ['companyName', 'status'] },
  { id: 'contacts', title: 'Contact Details', fields: ['contacts'] },
  { id: 'addresses', title: 'Addresses', fields: ['addresses'] }
]

function validateStep(stepIndex: number): boolean {
  const stepFields = steps[stepIndex].fields
  const fieldMeta = form.getFieldMeta()
  return stepFields.every(field => !fieldMeta[field]?.errors?.length)
}

function nextStep() {
  if (validateStep(currentStep)) {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }
}
```

### Form with Related Data

**Customer Form with Contacts:**

```typescript
const form = useForm({
  defaultValues: {
    companyName: '',
    contacts: [{ firstName: '', lastName: '', email: '', isPrimary: false }]
  }
})

// Dynamic contact management
const { fields: contactFields, append, remove } = useFieldArray({
  control: form.control,
  name: 'contacts'
})

return (
  <Form form={form}>
    {/* Company fields */}
    <FormFieldWrapper label="Company Name">
      <Input {...form.register('companyName')} />
    </FormFieldWrapper>

    {/* Dynamic contacts */}
    {contactFields.map((field, index) => (
      <ContactFormSection
        key={field.id}
        index={index}
        onRemove={() => remove(index)}
        form={form}
      />
    ))}

    <Button type="button" onClick={() => append(getEmptyContact())}>
      Add Contact
    </Button>
  </Form>
)
```

---

## Ralph Compatibility Assessment

### ✅ HIGH COMPATIBILITY PATTERNS

**Predictable Form Structure:**

- Consistent prop interfaces across all forms
- Standardized validation injection patterns
- Clear error handling and user feedback patterns

**Type Safety & Validation:**

- Comprehensive Zod schema integration
- Type-safe form state management
- Injected validation functions with known interfaces

**User Experience Patterns:**

- Loading states and form feedback
- Draft saving and restoration
- Optimistic concurrency control
- Accessibility compliance

### ⚠️ AREAS FOR PATTERN ENHANCEMENT

**Code Generation Opportunities:**

- Form field generation from Zod schemas
- CRUD form scaffolding based on entity types
- Validation function templates

**Consistency Improvements:**

- Some forms still use direct server function calls
- Mixed approaches to complex form state
- Inconsistent multi-step form patterns

---

## Pattern Recommendations for Ralph

### 1. **Basic Form Template**

```typescript
interface {{EntityName}}FormProps {
  {{entityName}}?: {{EntityType}}
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  // Injected functions
  onCreate{{EntityName}}?: (data: any) => Promise<any>
  onUpdate{{EntityName}}?: (id: string, version: number, data: any) => Promise<any>
  validateCreate?: (data: unknown) => ValidationResult
  validateUpdate?: (data: unknown) => ValidationResult
}

export function {{EntityName}}Form({ {{entityName}}, open, onOpenChange, onSuccess, ...injected }: {{EntityName}}FormProps) {
  const form = useForm({ /* TanStack Form config */ })
  const createMutation = useMutation({ /* Create config */ })
  const updateMutation = useMutation({ /* Update config */ })

  // Form submission logic
  const handleSubmit = form.handleSubmit(async (data) => {
    // Validation and submission
  })

  return (
    <Form form={form}>
      <form onSubmit={handleSubmit}>
        {/* FormFieldWrapper fields */}
        <FormFooter>
          <Button type="submit" disabled={!form.canSubmit}>
            { {{entityName}} ? 'Update' : 'Create' }} {{EntityName}}
          </Button>
        </FormFooter>
      </form>
    </Form>
  )
}
```

### 2. **Validation Function Template**

```typescript
export function validate{{EntityName}}Creation(data: unknown): ValidationResult {
  const result = Create{{EntityName}}Schema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: {
        issues: result.error.issues.map(issue => ({
          ...issue,
          message: getUserFriendlyMessage(issue.path, issue.message)
        }))
      }
    }
  }

  // Additional business rules
  const businessErrors = validate{{EntityName}}BusinessRules(result.data)
  if (businessErrors.length > 0) {
    return {
      success: false,
      error: { message: businessErrors.join(', ') }
    }
  }

  return { success: true, data: result.data }
}
```

### 3. **Draft Hook Usage Template**

```typescript
const { clearDraft, hasDraft } = useTanStackFormDraft({
  storageKey: {{entityName}} ? `{{entityName}}-edit-${ {{entityName}}.id }` : '{{entityName}}-create-draft',
  form,
  enabled: !{{entityName}},  // Only for new entities
  onRestore: () => setShowDraftAlert(true)
})
```

---

## Summary

**RENOZ Form Patterns Assessment: EXCEPTIONAL SOPHISTICATION**

The RENOZ form patterns demonstrate exceptional sophistication with enterprise-grade validation, user experience, and error handling that exceeds typical web applications. The Clean Architecture approach with dependency injection creates predictable, testable forms that Ralph can reliably implement.

**Key Strengths for Ralph:**

- Clear architectural boundaries with injection
- Comprehensive validation and error handling
- Type-safe form state management
- Accessibility and UX best practices
- Draft saving and concurrency control

**Ralph can confidently implement complex forms following these established patterns.**
