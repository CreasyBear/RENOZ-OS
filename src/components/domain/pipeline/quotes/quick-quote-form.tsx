/**
 * QuickQuoteForm Component
 *
 * Streamlined quote creation form for rapid quoting.
 * Allows creating quotes with minimal input - customer, products, and basic details.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUICK-QUOTE-UI)
 */

import { memo, useState, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useNavigate } from "@tanstack/react-router";
import {
  Zap,
  Plus,
  Trash2,
  Search,
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
import { toastSuccess, toastError } from "@/hooks";
import { getCustomers } from "@/server/customers";
import { listProducts } from "@/server/functions/products/products";
import { createQuoteVersion } from "@/server/functions/pipeline/quote-versions";
import { GST_RATE } from "@/lib/order-calculations";

// ============================================================================
// TYPES
// ============================================================================

export interface QuickQuoteFormProps {
  opportunityId?: string;
  customerId?: string;
  onSuccess?: (quoteId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface QuoteLineItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

const DEFAULT_VALIDITY_DAYS = 30;

// ============================================================================
// HELPERS
// ============================================================================

function calculateLineTotal(item: QuoteLineItem): number {
  const subtotal = item.unitPrice * item.quantity;
  const discountAmount = subtotal * (item.discount / 100);
  return subtotal - discountAmount;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuickQuoteForm = memo(function QuickQuoteForm({
  opportunityId,
  customerId: initialCustomerId,
  onSuccess,
  onCancel,
  className,
}: QuickQuoteFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [validityDays, setValidityDays] = useState(DEFAULT_VALIDITY_DAYS);
  const [notes, setNotes] = useState("");

  // Fetch customers
  const customersQuery = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 100 }),
    queryFn: () => getCustomers({ data: { page: 1, pageSize: 100 } }),
  });

  // Fetch products
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ status: "active" }),
    queryFn: () => listProducts({ data: { pageSize: 100, status: "active" } }),
  });

  const customers = customersQuery.data?.items ?? [];
  const products = productsQuery.data?.products ?? [];

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

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

      // Check if already in list
      if (lineItems.some((item) => item.productId === productId)) {
        toastError("Product already in quote");
        return;
      }

      setLineItems((prev) => [
        ...prev,
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
    [products, lineItems]
  );

  // Update line item
  const handleUpdateLineItem = useCallback(
    (productId: string, updates: Partial<QuoteLineItem>) => {
      setLineItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  // Remove line item
  const handleRemoveLineItem = useCallback((productId: string) => {
    setLineItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  // Create quote mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!opportunityId) {
        throw new Error("Opportunity ID is required");
      }

      return createQuoteVersion({
        data: {
          opportunityId,
          notes: notes.trim() || undefined,
          items: lineItems.map((item) => {
            const subtotal = item.quantity * item.unitPrice;
            const discount = item.discount ? subtotal * (item.discount / 100) : 0;
            const totalCents = Math.round(subtotal - discount);

            return {
              productId: item.productId,
              description: item.productName || "Item",
              quantity: item.quantity,
              unitPriceCents: item.unitPrice,
              discountPercent: item.discount,
              totalCents,
            };
          }),
        },
      });
    },
    onSuccess: (result) => {
      toastSuccess("Quote created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });

      if (onSuccess) {
        onSuccess(result.quoteVersion.id);
      } else {
        // TODO: Fix route - /pipeline/quotes/$quoteId may not be configured yet
        // Using safe fallback until route is implemented
        navigate({ to: "/pipeline" });
      }
    },
    onError: () => {
      toastError("Failed to create quote");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toastError("Please select a customer");
      return;
    }

    if (lineItems.length === 0) {
      toastError("Please add at least one product");
      return;
    }

    createMutation.mutate();
  };

  const canSubmit = customerId && lineItems.length > 0;

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
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
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Customer
            </Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between"
                  disabled={!!initialCustomerId}
                >
                  {selectedCustomer ? (
                    <span>{selectedCustomer.name}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select customer...
                    </span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customers..." />
                  <CommandList>
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.name}
                          onSelect={() => {
                            setCustomerId(customer.id);
                            setCustomerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              customerId === customer.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{customer.name}</p>
                            {customer.email && (
                              <p className="text-sm text-muted-foreground">
                                {customer.email}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
                  Click "Add Product" to get started
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Valid For
              </Label>
              <Select
                value={validityDays.toString()}
                onValueChange={(v) => setValidityDays(parseInt(v))}
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
                Expires: {format(addDays(new Date(), validityDays), "PPP")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
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
              disabled={!canSubmit || createMutation.isPending}
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

export default QuickQuoteForm;
