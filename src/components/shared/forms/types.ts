/**
 * Form Field Types
 *
 * Simplified types for TanStack Form field integration.
 * Avoids complex FieldApi generics while maintaining type safety.
 */

/**
 * Validation error from Zod or TanStack Form.
 */
export interface ValidationError {
  message?: string
}

/**
 * Field state interface matching TanStack Form's field.state shape.
 */
export interface FieldState {
  value: string
  meta: {
    isTouched: boolean
    errors: (ValidationError | string)[]
  }
}

/**
 * Simplified field interface for form components.
 * Compatible with TanStack Form's FieldApi.
 */
export interface FormFieldApi {
  name: string
  state: FieldState
  handleChange: (value: string) => void
  handleBlur: () => void
}
