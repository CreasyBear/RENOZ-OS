/**
 * Stock Counts Route
 *
 * Cycle counting management with list, detail, and counting views.
 *
 * Features:
 * - Stock count list with filtering
 * - Create/edit count dialogs
 * - Count sheet for execution
 * - Variance analysis and reconciliation
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Plus, ClipboardList, Play, CheckCircle, ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  StockCountList,
  type StockCount,
} from "@/components/domain/inventory/stock-count-list";
import {
  CountSheet,
  type CountItem,
  type CountProgress,
} from "@/components/domain/inventory/count-sheet";
import { VarianceReport } from "@/components/domain/inventory/variance-report";
import {
  listStockCounts,
  getStockCount,
  startStockCount,
  updateStockCountItem,
  updateStockCount,
} from "@/server/functions/stock-counts";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/counts" as any)({
  component: StockCountsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Stock Counts" />
      <PageLayout.Content>
        <InventoryTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function StockCountsPage() {

  // View state
  const [view, setView] = useState<"list" | "detail" | "count">("list");
  const [activeTab, setActiveTab] = useState<"count" | "variances">("count");

  // Data state
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [progress, setProgress] = useState<CountProgress | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Dialog states
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [countToStart, setCountToStart] = useState<StockCount | null>(null);

  // Fetch stock counts
  const fetchCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listStockCounts({ data: { page: 1, pageSize: 50 } }) as {
        counts: any[];
        total: number;
        page: number;
        pageSize: number;
      };
      if (data?.counts) {
        setCounts(
          data.counts.map((c: any) => ({
            id: c.id,
            countCode: c.countCode,
            countType: c.countType,
            status: c.status,
            locationId: c.locationId,
            assignedTo: c.assignedTo,
            varianceThreshold: c.varianceThreshold
              ? Number(c.varianceThreshold)
              : undefined,
            notes: c.notes,
            startedAt: c.startedAt ? new Date(c.startedAt) : null,
            completedAt: c.completedAt ? new Date(c.completedAt) : null,
            createdAt: new Date(c.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch stock counts:", error);
      toast.error("Failed to load stock counts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch count detail
  const fetchCountDetail = useCallback(async (countId: string) => {
    try {
      setIsLoadingDetail(true);
      const data = await getStockCount({ data: { id: countId } }) as {
        count: any;
        progress: CountProgress;
      };
      if (data) {
        setSelectedCount({
          id: data.count.id,
          countCode: data.count.countCode,
          countType: data.count.countType as StockCount["countType"],
          status: data.count.status as StockCount["status"],
          locationId: data.count.locationId,
          locationName: data.count.location?.name,
          assignedTo: data.count.assignedTo,
          createdAt: new Date(data.count.createdAt),
          progress: data.progress,
        });
        setProgress(data.progress);
        setCountItems(
          data.count.items.map((item: any) => ({
            id: item.id,
            inventoryId: item.inventoryId,
            productId: "", // TODO: Join with inventory
            productName: item.inventoryId, // TODO: Get product name
            productSku: "", // TODO: Get SKU
            locationName: "", // TODO: Get location
            expectedQuantity: item.expectedQuantity,
            countedQuantity: item.countedQuantity,
            varianceReason: item.varianceReason,
            countedAt: item.countedAt ? new Date(item.countedAt) : null,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch count detail:", error);
      toast.error("Failed to load count details");
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCounts();
  }, []);

  // Handlers
  const handleViewCount = useCallback(
    (count: StockCount) => {
      setSelectedCount(count);
      fetchCountDetail(count.id);
      if (count.status === "in_progress") {
        setView("count");
      } else {
        setView("detail");
      }
    },
    [fetchCountDetail]
  );

  const handleStartCount = useCallback((count: StockCount) => {
    setCountToStart(count);
    setShowStartDialog(true);
  }, []);

  const handleConfirmStart = useCallback(async () => {
    if (!countToStart) return;
    try {
      const result = await startStockCount({ data: { id: countToStart.id } }) as {
        count: any;
        items: any[];
        progress: CountProgress;
      };
      toast.success("Stock count started");
      setShowStartDialog(false);
      setCountToStart(null);
      // Navigate to count view
      setSelectedCount({
        ...countToStart,
        status: "in_progress",
        progress: result.progress,
      });
      setProgress(result.progress);
      setCountItems(
        result.items.map((item: any) => ({
          id: item.id,
          inventoryId: item.inventoryId,
          productId: "",
          productName: item.inventoryId,
          productSku: "",
          locationName: "",
          expectedQuantity: item.expectedQuantity,
          countedQuantity: null,
        }))
      );
      setView("count");
      fetchCounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to start count");
    }
  }, [countToStart, fetchCounts]);

  const handleUpdateItem = useCallback(
    async (itemId: string, countedQuantity: number, varianceReason?: string) => {
      if (!selectedCount) return;
      try {
        await updateStockCountItem({
          data: {
            countId: selectedCount.id,
            itemId,
            data: { countedQuantity, varianceReason },
          },
        });
        // Update local state
        setCountItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, countedQuantity, varianceReason }
              : item
          )
        );
        // Update progress
        const counted = countItems.filter(
          (i) => i.id === itemId || i.countedQuantity !== null
        ).length;
        const variances = countItems.filter((i) => {
          if (i.id === itemId) {
            return countedQuantity !== i.expectedQuantity;
          }
          return (
            i.countedQuantity !== null &&
            i.countedQuantity !== i.expectedQuantity
          );
        }).length;
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                countedItems: counted,
                pendingItems: prev.totalItems - counted,
                varianceItems: variances,
                completionPercentage: Math.round(
                  (counted / prev.totalItems) * 100
                ),
              }
            : null
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to update item");
      }
    },
    [selectedCount, countItems]
  );

  const handleCompleteCount = useCallback(() => {
    setShowCompleteDialog(true);
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!selectedCount) return;
    try {
      await updateStockCount({
        data: {
          id: selectedCount.id,
          data: { status: "completed" },
        },
      });
      toast.success("Stock count completed");
      setShowCompleteDialog(false);
      setView("list");
      fetchCounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete count");
    }
  }, [selectedCount, fetchCounts]);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedCount(null);
  }, []);

  const handleNewCount = useCallback(() => {
    toast.info("New Count", { description: "Count creation dialog coming soon" });
  }, []);

  // List View
  if (view === "list") {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Stock Counts"
          description="Manage cycle counts and physical inventory"
          actions={
            <Button onClick={handleNewCount}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              New Count
            </Button>
          }
        />

        <PageLayout.Content>
          <StockCountList
            counts={counts}
            isLoading={isLoading}
            onView={handleViewCount}
            onStart={handleStartCount}
          />
        </PageLayout.Content>

        {/* Start Confirmation */}
        <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Stock Count</AlertDialogTitle>
              <AlertDialogDescription>
                This will generate a count sheet with all inventory items
                {countToStart?.locationName &&
                  ` in ${countToStart.locationName}`}
                . Are you ready to begin counting?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStart}>
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                Start Count
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageLayout>
    );
  }

  // Count/Detail View
  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={selectedCount?.countCode ?? "Stock Count"}
        description={
          selectedCount?.status === "in_progress"
            ? "Enter counted quantities for each item"
            : `Count ${selectedCount?.status}`
        }
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to List
          </Button>
        }
      />

      <PageLayout.Content>
        {selectedCount?.status === "in_progress" ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="count">
                <ClipboardList className="h-4 w-4 mr-2" aria-hidden="true" />
                Count Sheet
              </TabsTrigger>
              <TabsTrigger value="variances">
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Variances
              </TabsTrigger>
            </TabsList>

            <TabsContent value="count">
              {progress && (
                <CountSheet
                  items={countItems}
                  progress={progress}
                  isLoading={isLoadingDetail}
                  onUpdateItem={handleUpdateItem}
                  onComplete={
                    progress.pendingItems === 0 ? handleCompleteCount : undefined
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="variances">
              <VarianceReport items={countItems} isLoading={isLoadingDetail} />
            </TabsContent>
          </Tabs>
        ) : (
          <VarianceReport items={countItems} isLoading={isLoadingDetail} />
        )}
      </PageLayout.Content>

      {/* Complete Confirmation */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Stock Count</AlertDialogTitle>
            <AlertDialogDescription>
              {progress?.varianceItems && progress.varianceItems > 0
                ? `There are ${progress.varianceItems} items with variances. Completing the count will apply these adjustments to inventory.`
                : "All items match expected quantities. Complete the count?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>
              <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Complete Count
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}

export default StockCountsPage;
