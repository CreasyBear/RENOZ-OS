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
import { useState, useCallback } from "react";
import { Plus, ClipboardList, Play, CheckCircle, ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks";
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
  CountSheet,
  VarianceReport,
  type StockCount,
  type CountItem,
  type CountProgress,
} from "@/components/domain/inventory";
import {
  useStockCounts,
  useStockCount,
  useStartStockCount,
  useUpdateStockCountItem,
  useUpdateStockCount,
} from "@/hooks/inventory";

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
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);

  // Dialog states
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [countToStart, setCountToStart] = useState<StockCount | null>(null);

  // Data hooks - using TanStack Query via hooks
  const {
    data: countsData,
    isLoading,
  } = useStockCounts({ page: 1, pageSize: 50 });

  const {
    data: countDetailData,
    isLoading: isLoadingDetail,
  } = useStockCount(selectedCountId ?? "", !!selectedCountId);

  // Mutation hooks
  const startCountMutation = useStartStockCount();
  const updateItemMutation = useUpdateStockCountItem();
  const updateCountMutation = useUpdateStockCount();

  // Transform data for list
  const counts: StockCount[] = (countsData?.counts ?? []).map((c: any) => ({
    id: c.id,
    countCode: c.countCode,
    countType: c.countType,
    status: c.status,
    locationId: c.locationId,
    assignedTo: c.assignedTo,
    varianceThreshold: c.varianceThreshold ? Number(c.varianceThreshold) : undefined,
    notes: c.notes,
    startedAt: c.startedAt ? new Date(c.startedAt) : null,
    completedAt: c.completedAt ? new Date(c.completedAt) : null,
    createdAt: new Date(c.createdAt),
  }));

  // Transform data for detail/count view
  const selectedCount: StockCount | null = countDetailData?.count
    ? {
        id: countDetailData.count.id,
        countCode: countDetailData.count.countCode,
        countType: countDetailData.count.countType as StockCount["countType"],
        status: countDetailData.count.status as StockCount["status"],
        locationId: countDetailData.count.locationId,
        locationName: countDetailData.count.location?.name,
        assignedTo: countDetailData.count.assignedTo,
        createdAt: new Date(countDetailData.count.createdAt),
        progress: countDetailData.progress,
      }
    : null;

  const progress: CountProgress | null = countDetailData?.progress ?? null;

  const countItems: CountItem[] = (countDetailData?.count?.items ?? []).map((item: any) => ({
    id: item.id,
    inventoryId: item.inventoryId,
    productId: item.inventory?.productId ?? "",
    productName: item.inventory?.product?.name ?? item.inventoryId,
    productSku: item.inventory?.product?.sku ?? "",
    locationName: item.inventory?.location?.name ?? "",
    expectedQuantity: item.expectedQuantity,
    countedQuantity: item.countedQuantity,
    varianceReason: item.varianceReason,
    countedAt: item.countedAt ? new Date(item.countedAt) : null,
  }));

  // Handlers
  const handleViewCount = useCallback(
    (count: StockCount) => {
      setSelectedCountId(count.id);
      if (count.status === "in_progress") {
        setView("count");
      } else {
        setView("detail");
      }
    },
    []
  );

  const handleStartCount = useCallback((count: StockCount) => {
    setCountToStart(count);
    setShowStartDialog(true);
  }, []);

  const handleConfirmStart = useCallback(async () => {
    if (!countToStart) return;
    await startCountMutation.mutateAsync(countToStart.id);
    setShowStartDialog(false);
    setCountToStart(null);
    // Navigate to count view
    setSelectedCountId(countToStart.id);
    setView("count");
  }, [countToStart, startCountMutation]);

  const handleUpdateItem = useCallback(
    async (itemId: string, countedQuantity: number, varianceReason?: string) => {
      if (!selectedCountId) return;
      await updateItemMutation.mutateAsync({
        countId: selectedCountId,
        itemId,
        data: { countedQuantity, varianceReason },
      });
    },
    [selectedCountId, updateItemMutation]
  );

  const handleCompleteCount = useCallback(() => {
    setShowCompleteDialog(true);
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!selectedCountId) return;
    await updateCountMutation.mutateAsync({
      id: selectedCountId,
      data: { status: "completed" },
    });
    setShowCompleteDialog(false);
    setView("list");
    setSelectedCountId(null);
  }, [selectedCountId, updateCountMutation]);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedCountId(null);
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
