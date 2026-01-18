/**
 * AttributeDefinitions Component
 *
 * Manage product attribute definitions (admin interface).
 * Create, edit, and delete attribute schemas.
 */
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from "@/lib/server/functions/product-attributes";

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
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<AttributeDefinition | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<AttributeDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeFormSchema) as never,
    defaultValues: {
      name: "",
      attributeType: "text",
      description: "",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      sortOrder: 0,
      choices: [],
    },
  });

  const { fields: choiceFields, append: addChoice, remove: removeChoice } = useFieldArray({
    control,
    name: "choices",
  });

  const watchType = watch("attributeType");

  // Load attributes
  const loadAttributes = async () => {
    setIsLoading(true);
    try {
      const result = await listAttributes({ data: { activeOnly: false } });
      setAttributes(result as AttributeDefinition[]);
    } catch (error) {
      console.error("Failed to load attributes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  // Open form for new attribute
  const handleNew = () => {
    setEditingAttribute(null);
    reset({
      name: "",
      attributeType: "text",
      description: "",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      sortOrder: attributes.length,
      choices: [],
    });
    setOptionsExpanded(false);
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleEdit = (attr: AttributeDefinition) => {
    setEditingAttribute(attr);
    reset({
      name: attr.name,
      attributeType: attr.attributeType as AttributeType,
      description: attr.description ?? "",
      isRequired: attr.isRequired,
      isFilterable: attr.isFilterable,
      isSearchable: attr.isSearchable,
      sortOrder: attr.sortOrder,
      placeholder: attr.options?.placeholder,
      min: attr.options?.min,
      max: attr.options?.max,
      step: attr.options?.step,
      choices: attr.options?.choices ?? [],
    });
    setOptionsExpanded(true);
    setIsFormOpen(true);
  };

  // Submit form
  const onSubmit = async (data: AttributeFormValues) => {
    setIsSaving(true);
    try {
      // Build options object
      const options: AttributeDefinition["options"] = {};
      if (data.placeholder) options.placeholder = data.placeholder;
      if (data.min !== undefined) options.min = data.min;
      if (data.max !== undefined) options.max = data.max;
      if (data.step !== undefined) options.step = data.step;
      if (data.choices && data.choices.length > 0) {
        options.choices = data.choices.map((c, i) => ({ ...c, sortOrder: i }));
      }

      if (editingAttribute) {
        // Update existing
        await updateAttribute({
          data: {
            id: editingAttribute.id,
            name: data.name,
            description: data.description,
            options: Object.keys(options).length > 0 ? options : undefined,
            isRequired: data.isRequired,
            isFilterable: data.isFilterable,
            isSearchable: data.isSearchable,
            sortOrder: data.sortOrder,
          },
        });
      } else {
        // Create new
        await createAttribute({
          data: {
            name: data.name,
            attributeType: data.attributeType,
            description: data.description,
            options: Object.keys(options).length > 0 ? options : undefined,
            isRequired: data.isRequired,
            isFilterable: data.isFilterable,
            isSearchable: data.isSearchable,
            sortOrder: data.sortOrder,
          },
        });
      }

      await loadAttributes();
      setIsFormOpen(false);
      onAttributesChange?.();
    } catch (error) {
      console.error("Failed to save attribute:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete attribute
  const handleDelete = async () => {
    if (!deletingAttribute) return;

    setIsDeleting(true);
    try {
      await deleteAttribute({ data: { id: deletingAttribute.id } });
      await loadAttributes();
      setDeletingAttribute(null);
      onAttributesChange?.();
    } catch (error) {
      console.error("Failed to delete attribute:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle attribute active status
  const handleToggleActive = async (attr: AttributeDefinition) => {
    try {
      await updateAttribute({
        data: {
          id: attr.id,
          isActive: !attr.isActive,
        },
      });
      await loadAttributes();
      onAttributesChange?.();
    } catch (error) {
      console.error("Failed to toggle attribute:", error);
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
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? "Edit Attribute" : "Create Attribute"}
            </DialogTitle>
            <DialogDescription>
              {editingAttribute
                ? "Update the attribute definition"
                : "Define a new custom attribute for products"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Attribute Name</Label>
              <Input
                id="name"
                placeholder="e.g., Battery Capacity"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="attributeType">Type</Label>
              <Select
                value={watchType}
                onValueChange={(val) => setValue("attributeType", val as AttributeType)}
                disabled={!!editingAttribute}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {ATTRIBUTE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span>{type.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingAttribute && (
                <p className="text-xs text-muted-foreground">
                  Type cannot be changed after creation
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this attribute represents..."
                rows={2}
                {...register("description")}
              />
            </div>

            {/* Flags */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isRequired"
                  {...register("isRequired")}
                />
                <Label htmlFor="isRequired" className="text-sm cursor-pointer">
                  Required
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isFilterable"
                  {...register("isFilterable")}
                />
                <Label htmlFor="isFilterable" className="text-sm cursor-pointer">
                  Filterable
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isSearchable"
                  {...register("isSearchable")}
                />
                <Label htmlFor="isSearchable" className="text-sm cursor-pointer">
                  Searchable
                </Label>
              </div>
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
                <div className="space-y-2">
                  <Label htmlFor="placeholder">Placeholder Text</Label>
                  <Input
                    id="placeholder"
                    placeholder="e.g., Enter value..."
                    {...register("placeholder")}
                  />
                </div>

                {/* Number constraints */}
                {watchType === "number" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min">Minimum</Label>
                      <Input
                        id="min"
                        type="number"
                        {...register("min", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max">Maximum</Label>
                      <Input
                        id="max"
                        type="number"
                        {...register("max", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="step">Step</Label>
                      <Input
                        id="step"
                        type="number"
                        step="any"
                        {...register("step", { valueAsNumber: true })}
                      />
                    </div>
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
                        onClick={() => addChoice({ value: "", label: "" })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Choice
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {choiceFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input
                            placeholder="Value"
                            {...register(`choices.${index}.value` as const)}
                          />
                          <Input
                            placeholder="Label"
                            {...register(`choices.${index}.label` as const)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive"
                            onClick={() => removeChoice(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {choiceFields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No choices defined. Add at least one choice.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingAttribute ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAttribute} onOpenChange={() => setDeletingAttribute(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAttribute?.name}"? This will also
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
