-- Activity Logging Improvements Migration
--
-- Addresses premortem findings:
-- 1. Missing GIN index for metadata.customerId queries (customer timeline)
-- 2. Denormalized entityName column to avoid N+1 joins
-- 3. Additional indexes for common query patterns

-- ============================================================================
-- 1. GIN INDEX FOR METADATA JSONB QUERIES
-- ============================================================================
-- Critical for customer timeline queries that filter by metadata->>'customerId'
-- Uses jsonb_path_ops for efficient containment queries

CREATE INDEX IF NOT EXISTS idx_activities_metadata_gin
ON activities USING GIN (metadata jsonb_path_ops);--> statement-breakpoint

-- Specific index for customerId lookups (most common metadata query)
CREATE INDEX IF NOT EXISTS idx_activities_metadata_customer_id
ON activities ((metadata->>'customerId'))
WHERE metadata->>'customerId' IS NOT NULL;--> statement-breakpoint

-- ============================================================================
-- 2. DENORMALIZED ENTITY NAME COLUMN
-- ============================================================================
-- Avoids N+1 joins when displaying activity feeds
-- Populated at write time by activity logger

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS entity_name TEXT;--> statement-breakpoint

-- Index for activity feed display (org + created + entity_name)
CREATE INDEX IF NOT EXISTS idx_activities_entity_name
ON activities (organization_id, created_at DESC, entity_name)
WHERE entity_name IS NOT NULL;--> statement-breakpoint

-- ============================================================================
-- 3. COMPOSITE INDEX FOR ENTITY TIMELINE QUERIES
-- ============================================================================
-- Optimizes getEntityActivities for specific entity types

CREATE INDEX IF NOT EXISTS idx_activities_entity_timeline
ON activities (organization_id, entity_type, entity_id, created_at DESC);--> statement-breakpoint

-- ============================================================================
-- 4. INDEX FOR USER ACTIVITY LEADERBOARD
-- ============================================================================
-- Optimizes getActivityLeaderboard groupBy userId queries

CREATE INDEX IF NOT EXISTS idx_activities_user_count
ON activities (organization_id, user_id, created_at DESC)
WHERE user_id IS NOT NULL;--> statement-breakpoint

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_activities_metadata_gin IS
'GIN index for JSONB metadata queries using containment operators (@>, ?, etc.)';--> statement-breakpoint

COMMENT ON INDEX idx_activities_metadata_customer_id IS
'Expression index for customer timeline queries filtering by metadata->>customerId';--> statement-breakpoint

COMMENT ON COLUMN activities.entity_name IS
'Denormalized entity name/label for display without joins (e.g., customer name, order number)';
