/**
 * TanStack Form Hook with Zod Preset
 *
 * Provides a standardized way to create forms with TanStack Form and Zod validation.
 *
 * ## Validation Modes
 *
 * By default, validation runs on submit only. For real-time feedback:
 *
 * **Option 1: Per-field validation (Recommended)**
 * Add validators to individual fields for immediate feedback:
 * ```tsx
 * <form.Field
 *   name="email"
 *   validators={{
 *     onChange: ({ value }) => !value.includes('@') ? 'Invalid email' : undefined,
 *   }}
 * >
 *   {(field) => <TextField field={field} label="Email" />}
 * </form.Field>
 * ```
 *
 * **Option 2: Form-level onChange validation**
 * Set `validateOnChange: true` to run the full schema on every change.
 * This can be less performant for large forms.
 *
 * @example
 * ```tsx
 * const customerSchema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email'),
 * });
 *
 * function CustomerForm() {
 *   const form = useTanStackForm({
 *     schema: customerSchema,
 *     defaultValues: { name: '', email: '' },
 *     onSubmit: async (values) => {
 *       await createCustomer({ data: values });
 *     },
 *   });
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
 *       <form.Field name="name">
 *         {(field) => <TextField field={field} label="Name" required />}
 *       </form.Field>
 *       <FormActions form={form} submitLabel="Create" />
 *     </form>
 *   );
 * }
 * ```
 */

import { useForm, type DeepValue } from '@tanstack/react-form'
import type { z } from 'zod'

// ============================================================================
// TYPES
// ============================================================================

export interface UseTanStackFormOptions<TFormData> {
  /** Zod schema for validation */
  schema: z.ZodType<TFormData>
  /** Default form values */
  defaultValues: TFormData
  /** Submit handler called with validated values */
  onSubmit: (values: TFormData) => void | Promise<void>
  /** Error handler for validation failures */
  onValidationError?: (errors: z.ZodError<TFormData>) => void
  /** Transform values before submission (optional) */
  transform?: (values: TFormData) => TFormData
  /**
   * Enable form-level onChange validation.
   * When true, runs the full Zod schema on every field change.
   * Consider per-field validators for better performance.
   * @default false
   */
  validateOnChange?: boolean
  /**
   * Enable form-level onBlur validation.
   * When true, runs the full Zod schema when any field loses focus.
   * @default false
   */
  validateOnBlur?: boolean
}

/**
 * Extended form API with additional utilities.
 * Use this type when you need to pass the form to components that need the extended methods.
 */
export interface FormUtilities<TFormData> {
  /** Get all form values */
  getValues: () => TFormData
  /** Set a specific field value */
  setFieldValue: <TField extends keyof TFormData>(
    field: TField,
    value: TFormData[TField]
  ) => void
  /** Check if form has been modified */
  isDirty: () => boolean
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Create a TanStack Form instance with Zod validation.
 *
 * Features:
 * - Zod validation on submit (always)
 * - Optional onChange/onBlur form-level validation
 * - Type-safe form values inferred from schema
 * - Built-in transform support for pre-processing
 * - Consistent error handling patterns
 *
 * @param options - Form configuration options
 * @returns TanStack Form instance
 */
export function useTanStackForm<TFormData>({
  schema,
  defaultValues,
  onSubmit,
  onValidationError,
  transform,
  validateOnChange = false,
  validateOnBlur = false,
}: UseTanStackFormOptions<TFormData>) {
  // Build validators object based on options
  const createValidator = () => ({
    validate: ({ value }: { value: TFormData }) => {
      const result = schema.safeParse(value)
      if (!result.success) {
        // Return first error message for form-level display
        const firstIssue = result.error.issues[0]
        return firstIssue?.message ?? 'Validation failed'
      }
      return undefined
    },
  })

  const form = useForm({
    defaultValues,
    validators: {
      // Optional onChange validation
      ...(validateOnChange && { onChange: createValidator().validate }),
      // Optional onBlur validation
      ...(validateOnBlur && { onBlur: createValidator().validate }),
    },
    onSubmit: async ({ value }) => {
      // Always validate with Zod schema on submit
      const result = schema.safeParse(value)

      if (!result.success) {
        onValidationError?.(result.error)
        throw result.error
      }

      // Transform if provided
      const finalValue = transform ? transform(result.data) : result.data

      // Call the submit handler
      await onSubmit(finalValue)
    },
  })

  // Add utility methods via Object.assign to preserve form type
  const utilities: FormUtilities<TFormData> = {
    getValues: () => form.state.values,

    setFieldValue: <TField extends keyof TFormData>(
      fieldName: TField,
      value: TFormData[TField]
    ) => {
      form.setFieldValue(fieldName as string, value as DeepValue<TFormData, string>)
    },

    isDirty: () => {
      // Compare current values with default values
      const current = JSON.stringify(form.state.values)
      const initial = JSON.stringify(defaultValues)
      return current !== initial
    },
  }

  return Object.assign(form, utilities)
}

/**
 * TanStack Form API type for use in component props.
 * Use this when passing the form to sub-components.
 *
 * Note: This is a generic type that captures the full return type of useTanStackForm.
 * The TFormData parameter MUST be provided - no default to ensure type safety.
 */
export type TanStackFormApi<TFormData> = ReturnType<typeof useTanStackForm<TFormData>>

// ============================================================================
// FORM FACTORY
// ============================================================================

/**
 * Options for creating a domain-specific form factory
 */
export interface FormFactoryOptions<TFormData> {
  /** Zod schema for validation */
  schema: z.ZodType<TFormData>
  /** Default form values */
  defaultValues: TFormData
  /** Default transform (can be overridden per-instance) */
  defaultTransform?: (values: TFormData) => TFormData
  /** Default validation modes */
  defaults?: {
    validateOnChange?: boolean
    validateOnBlur?: boolean
  }
}

/**
 * Options for creating a form instance from a factory
 */
export interface FormInstanceOptions<TFormData> {
  /** Submit handler (required) */
  onSubmit: (values: TFormData) => void | Promise<void>
  /** Override default values */
  defaultValues?: Partial<TFormData>
  /** Error handler for validation failures */
  onValidationError?: (errors: z.ZodError<TFormData>) => void
  /** Transform values before submission */
  transform?: (values: TFormData) => TFormData
  /** Override onChange validation setting */
  validateOnChange?: boolean
  /** Override onBlur validation setting */
  validateOnBlur?: boolean
}

/**
 * Create a domain-specific form factory.
 *
 * Use this to create reusable form configurations for a specific domain (e.g., customers, orders).
 *
 * @example
 * ```tsx
 * // In src/hooks/customers/use-customer-form.ts
 * import { createFormFactory } from '~/hooks/_shared/use-tanstack-form'
 * import { customerSchema } from '~/lib/schemas/customers'
 *
 * const customerFormFactory = createFormFactory({
 *   schema: customerSchema,
 *   defaultValues: {
 *     name: '',
 *     email: '',
 *     phone: '',
 *   },
 *   defaults: {
 *     validateOnBlur: true,
 *   },
 * })
 *
 * // Export the typed hook for components to use
 * export function useCustomerForm(options: FormInstanceOptions<CustomerFormData>) {
 *   return customerFormFactory.useForm(options)
 * }
 *
 * // In a component:
 * const form = useCustomerForm({
 *   onSubmit: async (values) => {
 *     await createCustomer({ data: values })
 *   },
 * })
 * ```
 */
export function createFormFactory<TFormData>(options: FormFactoryOptions<TFormData>) {
  const { schema, defaultValues, defaultTransform, defaults = {} } = options

  return {
    /** The schema used by this factory */
    schema,

    /** The default values used by this factory */
    defaultValues,

    /**
     * Create a form instance with the factory's configuration
     */
    useForm: (instanceOptions: FormInstanceOptions<TFormData>): TanStackFormApi<TFormData> => {
      const mergedDefaultValues = {
        ...defaultValues,
        ...instanceOptions.defaultValues,
      }

      return useTanStackForm({
        schema,
        defaultValues: mergedDefaultValues,
        onSubmit: instanceOptions.onSubmit,
        onValidationError: instanceOptions.onValidationError,
        transform: instanceOptions.transform ?? defaultTransform,
        validateOnChange: instanceOptions.validateOnChange ?? defaults.validateOnChange ?? false,
        validateOnBlur: instanceOptions.validateOnBlur ?? defaults.validateOnBlur ?? false,
      })
    },
  }
}
