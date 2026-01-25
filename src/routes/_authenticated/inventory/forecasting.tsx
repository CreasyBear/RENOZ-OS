/**
 * Forecasting Route
 *
 * Demand forecasting dashboard with reorder recommendations.
 *
 * Features:
 * - Reorder recommendations with urgency
 * - Product forecast details
 * - Forecast accuracy metrics
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { TrendingUp, Package, RefreshCw, AlertTriangle } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks";
import {
  ReorderRecommendations,
  type ReorderRecommendation,
} from "@/components/domain/inventory";
import {
  ForecastChart,
  type ForecastDataPoint,
  type ForecastPeriod,
  type ForecastAccuracy,
} from "@/components/domain/inventory";
import {
  getReorderRecommendations,
  getProductForecast,
  getForecastAccuracy,
} from "@/server/functions/forecasting";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/forecasting" as any)({
  component: ForecastingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Demand Forecasting" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={2} showMetrics />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ForecastingPage() {
  const [activeTab, setActiveTab] = useState<"recommendations" | "forecasts">(
    "recommendations"
  );

  // Data state
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [forecastAccuracy, setForecastAccuracy] = useState<ForecastAccuracy | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>("weekly");

  // Loading states
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<{
    criticalCount: number;
    highCount: number;
    totalRecommendations: number;
  } | null>(null);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoadingRecs(true);
      const data = (await getReorderRecommendations({
        data: { urgencyFilter: "all", limit: 50 },
      })) as any;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setIsLoadingRecs(false);
    }
  }, []);

  // Fetch forecast for a product
  const fetchProductForecast = useCallback(
    async (productId: string) => {
      try {
        setIsLoadingForecast(true);
        const [forecastResult, accuracyResult] = await Promise.all([
          getProductForecast({
            data: { productId, period: forecastPeriod, days: 90 },
          }) as any,
          getForecastAccuracy({ data: { productId } }) as any,
        ]);

        if (forecastResult?.forecasts) {
          setForecastData(
            forecastResult.forecasts.map((f: any) => ({
              date: f.forecastDate,
              period: f.forecastPeriod,
              forecastQuantity: f.demandQuantity,
              actualQuantity: f.actualQuantity,
              confidence: f.confidence,
            }))
          );
        }

        if (accuracyResult) {
          setForecastAccuracy({
            mape: accuracyResult.mape ?? 0,
            bias: accuracyResult.bias ?? 0,
            accuracy: 100 - (accuracyResult.mape ?? 0),
            trend: accuracyResult.trend ?? "stable",
          });
        }
      } catch (error) {
        console.error("Failed to fetch forecast:", error);
        toast.error("Failed to load forecast data");
      } finally {
        setIsLoadingForecast(false);
      }
    },
    [forecastPeriod]
  );

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Fetch forecast when product selected
  useEffect(() => {
    if (selectedProductId) {
      fetchProductForecast(selectedProductId);
    }
  }, [selectedProductId, fetchProductForecast]);

  // Handle reorder
  const handleReorder = useCallback((_productId: string, quantity: number) => {
    toast.info("Create Order", {
      description: `Order ${quantity} units of product - Purchase order creation coming soon`,
    });
  }, []);

  const handleReorderAll = useCallback(() => {
    toast.info("Create Bulk Order", {
      description: "Bulk order creation for all urgent items coming soon",
    });
  }, []);

  // Get selected product name
  const selectedProduct = recommendations.find(
    (r) => r.productId === selectedProductId
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Demand Forecasting"
        description="Forecast demand and manage reorder recommendations"
        actions={
          <Button variant="outline" onClick={fetchRecommendations}>
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
                {summary?.criticalCount ?? 0}
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
                {summary?.highCount ?? 0}
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
                {summary?.totalRecommendations ?? 0}
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{rec.productName}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {rec.productSku}
                            </div>
                          </div>
                          <div className="text-right">
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
      </PageLayout.Content>
    </PageLayout>
  );
}

export default ForecastingPage;
