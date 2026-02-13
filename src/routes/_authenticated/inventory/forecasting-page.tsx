/**
 * Forecasting Page Component
 *
 * Demand forecasting dashboard with reorder recommendations.
 *
 * @source recommendations from useReorderRecommendations hook
 * @source productForecast from useProductForecast hook
 * @source accuracy from useForecastAccuracy hook
 *
 * @see src/routes/_authenticated/inventory/forecasting.tsx - Route definition
 */
import { useState, useCallback, useMemo } from "react";
import { TrendingUp, Package, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks";
import {
  ReorderRecommendations,
  type ReorderRecommendation,
  CreatePOFromRecommendationDialog,
} from "@/components/domain/inventory";
import {
  ForecastChart,
  type ForecastDataPoint,
  type ForecastPeriod,
  type ForecastAccuracy,
} from "@/components/domain/inventory";
import {
  useReorderRecommendations,
  useProductForecast,
  useForecastAccuracy,
} from "@/hooks/inventory";
import type { getProductForecast } from "@/server/functions/inventory/forecasting";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ForecastingPage() {
  const [activeTab, setActiveTab] = useState<"recommendations" | "forecasts">("recommendations");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>("weekly");

  // Data hooks
  const {
    data: recsData,
    isLoading: isLoadingRecs,
    refetch: refetchRecommendations,
  } = useReorderRecommendations({ urgencyFilter: "all", limit: 50 });

  const {
    data: productForecastData,
    isLoading: isLoadingForecast,
  } = useProductForecast(
    selectedProductId ?? "",
    { period: forecastPeriod, days: 90 },
    !!selectedProductId
  );

  const { data: accuracyData } = useForecastAccuracy(
    { productId: selectedProductId ?? undefined },
    !!selectedProductId
  );

  // Transform data for components
  const recommendations = useMemo(
    () => (recsData?.recommendations ?? []) as ReorderRecommendation[],
    [recsData]
  );
  const summary = recsData?.summary ?? { criticalCount: 0, highCount: 0, totalRecommendations: 0 };

  type ProductForecastItem = Awaited<ReturnType<typeof getProductForecast>>['forecasts'][number];
  const forecastData: ForecastDataPoint[] = (productForecastData?.forecasts ?? []).map((f: ProductForecastItem) => ({
    date: f.forecastDate,
    period: f.forecastPeriod as ForecastPeriod,
    forecastQuantity: Number(f.demandQuantity),
    actualQuantity: undefined,
    confidence: f.confidenceLevel ? Number(f.confidenceLevel) : undefined,
  }));

  const forecastAccuracy: ForecastAccuracy | null = accuracyData?.summary
    ? {
        mape: accuracyData.summary.averageAccuracy ? 100 - accuracyData.summary.averageAccuracy : 0,
        bias: 0,
        accuracy: accuracyData.summary.averageAccuracy ?? 0,
        trend: "stable" as const,
      }
    : null;

  // Get selected product name
  const selectedProduct = recommendations.find((r) => r.productId === selectedProductId);

  // Dialog state for PO creation
  const [selectedRecommendation, setSelectedRecommendation] = useState<ReorderRecommendation | null>(null);
  const [showPODialog, setShowPODialog] = useState(false);

  // Handlers - use refetch from hook instead of queryClient
  const handleRefresh = useCallback(async () => {
    await refetchRecommendations();
  }, [refetchRecommendations]);

  const handleReorder = useCallback((productId: string, _quantity: number) => {
    const recommendation = recommendations.find((r) => r.productId === productId);
    if (recommendation) {
      setSelectedRecommendation(recommendation);
      setShowPODialog(true);
    }
  }, [recommendations, setShowPODialog]);

  const handleReorderAll = useCallback(() => {
    toast.info("Create Bulk Order", {
      description: "Bulk order creation for all urgent items coming soon",
    });
  }, []);

  const handlePOCreated = useCallback(async () => {
    toast.success("Purchase order created successfully");
    // Refresh recommendations using refetch from hook
    await refetchRecommendations();
  }, [refetchRecommendations]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Demand Forecasting"
        description="Forecast demand and manage reorder recommendations"
        actions={
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <PageLayout.Content>
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">
                  Critical
                </span>
              </div>
              <div className="text-2xl font-bold mt-2 text-red-600 tabular-nums">
                {summary.criticalCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Products at or below safety stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">
                  High Priority
                </span>
              </div>
              <div className="text-2xl font-bold mt-2 text-orange-600 tabular-nums">
                {summary.highCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Below reorder point
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">
                  Total Recommendations
                </span>
              </div>
              <div className="text-2xl font-bold mt-2 tabular-nums">
                {summary.totalRecommendations}
              </div>
              <p className="text-xs text-muted-foreground">
                Products need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">
                  Forecast Accuracy
                </span>
              </div>
              <div className="text-2xl font-bold mt-2 text-green-600 tabular-nums">
                {forecastAccuracy ? `${forecastAccuracy.accuracy.toFixed(1)}%` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                Overall accuracy rate
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="recommendations">
              <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
              Reorder Recommendations
            </TabsTrigger>
            <TabsTrigger value="forecasts">
              <TrendingUp className="h-4 w-4 mr-2" aria-hidden="true" />
              Forecast Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations">
            <ReorderRecommendations
              recommendations={recommendations}
              isLoading={isLoadingRecs}
              onReorder={handleReorder}
              onReorderAll={handleReorderAll}
            />
          </TabsContent>

          <TabsContent value="forecasts">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Product selector - list from recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Product</CardTitle>
                  <CardDescription>
                    Choose a product to view its demand forecast
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-auto">
                    {recommendations.map((rec) => (
                      <button
                        key={rec.productId}
                        onClick={() => setSelectedProductId(rec.productId)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedProductId === rec.productId
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium truncate">{rec.productName}</div>
                              <Badge variant="outline" className="text-xs font-mono shrink-0">
                                {rec.productSku}
                              </Badge>
                            </div>
                            {rec.locations && rec.locations.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {rec.locations.length === 1
                                  ? rec.locations[0].locationCode
                                    ? `${rec.locations[0].locationName} (${rec.locations[0].locationCode})`
                                    : rec.locations[0].locationName
                                  : `${rec.locations.length} locations`}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm tabular-nums">
                              {rec.currentStock.toLocaleString()} units
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {recommendations.length === 0 && !isLoadingRecs && (
                      <p className="text-center text-muted-foreground py-8">
                        No products found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Forecast chart */}
              {selectedProductId ? (
                <ForecastChart
                  productName={selectedProduct?.productName ?? ""}
                  data={forecastData}
                  accuracy={forecastAccuracy}
                  period={forecastPeriod}
                  onPeriodChange={setForecastPeriod}
                  isLoading={isLoadingForecast}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-16">
                      <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        Select a product to view its demand forecast
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create PO Dialog */}
        <CreatePOFromRecommendationDialog
          recommendation={selectedRecommendation}
          open={showPODialog}
          onOpenChange={setShowPODialog}
          onSuccess={handlePOCreated}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
