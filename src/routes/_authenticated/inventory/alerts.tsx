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
import { useState, useCallback } from "react";
import { Plus, Bell, Settings, History } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useAlerts,
  useTriggeredAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useToggleAlertActive,
  useAcknowledgeAlert,
  useLocations,
} from "@/hooks/inventory";
import { useProducts } from "@/hooks/products";

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
// MAIN COMPONENT
// ============================================================================

function AlertsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "rules" | "history">("active");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);

  // Data hooks
  const { data: alertsData, isLoading: isLoadingRules } = useAlerts({ pageSize: 100 });
  const { data: triggeredData, isLoading: isLoadingTriggered } = useTriggeredAlerts();
  const { data: productsData } = useProducts({ pageSize: 100 });
  const { locations: locationsData } = useLocations({ autoFetch: true });

  // Mutation hooks
  const createAlertMutation = useCreateAlert();
  const updateAlertMutation = useUpdateAlert();
  const deleteAlertMutation = useDeleteAlert();
  const toggleActiveMutation = useToggleAlertActive();
  const acknowledgeMutation = useAcknowledgeAlert();

  // Transform data for components
  const alertRules: AlertRule[] = (alertsData?.alerts ?? []).map((a: any) => ({
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
  }));

  const triggeredAlerts: InventoryAlert[] = (triggeredData?.alerts ?? []).map((a: any) => ({
    id: a.alert?.id ?? a.id,
    alertType: a.alert?.alertType ?? a.alertType ?? "low_stock",
    severity: a.severity === "critical" ? "critical" : a.severity === "high" ? "warning" : "info",
    productId: a.product?.id,
    productName: a.product?.name,
    locationId: a.location?.id,
    locationName: a.location?.name,
    message: a.message ?? `Alert triggered for ${a.product?.name ?? "unknown product"}`,
    value: a.currentValue,
    threshold: a.thresholdValue,
    triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : new Date(),
    acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt) : undefined,
    acknowledgedBy: a.acknowledgedBy,
  }));

  const products = (productsData?.products ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
  }));

  const locations = (locationsData ?? []).map((l: any) => ({
    id: l.id,
    name: l.name,
    code: l.locationCode ?? l.code ?? "",
  }));

  // Handlers
  const handleCreateAlert = useCallback(
    async (data: any) => {
      await createAlertMutation.mutateAsync(data);
      setShowCreateDialog(false);
    },
    [createAlertMutation]
  );

  const handleEditAlert = useCallback(
    async (data: any) => {
      if (!editingAlert) return;
      await updateAlertMutation.mutateAsync({ id: editingAlert.id, data });
      setEditingAlert(null);
    },
    [editingAlert, updateAlertMutation]
  );

  const handleDeleteAlert = useCallback(
    async (alert: AlertRule) => {
      await deleteAlertMutation.mutateAsync(alert.id);
    },
    [deleteAlertMutation]
  );

  const handleToggleActive = useCallback(
    async (alertId: string, isActive: boolean) => {
      await toggleActiveMutation.mutateAsync({ alertId, isActive });
    },
    [toggleActiveMutation]
  );

  const handleAcknowledgeAlert = useCallback(
    async (alertId: string) => {
      await acknowledgeMutation.mutateAsync(alertId);
    },
    [acknowledgeMutation]
  );

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
