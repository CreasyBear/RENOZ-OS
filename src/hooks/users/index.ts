/**
 * Users Hooks
 *
 * Barrel export for user management hooks.
 * Uses named exports to prevent wildcard collisions.
 */

// --- User CRUD ---
export {
  useUsers,
  useUser,
  useUserStats,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
  useBulkUpdateUsers,
  useExportUsers,
  useTransferOwnership,
  useUserActivity,
  type UserFilters,
} from './use-users';

// --- Groups ---
export {
  useGroups,
  useGroup,
  useGroupMembers,
  useUserGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupMember,
  useUpdateGroupMemberRole,
  useRemoveGroupMember,
  type GroupFilters,
  type GroupMemberFilters,
} from './use-groups';

// --- User Lookup ---
export { useUserLookup, useUserNames } from './use-user-lookup';

// --- Preferences ---
export { usePreferences, useSetPreference } from './use-preferences';

// --- Invitations ---
export {
  useInvitationByToken,
  useInvitations,
  useInvitationsFiltered,
  useInvitationStats,
  useAcceptInvitation,
  useSendInvitation,
  useCancelInvitation,
  useResendInvitation,
  useBatchSendInvitations,
  type BatchInvitationItem,
  type BatchSendInvitationsInput,
  type InvitationFilters,
} from './use-invitations';

// --- Sessions ---
export {
  useMySessions,
  useTerminateSession,
  useTerminateAllOtherSessions,
  type SessionInfo,
} from './use-sessions';

// --- Activity ---
export { useMyActivity, type MyActivityFilters } from './use-my-activity';

// --- Delegations ---
export {
  useMyDelegations,
  useDelegationsToMe,
  useAllDelegations,
  useActiveDelegate,
  useCreateDelegation,
  useUpdateDelegation,
  useCancelDelegation,
  type DelegationFilters,
  type AllDelegationsFilters,
} from './use-delegations';

// --- Onboarding ---
export {
  useOnboardingProgress,
  useCompleteOnboardingStep,
  useDismissOnboardingStep,
  useResetOnboarding,
  type OnboardingStep,
  type OnboardingStats,
  type OnboardingProgress,
} from './use-onboarding';
