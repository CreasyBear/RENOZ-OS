/**
 * ProductForm Component
 *
 * Comprehensive product creation/editing form with multi-section layout,
 * validation, and support for dynamic attributes.
 */
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Control, FieldErrors, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Form validation schema
const productFormSchema = z.object({
  // Basic info
  sku: z.string().min(1, "SKU is required").max(100),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  type: z.enum(["physical", "service", "digital", "bundle"]).default("physical"),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  categoryId: z.string().uuid().optional().nullable(),

  // Pricing
  basePrice: z.coerce.number().min(0, "Price must be positive"),
  costPrice: z.coerce.number().min(0).optional().nullable(),

  // Settings
  trackInventory: z.boolean().default(true),
  isSerialized: z.boolean().default(false),
  isSellable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),

  // Physical attributes
  weight: z.coerce.number().min(0).optional().nullable(),
  dimensions: z.object({
    length: z.coerce.number().min(0).optional(),
    width: z.coerce.number().min(0).optional(),
    height: z.coerce.number().min(0).optional(),
  }).optional().nullable(),

  // SEO
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),

  // Other
  barcode: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.unknown()).optional().nullable(),

  // Inventory settings
  reorderPoint: z.coerce.number().min(0).default(0),
  reorderQty: z.coerce.number().min(0).default(0),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  categories?: Category[];
  onSubmit: (data: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

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
  control,
  errors,
  categories,
}: {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  categories?: Category[];
}) {
  return (
    <FormSection
      title="Basic Information"
      description="Core product details and identification"
      icon={Package}
    >
      <div className="grid gap-6">
        {/* SKU and Name row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sku">
              SKU <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="sku"
              control={control}
              render={({ field }) => (
                <Input
                  id="sku"
                  placeholder="e.g., PROD-001"
                  {...field}
                  className={errors.sku ? "border-destructive" : ""}
                />
              )}
            />
            {errors.sku && (
              <p className="text-sm text-destructive">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="name"
                  placeholder="Enter product name"
                  {...field}
                  className={errors.name ? "border-destructive" : ""}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
        </div>

        {/* Type and Status row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Product Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "__NONE__"}
                onValueChange={(v) => field.onChange(v !== "__NONE__" ? v : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">No Category</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                id="description"
                placeholder="Enter product description"
                rows={4}
                {...field}
              />
            )}
          />
        </div>
      </div>
    </FormSection>
  );
}

// Pricing Section
function PricingSection({
  control,
  errors,
  watch,
}: {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}) {
  const basePrice = watch("basePrice");
  const costPrice = watch("costPrice");
  const margin = costPrice && basePrice > 0
    ? ((basePrice - costPrice) / basePrice * 100).toFixed(1)
    : null;

  return (
    <FormSection
      title="Pricing"
      description="Set base and cost prices"
      icon={DollarSign}
    >
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="basePrice">
              Base Price <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Controller
                name="basePrice"
                control={control}
                render={({ field }) => (
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`pl-7 ${errors.basePrice ? "border-destructive" : ""}`}
                    {...field}
                  />
                )}
              />
            </div>
            {errors.basePrice && (
              <p className="text-sm text-destructive">{errors.basePrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Controller
                name="costPrice"
                control={control}
                render={({ field }) => (
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Margin</Label>
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
        </div>
      </div>
    </FormSection>
  );
}

// Settings Section
function SettingsSection({
  control,
  watch,
}: {
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}) {
  const productType = watch("type");
  const showInventorySettings = productType === "physical" || productType === "bundle";

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
              <Label>Sellable</Label>
              <p className="text-sm text-muted-foreground">
                Available for sale to customers
              </p>
            </div>
            <Controller
              name="isSellable"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Purchasable</Label>
              <p className="text-sm text-muted-foreground">
                Available to purchase from suppliers
              </p>
            </div>
            <Controller
              name="isPurchasable"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>

        {/* Inventory settings */}
        {showInventorySettings && (
          <>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Track Inventory</Label>
                  <p className="text-sm text-muted-foreground">
                    Monitor stock levels
                  </p>
                </div>
                <Controller
                  name="trackInventory"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Serialized</Label>
                  <p className="text-sm text-muted-foreground">
                    Track individual units by serial number
                  </p>
                </div>
                <Controller
                  name="isSerialized"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Controller
                  name="reorderPoint"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="reorderPoint"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Quantity</Label>
                <Controller
                  name="reorderQty"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="reorderQty"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Suggested quantity when reordering
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </FormSection>
  );
}

// Specifications Section
function SpecificationsSection({
  control,
  watch,
}: {
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}) {
  const productType = watch("type");
  const showPhysical = productType === "physical" || productType === "bundle";

  return (
    <FormSection
      title="Specifications"
      description="Physical attributes and details"
      icon={FileText}
      defaultOpen={false}
    >
      <div className="grid gap-6">
        {/* Barcode */}
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode / UPC</Label>
          <Controller
            name="barcode"
            control={control}
            render={({ field }) => (
              <Input
                id="barcode"
                placeholder="Enter barcode"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>

        {/* Physical dimensions */}
        {showPhysical && (
          <>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <Input
                    id="weight"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Length (cm)</Label>
                <Controller
                  name="dimensions.length"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Width (cm)</Label>
                <Controller
                  name="dimensions.width"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Controller
                  name="dimensions.height"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  )}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </FormSection>
  );
}

// SEO Section
function SEOSection({
  control,
}: {
  control: Control<ProductFormValues>;
}) {
  return (
    <FormSection
      title="SEO & Tags"
      description="Search engine optimization and categorization"
      icon={Tags}
      defaultOpen={false}
    >
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="seoTitle">SEO Title</Label>
          <Controller
            name="seoTitle"
            control={control}
            render={({ field }) => (
              <Input
                id="seoTitle"
                placeholder="Page title for search engines"
                maxLength={255}
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 50-60 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seoDescription">SEO Description</Label>
          <Controller
            name="seoDescription"
            control={control}
            render={({ field }) => (
              <Textarea
                id="seoDescription"
                placeholder="Brief description for search results"
                rows={3}
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 150-160 characters
          </p>
        </div>

        {/* Tags - simplified for now */}
        <div className="space-y-2">
          <Label>Tags</Label>
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

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      type: "physical",
      status: "active",
      categoryId: null,
      basePrice: 0,
      costPrice: null,
      trackInventory: true,
      isSerialized: false,
      isSellable: true,
      isPurchasable: true,
      weight: null,
      dimensions: null,
      seoTitle: null,
      seoDescription: null,
      barcode: null,
      tags: [],
      specifications: null,
      reorderPoint: 0,
      reorderQty: 0,
      ...defaultValues,
    },
  });

  const onFormSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <BasicInfoSection control={control} errors={errors} categories={categories} />
      <PricingSection control={control} errors={errors} watch={watch} />
      <SettingsSection control={control} watch={watch} />
      <SpecificationsSection control={control} watch={watch} />
      <SEOSection control={control} />

      {/* Form actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {isDirty && (
            <p className="text-sm text-muted-foreground">
              You have unsaved changes
            </p>
          )}
        </div>
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
    </form>
  );
}
