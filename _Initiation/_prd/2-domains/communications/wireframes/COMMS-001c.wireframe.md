# Wireframe: DOM-COMMS-001c - Email Tracking Enhancements

## Story Reference

- **Story ID**: DOM-COMMS-001c
- **Name**: Fix Email Tracking Display and Add Template Stats
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: EmailTrackingBadge, TemplateStatsCard, TrackingTimeline

## Overview

Fixes non-functional tracking display in existing email-tracking.tsx and adds comprehensive template performance tracking with open/click rates, bounce tracking, and per-template analytics dashboard. Includes real-time status indicators, detailed tracking timeline, and aggregate statistics.

---

## UI Patterns (Reference Implementation)

### Core Components

| Wireframe Element | Reference Pattern | File Path |
|------------------|-------------------|-----------|
| **Tracking Badge** | Badge with variants | `_reference/.reui-reference/registry/default/ui/badge.tsx` |
| **Stats Card** | Card with header/content/footer | `_reference/.reui-reference/registry/default/ui/card.tsx` |
| **Progress Bar** | Progress component | `_reference/.reui-reference/registry/default/ui/progress.tsx` |
| **Data Table** | DataGrid with sorting/filtering | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` |
| **Timeline** | Custom timeline (no direct match) | Build using Card + Separator |
| **Detail Dialog** | Dialog with header/body/footer | `_reference/.reui-reference/registry/default/ui/dialog.tsx` |
| **Tabs** | Tabs component | `_reference/.reui-reference/registry/default/ui/base-tabs.tsx` |
| **Tooltip** | Tooltip for hover info | `_reference/.reui-reference/registry/default/ui/base-tooltip.tsx` |

### Layout Patterns

| Screen Size | Layout Pattern | Implementation |
|-------------|----------------|----------------|
| **Mobile (375px)** | Stacked cards, bottom sheet dialogs | Sheet component for filters |
| **Tablet (768px)** | 2-column grid, side-by-side stats | CSS Grid with responsive cols |
| **Desktop (1280px+)** | 3-column dashboard, modal dialogs | Dialog component for details |

### Midday Reference Patterns

| Feature | Midday Example | Location |
|---------|----------------|----------|
| **Stats Dashboard** | Analytics cards with metrics | `_reference/.midday-reference/` (search for dashboard patterns) |
| **Badge Status** | Status indicators with colors | Use Badge variants (success, warning, destructive) |
| **Timeline Events** | Activity feed patterns | Build custom using Separator + Card |

### Component Composition

```tsx
// Email Tracking Badge
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/base-tooltip"

<Tooltip>
  <TooltipTrigger>
    <Badge variant="success">Opened 3 times</Badge>
  </TooltipTrigger>
  <TooltipContent>
    Last opened: Jan 10 at 3:45 PM
  </TooltipContent>
</Tooltip>

// Template Stats Card
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

<Card>
  <CardHeader>
    <CardTitle>Quote Sent Template</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm">
          <span>Open Rate</span>
          <span>67.5%</span>
        </div>
        <Progress value={67.5} className="mt-2" />
      </div>
    </div>
  </CardContent>
</Card>

// Tracking Timeline
import { Separator } from "@/components/ui/base-separator"

<div className="relative pl-4 border-l-2 border-border">
  {events.map((event) => (
    <div key={event.id} className="mb-4">
      <div className="absolute -left-2 w-4 h-4 rounded-full bg-primary" />
      <Card>
        <CardContent className="pt-4">
          <h4>{event.type}</h4>
          <p className="text-sm text-muted-foreground">{event.timestamp}</p>
        </CardContent>
      </Card>
    </div>
  ))}
</div>

// Email Detail Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/base-tabs"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent variant="fullscreen">
    <DialogHeader>
      <DialogTitle>Email Details - Quote Sent</DialogTitle>
    </DialogHeader>
    <DialogBody>
      <Tabs defaultValue="tracking">
        <TabsList>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>
        <TabsContent value="tracking">
          {/* Timeline content */}
        </TabsContent>
      </Tabs>
    </DialogBody>
  </DialogContent>
</Dialog>
```

### State Management Patterns

| State | Pattern | Implementation |
|-------|---------|----------------|
| **Loading** | Skeleton placeholders | Use custom skeleton components |
| **Empty** | Empty state with icon + CTA | Card with centered content |
| **Error** | Alert with retry action | Alert component with actions |
| **Success** | Toast notification | Toast component for confirmations |

### Accessibility Patterns

- Badge: `role="status"` for tracking indicators
- Progress: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Timeline: `role="feed"` with `aria-label`
- Dialog: ARIA labels from Dialog component
- Stats: Screen reader announcements for metrics

### Animation Patterns

- Badge pulse: Use Tailwind `animate-pulse` for real-time updates
- Progress bar: CSS transition on value change
- Timeline entry: Stagger animation using CSS delays
- Card hover: Subtle elevation change (shadow)

---

## Mobile Wireframe (375px)

### Email List with Tracking Badges

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Sent] [Drafts] [Scheduled] [Templates] |
|  ===                                    |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | To: john@acme.com                   ||
|  | Subject: Your Quote Q-1234          ||
|  |                                     ||
|  | 3:45 PM - Quote Sent Template       ||
|  |                                     ||
|  | [*Opened 3x] [Clicked 1x]           ||
|  |  ^ green      ^ blue                ||
|  +-------------------------------------+|
|  |                                     ||
|  +-------------------------------------+|
|  | To: sarah@buildco.com               ||
|  | Subject: Order Confirmation O-5678  ||
|  |                                     ||
|  | Yesterday - Order Confirm Template  ||
|  |                                     ||
|  | [*Opened 1x] [!Bounced]             ||
|  |  ^ green      ^ red                 ||
|  +-------------------------------------+|
|  |                                     ||
|  +-------------------------------------+|
|  | To: mike@renovations.com            ||
|  | Subject: Follow-up on Estimate      ||
|  |                                     ||
|  | Jan 8 - Custom Email                ||
|  |                                     ||
|  | [Sent] [Not opened yet]             ||
|  |  ^ gray  ^ muted                    ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Email Detail with Tracking Timeline

```
+=========================================+
| < Back                            [Edit]|
+-----------------------------------------+
|                                         |
|  Your Quote Q-1234                      |
|  ─────────────────────────────────────  |
|                                         |
|  To: john@acme.com                      |
|  From: joel@renoz.com                   |
|  Sent: Today at 3:45 PM                 |
|  Template: Quote Sent                   |
|                                         |
|  [Tracking] [Content] [Recipients]      |
|   ========                              |
|                                         |
|  TRACKING EVENTS                        |
|  |                                      |
|  +--[*]--------------------------------+|
|  |  Clicked Link                       ||
|  |  "View Quote" button                ||
|  |                                     ||
|  |  4:23 PM | Location: San Francisco  ||
|  |  Device: Chrome on macOS            ||
|  +-------------------------------------+|
|  |                                      |
|  +--[*]--------------------------------+|
|  |  Email Opened                       ||
|  |  3rd open                           ||
|  |                                     ||
|  |  4:15 PM | Location: San Francisco  ||
|  |  Device: iPhone                     ||
|  +-------------------------------------+|
|  |                                      |
|  +--[*]--------------------------------+|
|  |  Email Opened                       ||
|  |  2nd open                           ||
|  |                                     ||
|  |  3:58 PM | Location: San Francisco  ||
|  |  Device: Chrome on macOS            ||
|  +-------------------------------------+|
|  |                                      |
|  +--[*]--------------------------------+|
|  |  Email Opened                       ||
|  |  Initial open                       ||
|  |                                     ||
|  |  3:47 PM | Location: San Francisco  ||
|  |  Device: Chrome on macOS            ||
|  +-------------------------------------+|
|  |                                      |
|  +--[mail]-----------------------------+|
|  |  Email Sent                         ||
|  |                                     ||
|  |  3:45 PM                            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Template Stats Card

```
+=========================================+
| Communications > Templates              |
+-----------------------------------------+
|                                         |
|  Quote Sent Template                    |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | PERFORMANCE (Last 30 days)          ||
|  |                                     ||
|  | Emails Sent: 156                    ||
|  |                                     ||
|  | Open Rate          67.5%            ||
|  | [===================>       ]       ||
|  |                                     ||
|  | Click Rate         23.1%            ||
|  | [======>                   ]       ||
|  |                                     ||
|  | Bounce Rate         2.5%            ||
|  | [>                         ]       ||
|  |                                     ||
|  | Avg Opens per Email: 2.3            ||
|  | Avg Time to Open: 12 min            ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | TOP PERFORMING LINKS                ||
|  |                                     ||
|  | 1. "View Quote" button     89 clicks||
|  | 2. Company website         23 clicks||
|  | 3. Support email           12 clicks||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [View All Emails] [Export Stats]       |
|                                         |
+=========================================+
```

### Loading Skeleton

```
+=========================================+
| Communications                          |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | ................................    ||
|  | .............................       ||
|  |                                     ||
|  | ............                        ||
|  |                                     ||
|  | [.......] [.......] [......]        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ................................    ||
|  | .............................       ||
|  +-------------------------------------+|
|                                         |
+=========================================+
  ^ Shimmer animation
```

### Empty State

```
+=========================================+
| Communications                          |
+-----------------------------------------+
|                                         |
|            +-------------+              |
|            |  [chart]    |              |
|            +-------------+              |
|                                         |
|      No Tracking Data Available         |
|                                         |
|   Email tracking is enabled, but        |
|   no emails have been opened yet.       |
|   Send some emails to start seeing      |
|   tracking data here.                   |
|                                         |
|   +-------------------------------+     |
|   |      [Send Email]             |     |
|   +-------------------------------+     |
|                                         |
+=========================================+
```

### Error State

```
+=========================================+
|                                         |
|  [!] Couldn't Load Tracking Data        |
|                                         |
|  We couldn't retrieve tracking         |
|  information. This might be a           |
|  temporary issue.                       |
|                                         |
|  [Retry]                                |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Split View - List + Stats

```
+=========================================================================+
| Communications                                                           |
+-------------------------------------------------------------------------+
| [Sent] [Drafts] [Scheduled] [Templates]                                  |
|  ===                                                                     |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-- EMAIL LIST -------------------+  +-- TRACKING STATS ---------------+|
|  |                                 |  |                                 ||
|  | +-----------------------------+ |  |  Quote Q-1234 Tracking          ||
|  | | To: john@acme.com           | |  |                                 ||
|  | | Subject: Your Quote Q-1234  | |  |  Sent: Today at 3:45 PM         ||
|  | |                             | |  |  Recipient: john@acme.com       ||
|  | | 3:45 PM                     | |  |                                 ||
|  | | [*Opened 3x] [Clicked 1x]   | |  |  [*] Opened 3 times             ||
|  | +-----------------------------+ |  |  [*] Clicked 1 link             ||
|  |                                 |  |                                 ||
|  | +-----------------------------+ |  |  TIMELINE                       ||
|  | | To: sarah@buildco.com       | |  |  |                              ||
|  | | Subject: Order Confirm...   | |  |  +--[*] Clicked Link            ||
|  | |                             | |  |  |   4:23 PM                    ||
|  | | Yesterday                   | |  |  |                              ||
|  | | [*Opened 1x] [!Bounced]     | |  |  +--[*] Opened (3rd)            ||
|  | +-----------------------------+ |  |  |   4:15 PM                    ||
|  |                                 |  |  |                              ||
|  | +-----------------------------+ |  |  +--[*] Opened (2nd)            ||
|  | | To: mike@renovations.com    | |  |  |   3:58 PM                    ||
|  | | Subject: Follow-up...       | |  |  |                              ||
|  | |                             | |  |  +--[*] Opened (1st)            ||
|  | | Jan 8                       | |  |      3:47 PM                    ||
|  | | [Sent] [Not opened]         | |  |                                 ||
|  | +-----------------------------+ |  |  [Export Timeline]              ||
|  |                                 |  |                                 ||
|  +---------------------------------+  +---------------------------------+|
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Template Analytics Dashboard

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Communications > Templates > Quote Sent                                               |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  +-- OVERVIEW STATS ------------------------------------------------------------------+  |
| Jobs        |  |                                                                                      |  |
| Pipeline    |  |  +-- SENT ------+  +-- OPEN RATE --+  +-- CLICK RATE -+  +-- BOUNCE RATE -+       |  |
| Support     |  |  |              |  |                |  |               |  |               |       |  |
| Communi..   |  |  |     156      |  |     67.5%      |  |     23.1%     |  |     2.5%      |       |  |
|   <         |  |  |              |  |                |  |               |  |               |       |  |
|             |  |  |  Last 30d    |  |  Industry avg: |  |  Above avg    |  |  Below avg    |       |  |
|             |  |  |              |  |     54%        |  |               |  |               |       |  |
|             |  |  +--------------+  +----------------+  +---------------+  +---------------+       |  |
|             |  |                                                                                  |  |
|             |  +-------------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- PERFORMANCE TRENDS --------------------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  [Line Chart: Opens/Clicks over time]                                            |  |
|             |  |                                                                                  |  |
|             |  |  Legend: — Opens (blue)  — Clicks (green)  — Bounces (red)                       |  |
|             |  |                                                                                  |  |
|             |  +-------------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- ENGAGEMENT DETAILS -------------+  +-- TOP LINKS -------------------------------+  |
|             |  |                                   |  |                                            |  |
|             |  |  Avg Opens per Email: 2.3         |  |  Link                       Clicks         |  |
|             |  |  Avg Time to First Open: 12 min   |  |  ────────────────────────────────────     |  |
|             |  |  Peak Open Time: 9-11 AM          |  |                                            |  |
|             |  |  Most Active Day: Tuesday         |  |  "View Quote" button           89         |  |
|             |  |                                   |  |  Company website                23         |  |
|             |  |  Device Breakdown:                |  |  Support email                  12         |  |
|             |  |  • Desktop: 65%                   |  |  Phone number                    8         |  |
|             |  |  • Mobile: 30%                    |  |                                            |  |
|             |  |  • Tablet: 5%                     |  |  [View All Links]                          |  |
|             |  |                                   |  |                                            |  |
|             |  +-----------------------------------+  +--------------------------------------------+  |
|             |                                                                                        |
|             |  +-- RECENT EMAILS -----------------------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  Recipient              Sent           Opened    Clicked    Status               |  |
|             |  |  ────────────────────────────────────────────────────────────────────────────     |  |
|             |  |                                                                                  |  |
|             |  |  john@acme.com          3:45 PM        3 times   1 time     [*Opened]            |  |
|             |  |  sarah@buildco.com      Yesterday      1 time    0 times    [!Bounced]           |  |
|             |  |  mike@renovations.com   Jan 8          0 times   0 times    [Sent]               |  |
|             |  |                                                                                  |  |
|             |  |  < Previous  1 2 3 ... 10  Next >                             [Export to CSV]    |  |
|             |  |                                                                                  |  |
|             |  +-------------------------------------------------------------------------------------+  |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
STATS LOADING:
+--------------------------------------+
|  PERFORMANCE (Last 30 days)          |
|                                      |
|  Emails Sent: ...                    |
|  Open Rate: [spinner]                |
|  Click Rate: [spinner]               |
+--------------------------------------+

TIMELINE LOADING:
+--------------------------------------+
|  TRACKING EVENTS                     |
|  |                                   |
|  +--[...]----------------------------+
|  |  .......................          |
|  |  ............                     |
|  +-----------------------------------+
+--------------------------------------+
```

### Empty States

```
NO TRACKING DATA:
+--------------------------------------+
|          [chart icon]                |
|                                      |
|    No Tracking Data Available        |
|                                      |
|  Email tracking is enabled, but      |
|  this email hasn't been opened yet.  |
+--------------------------------------+

NO EMAILS FOR TEMPLATE:
+--------------------------------------+
|          [mail icon]                 |
|                                      |
|    No Emails Sent Yet                |
|                                      |
|  This template hasn't been used.     |
|  Send an email to start tracking.    |
|                                      |
|  [Use Template]                      |
+--------------------------------------+
```

### Error States

```
TRACKING ERROR:
+--------------------------------------+
|  [!] Tracking Data Unavailable       |
|                                      |
|  We couldn't load tracking info.     |
|  This might be a temporary issue.    |
|                                      |
|  [Retry]  [Dismiss]                  |
+--------------------------------------+

BOUNCE ERROR:
+--------------------------------------+
|  [!] Email Bounced                   |
|                                      |
|  This email was rejected by the      |
|  recipient's server.                 |
|                                      |
|  Reason: Invalid email address       |
|                                      |
|  [Update Contact]  [View Details]    |
+--------------------------------------+
```

### Success States

```
EXPORT COMPLETE:
+--------------------------------------+
|  * Export Ready                      |
|                                      |
|  Your tracking report is ready       |
|  to download.                        |
|                                      |
|  [Download CSV]                      |
+--------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Email List**
   - Tab navigation list
   - Email cards (Tab through)
   - Tracking badges
   - Action buttons

2. **Tracking Detail**
   - Timeline events (Tab through)
   - Event cards
   - Export button

3. **Stats Dashboard**
   - Stats cards
   - Chart (keyboard navigation)
   - Data table
   - Export actions

### ARIA Requirements

```html
<!-- Tracking Badge -->
<span
  role="status"
  aria-label="Email opened 3 times"
  className="badge badge-success"
>
  Opened 3x
</span>

<!-- Timeline -->
<ol
  role="feed"
  aria-label="Email tracking timeline"
>
  <li aria-label="Email opened at 3:47 PM on January 10">
    <!-- Event details -->
  </li>
</ol>

<!-- Stats Card -->
<div
  role="region"
  aria-labelledby="stats-heading"
>
  <h3 id="stats-heading">Template Performance</h3>
  <div aria-live="polite">
    Open Rate: 67.5%
  </div>
</div>

<!-- Progress Bar -->
<div
  role="progressbar"
  aria-valuenow="67.5"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Open rate"
>
  67.5%
</div>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Email list | Navigate between emails |
| Enter | Email card | Open tracking details |
| Tab | Timeline | Navigate events |
| Arrow Up/Down | Data table | Navigate rows |
| Enter | Export button | Download stats |

### Screen Reader Announcements

- Badge update: "Email opened, 3 times total"
- Timeline load: "Tracking timeline loaded, 4 events"
- Stats update: "Open rate updated to 67.5%"
- Export ready: "Tracking report ready for download"

---

## Animation Choreography

### Badge Updates

```
REAL-TIME OPEN:
- Duration: 300ms
- Badge pulses green
- Count increments
- Brief glow effect

CLICK DETECTED:
- Duration: 200ms
- Badge pulses blue
- Count updates
- Ripple animation
```

### Timeline Entry

```
NEW EVENT:
- Duration: 400ms
- Slide in from top
- Opacity: 0 -> 1
- Pulse once

LOAD MORE:
- Duration: 200ms
- Fade in
- Stagger: 50ms per item
```

### Stats Updates

```
PROGRESS BAR:
- Duration: 600ms
- Easing: ease-out
- Width animates to new value
- Number counter animates

CARD HOVER:
- Duration: 150ms
- Elevation increase
- Border highlight
```

---

## Component Props Interfaces

```typescript
// EmailTrackingBadge
interface EmailTrackingBadgeProps {
  /** Tracking status */
  status: 'sent' | 'opened' | 'clicked' | 'bounced';
  /** Count for opens/clicks */
  count?: number;
  /** Show timestamp on hover */
  timestamp?: string;
  /** Real-time update indicator */
  isLive?: boolean;
}

// TemplateStatsCard
interface TemplateStatsCardProps {
  /** Template identifier */
  templateId: string;
  /** Template name */
  templateName: string;
  /** Stats data */
  stats: {
    emailsSent: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    avgOpensPerEmail: number;
    avgTimeToOpen: number; // minutes
  };
  /** Date range */
  dateRange: { from: Date; to: Date };
  /** Loading state */
  isLoading?: boolean;
}

// TrackingTimeline
interface TrackingTimelineProps {
  /** Email identifier */
  emailId: string;
  /** Tracking events */
  events: Array<{
    id: string;
    type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced';
    timestamp: string;
    metadata?: {
      location?: string;
      device?: string;
      link?: string;
    };
  }>;
  /** Loading state */
  isLoading?: boolean;
  /** Export handler */
  onExport?: () => void;
}

// EmailDetailDialog
interface EmailDetailDialogProps {
  /** Email data */
  email: {
    id: string;
    subject: string;
    recipientEmail: string;
    senderEmail: string;
    sentAt: string;
    templateName?: string;
  };
  /** Tracking events */
  trackingEvents: TrackingEvent[];
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

// AggregateStatsRow
interface AggregateStatsRowProps {
  /** Stats to display */
  stats: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    benchmark?: string;
  }>;
  /** Loading state */
  isLoading?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/email-tracking-badge.tsx` | Inline tracking indicators |
| `src/components/domain/communications/template-stats-card.tsx` | Template performance card |
| `src/components/domain/communications/email-detail-dialog.tsx` | Email detail with tracking |
| `src/components/domain/communications/tracking-stats-skeleton.tsx` | Loading skeleton |
| `src/components/domain/communications/email-tracking-timeline.tsx` | Tracking event timeline |
| `src/components/domain/communications/aggregate-stats-row.tsx` | Summary stats bar |
| `src/routes/_authed/communications/templates.tsx` | Templates tab route |
