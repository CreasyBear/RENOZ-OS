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
import { getTriggeredAlerts, getInventoryDashboard, listInventory } from "@/server/functions/inventory";

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

export interface AvailabilityCheck {
  productId: string;
  locationId?: string;
  requestedQty: number;
  availableQty: number;
  reservedQty: number;
  isAvailable: boolean;
  shortfall: number;
}

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
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [reservations, setReservations] = useState<StockReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch triggered alerts
  const refreshAlerts = useCallback(async () => {
    try {
      const data = (await getTriggeredAlerts()) as any;
      if (data?.alerts) {
        setAlerts(
          data.alerts.map((a: any) => ({
            id: a.alert?.id ?? a.id,
            type: a.alert?.alertType ?? a.type ?? "low_stock",
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
            message: a.message ?? `${a.alert?.name ?? "Alert"} triggered`,
            createdAt: new Date(a.triggeredAt ?? Date.now()),
            acknowledged: false,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  }, []);

  // Fetch dashboard metrics
  const refreshMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = (await getInventoryDashboard()) as any;
      if (data?.metrics) {
        setMetrics({
          totalValue: data.metrics.totalValue ?? 0,
          totalItems: data.metrics.totalItems ?? 0,
          totalSkus: data.metrics.totalSkus ?? 0,
          totalUnits: data.metrics.totalUnits ?? 0,
          lowStockCount: data.metrics.lowStockCount ?? 0,
          outOfStockCount: data.metrics.outOfStockCount ?? 0,
          alertsCount: data.alerts?.length ?? 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Acknowledge an alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    // In a real implementation, this would call a server function
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      )
    );
    toast.success("Alert acknowledged");
  }, []);

  // Check stock availability
  const checkStockAvailability = useCallback(
    async (
      productId: string,
      quantity: number,
      locationId?: string
    ): Promise<AvailabilityCheck> => {
      try {
        // Use listInventory to check availability for the product
        const data = (await listInventory({
          data: {
            productId,
            ...(locationId && { locationId }),
            page: 1,
            pageSize: 100,
          },
        })) as any;

        // Sum available quantities across all locations
        const totalAvailable = (data?.items ?? []).reduce(
          (sum: number, item: any) => sum + (item.quantityAvailable ?? 0),
          0
        );
        const totalReserved = (data?.items ?? []).reduce(
          (sum: number, item: any) => sum + (item.quantityAllocated ?? 0),
          0
        );

        return {
          productId,
          locationId,
          requestedQty: quantity,
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          isAvailable: totalAvailable >= quantity,
          shortfall: Math.max(0, quantity - totalAvailable),
        };
      } catch (error) {
        console.error("Availability check failed:", error);
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
    []
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

  // Initial load
  useEffect(() => {
    refreshAlerts();
    refreshMetrics();
  }, []);

  // Poll for alerts
  useEffect(() => {
    if (alertPollInterval <= 0) return;

    const interval = setInterval(refreshAlerts, alertPollInterval);
    return () => clearInterval(interval);
  }, [alertPollInterval, refreshAlerts]);

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
