/**
 * TemplateEditor Component
 *
 * Form for creating and editing order templates.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-TEMPLATES-UI)
 */

import { memo, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/server/functions/products";

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
  className,
}: TemplateEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const form = useForm<TemplateFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(templateFormSchema) as any,
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
      items: [
        {
          lineNumber: "1",
          sortOrder: "0",
          description: "",
          defaultQuantity: 1,
          useCurrentPrice: true,
          taxType: "gst",
        },
      ],
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Product search query
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "template-editor", productSearch],
    queryFn: () =>
      listProducts({
        data: {
          search: productSearch || undefined,
          isActive: true,
          page: 1,
          pageSize: 20,
        },
      }),
    enabled: productSearchOpen !== null,
  });

  const products = productsData?.products ?? [];

  const handleSubmit = useCallback(
    async (data: TemplateFormData) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  const addItem = useCallback(() => {
    const nextLineNumber = (fields.length + 1).toString();
    append({
      lineNumber: nextLineNumber,
      sortOrder: nextLineNumber,
      description: "",
      defaultQuantity: 1,
      useCurrentPrice: true,
      taxType: "gst",
    });
  }, [fields.length, append]);

  const selectProduct = useCallback(
    (index: number, product: { id: string; sku: string | null; name: string; basePrice: number }) => {
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.sku`, product.sku || "");
      form.setValue(`items.${index}.description`, product.name);
      form.setValue(`items.${index}.fixedUnitPrice`, product.basePrice);
      setProductSearchOpen(null);
      setProductSearch("");
    },
    [form]
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Template name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Residential, Commercial"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of when to use this template"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isGlobal"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">
                      Global (all organizations)
                    </FormLabel>
                  </FormItem>
                )}
              />
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
            {fields.length === 0 ? (
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
              fields.map((field, index) => (
                <Card key={field.id} className="relative">
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
                                                {product.sku} • $
                                                {(product.basePrice / 100).toFixed(
                                                  2
                                                )}
                                              </p>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </ScrollArea>
                                </PopoverContent>
                              </Popover>
                              <Input
                                {...form.register(`items.${index}.description`)}
                                placeholder="Product or service description"
                                className="flex-1"
                              />
                            </div>
                            {form.formState.errors.items?.[index]?.description && (
                              <p className="text-xs text-destructive mt-1">
                                {form.formState.errors.items[index]?.description?.message}
                              </p>
                            )}
                          </div>

                          <div className="w-20">
                            <Label className="text-xs text-muted-foreground">
                              Qty
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              {...form.register(`items.${index}.defaultQuantity`, {
                                valueAsNumber: true,
                              })}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Pricing Options */}
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={form.watch(`items.${index}.useCurrentPrice`)}
                              onCheckedChange={(checked) =>
                                form.setValue(`items.${index}.useCurrentPrice`, checked)
                              }
                            />
                            <Label className="text-sm">Use current price</Label>
                          </div>

                          {!form.watch(`items.${index}.useCurrentPrice`) && (
                            <div className="w-32">
                              <Label className="text-xs text-muted-foreground">
                                Fixed Price
                              </Label>
                              <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  {...form.register(`items.${index}.fixedUnitPrice`, {
                                    setValueAs: (v) =>
                                      v === "" ? undefined : Math.round(parseFloat(v) * 100),
                                  })}
                                  className="pl-7"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          )}

                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">
                              Tax
                            </Label>
                            <Select
                              value={form.watch(`items.${index}.taxType`)}
                              onValueChange={(value) =>
                                form.setValue(
                                  `items.${index}.taxType`,
                                  value as "gst" | "gst_free" | "input_taxed"
                                )
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gst">GST</SelectItem>
                                <SelectItem value="gst_free">GST Free</SelectItem>
                                <SelectItem value="input_taxed">
                                  Input Taxed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {form.watch(`items.${index}.sku`) && (
                            <Badge variant="secondary" className="text-xs">
                              SKU: {form.watch(`items.${index}.sku`)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
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
                  <FormField
                    control={form.control}
                    name="discountPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : parseFloat(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount $</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7"
                              value={
                                field.value !== undefined
                                  ? (field.value / 100).toFixed(2)
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Math.round(parseFloat(e.target.value) * 100)
                                )
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7"
                              value={
                                field.value !== undefined
                                  ? (field.value / 100).toFixed(2)
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Math.round(parseFloat(e.target.value) * 100)
                                )
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTermsDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() ?? ""}
                            onValueChange={(v) =>
                              field.onChange(v === "" ? undefined : parseInt(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              <SelectItem value="0">Due on Receipt</SelectItem>
                              <SelectItem value="7">Net 7</SelectItem>
                              <SelectItem value="14">Net 14</SelectItem>
                              <SelectItem value="30">Net 30</SelectItem>
                              <SelectItem value="60">Net 60</SelectItem>
                              <SelectItem value="90">Net 90</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes for staff (not visible to customer)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          These notes will be copied to orders created from this
                          template.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes visible to customer"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Shown on invoices and order confirmations.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
    </Form>
  );
});

export default TemplateEditor;
