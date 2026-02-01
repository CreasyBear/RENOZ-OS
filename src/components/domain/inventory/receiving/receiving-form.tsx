/**
 * Receiving Form Component
 *
 * Form for receiving inventory with cost tracking and lot/serial support.
 *
 * Features:
 * - Product/location selector
 * - Quantity and unit cost input
 * - Lot/batch/serial tracking
 * - Reference linking (PO, supplier)
 *
 * Accessibility:
 * - Form validation with clear error messages
 * - Numeric inputs with proper constraints
 */
import { memo, useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  MapPin,
  DollarSign,
  Hash,
  FileText,
  Loader2,
  Check,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgFormat } from "@/hooks/use-org-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// TYPES
// ============================================================================

const receivingFormSchema = z.object({
  productId: z.string().uuid("Product is required"),
  locationId: z.string().uuid("Location is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().min(0, "Cost must be zero or positive"),
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

type ReceivingFormValues = z.infer<typeof receivingFormSchema>;

interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice?: number | null;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface ReceivingFormProps {
  products: Product[];
  locations: Location[];
  isLoadingProducts?: boolean;
  isLoadingLocations?: boolean;
  onSubmit: (data: ReceivingFormValues) => Promise<void>;
  onProductSearch?: (query: string) => void;
  defaultLocationId?: string;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ReceivingForm = memo(function ReceivingForm({
  products,
  locations,
  isLoadingProducts,
  isLoadingLocations,
  onSubmit,
  onProductSearch,
  defaultLocationId,
  className,
}: ReceivingFormProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(receivingFormSchema) as any,
    defaultValues: {
      productId: "",
      locationId: defaultLocationId ?? "",
      quantity: 1,
      unitCost: 0,
      serialNumber: "",
      batchNumber: "",
      lotNumber: "",
      expiryDate: "",
      referenceType: "",
      referenceId: "",
      notes: "",
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Auto-fill cost from product when selected
  useEffect(() => {
    if (selectedProduct?.costPrice) {
      form.setValue("unitCost", selectedProduct.costPrice);
    }
  }, [selectedProduct, form]);

  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        setIsSubmitting(true);
        await onSubmit(values);
        form.reset();
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, form]
  );

  const quantity = form.watch("quantity") || 0;
  const unitCost = form.watch("unitCost") || 0;
  const totalValue = quantity * unitCost;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Receive Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Product Selection */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product</FormLabel>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" aria-hidden="true" />
                              <span>{selectedProduct?.name}</span>
                              <span className="text-muted-foreground font-mono text-xs">
                                {selectedProduct?.sku}
                              </span>
                            </div>
                          ) : (
                            <span>Select product...</span>
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search products..."
                          onValueChange={onProductSearch}
                        />
                        <CommandList>
                          {isLoadingProducts ? (
                            <div className="py-6 text-center text-sm">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>No products found</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.sku}`}
                                    onSelect={() => {
                                      field.onChange(product.id);
                                      setProductOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === product.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{product.name}</span>
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {product.sku}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Selection */}
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingLocations}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            <span>{location.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({location.code})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-9 tabular-nums"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Value Display */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrencyDisplay(totalValue)}
                </span>
              </div>
            </div>

            {/* Tracking Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" aria-hidden="true" />
                Tracking Information (Optional)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lotNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot Number</FormLabel>
                      <FormControl>
                        <Input placeholder="LOT-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="BATCH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="SN-12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Reference Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Reference (Optional)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="purchase_order">
                            Purchase Order
                          </SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="return">Return</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference ID</FormLabel>
                      <FormControl>
                        <Input placeholder="PO-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this receipt..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Receiving...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                  Receive Inventory
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});

export default ReceivingForm;
