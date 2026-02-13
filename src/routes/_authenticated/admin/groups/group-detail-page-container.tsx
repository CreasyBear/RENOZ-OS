/**
 * Group Detail Container Component
 *
 * Handles data fetching and mutations for group detail page.
 *
 * @source group from useGroup hook
 * @source members from useGroupMembers hook
 * @source users from useUsers hook
 * @source mutations from useUpdateGroup, useAddGroupMember, useUpdateGroupMemberRole, useRemoveGroupMember hooks
 *
 * @see src/routes/_authenticated/admin/groups/group-detail-page.tsx - Presenter component
 */
import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useConfirmation, toast } from '@/hooks';
import {
  useGroup,
  useGroupMembers,
  useUpdateGroup,
  useAddGroupMember,
  useUpdateGroupMemberRole,
  useRemoveGroupMember,
  useUsers,
} from '@/hooks/users';
import { PageLayout } from '@/components/layout';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { Route } from './$groupId';
import GroupDetailPagePresenter from './group-detail-page';

export default function GroupDetailPageContainer() {
  const confirm = useConfirmation();
  const navigate = useNavigate();
  const { groupId } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab || 'members';

  // Data fetching hooks
  const { data: group, isLoading: isLoadingGroup, error: groupError } = useGroup(groupId);
  const { data: membersData, isLoading: isLoadingMembers, error: membersError } = useGroupMembers(groupId, {
    page: 1,
    pageSize: 100,
  });
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useUsers({
    page: 1,
    pageSize: 100,
    sortOrder: 'asc',
    status: 'active',
  });

  useDetailBreadcrumb(`/admin/groups/${groupId}`, group ? (group.name ?? groupId) : undefined, !!group);

  // Mutations
  const updateGroupMutation = useUpdateGroup();
  const addMemberMutation = useAddGroupMember();
  const updateMemberRoleMutation = useUpdateGroupMemberRole();
  const removeMemberMutation = useRemoveGroupMember();

  // Handlers (must be before any conditional returns - Rules of Hooks)
  const handleSaveChanges = useCallback(async (updates: {
    name?: string;
    description?: string;
    color?: string;
    isActive?: boolean;
  }) => {
    try {
      await updateGroupMutation.mutateAsync({
        id: groupId,
        updates,
      });
      toast.success('Group updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update group');
      throw error;
    }
  }, [groupId, updateGroupMutation]);

  const handleAddMember = useCallback(async (userId: string, role: 'member' | 'lead' | 'manager') => {
    try {
      await addMemberMutation.mutateAsync({
        groupId,
        userId,
        role,
      });
      toast.success('Member added to group successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add member');
      throw error;
    }
  }, [groupId, addMemberMutation]);

  const handleUpdateRole = useCallback(async (memberGroupId: string, memberUserId: string, role: 'member' | 'lead' | 'manager') => {
    try {
      await updateMemberRoleMutation.mutateAsync({
        groupId: memberGroupId,
        userId: memberUserId,
        role,
      });
      toast.success('Member role updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update member role');
      throw error;
    }
  }, [updateMemberRoleMutation]);

  const handleRemoveMember = useCallback(async (memberGroupId: string, memberUserId: string, memberName: string) => {
    const confirmed = await confirm.confirm({
      title: 'Remove Member',
      description: `Are you sure you want to remove ${memberName} from this group?`,
      confirmLabel: 'Remove Member',
      variant: 'destructive',
    });

    if (!confirmed.confirmed) return;

    try {
      await removeMemberMutation.mutateAsync({
        groupId: memberGroupId,
        userId: memberUserId,
      });
      toast.success('Member removed from group successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
      throw error;
    }
  }, [confirm, removeMemberMutation]);

  const handleTabChange = useCallback((newTab: 'members' | 'settings' | 'activity') => {
    navigate({
      to: '/admin/groups/$groupId',
      params: { groupId },
      search: { tab: newTab },
    });
  }, [navigate, groupId]);

  // Show loading state
  if (isLoadingGroup || isLoadingMembers || isLoadingUsers) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Handle errors
  if (groupError || membersError || usersError) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <div className="text-center text-red-600">
            Failed to load group data. Please try again.
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <GroupDetailPagePresenter
      group={group!}
      members={membersData?.items ?? []}
      users={usersData?.items ?? []}
      tab={tab}
      groupId={groupId}
      updateGroupMutation={updateGroupMutation}
      addMemberMutation={addMemberMutation}
      updateMemberRoleMutation={updateMemberRoleMutation}
      removeMemberMutation={removeMemberMutation}
      onSaveChanges={handleSaveChanges}
      onAddMember={handleAddMember}
      onUpdateRole={handleUpdateRole}
      onRemoveMember={handleRemoveMember}
      onTabChange={handleTabChange}
    />
  );
}
