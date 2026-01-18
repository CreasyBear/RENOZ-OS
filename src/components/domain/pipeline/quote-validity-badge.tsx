/**
 * QuoteValidityBadge Component
 *
 * Displays quote expiration status with visual indicators.
 * Shows days until expiration or time since expiration.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-VALIDITY-UI)
 */

import { memo, useMemo } from "react";
import { Clock, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInDays, isPast, isToday } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteValidityBadgeProps {
  validUntil: Date | string | null;
  warningDays?: number;
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

type ValidityStatus = "valid" | "expiring" | "expiring-today" | "expired" | "no-date";

// ============================================================================
// HELPERS
// ============================================================================

function getValidityStatus(
  validUntil: Date | null,
  warningDays: number
): ValidityStatus {
  if (!validUntil) return "no-date";

  if (isPast(validUntil) && !isToday(validUntil)) {
    return "expired";
  }

  if (isToday(validUntil)) {
    return "expiring-today";
  }

  const daysUntil = differenceInDays(validUntil, new Date());
  if (daysUntil <= warningDays) {
    return "expiring";
  }

  return "valid";
}

function getStatusConfig(status: ValidityStatus) {
  switch (status) {
    case "valid":
      return {
        variant: "outline" as const,
        className: "border-green-500 text-green-700 bg-green-50",
        Icon: CheckCircle,
        iconColor: "text-green-500",
      };
    case "expiring":
      return {
        variant: "outline" as const,
        className: "border-yellow-500 text-yellow-700 bg-yellow-50",
        Icon: AlertTriangle,
        iconColor: "text-yellow-500",
      };
    case "expiring-today":
      return {
        variant: "outline" as const,
        className: "border-orange-500 text-orange-700 bg-orange-50",
        Icon: Clock,
        iconColor: "text-orange-500",
      };
    case "expired":
      return {
        variant: "destructive" as const,
        className: "",
        Icon: XCircle,
        iconColor: "text-destructive",
      };
    case "no-date":
      return {
        variant: "secondary" as const,
        className: "",
        Icon: Clock,
        iconColor: "text-muted-foreground",
      };
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuoteValidityBadge = memo(function QuoteValidityBadge({
  validUntil,
  warningDays = 7,
  showIcon = true,
  showTooltip = true,
  className,
}: QuoteValidityBadgeProps) {
  const parsedDate = useMemo(() => {
    if (!validUntil) return null;
    return typeof validUntil === "string" ? new Date(validUntil) : validUntil;
  }, [validUntil]);

  const status = useMemo(
    () => getValidityStatus(parsedDate, warningDays),
    [parsedDate, warningDays]
  );

  const config = getStatusConfig(status);

  const label = useMemo(() => {
    if (!parsedDate) return "No expiry set";

    switch (status) {
      case "expired":
        return `Expired ${formatDistanceToNow(parsedDate, { addSuffix: true })}`;
      case "expiring-today":
        return "Expires today";
      case "expiring":
        return `Expires ${formatDistanceToNow(parsedDate, { addSuffix: true })}`;
      case "valid":
        return `Valid for ${formatDistanceToNow(parsedDate)}`;
      default:
        return "No expiry set";
    }
  }, [parsedDate, status]);

  const tooltipContent = useMemo(() => {
    if (!parsedDate) return "No expiration date set for this quote";

    const dateStr = parsedDate.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    switch (status) {
      case "expired":
        return `This quote expired on ${dateStr}. It can no longer be accepted unless extended.`;
      case "expiring-today":
        return `This quote expires today (${dateStr}). Action required.`;
      case "expiring":
        return `This quote expires on ${dateStr}. Consider following up with the customer.`;
      case "valid":
        return `Valid until ${dateStr}`;
      default:
        return "No expiration date set";
    }
  }, [parsedDate, status]);

  const badge = (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1",
        config.className,
        className
      )}
    >
      {showIcon && <config.Icon className={cn("h-3 w-3", config.iconColor)} />}
      {label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{tooltipContent}</p>
      </TooltipContent>
    </Tooltip>
  );
});

export default QuoteValidityBadge;
