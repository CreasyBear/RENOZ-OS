/**
 * AttributeDefinitions Component
 *
 * Manage product attribute definitions (admin interface).
 * Create, edit, and delete attribute schemas.
 */
import { useState, useCallback } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Settings,
  Filter,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastError } from "@/hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FormDialog,
  TextField,
  NumberField,
  SelectField,
  TextareaField,
  CheckboxField,
} from "@/components/shared/forms";
import {
  useProductAttributeDefinitions,
  useCreateAttributeDefinition,
  useUpdateAttributeDefinition,
  useDeleteAttributeDefinition,
} from "@/hooks/products";

// Types
const ATTRIBUTE_TYPES = [
  { value: "text", label: "Text", description: "Free-form text input" },
  { value: "number", label: "Number", description: "Numeric value with optional range" },
  { value: "boolean", label: "Yes/No", description: "True or false toggle" },
  { value: "select", label: "Single Select", description: "Choose one option from a list" },
  { value: "multiselect", label: "Multi Select", description: "Choose multiple options" },
  { value: "date", label: "Date", description: "Date picker" },
] as const;

type AttributeType = (typeof ATTRIBUTE_TYPES)[number]["value"];

interface AttributeDefinition {
  id: string;
  name: string;
  attributeType: string;
  description: string | null;
  options: {
    choices?: Array<{ value: string; label: string; sortOrder?: number }>;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
  } | null;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  categoryIds: string[] | null;
  sortOrder: number;
  isActive: boolean;
}

interface AttributeDefinitionsProps {
  onAttributesChange?: () => void;
}

// Form schema
const attributeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  attributeType: z.enum(["text", "number", "boolean", "select", "multiselect", "date"]),
  description: z.string().max(500).optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  isSearchable: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  // Options
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  choices: z.array(z.object({
    value: z.string().min(1),
    label: z.string().min(1),
  })).optional(),
});

type AttributeFormValues = z.infer<typeof attributeFormSchema>;

export function AttributeDefinitions({ onAttributesChange }: AttributeDefinitionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<AttributeDefinition | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<AttributeDefinition | null>(null);
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  // TanStack Query hooks
  const { data: attributesData = [], isLoading } = useProductAttributeDefinitions({ activeOnly: false });
  const createMutation = useCreateAttributeDefinition();
  const updateMutation = useUpdateAttributeDefinition();
  const deleteMutation = useDeleteAttributeDefinition();

  const attributes = attributesData as AttributeDefinition[];
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const getDefaultFormValues = useCallback(
    (attr?: AttributeDefinition | null): AttributeFormValues => ({
      name: attr?.name ?? "",
      attributeType: (attr?.attributeType as AttributeType) ?? "text",
      description: attr?.description ?? "",
      isRequired: attr?.isRequired ?? false,
      isFilterable: attr?.isFilterable ?? false,
      isSearchable: attr?.isSearchable ?? false,
      sortOrder: attr?.sortOrder ?? attributes.length,
      placeholder: attr?.options?.placeholder,
      min: attr?.options?.min,
      max: attr?.options?.max,
      step: attr?.options?.step,
      choices: attr?.options?.choices ?? [],
    }),
    [attributes.length]
  );

  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm<AttributeFormValues>({
    schema: attributeFormSchema,
    defaultValues: getDefaultFormValues(),
    onSubmit: async (data) => {
      setSubmitError(null);
      try {
        const options: AttributeDefinition["options"] = {};
        if (data.placeholder) options.placeholder = data.placeholder;
        if (data.min !== undefined) options.min = data.min;
        if (data.max !== undefined) options.max = data.max;
        if (data.step !== undefined) options.step = data.step;
        if (data.choices && data.choices.length > 0) {
          options.choices = data.choices.map((c, i) => ({ ...c, sortOrder: i }));
        }

        if (editingAttribute) {
          await updateMutation.mutateAsync({
          id: editingAttribute.id,
          name: data.name,
          description: data.description,
          options: Object.keys(options).length > 0 ? options : undefined,
          isRequired: data.isRequired,
          isFilterable: data.isFilterable,
          isSearchable: data.isSearchable,
          sortOrder: data.sortOrder,
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          attributeType: data.attributeType,
          description: data.description,
          options: Object.keys(options).length > 0 ? options : undefined,
          isRequired: data.isRequired,
          isFilterable: data.isFilterable,
          isSearchable: data.isSearchable,
          sortOrder: data.sortOrder,
        });
        }
        setIsFormOpen(false);
        onAttributesChange?.();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to save attribute";
        setSubmitError(msg);
        toastError(msg);
      }
    },
    onSubmitInvalid: () => {},
  });

  const watchType = form.useWatch("attributeType");
  const choices = form.useWatch("choices") ?? [];

  const addChoice = () => {
    form.setFieldValue("choices", [...choices, { value: "", label: "" }]);
  };

  const removeChoice = (index: number) => {
    form.setFieldValue(
      "choices",
      choices.filter((_, i) => i !== index)
    );
  };

  // Open form for new attribute
  const handleNew = () => {
    setSubmitError(null);
    setEditingAttribute(null);
    form.reset(getDefaultFormValues());
    setOptionsExpanded(false);
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleEdit = (attr: AttributeDefinition) => {
    setSubmitError(null);
    setEditingAttribute(attr);
    form.reset(getDefaultFormValues(attr));
    setOptionsExpanded(true);
    setIsFormOpen(true);
  };

  // Delete attribute
  const handleDelete = async () => {
    if (!deletingAttribute) return;

    try {
      await deleteMutation.mutateAsync(deletingAttribute.id);
      setDeletingAttribute(null);
      onAttributesChange?.();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to delete attribute"
      );
    }
  };

  // Toggle attribute active status
  const handleToggleActive = async (attr: AttributeDefinition) => {
    try {
      await updateMutation.mutateAsync({
        id: attr.id,
        isActive: !attr.isActive,
      });
      onAttributesChange?.();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to toggle attribute"
      );
    }
  };

  // Get type info
  const getTypeInfo = (type: string) => {
    return ATTRIBUTE_TYPES.find((t) => t.value === type) ?? ATTRIBUTE_TYPES[0];
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Attribute Definitions
            </CardTitle>
            <CardDescription>
              Define custom attributes that can be assigned to products
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Attribute
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : attributes.length === 0 ? (
            <EmptyState
              title="No attributes defined"
              message="Create attribute definitions to add custom fields to products"
              primaryAction={{
                label: "Create First Attribute",
                onClick: handleNew,
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Required</TableHead>
                  <TableHead className="text-center">Filterable</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attr) => (
                  <TableRow key={attr.id} className={!attr.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{attr.name}</p>
                        {attr.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {attr.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeInfo(attr.attributeType).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {attr.isRequired ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {attr.isFilterable ? (
                        <Filter className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={attr.isActive}
                        onCheckedChange={() => handleToggleActive(attr)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(attr)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeletingAttribute(attr)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <FormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingAttribute ? "Edit Attribute" : "Create Attribute"}
        description={
          editingAttribute
            ? "Update the attribute definition"
            : "Define a new custom attribute for products"
        }
        form={form}
        submitLabel={editingAttribute ? "Update" : "Create"}
        cancelLabel="Cancel"
        loadingLabel="Saving..."
        submitError={submitError ?? (createMutation.error ?? updateMutation.error)?.message ?? null}
        submitDisabled={isSaving}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
            {/* Name */}
            <form.Field name="name">
              {(field) => (
                <TextField
                  field={field}
                  label="Attribute Name"
                  placeholder="e.g., Battery Capacity"
                  required
                />
              )}
            </form.Field>

            {/* Type */}
            <form.Field name="attributeType">
              {(field) => (
                <SelectField
                  field={field}
                  label="Type"
                  placeholder="Select type..."
                  disabled={!!editingAttribute}
                  description={editingAttribute ? "Type cannot be changed after creation" : undefined}
                  options={ATTRIBUTE_TYPES.map((t) => ({
                    value: t.value,
                    label: `${t.label} – ${t.description}`,
                  }))}
                  required
                />
              )}
            </form.Field>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Description (optional)"
                  placeholder="Describe what this attribute represents..."
                  rows={2}
                />
              )}
            </form.Field>

            {/* Flags */}
            <div className="grid grid-cols-3 gap-4">
              <form.Field name="isRequired">
                {(field) => (
                  <CheckboxField
                    field={field}
                    label="Required"
                  />
                )}
              </form.Field>
              <form.Field name="isFilterable">
                {(field) => (
                  <CheckboxField
                    field={field}
                    label="Filterable"
                  />
                )}
              </form.Field>
              <form.Field name="isSearchable">
                {(field) => (
                  <CheckboxField
                    field={field}
                    label="Searchable"
                  />
                )}
              </form.Field>
            </div>

            {/* Type-specific options */}
            <Collapsible open={optionsExpanded} onOpenChange={setOptionsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  Advanced Options
                  {optionsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Placeholder */}
                <form.Field name="placeholder">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Placeholder Text"
                      placeholder="e.g., Enter value..."
                    />
                  )}
                </form.Field>

                {/* Number constraints */}
                {watchType === "number" && (
                  <div className="grid grid-cols-3 gap-4">
                    <form.Field name="min">
                      {(field) => (
                        <NumberField
                          field={field}
                          label="Minimum"
                        />
                      )}
                    </form.Field>
                    <form.Field name="max">
                      {(field) => (
                        <NumberField
                          field={field}
                          label="Maximum"
                        />
                      )}
                    </form.Field>
                    <form.Field name="step">
                      {(field) => (
                        <NumberField
                          field={field}
                          label="Step"
                          step={0.01}
                        />
                      )}
                    </form.Field>
                  </div>
                )}

                {/* Choices for select/multiselect */}
                {(watchType === "select" || watchType === "multiselect") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Choices</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addChoice}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Choice
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {choices.map((_, index) => (
                        <div key={index} className="flex gap-2">
                          <form.Field name={`choices[${index}].value` as const}>
                            {(field) => (
                              <TextField
                                field={field}
                                label="Value"
                                placeholder="Value"
                              />
                            )}
                          </form.Field>
                          <form.Field name={`choices[${index}].label` as const}>
                            {(field) => (
                              <TextField
                                field={field}
                                label="Label"
                                placeholder="Label"
                              />
                            )}
                          </form.Field>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive shrink-0"
                            onClick={() => removeChoice(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {choices.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No choices defined. Add at least one choice.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAttribute} onOpenChange={() => setDeletingAttribute(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAttribute?.name}&quot;? This will also
              remove all values for this attribute from all products. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
