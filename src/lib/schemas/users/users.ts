/**
 * User Management Zod Schemas
 *
 * Comprehensive validation schemas for the user management domain:
 * - User groups and membership
 * - Delegations
 * - Invitations
 * - Onboarding
 * - Preferences
 * - Audit logs
 *
 * @see drizzle/schema/user-*.ts for database schema
 */

import { z } from 'zod';
import { paginationSchema, filterSchema } from '../_shared/patterns';

// ============================================================================
// SHARED ENUMS
// ============================================================================

export const groupRoleValues = ['member', 'lead', 'manager'] as const;
export const groupRoleSchema = z.enum(groupRoleValues);
export type GroupRole = z.infer<typeof groupRoleSchema>;

export const invitationStatusValues = ['pending', 'accepted', 'expired', 'cancelled'] as const;
export const invitationStatusSchema = z.enum(invitationStatusValues);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

// Note: userRoleSchema and userRoleValues are available from @/lib/schemas (via auth)

// ============================================================================
// USER GROUPS
// ============================================================================

/** Create a new user group */
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
});

export type CreateGroup = z.infer<typeof createGroupSchema>;

/** Update an existing group */
export const updateGroupSchema = createGroupSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateGroup = z.infer<typeof updateGroupSchema>;

/** Group output schema */
export const groupSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Group = z.infer<typeof groupSchema>;

/** Group with member count */
export const groupWithMemberCountSchema = groupSchema.extend({
  memberCount: z.number().int().nonnegative(),
});

export type GroupWithMemberCount = z.infer<typeof groupWithMemberCountSchema>;

// ============================================================================
// GROUP MEMBERS
// ============================================================================

/** Add a member to a group */
export const addGroupMemberSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  role: groupRoleSchema.default('member'),
});

export type AddGroupMember = z.infer<typeof addGroupMemberSchema>;

/** Update member role */
export const updateGroupMemberRoleSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  role: groupRoleSchema,
});

export type UpdateGroupMemberRole = z.infer<typeof updateGroupMemberRoleSchema>;

/** Group member output */
export const groupMemberSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  role: groupRoleSchema,
  joinedAt: z.coerce.date(),
  addedBy: z.string().uuid(),
  // Joined user info
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
      status: z.string(),
    })
    .optional(),
});

export type GroupMember = z.infer<typeof groupMemberSchema>;

// ============================================================================
// DELEGATIONS
// ============================================================================

/** Create a delegation */
export const createDelegationSchema = z
  .object({
    delegateId: z.string().uuid('Invalid delegate user ID'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type CreateDelegation = z.infer<typeof createDelegationSchema>;

/** Update a delegation */
export const updateDelegationSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    reason: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export type UpdateDelegation = z.infer<typeof updateDelegationSchema>;

/** Delegation output */
export const delegationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  delegatorId: z.string().uuid(),
  delegateId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Joined user info
  delegator: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
    })
    .optional(),
  delegate: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
    })
    .optional(),
});

export type Delegation = z.infer<typeof delegationSchema>;

// ============================================================================
// INVITATIONS
// ============================================================================

/** Send an invitation */
export const sendInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'manager', 'sales', 'operations', 'support', 'viewer']),
  personalMessage: z.string().max(500).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export type SendInvitation = z.infer<typeof sendInvitationSchema>;

/** Bulk send invitations */
export const bulkSendInvitationsSchema = z.object({
  invitations: z.array(sendInvitationSchema).min(1).max(50),
});

export type BulkSendInvitations = z.infer<typeof bulkSendInvitationsSchema>;

/** Accept an invitation */
export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;

/** Invitation output */
export const invitationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  status: invitationStatusSchema,
  personalMessage: z.string().nullable(),
  invitedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  acceptedAt: z.coerce.date().nullable(),
  // Joined info
  inviter: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
    })
    .optional(),
});

export type Invitation = z.infer<typeof invitationSchema>;

/** Invitation list filter */
export const invitationFilterSchema = paginationSchema.extend({
  status: invitationStatusSchema.optional(),
});

export type InvitationFilter = z.infer<typeof invitationFilterSchema>;

// ============================================================================
// ONBOARDING
// ============================================================================

/** Complete an onboarding step */
export const completeOnboardingStepSchema = z.object({
  stepKey: z.string().min(1).max(50),
});

export type CompleteOnboardingStep = z.infer<typeof completeOnboardingStepSchema>;

/** Dismiss onboarding step */
export const dismissOnboardingStepSchema = z.object({
  stepKey: z.string().min(1).max(50),
});

export type DismissOnboardingStep = z.infer<typeof dismissOnboardingStepSchema>;

/** Onboarding step output */
export const onboardingStepSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  stepKey: z.string(),
  stepName: z.string(),
  isCompleted: z.boolean(),
  completedAt: z.coerce.date().nullable(),
  dismissedAt: z.coerce.date().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
});

export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

/** Onboarding status output */
export const onboardingStatusSchema = z.object({
  steps: z.array(onboardingStepSchema),
  completed: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  percentComplete: z.number().min(0).max(100),
});

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

// ============================================================================
// PREFERENCES
// ============================================================================

/** Set a single preference */
export const setPreferenceSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.any(), // Can be any JSON value
});

export type SetPreference = z.infer<typeof setPreferenceSchema>;

/** Set multiple preferences */
export const setPreferencesSchema = z.object({
  preferences: z.array(setPreferenceSchema),
});

export type SetPreferences = z.infer<typeof setPreferencesSchema>;

/** Get preferences by category */
export const getPreferencesSchema = z.object({
  category: z.string().min(1).max(50).optional(),
});

export type GetPreferences = z.infer<typeof getPreferencesSchema>;

/** Reset preferences */
export const resetPreferencesSchema = z.object({
  category: z.string().min(1).max(50).optional(),
});

export type ResetPreferences = z.infer<typeof resetPreferencesSchema>;

/** Preference output */
export const preferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: z.string(),
  key: z.string(),
  value: z.any(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Preference = z.infer<typeof preferenceSchema>;

// ============================================================================
// AUDIT LOGS
// ============================================================================

/** Audit log filter */
export const auditLogFilterSchema = paginationSchema.merge(filterSchema).extend({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>;

/** Audit log output */
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().nullable(),
  oldValues: z.record(z.string(), z.any()).nullable(),
  newValues: z.record(z.string(), z.any()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).nullable(),
  // Joined user info
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
    })
    .optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// ============================================================================
// USER ACTIVITY
// ============================================================================

/** User activity filter */
export const userActivityFilterSchema = paginationSchema.merge(filterSchema).extend({
  action: z.string().optional(),
});

export type UserActivityFilter = z.infer<typeof userActivityFilterSchema>;

// ============================================================================
// USER SESSIONS
// ============================================================================

/** Session output */
export const sessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  expiresAt: z.coerce.date(),
  lastActiveAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export type Session = z.infer<typeof sessionSchema>;

/** Terminate session */
export const terminateSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export type TerminateSession = z.infer<typeof terminateSessionSchema>;

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/** Bulk update users */
export const bulkUpdateUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    role: z.enum(['admin', 'manager', 'sales', 'operations', 'support', 'viewer']).optional(),
    status: z.enum(['active', 'suspended', 'deactivated']).optional(),
    groupIds: z.array(z.string().uuid()).optional(),
  }),
});

export type BulkUpdateUsers = z.infer<typeof bulkUpdateUsersSchema>;

/** Bulk operation result */
export const bulkOperationResultSchema = z.object({
  total: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      id: z.string().uuid(),
      error: z.string(),
    })
  ),
});

export type BulkOperationResult = z.infer<typeof bulkOperationResultSchema>;

// ============================================================================
// DATA EXPORT
// ============================================================================

/** Export format */
export const userExportFormatSchema = z.enum(['csv', 'json', 'xlsx']);
export type UserExportFormat = z.infer<typeof userExportFormatSchema>;

/** User data export request */
export const userDataExportSchema = z.object({
  userId: z.string().uuid(),
  format: userExportFormatSchema.default('json'),
  includeActivity: z.boolean().default(true),
  includePreferences: z.boolean().default(true),
});

export type UserDataExport = z.infer<typeof userDataExportSchema>;

/** Bulk export request */
export const bulkExportSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  format: userExportFormatSchema.default('csv'),
});

export type BulkExport = z.infer<typeof bulkExportSchema>;
