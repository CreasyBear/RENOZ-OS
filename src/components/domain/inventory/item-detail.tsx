/**
 * Inventory Item Detail Component
 *
 * Comprehensive inventory item display with complete information.
 *
 * Accessibility:
 * - Status indicated by icon + color (not color-only)
 * - Currency values use Intl.NumberFormat for locale-awareness
 * - tabular-nums for quantity alignment
 */
import { memo } from "react";
import {
  Package,
  MapPin,
  DollarSign,
  Barcode,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusCell } from "@/components/shared/data-table";
import { useOrgFormat } from "@/hooks/use-org-format";
import { INVENTORY_STATUS_CONFIG, QUALITY_STATUS_CONFIG } from "./inventory-status-config";

// ============================================================================
// TYPES
// ============================================================================

export interface ItemDetailData {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productDescription?: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  unitCost: number;
  totalValue: number;
  status: "available" | "allocated" | "sold" | "damaged" | "returned" | "quarantined";
  qualityStatus?: "good" | "damaged" | "expired" | "quarantined";
  serialNumber?: string;
  lotNumber?: string;
  binLocation?: string;
  expiryDate?: Date;
  receivedAt?: Date;
  lastMovementAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ItemDetailProps {
  item: ItemDetailData;
  className?: string;
}


// ============================================================================
// COMPONENT
// ============================================================================

export const ItemDetail = memo(function ItemDetail({
  item,
  className,
}: ItemDetailProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  const formatDate = (date: Date | undefined) =>
    date ? new Date(date).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) : "—";

  const formatDateTime = (date: Date | undefined) =>
    date ? new Date(date).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) : "—";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" aria-hidden="true" />
              {item.productName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono">
                {item.productSku}
              </Badge>
              {item.serialNumber && (
                <span className="text-sm">S/N: {item.serialNumber}</span>
              )}
            </CardDescription>
          </div>

          {/* Status Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <StatusCell
                    status={item.status}
                    statusConfig={INVENTORY_STATUS_CONFIG}
                    showIcon
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Inventory Status: {INVENTORY_STATUS_CONFIG[item.status]?.label ?? item.status}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quantity Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Quantity
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold tabular-nums">
                {item.quantityOnHand}
              </div>
              <div className="text-xs text-muted-foreground">On Hand</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold tabular-nums text-blue-600">
                {item.quantityAllocated}
              </div>
              <div className="text-xs text-muted-foreground">Allocated</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold tabular-nums text-green-600">
                {item.quantityAvailable}
              </div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Value Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            Valuation
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Unit Cost</div>
              <div className="text-lg font-semibold tabular-nums">
                {formatCurrencyDisplay(item.unitCost)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-lg font-semibold tabular-nums">
                {formatCurrencyDisplay(item.totalValue)}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Location Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Location
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Location</span>
              <span className="font-medium">
                {item.locationCode} - {item.locationName}
              </span>
            </div>
            {item.binLocation && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bin</span>
                <span className="font-mono">{item.binLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Identification Section */}
        {(item.serialNumber || item.lotNumber) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Barcode className="h-4 w-4" aria-hidden="true" />
                Identification
              </h4>
              <div className="space-y-2">
                {item.serialNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Serial Number</span>
                    <span className="font-mono">{item.serialNumber}</span>
                  </div>
                )}
                {item.lotNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Lot Number</span>
                    <span className="font-mono">{item.lotNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Quality & Dates Section */}
        <Separator />
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" aria-hidden="true" />
            Details
          </h4>
          <div className="space-y-2">
            {item.qualityStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quality</span>
                <StatusCell
                  status={item.qualityStatus}
                  statusConfig={QUALITY_STATUS_CONFIG}
                />
              </div>
            )}
            {item.expiryDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expiry Date</span>
                <span className={cn(
                  "tabular-nums",
                  new Date(item.expiryDate) < new Date() && "text-red-600"
                )}>
                  {formatDate(item.expiryDate)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Received</span>
              <span className="tabular-nums">{formatDate(item.receivedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Movement</span>
              <span className="tabular-nums">{formatDateTime(item.lastMovementAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default ItemDetail;
