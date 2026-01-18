/**
 * Inventory Item Tabs Component
 *
 * Tabbed interface for item details: Overview, Movements, Cost Layers, Forecasts, Quality.
 *
 * Accessibility:
 * - Tabs support keyboard arrow navigation
 * - Focus properly managed when switching tabs
 * - tabular-nums for quantity/cost alignment
 */
import { memo, useState, useCallback, useRef } from "react";
import {
  Info,
  History,
  Layers,
  TrendingUp,
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ItemDetail, type ItemDetailData } from "./item-detail";

// ============================================================================
// TYPES
// ============================================================================

export interface MovementRecord {
  id: string;
  movementType: "receive" | "allocate" | "deallocate" | "pick" | "ship" | "adjust" | "return" | "transfer";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  unitCost?: number;
  totalCost?: number;
}

export interface CostLayer {
  id: string;
  receivedAt: Date;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  referenceType?: string;
  referenceId?: string;
  expiryDate?: Date;
}

export interface ForecastData {
  period: string;
  forecastedDemand: number;
  actualDemand?: number;
  variance?: number;
  variancePercent?: number;
  accuracy?: number;
}

export interface QualityRecord {
  id: string;
  inspectionDate: Date;
  inspectorName: string;
  result: "pass" | "fail" | "conditional";
  notes?: string;
  defects?: string[];
}

interface ItemTabsProps {
  item: ItemDetailData;
  movements?: MovementRecord[];
  costLayers?: CostLayer[];
  forecasts?: ForecastData[];
  qualityRecords?: QualityRecord[];
  isLoadingMovements?: boolean;
  isLoadingCostLayers?: boolean;
  isLoadingForecasts?: boolean;
  isLoadingQuality?: boolean;
  onTabChange?: (tab: string) => void;
  className?: string;
}

// ============================================================================
// MOVEMENT TYPE CONFIG
// ============================================================================

const MOVEMENT_TYPE_CONFIG: Record<
  MovementRecord["movementType"],
  { label: string; icon: typeof ArrowUp; color: string }
> = {
  receive: { label: "Receive", icon: ArrowDown, color: "text-green-600" },
  allocate: { label: "Allocate", icon: ArrowLeftRight, color: "text-blue-600" },
  deallocate: { label: "Deallocate", icon: ArrowLeftRight, color: "text-blue-400" },
  pick: { label: "Pick", icon: ArrowUp, color: "text-orange-600" },
  ship: { label: "Ship", icon: ArrowUp, color: "text-purple-600" },
  adjust: { label: "Adjust", icon: ArrowLeftRight, color: "text-yellow-600" },
  return: { label: "Return", icon: ArrowDown, color: "text-teal-600" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, color: "text-indigo-600" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ItemTabs = memo(function ItemTabs({
  item,
  movements = [],
  costLayers = [],
  forecasts = [],
  qualityRecords = [],
  isLoadingMovements,
  isLoadingCostLayers,
  isLoadingForecasts,
  isLoadingQuality,
  onTabChange,
  className,
}: ItemTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation between tabs
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tabs = ["overview", "movements", "cost-layers", "forecasts", "quality"];
    const currentIndex = tabs.indexOf(activeTab);

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      setActiveTab(tabs[newIndex]);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      setActiveTab(tabs[newIndex]);
    }
  }, [activeTab]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    onTabChange?.(value);
  }, [onTabChange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={className}
    >
      <TabsList
        ref={tabsListRef}
        className="grid w-full grid-cols-5"
        onKeyDown={handleKeyDown}
      >
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Info className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="movements" className="flex items-center gap-2">
          <History className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Movements</span>
          {movements.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {movements.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="cost-layers" className="flex items-center gap-2">
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Cost Layers</span>
        </TabsTrigger>
        <TabsTrigger value="forecasts" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Forecasts</span>
        </TabsTrigger>
        <TabsTrigger value="quality" className="flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Quality</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-4">
        <ItemDetail item={item} />
      </TabsContent>

      {/* Movements Tab */}
      <TabsContent value="movements" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Movement History</CardTitle>
            <CardDescription>
              Complete audit trail of all inventory transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMovements ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No movement history</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {movements.map((movement) => {
                    const config = MOVEMENT_TYPE_CONFIG[movement.movementType];
                    const Icon = config.icon;
                    const isPositive = movement.quantity > 0;

                    return (
                      <div
                        key={movement.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className={cn("p-2 rounded", config.color, "bg-current/10")}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{config.label}</span>
                            {movement.referenceType && (
                              <Badge variant="outline" className="text-xs">
                                {movement.referenceType}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {movement.performedBy} • {formatDateTime(movement.performedAt)}
                          </div>
                          {movement.reason && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {movement.reason}
                            </div>
                          )}
                        </div>

                        <div className="text-right tabular-nums">
                          <div className={cn(
                            "font-semibold",
                            isPositive ? "text-green-600" : "text-red-600"
                          )}>
                            {isPositive ? "+" : ""}{movement.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {movement.previousQuantity} → {movement.newQuantity}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Cost Layers Tab */}
      <TabsContent value="cost-layers" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost Layers (FIFO)</CardTitle>
            <CardDescription>
              First-in-first-out cost layer tracking for accurate valuation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCostLayers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : costLayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No cost layers recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {costLayers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={cn(
                      "flex items-center gap-4 p-3 border rounded-lg",
                      index === 0 && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="w-16 text-center">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        L{index + 1}
                      </Badge>
                    </div>

                    <div className="flex-1">
                      <div className="text-sm">
                        Received: {formatDate(layer.receivedAt)}
                      </div>
                      {layer.expiryDate && (
                        <div className={cn(
                          "text-xs",
                          new Date(layer.expiryDate) < new Date()
                            ? "text-red-600"
                            : "text-muted-foreground"
                        )}>
                          Expires: {formatDate(layer.expiryDate)}
                        </div>
                      )}
                    </div>

                    <div className="text-center tabular-nums">
                      <div className="font-medium">{layer.quantityRemaining}</div>
                      <div className="text-xs text-muted-foreground">
                        of {layer.quantityReceived}
                      </div>
                    </div>

                    <div className="text-right tabular-nums w-24">
                      <div className="font-medium">{formatCurrency(layer.unitCost)}</div>
                      <div className="text-xs text-muted-foreground">per unit</div>
                    </div>

                    <div className="text-right tabular-nums w-28">
                      <div className="font-semibold">{formatCurrency(layer.totalCost)}</div>
                      <div className="text-xs text-muted-foreground">total</div>
                    </div>
                  </div>
                ))}

                {/* Total Row */}
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg font-semibold">
                  <div className="flex-1">Total</div>
                  <div className="tabular-nums">
                    {costLayers.reduce((sum, l) => sum + l.quantityRemaining, 0)}
                  </div>
                  <div className="w-24"></div>
                  <div className="text-right tabular-nums w-28">
                    {formatCurrency(costLayers.reduce((sum, l) => sum + l.totalCost, 0))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Forecasts Tab */}
      <TabsContent value="forecasts" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Demand Forecasts</CardTitle>
            <CardDescription>
              Forecasted vs actual demand with accuracy metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingForecasts ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : forecasts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No forecast data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {forecasts.map((forecast) => (
                  <div
                    key={forecast.period}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <div className="w-24 font-medium">{forecast.period}</div>

                    <div className="flex-1 grid grid-cols-3 gap-4 tabular-nums text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Forecast</div>
                        <div className="font-medium">{forecast.forecastedDemand}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Actual</div>
                        <div className="font-medium">
                          {forecast.actualDemand ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Variance</div>
                        <div className={cn(
                          "font-medium",
                          forecast.variance && forecast.variance > 0 && "text-red-600",
                          forecast.variance && forecast.variance < 0 && "text-green-600"
                        )}>
                          {forecast.variance !== undefined
                            ? `${forecast.variance > 0 ? "+" : ""}${forecast.variance}`
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {forecast.accuracy !== undefined && (
                      <Badge
                        variant={forecast.accuracy >= 90 ? "default" : forecast.accuracy >= 70 ? "secondary" : "destructive"}
                      >
                        {forecast.accuracy}% accurate
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Quality Tab */}
      <TabsContent value="quality" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Quality Inspections</CardTitle>
            <CardDescription>
              Inspection history and quality tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingQuality ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : qualityRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No quality inspections recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {qualityRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-4 p-3 border rounded-lg"
                  >
                    <div className={cn(
                      "p-2 rounded",
                      record.result === "pass" && "bg-green-100 text-green-600",
                      record.result === "fail" && "bg-red-100 text-red-600",
                      record.result === "conditional" && "bg-yellow-100 text-yellow-600"
                    )}>
                      <Shield className="h-4 w-4" aria-hidden="true" />
                    </div>

                    <div className="flex-1">
                      <div className="font-medium">
                        {formatDate(record.inspectionDate)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Inspected by {record.inspectorName}
                      </div>
                      {record.notes && (
                        <div className="text-sm mt-1">{record.notes}</div>
                      )}
                      {record.defects && record.defects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {record.defects.map((defect, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-red-600">
                              {defect}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant={
                        record.result === "pass" ? "default" :
                        record.result === "fail" ? "destructive" :
                        "secondary"
                      }
                    >
                      {record.result.charAt(0).toUpperCase() + record.result.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
});

export default ItemTabs;
