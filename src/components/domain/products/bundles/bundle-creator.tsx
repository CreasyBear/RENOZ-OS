/**
 * BundleCreator Component
 *
 * Create new product bundles with component selection and price configuration.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  Plus,
  Trash2,
  Calculator,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ComponentSelector } from "./component-selector";
import { useCreateProduct, useSetBundleComponents } from "@/hooks/products";
import { toastError } from "@/hooks";

// Form schema
const bundleFormSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  basePrice: z.number().min(0, "Price cannot be negative"),
  costPrice: z.number().min(0).optional(),
  useCalculatedPrice: z.boolean().default(true),
});

type BundleFormValues = z.infer<typeof bundleFormSchema>;

interface SelectedComponent {
  product: {
    id: string;
    sku: string;
    name: string;
    basePrice: number | null;
  };
  quantity: number;
  isOptional: boolean;
}

interface BundleCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (bundleId: string) => void;
}

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

export function BundleCreator({ open, onOpenChange, onCreated }: BundleCreatorProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [components, setComponents] = useState<SelectedComponent[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [createdBundleId, setCreatedBundleId] = useState<string | null>(null);

  // Mutations
  const createProduct = useCreateProduct();
  const setBundleComponents = useSetBundleComponents();

  const isSubmitting = createProduct.isPending || setBundleComponents.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<BundleFormValues>({
    resolver: zodResolver(bundleFormSchema) as never,
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      basePrice: 0,
      useCalculatedPrice: true,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() returns functions that cannot be memoized; known limitation
  const useCalculatedPrice = watch("useCalculatedPrice");
   
  const watchPrice = watch("basePrice");

  // Calculate component total
  const componentTotal = components.reduce((sum, c) => {
    if (!c.isOptional) {
      return sum + (c.product.basePrice ?? 0) * c.quantity;
    }
    return sum;
  }, 0);

  // Calculate savings
  const savings = componentTotal - (useCalculatedPrice ? componentTotal : watchPrice);
  const savingsPercent = componentTotal > 0 ? (savings / componentTotal) * 100 : 0;

  // Update price when calculated price is toggled
  const handleCalculatedPriceToggle = (checked: boolean) => {
    setValue("useCalculatedPrice", checked);
    if (checked) {
      setValue("basePrice", componentTotal);
    }
  };

  // Add components
  const handleAddComponents = (newComponents: SelectedComponent[]) => {
    setComponents((prev) => [...prev, ...newComponents]);
    // Update price if using calculated
    if (useCalculatedPrice) {
      const newTotal = [...components, ...newComponents].reduce((sum, c) => {
        if (!c.isOptional) {
          return sum + (c.product.basePrice ?? 0) * c.quantity;
        }
        return sum;
      }, 0);
      setValue("basePrice", newTotal);
    }
  };

  // Remove component
  const handleRemoveComponent = (index: number) => {
    const newComponents = components.filter((_, i) => i !== index);
    setComponents(newComponents);
    // Update price if using calculated
    if (useCalculatedPrice) {
      const newTotal = newComponents.reduce((sum, c) => {
        if (!c.isOptional) {
          return sum + (c.product.basePrice ?? 0) * c.quantity;
        }
        return sum;
      }, 0);
      setValue("basePrice", newTotal);
    }
  };

  // Update component quantity
  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newComponents = components.map((c, i) =>
      i === index ? { ...c, quantity } : c
    );
    setComponents(newComponents);
    // Update price if using calculated
    if (useCalculatedPrice) {
      const newTotal = newComponents.reduce((sum, c) => {
        if (!c.isOptional) {
          return sum + (c.product.basePrice ?? 0) * c.quantity;
        }
        return sum;
      }, 0);
      setValue("basePrice", newTotal);
    }
  };

  // Submit form
  const onSubmit = async (data: BundleFormValues) => {
    if (components.length === 0) {
      return;
    }

    try {
      // Create bundle product
      const product = await createProduct.mutateAsync({
        sku: data.sku,
        name: data.name,
        description: data.description,
        type: "bundle",
        status: "active",
        basePrice: data.basePrice,
        costPrice: data.costPrice,
        isSellable: true,
        isPurchasable: false,
        trackInventory: false,
      });

      // Add components
      await setBundleComponents.mutateAsync({
        bundleProductId: product.id,
        components: components.map((c) => ({
          componentProductId: c.product.id,
          quantity: c.quantity,
          isOptional: c.isOptional,
        })),
      });

      setCreatedBundleId(product.id);
      setStep(3);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to create bundle"
      );
    }
  };

  // Reset and close
  const handleClose = () => {
    reset();
    setComponents([]);
    setStep(1);
    setCreatedBundleId(null);
    onOpenChange(false);
  };

  // Handle success
  const handleSuccess = () => {
    if (createdBundleId) {
      onCreated?.(createdBundleId);
    }
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Create Product Bundle
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Step 1: Select products to include in the bundle"}
              {step === 2 && "Step 2: Configure bundle details and pricing"}
              {step === 3 && "Bundle created successfully!"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Component Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Bundle Components</h3>
                <Button size="sm" onClick={() => setIsSelectorOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Products
                </Button>
              </div>

              {components.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No products added yet
                  </p>
                  <Button variant="outline" onClick={() => setIsSelectorOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Products
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="w-[100px] text-center">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {c.product.sku}
                              {c.isOptional && (
                                <Badge variant="outline" className="ml-2">
                                  Optional
                                </Badge>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(c.product.basePrice)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={c.quantity}
                            onChange={(e) =>
                              handleQuantityChange(i, parseInt(e.target.value) || 1)
                            }
                            className="w-20 h-8 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice((c.product.basePrice ?? 0) * c.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveComponent(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {components.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Components Total</p>
                    <p className="text-xl font-bold">{formatPrice(componentTotal)}</p>
                  </div>
                  <Button onClick={() => setStep(2)}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Bundle Details */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="BUNDLE-001"
                    {...register("sku")}
                  />
                  {errors.sku && (
                    <p className="text-sm text-destructive">{errors.sku.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Bundle Name</Label>
                  <Input
                    id="name"
                    placeholder="Starter Kit Bundle"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what's included in this bundle..."
                  rows={3}
                  {...register("description")}
                />
              </div>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Bundle Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use calculated price</Label>
                      <p className="text-sm text-muted-foreground">
                        Match the sum of component prices
                      </p>
                    </div>
                    <Switch
                      checked={useCalculatedPrice}
                      onCheckedChange={handleCalculatedPriceToggle}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Bundle Price</Label>
                      <Input
                        id="basePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={useCalculatedPrice}
                        {...register("basePrice", { valueAsNumber: true })}
                      />
                      {errors.basePrice && (
                        <p className="text-sm text-destructive">
                          {errors.basePrice.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Cost Price (optional)</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        {...register("costPrice", {
                          setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                        })}
                      />
                    </div>
                  </div>

                  {/* Savings preview */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Components</p>
                        <p className="font-bold">{formatPrice(componentTotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bundle Price</p>
                        <p className="font-bold">{formatPrice(watchPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Savings</p>
                        <p className="font-bold text-green-600">
                          {savings > 0 ? formatPrice(savings) : "-"}
                          {savings > 0 && (
                            <span className="text-sm ml-1">
                              ({savingsPercent.toFixed(0)}%)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Bundle"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Bundle Created!</h3>
              <p className="text-muted-foreground mb-6">
                Your new bundle is ready. You can now add it to orders and quotes.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={handleSuccess}>
                  View Bundle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Component Selector */}
      <ComponentSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={handleAddComponents}
        excludeProductIds={components.map((c) => c.product.id)}
      />
    </>
  );
}
