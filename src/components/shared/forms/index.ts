/**
 * Form Components
 *
 * Reusable form field components integrated with TanStack Form.
 * All fields support Zod validation and consistent error display.
 *
 * @example
 * ```tsx
 * import {
 *   TextField,
 *   EmailField,
 *   NumberField,
 *   SwitchField,
 *   DateField,
 *   FormSection,
 *   FormActions,
 * } from '~/components/shared/forms'
 *
 * <FormSection title="Contact">
 *   <form.Field name="name">
 *     {(field) => <TextField field={field} label="Name" required />}
 *   </form.Field>
 *   <form.Field name="email">
 *     {(field) => <EmailField field={field} label="Email" required />}
 *   </form.Field>
 * </FormSection>
 * <FormActions form={form} submitLabel="Save" onCancel={onClose} />
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export {
  type FormFieldApi,
  type AnyFieldApi,
  type ValidationError,
  type FieldState,
  // Typed field API aliases
  type StringFieldApi,
  type NumberFieldApi,
  type NullableNumberFieldApi,
  type BooleanFieldApi,
  type DateFieldApi,
  type DateTimeFieldApi,
  type StringArrayFieldApi,
  // Utilities
  extractFieldError,
} from "./types"

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

export {
  FormField,
  type FormFieldProps,
  FieldGroup,
  type FieldGroupProps,
  FieldSet,
  type FieldSetProps,
  FieldLegend,
} from "./form-field"
export { FormSection, type FormSectionProps } from "./form-section"

// ============================================================================
// STRING FIELD COMPONENTS
// ============================================================================

export { TextField, type TextFieldProps } from "./text-field"
export { EmailField, type EmailFieldProps } from "./email-field"
export { TextareaField, type TextareaFieldProps } from "./textarea-field"
export { PhoneField, type PhoneFieldProps } from "./phone-field"

// ============================================================================
// SELECT FIELD COMPONENTS
// ============================================================================

export { SelectField, type SelectFieldProps, type SelectOption } from "./select-field"

// ============================================================================
// NUMBER FIELD COMPONENTS
// ============================================================================

export { NumberField, type NumberFieldProps } from "./number-field"
export { CurrencyField, type CurrencyFieldProps } from "./currency-field"

// ============================================================================
// BOOLEAN FIELD COMPONENTS
// ============================================================================

export { SwitchField, type SwitchFieldProps } from "./switch-field"
export { CheckboxField, type CheckboxFieldProps } from "./checkbox-field"

// ============================================================================
// DATE FIELD COMPONENTS
// ============================================================================

export { DateField, type DateFieldProps } from "./date-field"

// ============================================================================
// FORM UTILITY COMPONENTS
// ============================================================================

export {
  FormActions,
  type FormActionsProps,
  SubmitButton,
  type SubmitButtonProps,
} from "./form-actions"

export {
  FormErrorSummary,
  type FormErrorSummaryProps,
  SimpleError,
  type SimpleErrorProps,
} from "./form-error-summary"

// ============================================================================
// FORM WRAPPERS (Dialog/Sheet)
// ============================================================================

export {
  FormDialog,
  type FormDialogProps,
  ControlledFormDialog,
  type ControlledFormDialogProps,
} from "./form-dialog"

export {
  FormSheet,
  type FormSheetProps,
  ControlledFormSheet,
  type ControlledFormSheetProps,
} from "./form-sheet"

// ============================================================================
// ADVANCED FIELD COMPONENTS
// ============================================================================

export {
  RadioGroupField,
  type RadioGroupFieldProps,
  type RadioOption,
  RadioCardField,
  type RadioCardFieldProps,
} from "./radio-group-field"

export {
  ComboboxField,
  type ComboboxFieldProps,
  type ComboboxOption,
  MultiComboboxField,
  type MultiComboboxFieldProps,
  type GroupedComboboxOption,
} from "./combobox-field"

export {
  ArrayField,
  type ArrayFieldApi,
  type ArrayFieldProps,
  type ItemActions,
  StringArrayField,
  type StringArrayFieldProps,
} from "./array-field"

export {
  FormWizard,
  type FormWizardProps,
  type WizardStep,
  useWizard,
  type UseWizardOptions,
  type UseWizardResult,
} from "./form-wizard"

// ============================================================================
// DRAFT / AUTO-SAVE COMPONENTS
// ============================================================================

export {
  DraftRestorePrompt,
  type DraftRestorePromptProps,
  DraftSavingIndicator,
  type DraftSavingIndicatorProps,
} from "./draft-restore-prompt"
