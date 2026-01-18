/**
 * AmendmentList Component
 *
 * Displays amendments for an order with status badges and action buttons.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-UI)
 */

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileEdit,
  Clock,
  CheckCircle,
  XCircle,
  CheckCheck,
  Ban,
  Eye,
  Play,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { listAmendments } from "@/lib/server/functions/order-amendments";
import type { AmendmentStatus, AmendmentType, AmendmentChanges, FinancialImpact } from "@/lib/schemas/order-amendments";

// ============================================================================
// TYPES
// ============================================================================

export interface AmendmentListProps {
  orderId: string;
  onReview?: (amendmentId: string) => void;
  onApply?: (amendmentId: string) => void;
  onCancel?: (amendmentId: string) => void;
  className?: string;
}

interface AmendmentListItem {
  id: string;
  amendmentType: string;
  reason: string;
  changes: AmendmentChanges | null;
  status: AmendmentStatus;
  requestedAt: Date;
  reviewedAt: Date | null;
  appliedAt: Date | null;
  approvalNotes: { note?: string; conditions?: string[]; internalOnly?: boolean } | null;
  requesterName: string | null;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  AmendmentStatus,
  {
    label: string;
    color: string;
    icon: typeof FileEdit;
  }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  applied: {
    label: "Applied",
    color: "bg-blue-100 text-blue-800",
    icon: CheckCheck,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: Ban,
  },
};

const TYPE_LABELS: Record<AmendmentType, string> = {
  quantity_change: "Quantity Change",
  item_add: "Add Item",
  item_remove: "Remove Item",
  price_change: "Price Change",
  discount_change: "Discount",
  shipping_change: "Shipping",
  address_change: "Address",
  date_change: "Date",
  cancel_order: "Cancellation",
  other: "Other",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AmendmentList = memo(function AmendmentList({
  orderId,
  onReview,
  onApply,
  onCancel,
  className,
}: AmendmentListProps) {
  // Fetch amendments
  const { data: amendments, isLoading, error } = useQuery<AmendmentListItem[]>({
    queryKey: ["amendments", orderId],
    queryFn: async (): Promise<AmendmentListItem[]> => {
      const result = await listAmendments({ data: { orderId } }) as { amendments: AmendmentListItem[] };
      return result.amendments;
    },
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Failed to load amendments. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!amendments || amendments.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <FileEdit className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No amendments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {amendments.map((amendment) => {
        const status = STATUS_CONFIG[amendment.status as AmendmentStatus];
        const StatusIcon = status.icon;
        const typeLabel = TYPE_LABELS[amendment.amendmentType as AmendmentType] || amendment.amendmentType;
        const changes = amendment.changes as AmendmentChanges | null;
        const financialImpact = changes?.financialImpact as FinancialImpact | undefined;

        const canReview = amendment.status === "pending" && onReview;
        const canApply = amendment.status === "approved" && onApply;
        const canCancel = amendment.status === "pending" && onCancel;

        return (
          <Card key={amendment.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  <CardTitle className="text-base">{typeLabel}</CardTitle>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {amendment.reason}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Meta Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Requested by</p>
                  <p className="font-medium">{amendment.requesterName || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requested</p>
                  <p className="font-medium">
                    {format(new Date(amendment.requestedAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                {amendment.reviewedAt && (
                  <div>
                    <p className="text-muted-foreground">Reviewed</p>
                    <p className="font-medium">
                      {format(new Date(amendment.reviewedAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
                {amendment.appliedAt && (
                  <div>
                    <p className="text-muted-foreground">Applied</p>
                    <p className="font-medium">
                      {format(new Date(amendment.appliedAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
              </div>

              {/* Financial Impact Summary */}
              {financialImpact && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Financial Impact:</span>
                    <span
                      className={cn(
                        "font-medium",
                        financialImpact.difference > 0 && "text-green-600",
                        financialImpact.difference < 0 && "text-red-600"
                      )}
                    >
                      {financialImpact.difference >= 0 ? "+" : ""}
                      {formatCurrency(financialImpact.difference)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCurrency(financialImpact.totalBefore)}</span>
                    <span>to</span>
                    <span>{formatCurrency(financialImpact.totalAfter)}</span>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {amendment.status === "rejected" && amendment.approvalNotes && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-700">
                    {typeof amendment.approvalNotes === "object" &&
                    "note" in (amendment.approvalNotes as Record<string, unknown>)
                      ? String((amendment.approvalNotes as Record<string, string>).note)
                      : "No reason provided"}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {(canReview || canApply || canCancel) && (
                <div className="flex items-center gap-2 pt-2">
                  <TooltipProvider>
                    {canReview && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => onReview(amendment.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Review and approve/reject</TooltipContent>
                      </Tooltip>
                    )}

                    {canApply && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onApply(amendment.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Apply
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Apply changes to order</TooltipContent>
                      </Tooltip>
                    )}

                    {canCancel && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCancel(amendment.id)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cancel this amendment request</TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

export default AmendmentList;
