/**
 * CustomerPricing Component
 *
 * Manages customer-specific pricing overrides with search, add, and remove functionality.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, User, Calendar, Percent, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerSelectorContainer } from "@/components/domain/orders/creation/customer-selector-container";
import {
  useSetCustomerPrice,
  useDeleteCustomerPrice,
} from "@/hooks/products";
import type { CustomerPrice } from "@/lib/schemas/products";

// Customer price form schema
const customerPriceFormSchema = z.object({
  customerId: z.string().uuid("Please select a customer"),
  customerName: z.string().optional(), // For display purposes
  price: z.number().min(0, "Price cannot be negative").nullable(),
  discountPercent: z.number().min(0).max(100).nullable(),
  validFrom: z.date(),
  validTo: z.date().nullable(),
}).refine(
  (data) => data.price !== null || data.discountPercent !== null,
  { message: "Either price or discount percentage is required", path: ["price"] }
).refine(
  (data) => !data.validTo || data.validTo > data.validFrom,
  { message: "End date must be after start date", path: ["validTo"] }
);

type CustomerPriceFormValues = z.infer<typeof customerPriceFormSchema>;

/** Extended with customerName for display - schema CustomerPrice has required productId */
interface CustomerPriceWithName extends CustomerPrice {
  customerName?: string;
}

interface CustomerPricingProps {
  productId: string;
  basePrice: number;
  customerPrices: CustomerPriceWithName[];
  onPricesChange?: () => void;
}

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(date));
}

// Check if a customer price is currently active
function isActive(price: CustomerPriceWithName): boolean {
  const now = new Date();
  const from = new Date(price.validFrom);
  const to = price.validTo ? new Date(price.validTo) : null;
  return from <= now && (!to || to >= now);
}

export function CustomerPricing({
  productId,
  basePrice,
  customerPrices,
  onPricesChange,
}: CustomerPricingProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPrice, setDeletingPrice] = useState<CustomerPriceWithName | null>(null);

  // Use mutation hooks
  const setCustomerPriceMutation = useSetCustomerPrice();
  const deleteCustomerPriceMutation = useDeleteCustomerPrice();

  const isSubmitting = setCustomerPriceMutation.isPending || deleteCustomerPriceMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerPriceFormValues>({
    resolver: zodResolver(customerPriceFormSchema),
    defaultValues: {
      customerId: "",
      price: null,
      discountPercent: null,
      validFrom: new Date(),
      validTo: null,
    },
  });

  /* eslint-disable react-hooks/incompatible-library -- React Hook Form watch(); known limitation */
  const watchPrice = watch("price");
  const watchDiscount = watch("discountPercent");
  const watchValidFrom = watch("validFrom");
  const watchValidTo = watch("validTo");
  const selectedCustomerId = watch("customerId") || null;
  /* eslint-enable react-hooks/incompatible-library */

  // Sort prices: active first, then by customer name
  const sortedPrices = [...customerPrices].sort((a, b) => {
    const aActive = isActive(a);
    const bActive = isActive(b);
    if (aActive !== bActive) return bActive ? 1 : -1;
    return (a.customerName ?? "").localeCompare(b.customerName ?? "");
  });

  // Open dialog for new customer price
  const handleAdd = () => {
    reset({
      customerId: "",
      price: null,
      discountPercent: null,
      validFrom: new Date(),
      validTo: null,
    });
    setIsDialogOpen(true);
  };

  // Submit form
  const onSubmit = (data: CustomerPriceFormValues) => {
    setCustomerPriceMutation.mutate(
      {
        productId,
        customerId: data.customerId,
        price: data.price ?? undefined,
        discountPercent: data.discountPercent ?? undefined,
        validFrom: data.validFrom,
        validTo: data.validTo ?? undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          onPricesChange?.();
        },
      }
    );
  };

  // Delete customer price
  const handleDelete = () => {
    if (!deletingPrice) return;
    deleteCustomerPriceMutation.mutate(deletingPrice.id, {
      onSuccess: () => {
        setDeletingPrice(null);
        onPricesChange?.();
      },
    });
  };

  // Calculate effective price
  const getEffectivePrice = (price: CustomerPriceWithName): number => {
    if (price.price !== null) return price.price;
    if (price.discountPercent !== null) {
      return basePrice * (1 - price.discountPercent / 100);
    }
    return basePrice;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customer Pricing</CardTitle>
            <CardDescription>
              Set special prices for specific customers
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer Price
          </Button>
        </CardHeader>
        <CardContent>
          {sortedPrices.length === 0 ? (
            <EmptyState
              title="No customer-specific prices"
              message="Add special pricing for individual customers to give them exclusive rates"
              primaryAction={{
                label: "Add Customer Price",
                onClick: handleAdd,
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPrices.map((price) => {
                  const effectivePrice = getEffectivePrice(price);
                  const savings = basePrice - effectivePrice;
                  const active = isActive(price);

                  return (
                    <TableRow key={price.id} className={!active ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">
                            {price.customerName || "Unknown Customer"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{formatPrice(effectivePrice)}</span>
                        {savings > 0 && (
                          <span className="text-green-600 text-sm ml-2">
                            (-{formatPrice(savings)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {price.discountPercent ? (
                          <Badge variant="secondary">{price.discountPercent}% off</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(price.validFrom)}</div>
                          <div className="text-muted-foreground">
                            {price.validTo ? `to ${formatDate(price.validTo)}` : "No end date"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "secondary"}>
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeletingPrice(price)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer Price</DialogTitle>
            <DialogDescription>
              Set a special price or discount for a specific customer
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <input type="hidden" {...register("customerId")} />
              <CustomerSelectorContainer
                selectedCustomerId={selectedCustomerId}
                onSelect={(customer) => {
                  setValue("customerId", customer?.id ?? "");
                  setValue("customerName", customer?.name);
                }}
              />
              {errors.customerId && (
                <p className="text-sm text-destructive">{errors.customerId.message}</p>
              )}
            </div>

            {/* Pricing Options */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set either a fixed price or a discount percentage
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Fixed Price
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={formatPrice(basePrice)}
                    disabled={watchDiscount !== null && watchDiscount > 0}
                    {...register("price", {
                      setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                    })}
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountPercent" className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Discount %
                  </Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 15"
                    disabled={watchPrice !== null && watchPrice > 0}
                    {...register("discountPercent", {
                      setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                    })}
                  />
                </div>
              </div>

              {/* Preview */}
              {(watchPrice || watchDiscount) && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Customer will pay:{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(
                        watchPrice ?? basePrice * (1 - (watchDiscount ?? 0) / 100)
                      )}
                    </span>
                    {watchDiscount && (
                      <span className="text-green-600 ml-2">
                        (saves {formatPrice(basePrice * ((watchDiscount ?? 0) / 100))})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Valid From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {watchValidFrom ? formatDate(watchValidFrom) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={watchValidFrom}
                      onSelect={(date) => date && setValue("validFrom", date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Valid To (optional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {watchValidTo ? formatDate(watchValidTo) : "No end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={watchValidTo ?? undefined}
                      onSelect={(date) => setValue("validTo", date ?? null)}
                    />
                  </PopoverContent>
                </Popover>
                {errors.validTo && (
                  <p className="text-sm text-destructive">{errors.validTo.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add Price"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPrice} onOpenChange={() => setDeletingPrice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Customer Price</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the special pricing for{" "}
              {deletingPrice?.customerName || "this customer"}? They will revert to
              standard pricing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
