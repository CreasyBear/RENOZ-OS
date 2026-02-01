/**
 * ProductSelector Component
 *
 * Product catalog browser for order creation wizard.
 * Supports search, categories, and adding products to order.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */

import { memo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Search,
  Package,
  Plus,
  Minus,
  ShoppingCart,
  Filter,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listProducts } from "@/server/functions/products/products";
import { useOrgFormat } from "@/hooks/use-org-format";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductSelectorProps {
  selectedProducts: OrderLineItemDraft[];
  onProductsChange: (products: OrderLineItemDraft[]) => void;
  className?: string;
}

export interface OrderLineItemDraft {
  productId: string;
  lineNumber: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxType: "gst" | "gst_free" | "input_taxed" | "export";
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  basePrice: number | null;
  type: string;
  status: string;
  trackInventory: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProductSelector = memo(function ProductSelector({
  selectedProducts,
  onProductsChange,
  className,
}: ProductSelectorProps) {
  const { formatCurrency } = useOrgFormat();
  const formatPrice = (price: number) => formatCurrency(price, { cents: false, showCents: true });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Debounce search with proper cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list({ search: debouncedSearch, categoryId: categoryFilter, status: "active" }),
    queryFn: () =>
      listProducts({
        data: {
          page: 1,
          pageSize: 50,
          search: debouncedSearch || undefined,
          status: "active",
        },
      }),
  });

  const products = (data?.products ?? []) as Product[];

  // Add product to selection
  const handleAddProduct = useCallback(
    (product: Product) => {
      const existing = selectedProducts.find((p) => p.productId === product.id);
      if (existing) {
        // Increment quantity
        onProductsChange(
          selectedProducts.map((p) =>
            p.productId === product.id ? { ...p, quantity: p.quantity + 1 } : p
          )
        );
      } else {
        // Add new product
        const lineNumber = String(selectedProducts.length + 1).padStart(2, "0");
        onProductsChange([
          ...selectedProducts,
          {
            productId: product.id,
            lineNumber,
            sku: product.sku || "",
            description: product.name,
            quantity: 1,
            unitPrice: product.basePrice || 0,
            taxType: "gst",
          },
        ]);
      }
    },
    [selectedProducts, onProductsChange]
  );

  // Remove product from selection
  const handleRemoveProduct = useCallback(
    (productId: string) => {
      const filtered = selectedProducts.filter((p) => p.productId !== productId);
      // Re-number line items
      const renumbered = filtered.map((p, i) => ({
        ...p,
        lineNumber: String(i + 1).padStart(2, "0"),
      }));
      onProductsChange(renumbered);
    },
    [selectedProducts, onProductsChange]
  );

  // Update quantity
  const handleQuantityChange = useCallback(
    (productId: string, delta: number) => {
      onProductsChange(
        selectedProducts
          .map((p) => {
            if (p.productId !== productId) return p;
            const newQty = Math.max(0, p.quantity + delta);
            return { ...p, quantity: newQty };
          })
          .filter((p) => p.quantity > 0)
          .map((p, i) => ({ ...p, lineNumber: String(i + 1).padStart(2, "0") }))
      );
    },
    [selectedProducts, onProductsChange]
  );

  // Get quantity for a product
  const getQuantity = (productId: string) =>
    selectedProducts.find((p) => p.productId === productId)?.quantity ?? 0;

  // Calculate totals
  const totalItems = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const subtotal = selectedProducts.reduce(
    (sum, p) => sum + p.quantity * p.unitPrice,
    0
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Products Summary */}
      {selectedProducts.length > 0 && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  {totalItems} item{totalItems !== 1 ? "s" : ""} selected
                </CardTitle>
              </div>
              <span className="text-lg font-semibold">
                {formatPrice(subtotal)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {selectedProducts.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <TruncateTooltip text={item.description} maxLength={35} />
                      </p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            handleQuantityChange(item.productId, -1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="w-20 text-right text-sm">
                        {formatPrice(item.quantity * item.unitPrice)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveProduct(item.productId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {/* Categories would be fetched from API */}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {isLoading
              ? "Loading products..."
              : `${products.length} product${products.length !== 1 ? "s" : ""} available`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">
                Failed to load products. Please try again.
              </div>
            ) : products.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search
                  ? "No products found matching your search."
                  : "No active products found."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                {products.map((product) => {
                  const qty = getQuantity(product.id);
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "p-3 border rounded-lg transition-colors",
                        isSelected && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="font-medium text-sm">
                              <TruncateTooltip text={product.name} maxLength={30} />
                            </p>
                          </div>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground mt-1">
                              SKU: {product.sku}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-semibold">
                              {formatPrice(product.basePrice || 0)}
                            </span>
                            {product.trackInventory && (
                              <Badge variant="outline" className="text-xs">
                                Inventory tracked
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(product.id, -1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {qty}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddProduct(product)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
});

export default ProductSelector;
