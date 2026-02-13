/**
 * PriceHistory View (Presenter)
 *
 * Pure presentation component for price history.
 * Receives all data via props per Container/Presenter pattern.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { History, TrendingUp, TrendingDown, Minus, User, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

// ============================================================================
// TYPES
// ============================================================================

export interface PriceHistoryEntry {
  id: string;
  changeType: string;
  previousPrice: number | null;
  newPrice: number | null;
  previousDiscountPercent: number | null;
  newDiscountPercent: number | null;
  tierId: string | null;
  customerId: string | null;
  reason: string | null;
  changedBy: string;
  changedAt: Date;
}

export interface PriceHistoryViewProps {
  history: PriceHistoryEntry[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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

// Format date/time
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

// Get change type label and styling
function getChangeTypeInfo(changeType: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  const types: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    base_price: { label: "Base Price", variant: "default" },
    cost_price: { label: "Cost Price", variant: "secondary" },
    tier_created: { label: "Tier Created", variant: "outline" },
    tier_updated: { label: "Tier Updated", variant: "outline" },
    tier_deleted: { label: "Tier Deleted", variant: "destructive" },
    customer_price: { label: "Customer Price", variant: "secondary" },
    bulk_update: { label: "Bulk Update", variant: "default" },
  };
  return types[changeType] || { label: changeType, variant: "outline" };
}

// Determine if price went up, down, or stayed same
function getPriceDirection(previous: number | null, current: number | null): "up" | "down" | "same" {
  if (previous === null || current === null) return "same";
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "same";
}

// ============================================================================
// PRESENTER
// ============================================================================

export function PriceHistoryView({
  history,
  isLoading,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PriceHistoryViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Price History
        </CardTitle>
        <CardDescription>
          Track all price changes for this product
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            title="No price history"
            message="Price changes will be recorded here when they occur"
          />
        ) : (
          <div className="space-y-4">
            {/* History entries */}
            <div className="space-y-3">
              {history.map((entry) => {
                const { label, variant } = getChangeTypeInfo(entry.changeType);
                const direction = getPriceDirection(entry.previousPrice, entry.newPrice);

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Direction indicator */}
                    <div className="flex-shrink-0 mt-1">
                      {direction === "up" && (
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      {direction === "down" && (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {direction === "same" && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={variant}>{label}</Badge>
                        {entry.customerId && (
                          <Badge variant="outline">Customer-specific</Badge>
                        )}
                        {entry.tierId && (
                          <Badge variant="outline">Tier</Badge>
                        )}
                      </div>

                      {/* Price change */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {formatPrice(entry.previousPrice)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">
                          {formatPrice(entry.newPrice)}
                        </span>
                        {entry.previousPrice && entry.newPrice && (
                          <span
                            className={
                              direction === "up"
                                ? "text-red-600"
                                : direction === "down"
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }
                          >
                            ({direction === "up" ? "+" : ""}
                            {(
                              ((entry.newPrice - entry.previousPrice) /
                                entry.previousPrice) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      {entry.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.reason}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(entry.changedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} -{" "}
                  {Math.min((page + 1) * pageSize, total)} of {total} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
