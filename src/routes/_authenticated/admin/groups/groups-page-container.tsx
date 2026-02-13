/**
 * Groups Page Container Component
 *
 * Handles data fetching and mutations for groups management page.
 *
 * @source groups from useGroups hook
 * @source mutations from useCreateGroup, useDeleteGroup hooks
 *
 * @see src/routes/_authenticated/admin/groups/groups-page.tsx - Presenter component
 */
import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useConfirmation, toast } from '@/hooks';
import { useGroups, useCreateGroup, useDeleteGroup } from '@/hooks/users';
import { PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Route } from './index';
import GroupsPagePresenter from './groups-page';

const GROUP_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export default function GroupsPageContainer() {
  const search = Route.useSearch();
  const confirm = useConfirmation();
  const navigate = useNavigate();

  // Data fetching hook
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useGroups({
    page: search.page,
    pageSize: search.pageSize,
    includeInactive: search.includeInactive,
  });

  // Mutation hooks
  const createGroupMutation = useCreateGroup();
  const deleteGroupMutation = useDeleteGroup();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);

  // Extract data with defaults
  const groups = groupsData ?? {
    items: [],
    pagination: { page: 1, pageSize: 24, totalItems: 0, totalPages: 0 },
  };

  // Filter groups by search query (in container)
  const filteredGroups = groups.items.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers (must be before any conditional returns - Rules of Hooks)
  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim()) return;

    try {
      await createGroupMutation.mutateAsync({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        color: newGroupColor,
      });
      toast.success('Group created successfully');
      setIsCreateDialogOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor(GROUP_COLORS[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
    }
  }, [newGroupName, newGroupDescription, newGroupColor, createGroupMutation]);

  const handleDeleteGroup = useCallback(async (groupId: string, groupName: string) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Group',
      description: `Are you sure you want to delete the group "${groupName}"? This will remove the group but users will remain.`,
      confirmLabel: 'Delete Group',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteGroupMutation.mutateAsync(groupId);
        toast.success('Group deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete group');
      }
    }
  }, [confirm, deleteGroupMutation]);

  // Helper to get group name by ID
  const getGroupName = useCallback((groupId: string) => {
    const group = groups.items.find((g) => g.id === groupId);
    return group?.name ?? '';
  }, [groups.items]);

  // Handle loading state
  if (isLoadingGroups) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Handle error state
  if (groupsError) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <div className="text-center text-red-600">
            Failed to load groups. Please try again.
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <GroupsPagePresenter
      filteredGroups={filteredGroups}
      totalGroups={groups.pagination.totalItems}
      searchQuery={searchQuery}
      isCreateDialogOpen={isCreateDialogOpen}
      newGroupName={newGroupName}
      newGroupDescription={newGroupDescription}
      newGroupColor={newGroupColor}
      createGroupMutation={createGroupMutation}
      onSearchQueryChange={setSearchQuery}
      onIsCreateDialogOpenChange={setIsCreateDialogOpen}
      onNewGroupNameChange={setNewGroupName}
      onNewGroupDescriptionChange={setNewGroupDescription}
      onNewGroupColorChange={setNewGroupColor}
      onCreateGroup={handleCreateGroup}
      onDeleteGroup={(groupId) => handleDeleteGroup(groupId, getGroupName(groupId))}
      onNavigate={navigate}
    />
  );
}
