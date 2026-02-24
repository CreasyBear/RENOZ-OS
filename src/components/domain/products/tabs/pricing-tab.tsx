/**
 * ProductPricingTab Component
 *
 * Displays and manages price tiers and customer-specific pricing.
 */
import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

interface PriceTier {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
}

interface ProductPricingTabProps {
  productId: string;
  basePrice: number;
  priceTiers: PriceTier[];
  onAddTier?: () => void;
  onEditTier?: (tierId: string) => void;
  onDeleteTier?: (tierId: string) => void;
  onAddCustomerPrice?: () => void;
}

// Format price as currency
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

export function ProductPricingTab({
  productId: _productId,
  basePrice,
  priceTiers,
  onAddTier,
  onEditTier,
  onDeleteTier,
  onAddCustomerPrice,
}: ProductPricingTabProps) {
  const [_isAddingTier, setIsAddingTier] = useState(false);
  const handleAddTier = onAddTier ?? (() => setIsAddingTier(true));

  // Sort tiers by min quantity
  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity);

  return (
    <div className="space-y-6">
      {/* Volume pricing tiers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Volume Pricing</CardTitle>
            <CardDescription>
              Set different prices based on order quantity
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleAddTier}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          {sortedTiers.length === 0 ? (
            <EmptyState
              title="No price tiers"
              message="Add volume-based pricing tiers to offer discounts for bulk purchases"
              primaryAction={{
                label: "Add Price Tier",
                onClick: handleAddTier,
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quantity Range</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Base price row */}
                <TableRow className="bg-muted/50">
                  <TableCell>1 - {sortedTiers[0]?.minQuantity - 1 || "∞"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(basePrice)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell>
                    <Badge variant="outline">Base</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>

                {/* Tier rows */}
                {sortedTiers.map((tier) => {
                  const savings = basePrice - tier.price;
                  const savingsPercent = (savings / basePrice) * 100;

                  return (
                    <TableRow key={tier.id}>
                      <TableCell>
                        {tier.minQuantity} - {tier.maxQuantity ?? "∞"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(tier.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.discountPercent ? `${tier.discountPercent}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {savings > 0 ? `${savingsPercent.toFixed(0)}% off` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tier.isActive ? "default" : "secondary"}>
                          {tier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(onEditTier || onDeleteTier) && (
                          <div className="flex gap-1">
                            {onEditTier && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEditTier(tier.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {onDeleteTier && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => onDeleteTier(tier.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer-specific pricing */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customer Pricing</CardTitle>
            <CardDescription>
              Set special prices for specific customers
            </CardDescription>
          </div>
          {onAddCustomerPrice && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddCustomerPrice}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Customer Price
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No customer-specific prices"
            message="Add special pricing for individual customers"
            primaryAction={
              onAddCustomerPrice
                ? {
                    label: "Add Customer Price",
                    onClick: onAddCustomerPrice,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Price calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Price Calculator</CardTitle>
          <CardDescription>
            Calculate the final price for a given quantity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Quantity</label>
              <input
                type="number"
                min="1"
                defaultValue="1"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Unit Price</label>
              <p className="text-2xl font-bold mt-1">{formatPrice(basePrice)}</p>
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Total</label>
              <p className="text-2xl font-bold mt-1">{formatPrice(basePrice)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
