/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
/**
 * Inventory Context
 *
 * Provides global inventory state and operations for the application.
 *
 * Features:
 * - Real-time inventory alerts tracking
 * - Stock availability checking
 * - Reservation management
 * - Alert subscription and notification
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { toast } from "@/hooks";
import {
  useInventoryDashboard,
  useTriggeredAlerts,
  useAcknowledgeAlert,
  useCheckInventoryAvailability,
  type AvailabilityCheck,
} from "@/hooks/inventory";
import { inventoryLogger } from "@/lib/logger";
import type { TriggeredAlert, TriggeredAlertResult } from "@/lib/schemas/inventory";

const ALERT_TYPES = ["low_stock", "out_of_stock", "overstock", "expiry", "slow_moving"] as const;
type AlertType = (typeof ALERT_TYPES)[number];

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryAlert {
  id: string;
  type: "low_stock" | "out_of_stock" | "overstock" | "expiry" | "slow_moving";
  severity: "info" | "warning" | "critical";
  productId?: string;
  productName?: string;
  locationId?: string;
  locationName?: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

export interface StockReservation {
  id: string;
  inventoryId: string;
  productId: string;
  quantity: number;
  referenceType: "order" | "job" | "transfer" | "hold";
  referenceId: string;
  reservedAt: Date;
  expiresAt?: Date;
}

export interface InventoryMetrics {
  totalValue: number;
  totalItems: number;
  totalSkus: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  alertsCount: number;
}

// AvailabilityCheck type is imported from @/hooks/inventory

interface InventoryContextValue {
  // State
  alerts: InventoryAlert[];
  metrics: InventoryMetrics | null;
  reservations: StockReservation[];
  isLoading: boolean;

  // Alert operations
  refreshAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;

  // Stock operations
  checkAvailability: (productId: string, quantity: number, locationId?: string) => Promise<AvailabilityCheck>;
  reserveStock: (
    productId: string,
    quantity: number,
    referenceType: StockReservation["referenceType"],
    referenceId: string,
    locationId?: string
  ) => Promise<StockReservation | null>;
  releaseReservation: (reservationId: string) => Promise<boolean>;

  // Metrics
  refreshMetrics: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const InventoryContext = createContext<InventoryContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface InventoryProviderProps {
  children: ReactNode;
  /** Poll interval for alerts in milliseconds (default: 60000 = 1 minute) */
  alertPollInterval?: number;
}

export function InventoryProvider({
  children,
  alertPollInterval = 60000,
}: InventoryProviderProps) {
  const [reservations, setReservations] = useState<StockReservation[]>([]);

  // Use hooks instead of direct server function calls (per STANDARDS.md)
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useInventoryDashboard();
  const { data: triggeredAlertsData, refetch: refetchTriggeredAlerts } = useTriggeredAlerts();
  const acknowledgeAlertMutation = useAcknowledgeAlert();

  // Stable "now" for alert fallback when triggeredAt is missing
  // eslint-disable-next-line react-hooks/purity -- cached now for component lifetime is intentional
  const now = useMemo(() => Date.now(), []);

  // Transform alerts data
  const alerts = useMemo<InventoryAlert[]>(() => {
    if (!triggeredAlertsData?.alerts) return [];
    return triggeredAlertsData.alerts.map((a: TriggeredAlert | TriggeredAlertResult): InventoryAlert => {
      const alertType = a.alert?.alertType ?? "low_stock";
      const type: AlertType = ALERT_TYPES.includes(alertType as AlertType) ? (alertType as AlertType) : "low_stock";
      return {
        id: a.alert?.id ?? crypto.randomUUID(),
        type,
        severity:
          a.severity === "critical"
            ? "critical"
            : a.severity === "high"
              ? "warning"
              : "info",
        productId: a.product?.id,
        productName: a.product?.name,
        locationId: a.location?.id,
        locationName: a.location?.name,
        message: a.message ?? "Alert triggered",
        createdAt: (() => {
          const t = a.alert?.lastTriggeredAt;
          if (t instanceof Date) return t;
          if (typeof t === "string") return new Date(t);
          return new Date(now);
        })(),
        acknowledged: false,
      };
    });
  }, [triggeredAlertsData, now]);

  // Transform metrics data
  const metrics = useMemo<InventoryMetrics | null>(() => {
    if (!dashboardData?.metrics) return null;
    return {
      totalValue: dashboardData.metrics.totalValue ?? 0,
      totalItems: dashboardData.metrics.totalItems ?? 0,
      totalSkus: dashboardData.metrics.totalSkus ?? 0,
      totalUnits: dashboardData.metrics.totalUnits ?? 0,
      lowStockCount: dashboardData.metrics.lowStockCount ?? 0,
      outOfStockCount: dashboardData.metrics.outOfStockCount ?? 0,
      alertsCount: triggeredAlertsData?.alerts?.length ?? 0,
    };
  }, [dashboardData, triggeredAlertsData]);

  const isLoading = isDashboardLoading;

  // Refresh alerts using hook refetch
  const refreshAlerts = useCallback(async () => {
    try {
      await refetchTriggeredAlerts();
    } catch (error) {
      inventoryLogger.error("Failed to fetch alerts", error as Error, {});
    }
  }, [refetchTriggeredAlerts]);

  // Refresh metrics using hook refetch
  const refreshMetrics = useCallback(async () => {
    try {
      await refetchDashboard();
    } catch (error) {
      inventoryLogger.error("Failed to fetch metrics", error as Error, {});
    }
  }, [refetchDashboard]);

  // Acknowledge an alert using mutation hook
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await acknowledgeAlertMutation.mutateAsync(alertId);
  }, [acknowledgeAlertMutation]);

  // Check stock availability - uses mutation hook
  const checkAvailabilityMutation = useCheckInventoryAvailability();
  const checkStockAvailability = useCallback(
    async (
      productId: string,
      quantity: number,
      locationId?: string
    ): Promise<AvailabilityCheck> => {
      try {
        return await checkAvailabilityMutation.mutateAsync({
          productId,
          quantity,
          locationId,
        });
      } catch (error) {
        inventoryLogger.error("Availability check failed", error as Error, { productId, locationId });
        return {
          productId,
          locationId,
          requestedQty: quantity,
          availableQty: 0,
          reservedQty: 0,
          isAvailable: false,
          shortfall: quantity,
        };
      }
    },
    [checkAvailabilityMutation]
  );

  // Reserve stock (placeholder - would call server function)
  const reserveStock = useCallback(
    async (
      productId: string,
      quantity: number,
      referenceType: StockReservation["referenceType"],
      referenceId: string,
      _locationId?: string
    ): Promise<StockReservation | null> => {
      // Check availability first
      const availability = await checkStockAvailability(productId, quantity);
      if (!availability.isAvailable) {
        toast.error("Insufficient stock", {
          description: `Only ${availability.availableQty} available, ${quantity} requested`,
        });
        return null;
      }

      // In a real implementation, this would call a server function to create the reservation
      const reservation: StockReservation = {
        id: crypto.randomUUID(),
        inventoryId: "",
        productId,
        quantity,
        referenceType,
        referenceId,
        reservedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      setReservations((prev) => [...prev, reservation]);
      toast.success("Stock reserved", {
        description: `${quantity} units reserved for ${referenceType}`,
      });

      return reservation;
    },
    [checkStockAvailability]
  );

  // Release a reservation
  const releaseReservation = useCallback(async (reservationId: string): Promise<boolean> => {
    // In a real implementation, this would call a server function
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    toast.info("Reservation released");
    return true;
  }, []);

  // Poll for alerts using refetch
  useEffect(() => {
    if (alertPollInterval <= 0) return;

    const interval = setInterval(() => {
      refetchTriggeredAlerts();
    }, alertPollInterval);
    return () => clearInterval(interval);
  }, [alertPollInterval, refetchTriggeredAlerts]);

  const value = useMemo<InventoryContextValue>(
    () => ({
      alerts,
      metrics,
      reservations,
      isLoading,
      refreshAlerts,
      acknowledgeAlert,
      checkAvailability: checkStockAvailability,
      reserveStock,
      releaseReservation,
      refreshMetrics,
    }),
    [
      alerts,
      metrics,
      reservations,
      isLoading,
      refreshAlerts,
      acknowledgeAlert,
      checkStockAvailability,
      reserveStock,
      releaseReservation,
      refreshMetrics,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useInventoryContext(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventoryContext must be used within InventoryProvider");
  }
  return context;
}

/**
 * Safe version that returns null if outside provider.
 * Use when component might be rendered outside inventory context.
 */
export function useInventoryContextSafe(): InventoryContextValue | null {
  return useContext(InventoryContext);
}

export default InventoryContext;
