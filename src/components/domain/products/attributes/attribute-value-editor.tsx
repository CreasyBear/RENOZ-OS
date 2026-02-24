/**
 * AttributeValueEditor Component
 *
 * Dialog for editing a single attribute value with type-specific inputs.
 */
import { useEffect } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  FormDialog,
  TextField,
  NumberField,
  SelectField,
  SwitchField,
  DateStringField,
} from "@/components/shared/forms";
import { useSetProductAttribute } from "@/hooks/products";
import { toastError } from "@/hooks";

export interface AttributeDefinition {
  attributeId: string;
  attributeName: string;
  attributeType: string;
  value: string | number | boolean | string[] | null;
  isRequired: boolean;
  options?: {
    choices?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
  };
}

interface AttributeValueEditorProps {
  productId: string;
  attribute: AttributeDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const formSchema = z.object({
  value: z.any(),
});

type FormValues = z.infer<typeof formSchema>;

export function AttributeValueEditor({
  productId,
  attribute,
  open,
  onOpenChange,
  onSaved,
}: AttributeValueEditorProps) {
  const setAttributeMutation = useSetProductAttribute();

  const form = useTanStackForm<FormValues>({
    schema: formSchema,
    defaultValues: { value: null },
    onSubmit: async (data) => {
      if (!attribute) return;
      try {
        await setAttributeMutation.mutateAsync({
          productId,
          attributeId: attribute.attributeId,
          value: data.value,
        });
        onSaved?.();
        onOpenChange(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save attribute";
        toastError(errorMessage);
      }
    },
    onSubmitInvalid: () => {},
  });

  useEffect(() => {
    if (open && attribute) {
      form.reset({ value: attribute.value });
    }
  }, [open, attribute, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && setAttributeMutation.isPending) return;
    onOpenChange(newOpen);
  };

  const handleClear = () => {
    form.setFieldValue("value", null);
  };

  if (!attribute) return null;

  const getTypeBadgeVariant = (): "default" | "secondary" | "outline" => {
    switch (attribute.attributeType) {
      case "boolean":
        return "default";
      case "number":
        return "secondary";
      case "select":
      case "multiselect":
        return "outline";
      default:
        return "secondary";
    }
  };

  const valueField = (
    <form.Field name="value">
      {(field) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Value</Label>
            {field.state.value !== null && field.state.value !== undefined && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {attribute.attributeType === "text" && (
            <TextField
              field={field as Parameters<typeof TextField>[0]["field"]}
              label="Value"
              placeholder={attribute.options?.placeholder ?? "Enter value..."}
            />
          )}

          {attribute.attributeType === "number" && (
            <NumberField
              field={field as Parameters<typeof NumberField>[0]["field"]}
              label="Value"
              placeholder={attribute.options?.placeholder ?? "Enter number..."}
              min={attribute.options?.min}
              max={attribute.options?.max}
              step={attribute.options?.step ?? 1}
            />
          )}

          {attribute.attributeType === "boolean" && (
            <SwitchField
              field={field as Parameters<typeof SwitchField>[0]["field"]}
              label="Value"
              description={
                field.state.value === true
                  ? "Yes"
                  : field.state.value === false
                    ? "No"
                    : "Not set"
              }
            />
          )}

          {attribute.attributeType === "date" && (
            <DateStringField
              field={field as Parameters<typeof DateStringField>[0]["field"]}
              label="Value"
              placeholder="Select date"
            />
          )}

          {attribute.attributeType === "select" && (
            (attribute.options?.choices ?? []).length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No options available
              </div>
            ) : (
              <SelectField
                field={field as Parameters<typeof SelectField>[0]["field"]}
                label="Value"
                options={(attribute.options?.choices ?? []).map((c) => ({ value: c.value, label: c.label }))}
                placeholder="Select an option..."
              />
            )
          )}

          {attribute.attributeType === "multiselect" && (
            <div className="space-y-2">
              {(attribute.options?.choices ?? []).map((choice) => {
                const selectedValues = Array.isArray(field.state.value)
                  ? field.state.value
                  : [];
                const toggleValue = (value: string) => {
                  if (selectedValues.includes(value)) {
                    field.handleChange(selectedValues.filter((v) => v !== value));
                  } else {
                    field.handleChange([...selectedValues, value]);
                  }
                };
                return (
                  <div key={choice.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`choice-${choice.value}`}
                      checked={selectedValues.includes(choice.value)}
                      onCheckedChange={() => toggleValue(choice.value)}
                    />
                    <Label htmlFor={`choice-${choice.value}`} className="cursor-pointer">
                      {choice.label}
                    </Label>
                  </div>
                );
              })}
              {Array.isArray(field.state.value) && field.state.value.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {field.state.value.map((v) => (
                    <Badge key={v} variant="secondary">
                      {attribute.options?.choices?.find((c) => c.value === v)?.label ?? v}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {!["text", "number", "boolean", "date", "select", "multiselect"].includes(
            attribute.attributeType
          ) && (
            <TextField
              field={field as Parameters<typeof TextField>[0]["field"]}
              label="Value"
              placeholder="Enter value..."
            />
          )}
        </div>
      )}
    </form.Field>
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit Attribute"
      description="Update the value for this product attribute"
      form={form}
      submitLabel="Save"
      submitError={setAttributeMutation.error?.message ?? null}
      size="md"
      className="max-w-md"
    >
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium">{attribute.attributeName}</span>
          <Badge variant={getTypeBadgeVariant()}>{attribute.attributeType}</Badge>
        </div>
        {attribute.isRequired && (
          <span className="text-xs text-amber-600">Required</span>
        )}
      </div>

      {valueField}

      {(attribute.options?.min !== undefined || attribute.options?.max !== undefined) && (
        <p className="text-xs text-muted-foreground">
          {attribute.options.min !== undefined && `Min: ${attribute.options.min}`}
          {attribute.options.min !== undefined &&
            attribute.options.max !== undefined &&
            " · "}
          {attribute.options.max !== undefined && `Max: ${attribute.options.max}`}
        </p>
      )}
    </FormDialog>
  );
}
