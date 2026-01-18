/**
 * AttributeValueEditor Component
 *
 * Dialog for editing a single attribute value with type-specific inputs.
 */
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setProductAttribute } from "@/lib/server/functions/product-attributes";

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

// Form schema - accepts any value type
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      value: null,
    },
  });

  const currentValue = watch("value");


  // Handle save
  const onSubmit = async (data: FormValues) => {
    if (!attribute) return;

    setIsSaving(true);
    setError(null);

    try {
      await setProductAttribute({
        data: {
          productId,
          attributeId: attribute.attributeId,
          value: data.value,
        },
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save attribute:", err);
      setError(err instanceof Error ? err.message : "Failed to save attribute");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  // Clear value
  const handleClear = () => {
    setValue("value", null);
  };

  if (!attribute) return null;

  // Render type-specific input
  const renderInput = () => {
    switch (attribute.attributeType) {
      case "text":
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={(field.value as string) ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder={attribute.options?.placeholder ?? "Enter value..."}
              />
            )}
          />
        );

      case "number":
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? null : parseFloat(val));
                }}
                placeholder={attribute.options?.placeholder ?? "Enter number..."}
                min={attribute.options?.min}
                max={attribute.options?.max}
                step={attribute.options?.step ?? 1}
              />
            )}
          />
        );

      case "boolean":
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {field.value === true ? "Yes" : field.value === false ? "No" : "Not set"}
                </span>
              </div>
            )}
          />
        );

      case "date":
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                {...field}
                value={(field.value as string) ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            )}
          />
        );

      case "select":
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Select
                value={(field.value as string) ?? ""}
                onValueChange={(val) => field.onChange(val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {attribute.options?.choices?.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case "multiselect":
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => {
              const selectedValues = Array.isArray(field.value) ? field.value : [];

              const toggleValue = (value: string) => {
                if (selectedValues.includes(value)) {
                  field.onChange(selectedValues.filter((v) => v !== value));
                } else {
                  field.onChange([...selectedValues, value]);
                }
              };

              return (
                <div className="space-y-2">
                  {attribute.options?.choices?.map((choice) => (
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
                  ))}
                  {selectedValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedValues.map((v) => (
                        <Badge key={v} variant="secondary">
                          {attribute.options?.choices?.find((c) => c.value === v)?.label ?? v}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            }}
          />
        );

      default:
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder="Enter value..."
              />
            )}
          />
        );
    }
  };

  // Get type badge color
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attribute</DialogTitle>
          <DialogDescription>
            Update the value for this product attribute
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Attribute info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">{attribute.attributeName}</span>
              <Badge variant={getTypeBadgeVariant()}>{attribute.attributeType}</Badge>
            </div>
            {attribute.isRequired && (
              <span className="text-xs text-amber-600">Required</span>
            )}
          </div>

          {/* Value input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Value</Label>
              {currentValue !== null && currentValue !== undefined && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {renderInput()}
          </div>

          {/* Constraints info */}
          {(attribute.options?.min !== undefined || attribute.options?.max !== undefined) && (
            <p className="text-xs text-muted-foreground">
              {attribute.options.min !== undefined && `Min: ${attribute.options.min}`}
              {attribute.options.min !== undefined && attribute.options.max !== undefined && " · "}
              {attribute.options.max !== undefined && `Max: ${attribute.options.max}`}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
