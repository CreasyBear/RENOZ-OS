/**
 * User Administration Page Presenter Component
 *
 * Pure UI component for user management page.
 * Receives all data and handlers via props from container.
 *
 * @source users from users-page-container.tsx
 * @source stats from users-page-container.tsx
 * @see src/routes/_authenticated/admin/users/users-page-container.tsx - Container component
 */
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Users, UserCheck, Mail, UserX } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { MetricCard } from '@/components/shared';
import { DataTableEmpty } from '@/components/shared/data-table';
import { FilterEmptyState } from '@/components/shared/filter-empty-state';
import {
  DomainFilterBar,
  buildFilterItems,
  countActiveFilters,
} from '@/components/shared/filters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UsersTablePresenter } from './users-table-presenter';
import type { UserTableItem } from '@/lib/schemas/users';
import {
  USERS_FILTER_CONFIG,
  DEFAULT_USERS_FILTERS,
  type UsersFiltersState,
} from './users-filter-config';

// ============================================================================
// PRESENTER PROPS INTERFACE
// ============================================================================

interface UsersAdminPagePresenterProps {
  /** @source useUsers hook in users-page-container.tsx */
  users: {
    items: UserTableItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
  /** @source useUserStats hook in users-page-container.tsx */
  stats: {
    totalUsers: number;
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
  };
  /** Filters state for DomainFilterBar */
  filters: UsersFiltersState;
  /** Filter change handler */
  onFiltersChange: (filters: UsersFiltersState) => void;
  /** Search params from route (page, pageSize, sort) */
  search: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  /** Loading state for mutations */
  isLoading: boolean;
  /** Update search params handler (pagination, sort) */
  onUpdateSearch: (updates: Partial<{ page: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }>) => void;
  /** Deactivate user handler */
  onDeactivate: (userId: string) => void;
  /** Reactivate user handler */
  onReactivate: (userId: string) => void;
  /** Bulk role change handler */
  onBulkRoleChange: (role: string, selectedUsers: Set<string>) => void;
  /** Export handler */
  onExport: (format: 'csv' | 'json', selectedUsers: Set<string>) => void;
  /** Navigate to user detail */
  onViewUser: (userId: string) => void;
  /** Navigate to invite user (for empty state CTA) */
  onNavigateToInvite: () => void;
  /** Clear all filters (for filter-empty state) */
  onClearFilters: () => void;
  /** Selection state from useTableSelection */
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

const BULK_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'support', label: 'Support' },
  { value: 'viewer', label: 'Viewer' },
] as const;

export default function UsersAdminPagePresenter({
  users,
  stats,
  filters,
  onFiltersChange,
  search,
  isLoading,
  onUpdateSearch,
  onDeactivate,
  onReactivate,
  onBulkRoleChange,
  onExport,
  onViewUser,
  onNavigateToInvite,
  onClearFilters,
  selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  clearSelection,
}: UsersAdminPagePresenterProps) {
  const [bulkRoleSelect, setBulkRoleSelect] = useState('');

  // Sort state for server-side sorting
  const sortField = search.sortBy ?? 'name';
  const sortDirection = search.sortOrder ?? 'asc';

  const handleSort = (field: string) => {
    onUpdateSearch({
      sortBy: field,
      sortOrder:
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc',
    });
  };

  const hasActiveFilters = useMemo(
    () => countActiveFilters(filters, ['search']) > 0,
    [filters]
  );

  const filterItems = useMemo(
    () =>
      buildFilterItems({
        filters,
        config: USERS_FILTER_CONFIG,
        defaultFilters: DEFAULT_USERS_FILTERS,
        onFiltersChange,
        excludeKeys: ['search'],
      }),
    [filters, onFiltersChange]
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, roles, and permissions for your organization
          </p>
        </div>
        <Link
          to="/admin/invitations"
          search={{ page: 1, pageSize: 20, status: 'all' }}
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        >
          Invite User
        </Link>
      </div>

      {/* Stats Cards - Using MetricCard per METRIC-CARD-STANDARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconClassName="text-gray-600"
        />
        <MetricCard
          title="Active"
          value={stats.byStatus?.active ?? 0}
          icon={UserCheck}
          iconClassName="text-emerald-600"
        />
        <MetricCard
          title="Pending Invites"
          value={stats.byStatus?.invited ?? 0}
          icon={Mail}
          iconClassName="text-blue-600"
        />
        <MetricCard
          title="Deactivated"
          value={stats.byStatus?.deactivated ?? 0}
          icon={UserX}
          iconClassName="text-red-600"
        />
      </div>

      {/* Filters - Using DomainFilterBar per FILTER-STANDARDS */}
      <div className="rounded-lg bg-white p-4 shadow">
        <DomainFilterBar<UsersFiltersState>
          config={USERS_FILTER_CONFIG}
          filters={filters}
          onFiltersChange={onFiltersChange}
          defaultFilters={DEFAULT_USERS_FILTERS}
          resultCount={users.pagination.totalItems}
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.size >= 2 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} user(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={bulkRoleSelect || '__placeholder__'}
              onValueChange={(value) => {
                if (value && value !== '__placeholder__') {
                  onBulkRoleChange(value, selectedIds);
                  setBulkRoleSelect('');
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="h-8 w-[140px] rounded-md border-indigo-300">
                <SelectValue placeholder="Change Role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>
                  Change Role...
                </SelectItem>
                {BULK_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => onExport('csv', selectedIds)}
              disabled={isLoading}
              className="rounded-md border border-indigo-300 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-100"
            >
              Export CSV
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {users.items.length === 0 ? (
          <div className="px-6 py-12">
            {hasActiveFilters && filterItems.length > 0 ? (
              <FilterEmptyState
                entityName="users"
                filters={filterItems}
                onClearAll={onClearFilters}
              />
            ) : (
              <DataTableEmpty
                variant="empty"
                icon={Users}
                title="No users yet"
                description={
                  users.pagination.totalItems === 0
                    ? 'Invite your first user to get started with your organization.'
                    : 'No users match your current search or filters.'
                }
                action={{
                  label: 'Invite User',
                  onClick: onNavigateToInvite,
                }}
              />
            )}
          </div>
        ) : (
          <UsersTablePresenter
            users={users.items}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isPartiallySelected={isPartiallySelected}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            onShiftClickRange={onShiftClickRange}
            isSelected={isSelected}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onViewUser={onViewUser}
            onDeactivate={onDeactivate}
            onReactivate={onReactivate}
            isLoading={isLoading}
          />
        )}

        {/* Pagination */}
        {users.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => onUpdateSearch({ page: search.page - 1 })}
                disabled={search.page <= 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => onUpdateSearch({ page: search.page + 1 })}
                disabled={search.page >= users.pagination.totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(search.page - 1) * search.pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(search.page * search.pageSize, users.pagination.totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{users.pagination.totalItems}</span> results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => onUpdateSearch({ page: search.page - 1 })}
                    disabled={search.page <= 1}
                    className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                    Page {search.page} of {users.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => onUpdateSearch({ page: search.page + 1 })}
                    disabled={search.page >= users.pagination.totalPages}
                    className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export All Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => onExport('csv', selectedIds)}
          disabled={isLoading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Export All (CSV)
        </button>
        <button
          onClick={() => onExport('json', selectedIds)}
          disabled={isLoading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Export All (JSON)
        </button>
      </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
