/**
 * ComponentSelector View (Presenter)
 *
 * Pure presentation component for component selector.
 * Receives all data via props per Container/Presenter pattern.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { Search, Plus, Package, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SelectedComponent } from "./component-selector-container";

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  status: string;
  basePrice: number | null;
}

export interface ComponentSelectorViewProps {
  open: boolean;
  searchQuery: string;
  products: Product[];
  selected: Map<string, SelectedComponent>;
  isLoading: boolean;
  onSearchQueryChange: (query: string) => void;
  onOpenChange: (open: boolean) => void;
  onToggleProduct: (product: Product) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onToggleOptional: (productId: string) => void;
  onSubmit: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

// ============================================================================
// PRESENTER
// ============================================================================

export function ComponentSelectorView({
  open,
  searchQuery,
  products,
  selected,
  isLoading,
  onSearchQueryChange,
  onOpenChange,
  onToggleProduct,
  onUpdateQuantity,
  onToggleOptional,
  onSubmit,
}: ComponentSelectorViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Components</DialogTitle>
          <DialogDescription>
            Search for products to add as bundle components
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="pl-9"
            />
          </div>

          {/* Search results */}
          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-sm">
                  {searchQuery.length < 2
                    ? "Type to search products"
                    : "No products found"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {products.map((product) => {
                  const isSelected = selected.has(product.id);
                  const component = selected.get(product.id);

                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => onToggleProduct(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded flex items-center justify-center ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.sku} · {formatPrice(product.basePrice)}
                          </p>
                        </div>
                      </div>

                      {isSelected && component && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min="1"
                            value={component.quantity}
                            onChange={(e) => onUpdateQuantity(product.id, parseInt(e.target.value) || 1)}
                            className="w-20 h-8"
                          />
                          <Button
                            variant={component.isOptional ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => onToggleOptional(product.id)}
                          >
                            {component.isOptional ? "Optional" : "Required"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected summary */}
          {selected.size > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                Selected: {selected.size} component{selected.size !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(selected.values()).map((c) => (
                  <Badge key={c.product.id} variant="secondary">
                    {c.product.sku} × {c.quantity}
                    {c.isOptional && " (optional)"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={selected.size === 0}>
            Add {selected.size} Component{selected.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
