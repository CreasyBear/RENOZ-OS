/**
 * TemplateEditor Component
 *
 * Form for creating and editing order templates.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-TEMPLATES-UI)
 */

import { memo, useState, useCallback } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import {
  Plus,
  Trash2,
  GripVertical,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormFieldDisplayProvider,
  FormErrorSummary,
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  SwitchField,
} from "@/components/shared/forms";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrgFormat } from "@/hooks/use-org-format";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/products";

// ============================================================================
// TYPES
// ============================================================================

const templateItemSchema = z.object({
  id: z.string().optional(), // For existing items
  lineNumber: z.string().max(10),
  sortOrder: z.string().max(10).default("0"),
  productId: z.string().uuid().optional(),
  sku: z.string().max(50).optional(),
  description: z.string().min(1, "Description is required").max(500),
  defaultQuantity: z.number().int().min(1).default(1),
  fixedUnitPrice: z.number().int().min(0).optional(),
  useCurrentPrice: z.boolean().default(true),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().int().min(0).optional(),
  taxType: z.enum(["gst", "gst_free", "input_taxed"]).default("gst"),
  notes: z.string().max(500).optional(),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().default(false),
  defaultCustomerId: z.string().uuid().optional().nullable(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().int().min(0).optional(),
  shippingAmount: z.number().int().min(0).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  internalNotes: z.string().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
  items: z.array(templateItemSchema).min(1, "At least one item is required"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export interface TemplateEditorProps {
  initialData?: Partial<TemplateFormData>;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitError?: string | null;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TemplateEditor = memo(function TemplateEditor({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  submitError,
  className,
}: TemplateEditorProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const defaultItems = [
    {
      lineNumber: "1",
      sortOrder: "0",
      description: "",
      defaultQuantity: 1,
      useCurrentPrice: true,
      taxType: "gst" as const,
    },
  ];

  const form = useTanStackForm<TemplateFormData>({
    schema: templateFormSchema,
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      isGlobal: false,
      defaultCustomerId: null,
      category: "",
      tags: [],
      discountPercent: undefined,
      discountAmount: undefined,
      shippingAmount: undefined,
      paymentTermsDays: undefined,
      internalNotes: "",
      customerNotes: "",
      items: defaultItems,
      ...initialData,
    },
    onSubmit: async (data) => {
      await onSubmit(data);
    },
    onSubmitInvalid: () => {},
  });

  const items = form.useWatch("items") ?? defaultItems;

  const addItem = useCallback(() => {
    const nextLineNumber = (items.length + 1).toString();
    form.setFieldValue("items", [
      ...items,
      {
        lineNumber: nextLineNumber,
        sortOrder: nextLineNumber,
        description: "",
        defaultQuantity: 1,
        useCurrentPrice: true,
        taxType: "gst" as const,
      },
    ]);
  }, [items, form]);

  const removeItem = useCallback(
    (index: number) => {
      form.setFieldValue(
        "items",
        items.filter((_, i) => i !== index)
      );
    },
    [items, form]
  );

  const selectProduct = useCallback(
    (index: number, product: { id: string; sku: string | null; name: string; basePrice: number }) => {
      const updated = [...items];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          productId: product.id,
          sku: product.sku || "",
          description: product.name,
          fixedUnitPrice: product.basePrice,
        };
        form.setFieldValue("items", updated);
      }
      setProductSearchOpen(null);
      setProductSearch("");
    },
    [items, form]
  );

  // Product search query using hook
  const { data: productsData, isLoading: productsLoading } = useProducts({
    search: productSearch || undefined,
    isActive: true,
    page: 1,
    pageSize: 20,
    enabled: productSearchOpen !== null,
  });

  const products = productsData?.products ?? [];

  return (
    <FormFieldDisplayProvider form={form}>
      <FormErrorSummary form={form} submitError={submitError} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className={cn("space-y-6", className)}
      >
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Basic information about this template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="name">
                {(field) => (
                  <TextField
                    field={field}
                    label="Name"
                    placeholder="Template name"
                    required
                  />
                )}
              </form.Field>
              <form.Field name="category">
                {(field) => (
                  <TextField
                    field={field}
                    label="Category"
                    placeholder="e.g., Residential, Commercial"
                  />
                )}
              </form.Field>
            </div>

            <form.Field name="description">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Description"
                  placeholder="Brief description of when to use this template"
                />
              )}
            </form.Field>

            <div className="flex items-center gap-6">
              <form.Field name="isActive">
                {(field) => (
                  <div className="rounded-lg border p-3">
                    <SwitchField field={field} label="Active" />
                  </div>
                )}
              </form.Field>
              <form.Field name="isGlobal">
                {(field) => (
                  <div className="rounded-lg border p-3">
                    <SwitchField
                      field={field}
                      label="Global (all organizations)"
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </CardContent>
        </Card>

        {/* Template Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Template Items</CardTitle>
                <CardDescription>
                  Products and services included in this template
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No items added yet</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            ) : (
              items.map((_, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {/* Drag handle placeholder */}
                      <div className="pt-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Product Selection */}
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">
                              Product / Description *
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Popover
                                open={productSearchOpen === index}
                                onOpenChange={(open) =>
                                  setProductSearchOpen(open ? index : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-[350px] p-0"
                                  align="start"
                                >
                                  <div className="p-3 border-b">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Search products..."
                                        value={productSearch}
                                        onChange={(e) =>
                                          setProductSearch(e.target.value)
                                        }
                                        className="pl-10"
                                      />
                                    </div>
                                  </div>
                                  <ScrollArea className="h-[200px]">
                                    {productsLoading ? (
                                      <div className="p-3 space-y-2">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                          <Skeleton key={i} className="h-10" />
                                        ))}
                                      </div>
                                    ) : products.length === 0 ? (
                                      <div className="p-6 text-center text-sm text-muted-foreground">
                                        No products found
                                      </div>
                                    ) : (
                                      <div className="p-1">
                                        {products.map((product) => (
                                          <button
                                            key={product.id}
                                            type="button"
                                            onClick={() =>
                                              selectProduct(index, product)
                                            }
                                            className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50"
                                          >
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm">
                                                <TruncateTooltip text={product.name} maxLength={30} />
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {product.sku} • {formatCurrencyDisplay(product.basePrice ?? 0)}
                                              </p>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </ScrollArea>
                                </PopoverContent>
                              </Popover>
                              <form.Field name={`items[${index}].description` as const}>
                                {(field) => (
                                  <TextField
                                    field={field}
                                    label="Description"
                                    placeholder="Product or service description"
                                    required
                                    className="flex-1"
                                    hideLabel
                                  />
                                )}
                              </form.Field>
                            </div>
                          </div>

                          <form.Field name={`items[${index}].defaultQuantity` as const}>
                            {(field) => (
                              <NumberField
                                field={field}
                                label="Qty"
                                min={1}
                                className="w-20"
                              />
                            )}
                          </form.Field>
                        </div>

                        {/* Pricing Options */}
                        <div className="flex flex-wrap items-end gap-4">
                          <form.Field name={`items[${index}].useCurrentPrice` as const}>
                            {(field) => (
                              <SwitchField
                                field={field}
                                label="Use current price"
                              />
                            )}
                          </form.Field>

                          {(() => {
                            const useCurrent = items[index]?.useCurrentPrice ?? true;
                            return !useCurrent ? (
                              <form.Field name={`items[${index}].fixedUnitPrice` as const}>
                                {(field) => (
                                  <NumberField
                                    field={field}
                                    label="Fixed Price"
                                    min={0}
                                    step={0.01}
                                    prefix="$"
                                    placeholder="0.00"
                                    className="w-32"
                                  />
                                )}
                              </form.Field>
                            ) : null;
                          })()}

                          <form.Field name={`items[${index}].taxType` as const}>
                            {(field) => (
                              <SelectField
                                field={field}
                                label="Tax"
                                options={[
                                  { value: "gst", label: "GST" },
                                  { value: "gst_free", label: "GST Free" },
                                  { value: "input_taxed", label: "Input Taxed" },
                                ]}
                                className="w-28"
                              />
                            )}
                          </form.Field>

                          <form.Field name={`items[${index}].sku` as const}>
                            {(field) =>
                              field.state.value ? (
                                <Badge variant="secondary" className="text-xs">
                                  SKU: {field.state.value}
                                </Badge>
                              ) : null
                            }
                          </form.Field>
                        </div>
                      </div>

                      {/* Delete button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 hover:bg-transparent"
                  type="button"
                >
                  <div className="text-left">
                    <CardTitle>Default Values</CardTitle>
                    <CardDescription>
                      Optional defaults applied when using this template
                    </CardDescription>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <form.Field name="discountPercent">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Discount %"
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="0"
                      />
                    )}
                  </form.Field>

                  <form.Field name="discountAmount">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Discount $"
                        min={0}
                        step={0.01}
                        prefix="$"
                        placeholder="0.00"
                      />
                    )}
                  </form.Field>

                  <form.Field name="shippingAmount">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Shipping"
                        min={0}
                        step={0.01}
                        prefix="$"
                        placeholder="0.00"
                      />
                    )}
                  </form.Field>

                  <form.Field name="paymentTermsDays">
                    {(field) => (
                      <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select
                          value={field.state.value?.toString() ?? "__NONE__"}
                          onValueChange={(v) =>
                            field.handleChange(
                              v === "__NONE__" ? undefined : parseInt(v, 10)
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__NONE__">None</SelectItem>
                            <SelectItem value="0">Due on Receipt</SelectItem>
                            <SelectItem value="7">Net 7</SelectItem>
                            <SelectItem value="14">Net 14</SelectItem>
                            <SelectItem value="30">Net 30</SelectItem>
                            <SelectItem value="60">Net 60</SelectItem>
                            <SelectItem value="90">Net 90</SelectItem>
                          </SelectContent>
                        </Select>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="internalNotes">
                    {(field) => (
                      <TextareaField
                        field={field}
                        label="Internal Notes"
                        placeholder="Notes for staff (not visible to customer)"
                        description="These notes will be copied to orders created from this template."
                      />
                    )}
                  </form.Field>

                  <form.Field name="customerNotes">
                    {(field) => (
                      <TextareaField
                        field={field}
                        label="Customer Notes"
                        placeholder="Notes visible to customer"
                        description="Shown on invoices and order confirmations."
                      />
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initialData ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </form>
    </FormFieldDisplayProvider>
  );
});

export default TemplateEditor;
