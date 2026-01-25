/**
 * Inventory Alerts Route
 *
 * Manage inventory alert rules and view triggered alerts.
 *
 * Features:
 * - Alert rules configuration
 * - Active alerts dashboard
 * - Alert history
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Plus, Bell, Settings, History } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertsPanel,
  type InventoryAlert,
} from "@/components/domain/inventory";
import { AlertConfigForm } from "@/components/domain/inventory";
import {
  AlertsList,
  type AlertRule,
} from "@/components/domain/inventory";
import {
  listAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  getTriggeredAlerts,
} from "@/server/functions/alerts";
import { listLocations } from "@/server/functions/locations";
import { listProducts } from "@/lib/server/functions/products";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/alerts" as any)({
  component: AlertsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory Alerts" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  name: string;
  code: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AlertsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "rules" | "history">(
    "active"
  );

  // Data state
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<InventoryAlert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Loading states
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isLoadingTriggered, setIsLoadingTriggered] = useState(true);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);

  // Fetch alert rules
  const fetchAlertRules = useCallback(async () => {
    try {
      setIsLoadingRules(true);
      const data = (await listAlerts({
        data: { page: 1, pageSize: 100 },
      })) as any;
      if (data?.alerts) {
        setAlertRules(
          data.alerts.map((a: any) => ({
            id: a.id,
            alertType: a.alertType,
            name: a.name,
            productId: a.productId,
            locationId: a.locationId,
            thresholdValue: a.thresholdValue,
            thresholdPercentage: a.thresholdPercentage,
            isActive: a.isActive,
            notifyEmail: a.notifyEmail ?? false,
            notifyInApp: a.notifyInApp ?? true,
            triggeredCount: a.triggeredCount ?? 0,
            lastTriggeredAt: a.lastTriggeredAt ? new Date(a.lastTriggeredAt) : null,
            createdAt: new Date(a.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch alert rules:", error);
      toast.error("Failed to load alert rules");
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  // Fetch triggered alerts
  const fetchTriggeredAlerts = useCallback(async () => {
    try {
      setIsLoadingTriggered(true);
      const data = (await getTriggeredAlerts()) as any;
      if (data?.alerts) {
        setTriggeredAlerts(
          data.alerts.map((a: any) => ({
            id: a.alert.id,
            type: a.alert.alertType,
            severity: a.severity === "critical" ? "critical" : a.severity === "high" ? "warning" : "info",
            title: a.alert.name,
            message: a.message,
            productId: a.product?.id,
            productName: a.product?.name,
            locationId: a.location?.id,
            locationName: a.location?.name,
            threshold: a.thresholdValue,
            currentValue: a.currentValue,
            createdAt: new Date(),
            acknowledged: false,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch triggered alerts:", error);
    } finally {
      setIsLoadingTriggered(false);
    }
  }, []);

  // Fetch products and locations for form
  const fetchFormData = useCallback(async () => {
    try {
      const [productsData, locationsData] = await Promise.all([
        listProducts({ data: { page: 1, pageSize: 100 } }) as any,
        listLocations({ data: { page: 1, pageSize: 100 } }) as any,
      ]);

      if (productsData?.products) {
        setProducts(
          productsData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
          }))
        );
      }

      if (locationsData?.locations) {
        setLocations(
          locationsData.locations.map((l: any) => ({
            id: l.id,
            name: l.name,
            code: l.code,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch form data:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAlertRules();
    fetchTriggeredAlerts();
    fetchFormData();
  }, []);

  // Handle create alert
  const handleCreateAlert = useCallback(
    async (data: any) => {
      try {
        await createAlert({ data });
        toast.success("Alert created");
        setShowCreateDialog(false);
        fetchAlertRules();
      } catch (error: any) {
        toast.error(error.message || "Failed to create alert");
        throw error;
      }
    },
    [fetchAlertRules]
  );

  // Handle edit alert
  const handleEditAlert = useCallback(
    async (data: any) => {
      if (!editingAlert) return;
      try {
        await updateAlert({
          data: { id: editingAlert.id, data },
        });
        toast.success("Alert updated");
        setEditingAlert(null);
        fetchAlertRules();
      } catch (error: any) {
        toast.error(error.message || "Failed to update alert");
        throw error;
      }
    },
    [editingAlert, fetchAlertRules]
  );

  // Handle delete alert
  const handleDeleteAlert = useCallback(
    async (alert: AlertRule) => {
      try {
        await deleteAlert({ data: { id: alert.id } });
        toast.success("Alert deleted");
        fetchAlertRules();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete alert");
      }
    },
    [fetchAlertRules]
  );

  // Handle toggle active
  const handleToggleActive = useCallback(
    async (alertId: string, isActive: boolean) => {
      try {
        await updateAlert({
          data: { id: alertId, data: { isActive } },
        });
        toast.success(isActive ? "Alert enabled" : "Alert disabled");
        fetchAlertRules();
      } catch (error: any) {
        toast.error(error.message || "Failed to update alert");
      }
    },
    [fetchAlertRules]
  );

  // Handle acknowledge alert
  const handleAcknowledgeAlert = useCallback((_alertId: string) => {
    toast.info("Acknowledge", { description: "Alert acknowledgement coming soon" });
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory Alerts"
        description="Monitor inventory conditions and manage alert rules"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            New Alert Rule
          </Button>
        }
      />

      <PageLayout.Content>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
              Active Alerts
              {triggeredAlerts.length > 0 && (
                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {triggeredAlerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
              Alert Rules
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" aria-hidden="true" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <AlertsPanel
              alerts={triggeredAlerts}
              isLoading={isLoadingTriggered}
              onAcknowledge={handleAcknowledgeAlert}
            />
          </TabsContent>

          <TabsContent value="rules">
            <AlertsList
              alerts={alertRules}
              isLoading={isLoadingRules}
              onEdit={setEditingAlert}
              onDelete={handleDeleteAlert}
              onToggleActive={handleToggleActive}
            />
          </TabsContent>

          <TabsContent value="history">
            <div className="text-center py-12 text-muted-foreground">
              Alert history view coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </PageLayout.Content>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
          </DialogHeader>
          <AlertConfigForm
            products={products}
            locations={locations}
            onSubmit={handleCreateAlert}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingAlert}
        onOpenChange={(open) => !open && setEditingAlert(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Alert Rule</DialogTitle>
          </DialogHeader>
          {editingAlert && (
            <AlertConfigForm
              products={products}
              locations={locations}
              initialValues={{
                alertType: editingAlert.alertType,
                name: editingAlert.name,
                productId: editingAlert.productId,
                locationId: editingAlert.locationId,
                thresholdValue: editingAlert.thresholdValue,
                thresholdPercentage: editingAlert.thresholdPercentage ?? undefined,
                notifyEmail: editingAlert.notifyEmail,
                notifyInApp: editingAlert.notifyInApp,
                isActive: editingAlert.isActive,
              }}
              onSubmit={handleEditAlert}
              onCancel={() => setEditingAlert(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export default AlertsPage;
