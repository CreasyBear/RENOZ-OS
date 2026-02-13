/**
 * Users Admin Page Container Component
 *
 * Handles data fetching and mutations for user management page.
 *
 * @source users from useUsers hook
 * @source stats from useUserStats hook
 * @source mutations from useDeactivateUser, useReactivateUser, useBulkUpdateUsers, useExportUsers hooks
 *
 * @see src/routes/_authenticated/admin/users/users-page.tsx - Presenter component
 */
import { useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useConfirmation, toastSuccess, toastError } from '@/hooks';
import { confirmations } from '@/hooks/_shared/use-confirmation';
import {
  useUsers,
  useUserStats,
  useDeactivateUser,
  useReactivateUser,
  useBulkUpdateUsers,
  useExportUsers,
} from '@/hooks/users/use-users';
import { useTableSelection } from '@/components/shared/data-table';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Route } from './index';
import UsersAdminPagePresenter from './users-page';
import {
  DEFAULT_USERS_FILTERS,
  type UsersFiltersState,
} from './users-filter-config';

export default function UsersAdminPageContainer() {
  const search = Route.useSearch();
  const confirm = useConfirmation();
  const navigate = useNavigate();

  // Map route search params to filters state for DomainFilterBar
  const filters: UsersFiltersState = {
    search: search.search ?? '',
    role: search.role ?? null,
    status: search.status ?? null,
  };

  // Data fetching hooks
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useUsers(search);
  const { data: statsData, isLoading: isLoadingStats, error: statsError } = useUserStats();

  // Table selection (items available after load)
  const usersList = useMemo(
    () => usersData?.items ?? [],
    [usersData?.items]
  );
  const {
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
    lastClickedIndex,
    setLastClickedIndex,
  } = useTableSelection({ items: usersList });

  // Mutation hooks
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const bulkUpdateMutation = useBulkUpdateUsers();
  const exportMutation = useExportUsers();

  // Combined loading state for mutations
  const isLoading =
    deactivateMutation.isPending ||
    reactivateMutation.isPending ||
    bulkUpdateMutation.isPending ||
    exportMutation.isPending;

  // Extract data with defaults
  const users = usersData ?? { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
  const stats = statsData ?? { totalUsers: 0, byStatus: {}, byRole: {} };

  // Navigate to update search params (direct search object per STANDARDS.md)
  const updateSearch = useCallback(
    (updates: Partial<typeof search>) => {
      navigate({
        to: '/admin/users',
        search: {
          ...search,
          ...updates,
          page: updates.page ?? search.page ?? 1,
        },
        replace: true,
      });
    },
    [navigate, search]
  );

  // Handle filter changes from DomainFilterBar (resets page to 1)
  const handleFiltersChange = useCallback(
    (nextFilters: UsersFiltersState) => {
      clearSelection();
      navigate({
        to: '/admin/users',
        search: {
          ...search,
          search: nextFilters.search || undefined,
          role: nextFilters.role ?? undefined,
          status: nextFilters.status ?? undefined,
          page: 1,
        },
        replace: true,
      });
    },
    [navigate, search, clearSelection]
  );

  // Handle deactivate
  const handleDeactivate = useCallback(
    async (userId: string) => {
      const user = usersList.find((u) => u.id === userId);
      const userName = user?.name ?? user?.email ?? 'this user';
      const { confirmed } = await confirm.confirm(
        confirmations.deactivate(userName, 'user')
      );
      if (!confirmed) return;

      deactivateMutation.mutate(userId, {
        onSuccess: () => {
          toastSuccess('User deactivated', {
            action: {
              label: 'View Users',
              onClick: () => navigate({ to: '/admin/users' }),
            },
          });
        },
        onError: (err) => {
          toastError(err instanceof Error ? err.message : 'Failed to deactivate user');
        },
      });
    },
    [confirm, deactivateMutation, usersList, navigate]
  );

  // Handle reactivate
  const handleReactivate = useCallback((userId: string) => {
    reactivateMutation.mutate(userId, {
      onSuccess: () => {
        toastSuccess('User reactivated successfully');
      },
      onError: (err) => {
        toastError(err instanceof Error ? err.message : 'Failed to reactivate user');
      },
    });
  }, [reactivateMutation]);

  // Wrap selection handlers for shift-click (orders pattern)
  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = usersList.findIndex((u) => u.id === id);
      if (idx !== -1) setLastClickedIndex(idx);
    },
    [handleSelect, usersList, setLastClickedIndex]
  );

  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  // Handle bulk role change
  const handleBulkRoleChange = useCallback(
    async (role: string, selectedUsers: Set<string>) => {
      if (selectedUsers.size === 0) return;

      const confirmed = await confirm.confirm({
        title: 'Change User Roles',
        description: `Change role to ${role} for ${selectedUsers.size} user(s)? This will update their permissions.`,
        confirmLabel: 'Change Roles',
      });

      if (!confirmed.confirmed) return;

      bulkUpdateMutation.mutate(
        {
          userIds: Array.from(selectedUsers),
          updates: {
            role: role as 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer',
          },
        },
        {
          onSuccess: (result) => {
            toastSuccess(
              `Updated ${result.updated} user(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
              {
                action: {
                  label: 'View Users',
                  onClick: () => navigate({ to: '/admin/users' }),
                },
              }
            );
            clearSelection();
          },
          onError: (err) => {
            toastError(err instanceof Error ? err.message : 'Bulk update failed');
          },
        }
      );
    },
    [confirm, bulkUpdateMutation, clearSelection, navigate]
  );

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'json', selectedUsers: Set<string>) => {
    exportMutation.mutate(
      {
        format,
        userIds: selectedUsers.size > 0 ? Array.from(selectedUsers) : undefined,
      },
      {
        onSuccess: (result) => {
          // Download file
          const blob = new Blob([result.content], {
            type: format === 'csv' ? 'text/csv' : 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `users-export-${new Date().toISOString().split('T')[0]}.${format}`;
          a.click();
          URL.revokeObjectURL(url);

          toastSuccess(`Exported ${result.count} user(s)`);
        },
        onError: (err) => {
          toastError(err instanceof Error ? err.message : 'Export failed');
        },
      }
    );
  }, [exportMutation]);

  const handleViewUser = useCallback(
    (userId: string) => {
      navigate({ to: '/admin/users/$userId', params: { userId } });
    },
    [navigate]
  );

  const handleNavigateToInvite = useCallback(
    () =>
      navigate({
        to: '/admin/invitations',
        search: { page: 1, pageSize: 20, status: 'all' },
      }),
    [navigate]
  );

  const handleClearFilters = useCallback(
    () => handleFiltersChange(DEFAULT_USERS_FILTERS),
    [handleFiltersChange]
  );

  // Handle loading state
  if (isLoadingUsers || isLoadingStats) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Handle error state
  if (usersError || statsError) {
    return (
      <RouteErrorFallback
        error={usersError || statsError || new Error('Unknown error')}
        parentRoute="/admin"
      />
    );
  }

  return (
    <UsersAdminPagePresenter
      users={users}
      stats={stats}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      search={{ page: search.page, pageSize: search.pageSize, sortBy: search.sortBy, sortOrder: search.sortOrder }}
      isLoading={isLoading}
      onUpdateSearch={updateSearch}
      onDeactivate={handleDeactivate}
      onReactivate={handleReactivate}
      onBulkRoleChange={handleBulkRoleChange}
      onExport={handleExport}
      onViewUser={handleViewUser}
      onNavigateToInvite={handleNavigateToInvite}
      onClearFilters={handleClearFilters}
      selectedIds={selectedIds}
      isAllSelected={isAllSelected}
      isPartiallySelected={isPartiallySelected}
      onSelect={handleSelectWithIndex}
      onSelectAll={handleSelectAll}
      onShiftClickRange={handleShiftClickRangeWithIndex}
      isSelected={isSelected}
      clearSelection={clearSelection}
    />
  );
}
