# Activity Domain Integration Plan
**Renoz v3 CRM** | User-Centered Implementation Roadmap

---

## 1. User Goals: Why Activity Integration Matters

### Primary User Goal: **"Never Lose Context"**

> *As a CRM user, I want to see the complete history of any record so that I understand what happened, who did it, and when—without asking my team or guessing.*

### Specific User Scenarios

#### Scenario A: Sales Rep Picking Up a Stale Opportunity
> "I open an opportunity I haven't touched in 3 weeks. I immediately see: emails sent, calls made, stage changes, quote versions created, and notes from my colleague who covered while I was sick. I'm back in the loop in 30 seconds."

**Current Pain**: No visibility into what happened while they were away.

#### Scenario B: Operations Manager Investigating an Order Issue
> "A customer calls about a delivery that never arrived. I open the order and see: confirmed → picking → picked → shipped timestamps, who updated each status, tracking number added, and the shipment record. I can answer immediately without checking 3 different systems."

**Current Pain**: Have to cross-reference orders, shipments, and communications manually.

#### Scenario C: Account Manager Preparing for a Call
> "I'm about to call a VIP customer. I quickly review their activity timeline: last order 2 weeks ago, warranty claim resolved yesterday, email opened but not replied to, support ticket closed. I know exactly what to discuss."

**Current Pain**: Miss critical context, appear uninformed to customers.

#### Scenario D: Admin Auditing a Data Change
> "A customer's address was updated incorrectly. I check the activity log: who changed it, from what to what, when, and from which IP. I can fix it and train the user who made the mistake."

**Current Pain**: No audit trail for compliance or troubleshooting.

#### Scenario E: Team Lead Reviewing Performance
> "I review my team's activity leaderboard: who created the most opportunities, who closed the most orders, response times to support issues. I can recognize top performers and coach those struggling."

**Current Pain**: No visibility into team activity patterns.

---

## 2. Success Criteria (Measurable Outcomes)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Audit Coverage** | 100% of CRUD operations logged | Spot-check server functions |
| **Activity Feed Load Time** | < 500ms for 50 records | Performance monitoring |
| **Timeline Completeness** | All entity interactions visible | User testing sessions |
| **Time to Context** | < 30 seconds to understand record history | User task completion |
| **Cross-Domain Visibility** | Activities from all domains in one timeline | Feature verification |

---

## 3. User Experience Flows

### Flow 1: Record-Level Activity Timeline
```
User opens Customer/Opportunity/Order/Project detail
    ↓
Activity timeline loads (chronological, newest first)
    ↓
User sees:
  - System events (created, updated, stage changes)
  - Communication events (emails, calls)
  - User actions (notes, file uploads)
  - Automated events (status transitions, SLA alerts)
    ↓
User filters by type (calls only, emails only, etc.)
    ↓
User clicks activity → navigates to related record
```

### Flow 2: Dashboard Activity Feed
```
User lands on Dashboard
    ↓
"Recent Activity" widget shows org-wide activity
    ↓
User sees latest actions across all domains
    ↓
Click activity → navigate to relevant record
```

### Flow 3: User Activity Profile
```
Manager opens team member profile
    ↓
"Activity" tab shows user's actions
    ↓
Filter by date range, entity type, action type
    ↓
Export for performance review
```

---

## 4. Dual Activity System: Clarifying the Boundary

### The Problem
Two activity systems exist with overlapping purposes:

| System | Table | Purpose | Current Usage |
|--------|-------|---------|---------------|
| **Planned Activities** | `customerActivities`, `opportunityActivities` | Scheduled/trackable tasks (calls, meetings, follow-ups) | ✅ Used |
| **Audit Trail** | `activities` | System events, CRUD, changes | ❌ Unused |

### The Solution: Clear Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLANNED ACTIVITIES                          │
│  (customerActivities, opportunityActivities)                    │
├─────────────────────────────────────────────────────────────────┤
│  Purpose: Future-oriented, schedulable, actionable              │
│                                                                 │
│  Examples:                                                      │
│  - "Call John next Tuesday"                                    │
│  - "Follow up on quote in 3 days"                              │
│  - "Site visit scheduled for Friday"                           │
│                                                                 │
│  UI: Calendar view, task lists, reminders, completion status   │
│  Mutability: Can be rescheduled, completed, cancelled          │
└─────────────────────────────────────────────────────────────────┘
                              +
                              |
                              v
┌─────────────────────────────────────────────────────────────────┐
│                      AUDIT TRAIL (activities)                   │
├─────────────────────────────────────────────────────────────────┤
│  Purpose: Historical record, immutable, compliance              │
│                                                                 │
│  Examples:                                                      │
│  - "Customer record created by Alice"                          │
│  - "Order status changed: pending → confirmed"                 │
│  - "Quote v2 generated (value: $45,000)"                       │
│  - "Email opened by customer@example.com"                      │
│                                                                 │
│  UI: Timeline, activity feed, audit log, analytics             │
│  Mutability: Immutable (append-only)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Unified Timeline UI

Users see **both** in a single timeline, visually distinguished:

```
┌────────────────────────────────────────────────────────────────┐
│  📅 Today, Jan 29                                              │
├────────────────────────────────────────────────────────────────┤
│  [Blue]    📞 2:30 PM    Call completed - John Smith           │
│            Outbound call, 15 min, outcome: "Interested"        │
│            [Planned Activity - Completed]                      │
├────────────────────────────────────────────────────────────────┤
│  [Green]   📧 1:45 PM    Email opened by john@example.com      │
│            Subject: "Quote for Solar Installation"             │
│            [Audit Event - Auto-captured]                       │
├────────────────────────────────────────────────────────────────┤
│  [Purple]  📝 11:20 AM   Order status updated                  │
│            Confirmed → Picking by Operations Team              │
│            [Audit Event - System]                              │
├────────────────────────────────────────────────────────────────┤
│  [Orange]  ⏰ 9:00 AM    Meeting scheduled                     │
│            Site visit with installer - Feb 3, 2:00 PM          │
│            [Planned Activity - Pending]                        │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Establish schema and logging patterns

**Tasks**:
1. [ ] Add missing entity types to activity schema (`project`, `workstream`, `task`)
2. [ ] Create `UnifiedActivity` type that combines both systems for UI
3. [ ] Build `useUnifiedActivities` hook for fetching combined timeline
4. [ ] Create `UnifiedActivityTimeline` component

**User Value**: Technical foundation, no visible change yet.

---

### Phase 2: Core Audit Trail (Week 2-3)
**Goal**: Log all CRUD operations in high-value domains

**Tasks**:
1. [ ] Customers domain - log create/update/delete/merge
2. [ ] Pipeline domain - log opportunity create/update/stage changes
3. [ ] Orders domain - log status transitions
4. [ ] Communications bridge - wire email/call logging

**User Value**: 
- Complete history for customer, opportunity, and order records
- "Who changed what when" is now answerable

---

### Phase 3: Timeline UI (Week 4)
**Goal**: Surface activity data in user interface

**Tasks**:
1. [ ] Add activity timeline to Customer detail page
2. [ ] Add activity timeline to Opportunity detail page
3. [ ] Add activity timeline to Order detail page
4. [ ] Create "Recent Activity" dashboard widget
5. [ ] Add activity filters (by type, date, user)

**User Value**:
- Users can see complete record history
- No more "what happened to this record?" questions

---

### Phase 4: Extended Domains (Week 5-6)
**Goal**: Complete coverage across all domains

**Tasks**:
1. [ ] Products domain - log price changes, inventory adjustments
2. [ ] Inventory domain - log stock movements
3. [ ] Support domain - log issue lifecycle
4. [ ] Warranty domain - log claims and extensions
5. [ ] Projects/Jobs domain - log task completions, stage changes

**User Value**:
- Consistent activity visibility across entire CRM

---

### Phase 5: Advanced Features (Week 7-8)
**Goal**: Leverage activity data for insights

**Tasks**:
1. [ ] Activity-based notifications ("Customer hasn't been contacted in 14 days")
2. [ ] Activity analytics (team performance, conversion correlation)
3. [ ] Activity-based automation triggers
4. [ ] Activity export for compliance

**User Value**:
- Proactive alerts prevent things falling through cracks
- Data-driven performance insights

---

## 6. Technical Implementation Details

### Activity Logger Usage Pattern

```typescript
// In any server function
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';

export const updateCustomer = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });
    const logger = createActivityLoggerWithContext(ctx);
    
    // Get before state
    const before = await db.query.customers.findFirst({ ... });
    
    // Perform update
    const [after] = await db.update(customers)...;
    
    // Log (non-blocking)
    logger.logAsync({
      entityType: 'customer',
      entityId: after.id,
      action: 'updated',
      changes: computeChanges({ before, after }),
      description: `Updated customer: ${after.name}`,
    });
    
    return after;
  });
```

### Unified Timeline Data Fetching

```typescript
// Hook combines both systems
const useUnifiedActivities = (entityType, entityId) => {
  // Fetch from activities (audit trail)
  const { data: auditActivities } = useQuery({
    queryKey: ['activities', entityType, entityId],
    queryFn: () => getEntityActivities({ entityType, entityId }),
  });
  
  // Fetch from domain-specific planned activities
  const { data: plannedActivities } = useQuery({
    queryKey: ['planned-activities', entityType, entityId],
    queryFn: () => getPlannedActivities(entityType, entityId),
  });
  
  // Merge and sort by timestamp
  return useMemo(() => {
    return [...(auditActivities || []), ...(plannedActivities || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [auditActivities, plannedActivities]);
};
```

---

## 7. Files to Create/Modify

### New Files
```
src/hooks/use-unified-activities.ts          # Combined activity fetcher
src/components/shared/unified-timeline.tsx   # Timeline component
src/lib/schemas/unified-activity.ts          # Unified type definitions
```

### Files to Modify (Phase 2)
```
src/server/functions/customers/customers.ts      # Add logging to CRUD
src/server/functions/pipeline/pipeline.ts        # Add logging to opportunities
src/server/functions/orders/orders.ts            # Add logging to orders
src/server/functions/communications/*.ts         # Wire up bridge
```

### Files to Modify (Phase 3)
```
src/routes/_authenticated/customers/$customerId.tsx    # Add timeline
src/routes/_authenticated/opportunities/$id.tsx        # Add timeline
src/routes/_authenticated/orders/$orderId.tsx          # Add timeline
src/routes/_authenticated/dashboard.tsx                # Add widget
```

### Schema Updates
```
drizzle/schema/activities/activities.ts        # Add entity types
drizzle/schema/_shared/enums.ts                # Update enum
```

---

## 8. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation from activity logging | Medium | Use `logAsync()` for fire-and-forget logging |
| Activity table grows too large | Medium | Implement partitioning (already planned), retention policies |
| Inconsistent logging across domains | Low | Create reusable wrappers/hooks |
| User confusion between planned vs audit activities | Medium | Clear visual distinction in UI |
| Migration of existing data | Low | Start fresh, no migration needed for audit trail |

---

## 9. Definition of Done

- [ ] All CRUD operations in Customers, Pipeline, Orders log to activities
- [ ] Activity timeline visible on Customer, Opportunity, Order detail pages
- [ ] Dashboard "Recent Activity" widget shows org-wide activity
- [ ] Users can filter activities by type, date, user
- [ ] Communications (emails, calls) automatically create activities
- [ ] Activity logging doesn't impact API response times (>50ms threshold)
- [ ] Documentation updated for developers

---

*This plan prioritizes user value while managing implementation complexity. Each phase delivers incremental benefits.*
