/**
 * Email Metrics Card Component
 *
 * Displays email delivery metrics in a card layout.
 *
 * @see INT-RES-005
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  CheckCircle,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import type { EmailMetrics } from "@/lib/schemas/communications/email-analytics";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailMetricsCardProps {
  metrics: EmailMetrics | undefined;
  isLoading?: boolean;
  className?: string;
}

interface MetricItemProps {
  label: string;
  value: number;
  rate?: number;
  rateLabel?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

// ============================================================================
// METRIC ITEM
// ============================================================================

function MetricItem({
  label,
  value,
  rate,
  rateLabel,
  icon,
  variant = "default",
}: MetricItemProps) {
  const variantStyles = {
    default: "text-gray-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
      <div className={`mt-0.5 ${variantStyles[variant]}`}>{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">
          {value.toLocaleString()}
        </div>
        {rate !== undefined && (
          <div className="mt-1 text-sm text-gray-500">
            {rate}% {rateLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function EmailMetricsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-4 w-24 mt-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EmailMetricsCard = memo(function EmailMetricsCard({
  metrics,
  isLoading,
  className,
}: EmailMetricsCardProps) {
  if (isLoading) {
    return <EmailMetricsCardSkeleton />;
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Email Metrics</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Email Delivery Metrics</CardTitle>
        <CardDescription>
          Performance over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricItem
            label="Sent"
            value={metrics.sent}
            icon={<Send className="h-5 w-5" />}
          />
          <MetricItem
            label="Delivered"
            value={metrics.delivered}
            rate={metrics.deliveryRate}
            rateLabel="delivery rate"
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
          />
          <MetricItem
            label="Opened"
            value={metrics.opened}
            rate={metrics.openRate}
            rateLabel="open rate"
            icon={<Eye className="h-5 w-5" />}
            variant="success"
          />
          <MetricItem
            label="Clicked"
            value={metrics.clicked}
            rate={metrics.clickRate}
            rateLabel="click rate"
            icon={<MousePointerClick className="h-5 w-5" />}
            variant="success"
          />
          <MetricItem
            label="Bounced"
            value={metrics.bounced}
            rate={metrics.bounceRate}
            rateLabel="bounce rate"
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={metrics.bounceRate > 5 ? "danger" : "warning"}
          />
          <MetricItem
            label="Complaints"
            value={metrics.complained}
            rate={metrics.complaintRate}
            rateLabel="complaint rate"
            icon={<ShieldAlert className="h-5 w-5" />}
            variant={metrics.complaintRate > 0.1 ? "danger" : "warning"}
          />
        </div>
      </CardContent>
    </Card>
  );
});
