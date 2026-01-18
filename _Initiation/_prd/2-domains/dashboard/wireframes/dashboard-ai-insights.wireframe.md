# Dashboard AI Insights Widget Wireframe

**Story:** DOM-DASH-008a, DOM-DASH-008b
**Purpose:** AI-generated business insights and anomaly detection
**Design Aesthetic:** Conversational, actionable, data-driven recommendations

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Insight card containers with severity-based styling
  - Header with sparkle icon and refresh controls
  - Footer section for chat link integration

### Alert
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Severity-based styling (critical/red, warning/orange, positive/green, info/gray)
  - Icon indicators for insight types (warning, anomaly, success, opportunity)
  - Dismissible alerts with close button

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Insight type badges (Alert, Anomaly, Positive, Info)
  - Color-coded severity indicators
  - Status badges for insight categorization

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Insight detail modal with expanded analysis
  - AI chat integration panel
  - Recommended actions display with action buttons

## AI Insights Widget Container

```
+================================================+
|  AI INSIGHTS WIDGET                             |
+================================================+
|  +------------------------------------------+  |
|  | [Sparkles] AI Insights   [Refresh] [...]  |  <- Widget header
|  +------------------------------------------+  |
|  |                                          |  |
|  |  +--------------------------------------+|  |
|  |  | [!] Commercial Demand Spike          ||  <- High priority insight
|  |  | Commercial battery orders up 35%     ||
|  |  | this month. Consider increasing      ||
|  |  | commercial inventory levels.         ||
|  |  | [View Details] [Dismiss]             ||
|  |  +--------------------------------------+|  |
|  |                                          |  |
|  |  +--------------------------------------+|  |
|  |  | [^] Strong Quote Win Rate            ||  <- Positive insight
|  |  | Your quote win rate reached 72%,     ||
|  |  | up from 65%. 8 quotes likely to win. ||
|  |  | [View Pipeline]                      ||
|  |  +--------------------------------------+|  |
|  |                                          |  |
|  |  +--------------------------------------+|  |
|  |  | [i] Seasonal Pattern Detected        ||  <- Info insight
|  |  | Residential demand typically drops   ||
|  |  | 20% in Q1. Plan inventory accordingly||
|  |  | [View Analysis]                      ||
|  |  +--------------------------------------+|  |
|  |                                          |  |
|  +------------------------------------------+  |
|  | [Chat] Ask AI about your data...         |  <- Link to AI chat
|  +------------------------------------------+  |
+================================================+
```

## Insight Card Anatomy

```
+================================================+
|  INSIGHT CARD STRUCTURE                         |
+================================================+
|  +------------------------------------------+  |
|  | [Icon] Insight Title              [Type]  |  <- Icon + Title + Badge
|  |                                          |  |
|  | Insight description text that explains   |  <- Description (2-3 lines)
|  | what the AI detected and why it matters  |  |
|  | to your business operations.             |  |
|  |                                          |  |
|  | [Primary Action] [Secondary] [Dismiss]   |  <- Action buttons
|  +------------------------------------------+  |
+================================================+
```

## Insight Severity Types

```
+--------------------------------------------------+
| INSIGHT TYPE       | ICON      | COLOR           |
+--------------------------------------------------+
| Critical/Warning   | [!]       | Red (#ef4444)   |
| Anomaly            | [!]       | Orange (#f59e0b)|
| Positive/Success   | [^]       | Green (#22c55e) |
| Opportunity        | [*]       | Blue (#3b82f6)  |
| Informational      | [i]       | Gray (muted)    |
+--------------------------------------------------+
```

## Insight Card Variants

### Warning/Alert Insight

```
+------------------------------------------+
| [!] Installation Delays Detected [Alert] |
+------------------------------------------+
|                                          |
| Average install time increased by 25%    |
| this quarter. Three projects overdue.    |
|                                          |
| Affected projects:                       |
| - Brisbane SC: 50kWh (5 days overdue)    |
| - Sydney ES: 25kWh (3 days overdue)      |
| - Perth R: 15kWh (2 days overdue)        |
|                                          |
| [Review Projects] [View Analysis]        |
+------------------------------------------+
```

### Opportunity Insight

```
+------------------------------------------+
| [*] Solar Integration Opportunity [Positive] |
+------------------------------------------+
|                                          |
| 8 customers purchased batteries without  |
| solar panels. They may be interested in  |
| complete renewable energy systems.       |
|                                          |
| Potential additional revenue: ~$45,000   |
|                                          |
| [View Customers] [Create Campaign]       |
+------------------------------------------+
```

### Anomaly Insight

```
+------------------------------------------+
| [!] Unusual Order Pattern      [Anomaly] |
+------------------------------------------+
|                                          |
| Order volume today is 3x higher than     |
| normal. No marketing campaign is         |
| currently active.                        |
|                                          |
| Possible causes:                         |
| - Competitor issue                       |
| - Viral social mention                   |
| - Seasonal pattern not in history        |
|                                          |
| [Investigate] [Mark as Expected]         |
+------------------------------------------+
```

### Trend Insight

```
+------------------------------------------+
| [^] Strong Growth Trend       [Positive] |
+------------------------------------------+
|                                          |
| Your average order value has increased   |
| 18% over the last 30 days.               |
|                                          |
| Contributing factors:                    |
| - New product bundle: +$45 avg           |
| - Premium shipping option: +$12 avg      |
|                                          |
| [View Trend Report]                      |
+------------------------------------------+
```

### Informational Insight

```
+------------------------------------------+
| [i] Weekly Summary             [Info]    |
+------------------------------------------+
|                                          |
| This week you processed 47 orders,       |
| up 12% from last week. Your top          |
| performing day was Wednesday.            |
|                                          |
| [View Full Report]                       |
+------------------------------------------+
```

## Widget States

### Loading State

```
+------------------------------------------+
| [Sparkles] AI Insights          [...]    |
+------------------------------------------+
|                                          |
|    +------------------------------------+|
|    |                                    ||
|    |    [Sparkle animation]             ||
|    |                                    ||
|    |    Analyzing your data...          ||
|    |                                    ||
|    |    This may take a few moments     ||
|    |                                    ||
|    +------------------------------------+|
|                                          |
+------------------------------------------+
```

### Empty State (No Insights)

```
+------------------------------------------+
| [Sparkles] AI Insights                   |
+------------------------------------------+
|                                          |
|    +------------------------------------+|
|    |                                    ||
|    |    [Checkmark icon]                ||
|    |                                    ||
|    |    All clear!                      ||
|    |                                    ||
|    |    No notable patterns or          ||
|    |    anomalies detected today.       ||
|    |                                    ||
|    |    [Ask AI a Question]             ||
|    +------------------------------------+|
|                                          |
+------------------------------------------+
```

### Error State

```
+------------------------------------------+
| [Sparkles] AI Insights           [!]     |
+------------------------------------------+
|                                          |
|    +------------------------------------+|
|    |                                    ||
|    |    [Error icon]                    ||
|    |                                    ||
|    |    Unable to generate insights     ||
|    |                                    ||
|    |    AI analysis is temporarily      ||
|    |    unavailable. Please try again.  ||
|    |                                    ||
|    |    [Retry]                         ||
|    +------------------------------------+|
|                                          |
+------------------------------------------+
```

## Refresh Behavior

```
+------------------------------------------+
| [Sparkles] AI Insights   [Spin] [...]    |  <- Spinning refresh icon
+------------------------------------------+
|                                          |
|  Insights are faded/dimmed               |
|  +--------------------------------------+|
|  |  (Previous insights at 50% opacity) ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

## Link to AI Chat

```
+------------------------------------------+
| CHAT LINK AT BOTTOM OF WIDGET            |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  | [Chat icon] Ask AI about your data   ||
|  |                                      ||
|  | "Why is revenue up this week?"       ||  <- Example question
|  | "Show me customer trends"            ||
|  | "What should I focus on today?"      ||
|  +--------------------------------------+|
|                                          |
|  [Open AI Chat]                          |  <- Opens chat panel/modal
+------------------------------------------+
```

## Insight Detail Modal

```
+================================================================+
|  INSIGHT DETAIL                                    [X Close]    |
+================================================================+
|  [!] Revenue Decline Detected                                   |
|  Identified: December 10, 2024 at 9:15 AM                       |
+================================================================+
|                                                                 |
|  SUMMARY                                                        |
|  +-----------------------------------------------------------+ |
|  | Revenue is down 15% compared to the same period last      | |
|  | month. Based on historical patterns, this is unusual for  | |
|  | your business at this time of year.                       | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  ANALYSIS                                                       |
|  +-----------------------------------------------------------+ |
|  | Contributing Factors:                                      | |
|  | - 3 major customers haven't ordered this week              | |
|  | - Order volume from new customers is flat                  | |
|  | - No active marketing campaigns                            | |
|  |                                                           | |
|  | Affected Customers:                                        | |
|  | +--------------------------------------------------------+| |
|  | | Customer    | Usual Weekly | This Week | Variance     || |
|  | |-------------|--------------|-----------|--------------||| |
|  | | Acme Corp   | $5,000       | $0        | -100%        || |
|  | | Beta Inc    | $3,000       | $500      | -83%         || |
|  | | Gamma LLC   | $2,000       | $0        | -100%        || |
|  | +--------------------------------------------------------+| |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  RECOMMENDED ACTIONS                                            |
|  +-----------------------------------------------------------+ |
|  | 1. [Contact Acme Corp] - Check if they need anything       | |
|  | 2. [Contact Beta Inc] - Their order was unusually small    | |
|  | 3. [Review Campaigns] - Consider launching a promotion     | |
|  +-----------------------------------------------------------+ |
|                                                                 |
+================================================================+
|  [Mark as Resolved]  [Discuss with AI]         [Close]          |
+================================================================+
```

## Mobile Layout

### Mobile Insights Widget

```
+================================+
|  AI Insights         [Refresh] |
+================================+
|                                |
|  +----------------------------+|
|  | [!] Revenue Anomaly        ||
|  | Revenue is 23% above       ||
|  | normal for this time...    ||
|  | [View] [Dismiss]           ||
|  +----------------------------+|
|                                |
|  +----------------------------+|
|  | [^] Pipeline Growth        ||
|  | Your pipeline increased    ||
|  | 45% this week...           ||
|  | [View Pipeline]            ||
|  +----------------------------+|
|                                |
|  [Ask AI...]                   |
+================================+
```

### Mobile Insight Detail (Bottom Sheet)

```
+================================+
|  [---] Drag handle             |
+================================+
|  [!] Revenue Anomaly           |
|  Dec 10, 2024                  |
+================================+
|                                |
|  Revenue is 23% above normal   |
|  for this time of month.       |
|                                |
|  Possible Causes:              |
|  - Holiday promotion active    |
|  - Large customer order        |
|  - Seasonal pattern            |
|                                |
|  [View Details]                |
|  [Discuss with AI]             |
|  [Dismiss]                     |
|                                |
+================================+
```

## Insight Actions

```
+--------------------------------------------------+
| ACTION TYPES                                      |
+--------------------------------------------------+

Primary Actions (contextual):
- [View Details] - Opens insight detail modal
- [View {Entity}] - Navigates to related page
- [Contact Customer] - Opens communication flow
- [Create Campaign] - Opens marketing tool
- [Investigate] - Opens analysis view

Secondary Actions:
- [Dismiss] - Removes from widget, adds to history
- [Mark as Expected] - Trains AI pattern recognition
- [Discuss with AI] - Opens AI chat with context

Persistence:
- Dismissed insights hidden for 24 hours
- "Mark as Expected" feeds back to AI model
- Action taken logged for pattern learning
```

## AI Chat Integration

```
+================================================================+
|  AI CHAT PANEL (Opened from Insight)               [X Close]    |
+================================================================+
|                                                                 |
|  Context: Revenue Decline Insight                               |
|  +-----------------------------------------------------------+ |
|  | AI has context about the revenue decline you're viewing    | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  [User] Why might these customers have stopped ordering?        |
|                                                                 |
|  [AI] Based on the data, here are some possibilities:          |
|       1. Acme Corp's last order was a large inventory buy -    |
|          they may be stocked up.                               |
|       2. Beta Inc typically orders bi-weekly, so the smaller   |
|          order may be part of their normal pattern.            |
|       3. Gamma LLC has been steadily reducing order frequency  |
|          over the past 3 months.                               |
|                                                                 |
|       Would you like me to draft outreach emails for each?     |
|                                                                 |
|  +-----------------------------------------------------------+ |
|  | [Type your question...]                          [Send]    | |
|  +-----------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

## Accessibility Requirements

### ARIA Labels

```tsx
<section aria-label="AI-generated business insights">
  <h2 id="insights-heading">AI Insights</h2>

  <div role="feed" aria-labelledby="insights-heading">
    <article
      aria-label="Warning: Revenue decline detected"
      role="article"
    >
      <div role="img" aria-label="Warning indicator">
        <AlertIcon />
      </div>
      <h3>Revenue Decline Detected</h3>
      <p>Revenue is down 15% compared to...</p>
      <div role="group" aria-label="Insight actions">
        <button>Contact Customers</button>
        <button>View Analysis</button>
        <button aria-label="Dismiss this insight">Dismiss</button>
      </div>
    </article>
  </div>
</section>
```

### Screen Reader Announcements

```
On widget load:
"AI Insights widget loaded. 3 insights available.
First insight: Warning - Revenue decline detected."

On new insight:
"New AI insight: Unusual order pattern detected. High priority."

On insight dismissed:
"Insight dismissed. 2 insights remaining."
```

### Keyboard Navigation

```
Tab: Move between insight cards
Enter: Open primary action
Arrow Down/Up: Navigate within card actions
Escape: Close detail modal
D: Dismiss focused insight
R: Refresh insights
```

## Component Props Interface

```typescript
interface AIInsightsWidgetProps {
  // Data
  insights: Insight[];
  isLoading?: boolean;
  error?: Error | null;

  // Actions
  onRefresh: () => Promise<void>;
  onInsightDismiss: (insightId: string) => void;
  onInsightAction: (insightId: string, action: string) => void;
  onOpenChat: (context?: Insight) => void;

  // Display options
  maxInsights?: number; // Default 5
  showChatLink?: boolean;
}

interface Insight {
  id: string;
  type: 'warning' | 'anomaly' | 'positive' | 'opportunity' | 'info';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  details?: InsightDetails;
  actions: InsightAction[];
  timestamp: Date;
  isNew?: boolean;
  isDismissible?: boolean;
}

interface InsightDetails {
  analysis: string;
  factors: string[];
  recommendations: string[];
  relatedEntities?: {
    type: string;
    id: string;
    name: string;
    data?: Record<string, unknown>;
  }[];
}

interface InsightAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'dismiss';
  href?: string;
  onClick?: () => void;
}
```

## Caching Strategy

```
+--------------------------------------------------+
| AI INSIGHTS CACHING                               |
+--------------------------------------------------+

Cache Duration: 5 minutes (configurable)
Refresh Triggers:
- Manual refresh button
- Dashboard date range change
- Significant data change detected
- Cache expiration

Stale-While-Revalidate:
- Show cached insights immediately
- Fetch new insights in background
- Animate transition if insights change

Cache Key: insights_{orgId}_{dateRange}_{dataHash}
+--------------------------------------------------+
```

## Success Metrics

- Insights generate within 3 seconds
- Users engage with 60%+ of high-priority insights
- Dismissed insights reduce similar future alerts
- AI chat context transfer is seamless
- All insights accessible via keyboard
- Screen reader users can understand insight severity
