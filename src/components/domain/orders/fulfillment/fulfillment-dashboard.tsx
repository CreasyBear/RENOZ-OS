/**
 * FulfillmentDashboard Presenter
 *
 * Pure UI component for order fulfillment workflow dashboard.
 * Shows orders in various fulfillment stages with quick actions.
 *
 * Container/Presenter Pattern:
 * - Use FulfillmentDashboardContainer in routes (handles data fetching)
 * - Use FulfillmentDashboardPresenter for storybook/testing
 *
 * Features:
 * - Summary cards: Orders to pick, Ready to ship, shipment recovery queue, Overdue
 * - Picking queue table: Orders in "confirmed" status
 * - Shipping queue table: Orders in "picked" status
 * - Delivery tracking section: recovery-focused shipment queue
 *
 * @see ./fulfillment-dashboard-container.tsx (container)
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { memo, useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  MapPin,
  ExternalLink,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FormatAmount, MetricCard } from "@/components/shared";
import { toastSuccess } from "@/hooks";
import type { OrderStatus, ShipmentStatus } from "@/lib/schemas/orders";
import { fulfillmentImportRowSchema } from "@/lib/schemas/orders/shipments";
import type { FulfillmentImport, FulfillmentImportRow } from "@/lib/schemas/orders/shipments";
import { getSummaryMetricSubtitle } from '@/lib/metrics/metric-display';
import type { SummaryState } from '@/lib/metrics/summary-health';
import {
  buildFulfillmentStats,
  isOverdueOrder,
  type FulfillmentStats,
} from "./fulfillment-metrics";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Order list result type for presenter
 */
interface OrderListResult {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number | null;
    orderDate: Date | string | null;
    createdAt: Date;
    status: string;
  }>;
  total: number;
}

/**
 * Shipment list result type for presenter
 */
interface ShipmentListResult {
  shipments: Array<{
    id: string;
    shipmentNumber: string;
    orderId: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: ShipmentStatus;
    shippedAt: Date | null;
  }>;
  total: number;
}

interface FulfillmentImportResult {
  imported: number;
  failed: number;
  skipped: number;
  results: Array<{
    orderNumber: string;
    shipmentId?: string;
    shipmentNumber?: string | null;
    status: "imported" | "skipped" | "failed";
    message?: string;
  }>;
}

/**
 * Container props - what parent components pass
 */
export interface FulfillmentDashboardContainerProps {
  onPickOrder?: (orderId: string) => void;
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onConfirmDelivery?: (shipmentId: string) => void;
  /** Order IDs to highlight when navigated from orders list "Go to Fulfillment" */
  highlightOrderIds?: string[];
  className?: string;
}

/**
 * Presenter props - what the container passes to the presenter
 */
export interface FulfillmentDashboardPresenterProps
  extends FulfillmentDashboardContainerProps {
  /** @source useOrders({ status: 'confirmed' }) hook */
  confirmedOrders: OrderListResult | null;
  /** @source useOrders({ status: 'picked' }) hook */
  pickedOrders: OrderListResult | null;
  /** @source useShipments() hook */
  activeShipments: ShipmentListResult | null;
  /** @source useFulfillmentDashboardSummary() hook */
  fulfillmentSummary: FulfillmentStats | null;
  /** Authoritative summary state for headline metrics */
  summaryState: SummaryState;
  /** Warning to show when summary metrics are unavailable */
  summaryWarning?: string | null;
  /** Loading state for confirmed orders */
  loadingConfirmed: boolean;
  /** Loading state for picked orders */
  loadingPicked: boolean;
  /** Loading state for shipments */
  loadingShipments: boolean;
  /** Loading state for fulfillment summary metrics */
  loadingSummary: boolean;
  /** @source useFulfillmentImport hook */
  importFulfillmentMutation: UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Package }
> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle },
  picking: { label: "Picking", variant: "default", icon: Package },
  picked: { label: "Picked", variant: "default", icon: Package },
  partially_shipped: { label: "Partial", variant: "default", icon: Truck },
  shipped: { label: "Shipped", variant: "default", icon: Truck },
  delivered: { label: "Delivered", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: Clock },
};

const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; color: string; icon: typeof Package }
> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-800", icon: Clock },
  in_transit: { label: "In Transit", color: "bg-blue-100 text-blue-800", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "bg-yellow-100 text-yellow-800", icon: MapPin },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  returned: { label: "Returned", color: "bg-orange-100 text-orange-800", icon: RefreshCw },
};

// ============================================================================
// HELPERS
// ============================================================================

function getOrderStatusBadge(status: OrderStatus) {
  const config = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function getShipmentStatusBadge(status: ShipmentStatus) {
  const config = SHIPMENT_STATUS_CONFIG[status] ?? SHIPMENT_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

type FulfillmentImportPreviewRow = {
  row: number;
  raw: Record<string, string | undefined>;
  data?: FulfillmentImportRow;
  isValid: boolean;
  errors: string[];
};

type FulfillmentImportPreview = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: FulfillmentImportPreviewRow[];
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ""));
}

function mapImportHeader(header: string): keyof FulfillmentImportRow | null {
  const normalized = header.toLowerCase().replace(/[\s_-]/g, "");

  if (normalized.includes("ordernumber") || normalized === "order") return "orderNumber";
  if (normalized.includes("shipmentnumber")) return "shipmentNumber";
  if (normalized.includes("trackingurl")) return "trackingUrl";
  if (normalized.includes("trackingnumber") || normalized === "tracking") return "trackingNumber";
  if (normalized.includes("carrierservice") || normalized === "service") return "carrierService";
  if (normalized.includes("carrier")) return "carrier";
  if (normalized.includes("shippedat") || normalized.includes("shipdate") || normalized.includes("shippeddate"))
    return "shippedAt";

  return null;
}

function parseFulfillmentImport(content: string): FulfillmentImportPreview {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]);
  const mappedHeaders = headers.map(mapImportHeader);

  const rows: FulfillmentImportPreviewRow[] = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const raw: Record<string, string | undefined> = {};

    mappedHeaders.forEach((field, columnIndex) => {
      if (!field) return;
      const value = values[columnIndex]?.trim() ?? "";
      raw[field] = value.length > 0 ? value : undefined;
    });

    const result = fulfillmentImportRowSchema.safeParse(raw);

    if (result.success) {
      return {
        row: index + 2,
        raw,
        data: result.data,
        isValid: true,
        errors: [],
      };
    }

    return {
      row: index + 2,
      raw,
      isValid: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  });

  const validCount = rows.filter((row) => row.isValid).length;
  const invalidCount = rows.length - validCount;

  return {
    totalRows: rows.length,
    validCount,
    invalidCount,
    rows,
  };
}

// ============================================================================
// STAT CARD VARIANT STYLES
// ============================================================================

// Variant styles for fulfillment stat cards
const STAT_CARD_STYLES = {
  default: { className: "border-gray-200", iconClassName: "text-gray-400" },
  warning: { className: "border-orange-200 bg-orange-50", iconClassName: "text-orange-500" },
  success: { className: "border-green-200 bg-green-50", iconClassName: "text-green-500" },
  info: { className: "border-blue-200 bg-blue-50", iconClassName: "text-blue-500" },
} as const;

// Note: Using shared MetricCard from @/components/shared

// ============================================================================
// IMPORT DIALOG (PRESENTER)
// ============================================================================

interface FulfillmentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importMutation: UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport>;
}

function FulfillmentImportDialog({
  open,
  onOpenChange,
  importMutation,
}: FulfillmentImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [preview, setPreview] = useState<FulfillmentImportPreview | null>(null);
  const [importResults, setImportResults] = useState<FulfillmentImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);

  const resetState = useCallback(() => {
    setStep("upload");
    setPreview(null);
    setImportResults(null);
    setParseError(null);
    setDryRun(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleClose();
        return;
      }
      onOpenChange(true);
    },
    [handleClose, onOpenChange]
  );

  const handleParse = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a CSV file.");
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseFulfillmentImport(content);
      setPreview(parsed);
      setParseError(null);
      setStep("preview");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse CSV file.");
    }
  }, []);

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        void handleParse(selectedFile);
      }
    },
    [handleParse]
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const droppedFile = event.dataTransfer.files?.[0];
      if (droppedFile) {
        void handleParse(droppedFile);
      }
    },
    [handleParse]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

  const handleImport = useCallback(async () => {
    if (!preview) return;

    const validRows = preview.rows
      .filter((row) => row.isValid && row.data)
      .map((row) => row.data as FulfillmentImportRow);

    if (validRows.length === 0) {
      setParseError("No valid rows found to import.");
      return;
    }

    setStep("importing");
    try {
      const result = await importMutation.mutateAsync({
        rows: validRows,
        dryRun,
      });
      setImportResults(result);
      setStep("complete");
      toastSuccess(dryRun ? "Dry run complete" : "Fulfillment import complete");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Import failed.");
      setStep("preview");
    }
  }, [dryRun, importMutation, preview]);

  const handleDownloadResults = useCallback(() => {
    if (!importResults) return;

    const rows = importResults.results.map((result) => ({
      orderNumber: result.orderNumber,
      shipmentNumber: result.shipmentNumber ?? "",
      status: result.status,
      message: result.message ?? "",
    }));

    const headers = ["orderNumber", "shipmentNumber", "status", "message"];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => `"${String(row[key as keyof typeof row]).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fulfillment-import-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [importResults]);

  const isPending = importMutation.isPending;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, handleOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[80vh] max-w-4xl sm:max-w-4xl overflow-y-auto"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Import Fulfillment Shipments</DialogTitle>
          <DialogDescription>
            Upload a CSV file to mark existing shipments as shipped.
          </DialogDescription>
        </DialogHeader>

        {parseError && (
          <Alert variant="destructive">
            <AlertTitle>Import error</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-dashed flex flex-col items-center justify-center rounded-lg border-2 p-8 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-sm font-medium">Drag and drop a CSV file here</p>
              <p className="text-muted-foreground text-xs">
                Required columns: orderNumber, carrier, trackingNumber
              </p>
              <div className="mt-4 w-full max-w-sm">
                <Label htmlFor="fulfillment-import">Choose file</Label>
                <Input
                  id="fulfillment-import"
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Total: {preview.totalRows}</Badge>
              <Badge variant="outline">Valid: {preview.validCount}</Badge>
              <Badge variant="outline">Invalid: {preview.invalidCount}</Badge>
            </div>

            {preview.invalidCount > 0 && (
              <Alert>
                <AlertTitle>Some rows have validation errors</AlertTitle>
                <AlertDescription>
                  Only valid rows will be imported. Review errors below before continuing.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, 8).map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{row.raw.orderNumber ?? "—"}</TableCell>
                      <TableCell>{row.raw.shipmentNumber ?? "—"}</TableCell>
                      <TableCell>{row.raw.carrier ?? "—"}</TableCell>
                      <TableCell>{row.raw.trackingNumber ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={row.isValid ? "secondary" : "destructive"}>
                          {row.isValid ? "Valid" : "Invalid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.rows.length > 8 && (
              <p className="text-muted-foreground text-xs">
                Showing first 8 rows. Remaining rows will be processed on import.
              </p>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4">
            <p className="text-sm">Importing fulfillment shipments…</p>
            <Progress value={60} />
          </div>
        )}

        {step === "complete" && importResults && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Imported {importResults.imported} of{" "}
                {importResults.imported + importResults.skipped + importResults.failed}
              </Badge>
              <Badge variant="outline">Skipped: {importResults.skipped}</Badge>
              <Badge variant="outline">Failed: {importResults.failed}</Badge>
              {dryRun && <Badge variant="secondary">Dry run</Badge>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Showing first 10 results. Download the full CSV for all rows.
              </p>
              <Button variant="outline" size="sm" onClick={handleDownloadResults}>
                Download Results
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.results.slice(0, 10).map((result, index) => (
                    <TableRow key={`${result.orderNumber}-${index}`}>
                      <TableCell>{result.orderNumber}</TableCell>
                      <TableCell>{result.shipmentNumber ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            result.status === "imported"
                              ? "secondary"
                              : result.status === "failed"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {result.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {result.message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <div className="mr-auto flex items-center gap-2">
              <Checkbox
                id="fulfillment-dry-run"
                checked={dryRun}
                onCheckedChange={(value) => setDryRun(Boolean(value))}
              />
              <Label htmlFor="fulfillment-dry-run" className="text-sm">
                Dry run (no changes applied)
              </Label>
            </div>
          )}

          <Button variant="outline" onClick={handleClose}>
            {step === "complete" ? "Close" : "Cancel"}
          </Button>

          {step === "preview" && (
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {dryRun ? "Run Dry Import" : "Import Shipments"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT (PRESENTER)
// ============================================================================

export const FulfillmentDashboardPresenter = memo(function FulfillmentDashboardPresenter({
  confirmedOrders,
  pickedOrders,
  activeShipments,
  fulfillmentSummary,
  summaryState,
  summaryWarning,
  loadingConfirmed,
  loadingPicked,
  loadingShipments,
  loadingSummary,
  importFulfillmentMutation,
  onPickOrder,
  onShipOrder,
  onViewOrder,
  onConfirmDelivery,
  highlightOrderIds,
  className,
}: FulfillmentDashboardPresenterProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const trackedShipments = (activeShipments?.shipments ?? []).filter(
    (shipment) => shipment.status !== 'delivered' && shipment.status !== 'returned'
  );

  const stats = buildFulfillmentStats({
    fulfillmentSummary,
    summaryState,
  });

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
    setIsRefreshing(false);
  }, [queryClient]);

  const isLoading = loadingConfirmed || loadingPicked || loadingShipments || loadingSummary;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Banner when navigated from orders list with selected orders */}
      {highlightOrderIds && highlightOrderIds.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>Orders selected from list</AlertTitle>
          <AlertDescription>
            {highlightOrderIds.length} order{highlightOrderIds.length !== 1 ? "s" : ""} selected.
            Use the Ship button per order in the shipping queue to create shipments with carrier and
            tracking details.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fulfillment Overview</h2>
          <p className="text-sm text-muted-foreground">
            Live order processing status (updates every 30s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Shipments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryWarning ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{summaryWarning}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Orders to Pick"
          value={stats.toPick ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Open or in progress',
          })}
          icon={Package}
          className={STAT_CARD_STYLES.info.className}
          iconClassName={STAT_CARD_STYLES.info.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Ready to Ship"
          value={stats.readyToShip ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Packed and waiting',
          })}
          icon={Truck}
          className={STAT_CARD_STYLES.success.className}
          iconClassName={STAT_CARD_STYLES.success.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Shipment Queue"
          value={stats.inTransit ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Pending follow-up',
          })}
          icon={MapPin}
          className={STAT_CARD_STYLES.default.className}
          iconClassName={STAT_CARD_STYLES.default.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Overdue"
          value={stats.overdue ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Needs attention',
          })}
          icon={AlertTriangle}
          className={stats.overdue != null && stats.overdue > 0 ? STAT_CARD_STYLES.warning.className : STAT_CARD_STYLES.default.className}
          iconClassName={stats.overdue != null && stats.overdue > 0 ? STAT_CARD_STYLES.warning.iconClassName : STAT_CARD_STYLES.default.iconClassName}
          isLoading={isLoading}
        />
      </div>

      {/* Picking Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Picking Queue</CardTitle>
              <CardDescription>
                Orders ready to start or resume picking
              </CardDescription>
            </div>
            <Link
              to="/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <PickingQueueTable
            orders={(confirmedOrders?.orders ?? []).map(order => ({
              ...order,
              total: order.total ?? 0,
              status: order.status as "draft" | "confirmed" | "picking" | "picked" | "shipped" | "delivered" | "cancelled"
            }))}
            isLoading={loadingConfirmed}
            onOpenPicking={onPickOrder}
            onViewOrder={onViewOrder}
          />
        </CardContent>
      </Card>

      {/* Shipping Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Shipping Queue</CardTitle>
              <CardDescription>
                Orders picked and ready to ship
              </CardDescription>
            </div>
            <Link
              to="/orders"
              search={{ status: "picked" }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ShippingQueueTable
            orders={(pickedOrders?.orders ?? []).map(order => ({
              ...order,
              total: order.total ?? 0,
              status: order.status as "draft" | "confirmed" | "picking" | "picked" | "shipped" | "delivered" | "cancelled"
            }))}
            isLoading={loadingPicked}
            onShipOrder={onShipOrder}
            onViewOrder={onViewOrder}
          />
        </CardContent>
      </Card>

      <FulfillmentImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importMutation={importFulfillmentMutation}
      />

      {/* Shipment Recovery Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Shipment Recovery Queue</CardTitle>
              <CardDescription>
                Pending, in transit, out for delivery, and failed shipments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DeliveryTrackingTable
            shipments={trackedShipments}
            isLoading={loadingShipments}
            onConfirmDelivery={onConfirmDelivery}
          />
        </CardContent>
      </Card>
    </div>
  );
});

// ============================================================================
// PICKING QUEUE TABLE
// ============================================================================

interface PickingQueueTableProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    orderDate: Date | string | null;
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onOpenPicking?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

function PickingQueueTable({
  orders,
  isLoading,
  onOpenPicking,
  onViewOrder,
}: PickingQueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No orders waiting to be picked</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const overdue = isOverdueOrder(order.orderDate);

          return (
            <TableRow key={order.id} className={cn(overdue && "bg-orange-50")}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  {overdue && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Order is overdue (3+ days)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(order.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right font-medium">
                <FormatAmount amount={order.total} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenPicking?.(order.id)}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    {order.status === "picking" ? "Resume Picking" : "Open Picking"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewOrder?.(order.id)}
                    aria-label={`View order ${order.orderNumber}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// SHIPPING QUEUE TABLE
// ============================================================================

interface ShippingQueueTableProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    orderDate: Date | string | null;
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

function ShippingQueueTable({
  orders,
  isLoading,
  onShipOrder,
  onViewOrder,
}: ShippingQueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No orders ready to ship</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Picked Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const overdue = isOverdueOrder(order.orderDate);

          return (
            <TableRow key={order.id} className={cn(overdue && "bg-orange-50")}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  {overdue && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Order is overdue (3+ days)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(order.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right font-medium">
                <FormatAmount amount={order.total} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onShipOrder?.(order.id)}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Ship
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewOrder?.(order.id)}
                    aria-label={`View order ${order.orderNumber}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// DELIVERY TRACKING TABLE
// ============================================================================

interface DeliveryTrackingTableProps {
  shipments: Array<{
    id: string;
    shipmentNumber: string;
    orderId: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: ShipmentStatus;
    shippedAt: Date | null;
  }>;
  isLoading: boolean;
  onConfirmDelivery?: (shipmentId: string) => void;
}

function DeliveryTrackingTable({
  shipments,
  isLoading,
  onConfirmDelivery,
}: DeliveryTrackingTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No shipments in transit</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment #</TableHead>
          <TableHead>Carrier</TableHead>
          <TableHead>Tracking</TableHead>
          <TableHead>Shipped</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow key={shipment.id}>
            <TableCell>
              <span className="font-medium">{shipment.shipmentNumber}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {shipment.carrier ?? "N/A"}
            </TableCell>
            <TableCell>
              {shipment.trackingNumber ? (
                shipment.trackingUrl ? (
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {shipment.trackingNumber}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>{shipment.trackingNumber}</span>
                )
              ) : (
                <span className="text-muted-foreground">No tracking</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {shipment.shippedAt
                ? format(new Date(shipment.shippedAt), "MMM d, yyyy")
                : "N/A"}
            </TableCell>
            <TableCell>{getShipmentStatusBadge(shipment.status)}</TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirmDelivery?.(shipment.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/** @deprecated Use FulfillmentDashboardContainer instead */
export const FulfillmentDashboard = FulfillmentDashboardPresenter;

/** @deprecated Use FulfillmentDashboardContainerProps instead */
export type FulfillmentDashboardProps = FulfillmentDashboardContainerProps;
