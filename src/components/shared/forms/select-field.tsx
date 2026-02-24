/**
 * SelectField Component
 *
 * Dropdown select field integrated with TanStack Form.
 * Uses shadcn Select for consistent styling and UX.
 *
 * @example
 * ```tsx
 * <form.Field name="status">
 *   {(field) => (
 *     <SelectField
 *       field={field}
 *       label="Status"
 *       options={[
 *         { value: "active", label: "Active" },
 *         { value: "inactive", label: "Inactive" },
 *       ]}
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "./form-field";
import { useFormFieldDisplay } from "./form-field-display-context";
import { extractFieldError, type FormFieldWithType } from "./types";

const PLACEHOLDER_VALUE = "__placeholder__";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  /** TanStack Form field instance */
  field: FormFieldWithType<string | null | undefined>;
  /** Field label */
  label: string;
  /** Select options */
  options: SelectOption[];
  /** Placeholder text for empty selection */
  placeholder?: string;
  /** Optional "null" option (e.g. "All Products") - when selected, stores null. Use for optional nullable fields. */
  nullOption?: { value: string; label: string };
  /** Whether the field is required */
  required?: boolean;
  /** Helper text */
  description?: string;
  /** Additional class names for the wrapper */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function SelectField({
  field,
  label,
  options,
  placeholder = "Select an option",
  nullOption,
  required,
  description,
  className,
  disabled,
}: SelectFieldProps) {
  const { showErrorsAfterSubmit } = useFormFieldDisplay();
  const error = extractFieldError(field, { showErrorsAfterSubmit });

  const rawValue = field.state.value;
  const displayValue =
    rawValue ?? (nullOption ? nullOption.value : PLACEHOLDER_VALUE);

  const handleValueChange = (v: string) => {
    if (v === PLACEHOLDER_VALUE) {
      field.handleChange(null);
    } else if (nullOption && v === nullOption.value) {
      field.handleChange(null);
    } else {
      field.handleChange(v);
    }
    field.handleBlur();
  };

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <SelectFieldControl
        displayValue={displayValue}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        nullOption={nullOption}
        options={options}
        disabled={disabled}
      />
    </FormField>
  );
}

interface SelectFieldControlProps {
  displayValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  nullOption?: { value: string; label: string };
  options: SelectOption[];
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

function SelectFieldControl({
  displayValue,
  onValueChange,
  placeholder,
  nullOption,
  options,
  disabled,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SelectFieldControlProps) {
  return (
    <Select
      value={displayValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="w-full"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {nullOption ? (
          <SelectItem value={nullOption.value}>{nullOption.label}</SelectItem>
        ) : (
          <SelectItem value={PLACEHOLDER_VALUE} disabled>
            {placeholder}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
