# Artifact Streaming Patterns

## What Are Artifacts?

Artifacts are **typed, streaming UI elements** that the AI can generate. Instead of just text responses, the AI can stream rich components like charts, tables, and metrics.

---

## Progressive Loading Stages

Artifacts load in stages for better UX:

```
loading → data_ready → analysis_ready
```

**Stage 1: Loading**
```typescript
{ stage: 'loading', message: 'Fetching customer data...' }
```

**Stage 2: Data Ready**
```typescript
{
  stage: 'data_ready',
  data: { customer, orders, metrics }
}
```

**Stage 3: Analysis Ready**
```typescript
{
  stage: 'analysis_ready',
  data: { customer, orders, metrics },
  insights: ['Revenue up 15% this quarter', 'Payment patterns healthy']
}
```

---

## Implementation with @ai-sdk-tools/artifacts

```typescript
// lib/ai/artifacts/customer-360.ts
import { defineArtifact } from '@ai-sdk-tools/artifacts';

export const customer360Artifact = defineArtifact({
  id: 'customer-360',
  name: 'Customer 360 View',
  description: 'Comprehensive customer overview with metrics',

  stages: ['loading', 'data_ready', 'analysis_ready'],

  async *generate(params: { customerId: string }) {
    // Stage 1: Loading
    yield {
      stage: 'loading',
      message: `Loading customer ${params.customerId}...`
    };

    // Fetch data
    const customer = await getCustomer(params.customerId);
    const orders = await getRecentOrders(params.customerId, 10);
    const metrics = await getCustomerMetrics(params.customerId);

    // Stage 2: Data ready (user sees info immediately)
    yield {
      stage: 'data_ready',
      customer,
      orders,
      metrics
    };

    // Compute insights (may take longer)
    const insights = await generateInsights(customer, orders, metrics);

    // Stage 3: Analysis ready
    yield {
      stage: 'analysis_ready',
      customer,
      orders,
      metrics,
      insights
    };
  }
});
```

---

## React Hook Usage

```tsx
// components/ai/customer-artifact.tsx
import { useArtifact } from '@ai-sdk-tools/artifacts';

export function CustomerArtifact({ artifactId }: { artifactId: string }) {
  const { artifact, stage, isStreaming } = useArtifact(artifactId);

  if (stage === 'loading') {
    return <Skeleton className="h-48" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{artifact.customer.name}</CardTitle>
        {isStreaming && <Spinner size="sm" />}
      </CardHeader>

      <CardContent>
        {/* Data available immediately */}
        <CustomerMetrics metrics={artifact.metrics} />
        <RecentOrders orders={artifact.orders} />

        {/* Insights appear when ready */}
        {stage === 'analysis_ready' && (
          <InsightsPanel insights={artifact.insights} />
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Artifact Types for CRM

| Artifact | Use Case |
|----------|----------|
| `customer-360` | Full customer view with insights |
| `order-summary` | Order details with status timeline |
| `pipeline-chart` | Visual pipeline/funnel |
| `revenue-metrics` | Revenue charts and trends |
| `issue-timeline` | Customer support history |

---

## Pipeline Chart Artifact Example

```typescript
// lib/ai/artifacts/pipeline-chart.ts
export const pipelineChartArtifact = defineArtifact({
  id: 'pipeline-chart',
  name: 'Sales Pipeline',

  async *generate(params: { period: string }) {
    yield { stage: 'loading', message: 'Building pipeline view...' };

    const stages = await getPipelineStages(params.period);
    const deals = await getDealsByStage(params.period);

    yield {
      stage: 'data_ready',
      chartType: 'funnel',
      stages: stages.map(s => ({
        name: s.name,
        value: deals.filter(d => d.stageId === s.id).length,
        revenue: deals
          .filter(d => d.stageId === s.id)
          .reduce((sum, d) => sum + d.value, 0)
      }))
    };

    // Add predictions
    const predictions = await predictConversions(stages, deals);

    yield {
      stage: 'analysis_ready',
      chartType: 'funnel',
      stages: [...],
      predictions,
      insights: [
        `Conversion rate: ${predictions.overallRate}%`,
        `Projected revenue: $${predictions.projectedRevenue}`
      ]
    };
  }
});
```

---

## Tool That Creates Artifacts

```typescript
// lib/ai/tools/show-customer-view.ts
export const showCustomerViewTool = {
  name: 'show_customer_view',
  description: 'Display a rich customer 360 view',

  parameters: z.object({
    customerId: z.string()
  }),

  execute: async ({ customerId }, { getWriter }) => {
    // Get artifact writer for streaming
    const writer = getWriter();

    // Create and stream artifact
    const artifact = customer360Artifact.create({ customerId });

    for await (const update of artifact.generate({ customerId })) {
      await writer.write(update);
    }

    await writer.close();

    return {
      artifactId: artifact.id,
      message: `Here's the full view for this customer.`
    };
  }
};
```

---

## Artifact Registry

```typescript
// lib/ai/artifacts/index.ts
import { createArtifactRegistry } from '@ai-sdk-tools/artifacts';

export const artifactRegistry = createArtifactRegistry({
  artifacts: [
    customer360Artifact,
    orderSummaryArtifact,
    pipelineChartArtifact,
    revenueMetricsArtifact
  ]
});

// In agent setup
const agent = new Agent({
  ...config,
  artifacts: artifactRegistry
});
```
