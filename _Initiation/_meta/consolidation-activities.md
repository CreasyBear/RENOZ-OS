# Consolidation Analysis: Activities, Timeline, and Communications Domains

**Created:** 2026-01-17
**Status:** Analysis Complete - Recommendation Pending Approval

---

## Current State: Overlapping Concerns

### Activities Domain (DOM-ACTIVITIES)

**Stories:**
- ACTIVITY-CORE-SCHEMA: Activity Logging Core Schema
- ACTIVITY-LOGGING-API: Activity Logging API and Hooks
- ACTIVITY-FEED-UI: Activity Feed Component
- ACTIVITY-TIMELINE-UI: Entity Activity Timeline Component
- ACTIVITY-DASHBOARD-UI: Activity Analytics Dashboard

**Purpose:** Comprehensive audit trail and activity logging system providing complete visibility into user actions, system changes, and data modifications across all entities. Enables compliance, debugging, and user behavior analysis.

**Schema Creates:**
| Table | Description |
|-------|-------------|
| `activities` | Append-only audit trail of all user and system actions |

**Key Features:**
- Automatic logging via Drizzle hooks
- Organization-level isolation via RLS
- JSONB changes tracking (old/new values)
- Monthly partitioning for scale
- Compliance-focused (7-year retention)

---

### Timeline Cross-Domain (CROSS-TIMELINE)

**Stories:**
- CROSS-TIMELINE-001: Activity Aggregation Schema
- CROSS-TIMELINE-002: Activity Feed API
- CROSS-TIMELINE-003: Auto-Capture Email Events
- CROSS-TIMELINE-004: Timeline UI Component
- CROSS-TIMELINE-005: Activity Logging Quick Action
- CROSS-TIMELINE-006: Customer 360 Integration

**Purpose:** Cross-domain activity timeline aggregating emails, calls, notes, status changes, support tickets across all domains into a single customer-centric view. Provides 360-degree customer context.

**Schema Creates:**
| Table | Description |
|-------|-------------|
| `unified_activities` | Aggregated view with customer-centric design |

**Schema Requires:**
- `activities` (from DOM-ACTIVITIES)
- `email_history` (from DOM-COMMS)
- Plus: customers, contacts, opportunities, orders, jobs, support_tickets

**Key Features:**
- Customer-centric (denormalized customerId column)
- Rich activity types (email_sent, email_opened, call_logged, note_added, status_change, etc.)
- Quick action logging (Log Call, Add Note)
- Mini-timeline in customer hover cards
- Last Contact indicator on customer list

---

### Communications Domain (DOM-COMMS) - Activity-Related Stories

**Activity-Related Stories:**
- COMMS-AUTO-001: Email-to-Activity Bridge
- COMMS-AUTO-002: Activity Source Tracking
- COMMS-AUTO-003: Quick Log UI Enhancement
- DOM-COMMS-008: Fix and Enhance Communications Timeline

**Purpose (activity logging subset):** Automatic activity creation when communications occur. Track source of activities (manual vs auto-capture). Quick logging UI for calls and notes.

**Schema Creates (activity-related):**
- Adds `source` and `source_ref` fields to activities (COMMS-AUTO-002)

**Key Features:**
- Email-to-activity bridge (auto-create activity on email send)
- Source tracking (manual, email, webhook, system)
- Quick Log UI (Cmd+L shortcut)
- Communications timeline filtering and export

---

## Overlap Analysis

| Concern | DOM-ACTIVITIES | CROSS-TIMELINE | DOM-COMMS |
|---------|----------------|----------------|-----------|
| Core activities schema | X (creates `activities`) | X (creates `unified_activities`) | |
| Activity logging API | X | X (logActivity function) | X (Email-to-Activity Bridge) |
| Activity Feed UI | X (ACTIVITY-FEED-UI) | X (Timeline UI Component) | |
| Entity timeline display | X (ACTIVITY-TIMELINE-UI) | X (Customer 360 Integration) | |
| Email event tracking | | X (Auto-Capture Email Events) | X (COMMS-AUTO-001) |
| Quick action logging | | X (CROSS-TIMELINE-005) | X (COMMS-AUTO-003) |
| Cross-entity linking | X (entityType/entityId) | X (polymorphic + customerId) | |
| Activity source tracking | | | X (COMMS-AUTO-002) |
| Analytics dashboard | X (ACTIVITY-DASHBOARD-UI) | | |
| Compliance/audit focus | X (primary) | | |

### Specific Duplications

| DOM-ACTIVITIES Story | CROSS-TIMELINE Equivalent | Duplication Level |
|---------------------|---------------------------|-------------------|
| ACTIVITY-FEED-UI | CROSS-TIMELINE-004 | HIGH - Same component, different scope |
| ACTIVITY-TIMELINE-UI | CROSS-TIMELINE-006 | HIGH - Entity timeline vs Customer 360 |
| ACTIVITY-LOGGING-API | CROSS-TIMELINE-002 + 005 | MEDIUM - Different focus (audit vs CRM) |
| ACTIVITY-CORE-SCHEMA | CROSS-TIMELINE-001 | MEDIUM - activities vs unified_activities |

| DOM-COMMS Story | CROSS-TIMELINE Equivalent | Duplication Level |
|-----------------|---------------------------|-------------------|
| COMMS-AUTO-001 | CROSS-TIMELINE-003 | HIGH - Both create activities from emails |
| COMMS-AUTO-003 | CROSS-TIMELINE-005 | HIGH - Both provide quick log UI |

---

## Consolidation Recommendation

### Option A: Merge into CROSS-TIMELINE (Recommended)

**Rationale:** CROSS-TIMELINE has the more comprehensive and customer-centric design. It explicitly depends on DOM-ACTIVITIES for the base `activities` table, suggesting the correct layering is:

```
Layer 1: DOM-ACTIVITIES (audit trail foundation)
    |
    v
Layer 2: CROSS-TIMELINE (unified CRM view, quick actions, customer context)
    ^
    |
Layer 3: DOM-COMMS (communication-specific features)
```

**Actions:**

1. **Keep DOM-ACTIVITIES for core schema only:**
   - ACTIVITY-CORE-SCHEMA: KEEP (foundational)
   - ACTIVITY-LOGGING-API: PARTIAL - Keep Drizzle hooks, move retrieval to CROSS-TIMELINE
   - ACTIVITY-FEED-UI: DEPRECATE (replaced by CROSS-TIMELINE-004)
   - ACTIVITY-TIMELINE-UI: DEPRECATE (replaced by CROSS-TIMELINE-006)
   - ACTIVITY-DASHBOARD-UI: MOVE to CROSS-TIMELINE as CROSS-TIMELINE-007

2. **CROSS-TIMELINE becomes canonical activity system:**
   - Owns `unified_activities` table AND all retrieval APIs
   - Owns all activity UI components
   - Handles quick action logging

3. **DOM-COMMS removes duplicates:**
   - COMMS-AUTO-001: DEPRECATE (replaced by CROSS-TIMELINE-003)
   - COMMS-AUTO-003: DEPRECATE (replaced by CROSS-TIMELINE-005)
   - COMMS-AUTO-002: KEEP (source tracking is valuable, add to CROSS-TIMELINE schema)
   - DOM-COMMS-008: CONSOLIDATE (merge filtering/export features into CROSS-TIMELINE-004)

---

### Option B: Keep Separate with Clear Boundaries

**If maintaining separation is preferred:**

| Domain | Responsibility | API Surface |
|--------|----------------|-------------|
| DOM-ACTIVITIES | Raw audit events, compliance | Internal logging only (no UI) |
| CROSS-TIMELINE | Aggregation, customer view, CRM | All user-facing activity UI |
| DOM-COMMS | Email/call specific tracking | Communication-specific features only |

**Boundary Rules:**
1. DOM-ACTIVITIES: Write-only from other domains (never query directly from UI)
2. CROSS-TIMELINE: All activity reading goes through unified_activities
3. DOM-COMMS: Creates activities via CROSS-TIMELINE API (not directly)

---

## Action Items

### Immediate (Before Implementation Begins)

- [ ] **Decision:** Approve Option A or Option B
- [ ] Deprecate DOM-ACTIVITIES UI stories (ACTIVITY-FEED-UI, ACTIVITY-TIMELINE-UI)
- [ ] Update CROSS-TIMELINE dependencies to clarify relationship with DOM-ACTIVITIES
- [ ] Update DOM-COMMS to remove COMMS-AUTO-001 and COMMS-AUTO-003 (duplicates CROSS-TIMELINE)
- [ ] Add source tracking (COMMS-AUTO-002) to CROSS-TIMELINE-001 schema

### Before Cross-Domain Phase

- [ ] Complete DOM-ACTIVITIES ACTIVITY-CORE-SCHEMA first (dependency for CROSS-TIMELINE)
- [ ] Complete partial ACTIVITY-LOGGING-API (Drizzle hooks only)
- [ ] Update all domain PRDs that reference "activities" to clarify they use CROSS-TIMELINE API

### Documentation Updates

- [ ] Add deprecation notice to DOM-ACTIVITIES PROMPT.md (done)
- [ ] Create architecture diagram showing activity system layers
- [ ] Update glossary with activity vs unified_activity distinction

---

## Story Mapping (If Option A Approved)

### DOM-ACTIVITIES (Reduced Scope)

| Original Story | New Status | Notes |
|----------------|------------|-------|
| ACTIVITY-CORE-SCHEMA | KEEP | Foundation - unchanged |
| ACTIVITY-LOGGING-API | PARTIAL | Keep hooks, move retrieval to CROSS-TIMELINE |
| ACTIVITY-FEED-UI | DEPRECATED | Use CROSS-TIMELINE-004 |
| ACTIVITY-TIMELINE-UI | DEPRECATED | Use CROSS-TIMELINE-006 |
| ACTIVITY-DASHBOARD-UI | MOVE | Becomes CROSS-TIMELINE-007 |

### CROSS-TIMELINE (Expanded Scope)

| Story | Notes |
|-------|-------|
| CROSS-TIMELINE-001 | Add source/source_ref from COMMS-AUTO-002 |
| CROSS-TIMELINE-002 | Unchanged |
| CROSS-TIMELINE-003 | Absorbs COMMS-AUTO-001 |
| CROSS-TIMELINE-004 | Absorbs ACTIVITY-FEED-UI features |
| CROSS-TIMELINE-005 | Absorbs COMMS-AUTO-003 |
| CROSS-TIMELINE-006 | Absorbs ACTIVITY-TIMELINE-UI features |
| CROSS-TIMELINE-007 (NEW) | Activity Analytics Dashboard (from DOM-ACTIVITIES) |

### DOM-COMMS (Cleaned Up)

| Original Story | New Status | Notes |
|----------------|------------|-------|
| COMMS-AUTO-001 | DEPRECATED | Replaced by CROSS-TIMELINE-003 |
| COMMS-AUTO-002 | MOVED | Schema fields added to CROSS-TIMELINE-001 |
| COMMS-AUTO-003 | DEPRECATED | Replaced by CROSS-TIMELINE-005 |
| DOM-COMMS-008 | PARTIAL | Keep fixes, merge enhancements into CROSS-TIMELINE-004 |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Confusion during implementation | Clear PROMPT.md notices + this document |
| Orphaned dependencies | Audit all PRDs referencing activities table |
| Scope creep in CROSS-TIMELINE | Keep analytics dashboard separate (CROSS-TIMELINE-007) |
| Performance (unified_activities) | Ensure proper indexes match DOM-ACTIVITIES patterns |

---

## Appendix: Schema Comparison

### DOM-ACTIVITIES: activities table
```
id, organizationId, userId, entityType, entityId, action, changes, metadata,
ipAddress, userAgent, createdAt, createdBy
```

### CROSS-TIMELINE: unified_activities table
```
id, organizationId, customerId (denormalized), entityType, entityId,
activityType (rich enum), title, description, metadata, createdAt, createdBy
```

**Key Differences:**
1. `customerId` denormalization in unified_activities (customer-centric queries)
2. `activityType` rich enum vs generic `action` enum
3. `title`/`description` fields for display vs `changes` JSONB for audit
4. No `ipAddress`/`userAgent` in unified_activities (CRM focus, not audit)

**Recommendation:** Keep both tables:
- `activities`: Raw audit log (compliance, debugging)
- `unified_activities`: Aggregated CRM view (customer context, UI display)
- CROSS-TIMELINE queries `unified_activities`, which is populated from `activities` + other sources
