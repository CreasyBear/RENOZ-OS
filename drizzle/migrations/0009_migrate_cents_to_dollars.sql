-- Migration: Convert cost_cents columns to cost (dollars)
-- Divides existing values by 100 and changes column type to numeric(12,2)

-- ai_cost_tracking: cost_cents -> cost
ALTER TABLE "ai_cost_tracking" ADD COLUMN "cost" numeric(12,2) DEFAULT 0 NOT NULL;
UPDATE "ai_cost_tracking" SET "cost" = "cost_cents" / 100.0 WHERE "cost_cents" IS NOT NULL;
ALTER TABLE "ai_cost_tracking" DROP COLUMN "cost_cents";

-- ai_agent_tasks: cost_cents -> cost
ALTER TABLE "ai_agent_tasks" ADD COLUMN "cost" numeric(12,2) DEFAULT 0;
UPDATE "ai_agent_tasks" SET "cost" = "cost_cents" / 100.0 WHERE "cost_cents" IS NOT NULL;
ALTER TABLE "ai_agent_tasks" DROP COLUMN "cost_cents";
