/**
 * PricingEngine Component
 *
 * Advanced pricing management with bulk operations, margin analysis, and recommendations.
 */
import { useState } from "react";
import { useForm as useTanStackForm } from "@tanstack/react-form";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Percent,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComboboxField } from "@/components/shared/forms";
import { useResolvePrice } from "@/hooks/products";
import { useCustomers } from "@/hooks/customers";

// ============================================================================
// PRICING STRATEGY CONSTANTS
// ============================================================================

/**
 * Pricing strategy multipliers for suggested prices.
 * Based on cost-plus pricing methodology.
 */
const PRICING_STRATEGY_MULTIPLIERS = {
  /** Competitive pricing: 25% markup on cost, or 5% discount on base price */
  competitive: { costMultiplier: 1.25, basePriceDiscount: 0.95 },
  /** Balanced pricing: 40% markup on cost, or base price */
  balanced: { costMultiplier: 1.40, basePriceMultiplier: 1.0 },
  /** Premium pricing: 60% markup on cost, or 10% premium on base price */
  premium: { costMultiplier: 1.60, basePriceMultiplier: 1.10 },
} as const;

interface PricingEngineProps {
  productId: string;
  sku: string;
  name: string;
  basePrice: number;
  costPrice: number | null;
  onPriceUpdate?: (newPrice: number) => void;
}

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

// Calculate margin
function calculateMargin(basePrice: number, costPrice: number | null): number | null {
  if (costPrice === null || costPrice === 0) return null;
  return ((basePrice - costPrice) / basePrice) * 100;
}

// Get margin health status
function getMarginHealth(margin: number | null): {
  status: "healthy" | "warning" | "critical";
  message: string;
  color: string;
} {
  if (margin === null) {
    return { status: "warning", message: "Cost price not set", color: "text-yellow-600" };
  }
  if (margin >= 30) {
    return { status: "healthy", message: "Healthy margin", color: "text-green-600" };
  }
  if (margin >= 15) {
    return { status: "warning", message: "Low margin", color: "text-yellow-600" };
  }
  return { status: "critical", message: "Critical margin", color: "text-red-600" };
}

export function PricingEngine({
  productId,
  sku,
  name,
  basePrice,
  costPrice,
  onPriceUpdate,
}: PricingEngineProps) {
  const [calcParams, setCalcParams] = useState<{ quantity: number; customerId?: string } | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkAdjustment, setBulkAdjustment] = useState(0);
  const [customerSearch, setCustomerSearch] = useState("");

  // Fetch customers for combobox
  const { data: customersData } = useCustomers({
    search: customerSearch || undefined,
    status: "active",
    pageSize: 20,
  });

  // TanStack Form for price calculator (supports ComboboxField)
  const calcForm = useTanStackForm({
    defaultValues: {
      quantity: 1,
      customerId: "",
    },
    onSubmit: async ({ value }) => {
      setCalcParams({
        quantity: value.quantity,
        customerId: value.customerId || undefined,
      });
    },
  });

  // Use price resolution hook (only enabled when params are set)
  const { data: priceResult, isLoading: isCalculating } = useResolvePrice({
    productId,
    quantity: calcParams?.quantity ?? 1,
    customerId: calcParams?.customerId,
    enabled: !!calcParams,
  });

  const calcResult = priceResult
    ? {
        finalPrice: priceResult.finalPrice,
        discount: priceResult.discount,
        discountPercent: priceResult.discountPercent,
        source: priceResult.source,
      }
    : null;

  // Current margin
  const margin = calculateMargin(basePrice, costPrice);
  const marginHealth = getMarginHealth(margin);

  // Suggested prices based on different strategies
  const suggestions = {
    competitive: costPrice
      ? costPrice * PRICING_STRATEGY_MULTIPLIERS.competitive.costMultiplier
      : basePrice * PRICING_STRATEGY_MULTIPLIERS.competitive.basePriceDiscount,
    balanced: costPrice
      ? costPrice * PRICING_STRATEGY_MULTIPLIERS.balanced.costMultiplier
      : basePrice * PRICING_STRATEGY_MULTIPLIERS.balanced.basePriceMultiplier,
    premium: costPrice
      ? costPrice * PRICING_STRATEGY_MULTIPLIERS.premium.costMultiplier
      : basePrice * PRICING_STRATEGY_MULTIPLIERS.premium.basePriceMultiplier,
  };


  // Apply bulk adjustment
  const handleBulkAdjust = () => {
    if (bulkAdjustment === 0) return;
    const newPrice = basePrice * (1 + bulkAdjustment / 100);
    onPriceUpdate?.(Math.round(newPrice * 100) / 100);
    setIsBulkDialogOpen(false);
    setBulkAdjustment(0);
  };

  return (
    <div className="space-y-6">
      {/* Margin Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Margin Analysis
          </CardTitle>
          <CardDescription>
            Current pricing health and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Base Price</p>
              <p className="text-2xl font-bold">{formatPrice(basePrice)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Cost Price</p>
              <p className="text-2xl font-bold">{formatPrice(costPrice)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Margin</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${marginHealth.color}`}>
                  {margin !== null ? `${margin.toFixed(1)}%` : "-"}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {marginHealth.status === "healthy" && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {marginHealth.status === "warning" && (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                      {marginHealth.status === "critical" && (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>{marginHealth.message}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Margin progress bar */}
          {margin !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin range</span>
                <span>{margin.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(margin, 100)}
                className={
                  margin >= 30
                    ? "[&>div]:bg-green-500"
                    : margin >= 15
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-red-500"
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="text-yellow-600">15%</span>
                <span className="text-green-600">30%</span>
                <span>50%+</span>
              </div>
            </div>
          )}

          {/* Price suggestions */}
          {costPrice && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Price Recommendations</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onPriceUpdate?.(suggestions.competitive)}
                  className="p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Competitive</span>
                    <TrendingDown className="h-3 w-3 text-blue-500" />
                  </div>
                  <p className="font-medium">{formatPrice(suggestions.competitive)}</p>
                  <p className="text-xs text-muted-foreground">25% markup</p>
                </button>
                <button
                  onClick={() => onPriceUpdate?.(suggestions.balanced)}
                  className="p-3 border rounded-lg hover:bg-muted transition-colors text-left border-primary"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Balanced</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="font-medium">{formatPrice(suggestions.balanced)}</p>
                  <p className="text-xs text-muted-foreground">40% markup</p>
                </button>
                <button
                  onClick={() => onPriceUpdate?.(suggestions.premium)}
                  className="p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Premium</span>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  </div>
                  <p className="font-medium">{formatPrice(suggestions.premium)}</p>
                  <p className="text-xs text-muted-foreground">60% markup</p>
                </button>
              </div>
            </div>
          )}

          {/* Quick adjustment */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDialogOpen(true)}
            >
              <Percent className="mr-2 h-4 w-4" />
              Adjust Price
            </Button>
            <span className="text-sm text-muted-foreground">
              Apply percentage increase or decrease
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Price Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Price Calculator
          </CardTitle>
          <CardDescription>
            Calculate the final price for different quantities and customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              calcForm.handleSubmit();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <calcForm.Field
                name="quantity"
                validators={{
                  onChange: ({ value }) =>
                    !value || value < 1 ? "Quantity must be at least 1" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(parseInt(e.target.value) || 1)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </calcForm.Field>
              <calcForm.Field name="customerId">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Customer (optional)</Label>
                    <ComboboxField
                      field={field}
                      label=""
                      loadOptions={async (search: string) => {
                        setCustomerSearch(search);
                        await new Promise((resolve) => setTimeout(resolve, 300)); // Debounce
                        return (customersData?.items ?? []).map((c) => ({
                          value: c.id,
                          label: `${c.name}${c.email ? ` (${c.email})` : ""}`,
                        }));
                      }}
                      placeholder="Search customers..."
                      searchPlaceholder="Type to search..."
                      allowClear
                      debounceMs={300}
                    />
                  </div>
                )}
              </calcForm.Field>
            </div>

            <Button type="submit" disabled={isCalculating}>
              {isCalculating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Price
                </>
              )}
            </Button>
          </form>

          {/* Result */}
          {calcResult && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Final Unit Price</p>
                  <p className="text-3xl font-bold">{formatPrice(calcResult.finalPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price Source</p>
                  <Badge variant="outline" className="mt-1">
                    {calcResult.source === "customer"
                      ? "Customer-specific"
                      : calcResult.source === "tier"
                      ? "Volume tier"
                      : "Base price"}
                  </Badge>
                </div>
              </div>
              {calcResult.discount > 0 && (
                <div className="mt-4 flex items-center gap-2 text-green-600">
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    Saving {formatPrice(calcResult.discount)} ({calcResult.discountPercent.toFixed(1)}% off)
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Adjustment Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Price</DialogTitle>
            <DialogDescription>
              Apply a percentage adjustment to the base price of {name} ({sku})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Adjustment</Label>
                <span
                  className={`font-medium ${
                    bulkAdjustment > 0
                      ? "text-red-600"
                      : bulkAdjustment < 0
                      ? "text-green-600"
                      : ""
                  }`}
                >
                  {bulkAdjustment > 0 ? "+" : ""}
                  {bulkAdjustment}%
                </span>
              </div>
              <Slider
                value={[bulkAdjustment]}
                onValueChange={(v) => setBulkAdjustment(v[0])}
                min={-50}
                max={50}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current price</span>
                <span>{formatPrice(basePrice)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>New price</span>
                <span
                  className={
                    bulkAdjustment > 0
                      ? "text-red-600"
                      : bulkAdjustment < 0
                      ? "text-green-600"
                      : ""
                  }
                >
                  {formatPrice(basePrice * (1 + bulkAdjustment / 100))}
                </span>
              </div>
              {costPrice && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">New margin</span>
                  <span>
                    {calculateMargin(
                      basePrice * (1 + bulkAdjustment / 100),
                      costPrice
                    )?.toFixed(1)}
                    %
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdjust} disabled={bulkAdjustment === 0}>
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
