# Customer Activity Logging System

## Overview

The system uses **two complementary activity systems** to track customer interactions:

1. **Unified Audit Trail** (`activities` table) - System-generated activities
2. **Planned Activities** (`customerActivities` table) - Manual/planned activities

## ✅ Current Status: Fully Integrated

All activity logging systems are now properly integrated:

- ✅ **Order activities** appear in customer timeline (via metadata lookup)
- ✅ **Planned activities** are fetched and displayed in unified timeline
- ✅ **Activity summary** includes both audit trail and planned activities
- ✅ **User attribution** works correctly for all activity types

The customer 360 view now shows a complete, unified timeline of all customer interactions.

## Activity Systems

### 1. Unified Audit Trail (`activities` table)

**Purpose**: System-generated audit trail for all entity changes

**Entity Types**: `customer`, `order`, `opportunity`, `product`, etc.

**Actions**: `created`, `updated`, `deleted`, `email_sent`, `call_logged`, `note_added`

**How It Works**:
- Uses `ActivityLogger` class with context injection
- Logs activities asynchronously (fire-and-forget) after transactions
- Includes field-level change tracking
- Links to users, IP addresses, user agents

**Current Logging**:

#### ✅ Customer Edits
- **Location**: `src/server/functions/customers/customers.ts:updateCustomer()`
- **Action**: `updated`
- **Entity Type**: `customer`
- **Includes**: Field changes (before/after), excluded fields (updatedAt, updatedBy, etc.)
- **Example**: "Updated customer: Acme Solar Corp" with changes to phone, industry

#### ✅ Customer Creation
- **Location**: `src/server/functions/customers/customers.ts:createCustomer()`
- **Action**: `created`
- **Entity Type**: `customer`
- **Includes**: Full customer data

#### ✅ Customer Deletion
- **Location**: `src/server/functions/customers/customers.ts:deleteCustomer()`
- **Action**: `deleted`
- **Entity Type**: `customer`
- **Includes**: Customer data before deletion

#### ⚠️ Orders
- **Location**: `src/server/functions/orders/orders.ts:createOrder()`, `updateOrder()`
- **Action**: `created`, `updated`
- **Entity Type**: `order` (NOT `customer`)
- **Issue**: Orders are logged but **don't appear in customer timeline** because they're logged with `entityType='order'` instead of `entityType='customer'`
- **Metadata**: Includes `customerId` in metadata, but query filters by `entityType='customer'`

#### ✅ Communications (Emails, Calls, Notes)
- **Location**: `src/lib/server/activity-bridge.ts`
- **Functions**:
  - `createEmailSentActivity()` - Logs email sends
  - `createCallLoggedActivity()` - Logs calls
  - `createNoteAddedActivity()` - Logs notes
- **Entity Type**: `customer` (if customerId provided) or `email`/`call`/`contact`
- **Actions**: `email_sent`, `call_logged`, `note_added`
- **Includes**: Recipient info, subject, content preview, duration

### 2. Planned Activities (`customerActivities` table)

**Purpose**: Manual/planned customer interactions

**Activity Types**: `call`, `email`, `meeting`, `note`, `quote`, `order`, `complaint`, `feedback`, `website_visit`, `social_interaction`

**How It Works**:
- Created via `createCustomerActivity()` server function
- Can be scheduled (scheduledAt) or completed (completedAt)
- Includes direction (inbound/outbound/internal), duration, outcome
- Links to contacts, assigned users

**Current Usage**:
- Manual activity creation via API
- Some communications create both `activities` (audit) and `customerActivities` (planned)
- **Issue**: Not fully integrated into unified timeline (hook returns empty array)

## Current Status

### ✅ 1. Orders Now Show in Customer Timeline

**Solution Implemented**: Enhanced `getEntityActivities` to include related order activities when querying customers.

**Implementation**: When `entityType='customer'`, the query now includes:
- Direct customer activities (`entityType='customer'`, `entityId=customerId`)
- Related order activities (`entityType='order'`, `metadata->>'customerId'=customerId`)

**Location**: `src/server/functions/activities/activities.ts:getEntityActivities`

### ✅ 2. Planned Activities Now Fetched

**Solution Implemented**: Completed `useUnifiedActivities` hook to fetch planned activities from `customerActivities` table.

**Implementation**: 
- `getCustomerActivities` now joins `users` table for proper attribution
- `useUnifiedActivities` calls `getCustomerActivities` and transforms results using `transformPlannedActivity`
- Planned activities are merged with audit activities chronologically

**Locations**: 
- `src/server/customers.ts:getCustomerActivities`
- `src/hooks/use-unified-activities.ts`

### ✅ 3. Activity Summary Now Complete

**Solution Implemented**: Enhanced activity summary in `getCustomerById` to query both `activities` and `customerActivities` tables.

**Implementation**:
- Queries both tables in parallel using `Promise.all`
- Merges activity summaries by type (sums counts, takes latest date)
- Includes order activities in audit trail summary
- Calculates accurate total count from both sources

**Location**: `src/server/customers.ts:getCustomerById`

## Implementation Details

### Fix 1: Include Order Activities in Customer Timeline ✅

**Implementation**: Enhanced `getEntityActivities` with conditional logic:

```typescript
if (entityType === 'customer') {
  conditions.push(
    or(
      // Direct customer activities
      and(
        eq(activities.entityType, 'customer'),
        eq(activities.entityId, entityId)
      ),
      // Order activities where metadata.customerId matches
      and(
        eq(activities.entityType, 'order'),
        sql`${activities.metadata}->>'customerId' = ${entityId}`
      )
    )!
  );
}
```

### Fix 2: Implement Planned Activities Fetch ✅

**Implementation**: 
- Enhanced `getCustomerActivities` to join users table
- Updated `useUnifiedActivities` to fetch and transform planned activities

```typescript
// In getCustomerActivities - join users for attribution
.leftJoin(users, eq(customerActivities.createdBy, users.id))

// In useUnifiedActivities - fetch and transform
const result = await getCustomerActivities({
  data: { customerId: entityId }
});
return result.map((item: any) => transformPlannedActivity(item));
```

### Fix 3: Enhance Activity Summary ✅

**Implementation**: Query both tables and merge results:

```typescript
// Query both tables in parallel
const [plannedActivitySummary, auditActivitySummary, ...] = await Promise.all([
  // Planned activities from customerActivities
  db.select({ activityType: customerActivities.activityType, ... })
    .from(customerActivities)...
  // Audit activities from activities (including orders)
  db.select({ activityType: activities.action, ... })
    .from(activities)
    .where(or(
      and(eq(activities.entityType, 'customer'), eq(activities.entityId, id)),
      and(eq(activities.entityType, 'order'), sql`${activities.metadata}->>'customerId' = ${id}`)
    )!)...
]);

// Merge summaries by type
const activityTypeMap = new Map();
// ... merge logic
```

## Activity Types Reference

### Audit Trail Actions (`activities` table)
- `created` - Entity created
- `updated` - Entity updated (with field changes)
- `deleted` - Entity deleted
- `email_sent` - Email sent
- `call_logged` - Call logged
- `note_added` - Note added

### Planned Activity Types (`customerActivities` table)
- `call` - Phone call
- `email` - Email communication
- `meeting` - Meeting/appointment
- `note` - General note
- `quote` - Quote sent/received
- `order` - Order placed
- `complaint` - Customer complaint
- `feedback` - Customer feedback
- `website_visit` - Website visit tracked
- `social_interaction` - Social media interaction

## Data Flow

```
Customer Edit → updateCustomer()
  ↓
ActivityLogger.logAsync()
  ↓
activities table (entityType='customer', action='updated')

Order Create → createOrder()
  ↓
ActivityLogger.logAsync()
  ↓
activities table (entityType='order', action='created')
  ⚠️ NOT linked to customer timeline

Email Send → createEmailSentActivity()
  ↓
activities table (entityType='customer', action='email_sent')
  ✅ Shows in customer timeline

Manual Activity → createCustomerActivity()
  ↓
customerActivities table (activityType='call', etc.)
  ⚠️ Not fetched in unified timeline yet
```
