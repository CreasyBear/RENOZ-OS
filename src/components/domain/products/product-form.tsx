/**
 * ProductForm Component
 *
 * Comprehensive product creation/editing form with multi-section layout,
 * validation, and support for dynamic attributes.
 *
 * SPRINT-05: Migrated to TanStack Form
 */
import { useState } from "react";
import {
  Package,
  DollarSign,
  FolderTree,
  FileText,
  Tags,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useTanStackForm, type TanStackFormApi } from "@/hooks/_shared/use-tanstack-form";
import {
  TextField,
  TextareaField,
  SelectField,
  NumberField,
  SwitchField,
  FormFieldDisplayProvider,
} from "@/components/shared/forms";
import { productFormSchema, type ProductFormValues } from "./product-form-types";

export type { ProductFormValues };
import type { Category } from "@/lib/schemas/products";
import { PRODUCT_TYPE_OPTIONS, PRODUCT_STATUS_OPTIONS } from "./product-filter-config";
import type { SelectOption } from "@/components/shared/forms";
import { toast } from "sonner";

// Schema imported from types.ts to avoid duplication

// Type for passing form to section sub-components
type ProductFormApi = TanStackFormApi<ProductFormValues>;

export interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  categories?: Category[];
  onSubmit: (data: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

// Convert FilterOption to SelectOption (SelectField format)
const productTypeOptions: SelectOption[] = PRODUCT_TYPE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

const statusOptions: SelectOption[] = PRODUCT_STATUS_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

// Section component for collapsible form sections
function FormSection({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  {description && (
                    <CardDescription>{description}</CardDescription>
                  )}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Basic Info Section
function BasicInfoSection({
  form,
  categories,
}: {
  form: ProductFormApi;
  categories?: Category[];
}) {
  const categoryOptions = [
    { value: "__NONE__", label: "No Category" },
    ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []),
  ];

  return (
    <FormSection
      title="Basic Information"
      description="Core product details and identification"
      icon={Package}
    >
      <div className="grid gap-6">
        {/* SKU and Name row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="sku">
            {(field) => (
              <TextField
                field={field}
                label="SKU"
                placeholder="e.g., PROD-001"
                required
              />
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Product Name"
                placeholder="Enter product name"
                required
              />
            )}
          </form.Field>
        </div>

        {/* Type and Status row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="type">
            {(field) => (
              <SelectField
                field={field}
                label="Product Type"
                options={productTypeOptions}
              />
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <SelectField
                field={field}
                label="Status"
                options={statusOptions}
              />
            )}
          </form.Field>
        </div>

        {/* Category */}
        <form.Field name="categoryId">
          {(field) => (
            <SelectField
              field={
                {
                  ...field,
                  state: {
                    ...field.state,
                    value: field.state.value ?? "__NONE__",
                  },
                  handleChange: (v: string) => field.handleChange(v !== "__NONE__" ? v : null),
                } as Parameters<typeof SelectField>[0]["field"]
              }
              label="Category"
              options={categoryOptions}
            />
          )}
        </form.Field>

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <TextareaField
              field={field}
              label="Description"
              placeholder="Enter product description"
              rows={4}
            />
          )}
        </form.Field>
      </div>
    </FormSection>
  );
}

// Pricing Section
function PricingSection({
  form,
}: {
  form: ProductFormApi;
}) {
  return (
    <FormSection
      title="Pricing"
      description="Set base and cost prices"
      icon={DollarSign}
    >
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="basePrice">
            {(field) => (
              <NumberField
                field={field}
                label="Base Price"
                min={0}
                step={0.01}
                placeholder="0.00"
                prefix="$"
                required
              />
            )}
          </form.Field>

          <form.Field name="costPrice">
            {(field) => (
              <NumberField
                field={field}
                label="Cost Price"
                min={0}
                step={0.01}
                placeholder="0.00"
                prefix="$"
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              basePrice: state.values.basePrice,
              costPrice: state.values.costPrice,
            })}
          >
            {({ basePrice, costPrice }) => {
              const margin = costPrice && basePrice > 0
                ? ((basePrice - costPrice) / basePrice * 100).toFixed(1)
                : null;

              return (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Margin</label>
                  <div className="h-10 flex items-center">
                    {margin !== null ? (
                      <Badge variant={Number(margin) > 0 ? "default" : "destructive"}>
                        {margin}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              );
            }}
          </form.Subscribe>
        </div>
      </div>
    </FormSection>
  );
}

// Settings Section
function SettingsSection({
  form,
}: {
  form: ProductFormApi;
}) {
  return (
    <FormSection
      title="Settings"
      description="Inventory and product settings"
      icon={FolderTree}
    >
      <div className="grid gap-6">
        {/* Flags */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Sellable</label>
              <p className="text-sm text-muted-foreground">
                Available for sale to customers
              </p>
            </div>
            <form.Field name="isSellable">
              {(field) => (
                <SwitchField field={field} label="" />
              )}
            </form.Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Purchasable</label>
              <p className="text-sm text-muted-foreground">
                Available to purchase from suppliers
              </p>
            </div>
            <form.Field name="isPurchasable">
              {(field) => (
                <SwitchField field={field} label="" />
              )}
            </form.Field>
          </div>
        </div>

        {/* Track Inventory and Serialized - always visible so they can be changed */}
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Track Inventory</label>
              <p className="text-sm text-muted-foreground">
                Monitor stock levels
              </p>
            </div>
            <form.Field name="trackInventory">
              {(field) => (
                <SwitchField field={field} label="" />
              )}
            </form.Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Serialized</label>
              <p className="text-sm text-muted-foreground">
                Track individual units by serial number
              </p>
            </div>
            <form.Field name="isSerialized">
              {(field) => (
                <SwitchField field={field} label="" />
              )}
            </form.Field>
          </div>
        </div>

        {/* Reorder point/qty - only for physical/bundle */}
        <form.Subscribe selector={(state) => state.values.type}>
          {(productType) => {
            const showReorder = productType === "physical" || productType === "bundle";
            if (!showReorder) return null;

            return (
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="reorderPoint">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Reorder Point"
                      min={0}
                      placeholder="0"
                      description="Alert when stock falls below this level"
                    />
                  )}
                </form.Field>

                <form.Field name="reorderQty">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Reorder Quantity"
                      min={0}
                      placeholder="0"
                      description="Suggested quantity when reordering"
                    />
                  )}
                </form.Field>
              </div>
            );
          }}
        </form.Subscribe>
      </div>
    </FormSection>
  );
}

// Specifications Section
function SpecificationsSection({
  form,
}: {
  form: ProductFormApi;
}) {
  return (
    <FormSection
      title="Specifications"
      description="Physical attributes and details"
      icon={FileText}
      defaultOpen={false}
    >
      <div className="grid gap-6">
        {/* Barcode */}
        <form.Field name="barcode">
          {(field) => (
            <TextField
              field={field}
              label="Barcode / UPC"
              placeholder="Enter barcode"
            />
          )}
        </form.Field>

        {/* Physical dimensions - conditional on product type */}
        <form.Subscribe selector={(state) => state.values.type}>
          {(productType) => {
            const showPhysical = productType === "physical" || productType === "bundle";
            if (!showPhysical) return null;

            return (
              <>
                <form.Field name="weight">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Weight (kg)"
                      min={0}
                      step={0.001}
                      placeholder="0.000"
                    />
                  )}
                </form.Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <form.Field name="dimensions.length">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Length (cm)"
                        min={0}
                        step={0.1}
                        placeholder="0"
                      />
                    )}
                  </form.Field>

                  <form.Field name="dimensions.width">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Width (cm)"
                        min={0}
                        step={0.1}
                        placeholder="0"
                      />
                    )}
                  </form.Field>

                  <form.Field name="dimensions.height">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Height (cm)"
                        min={0}
                        step={0.1}
                        placeholder="0"
                      />
                    )}
                  </form.Field>
                </div>
              </>
            );
          }}
        </form.Subscribe>
      </div>
    </FormSection>
  );
}

// SEO Section
function SEOSection({
  form,
}: {
  form: ProductFormApi;
}) {
  return (
    <FormSection
      title="SEO & Tags"
      description="Search engine optimization and categorization"
      icon={Tags}
      defaultOpen={false}
    >
      <div className="grid gap-6">
        <form.Field name="seoTitle">
          {(field) => (
            <TextField
              field={field}
              label="SEO Title"
              placeholder="Page title for search engines"
              description="Recommended: 50-60 characters"
            />
          )}
        </form.Field>

        <form.Field name="seoDescription">
          {(field) => (
            <TextareaField
              field={field}
              label="SEO Description"
              placeholder="Brief description for search results"
              rows={3}
              description="Recommended: 150-160 characters"
            />
          )}
        </form.Field>

        {/* Tags - simplified for now */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <p className="text-sm text-muted-foreground">
            Tag management will be available after saving
          </p>
        </div>
      </div>
    </FormSection>
  );
}

// Main Form Component
export function ProductForm({
  defaultValues,
  categories,
  onSubmit,
  onCancel,
  isEdit = false,
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useTanStackForm({
    schema: productFormSchema,
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      type: "physical" as const,
      status: "active" as const,
      categoryId: null,
      basePrice: 0,
      costPrice: null,
      trackInventory: true,
      isSerialized: false,
      isSellable: true,
      isPurchasable: true,
      weight: null,
      dimensions: { length: undefined, width: undefined, height: undefined },
      seoTitle: null,
      seoDescription: null,
      barcode: null,
      tags: [],
      specifications: null,
      reorderPoint: 0,
      reorderQty: 0,
      warrantyPolicyId: null,
      ...defaultValues,
    },
    onSubmit: async (data) => {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
      } finally {
        setIsSubmitting(false);
      }
    },
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <FormFieldDisplayProvider form={form}>
      <BasicInfoSection form={form} categories={categories} />
      <PricingSection form={form} />
      <SettingsSection form={form} />
      <SpecificationsSection form={form} />
      <SEOSection form={form} />

      {/* Form actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <form.Subscribe selector={(state) => state.isDirty}>
          {(isDirty) =>
            isDirty ? (
              <p className="text-sm text-muted-foreground">
                You have unsaved changes
              </p>
            ) : (
              <div />
            )
          }
        </form.Subscribe>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </div>
      </FormFieldDisplayProvider>
    </form>
  );
}
