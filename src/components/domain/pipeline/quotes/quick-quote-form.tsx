/**
 * QuickQuoteForm Presenter
 *
 * Streamlined quote creation form for rapid quoting.
 * Allows creating quotes with minimal input - customer, products, and basic details.
 *
 * Uses TanStack Form with Zod validation.
 *
 * @see ./quick-quote-form-container.tsx (container)
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUICK-QUOTE-UI)
 */

import { memo, useState, useCallback, useMemo, useEffect } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { FormFieldDisplayProvider } from "@/components/shared/forms";
import { quickQuoteFormSchema, type QuickQuoteFormValues, type QuickQuoteLineItem } from "@/lib/schemas/pipeline/quick-quote-form";
import {
  Zap,
  Plus,
  Trash2,
  Check,
  Building2,
  Package,
  Calculator,
  Calendar,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FormatAmount } from "@/components/shared/format";
import { CustomerCombobox } from "@/components/shared";
import { toastSuccess, toastError } from "@/hooks";
import type { Customer } from "@/lib/schemas/customers";
import { GST_RATE } from "@/lib/order-calculations";
import type { CreateQuoteVersionInput } from "@/hooks/pipeline";

// ============================================================================
// TYPES
// ============================================================================

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
}

/**
 * Container props - used by parent components
 */
export interface QuickQuoteFormContainerProps {
  opportunityId?: string;
  customerId?: string;
  onSuccess?: (quoteId: string) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Presenter props - receives data from container
 */
export interface QuickQuoteFormPresenterProps {
  opportunityId?: string;
  customerId?: string;
  /** Pre-filled customer when opening from entity linking (e.g. customer detail) */
  initialSelectedCustomer?: Customer | null;
  /** @source useProducts hook */
  products: ProductItem[];
  /** @source Combined loading state from container - available for loading UI */
  isLoading?: boolean;
  /** @source useCreateQuoteVersion hook */
  createMutation: UseMutationResult<unknown, Error, CreateQuoteVersionInput>;
  onSuccess?: (quoteId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const DEFAULT_VALIDITY_DAYS = 30;

// ============================================================================
// HELPERS
// ============================================================================

function calculateLineTotal(item: QuickQuoteLineItem): number {
  const subtotal = item.unitPrice * item.quantity;
  const discountAmount = subtotal * (item.discount / 100);
  return subtotal - discountAmount;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export const QuickQuoteFormPresenter = memo(function QuickQuoteFormPresenter({
  opportunityId,
  customerId: initialCustomerId,
  initialSelectedCustomer,
  products,
  isLoading: _isLoading,
  createMutation,
  onSuccess,
  onCancel,
  className,
}: QuickQuoteFormPresenterProps) {
  const navigate = useNavigate();
  const [productOpen, setProductOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialSelectedCustomer ?? null
  );

  const form = useTanStackForm<QuickQuoteFormValues>({
    schema: quickQuoteFormSchema,
    defaultValues: {
      customerId: initialSelectedCustomer?.id ?? "",
      lineItems: [],
      validityDays: DEFAULT_VALIDITY_DAYS,
      notes: "",
    },
    onSubmit: async (values) => {
      if (!opportunityId) {
        toastError("Opportunity ID is required");
        return;
      }

      createMutation.mutate(
        {
          opportunityId,
          notes: values.notes?.trim() || undefined,
          items: values.lineItems.map((item) => {
            const subtotal = item.quantity * item.unitPrice;
            const discount = item.discount ? subtotal * (item.discount / 100) : 0;
            const total = Math.round((subtotal - discount) * 100) / 100;

            return {
              productId: item.productId,
              description: item.productName || "Item",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discount,
              total,
            };
          }),
        },
        {
          onSuccess: (result) => {
            toastSuccess("Quote created successfully");
            const data = result as { quoteVersion: { id: string } };
            if (onSuccess && data?.quoteVersion?.id) {
              onSuccess(data.quoteVersion.id);
            } else {
              navigate({ to: "/pipeline" });
            }
          },
          onError: () => {
            toastError("Failed to create quote");
          },
        }
      );
    },
  });

  const watchedLineItems = form.useWatch("lineItems");
  const lineItems = useMemo(
    () => watchedLineItems ?? [],
    [watchedLineItems]
  );

  // Sync customerId when selectedCustomer changes
  useEffect(() => {
    form.setFieldValue("customerId", selectedCustomer?.id ?? "");
  }, [selectedCustomer, form]);

  // Sync form when initialSelectedCustomer loads
  useEffect(() => {
    if (initialSelectedCustomer && initialCustomerId) {
      setSelectedCustomer(initialSelectedCustomer);
      form.setFieldValue("customerId", initialSelectedCustomer.id);
    }
  }, [initialSelectedCustomer, initialCustomerId, form]);

  // Derive effective customer for combobox display
  const effectiveSelectedCustomer =
    initialSelectedCustomer &&
    initialCustomerId &&
    (selectedCustomer === null || selectedCustomer.id === initialSelectedCustomer.id)
      ? initialSelectedCustomer
      : selectedCustomer;

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + calculateLineTotal(item),
      0
    );
    const gstAmount = Math.round(subtotal * GST_RATE);
    const total = subtotal + gstAmount;

    return { subtotal, gstAmount, total };
  }, [lineItems]);

  // Add product to line items
  const handleAddProduct = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      if (lineItems.some((item) => item.productId === productId)) {
        toastError("Product already in quote");
        return;
      }

      form.setFieldValue("lineItems", [
        ...lineItems,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPrice: product.basePrice,
          quantity: 1,
          discount: 0,
        },
      ]);
      setProductOpen(false);
    },
    [products, lineItems, form]
  );

  // Update line item
  const handleUpdateLineItem = useCallback(
    (productId: string, updates: Partial<QuickQuoteLineItem>) => {
      form.setFieldValue(
        "lineItems",
        lineItems.map((item) =>
          item.productId === productId ? { ...item, ...updates } : item
        )
      );
    },
    [lineItems, form]
  );

  // Remove line item
  const handleRemoveLineItem = useCallback(
    (productId: string) => {
      form.setFieldValue(
        "lineItems",
        lineItems.filter((item) => item.productId !== productId)
      );
    },
    [lineItems, form]
  );

  return (
    <Card className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Quote
          </CardTitle>
          <CardDescription>
            Create a quote in seconds - select customer, add products, done.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FormFieldDisplayProvider form={form}>
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Customer
            </Label>
            <CustomerCombobox
              value={effectiveSelectedCustomer}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                form.setFieldValue("customerId", customer?.id ?? "");
              }}
              placeholder="Search customers..."
              disabled={!!initialCustomerId}
            />
          </div>

          <Separator />

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </Label>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.sku} ${product.name}`}
                            onSelect={() => handleAddProduct(product.id)}
                            disabled={lineItems.some(
                              (item) => item.productId === product.id
                            )}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {product.sku}
                                </Badge>
                                <span className="font-medium">{product.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <FormatAmount amount={product.basePrice} />
                              </p>
                            </div>
                            {lineItems.some(
                              (item) => item.productId === product.id
                            ) && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No products added yet</p>
                <p className="text-sm text-muted-foreground">
                  Click &quot;Add Product&quot; to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-24 text-right">Price</TableHead>
                    <TableHead className="w-20 text-center">Qty</TableHead>
                    <TableHead className="w-24 text-center">Discount</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <Badge variant="outline" className="text-xs">
                            {item.productSku}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <FormatAmount amount={item.unitPrice} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLineItem(item.productId, {
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-16 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.discount}
                            onChange={(e) =>
                              handleUpdateLineItem(item.productId, {
                                discount:
                                  Math.min(100, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-16 text-center"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <FormatAmount amount={calculateLineTotal(item)} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLineItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {lineItems.length > 0 && (
            <>
              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4" />
                  <Label>Quote Summary</Label>
                </div>
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span><FormatAmount amount={totals.subtotal} /></span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST (10%)</span>
                    <span><FormatAmount amount={totals.gstAmount} /></span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span><FormatAmount amount={totals.total} /></span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Validity & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="validityDays">
              {(field) => (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Valid For
                  </Label>
                  <Select
                    value={(field.state.value ?? DEFAULT_VALIDITY_DAYS).toString()}
                    onValueChange={(v) => field.handleChange(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Expires:{" "}
                    {format(
                      addDays(new Date(), field.state.value ?? DEFAULT_VALIDITY_DAYS),
                      "PPP"
                    )}
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              )}
            </form.Field>
          </div>
          </FormFieldDisplayProvider>
        </CardContent>

        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <div className={cn(!onCancel && "ml-auto")}>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create Quote
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
});

/**
 * @deprecated Use QuickQuoteFormContainer instead for new code.
 * This export is kept for backwards compatibility.
 */
export const QuickQuoteForm = QuickQuoteFormPresenter;

export default QuickQuoteFormPresenter;
