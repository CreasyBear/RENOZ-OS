/**
 * ProductQuickAdd Component
 *
 * Quick product search and add widget with recent/frequent products.
 * Optimized for rapid line item addition during quoting.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUICK-QUOTE-UI)
 */

import { memo, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Search,
  Plus,
  History,
  Star,
  Package,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FormatAmount } from "@/components/shared/format";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import { listProducts } from "@/lib/server/functions/products";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductQuickAddProps {
  onAdd: (product: SelectedProduct) => void;
  selectedIds?: string[];
  className?: string;
}

export interface SelectedProduct {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  categoryId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProductQuickAdd = memo(function ProductQuickAdd({
  onAdd,
  selectedIds = [],
  className,
}: ProductQuickAddProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch products
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ status: "active" }),
    queryFn: () => listProducts({ data: { pageSize: 200, status: "active" } }),
  });

  const products = productsQuery.data?.products ?? [];

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;

    const searchLower = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.categoryId?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  // Get frequently used products (mock - in real app would be from usage stats)
  const frequentProducts = useMemo(() => {
    return products.slice(0, 5);
  }, [products]);

  // Get recent products (mock - in real app would be from user history)
  const recentProducts = useMemo(() => {
    return products.slice(0, 3);
  }, [products]);

  const handleAdd = useCallback(
    (product: typeof products[0]) => {
      onAdd({
        id: product.id,
        name: product.name,
        sku: product.sku,
        basePrice: product.basePrice,
        categoryId: product.categoryId ?? undefined,
      });
    },
    [onAdd]
  );

  const isSelected = useCallback(
    (productId: string) => selectedIds.includes(productId),
    [selectedIds]
  );

  const renderProductItem = (product: typeof products[0]) => {
    const selected = isSelected(product.id);

    return (
      <div
        key={product.id}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          "hover:bg-muted/50 transition-colors",
          selected && "bg-muted border-primary"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              {product.sku}
            </Badge>
            <TruncateTooltip text={product.name} className="font-medium" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              <FormatAmount amount={product.basePrice} />
            </span>
            {product.categoryId && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {product.categoryId}
                </span>
              </>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={selected ? "secondary" : "default"}
          onClick={() => handleAdd(product)}
          disabled={selected}
        >
          {selected ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, code, or category..."
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="frequent" className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            Frequent
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {productsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No products match your search" : "No products available"}
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {filteredProducts.map(renderProductItem)}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="frequent" className="mt-4">
          {frequentProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No frequently used products yet
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {frequentProducts.map(renderProductItem)}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          {recentProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recently used products
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {recentProducts.map(renderProductItem)}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected count */}
      {selectedIds.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
        </div>
      )}
    </div>
  );
});

export default ProductQuickAdd;
