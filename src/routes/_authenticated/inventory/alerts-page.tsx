/**
 * Inventory Alerts Page Component
 *
 * Manage inventory alert rules and view triggered alerts.
 *
 * @source alerts from useAlerts hook
 * @source triggeredAlerts from useTriggeredAlerts hook
 * @source products from useProducts hook
 * @source locations from useLocations hook
 *
 * @see src/routes/_authenticated/inventory/alerts.tsx - Route definition
 */
import { useState, useCallback } from "react";
import { Plus, Bell, Settings, History } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import { AlertsPanel, type InventoryAlert } from "@/components/domain/inventory/alerts/alerts-panel";
import { AlertConfigForm } from "@/components/domain/inventory/alerts/alert-config-form";
import { AlertsList, type AlertRule } from "@/components/domain/inventory/alerts/alerts-list";
import {
  useAlerts,
  useTriggeredAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useToggleAlertActive,
  useAcknowledgeAlert,
  useLocations,
  type WarehouseLocation,
} from "@/hooks/inventory";
import { useProducts } from "@/hooks/products";
import type { TriggeredAlertResult, ListTriggeredAlertsResult, CreateAlert, AlertListItem } from "@/lib/schemas/inventory";
import { logger } from "@/lib/logger";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlertsPage() {
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
  const products = (productsData?.products ?? []).map((p: { id: string; name: string; sku: string }) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
  }));

  const locations = (locationsData ?? []).map((l: WarehouseLocation) => ({
    id: l.id,
    name: l.name,
    code: l.code ?? "",
  }));

  const alertRules: AlertRule[] = (alertsData?.alerts ?? []).map((a: AlertListItem) => {
    // Generate display name from alert type and scope (database doesn't store name)
    const alertTypeLabels: Record<string, string> = {
      low_stock: "Low Stock",
      out_of_stock: "Out of Stock",
      overstock: "Overstock",
      expiry: "Expiry",
      slow_moving: "Slow Moving",
      forecast_deviation: "Forecast Deviation",
    };
    const productName = products.find((p) => p.id === a.productId)?.name;
    const locationName = locations.find((l) => l.id === a.locationId)?.name;
    const scope = productName
      ? locationName
        ? `${productName} @ ${locationName}`
        : productName
      : locationName
        ? `All Products @ ${locationName}`
        : "All Products";
    const generatedName = `${alertTypeLabels[a.alertType] ?? a.alertType} - ${scope}`;

    // Extract threshold value from threshold object
    const thresholdValue =
      typeof a.threshold === "object" && a.threshold !== null && "minQuantity" in a.threshold
        ? (a.threshold as { minQuantity?: number }).minQuantity ?? 0
        : 0;

    return {
      id: a.id,
      alertType: a.alertType as AlertRule["alertType"],
      name: generatedName,
      productId: a.productId ?? null,
      productName: productName,
      locationId: a.locationId ?? null,
      locationName: locationName,
      thresholdValue,
      thresholdPercentage: undefined,
      isActive: a.isActive,
      notifyEmail: a.notificationChannels?.includes("email") ?? false,
      notifyInApp: a.notificationChannels?.includes("in_app") ?? true,
      triggeredCount: 0, // Not tracked in current schema
      lastTriggeredAt: a.lastTriggeredAt ? new Date(a.lastTriggeredAt) : null,
      createdAt: new Date(a.createdAt),
    };
  });

  const triggeredAlerts: InventoryAlert[] = ((triggeredData as ListTriggeredAlertsResult | undefined)?.alerts ?? []).map((a: TriggeredAlertResult) => {
    // Map server severity ('critical' | 'high' | 'medium' | 'low') to component severity ('critical' | 'warning' | 'info')
    let severity: InventoryAlert["severity"];
    if (a.severity === "critical") {
      severity = "critical";
    } else if (a.severity === "high" || a.severity === "medium") {
      severity = "warning";
    } else {
      severity = "info";
    }

    return {
      id: a.alert.id,
      alertType: a.alert.alertType as InventoryAlert["alertType"],
      severity,
      productId: a.product?.id,
      productName: a.product?.name,
      locationId: a.location?.id,
      locationName: a.location?.name,
      message: a.message,
      value: a.currentValue,
      threshold: a.thresholdValue,
      // Use alert.lastTriggeredAt as triggeredAt (fallback to current date if not set)
      triggeredAt: a.alert.lastTriggeredAt ? new Date(a.alert.lastTriggeredAt) : new Date(),
      // Note: Acknowledgment tracking is not per-triggered-instance, using alert.updatedAt as proxy
      // This is not ideal but matches current implementation where acknowledgeAlert updates the alert rule
      acknowledgedAt: a.alert.updatedAt && a.alert.lastTriggeredAt && a.alert.updatedAt > a.alert.lastTriggeredAt
        ? new Date(a.alert.updatedAt)
        : undefined,
      acknowledgedBy: a.alert.updatedBy ?? undefined,
      // Flag to distinguish fallback alerts (cannot be acknowledged)
      isFallback: a.isFallback ?? false,
    };
  });

  // Handlers
  const handleCreateAlert = useCallback(
    async (formData: {
      alertType: string;
      name: string;
      productId?: string | null;
      locationId?: string | null;
      thresholdValue: number;
      thresholdPercentage?: number;
      notifyEmail: boolean;
      notifyInApp: boolean;
      isActive: boolean;
    }) => {
      // Transform form data to server schema (name is not stored, threshold is an object)
      const serverData: CreateAlert = {
        alertType: formData.alertType as CreateAlert["alertType"],
        productId: formData.productId ?? undefined,
        locationId: formData.locationId ?? undefined,
        threshold: {
          minQuantity: formData.thresholdValue,
        },
        isActive: formData.isActive,
        notificationChannels: [
          ...(formData.notifyEmail ? ["email"] : []),
          ...(formData.notifyInApp ? ["in_app"] : []),
        ],
        escalationUsers: [],
      };
      await createAlertMutation.mutateAsync(serverData);
      setShowCreateDialog(false);
    },
    [createAlertMutation]
  );

  const handleEditAlert = useCallback(
    async (formData: {
      alertType?: string;
      name?: string;
      productId?: string | null;
      locationId?: string | null;
      thresholdValue?: number;
      thresholdPercentage?: number;
      notifyEmail?: boolean;
      notifyInApp?: boolean;
      isActive?: boolean;
    }) => {
      if (!editingAlert) return;
      // Transform form data to server schema
      const serverData: Partial<CreateAlert> = {};
      if (formData.productId !== undefined) {
        serverData.productId = formData.productId ?? undefined;
      }
      if (formData.locationId !== undefined) {
        serverData.locationId = formData.locationId ?? undefined;
      }
      if (formData.thresholdValue !== undefined) {
        serverData.threshold = { minQuantity: formData.thresholdValue };
      }
      if (formData.isActive !== undefined) {
        serverData.isActive = formData.isActive;
      }
      if (formData.notifyEmail !== undefined || formData.notifyInApp !== undefined) {
        serverData.notificationChannels = [
          ...(formData.notifyEmail ? ["email"] : []),
          ...(formData.notifyInApp ? ["in_app"] : []),
        ];
      }
      await updateAlertMutation.mutateAsync({ id: editingAlert.id, data: serverData });
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
      // Check if this is a fallback alert (cannot be acknowledged)
      if (alertId.startsWith('00000000-0000-4000-8000-')) {
        // Fallback alerts cannot be acknowledged - show message to user
        // In a real implementation, this would show a toast or modal
        logger.warn('Fallback alerts cannot be acknowledged. Please create an alert rule to track this item.');
        return;
      }
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "rules" | "history")}>
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
            <AlertsPanel
              alerts={[...triggeredAlerts].sort(
                (a, b) =>
                  new Date(b.acknowledgedAt ?? b.triggeredAt).getTime() -
                  new Date(a.acknowledgedAt ?? a.triggeredAt).getTime()
              )}
              isLoading={isLoadingTriggered}
              maxHeight="520px"
            />
          </TabsContent>
        </Tabs>
      </PageLayout.Content>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={createPendingDialogOpenChangeHandler(createAlertMutation.isPending, setShowCreateDialog)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={createPendingDialogInteractionGuards(createAlertMutation.isPending).onEscapeKeyDown}
          onInteractOutside={createPendingDialogInteractionGuards(createAlertMutation.isPending).onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
          </DialogHeader>
          <AlertConfigForm
            products={products}
            locations={locations}
            onSubmit={handleCreateAlert}
            onCancel={() => setShowCreateDialog(false)}
            submitError={createAlertMutation.error?.message ?? null}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingAlert}
        onOpenChange={createPendingDialogOpenChangeHandler(updateAlertMutation.isPending, (open) => !open && setEditingAlert(null))}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={createPendingDialogInteractionGuards(updateAlertMutation.isPending).onEscapeKeyDown}
          onInteractOutside={createPendingDialogInteractionGuards(updateAlertMutation.isPending).onInteractOutside}
        >
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
                productId: editingAlert.productId ?? null,
                locationId: editingAlert.locationId ?? null,
                thresholdValue: editingAlert.thresholdValue,
                thresholdPercentage: editingAlert.thresholdPercentage ?? undefined,
                notifyEmail: editingAlert.notifyEmail,
                notifyInApp: editingAlert.notifyInApp,
                isActive: editingAlert.isActive,
              }}
              onSubmit={handleEditAlert}
              onCancel={() => setEditingAlert(null)}
              submitError={updateAlertMutation.error?.message ?? null}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
