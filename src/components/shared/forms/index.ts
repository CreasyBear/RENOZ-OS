/**
 * Form Components
 *
 * Reusable form field components integrated with TanStack Form.
 * All fields support Zod validation and consistent error display.
 *
 * @example
 * ```tsx
 * import { TextField, EmailField, FormSection } from '~/components/shared/forms'
 *
 * <FormSection title="Contact">
 *   <form.Field name="name">
 *     {(field) => <TextField field={field} label="Name" required />}
 *   </form.Field>
 *   <form.Field name="email">
 *     {(field) => <EmailField field={field} label="Email" required />}
 *   </form.Field>
 * </FormSection>
 * ```
 */

// Types
export type { FormFieldApi, ValidationError, FieldState } from "./types"

// Components
export { FormField, type FormFieldProps } from "./form-field"
export { TextField, type TextFieldProps } from "./text-field"
export { EmailField, type EmailFieldProps } from "./email-field"
export { CurrencyField, type CurrencyFieldProps } from "./currency-field"
export { SelectField, type SelectFieldProps, type SelectOption } from "./select-field"
export { TextareaField, type TextareaFieldProps } from "./textarea-field"
export { FormSection, type FormSectionProps } from "./form-section"
