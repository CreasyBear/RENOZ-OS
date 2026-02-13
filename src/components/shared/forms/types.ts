/**
 * Form Field Types
 *
 * TanStack Form field integration using FormFieldWithType<T> per community best practices.
 * @see https://github.com/TanStack/form/discussions/1240
 *
 * @example
 * ```tsx
 * <form.Field name="email">
 *   {(field) => <TextField field={field} label="Email" />}
 * </form.Field>
 * ```
 */

import type { FC } from 'react'
import type { FieldApi } from '@tanstack/form-core'

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
    errors: (string | ValidationError | undefined)[]
  }
}

/**
 * Generic field interface for form components.
 */
export interface FormFieldApi<T = string> {
  name: string
  state: FieldState<T>
  handleChange: (value: T) => void
  handleBlur: () => void
}

/**
 * Field API type for form components. Uses `any` for the value type to accept
 * both strict (string) and loose (string | null | undefined) fields - avoids
 * contravariance issues in FieldListeners when passing fields from form.Field.
 * @see https://github.com/TanStack/form/discussions/1240
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type FormFieldWithType<_T = string> = FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Props for a form field component that receives field from form.Field render prop.
 */
export type FormFieldProps<T, P extends Record<string, unknown> = Record<string, unknown>> = P & {
  field: FormFieldWithType<T>
}

/**
 * Form field component type - use for type-safe reusable field components.
 */
export type FormField<T, P extends Record<string, unknown> = Record<string, unknown>> = FC<FormFieldProps<T, P>>

/** @deprecated Use FormFieldWithType<T> for new code. Kept for backwards compatibility. */
export type AnyFieldApi<T = unknown> = FormFieldWithType<T>

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
