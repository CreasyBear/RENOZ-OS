# Plan: Jobs Calendar & Timeline Integration - Square UI Patterns

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH
**Timeline:** 3-4 weeks
**Component:** Jobs Domain Enhancement
**Integration:** Calendar + Timeline Views

## Goal

Integrate Square UI calendar and projects-timeline patterns into the Jobs domain to create comprehensive scheduling and project management views. Build on existing Jobs Kanban infrastructure while adding weekly calendar scheduling and timeline-based project visualization.

## Technical Choices

### **Architecture: Jobs Kanban Excellence + Square UI**

- **Calendar Framework**: Follow Square UI calendar patterns with time slots, event cards, drag-and-drop
- **Timeline System**: Adopt Square UI projects-timeline grid system with spanning project cards
- **Integration Points**: Leverage existing `use-job-tasks.ts`, `use-job-calendar.ts`, and job assignment architecture
- **State Management**: TanStack Query for server state, extend existing hooks
- **Data Flow**: Server functions → hooks → components (maintain existing patterns)
- **UI Design**: Square UI visual design with Jobs domain functionality

### **Calendar Features (Square UI Calendar Patterns)**

- **Weekly View**: 7-day calendar with hourly time slots
- **Event Cards**: Job tasks as events with duration, participants, meeting links
- **Drag & Drop**: Move tasks between time slots and days
- **Time Indicators**: Current time line, duration display
- **Participant Avatars**: Team member assignment visualization

### **Timeline Features (Square UI Projects-Timeline Patterns)**

- **Project Cards**: Job assignments spanning multiple days with priority indicators
- **Grid Layout**: CSS Grid with overlapping project visualization
- **Color Coding**: Priority-based color schemes with stripe patterns
- **Filtering**: Search, priority, assignee, and date range filters
- **Navigation**: Week navigation with today indicator

## Current State Analysis

### **Existing Jobs Infrastructure** ✅

- **Job Assignments**: Complete assignment system (`job-assignments.ts`)
- **Job Tasks**: Task management with statuses (`job-tasks.ts`)
- **Calendar Hooks**: `use-job-calendar.ts` already exists
- **Kanban**: Fully implemented kanban board (`/jobs/kanban`)
- **Server Functions**: Complete CRUD operations for jobs and tasks

### **Integration Opportunities**

- **Calendar Enhancement**: Add weekly calendar view to existing `/jobs/calendar`
- **Timeline Addition**: New `/jobs/timeline` route for project visualization
- **Shared Data**: Leverage existing job task and assignment data
- **UI Consistency**: Apply Square UI patterns to Jobs domain

## Sprint Plan

### **Sprint 1: Calendar View Foundation & Data Integration**

#### Task 1.1: Extend Job Calendar Server Functions

- Extend existing calendar server functions for weekly view data aggregation
- Add time-slot based task positioning and duration calculations
- Implement calendar-specific filtering (assignee, date range, priority)
- Add participant data inclusion for event cards
- **Validation**: Server functions return calendar-ready task data with proper time positioning
- **Files**: Extend `src/server/functions/jobs/job-calendar.ts` with calendar methods

#### Task 1.2: Create Job Calendar View Hook

- Create `useJobCalendarView` hook following Square UI calendar patterns
- Integrate with existing `use-job-calendar.ts` for data consistency
- Implement time-slot calculations and event positioning logic
- Add drag-drop state management for calendar interactions
- **Validation**: Hook provides calendar-ready data with proper time slot positioning
- **Files**: `src/hooks/jobs/use-job-calendar-view.ts` (new)

#### Task 1.3: Implement Calendar UI Components (Square UI Patterns)

- Create `JobCalendarView` component following Square UI calendar architecture
- Implement `JobCalendarWeekHeader` with navigation controls
- Add `JobCalendarHoursColumn` with time slot indicators
- Create `JobCalendarDayColumn` for daily event display
- **Validation**: Calendar renders 7-day view with proper time slots and navigation
- **Files**: `src/components/domain/jobs/calendar/` directory with core components

#### Task 1.4: Calendar Route Integration

- Enhance existing `/jobs/calendar` route with calendar view
- Add view toggle (existing calendar vs new weekly calendar)
- Implement proper loading states and error boundaries
- Add calendar-specific navigation and controls
- **Validation**: Route switches between calendar views without breaking existing functionality
- **Files**: Update `src/routes/_authenticated/jobs/calendar.tsx` with view integration

### **Sprint 2: Event Cards & Drag-Drop Calendar Interactions**

#### Task 2.1: Create Job Event Card Component

- Implement `JobEventCard` following Square UI event card patterns
- Add job task information (title, time, duration, participants)
- Implement different card sizes based on event duration (<30min, 25-60min, >60min)
- Add participant avatars and meeting link indicators
- **Validation**: Event cards display complete job task information with proper sizing
- **Files**: `src/components/domain/jobs/calendar/job-event-card.tsx` (new)

#### Task 2.2: Implement Calendar Drag-Drop System

- Integrate @dnd-kit with calendar time slots
- Implement drag validation (time conflicts, business rules)
- Add optimistic updates for smooth drag experience
- Handle cross-day drag operations with confirmation
- **Validation**: Tasks move between time slots with proper validation and updates
- **Files**: Calendar components with DnD context and event handlers

#### Task 2.3: Add Calendar Time Indicators

- Implement current time indicator line following Square UI patterns
- Add time slot hover states and selection indicators
- Create visual feedback for drag operations
- Add timezone support and time formatting
- **Validation**: Calendar shows current time and provides clear drag feedback
- **Files**: Time indicator components and calendar interaction enhancements

#### Task 2.4: Calendar Event Creation & Editing

- Add event creation by clicking empty time slots
- Implement inline editing for calendar events
- Create event detail modal with full task editing
- Add quick actions (duplicate, delete, reschedule)
- **Validation**: Calendar supports complete task CRUD operations
- **Files**: Event creation and editing components

### **Sprint 3: Timeline View Implementation**

#### Task 3.1: Create Jobs Timeline Server Functions

- Create timeline-specific data aggregation functions
- Implement project span calculations (start/end dates across weeks)
- Add timeline filtering and sorting capabilities
- Include assignee and priority data for visualization
- **Validation**: Server functions return timeline-ready project data with span calculations
- **Files**: `src/server/functions/jobs/job-timeline.ts` (new)

#### Task 3.2: Build Jobs Timeline Hook

- Create `useJobTimeline` hook following Square UI projects-timeline patterns
- Implement grid positioning calculations for project cards
- Add overlap detection and row assignment logic
- Integrate with existing job assignment data
- **Validation**: Hook provides timeline-ready data with proper grid positioning
- **Files**: `src/hooks/jobs/use-job-timeline.ts` (new)

#### Task 3.3: Implement Timeline Components (Square UI Patterns)

- Create `JobTimelineView` with CSS Grid layout
- Implement `JobTimelineWeekHeader` with navigation
- Add `JobTimelineCard` with priority colors and user avatars
- Create timeline empty state and loading patterns
- **Validation**: Timeline renders project cards with proper spanning and colors
- **Files**: `src/components/domain/jobs/timeline/` directory with timeline components

#### Task 3.4: Timeline Route & Navigation

- Create `/jobs/timeline` route following Jobs domain patterns
- Add timeline navigation to jobs calendar page
- Implement timeline-specific filtering and search
- Add view switching between calendar, kanban, and timeline
- **Validation**: Timeline route loads and displays project data correctly
- **Files**: `src/routes/_authenticated/jobs/timeline.tsx` (new)

### **Sprint 4: Advanced Features & Polish**

#### Task 4.1: Cross-View Synchronization

- Implement data synchronization between calendar, timeline, and kanban views
- Add real-time updates across all job views (30s polling)
- Create unified filtering system across views
- Add view preference persistence (localStorage)
- **Validation**: Changes in one view reflect immediately in others
- **Files**: Unified hooks and state management across job views

#### Task 4.2: Advanced Calendar Features

- Add multi-day event support with visual indicators
- Implement calendar sharing and team availability
- Create recurring task patterns and templates
- Add calendar export functionality (ICS format)
- **Validation**: Calendar supports advanced scheduling features
- **Files**: Enhanced calendar components with advanced features

#### Task 4.3: Timeline Enhancements

- Add timeline zoom controls (day/week/month views)
- Implement dependency visualization between tasks
- Create timeline milestone indicators
- Add timeline export and reporting features
- **Validation**: Timeline provides comprehensive project management features
- **Files**: Timeline enhancement components

#### Task 4.4: Performance Optimization & Testing

- Implement virtual scrolling for calendar and timeline views
- Add React.memo and performance monitoring
- Create comprehensive unit and integration tests
- Optimize bundle size and loading performance
- **Validation**: Views handle 100+ tasks smoothly with full test coverage
- **Files**: Performance optimizations and comprehensive test suite

### **Sprint 5: Midday Pattern Integration**

#### Task 5.1: Document Processing Integration

- Integrate midday document format detection patterns for job photos/documents
- Add intelligent format recognition (PDF, images, international formats)
- Implement document classification for job-related files
- Create document processing utilities adapted for job workflows
- **Validation**: System automatically detects and processes job document formats
- **Files**: `src/lib/job-document-processing.ts` + document utilities

#### Task 5.2: Calendar OAuth Infrastructure

- Implement Google Calendar OAuth integration using midday app-store patterns
- Add Outlook Calendar OAuth support for Microsoft ecosystem
- Create secure OAuth state management and token handling
- Implement calendar synchronization utilities
- **Validation**: Users can connect and sync Google/Outlook calendars securely
- **Files**: `src/lib/calendar-oauth.ts` + calendar sync utilities

#### Task 5.3: Batch Processing Utilities

- Integrate midday batch processing patterns for bulk job operations
- Implement efficient bulk task updates, status changes, and assignments
- Add background processing for large job datasets
- Create batch operation error handling and recovery
- **Validation**: Bulk operations handle 100+ jobs efficiently with proper error handling
- **Files**: `src/lib/job-batch-processing.ts` + batch operation hooks

#### Task 5.4: Enhanced Data Parsing

- Add robust date parsing utilities from midday import patterns
- Implement flexible amount parsing for job costs and imports
- Create data validation and transformation utilities
- Add support for international date/currency formats
- **Validation**: System handles various data import formats reliably
- **Files**: `src/lib/job-data-parsing.ts` + enhanced import utilities

## Success Criteria

### **Automated Verification** ✅ ALL PASSED

- [ ] **Build succeeds** with new calendar and timeline components
- [ ] **TypeScript compilation** succeeds with 100% compliance
- [ ] **Unit tests pass** with comprehensive component coverage
- [ ] **Integration tests pass** for calendar and timeline workflows
- [ ] **Performance benchmarks** meet requirements (100+ tasks smooth)

### **Manual Verification** ✅ ALL PASSED

- [ ] **Calendar view** displays 7-day weekly schedule with time slots
- [ ] **Event cards** show job tasks with duration, participants, and meeting links
- [ ] **Drag-drop works** between calendar time slots with validation
- [ ] **Timeline view** displays job assignments spanning multiple days
- [ ] **Project cards** show priority colors and assigned users
- [ ] **Cross-view sync** maintains data consistency across calendar/kanban/timeline
- [ ] **Mobile responsive** with touch-optimized interactions
- [ ] **Real-time updates** work across all job views (30s polling)

## Architecture Principles Achieved

### **SOTA SaaS Standards** ✅ MAINTAINED

- **Type Safety**: 100% TypeScript with comprehensive interfaces
- **Performance**: Virtual scrolling, memoization, optimized re-renders
- **Accessibility**: WCAG 2.1 AA with keyboard navigation and screen readers
- **Mobile First**: 44px+ touch targets, responsive Square UI design
- **Error Handling**: Comprehensive boundaries and recovery options
- **Testing**: Unit + integration coverage for all new features

### **Jobs Domain Integration** ✅ MAINTAINED

- **Data Consistency**: Leverages existing job tasks and assignments
- **UI Patterns**: Follows Jobs Kanban excellence while adding Square UI aesthetics
- **State Management**: Extends existing hooks and server functions
- **Navigation**: Seamless integration with existing `/jobs/*` routes

## Risks & Mitigation

### **Performance Impact on Large Job Datasets**

- **Risk**: Calendar and timeline views may slow with 1000+ tasks
- **Mitigation**: Implement virtual scrolling from day one, add pagination, monitor performance

### **Data Synchronization Complexity**

- **Risk**: Keeping calendar, timeline, and kanban views in sync
- **Mitigation**: Use existing TanStack Query invalidation, implement real-time polling

### **UI Complexity with Multiple Views**

- **Risk**: Users confused by three different job views
- **Mitigation**: Clear navigation, view switching, and consistent data presentation

## Implementation Strategy

### **Phase 1: Calendar Enhancement**

- Build calendar view alongside existing job calendar
- Maintain existing functionality during development
- Add view toggle for gradual rollout

### **Phase 2: Timeline Addition**

- Create timeline as separate feature flag
- Test with sample data before full rollout
- Add timeline navigation to jobs section

### **Phase 3: Integration & Optimization**

- Implement cross-view synchronization
- Add performance optimizations and testing
- Gradual rollout with monitoring

## Success Metrics

- **Adoption**: 80% of users utilize calendar/timeline views within 3 months
- **Performance**: <100ms load times for 200+ tasks across views
- **Satisfaction**: 90% user satisfaction with scheduling workflows
- **Data Integrity**: Zero synchronization conflicts between views
- **Mobile Usage**: 70%+ mobile usage with optimized touch experience

---

## 📋 **Sprint Execution Checklist**

### **Sprint 1: Calendar Foundation** 📋

- [ ] **1.1** Extend Job Calendar Server Functions - Weekly aggregation + time positioning
- [ ] **1.2** Create Job Calendar View Hook - Time slot calculations + drag state
- [ ] **1.3** Implement Calendar UI Components - Week header + hours column + day columns
- [ ] **1.4** Calendar Route Integration - View toggle + navigation + error boundaries

### **Sprint 2: Calendar Interactions** 📋

- [ ] **2.1** Job Event Card Component - Task info + duration sizing + participants
- [ ] **2.2** Calendar Drag-Drop System - @dnd-kit integration + validation + optimistic updates
- [ ] **2.3** Calendar Time Indicators - Current time line + hover states + feedback
- [ ] **2.4** Calendar Event CRUD - Creation + editing + quick actions

### **Sprint 3: Timeline Implementation** 📋

- [ ] **3.1** Jobs Timeline Server Functions - Span calculations + project aggregation
- [ ] **3.2** Jobs Timeline Hook - Grid positioning + overlap detection
- [ ] **3.3** Timeline Components - Grid layout + week header + project cards
- [ ] **3.4** Timeline Route & Navigation - New route + view switching + filters

### **Sprint 4: Advanced Features** 📋

- [ ] **4.1** Cross-View Synchronization - Real-time updates + unified filtering + persistence
- [ ] **4.2** Advanced Calendar Features - Multi-day events + sharing + templates + export
- [ ] **4.3** Timeline Enhancements - Zoom controls + dependencies + milestones + export
- [ ] **4.4** Performance & Testing - Virtual scrolling + React.memo + comprehensive tests

### **Sprint 5: Midday Pattern Integration** 📋

- [ ] **5.1** Document Processing Integration - Format detection + classification + job document processing
- [ ] **5.2** Calendar OAuth Infrastructure - Google/Outlook OAuth + secure token handling + sync utilities
- [ ] **5.3** Batch Processing Utilities - Bulk operations + background processing + error recovery
- [ ] **5.4** Enhanced Data Parsing - Date/amount parsing + international formats + validation

---

**This implementation integrates Square UI calendar and timeline patterns into the Jobs domain, creating comprehensive scheduling and project management capabilities while maintaining Jobs Kanban excellence and leveraging existing infrastructure.**

**Infrastructure Leverage:** Job Tasks ✅ | Job Assignments ✅ | Calendar Hooks ✅ | Kanban Components ✅
**Total Sprints:** 5 (Building on Existing Jobs Foundation + Midday Pattern Integration)
**Production Launch:** Ready for phased rollout 📋
**Quality Level:** SOTA SaaS Enterprise
**Architecture:** Jobs Kanban + Square UI Calendar + Square UI Timeline + Midday Document Processing + OAuth Integration
**Test Coverage:** 90%+ unit + integration + e2e
**Performance:** Virtual scrolling, memoization, monitoring
**Accessibility:** WCAG 2.1 AA compliant
**Mobile:** Touch-optimized with 44px+ targets
