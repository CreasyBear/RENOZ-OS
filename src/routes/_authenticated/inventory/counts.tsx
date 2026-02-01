/**
 * Stock Counts Route
 *
 * Cycle counting management with list, detail, and counting views.
 *
 * LAYOUT: full-width (data-dense views)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Plus, ClipboardList, Play, CheckCircle, ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useCompleteStockCount,
  useCancelStockCount,
  useCreateStockCount,
  useLocations,
  type WarehouseLocation,
} from "@/hooks/inventory";
import type { StockCountItemWithRelations } from "@/lib/schemas/inventory";
import type { StockCount as StockCountDb } from "drizzle/schema/inventory/inventory";

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
      <PageLayout.Header title="Stock Counts" description="Manage cycle counts and physical inventory" />
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [countToStart, setCountToStart] = useState<StockCount | null>(null);
  
  // Create count form state
  const [countCode, setCountCode] = useState("");
  const [countType, setCountType] = useState<"cycle" | "full" | "spot">("cycle");
  const [locationId, setLocationId] = useState<string>("");
  const [varianceThreshold, setVarianceThreshold] = useState(5);
  const [notes, setNotes] = useState("");

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
  const completeCountMutation = useCompleteStockCount();
  const cancelCountMutation = useCancelStockCount();
  const createCountMutation = useCreateStockCount();
  
  // Locations for dropdown
  const { locations: locationsData } = useLocations({ initialFilters: {}, autoFetch: true });

  // Transform data for list
  const counts: StockCount[] = (countsData?.counts ?? []).map((c: StockCountDb) => ({
    id: c.id,
    countCode: c.countCode,
    countType: c.countType as StockCount["countType"],
    status: c.status as StockCount["status"],
    locationId: c.locationId ?? undefined,
    assignedTo: c.assignedTo ?? undefined,
    varianceThreshold: c.varianceThreshold ? Number(c.varianceThreshold) : undefined,
    notes: c.notes ?? undefined,
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

  const countItems: CountItem[] = (countDetailData?.count?.items ?? [])
    .filter((item: StockCountItemWithRelations) => item.id) // Filter out items without IDs to prevent duplicate empty keys
    .map((item: StockCountItemWithRelations) => ({
      id: item.id,
      inventoryId: item.inventoryId,
      productId: item.inventory?.productId ?? "",
      productName: item.inventory?.product?.name ?? item.inventoryId,
      productSku: item.inventory?.product?.sku ?? "",
      locationName: item.inventory?.location?.name ?? "",
      expectedQuantity: item.expectedQuantity,
      countedQuantity: item.countedQuantity,
      varianceReason: item.varianceReason ?? undefined,
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
    await completeCountMutation.mutateAsync({ id: selectedCountId, applyAdjustments: true });
    setShowCompleteDialog(false);
    setView("list");
    setSelectedCountId(null);
  }, [selectedCountId, completeCountMutation]);
  
  const handleCancelCount = useCallback(() => {
    setShowCancelDialog(true);
  }, []);
  
  const handleConfirmCancel = useCallback(async () => {
    if (!selectedCountId) return;
    await cancelCountMutation.mutateAsync(selectedCountId);
    setShowCancelDialog(false);
    setView("list");
    setSelectedCountId(null);
  }, [selectedCountId, cancelCountMutation]);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedCountId(null);
    setShowCancelDialog(false);
    setShowCompleteDialog(false);
  }, []);

  const handleNewCount = useCallback(() => {
    // Reset form
    setCountCode("");
    setCountType("cycle");
    setLocationId("");
    setVarianceThreshold(5);
    setNotes("");
    setShowCreateDialog(true);
  }, []);
  
  const handleCreateCount = useCallback(async () => {
    if (!countCode.trim()) {
      toast.error("Count code is required");
      return;
    }
    
    await createCountMutation.mutateAsync({
      countCode: countCode.trim(),
      countType,
      locationId: locationId || undefined,
      varianceThreshold,
      notes: notes || undefined,
    });
    
    setShowCreateDialog(false);
  }, [countCode, countType, locationId, varianceThreshold, notes, createCountMutation]);

  // Determine content based on view
  const isListView = view === "list";
  
  const title = isListView ? "Stock Counts" : (selectedCount?.countCode ?? "Stock Count");
  const description = isListView 
    ? "Manage cycle counts and physical inventory" 
    : (selectedCount?.status === "in_progress"
        ? "Enter counted quantities for each item"
        : `Count ${selectedCount?.status}`);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={title}
        description={description}
        actions={
          isListView ? (
            <Button onClick={handleNewCount}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              New Count
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {selectedCount?.status === "in_progress" && (
                <Button variant="destructive" onClick={handleCancelCount}>
                  Cancel Count
                </Button>
              )}
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to List
              </Button>
            </div>
          )
        }
      />

      <PageLayout.Content>
        {isListView ? (
          <StockCountList
            counts={counts}
            isLoading={isLoading}
            onView={handleViewCount}
            onStart={handleStartCount}
          />
        ) : selectedCount?.status === "in_progress" ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "count" | "variances")}>
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

      {/* List View Dialogs */}
      {isListView && (
        <>
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

          {/* Create Count Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Stock Count</DialogTitle>
                <DialogDescription>
                  Create a new stock count to track physical inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="countCode">Count Code *</Label>
                  <Input
                    id="countCode"
                    value={countCode}
                    onChange={(e) => setCountCode(e.target.value)}
                    placeholder="e.g., COUNT-2026-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="countType">Count Type</Label>
                  <Select value={countType} onValueChange={(v) => setCountType(v as "cycle" | "full" | "spot")}>
                    <SelectTrigger id="countType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cycle">Cycle Count</SelectItem>
                      <SelectItem value="full">Full Count</SelectItem>
                      <SelectItem value="spot">Spot Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Select 
                    value={locationId || "all"} 
                    onValueChange={(v) => setLocationId(v === "all" ? "" : v)}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="all-locations" value="all">All locations</SelectItem>
                      {(locationsData ?? [])
                        .filter((loc: WarehouseLocation) => loc.id) // Filter out locations without IDs
                        .map((loc: WarehouseLocation) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="varianceThreshold">Variance Threshold (%)</Label>
                  <Input
                    id="varianceThreshold"
                    type="number"
                    min={0}
                    max={100}
                    value={varianceThreshold}
                    onChange={(e) => setVarianceThreshold(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes about this count"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCount} 
                  disabled={createCountMutation.isPending || !countCode.trim()}
                >
                  {createCountMutation.isPending ? "Creating..." : "Create Count"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Detail View Dialogs */}
      {!isListView && (
        <>
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
          
          {/* Cancel Confirmation */}
          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Stock Count</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this stock count? All progress will be lost and this action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>Keep Count</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Cancel Count
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </PageLayout>
  );
}

export default StockCountsPage;
