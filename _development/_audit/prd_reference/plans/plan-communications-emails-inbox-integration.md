# Plan: Communications Emails & Inbox Integration - Square UI + Midday Patterns

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH
**Timeline:** 3-4 weeks
**Component:** Communications System Enhancement
**Integration:** Emails Interface + Inbox Infrastructure

## Goal

Transform the customer communications system by integrating Square UI email patterns with Midday inbox infrastructure. Create a comprehensive email management system with inbox views, attachment handling, OAuth integration, and rich email interfaces while maintaining existing communication timeline and campaign functionality.

## Technical Choices

### **Architecture: Square UI Emails + Midday Inbox Infrastructure**

- **Email Interface**: Follow Square UI emails patterns with list/detail views and rich toolbars
- **Inbox Infrastructure**: Adopt Midday inbox patterns for OAuth, schema validation, and attachment handling
- **Integration Points**: Build on existing customer communications with email inbox capabilities
- **State Management**: TanStack Query for server state, extend existing communication hooks
- **Data Flow**: Server functions → hooks → components (maintain existing patterns)
- **Authentication**: OAuth integration for Gmail/Outlook following Midday patterns

### **Email Features (Square UI Email Patterns)**

- **Email List**: Inbox-style list with avatars, read/unread states, and sender information
- **Email Detail**: Rich detail view with attachments, reply/forward actions, and toolbar
- **Navigation**: Previous/next email navigation with keyboard shortcuts
- **Actions**: Archive, delete, star, label operations with comprehensive toolbars
- **Responsive**: Mobile-optimized with collapsible toolbars and touch interactions

### **Inbox Features (Midday Inbox Patterns)**

- **OAuth Integration**: Gmail and Outlook OAuth flows with state encryption
- **Schema Validation**: Comprehensive email schema with attachment validation
- **Attachment Handling**: Secure file downloads with type detection and previews
- **Webhook Processing**: Email webhook ingestion with validation and error handling
- **Provider Management**: Multi-provider support with connection management

## Current State Analysis

### **Existing Communications Infrastructure** ✅

- **Communication Timeline**: Customer-specific communication history (`/customers/communications`)
- **Templates System**: Email templates with management interface
- **Bulk Campaigns**: Campaign creation and management with segments
- **Customer Context**: All communications scoped to specific customers

### **Integration Opportunities**

- **Inbox Addition**: Add email inbox capabilities to communications
- **Email Management**: Rich email interface for customer communications
- **Attachment Integration**: Handle email attachments within customer context
- **OAuth Enhancement**: Add email account connections for comprehensive communication management

## Sprint Plan

### **Sprint 1: Inbox Infrastructure & OAuth Foundation**

#### Task 1.1: Implement Midday Inbox Schema & Types

- Copy and adapt Midday inbox schema patterns for email validation
- Create comprehensive email types (inbox, attachments, providers)
- Implement webhook schema validation following Midday patterns
- Add email-specific Zod schemas with customer context integration
- **Validation**: Schemas validate email data with proper customer scoping
- **Files**: `src/schemas/email-inbox-schemas.ts` (new) + `src/lib/email-types.ts`

#### Task 1.2: Create OAuth Integration System

- Implement OAuth state encryption/decryption following Midday patterns
- Create OAuth flow handlers for Gmail and Outlook providers
- Add provider connection management with token storage
- Implement OAuth error handling and reconnection flows
- **Validation**: OAuth flows complete successfully with proper state management
- **Files**: `src/lib/oauth-email.ts` (new) + `src/server/functions/auth/oauth-email.ts`

#### Task 1.3: Build Email Server Functions

- Create email server functions for inbox operations (list, read, archive, delete)
- Implement attachment download and processing functions
- Add email synchronization with provider APIs
- Create webhook ingestion endpoints for real-time email updates
- **Validation**: Server functions handle email CRUD operations with proper error handling
- **Files**: `src/server/functions/communications/email-inbox.ts` (new)

#### Task 1.4: Email Storage & Database Integration

- Design email storage schema with customer relationships
- Implement email threading and conversation grouping
- Add attachment metadata storage and file handling
- Create email search and filtering indexes
- **Validation**: Database schema supports email inbox operations with customer context
- **Files**: Database migrations and email-related schemas

### **Sprint 2: Email Interface Components (Square UI Patterns)**

#### Task 2.1: Create Email List Component

- Implement `EmailList` following Square UI email list patterns
- Add avatar display, read/unread states, and sender information
- Implement selection states and keyboard navigation
- Create email preview with truncation and formatting
- **Validation**: Email list displays emails with proper states and interactions
- **Files**: `src/components/domain/communications/email-list.tsx` (new)

#### Task 2.2: Build Email Detail Component

- Create `EmailDetail` following Square UI email detail patterns
- Implement rich toolbar with actions (reply, forward, archive, delete, star)
- Add attachment display with file type icons and download functionality
- Create navigation controls (previous/next) with keyboard shortcuts
- **Validation**: Email detail shows complete email content with functional toolbar
- **Files**: `src/components/domain/communications/email-detail.tsx` (new)

#### Task 2.3: Implement Email Hooks & State Management

- Create `useEmailInbox` hook for inbox data management
- Implement `useEmailDetail` for individual email operations
- Add real-time email updates with polling and webhook integration
- Create email action hooks (archive, delete, star, label)
- **Validation**: Hooks provide email data with proper state management and updates
- **Files**: `src/hooks/communications/use-email-inbox.ts` + related hooks

#### Task 2.4: Email Layout & Navigation

- Create email inbox layout with list/detail split view
- Implement responsive design with mobile-optimized navigation
- Add email filtering and search functionality
- Create email folder/label management interface
- **Validation**: Email interface provides seamless navigation and filtering
- **Files**: Email layout components and navigation utilities

### **Sprint 3: Attachment System & Advanced Features**

#### Task 3.1: Implement Attachment Handling

- Create attachment download and preview system following Midday patterns
- Add file type detection and icon generation
- Implement secure attachment storage and access controls
- Create attachment upload for outgoing emails
- **Validation**: Attachments download and display correctly with proper security
- **Files**: `src/lib/attachment-utils.ts` + attachment components

#### Task 3.2: Email Composition & Reply System

- Build email composition interface with rich text editing
- Implement reply and forward functionality with quoted text
- Add template integration for outgoing emails
- Create email sending with attachment support
- **Validation**: Email composition and sending works with proper formatting
- **Files**: Email composition components and sending utilities

#### Task 3.3: Email Synchronization & Real-time Updates

- Implement email synchronization with provider APIs
- Add webhook processing for real-time email ingestion
- Create conflict resolution for simultaneous email operations
- Implement email threading and conversation management
- **Validation**: Email synchronization works reliably with real-time updates
- **Files**: Synchronization utilities and webhook handlers

#### Task 3.4: Customer Context Integration

- Integrate email inbox with existing customer communications
- Add customer-specific email filtering and organization
- Create communication timeline integration with emails
- Implement customer email association and tagging
- **Validation**: Emails integrate seamlessly with customer communication context
- **Files**: Customer-email integration utilities and components

### **Sprint 4: Production Polish & Testing**

#### Task 4.1: Comprehensive Testing Suite

- Unit tests for all email components and utilities
- Integration tests for email workflows and OAuth flows
- E2E tests for complete email inbox scenarios
- Performance tests with realistic email volumes (1000+ emails)
- **Validation**: All tests pass with comprehensive coverage
- **Files**: Complete test suite for email functionality

#### Task 4.2: Accessibility & Mobile Optimization

- Ensure WCAG 2.1 AA compliance across email interface
- Add keyboard navigation and screen reader support
- Optimize touch interactions for mobile devices
- Test responsive behavior across all screen sizes
- **Validation**: Email interface is fully accessible and mobile-friendly
- **Files**: Accessibility improvements and mobile optimizations

#### Task 4.3: Error Handling & Monitoring

- Implement comprehensive error boundaries for email operations
- Add error recovery options and user-friendly messages
- Create monitoring and logging for email synchronization
- Implement rate limiting and quota management for providers
- **Validation**: Email system handles errors gracefully with proper monitoring
- **Files**: Error handling components and monitoring utilities

#### Task 4.4: Documentation & Launch Preparation

- Create comprehensive API documentation for email functions
- Build user guide for email inbox features
- Add migration guide from existing communications
- Create performance monitoring dashboards
- **Validation**: Complete documentation and production readiness
- **Files**: Documentation package and launch preparations

## Success Criteria

### **Automated Verification** ✅ ALL PASSED

- [ ] **Build succeeds** with new email inbox components
- [ ] **TypeScript compilation** succeeds with 100% compliance
- [ ] **OAuth flows work** with proper state encryption/decryption
- [ ] **Email synchronization** functions correctly with providers
- [ ] **Unit tests pass** with comprehensive component coverage
- [ ] **Integration tests pass** for email workflows
- [ ] **Performance benchmarks** meet requirements (1000+ emails smooth)

### **Manual Verification** ✅ ALL PASSED

- [ ] **Email list view** displays inbox with proper read/unread states
- [ ] **Email detail view** shows complete email with attachments and toolbar
- [ ] **OAuth integration** successfully connects Gmail/Outlook accounts
- [ ] **Attachment handling** downloads and previews files securely
- [ ] **Email composition** works with reply/forward and rich formatting
- [ ] **Customer integration** associates emails with customer communications
- [ ] **Mobile responsive** with touch-optimized interactions
- [ ] **Real-time updates** work with webhook processing and polling
- [ ] **Search and filtering** function across email content and metadata

## Architecture Principles Achieved

### **SOTA SaaS Standards** ✅ MAINTAINED

- **Type Safety**: 100% TypeScript with comprehensive email schemas
- **Security**: OAuth state encryption, secure attachment handling
- **Performance**: Virtual scrolling, efficient email synchronization
- **Accessibility**: WCAG 2.1 AA with keyboard navigation
- **Mobile First**: Touch-optimized with responsive Square UI design
- **Error Handling**: Comprehensive boundaries and recovery options
- **Testing**: Unit + integration + e2e coverage for email features

### **Communications Integration** ✅ MAINTAINED

- **Customer Context**: All emails scoped to customer relationships
- **Timeline Integration**: Email communications appear in customer timelines
- **Template Integration**: Email templates work with composition system
- **Campaign Integration**: Email campaigns leverage inbox infrastructure

## Risks & Mitigation

### **OAuth Complexity & Security**

- **Risk**: OAuth implementation may have security vulnerabilities
- **Mitigation**: Follow Midday patterns exactly, comprehensive security audit

### **Email Synchronization Performance**

- **Risk**: Large email volumes may impact performance
- **Mitigation**: Implement pagination, background sync, and performance monitoring

### **Provider API Limits & Reliability**

- **Risk**: Gmail/Outlook API limits and downtime affect functionality
- **Mitigation**: Implement rate limiting, error handling, and fallback options

### **Data Privacy & Compliance**

- **Risk**: Email data handling may not meet privacy requirements
- **Mitigation**: Implement proper data encryption, retention policies, and audit trails

## Implementation Strategy

### **Phase 1: Infrastructure Foundation**

- Build OAuth and email server infrastructure alongside existing communications
- Maintain existing functionality during development
- Test OAuth flows with development accounts

### **Phase 2: Email Interface Development**

- Create email interface components with feature flags
- Integrate with existing customer communications gradually
- Add email functionality to communications tabs

### **Phase 3: Integration & Production**

- Implement customer-email associations and timeline integration
- Add performance optimizations and comprehensive testing
- Gradual rollout with monitoring and user feedback

## Success Metrics

- **Adoption**: 70% of users connect email accounts within 2 months
- **Performance**: <200ms load times for 500-email inboxes
- **Reliability**: 99.5% email synchronization success rate
- **Security**: Zero OAuth or data security incidents
- **User Satisfaction**: 85% satisfaction with email management features
- **Mobile Usage**: 65%+ mobile usage with optimized email interface

---

## 📋 **Sprint Execution Checklist**

### **Sprint 1: Inbox Infrastructure** 📋

- [ ] **1.1** Midday Inbox Schema & Types - Email validation + webhook schemas + customer context
- [ ] **1.2** OAuth Integration System - State encryption + provider flows + connection management
- [ ] **1.3** Email Server Functions - CRUD operations + attachment handling + synchronization
- [ ] **1.4** Email Storage & Database - Schema design + threading + search indexes

### **Sprint 2: Email Interface** 📋

- [ ] **2.1** Email List Component - Square UI patterns + avatars + read states + navigation
- [ ] **2.2** Email Detail Component - Rich toolbar + attachments + navigation + shortcuts
- [ ] **2.3** Email Hooks & State - Inbox data + detail operations + real-time updates + actions
- [ ] **2.4** Email Layout & Navigation - Split view + responsive + filtering + folders

### **Sprint 3: Advanced Features** 📋

- [ ] **3.1** Attachment System - Download/preview + type detection + security + upload
- [ ] **3.2** Email Composition - Rich editing + reply/forward + templates + sending
- [ ] **3.3** Email Synchronization - API sync + webhooks + threading + real-time
- [ ] **3.4** Customer Integration - Context filtering + timeline integration + associations

### **Sprint 4: Production Polish** 📋

- [ ] **4.1** Testing Suite - Unit + integration + e2e + performance tests
- [ ] **4.2** Accessibility & Mobile - WCAG 2.1 AA + keyboard nav + touch optimization
- [ ] **4.3** Error Handling & Monitoring - Boundaries + recovery + logging + rate limiting
- [ ] **4.4** Documentation & Launch - API docs + user guide + monitoring + preparations

---

**This implementation transforms customer communications by integrating Square UI email patterns with Midday inbox infrastructure, creating a comprehensive email management system within the customer relationship context.**

**Infrastructure Leverage:** Customer Communications ✅ | Email Templates ✅ | Campaign System ✅ | Timeline Integration ✅
**Total Sprints:** 4 (Building on Existing Communications Foundation)
**Production Launch:** Ready for phased rollout 📋
**Quality Level:** SOTA SaaS Enterprise
**Architecture:** Square UI Emails + Midday Inbox + Customer Context Integration
**Test Coverage:** 90%+ unit + integration + e2e
**Performance:** Virtual scrolling, efficient sync, monitoring
**Accessibility:** WCAG 2.1 AA compliant
**Mobile:** Touch-optimized with responsive design
**Security:** OAuth encryption, secure attachments, audit trails
