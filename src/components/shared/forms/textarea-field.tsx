/**
 * TextareaField Component
 *
 * Multiline text input field integrated with TanStack Form.
 * Uses shadcn Textarea for consistent styling.
 *
 * @example
 * ```tsx
 * <form.Field name="description">
 *   {(field) => (
 *     <TextareaField
 *       field={field}
 *       label="Description"
 *       placeholder="Enter description..."
 *       rows={4}
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { Textarea } from "~/components/ui/textarea";
import { FormField } from "./form-field";
import { useFormFieldDisplay } from "./form-field-display-context";
import { cn } from "~/lib/utils";
import { extractFieldError, type FormFieldWithType } from "./types";

export interface TextareaFieldProps {
  /** TanStack Form field instance */
  field: FormFieldWithType<string | null | undefined>;
  /** Field label */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text */
  description?: string;
  /** Number of visible rows */
  rows?: number;
  /** Additional class names for the wrapper */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Maximum character length */
  maxLength?: number;
}

export function TextareaField({
  field,
  label,
  placeholder,
  required,
  description,
  rows = 3,
  className,
  disabled,
  maxLength,
}: TextareaFieldProps) {
  const { showErrorsAfterSubmit } = useFormFieldDisplay();
  const error = extractFieldError(field, { showErrorsAfterSubmit });

  const currentLength = field.state.value?.length ?? 0;

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={
        maxLength
          ? `${currentLength}/${maxLength} characters${description ? ` • ${description}` : ""}`
          : description
      }
      required={required}
      className={className}
    >
      <Textarea
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn("min-h-[80px] resize-y")}
      />
    </FormField>
  );
}
