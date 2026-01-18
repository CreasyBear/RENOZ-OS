# Remediation Plan: Unified SLA Calculation Engine

Created: 2026-01-17
Author: architect-agent
Status: Draft

## Overview

This plan addresses the divergent SLA implementations identified in the premortem analysis across Support, Warranty, and Jobs domains. The goal is to create a unified SLA calculation engine that handles configurable response/resolution targets, pause/resume logic with customer wait detection, and business hours configuration.

## Problem Statement

### Current State (Divergent Implementations)

| Domain | Response SLA | Resolution SLA | Pause Logic | Business Hours |
|--------|--------------|----------------|-------------|----------------|
| **Support** | Configurable (Priority 4h, Standard 24h) | Configurable | `slaWaitingOnCustomerSince` timestamp | Not implemented |
| **Warranty** | Hardcoded 24h | Hardcoded 5 business days | Not specified | "5 business days" implies needed |
| **Jobs** | None | None (time tracking only) | N/A | N/A |

### Risks Identified

1. **Maintenance Burden**: Three separate SLA calculation patterns to maintain
2. **Inconsistent UX**: Different breach indicators and warning thresholds per domain
3. **Business Hours Gap**: Support uses wall-clock time, Warranty mentions "5 business days" but no implementation
4. **No Holiday Support**: Neither domain accounts for organizational holidays
5. **Jobs Gap**: Time tracking exists but no SLA targets for job completion

## Requirements

### Functional Requirements

- [ ] FR-1: Configurable response time targets (hours or business hours)
- [ ] FR-2: Configurable resolution time targets (hours, days, or business days)
- [ ] FR-3: Pause SLA clock when waiting on customer
- [ ] FR-4: Resume SLA clock with accurate elapsed time calculation
- [ ] FR-5: Business hours configuration per organization
- [ ] FR-6: Holiday calendar support per organization
- [ ] FR-7: At-risk warnings before breach (configurable threshold, e.g., 25% remaining)
- [ ] FR-8: Breach detection and notification
- [ ] FR-9: Support for multiple SLA types (response, resolution, job completion)
- [ ] FR-10: SLA compliance metrics and reporting

### Non-Functional Requirements

- [ ] NFR-1: Calculation must handle timezone differences
- [ ] NFR-2: Sub-second performance for single SLA calculations
- [ ] NFR-3: Batch calculation support for dashboards/reports
- [ ] NFR-4: Audit trail for SLA state changes (pause, resume, breach)

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLA Engine (Shared Utility)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  SLA Calculator  │  │  Business Hours  │  │    Holiday    │  │
│  │                  │  │     Service      │  │    Service    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │          │
│           └─────────────────────┴─────────────────────┘          │
│                              │                                    │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                    SLA State Manager                       │  │
│  │  (pause/resume, breach detection, at-risk warnings)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │  Support   │     │  Warranty  │     │   Jobs     │
    │  Domain    │     │   Domain   │     │  Domain    │
    │            │     │            │     │            │
    │ Issues     │     │ Claims     │     │ Job        │
    │ SLA Policy │     │ SLA Policy │     │ Templates  │
    └────────────┘     └────────────┘     └────────────┘
```

### Data Model

#### New Tables

```sql
-- Organization business hours configuration
CREATE TABLE business_hours_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Weekly schedule (JSONB for flexibility)
  -- Format: { "monday": { "start": "09:00", "end": "17:00" }, ... }
  weekly_schedule JSONB NOT NULL,
  
  -- Timezone for this org's business hours
  timezone VARCHAR(50) NOT NULL DEFAULT 'Australia/Sydney',
  
  -- Is this the default config for the org?
  is_default BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, is_default) -- Only one default per org
);

-- Organization holidays
CREATE TABLE organization_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Optional: recurring annually
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, date)
);

-- Unified SLA configuration table (replaces domain-specific sla_policies)
CREATE TABLE sla_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What domain this SLA config applies to
  domain VARCHAR(50) NOT NULL CHECK (domain IN ('support', 'warranty', 'jobs')),
  
  -- Human-readable name (e.g., "Priority Support", "Battery Warranty", "Residential Install")
  name VARCHAR(255) NOT NULL,
  
  -- Response time target
  response_target_value INTEGER, -- NULL if no response SLA
  response_target_unit VARCHAR(20) CHECK (response_target_unit IN ('minutes', 'hours', 'business_hours', 'days', 'business_days')),
  
  -- Resolution time target
  resolution_target_value INTEGER, -- NULL if no resolution SLA
  resolution_target_unit VARCHAR(20) CHECK (resolution_target_unit IN ('minutes', 'hours', 'business_hours', 'days', 'business_days')),
  
  -- At-risk warning threshold (percentage remaining, e.g., 25 means warn at 25% time left)
  at_risk_threshold_percent INTEGER NOT NULL DEFAULT 25,
  
  -- Auto-escalate on breach?
  escalate_on_breach BOOLEAN NOT NULL DEFAULT false,
  escalate_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Link to business hours config (NULL = use org default)
  business_hours_config_id UUID REFERENCES business_hours_config(id) ON DELETE SET NULL,
  
  -- Is this the default for the domain in this org?
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Priority order (lower = higher priority, for selecting which SLA applies)
  priority_order INTEGER NOT NULL DEFAULT 100,
  
  -- Active?
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, domain, name)
);

-- SLA tracking state (one row per tracked entity)
CREATE TABLE sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What we're tracking
  domain VARCHAR(50) NOT NULL CHECK (domain IN ('support', 'warranty', 'jobs')),
  entity_type VARCHAR(50) NOT NULL, -- 'issue', 'warranty_claim', 'job_assignment'
  entity_id UUID NOT NULL,
  
  -- Which SLA config applies
  sla_configuration_id UUID NOT NULL REFERENCES sla_configurations(id) ON DELETE RESTRICT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  
  -- Response tracking
  response_due_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_breached BOOLEAN NOT NULL DEFAULT false,
  
  -- Resolution tracking
  resolution_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_breached BOOLEAN NOT NULL DEFAULT false,
  
  -- Pause/resume state
  is_paused BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMPTZ,
  pause_reason VARCHAR(255),
  total_paused_duration_seconds BIGINT NOT NULL DEFAULT 0, -- Accumulated pause time
  
  -- State
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'responded', 'resolved', 'breached')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(domain, entity_type, entity_id)
);

-- SLA events audit log
CREATE TABLE sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sla_tracking_id UUID NOT NULL REFERENCES sla_tracking(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'started', 'paused', 'resumed', 
    'response_due_warning', 'response_breached', 'responded',
    'resolution_due_warning', 'resolution_breached', 'resolved',
    'escalated', 'config_changed'
  )),
  
  event_data JSONB, -- Additional context (e.g., pause reason, warning threshold)
  
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sla_config_org_domain ON sla_configurations(organization_id, domain);
CREATE INDEX idx_sla_config_default ON sla_configurations(organization_id, domain, is_default) WHERE is_default = true;
CREATE INDEX idx_sla_tracking_entity ON sla_tracking(domain, entity_type, entity_id);
CREATE INDEX idx_sla_tracking_due_dates ON sla_tracking(organization_id, response_due_at, resolution_due_at) WHERE status = 'active';
CREATE INDEX idx_sla_events_tracking ON sla_events(sla_tracking_id, triggered_at);
CREATE INDEX idx_business_hours_org ON business_hours_config(organization_id);
CREATE INDEX idx_holidays_org_date ON organization_holidays(organization_id, date);
```

#### Modifications to Existing Tables

```sql
-- Issues table: Add FK to sla_tracking instead of inline SLA fields
ALTER TABLE issues ADD COLUMN sla_tracking_id UUID REFERENCES sla_tracking(id);

-- Warranty claims: Add FK to sla_tracking
ALTER TABLE warranty_claims ADD COLUMN sla_tracking_id UUID REFERENCES sla_tracking(id);

-- Job assignments: Add optional SLA tracking for completion targets
ALTER TABLE job_assignments ADD COLUMN sla_tracking_id UUID REFERENCES sla_tracking(id);

-- Deprecate inline SLA fields (keep for migration, remove in v3)
-- issues.slaResponseDue → computed from sla_tracking
-- issues.slaResolutionDue → computed from sla_tracking  
-- issues.slaPolicyId → replaced by sla_tracking.sla_configuration_id
-- issues.slaWaitingOnCustomerSince → replaced by sla_tracking.paused_at
```

### Interfaces

```typescript
// src/lib/sla/types.ts

export type SlaDomain = 'support' | 'warranty' | 'jobs';
export type SlaTargetUnit = 'minutes' | 'hours' | 'business_hours' | 'days' | 'business_days';
export type SlaStatus = 'active' | 'paused' | 'responded' | 'resolved' | 'breached';
export type SlaEventType = 
  | 'started' | 'paused' | 'resumed'
  | 'response_due_warning' | 'response_breached' | 'responded'
  | 'resolution_due_warning' | 'resolution_breached' | 'resolved'
  | 'escalated' | 'config_changed';

export interface SlaConfiguration {
  id: string;
  organizationId: string;
  domain: SlaDomain;
  name: string;
  responseTargetValue: number | null;
  responseTargetUnit: SlaTargetUnit | null;
  resolutionTargetValue: number | null;
  resolutionTargetUnit: SlaTargetUnit | null;
  atRiskThresholdPercent: number;
  escalateOnBreach: boolean;
  escalateToUserId: string | null;
  businessHoursConfigId: string | null;
  isDefault: boolean;
  priorityOrder: number;
  isActive: boolean;
}

export interface SlaTracking {
  id: string;
  organizationId: string;
  domain: SlaDomain;
  entityType: string;
  entityId: string;
  slaConfigurationId: string;
  startedAt: Date;
  responseDueAt: Date | null;
  respondedAt: Date | null;
  responseBreached: boolean;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  resolutionBreached: boolean;
  isPaused: boolean;
  pausedAt: Date | null;
  pauseReason: string | null;
  totalPausedDurationSeconds: number;
  status: SlaStatus;
}

export interface BusinessHoursConfig {
  id: string;
  organizationId: string;
  weeklySchedule: WeeklySchedule;
  timezone: string;
  isDefault: boolean;
}

export interface WeeklySchedule {
  monday?: DaySchedule | null;
  tuesday?: DaySchedule | null;
  wednesday?: DaySchedule | null;
  thursday?: DaySchedule | null;
  friday?: DaySchedule | null;
  saturday?: DaySchedule | null;
  sunday?: DaySchedule | null;
}

export interface DaySchedule {
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface SlaCalculationResult {
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  responseAtRiskAt: Date | null;
  resolutionAtRiskAt: Date | null;
}

export interface SlaStateSnapshot {
  tracking: SlaTracking;
  configuration: SlaConfiguration;
  isResponseAtRisk: boolean;
  isResolutionAtRisk: boolean;
  responseTimeRemaining: number | null; // seconds
  resolutionTimeRemaining: number | null; // seconds
  responseTimeElapsed: number | null; // seconds (excluding pauses)
  resolutionTimeElapsed: number | null; // seconds (excluding pauses)
}
```

### Core Services

```typescript
// src/lib/sla/calculator.ts

export interface SlaCalculator {
  /**
   * Calculate SLA due dates based on configuration and start time
   */
  calculateDueDates(
    config: SlaConfiguration,
    startedAt: Date,
    businessHours: BusinessHoursConfig | null,
    holidays: Date[]
  ): SlaCalculationResult;

  /**
   * Calculate remaining time accounting for pauses and business hours
   */
  calculateRemainingTime(
    tracking: SlaTracking,
    config: SlaConfiguration,
    businessHours: BusinessHoursConfig | null,
    holidays: Date[],
    asOf?: Date
  ): { responseRemaining: number | null; resolutionRemaining: number | null };

  /**
   * Check if SLA is at risk (within warning threshold)
   */
  isAtRisk(
    tracking: SlaTracking,
    config: SlaConfiguration,
    type: 'response' | 'resolution',
    asOf?: Date
  ): boolean;

  /**
   * Check if SLA is breached
   */
  isBreached(
    tracking: SlaTracking,
    type: 'response' | 'resolution',
    asOf?: Date
  ): boolean;
}

// src/lib/sla/state-manager.ts

export interface SlaStateManager {
  /**
   * Start SLA tracking for an entity
   */
  startTracking(
    organizationId: string,
    domain: SlaDomain,
    entityType: string,
    entityId: string,
    configId: string,
    startedAt?: Date
  ): Promise<SlaTracking>;

  /**
   * Pause SLA tracking (e.g., waiting on customer)
   */
  pause(
    trackingId: string,
    reason: string,
    userId?: string
  ): Promise<SlaTracking>;

  /**
   * Resume SLA tracking, recalculating due dates
   */
  resume(
    trackingId: string,
    userId?: string
  ): Promise<SlaTracking>;

  /**
   * Record response (first reply, assignment, etc.)
   */
  recordResponse(
    trackingId: string,
    respondedAt?: Date,
    userId?: string
  ): Promise<SlaTracking>;

  /**
   * Record resolution (closed, completed, etc.)
   */
  recordResolution(
    trackingId: string,
    resolvedAt?: Date,
    userId?: string
  ): Promise<SlaTracking>;

  /**
   * Get current SLA state with computed fields
   */
  getState(trackingId: string): Promise<SlaStateSnapshot>;

  /**
   * Batch get states for dashboard/reports
   */
  getStates(trackingIds: string[]): Promise<SlaStateSnapshot[]>;
}

// src/lib/sla/breach-detector.ts

export interface SlaBreachDetector {
  /**
   * Check all active SLAs for breaches and at-risk warnings
   * Called by scheduled job
   */
  checkAll(organizationId: string): Promise<{
    breached: SlaTracking[];
    atRisk: SlaTracking[];
  }>;

  /**
   * Process breach: update tracking, create event, notify
   */
  processBreach(
    tracking: SlaTracking,
    type: 'response' | 'resolution'
  ): Promise<void>;

  /**
   * Process at-risk warning: create event, notify
   */
  processAtRiskWarning(
    tracking: SlaTracking,
    type: 'response' | 'resolution'
  ): Promise<void>;
}
```

### Data Flow

```
1. Entity Created (Issue, Claim, Job)
   │
   ├─► Resolve SLA Configuration
   │   └─► Check: entity-specific → domain default → org default
   │
   ├─► Start SLA Tracking
   │   ├─► Create sla_tracking record
   │   ├─► Calculate due dates (using business hours + holidays)
   │   └─► Create 'started' event
   │
   └─► Return entity with SLA state

2. Entity Status Change (e.g., "waiting on customer")
   │
   ├─► Detect pause trigger
   │   └─► Domain-specific rules (e.g., Support: on_hold + waiting_on_customer)
   │
   ├─► Pause SLA
   │   ├─► Update sla_tracking.is_paused, paused_at
   │   └─► Create 'paused' event
   │
   └─► Resume SLA (when status changes back)
       ├─► Calculate pause duration
       ├─► Add to total_paused_duration_seconds
       ├─► Recalculate due dates
       └─► Create 'resumed' event

3. Scheduled Breach Check (every 5 minutes)
   │
   ├─► Query active SLAs approaching/past due
   │
   ├─► For at-risk SLAs (first time reaching threshold)
   │   ├─► Create 'response_due_warning' or 'resolution_due_warning' event
   │   └─► Send notification
   │
   └─► For breached SLAs (first time)
       ├─► Update tracking.response_breached or resolution_breached
       ├─► Create 'breached' event
       ├─► Send notification
       └─► Escalate if configured
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `date-fns` | External | Date manipulation, timezone handling |
| `date-fns-tz` | External | Timezone-aware date calculations |
| organizations table | Internal | Multi-tenant scoping |
| notifications system | Internal | Breach/at-risk notifications |
| Trigger.dev | Internal | Scheduled breach checking |

## Implementation Phases

### Phase 1: Schema Foundation
**Estimated effort:** 3 iterations

**Files to create:**
- `src/lib/schema/sla-configurations.ts`
- `src/lib/schema/sla-tracking.ts`
- `src/lib/schema/sla-events.ts`
- `src/lib/schema/business-hours-config.ts`
- `src/lib/schema/organization-holidays.ts`
- Migration files

**Acceptance:**
- [ ] All tables created with proper indexes
- [ ] Types exported from `lib/schema/index.ts`
- [ ] Migration runs without errors
- [ ] npm run typecheck passes

### Phase 2: Core Calculator
**Estimated effort:** 4 iterations

**Files to create:**
- `src/lib/sla/types.ts`
- `src/lib/sla/calculator.ts`
- `src/lib/sla/business-hours.ts`
- `tests/lib/sla/calculator.test.ts`

**Acceptance:**
- [ ] Calculate wall-clock time targets
- [ ] Calculate business hours targets
- [ ] Handle timezone correctly
- [ ] Exclude holidays from business day calculations
- [ ] Unit tests for all calculation scenarios
- [ ] npm run typecheck passes

### Phase 3: State Manager
**Estimated effort:** 4 iterations

**Files to create:**
- `src/lib/sla/state-manager.ts`
- `src/server/functions/sla.ts` (server function wrappers)
- `src/lib/schemas/sla.ts` (validation schemas)
- `tests/lib/sla/state-manager.test.ts`

**Acceptance:**
- [ ] Start tracking creates record and calculates due dates
- [ ] Pause updates state and records timestamp
- [ ] Resume calculates accumulated pause time and adjusts due dates
- [ ] Response/resolution recording works
- [ ] Event audit trail created for all state changes
- [ ] Unit tests pass
- [ ] npm run typecheck passes

### Phase 4: Breach Detection Job
**Estimated effort:** 3 iterations

**Files to create:**
- `src/lib/sla/breach-detector.ts`
- `trigger/sla-breach-check.ts`

**Acceptance:**
- [ ] Job runs every 5 minutes
- [ ] Detects at-risk SLAs and creates warnings (once per threshold crossing)
- [ ] Detects breached SLAs and updates tracking
- [ ] Notifications sent on breach and at-risk
- [ ] Auto-escalation works if configured
- [ ] npm run typecheck passes

### Phase 5: Support Domain Integration
**Estimated effort:** 4 iterations

**Files to modify:**
- `src/server/functions/issues.ts`
- `src/lib/schema/issues.ts` (add sla_tracking_id FK)
- `src/routes/support/issues/$issueId.tsx` (use new SLA state)
- `src/components/domain/support/sla-status-badge.tsx` (create)

**Acceptance:**
- [ ] Issue creation starts SLA tracking
- [ ] Status change to on_hold + waiting_on_customer pauses SLA
- [ ] Status change from on_hold resumes SLA
- [ ] Issue resolution records SLA resolution
- [ ] UI shows SLA status from sla_tracking
- [ ] Existing SLA policies migrated to sla_configurations
- [ ] npm run typecheck passes

### Phase 6: Warranty Domain Integration
**Estimated effort:** 3 iterations

**Files to modify:**
- `src/server/functions/warranty-claims.ts`
- `src/lib/schema/warranty-claims.ts` (add sla_tracking_id FK)
- `src/routes/support/warranties/$warrantyId.tsx` (use new SLA state)

**Acceptance:**
- [ ] Warranty claim creation starts SLA tracking
- [ ] Claim status changes (approved, denied) don't stop SLA (resolution does)
- [ ] Claim resolution records SLA resolution
- [ ] UI shows SLA status with business day countdown
- [ ] Default warranty SLA config created (24h response, 5 business day resolution)
- [ ] npm run typecheck passes

### Phase 7: Jobs Domain Integration (Optional)
**Estimated effort:** 3 iterations

**Files to modify:**
- `src/server/functions/jobs.ts`
- `src/lib/schema/job-assignments.ts` (add sla_tracking_id FK)
- `src/routes/installer/jobs/$jobId.tsx`

**Acceptance:**
- [ ] Job templates can specify SLA configuration
- [ ] Job creation from template starts SLA tracking
- [ ] Job completion records SLA resolution
- [ ] Job reschedule adjusts SLA targets
- [ ] UI shows job completion SLA (optional feature)
- [ ] npm run typecheck passes

### Phase 8: Business Hours & Holiday UI
**Estimated effort:** 3 iterations

**Files to create:**
- `src/routes/_authed/settings/business-hours.tsx`
- `src/routes/_authed/settings/holidays.tsx`
- `src/components/domain/settings/business-hours-form.tsx`
- `src/components/domain/settings/holiday-calendar.tsx`

**Acceptance:**
- [ ] Settings page to configure weekly business hours
- [ ] Settings page to manage organizational holidays
- [ ] Import common holidays by country/region
- [ ] Preview of effective business hours with holidays
- [ ] npm run typecheck passes

### Phase 9: SLA Dashboard & Reports
**Estimated effort:** 4 iterations

**Files to create:**
- `src/routes/_authed/reports/sla-compliance.tsx`
- `src/server/functions/sla-analytics.ts`
- `src/components/domain/support/sla-dashboard-widgets.tsx`

**Acceptance:**
- [ ] SLA compliance report: % meeting response, % meeting resolution
- [ ] Breach trends over time
- [ ] Average response/resolution times by domain
- [ ] Filter by domain, date range, configuration
- [ ] Dashboard widgets for quick SLA health view
- [ ] npm run typecheck passes

## Migration Strategy

### Data Migration

1. **Create new tables** (sla_configurations, sla_tracking, etc.)
2. **Migrate existing SLA policies**:
   - Support `sla_policies` → `sla_configurations` (domain='support')
   - Warranty hardcoded values → `sla_configurations` (domain='warranty')
3. **Migrate existing SLA state**:
   - For each issue with slaResponseDue/slaResolutionDue:
     - Create sla_tracking record
     - Calculate total_paused_duration from historical status changes
     - Set responded_at if issue was responded to
     - Set resolved_at if issue is resolved/closed
4. **Add FK columns** (sla_tracking_id) to issues, warranty_claims, job_assignments
5. **Deprecate old columns** (keep for backwards compatibility, remove in v3)

### Rollback Plan

- All changes are additive (new tables, new columns)
- Old code paths continue working via deprecated columns
- Feature flag `use_unified_sla` to switch between old and new
- If issues found, disable flag and revert to old behavior

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Business hours calculation complexity | High | Comprehensive unit tests, use proven date-fns library |
| Migration data loss | High | Dry-run migration, backup before migration, keep old columns |
| Performance with many active SLAs | Medium | Efficient indexes, batch processing in breach detector |
| Timezone edge cases | Medium | Extensive timezone testing, use date-fns-tz consistently |
| Domain-specific pause rules | Low | Configurable pause triggers per domain, document clearly |

## Open Questions

- [ ] Should Jobs SLA be opt-in per job template or default for all jobs?
- [ ] How to handle SLA when entity is transferred between orgs? (Reset? Carry over?)
- [ ] Should we support multiple SLA configurations per entity? (e.g., response SLA from policy A, resolution from policy B)
- [ ] What notification channels for SLA alerts? (In-app only? Email? Slack webhook?)

## Success Criteria

1. Single source of truth for SLA calculations across all domains
2. Accurate business hours and holiday handling
3. Pause/resume correctly adjusts due dates
4. At-risk warnings fire before breaches
5. SLA compliance metrics available for all domains
6. No regression in existing Support SLA functionality
7. npm run typecheck passes
8. All unit tests pass

## Location Decision

**Recommendation:** Shared utility at `src/lib/sla/`

**Rationale:**
- SLA calculation is stateless logic (no direct DB access in calculator)
- State manager uses server functions for DB access
- Shared across multiple domains
- Easy to unit test in isolation
- Can be extracted to a package later if needed

**Structure:**
```
src/lib/sla/
├── types.ts           # TypeScript interfaces
├── calculator.ts      # Pure calculation functions
├── business-hours.ts  # Business hours utilities
├── state-manager.ts   # SLA state management
├── breach-detector.ts # Breach detection logic
└── index.ts           # Public exports

src/server/functions/
├── sla.ts             # Server function wrappers (startSla, pauseSla, etc.)
├── sla-config.ts      # SLA configuration CRUD
└── sla-analytics.ts   # SLA reporting queries

trigger/
└── sla-breach-check.ts # Scheduled job
```

---

*Generated by architect-agent on 2026-01-17*
