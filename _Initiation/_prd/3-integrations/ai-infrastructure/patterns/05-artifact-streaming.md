# Artifact Streaming Patterns

## Source
- `_reference/.midday-reference/apps/api/src/ai/artifacts/*.ts`
- `_reference/.midday-reference/apps/api/src/ai/tools/get-balance-sheet.ts`

## 1. Artifact Definition

Define artifacts with Zod schema and stage enum:

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
      revenueGrowth: z.number(),
    }).optional(),

    // Analysis (available at analysis_ready)
    analysis: z.object({
      summary: z.string(),
      recommendations: z.array(z.string()),
    }).optional(),
  }),
);
```

## 2. Stage Lifecycle

```
loading → chart_ready → metrics_ready → analysis_ready
   │           │             │               │
   │           │             │               └── AI insights overlay
   │           │             └── Summary metrics rendered
   │           └── Visualization (chart/table) rendered
   └── Skeleton loading state
```

Each stage adds data progressively:

| Stage | What's Available | UI State |
|-------|------------------|----------|
| loading | Basic metadata | Skeleton loader |
| chart_ready | + chart data | Chart visible, metrics loading |
| metrics_ready | + metrics | Chart + metrics visible |
| analysis_ready | + analysis | Full display with insights |

## 3. Artifact Usage in Tools

```typescript
// src/lib/ai/tools/analytics-tools.ts
export const getRevenueTool = tool({
  description: "Get revenue analysis with optional visualization",
  inputSchema: z.object({
    period: z.enum(["3-months", "6-months", "1-year"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    showCanvas: z.boolean().default(false).describe("Show visual analytics"),
  }),
  execute: async function* ({ period, from, to, showCanvas }, executionOptions) {
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

      // 3. Fetch data
      const revenueData = await getRevenueData(db, {
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

      // 8. Update to analysis_ready
      if (showCanvas && analysis) {
        await analysis.update({
          stage: "analysis_ready",
          analysis: { summary, recommendations },
        });
      }

      // 9. Yield text response (minimal if showCanvas, detailed otherwise)
      if (showCanvas) {
        yield {
          text: `Revenue analysis for ${resolved.from} to ${resolved.to}.\n\n${summary}`,
        };
      } else {
        // Detailed text response without visualization
        yield {
          text: formatDetailedRevenueReport(revenueData, metrics, summary, recommendations),
        };
      }

      return metrics;
    } catch (error) {
      yield { text: `Failed to generate revenue analysis: ${error.message}` };
      return null;
    }
  },
});
```

## 4. showCanvas Pattern

The `showCanvas` parameter controls output strategy:

```typescript
// When showCanvas is TRUE:
// - Initialize artifact with loading state
// - Update artifact through stages as data arrives
// - Yield MINIMAL text (summary only)
// - Details displayed in visual artifact

// When showCanvas is FALSE:
// - No artifact initialization
// - Yield COMPREHENSIVE text response
// - All data in markdown format
```

### Agent Instructions for showCanvas

```markdown
<Tool selection>
- Revenue analysis → getRevenue (showCanvas: true if "show", "visual", "chart" mentioned)
- Order breakdown → getOrders (showCanvas: true for multi-row data)
- Customer history → getCustomerHistory (showCanvas: true if visual requested)
</Tool selection>

<Response rules>
- When tool returns with showCanvas: true, use ONLY the tool's text response
- Do NOT duplicate data in markdown that's shown in the artifact
- Add brief analysis or recommendations if appropriate
</Response rules>
```

## 5. Dashboard Update Pattern

Artifacts can trigger dashboard widget updates:

```typescript
// In artifact schema, add optional dashboardUpdate
const revenueArtifact = artifact("revenue-canvas", z.object({
  // ... other fields
  dashboardUpdate: z.object({
    widget: z.string(),
    data: z.unknown(),
  }).optional(),
}));

// In tool, include dashboard update
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
```

Frontend handles the update:

```typescript
// Frontend artifact renderer
function ArtifactRenderer({ artifact, onDashboardUpdate }) {
  useEffect(() => {
    if (artifact.dashboardUpdate) {
      onDashboardUpdate(artifact.dashboardUpdate);
    }
  }, [artifact.dashboardUpdate]);

  // Render based on stage...
}
```

## 6. Artifact Title Generation

Generate human-readable titles for date ranges:

```typescript
// src/lib/ai/artifacts/utils.ts
import { format, getYear, isSameMonth, isSameYear, parseISO } from "date-fns";

export function generateDescription(from: string, to: string): string {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const fromYear = getYear(fromDate);
  const toYear = getYear(toDate);

  // Same month: "Aug 2026"
  if (isSameYear(fromDate, toDate) && isSameMonth(fromDate, toDate)) {
    return format(fromDate, "MMM yyyy");
  }

  // Same year: "Jan-Aug 2026"
  if (isSameYear(fromDate, toDate)) {
    return `${format(fromDate, "MMM")}-${format(toDate, "MMM")} ${fromYear}`;
  }

  // Different years: "2025-2026"
  return `${fromYear}-${toYear}`;
}
```

## 7. Frontend Artifact Renderer

```typescript
// src/components/ai/artifact-renderer.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ArtifactRendererProps {
  artifact: ArtifactData;
  onStageChange?: (stage: string) => void;
  onDashboardUpdate?: (update: { widget: string; data: unknown }) => void;
}

export function ArtifactRenderer({
  artifact,
  onStageChange,
  onDashboardUpdate,
}: ArtifactRendererProps) {
  // Track stage changes
  useEffect(() => {
    onStageChange?.(artifact.stage);
  }, [artifact.stage]);

  // Handle dashboard updates
  useEffect(() => {
    if (artifact.dashboardUpdate) {
      onDashboardUpdate?.(artifact.dashboardUpdate);
    }
  }, [artifact.dashboardUpdate]);

  return (
    <Card aria-live="polite">
      <CardHeader>
        <h3>{artifact.description ?? "Analysis"}</h3>
      </CardHeader>
      <CardContent>
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
          <MetricsSummary metrics={artifact.metrics} />
        )}

        {/* Stage: analysis_ready */}
        {artifact.analysis && (
          <AnalysisOverlay
            summary={artifact.analysis.summary}
            recommendations={artifact.analysis.recommendations}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

## Usage in PRD Stories

- **AI-INFRA-009**: Artifact Renderer UI - Use frontend pattern
- **AI-INFRA-016**: Artifacts Streaming API - Use backend streaming pattern
