-- Migration: Add new activity entity types
-- Description: Adds Jobs/Projects and Warranty domain entity types to activity_entity_type enum

-- Add new Jobs/Projects domain entity types
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'site_visit';
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'job_assignment';
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'job_material';
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'job_photo';

-- Add new Warranty domain entity types
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'warranty_claim';
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'warranty_policy';
ALTER TYPE "public"."activity_entity_type" ADD VALUE IF NOT EXISTS 'warranty_extension';
