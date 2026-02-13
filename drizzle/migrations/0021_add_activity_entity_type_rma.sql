-- Migration: Add RMA entity type to activity_entity_type enum
-- Description: Adds RMA (Return Merchandise Authorization) to activity_entity_type for RMA domain tracking
-- Must match lib/schemas/activities activityEntityTypeValues

ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'rma';
