/**
 * Form Field Types
 *
 * Simplified types for TanStack Form field integration.
 * Uses permissive typing to work with TanStack Form's FieldApi.
 *
 * @example
 * ```tsx
 * // Fields automatically receive correct types from form.Field
 * <form.Field name="email">
 *   {(field) => <TextField field={field} label="Email" />}
 * </form.Field>
 *
 * <form.Field name="quantity">
 *   {(field) => <NumberField field={field} label="Quantity" />}
 * </form.Field>
 * ```
 */

/**
 * Validation error from Zod or TanStack Form.
 */
export interface ValidationError {
  message?: string
}

/**
 * Generic field state interface matching TanStack Form's field.state shape.
 */
export interface FieldState<T = string> {
  value: T
  meta: {
    isTouched: boolean
    errors: (ValidationError | string)[]
  }
}

/**
 * Generic field interface for form components.
 * Uses permissive typing to work with TanStack Form's FieldApi.
 *
 * TanStack Form's FieldApi has 22+ generic parameters, so we use a
 * minimal interface that captures only what our field components need.
 *
 * @template T - The type of the field value (string, number, boolean, Date, etc.)
 */
export interface FormFieldApi<T = string> {
  name: string
  state: FieldState<T>
  handleChange: (value: T) => void
  handleBlur: () => void
}

/**
 * Loose field type that accepts TanStack Form's FieldApi.
 * Use this in component props to accept any TanStack Form field.
 *
 * @example
 * ```tsx
 * interface MyFieldProps {
 *   field: AnyFieldApi
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFieldApi<T = any> = {
  name: string
  state: {
    /** Value can be T, null, or undefined for optional/nullable fields */
    value: T | null | undefined
    meta: {
      isTouched: boolean
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: any[]
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleChange: (value: any) => void
  handleBlur: () => void
}

// ============================================================================
// TYPED FIELD API ALIASES
// ============================================================================

/** Field API for string inputs (text, email, textarea, select, etc.) */
export type StringFieldApi = FormFieldApi<string>

/** Field API for number inputs (strict - use NullableNumberFieldApi for forms) */
export type NumberFieldApi = FormFieldApi<number>

/**
 * Field API for number inputs that support empty state.
 * Use this for form fields where empty is different from zero.
 */
export type NullableNumberFieldApi = FormFieldApi<number | null | undefined>

/** Field API for boolean inputs (switch, checkbox) */
export type BooleanFieldApi = FormFieldApi<boolean>

/** Field API for date inputs */
export type DateFieldApi = FormFieldApi<Date | null>

/** Field API for date-time inputs */
export type DateTimeFieldApi = FormFieldApi<Date | null>

/** Field API for string array inputs (multi-select, tags) */
export type StringArrayFieldApi = FormFieldApi<string[]>

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Extract the first error message from a field's error state.
 * Returns undefined if no errors or field is not touched.
 *
 * @example
 * ```tsx
 * const error = extractFieldError(field);
 * ```
 */
export function extractFieldError<T>(field: AnyFieldApi<T> | FormFieldApi<T>): string | undefined {
  if (!field.state.meta.isTouched || field.state.meta.errors.length === 0) {
    return undefined
  }

  const rawError = field.state.meta.errors[0]
  return typeof rawError === 'string' ? rawError : rawError?.message
}
