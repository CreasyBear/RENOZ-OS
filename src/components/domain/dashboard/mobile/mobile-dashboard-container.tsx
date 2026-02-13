/**
 * Mobile Dashboard Container
 *
 * ARCHITECTURE: Container Component - handles data fetching and passes to presenter.
 *
 * Uses dashboard context for date range filtering and renders a touch-optimized
 * mobile dashboard with KPI widgets, target progress, and activity feed.
 */

"use client";

import { useCallback, useMemo, useState, useEffect, startTransition } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, LayoutDashboard, Target } from "lucide-react";
import { MobileDashboard, type MobileWidgetConfig } from "./mobile-dashboard";
import { KPIWidget } from "../widgets/kpi-widget";
import { TargetProgressWidget } from "../target-progress";
import { ActivityFeed } from "@/components/shared/activity";
import { useDashboardDateRange } from "../dashboard-context";
import { formatDateRange } from "@/lib/utils/date-presets";
import { serializeDateForUrl } from "@/hooks/filters/use-filter-url-state";
import { useDashboardMetrics, useTargetProgress } from "@/hooks/dashboard";
import { useOrgFormat } from "@/hooks/use-org-format";

export function MobileDashboardContainer() {
  const navigate = useNavigate();
  const { dateRange } = useDashboardDateRange();
  const { formatCurrency, formatNumber } = useOrgFormat();

  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const metricsQuery = useDashboardMetrics({
    dateFrom: serializeDateForUrl(dateRange.from),
    dateTo: serializeDateForUrl(dateRange.to),
  });

  const targetProgressQuery = useTargetProgress();

  useEffect(() => {
    if (metricsQuery.data || targetProgressQuery.data) {
      startTransition(() => setLastUpdated(new Date()));
    }
  }, [metricsQuery.data, targetProgressQuery.data]);

  const kpiWidgets = useMemo(() => {
    const summary = metricsQuery.data?.summary;
    return [
      {
        key: "revenue",
        label: "Revenue",
        value: formatCurrency(summary?.revenue?.current ?? 0, { cents: false, showCents: true }),
        trend: summary?.revenue?.change,
      },
      {
        key: "pipeline",
        label: "Pipeline",
        value: formatCurrency(summary?.pipelineValue?.current ?? 0, { cents: false, showCents: true }),
        trend: summary?.pipelineValue?.change,
      },
      {
        key: "orders",
        label: "Orders",
        value: formatNumber(summary?.ordersCount?.current ?? 0, { decimals: 0 }),
        trend: summary?.ordersCount?.change,
      },
      {
        key: "customers",
        label: "Customers",
        value: formatNumber(summary?.customerCount?.current ?? 0, { decimals: 0 }),
        trend: summary?.customerCount?.change,
      },
    ];
  }, [metricsQuery.data, formatCurrency, formatNumber]);

  const widgets: MobileWidgetConfig[] = useMemo(
    () => [
      {
        id: "kpi-widgets",
        type: "kpi",
        title: "KPIs",
        icon: <LayoutDashboard className="size-4" />,
      },
      {
        id: "targets",
        type: "target",
        title: "Targets",
        icon: <Target className="size-4" />,
      },
      {
        id: "activity",
        type: "activity",
        title: "Activity",
        icon: <Activity className="size-4" />,
      },
    ],
    []
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([metricsQuery.refetch(), targetProgressQuery.refetch()]);
    setLastUpdated(new Date());
  }, [metricsQuery, targetProgressQuery]);

  const renderWidget = useCallback(
    (widget: MobileWidgetConfig) => {
      switch (widget.type) {
        case "kpi":
          return (
            <div className="grid grid-cols-2 gap-3">
              {kpiWidgets.map((kpi) => (
                <KPIWidget
                  key={kpi.key}
                  value={kpi.value}
                  label={kpi.label}
                  trend={
                    kpi.trend !== undefined
                      ? { value: kpi.trend, period: "vs last period" }
                      : undefined
                  }
                  isLoading={metricsQuery.isLoading}
                  error={metricsQuery.error instanceof Error ? metricsQuery.error : null}
                  formatValue={(val) => String(val)}
                />
              ))}
            </div>
          );
        case "target":
          return (
            <TargetProgressWidget
              progress={targetProgressQuery.data ?? null}
              isLoading={targetProgressQuery.isLoading}
              error={targetProgressQuery.error instanceof Error ? targetProgressQuery.error : null}
              onManageTargets={() => navigate({ to: "/settings/targets" })}
            />
          );
        case "activity":
          return (
            <ActivityFeed
              showFilters={false}
              compact
              className="rounded-lg border border-border bg-card"
            />
          );
        default:
          return null;
      }
    },
    [
      kpiWidgets,
      metricsQuery.isLoading,
      metricsQuery.error,
      targetProgressQuery.data,
      targetProgressQuery.isLoading,
      targetProgressQuery.error,
      navigate,
    ]
  );

  const dateRangeLabel = formatDateRange(dateRange);
  const isInitialLoading = metricsQuery.isLoading && !metricsQuery.data;
  const isRefreshing = metricsQuery.isFetching || targetProgressQuery.isFetching;
  const error =
    (metricsQuery.error instanceof Error ? metricsQuery.error : null) ??
    (targetProgressQuery.error instanceof Error ? targetProgressQuery.error : null);

  return (
    <MobileDashboard
      widgets={widgets}
      isInitialLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      error={error}
      onRefresh={handleRefresh}
      renderWidget={renderWidget}
      dateRangeLabel={dateRangeLabel}
      lastUpdated={lastUpdated}
      pullToRefreshEnabled
      swipeEnabled
    />
  );
}

export default MobileDashboardContainer;
