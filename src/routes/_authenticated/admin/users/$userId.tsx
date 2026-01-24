/**
 * User Detail Route
 *
 * Displays detailed user information with tabs for profile, groups, and activity.
 * Allows editing user details, role, and status.
 *
 * @see src/server/functions/users.ts for server functions
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  getUser,
  updateUser,
  deactivateUser,
  reactivateUser,
} from '@/server/functions/users/users';
import { getUserActivity } from '@/server/functions/_shared/audit-logs';
import { useConfirmation } from '@/hooks/use-confirmation';

// Explicit types for loader data to avoid inference issues
interface UserGroup {
  groupId: string;
  groupName: string;
  role: 'member' | 'lead' | 'manager';
  joinedAt: Date;
}

type UserRole = 'owner' | 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
type UserStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

interface UserWithGroups {
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
  groups: UserGroup[];
}

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  timestamp: Date;
}

interface ActivityResult {
  items: ActivityItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

import { RouteErrorFallback } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';

export const Route = createFileRoute('/_authenticated/admin/users/$userId')({
  loader: (async ({ params }: { params: { userId: string } }) => {
    const [user, activity] = await Promise.all([
      getUser({ data: { id: params.userId } }),
      getUserActivity({ data: { userId: params.userId, page: 1, pageSize: 10 } }),
    ]);
    return { user, activity };
  }) as never,
  component: UserDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/users" />
  ),
  pendingComponent: () => (
    <div className="p-6">
      <AdminDetailSkeleton />
    </div>
  ),
});

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'manager', label: 'Manager', description: 'Team management and approvals' },
  { value: 'sales', label: 'Sales', description: 'Customer and pipeline access' },
  { value: 'operations', label: 'Operations', description: 'Order and inventory management' },
  { value: 'support', label: 'Support', description: 'Customer support access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800' },
];

type Tab = 'profile' | 'groups' | 'activity';

function UserDetailPage() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData() as { user: UserWithGroups; activity: ActivityResult };
  const user = loaderData.user;
  const activity = loaderData.activity;
  const { userId } = Route.useParams();

  const updateFn = useServerFn(updateUser);
  const deactivateFn = useServerFn(deactivateUser);
  const reactivateFn = useServerFn(reactivateUser);

  const confirm = useConfirmation();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [editName, setEditName] = useState(user.name ?? '');
  const [editRole, setEditRole] = useState(user.role);
  const [editStatus, setEditStatus] = useState(user.status);

  const isOwner = user.role === 'owner';

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateFn({
        data: {
          id: userId,
          name: editName || undefined,
          role: editRole !== user.role ? editRole : undefined,
          status: editStatus !== user.status ? editStatus : undefined,
        },
      });
      setMessage({ type: 'success', text: 'User updated successfully' });
      setIsEditing(false);
      // Reload to get fresh data
      navigate({ to: '.', replace: true });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update user',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    const result = await confirm.confirm({
      title: 'Deactivate User',
      description:
        'Are you sure you want to deactivate this user? They will lose access to the system. They can be reactivated later.',
      confirmLabel: 'Deactivate User',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!result.confirmed) return;

    setIsLoading(true);
    try {
      await deactivateFn({ data: { id: userId } });
      setMessage({ type: 'success', text: 'User deactivated successfully' });
      navigate({ to: '/admin/users' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to deactivate user',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      await reactivateFn({ data: { id: userId } });
      setMessage({ type: 'success', text: 'User reactivated successfully' });
      navigate({ to: '.', replace: true });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reactivate user',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-700">
              Users
            </Link>
          </li>
          <li>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900">{user.name ?? user.email}</span>
          </li>
        </ol>
      </nav>

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

      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-300 text-2xl font-medium text-gray-600">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name ?? 'No name'}</h1>
              <p className="text-gray-500">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    user.role === 'owner'
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {user.role}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : user.status === 'deactivated'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {user.status === 'deactivated' ? (
              <button
                onClick={handleReactivate}
                disabled={isLoading}
                className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Reactivate User
              </button>
            ) : (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={isOwner}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.name ?? '');
                        setEditRole(user.role);
                        setEditStatus(user.status);
                      }}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </>
                )}
                {!isOwner && (
                  <button
                    onClick={handleDeactivate}
                    disabled={isLoading}
                    className="inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['profile', 'groups', 'activity'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg bg-white shadow">
        {activeTab === 'profile' && (
          <div className="space-y-6 p-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{user.name ?? 'Not set'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              {isEditing && !isOwner ? (
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              {isEditing && !isOwner && user.status !== 'deactivated' ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900 capitalize">{user.status}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{user.type ?? 'Not set'}</p>
            </div>

            {/* Created */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="p-6">
            {user.groups.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Not a member of any groups</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {user.groups.map((group) => (
                  <li key={group.groupId} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{group.groupName}</p>
                      <p className="text-sm text-gray-500 capitalize">Role: {group.role}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(group.joinedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="p-6">
            {activity.items.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No recent activity</p>
            ) : (
              <ul className="space-y-4">
                {activity.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{item.action}</span> on{' '}
                        <span className="text-gray-600">{item.entityType}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
