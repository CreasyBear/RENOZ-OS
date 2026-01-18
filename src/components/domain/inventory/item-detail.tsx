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
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
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
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  ItemDetailData["status"],
  { label: string; icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  available: {
    label: "Available",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/50",
  },
  allocated: {
    label: "Allocated",
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
  sold: {
    label: "Sold",
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/50",
  },
  damaged: {
    label: "Damaged",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
  returned: {
    label: "Returned",
    icon: XCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
  },
  quarantined: {
    label: "Quarantined",
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
  },
};

const QUALITY_CONFIG: Record<
  NonNullable<ItemDetailData["qualityStatus"]>,
  { label: string; color: string }
> = {
  good: { label: "Good", color: "text-green-600" },
  damaged: { label: "Damaged", color: "text-red-600" },
  expired: { label: "Expired", color: "text-orange-600" },
  quarantined: { label: "Quarantined", color: "text-yellow-600" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ItemDetail = memo(function ItemDetail({
  item,
  className,
}: ItemDetailProps) {
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;
  const qualityConfig = item.qualityStatus ? QUALITY_CONFIG[item.qualityStatus] : null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);

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

          {/* Status Badge - icon + color */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "flex items-center gap-1.5 text-sm",
                    statusConfig.color,
                    statusConfig.bgColor
                  )}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                  {statusConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Inventory Status: {statusConfig.label}</p>
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
                {formatCurrency(item.unitCost)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-lg font-semibold tabular-nums">
                {formatCurrency(item.totalValue)}
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
            {qualityConfig && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quality</span>
                <Badge variant="outline" className={qualityConfig.color}>
                  {qualityConfig.label}
                </Badge>
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
