/**
 * Count Sheet Component
 *
 * Interactive counting interface for stock counts with barcode scanning support.
 *
 * Features:
 * - Item-by-item counting with quantity input
 * - Quick variance detection with visual indicators
 * - Barcode scanning simulation (text input)
 * - Bulk count submission
 *
 * Accessibility:
 * - Keyboard navigation between items
 * - Clear visual feedback for variances
 * - Numeric inputs with min/max constraints
 */
import { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  Package,
  Check,
  X,
  AlertTriangle,
  Search,
  RotateCcw,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// TYPES
// ============================================================================

export interface CountItem {
  id: string;
  inventoryId: string;
  productId: string;
  productName: string;
  productSku: string;
  locationName: string;
  binLocation?: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  varianceReason?: string;
  countedAt?: Date | null;
  unitCost?: number;
}

export interface CountProgress {
  totalItems: number;
  countedItems: number;
  pendingItems: number;
  varianceItems: number;
  completionPercentage: number;
}

interface CountSheetProps {
  items: CountItem[];
  progress: CountProgress;
  isLoading?: boolean;
  onUpdateItem: (
    itemId: string,
    countedQuantity: number,
    varianceReason?: string
  ) => Promise<void>;
  onComplete?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CountSheet = memo(function CountSheet({
  items,
  progress,
  isLoading,
  onUpdateItem,
  onComplete,
  className,
}: CountSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null);
  const [editingReason, setEditingReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter items by search
  const filteredItems = items.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.binLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Get variance for an item
  const getVariance = (item: CountItem) => {
    if (item.countedQuantity === null) return null;
    return item.countedQuantity - item.expectedQuantity;
  };

  // Start editing an item
  const handleStartEdit = useCallback((item: CountItem) => {
    setActiveItemId(item.id);
    setEditingQuantity(item.countedQuantity ?? item.expectedQuantity);
    setEditingReason(item.varianceReason ?? "");
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setActiveItemId(null);
    setEditingQuantity(null);
    setEditingReason("");
  }, []);

  // Save count
  const handleSaveCount = useCallback(
    async (item: CountItem) => {
      if (editingQuantity === null) return;

      try {
        setIsSubmitting(true);
        const variance = editingQuantity - item.expectedQuantity;
        const reason = variance !== 0 ? editingReason : undefined;
        await onUpdateItem(item.id, editingQuantity, reason);
        handleCancelEdit();
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingQuantity, editingReason, onUpdateItem, handleCancelEdit]
  );

  // Quick count: set to expected
  const handleQuickAccept = useCallback(
    async (item: CountItem) => {
      try {
        setIsSubmitting(true);
        await onUpdateItem(item.id, item.expectedQuantity);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onUpdateItem]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !activeItemId) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeItemId]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Count Progress</h3>
              <p className="text-sm text-muted-foreground">
                {progress.countedItems} of {progress.totalItems} items counted
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">
                {progress.completionPercentage}%
              </div>
              {progress.varianceItems > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  {progress.varianceItems} variances
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={progress.completionPercentage}
            className="h-3"
            aria-label={`${progress.completionPercentage}% complete`}
          />
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchInputRef}
          placeholder="Search by product, SKU, or bin... (press /)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Count Items */}
      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-2 pr-4">
          {filteredItems.map((item) => {
            const variance = getVariance(item);
            const isActive = activeItemId === item.id;
            const isCounted = item.countedQuantity !== null;
            const hasVariance = variance !== null && variance !== 0;

            return (
              <Card
                key={item.id}
                className={cn(
                  "transition-colors",
                  isActive && "ring-2 ring-primary",
                  isCounted && !hasVariance && "bg-green-50/50 dark:bg-green-950/20",
                  hasVariance && "bg-orange-50/50 dark:bg-orange-950/20"
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package
                          className="h-4 w-4 text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
                        <span className="font-medium truncate">
                          {item.productName}
                        </span>
                        {isCounted && (
                          <CheckCircle2
                            className="h-4 w-4 text-green-600 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="font-mono">{item.productSku}</span>
                        {item.binLocation && (
                          <>
                            <span>•</span>
                            <span>{item.binLocation}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Count Section */}
                    <div className="flex items-center gap-4">
                      {/* Expected */}
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Expected</div>
                        <div className="text-lg font-bold tabular-nums">
                          {item.expectedQuantity}
                        </div>
                      </div>

                      {/* Counted */}
                      {isActive ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setEditingQuantity(Math.max(0, (editingQuantity ?? 0) - 1))
                            }
                            disabled={isSubmitting}
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            value={editingQuantity ?? ""}
                            onChange={(e) =>
                              setEditingQuantity(
                                e.target.value ? parseInt(e.target.value) : 0
                              )
                            }
                            className="w-20 text-center tabular-nums"
                            disabled={isSubmitting}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setEditingQuantity((editingQuantity ?? 0) + 1)
                            }
                            disabled={isSubmitting}
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-muted-foreground">Counted</div>
                          <div
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              hasVariance && "text-orange-600"
                            )}
                          >
                            {item.countedQuantity ?? "—"}
                          </div>
                        </div>
                      )}

                      {/* Variance */}
                      {variance !== null && !isActive && (
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-muted-foreground">Variance</div>
                          <div
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              variance > 0 && "text-green-600",
                              variance < 0 && "text-red-600"
                            )}
                          >
                            {variance > 0 ? "+" : ""}
                            {variance}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {isActive ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            size="icon"
                            onClick={() => handleSaveCount(item)}
                            disabled={isSubmitting}
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!isCounted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickAccept(item)}
                              disabled={isSubmitting}
                              title="Accept expected quantity"
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEdit(item)}
                            disabled={isSubmitting}
                          >
                            {isCounted ? (
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              "Count"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variance Reason Input */}
                  {isActive &&
                    editingQuantity !== null &&
                    editingQuantity !== item.expectedQuantity && (
                      <div className="mt-4 pt-4 border-t">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle
                            className="h-4 w-4 text-orange-500"
                            aria-hidden="true"
                          />
                          Variance Reason
                        </label>
                        <Textarea
                          placeholder="Explain the variance..."
                          value={editingReason}
                          onChange={(e) => setEditingReason(e.target.value)}
                          className="mt-2"
                          rows={2}
                        />
                      </div>
                    )}

                  {/* Existing Variance Reason */}
                  {!isActive && item.varianceReason && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">Reason:</span> {item.varianceReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Complete Button */}
      {onComplete && progress.pendingItems === 0 && (
        <Button onClick={onComplete} className="w-full">
          <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Complete Stock Count
        </Button>
      )}
    </div>
  );
});

export default CountSheet;
