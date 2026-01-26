# Tool with Artifact Example (Revenue Report)

## Source
- `_reference/.midday-reference/apps/api/src/ai/tools/get-balance-sheet.ts`
- `_reference/.midday-reference/apps/api/src/ai/artifacts/revenue.ts`

## 1. Artifact Definition

```typescript
// src/lib/ai/artifacts/revenue.ts
import { artifact } from "@ai-sdk-tools/artifacts";
import { z } from "zod";

export const revenueArtifact = artifact(
  "revenue-canvas",
  z.object({
    // Stage lifecycle
    stage: z.enum([
      "loading",
      "chart_ready",
      "metrics_ready",
      "analysis_ready",
    ]),

    // Basic metadata (always present)
    currency: z.string(),
    from: z.string().optional().describe("Start date (ISO 8601)"),
    to: z.string().optional().describe("End date (ISO 8601)"),
    description: z.string().optional(),

    // Chart data (available at chart_ready)
    chart: z.object({
      monthlyData: z.array(z.object({
        month: z.string(),
        revenue: z.number(),
        lastYearRevenue: z.number(),
        average: z.number(),
      })),
    }).optional(),

    // Metrics (available at metrics_ready)
    metrics: z.object({
      totalRevenue: z.number(),
      averageMonthlyRevenue: z.number(),
      currentMonthRevenue: z.number(),
      revenueGrowth: z.number().describe("Percentage growth vs last year"),
    }).optional(),

    // Analysis (available at analysis_ready)
    analysis: z.object({
      summary: z.string(),
      recommendations: z.array(z.string()),
    }).optional(),

    // Optional dashboard update
    dashboardUpdate: z.object({
      widget: z.string(),
      data: z.unknown(),
    }).optional(),
  }),
);
```

## 2. Tool Implementation

```typescript
// src/lib/ai/tools/analytics-tools.ts
import { tool } from "ai";
import { z } from "zod";
import type { AppContext } from "../context/types";
import { resolveToolParams } from "../utils/resolve-params";
import { revenueArtifact } from "../artifacts/revenue";
import { getWriter } from "../utils/artifact-writer";
import { generateDescription } from "../artifacts/utils";
import { db } from "@/lib/db";

export const getRevenueTool = tool({
  description: "Get revenue analysis with optional visualization canvas",

  inputSchema: z.object({
    period: z.enum(["3-months", "6-months", "1-year", "2-years"])
      .optional()
      .describe("Historical period"),
    from: z.string()
      .optional()
      .describe("Start date (yyyy-MM-dd)"),
    to: z.string()
      .optional()
      .describe("End date (yyyy-MM-dd)"),
    showCanvas: z.boolean()
      .default(false)
      .describe("Show visual analytics canvas (use when 'show', 'visual', 'chart' mentioned)"),
  }),

  execute: async function* (
    { period, from, to, showCanvas },
    executionOptions,
  ) {
    const appContext = executionOptions.experimental_context as AppContext;

    try {
      // 1. Resolve parameters
      const resolved = resolveToolParams({
        toolName: "getRevenue",
        appContext,
        aiParams: { period, from, to },
      });

      // 2. Initialize artifact if showCanvas is true
      let analysis: ReturnType<typeof revenueArtifact.stream> | undefined;

      if (showCanvas) {
        const writer = getWriter(executionOptions);
        analysis = revenueArtifact.stream(
          {
            stage: "loading",
            currency: resolved.currency,
            from: resolved.from,
            to: resolved.to,
            description: generateDescription(resolved.from, resolved.to),
          },
          writer,
        );
      }

      // 3. Fetch revenue data
      const revenueData = await getRevenueData({
        organizationId: appContext.organizationId,
        from: resolved.from,
        to: resolved.to,
        currency: resolved.currency,
      });

      // 4. Update to chart_ready
      if (showCanvas && analysis) {
        await analysis.update({
          stage: "chart_ready",
          chart: {
            monthlyData: revenueData.monthly.map((m) => ({
              month: m.month,
              revenue: m.revenue,
              lastYearRevenue: m.lastYearRevenue,
              average: revenueData.averageMonthly,
            })),
          },
        });
      }

      // 5. Calculate metrics
      const metrics = {
        totalRevenue: revenueData.total,
        averageMonthlyRevenue: revenueData.averageMonthly,
        currentMonthRevenue: revenueData.currentMonth,
        revenueGrowth: calculateGrowth(revenueData),
      };

      // 6. Update to metrics_ready
      if (showCanvas && analysis) {
        await analysis.update({
          stage: "metrics_ready",
          metrics,
        });
      }

      // 7. Generate analysis
      const summary = generateRevenueSummary(metrics);
      const recommendations = generateRecommendations(metrics);

      // 8. Update to analysis_ready (final stage)
      if (showCanvas && analysis) {
        await analysis.update({
          stage: "analysis_ready",
          analysis: { summary, recommendations },
          dashboardUpdate: {
            widget: "revenue",
            data: metrics,
          },
        });
      }

      // 9. Yield response based on showCanvas
      if (showCanvas) {
        // Minimal text when visual is shown
        yield {
          text: `Revenue analysis for ${resolved.from} to ${resolved.to}.\n\n${summary}`,
        };
      } else {
        // Detailed text response without visualization
        yield {
          text: formatDetailedRevenueReport(revenueData, metrics, summary, recommendations),
          link: {
            text: "View full analytics",
            url: "/analytics/revenue",
          },
        };
      }

      return metrics;
    } catch (error) {
      yield {
        text: `Failed to generate revenue analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
      return null;
    }
  },
});

// Helper functions
async function getRevenueData(params: {
  organizationId: string;
  from: string;
  to: string;
  currency: string;
}) {
  // Query database for revenue data
  const result = await db.query.orders.findMany({
    where: and(
      eq(orders.organizationId, params.organizationId),
      eq(orders.status, "completed"),
      gte(orders.completedAt, new Date(params.from)),
      lte(orders.completedAt, new Date(params.to)),
    ),
    columns: {
      total: true,
      completedAt: true,
    },
  });

  // Aggregate by month
  const monthly = aggregateByMonth(result);
  const total = result.reduce((sum, o) => sum + Number(o.total), 0);
  const averageMonthly = total / monthly.length;
  const currentMonth = monthly[monthly.length - 1]?.revenue ?? 0;

  return { monthly, total, averageMonthly, currentMonth };
}

function calculateGrowth(data: { total: number; lastYearTotal: number }): number {
  if (data.lastYearTotal === 0) return 0;
  return ((data.total - data.lastYearTotal) / data.lastYearTotal) * 100;
}

function generateRevenueSummary(metrics: {
  totalRevenue: number;
  revenueGrowth: number;
}): string {
  const growthDirection = metrics.revenueGrowth >= 0 ? "up" : "down";
  return `Total revenue: ${formatCurrency(metrics.totalRevenue)}. ` +
    `${Math.abs(metrics.revenueGrowth).toFixed(1)}% ${growthDirection} vs last year.`;
}

function generateRecommendations(metrics: {
  revenueGrowth: number;
  averageMonthlyRevenue: number;
}): string[] {
  const recommendations: string[] = [];

  if (metrics.revenueGrowth < 0) {
    recommendations.push("Review pricing strategy and customer retention");
  }
  if (metrics.revenueGrowth > 20) {
    recommendations.push("Consider expanding capacity to sustain growth");
  }

  return recommendations;
}

function formatDetailedRevenueReport(
  data: RevenueData,
  metrics: Metrics,
  summary: string,
  recommendations: string[],
): string {
  const header = "| Month | Revenue | vs Last Year | Avg |";
  const separator = "|-------|---------|--------------|-----|";
  const rows = data.monthly.map((m) =>
    `| ${m.month} | ${formatCurrency(m.revenue)} | ${formatCurrency(m.lastYearRevenue)} | ${formatCurrency(data.averageMonthly)} |`
  ).join("\n");

  return `## Revenue Report

${summary}

### Monthly Breakdown

${header}
${separator}
${rows}

### Key Metrics

- **Total Revenue**: ${formatCurrency(metrics.totalRevenue)}
- **Monthly Average**: ${formatCurrency(metrics.averageMonthlyRevenue)}
- **Growth**: ${metrics.revenueGrowth.toFixed(1)}%

### Recommendations

${recommendations.map((r) => `- ${r}`).join("\n")}`;
}
```

## 3. Stage Lifecycle Visual

```
loading → chart_ready → metrics_ready → analysis_ready
   │           │             │               │
   │           │             │               └── AI insights overlay
   │           │             └── Summary metrics rendered
   │           └── Visualization (chart/table) rendered
   └── Skeleton loading state
```

## 4. showCanvas Pattern

The `showCanvas` parameter controls output strategy:

| showCanvas | Artifact | Text Response |
|------------|----------|---------------|
| `true` | Progressive stages | Minimal summary |
| `false` | None | Comprehensive markdown |

Agent instructions should include:

```markdown
<tool_selection>
- Revenue analysis → getRevenue (showCanvas: true if "show", "visual", "chart" mentioned)
- Quick revenue check → getRevenue (showCanvas: false for text-only)
</tool_selection>

<response_rules>
- When tool returns with showCanvas: true, use ONLY the tool's text response
- Do NOT duplicate data in markdown that's shown in the artifact
- Add brief analysis or recommendations if appropriate
</response_rules>
```

## 5. Frontend Renderer

```typescript
// src/components/ai/revenue-artifact.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { MetricsSummary } from "@/components/shared/metrics-summary";

interface RevenueArtifactProps {
  artifact: RevenueArtifactData;
  onDashboardUpdate?: (update: { widget: string; data: unknown }) => void;
}

export function RevenueArtifact({
  artifact,
  onDashboardUpdate,
}: RevenueArtifactProps) {
  // Handle dashboard updates
  useEffect(() => {
    if (artifact.dashboardUpdate) {
      onDashboardUpdate?.(artifact.dashboardUpdate);
    }
  }, [artifact.dashboardUpdate]);

  return (
    <Card aria-live="polite">
      <CardHeader>
        <h3>{artifact.description ?? "Revenue Analysis"}</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stage: loading */}
        {artifact.stage === "loading" && (
          <Skeleton className="h-64 w-full" />
        )}

        {/* Stage: chart_ready */}
        {artifact.chart && (
          <RevenueChart data={artifact.chart.monthlyData} />
        )}

        {/* Stage: metrics_ready */}
        {artifact.metrics && (
          <MetricsSummary
            items={[
              { label: "Total", value: artifact.metrics.totalRevenue },
              { label: "Average", value: artifact.metrics.averageMonthlyRevenue },
              { label: "Growth", value: `${artifact.metrics.revenueGrowth.toFixed(1)}%` },
            ]}
          />
        )}

        {/* Stage: analysis_ready */}
        {artifact.analysis && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">{artifact.analysis.summary}</p>
            {artifact.analysis.recommendations.length > 0 && (
              <ul className="mt-2 text-sm list-disc list-inside">
                {artifact.analysis.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Key Patterns Summary

1. **Stage-based progressive loading** - UI updates as data arrives
2. **showCanvas controls output** - Visual vs text response
3. **Dashboard updates** - Artifact can trigger widget refreshes
4. **Conditional initialization** - Only create artifact when needed
5. **Minimal text with visual** - Don't duplicate artifact data in text
