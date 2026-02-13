/**
 * User Onboarding Schema
 *
 * Per-user onboarding progress tracking.
 * Tracks completion of onboarding steps for each user.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/users/users.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  organizationColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { users } from "./users";

// ============================================================================
// INTERFACES
// ============================================================================

export interface OnboardingStepMetadata {
  /** Time spent on step in seconds */
  timeSpent?: number;
  /** Number of times step was viewed */
  viewCount?: number;
  /** Custom notes or feedback */
  notes?: string;
  /** Whether user requested help */
  helpRequested?: boolean;
  /** Whether step was skipped */
  skipped?: boolean;
  /** User's rating of the step (1-5) */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** Errors encountered during step */
  errors?: string[];
  /** Actions taken in this step */
  actions?: string[];
  /** Tutorial video watched */
  videoWatched?: boolean;
  /** Video watch progress (0-100) */
  videoProgress?: number;
}

// ============================================================================
// USER ONBOARDING TABLE
// ============================================================================

export const userOnboarding = pgTable(
  "user_onboarding",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    ...organizationColumn,

    // User reference
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Step identification
    stepKey: varchar("step_key", { length: 50 }).notNull(), // e.g., "profile_setup", "first_quote"
    stepName: varchar("step_name", { length: 100 }).notNull(), // Human-readable name

    // Completion tracking
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Dismissal tracking (user chose to skip)
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),

    // Additional step metadata
    metadata: jsonb("metadata").$type<OnboardingStepMetadata>().default({}),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique step per user
    userStepUnique: uniqueIndex("idx_user_onboarding_user_step_unique").on(
      table.userId,
      table.stepKey
    ),

    // Organization queries
    orgIdx: index("idx_user_onboarding_org").on(table.organizationId),

    // User's onboarding progress
    userIdx: index("idx_user_onboarding_user").on(table.userId),

    // Completion status queries
    userCompletedIdx: index("idx_user_onboarding_user_completed").on(
      table.userId,
      table.isCompleted
    ),

    // Step analytics
    stepKeyIdx: index("idx_user_onboarding_step_key").on(table.stepKey),

    // RLS Policies
    ...standardRlsPolicies("user_onboarding"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [userOnboarding.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserOnboardingStep = typeof userOnboarding.$inferSelect;
export type NewUserOnboardingStep = typeof userOnboarding.$inferInsert;

// ============================================================================
// ONBOARDING STEP DEFINITIONS
// ============================================================================

/**
 * Standard onboarding steps by role.
 * These are seeded when a user is created.
 */
export const ONBOARDING_STEPS = {
  COMMON: [
    { key: "profile_setup", name: "Complete Your Profile", order: 1 },
    { key: "preferences", name: "Set Your Preferences", order: 2 },
    { key: "welcome_tour", name: "Take the Welcome Tour", order: 3 },
  ],
  SALES: [
    { key: "first_customer", name: "Add Your First Customer", order: 10 },
    { key: "first_quote", name: "Create Your First Quote", order: 11 },
    { key: "pipeline_intro", name: "Explore the Sales Pipeline", order: 12 },
  ],
  OPERATIONS: [
    { key: "warehouse_tour", name: "Explore Warehouse Management", order: 10 },
    { key: "inventory_check", name: "Review Inventory Levels", order: 11 },
    { key: "order_management", name: "Understand Order Flow", order: 12 },
  ],
  ADMIN: [
    { key: "invite_team", name: "Invite Your Team", order: 10 },
    { key: "org_settings", name: "Configure Organization", order: 11 },
    { key: "permissions_review", name: "Review Permissions", order: 12 },
  ],
} as const;

export type OnboardingStepKey = string;
