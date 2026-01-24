/**
 * User Administration Index Route
 *
 * Lists all users in the organization with filtering, sorting, and bulk actions.
 * Provides access to user details, role management, and bulk operations.
 *
 * @see src/server/functions/users.ts for server functions
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  listUsers,
  deactivateUser,
  reactivateUser,
  bulkUpdateUsers,
  getUserStats,
  exportUsers,
} from '@/server/functions/users/users';
import { z } from 'zod';
import { useConfirmation } from '@/hooks/use-confirmation';

// Explicit types for loader data
type UserRole = 'owner' | 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
type UserStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

interface UserItem {
  id: string;
  authId: string;
  organizationId: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  type: string | null;
  profile: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UsersData {
  items: UserItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface StatsData {
  totalUsers: number;
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
}

// Search params for filtering
const userSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  search: z.string().optional(),
  role: z
    .enum(['owner', 'admin', 'manager', 'sales', 'operations', 'support', 'viewer'])
    .optional(),
  status: z.enum(['active', 'invited', 'suspended', 'deactivated']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const Route = createFileRoute('/_authenticated/admin/users/')({
  validateSearch: userSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [usersData, stats] = await Promise.all([listUsers({ data: deps }), getUserStats()]);
    return { users: usersData, stats };
  },
  component: UsersAdminPage,
});

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  sales: 'bg-green-100 text-green-800',
  operations: 'bg-yellow-100 text-yellow-800',
  support: 'bg-orange-100 text-orange-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  invited: 'bg-blue-100 text-blue-800',
  suspended: 'bg-red-100 text-red-800',
  deactivated: 'bg-gray-100 text-gray-800',
};

function UsersAdminPage() {
  const confirm = useConfirmation();
  const navigate = Route.useNavigate();
  const loaderData = Route.useLoaderData() as { users: UsersData; stats: StatsData };
  const users = loaderData.users;
  const stats = loaderData.stats;
  const search = Route.useSearch();

  const deactivateFn = useServerFn(deactivateUser);
  const reactivateFn = useServerFn(reactivateUser);
  const bulkUpdateFn = useServerFn(bulkUpdateUsers);
  const exportFn = useServerFn(exportUsers);

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState(search.search ?? '');

  // Update URL with new search params
  const updateSearch = useCallback(
    (updates: Partial<z.infer<typeof userSearchSchema>>) => {
      const newSearch = { ...search, ...updates, page: updates.page ?? 1 };
      navigate({
        to: '.',
        search: newSearch,
      });
    },
    [navigate, search]
  );

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch({ search: searchInput || undefined });
  };

  // Toggle user selection
  const toggleSelect = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Select all on page
  const selectAllOnPage = () => {
    if (selectedUsers.size === users.items.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.items.map((u) => u.id)));
    }
  };

  // Handle deactivate
  const handleDeactivate = async (userId: string) => {
    const confirmed = await confirm.confirm({
      title: 'Deactivate User',
      description:
        'Are you sure you want to deactivate this user? They will lose access to the system.',
      confirmLabel: 'Deactivate User',
      variant: 'destructive',
    });

    if (!confirmed.confirmed) return;

    setIsLoading(true);
    try {
      await deactivateFn({ data: { id: userId } });
      setMessage({ type: 'success', text: 'User deactivated successfully' });
      navigate({ to: '.', search: { ...search } });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to deactivate user',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reactivate
  const handleReactivate = async (userId: string) => {
    setIsLoading(true);
    try {
      await reactivateFn({ data: { id: userId } });
      setMessage({ type: 'success', text: 'User reactivated successfully' });
      navigate({ to: '.', search: { ...search } });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reactivate user',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk role change
  const handleBulkRoleChange = async (role: string) => {
    if (selectedUsers.size === 0) return;

    const confirmed = await confirm.confirm({
      title: 'Change User Roles',
      description: `Change role to ${role} for ${selectedUsers.size} user(s)? This will update their permissions.`,
      confirmLabel: 'Change Roles',
    });

    if (!confirmed.confirmed) return;

    setIsLoading(true);
    try {
      const result = await bulkUpdateFn({
        data: {
          userIds: Array.from(selectedUsers),
          updates: { role: role as any },
        },
      });
      setMessage({
        type: 'success',
        text: `Updated ${result.updated} user(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      });
      setSelectedUsers(new Set());
      navigate({ to: '.', search: { ...search } });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk update failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    setIsLoading(true);
    try {
      const result = await exportFn({
        data: {
          format,
          userIds: selectedUsers.size > 0 ? Array.from(selectedUsers) : undefined,
        },
      });

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

      setMessage({ type: 'success', text: `Exported ${result.count} user(s)` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Export failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, roles, and permissions for your organization
          </p>
        </div>
        <Link
          to="/admin/users/invite"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        >
          Invite User
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Total Users</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.totalUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Active</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.byStatus?.active ?? 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Pending Invites</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.byStatus?.invited ?? 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Deactivated</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.byStatus?.deactivated ?? 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`relative rounded px-4 py-3 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
          role="alert"
        >
          <span className="block sm:inline">{message.text}</span>
          <button
            className="absolute top-0 right-0 bottom-0 px-4 py-3"
            onClick={() => setMessage(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </form>

          {/* Role Filter */}
          <select
            value={search.role ?? ''}
            onChange={(e) => updateSearch({ role: e.target.value || undefined } as any)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
            <option value="support">Support</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Status Filter */}
          <select
            value={search.status ?? ''}
            onChange={(e) => updateSearch({ status: e.target.value || undefined } as any)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <span className="text-sm font-medium text-indigo-700">
            {selectedUsers.size} user(s) selected
          </span>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkRoleChange(e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded-md border border-indigo-300 px-3 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={isLoading}
            >
              <option value="">Change Role...</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="sales">Sales</option>
              <option value="operations">Operations</option>
              <option value="support">Support</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => handleExport('csv')}
              disabled={isLoading}
              className="rounded-md border border-indigo-300 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-100"
            >
              Export CSV
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.items.length && users.items.length > 0}
                  onChange={selectAllOnPage}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                onClick={() =>
                  updateSearch({
                    sortBy: 'name',
                    sortOrder:
                      search.sortBy === 'name' && search.sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
              >
                User
                {search.sortBy === 'name' && (
                  <span className="ml-1">{search.sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                onClick={() =>
                  updateSearch({
                    sortBy: 'role',
                    sortOrder:
                      search.sortBy === 'role' && search.sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
              >
                Role
                {search.sortBy === 'role' && (
                  <span className="ml-1">{search.sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                onClick={() =>
                  updateSearch({
                    sortBy: 'status',
                    sortOrder:
                      search.sortBy === 'status' && search.sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
              >
                Status
                {search.sortBy === 'status' && (
                  <span className="ml-1">{search.sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.items.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 font-medium text-gray-600">
                          {(user.name ?? user.email).charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name ?? 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[user.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: user.id } as any}
                        search={{} as any}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      {user.status === 'deactivated' ? (
                        <button
                          onClick={() => handleReactivate(user.id)}
                          disabled={isLoading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      ) : (
                        user.role !== 'owner' && (
                          <button
                            onClick={() => handleDeactivate(user.id)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {users.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => updateSearch({ page: search.page - 1 })}
                disabled={search.page <= 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => updateSearch({ page: search.page + 1 })}
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
                    onClick={() => updateSearch({ page: search.page - 1 })}
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
                    onClick={() => updateSearch({ page: search.page + 1 })}
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
          onClick={() => handleExport('csv')}
          disabled={isLoading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Export All (CSV)
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={isLoading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Export All (JSON)
        </button>
      </div>
    </div>
  );
}
