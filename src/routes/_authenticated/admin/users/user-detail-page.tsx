/**
 * User Detail Page Component
 *
 * Displays detailed user information with tabs for profile, groups, and activity.
 * Allows editing user details, role, and status.
 *
 * @see src/hooks/users/use-users.ts for TanStack Query hooks
 */
import { useNavigate, useRouteContext, Link } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import {
  useUser,
  useUserActivity,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
  useTransferOwnership,
} from '@/hooks/users/use-users';
import { useQueryClient } from '@tanstack/react-query';
import { useGroups, useAddGroupMember } from '@/hooks/users/use-groups';
import { queryKeys } from '@/lib/query-keys';
import { useConfirmation } from '@/hooks';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { Route } from './$userId';
import type { UserWithGroups } from '@/lib/schemas/users';
import { userRoleSchema, userStatusSchema } from '@/lib/schemas/auth';
import type { z } from 'zod';

type UserRole = z.infer<typeof userRoleSchema>;
type UserStatus = z.infer<typeof userStatusSchema>;

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Loader2, X, Clock, Users } from 'lucide-react';
import { DataTableEmpty } from '@/components/shared/data-table';
import { toast } from '@/hooks';
import { EntityHeader, type EntityHeaderAction } from '@/components/shared';
import { USER_STATUS_ENTITY_CONFIG } from './users-status-config';

// ============================================================================
// TYPES
// ============================================================================

// Types imported from schemas (single source of truth per SCHEMA-TRACE.md)
import type { ActivityResult } from '@/lib/schemas/users';

// ============================================================================
// CONSTANTS
// ============================================================================

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

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

/**
 * User detail container - handles data fetching
 * @source user from useUser hook
 * @source activity from useUserActivity hook
 */
export default function UserDetailPage() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const activeTab = search.tab || 'profile';

  // Fetch user and activity data
  const { data: user, isLoading: isLoadingUser, error: userError } = useUser(userId);
  const { data: activity, isLoading: isLoadingActivity } = useUserActivity(userId);
  useDetailBreadcrumb(
    `/admin/users/${userId}`,
    user ? (user.name ?? user.email ?? userId) : undefined,
    !!user
  );

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Show error state if user fetch failed
  if (userError || !user) {
    return (
      <RouteErrorFallback
        error={userError || new Error('User not found')}
        parentRoute="/admin/users"
      />
    );
  }

  return (
    <UserDetailPresenter
      key={user.id}
      user={user as UserWithGroups}
      activity={activity as ActivityResult | undefined}
      isLoadingActivity={isLoadingActivity}
      userId={userId}
      activeTab={activeTab}
    />
  );
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

interface UserDetailPresenterProps {
  user: UserWithGroups;
  activity?: ActivityResult;
  isLoadingActivity: boolean;
  userId: string;
  activeTab: Tab;
}

function UserDetailPresenter({
  user,
  activity,
  isLoadingActivity,
  userId,
  activeTab,
}: UserDetailPresenterProps) {
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const queryClient = useQueryClient();

  // Groups tab: Add to group dialog
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const addGroupMemberMutation = useAddGroupMember();
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupRole, setSelectedGroupRole] = useState<'member' | 'lead' | 'manager'>('member');

  const userGroupIds = new Set(user.groups.map((g) => g.groupId));
  const availableGroups = (groupsData?.items ?? []).filter(
    (g) => !userGroupIds.has(g.id) && g.isActive
  );

  const handleAddToGroup = async () => {
    if (!selectedGroupId) return;
    try {
      await addGroupMemberMutation.mutateAsync({
        groupId: selectedGroupId,
        userId,
        role: selectedGroupRole,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      toast.success('User added to group successfully');
      setIsAddToGroupOpen(false);
      setSelectedGroupId('');
      setSelectedGroupRole('member');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add user to group');
    }
  };

  // Get mutations
  const updateUserMutation = useUpdateUser();
  const deactivateUserMutation = useDeactivateUser();
  const reactivateUserMutation = useReactivateUser();
  const transferOwnershipMutation = useTransferOwnership();

  // Get current user's role from route context (undefined during SSR)
  const context = useRouteContext({ from: '/_authenticated' }) as
    | { appUser: { id: string; role: string; organizationId: string; status: string } }
    | undefined;
  const appUser = context?.appUser;
  const currentUserIsOwner = appUser?.role === 'owner';

  // Tab navigation via URL search params
  const handleTabChange = useCallback(
    (tab: Tab) => {
      navigate({ to: '/admin/users/$userId', params: { userId }, search: { tab } });
    },
    [navigate, userId],
  );

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state (reset via key={user.id} on presenter when user changes)
  const [editName, setEditName] = useState(user.name ?? '');
  const [editRole, setEditRole] = useState<UserRole>(user.role as UserRole);
  const [editStatus, setEditStatus] = useState<UserStatus>(user.status as UserStatus);

  const isOwner = user.role === 'owner';
  const isLoading =
    updateUserMutation.isPending ||
    deactivateUserMutation.isPending ||
    reactivateUserMutation.isPending ||
    transferOwnershipMutation.isPending;

  const handleSave = async () => {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        name: editName || undefined,
        role: editRole !== user.role ? editRole : undefined,
        status: editStatus !== user.status ? editStatus : undefined,
      });
      setMessage({ type: 'success', text: 'User updated successfully' });
      setIsEditing(false);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update user',
      });
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

    try {
      await deactivateUserMutation.mutateAsync(userId);
      setMessage({ type: 'success', text: 'User deactivated successfully' });
      navigate({ to: '/admin/users' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to deactivate user',
      });
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateUserMutation.mutateAsync(userId);
      setMessage({ type: 'success', text: 'User reactivated successfully' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reactivate user',
      });
    }
  };

  const handleTransferOwnership = async () => {
    const result = await confirm.confirm({
      title: 'Transfer Ownership',
      description: `Are you sure you want to transfer ownership to ${user.name ?? user.email}? You will become an admin and lose owner privileges. This action cannot be undone without the new owner's consent.`,
      confirmLabel: 'Transfer Ownership',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!result.confirmed) return;

    try {
      await transferOwnershipMutation.mutateAsync(userId);
      setMessage({
        type: 'success',
        text: 'Ownership transferred successfully. You are now an admin.',
      });
      navigate({ to: '/admin/users' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to transfer ownership',
      });
    }
  };

  // Can transfer ownership if: current user is owner, viewing a non-owner, active user, and not self
  const canTransferOwnership =
    currentUserIsOwner && !isOwner && user.status === 'active' && appUser?.id !== userId;

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(user.name ?? '');
    setEditRole(user.role as UserRole);
    setEditStatus(user.status as UserStatus);
  };

  // Build secondary actions for EntityHeader dropdown
  const secondaryActions: EntityHeaderAction[] = [
    ...(isEditing
      ? [{ label: 'Cancel', onClick: handleCancelEdit }]
      : []),
    ...(canTransferOwnership
      ? [{ label: 'Make Owner', onClick: handleTransferOwnership, disabled: isLoading }]
      : []),
    ...(!isOwner && user.status !== 'deactivated'
      ? [{ label: 'Deactivate', onClick: handleDeactivate, destructive: true as const, disabled: isLoading }]
      : []),
  ];

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="space-y-6">
      {/* Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription className="flex items-center justify-between">
            <span>{message.text}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMessage(null)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Zone 1: EntityHeader per DETAIL-VIEW-STANDARDS */}
      <EntityHeader
        name={user.name ?? user.email ?? 'No name'}
        subtitle={user.email}
        avatarUrl={user.profile?.avatarUrl ?? null}
        avatarFallback={(user.name ?? user.email).charAt(0).toUpperCase()}
        status={{
          value: user.status,
          config: USER_STATUS_ENTITY_CONFIG,
        }}
        typeBadge={
          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        }
        primaryAction={
          user.status === 'deactivated'
            ? { label: 'Reactivate User', onClick: handleReactivate, disabled: isLoading }
            : isEditing
              ? {
                  label: 'Save Changes',
                  onClick: handleSave,
                  disabled: isLoading,
                }
              : !isOwner
                ? { label: 'Edit', onClick: () => setIsEditing(true) }
                : undefined
        }
        secondaryActions={secondaryActions}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as Tab)}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardContent className="space-y-6 p-6">
              {/* Name */}
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                  />
                ) : (
                  <p className="text-sm">{user.name ?? 'Not set'}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm">{user.email}</p>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>Role</Label>
                {isEditing && !isOwner ? (
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm capitalize">{user.role}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing && !isOwner && user.status !== 'deactivated' ? (
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as UserStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm capitalize">{user.status}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type</Label>
                <p className="text-sm capitalize">{user.type ?? 'Not set'}</p>
              </div>

              {/* Created */}
              <div className="space-y-2">
                <Label>Created</Label>
                <p className="text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups">
          <Card>
            <CardContent className="p-6">
              {user.groups.length === 0 ? (
                <DataTableEmpty
                  variant="empty"
                  icon={Users}
                  title="Not a member of any groups"
                  description="Add this user to a group to organize team access."
                  action={{
                    label: availableGroups.length > 0 ? 'Add to group' : 'Browse groups',
                    onClick: () =>
                      availableGroups.length > 0
                        ? setIsAddToGroupOpen(true)
                        : navigate({ to: '/admin/groups' }),
                  }}
                />
              ) : (
                <ul className="divide-y">
                  {user.groups.map((group) => (
                    <li key={group.groupId} className="flex items-center justify-between py-4">
                      <div>
                        <Link
                          to="/admin/groups/$groupId"
                          params={{ groupId: group.groupId }}
                          className="text-sm font-medium hover:underline"
                        >
                          {group.groupName}
                        </Link>
                        <p className="text-muted-foreground text-sm capitalize">Role: {group.role}</p>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Joined {new Date(group.joinedAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : !activity || activity.items.length === 0 ? (
                <DataTableEmpty
                  variant="empty"
                  icon={Clock}
                  title="No recent activity"
                  description="Activity for this user will appear here as they use the system."
                />
              ) : (
                <ul className="space-y-4">
                  {activity.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-4">
                      <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                        <Clock className="text-muted-foreground h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{item.action}</span> on{' '}
                          <span className="text-muted-foreground">{item.entityType}</span>
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add to Group Dialog */}
      <Dialog open={isAddToGroupOpen} onOpenChange={createPendingDialogOpenChangeHandler(addGroupMemberMutation.isPending, setIsAddToGroupOpen)}>
        <DialogContent
          onEscapeKeyDown={createPendingDialogInteractionGuards(addGroupMemberMutation.isPending).onEscapeKeyDown}
          onInteractOutside={createPendingDialogInteractionGuards(addGroupMemberMutation.isPending).onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Add to Group</DialogTitle>
            <DialogDescription>
              Select a group and role to add {user.name ?? user.email} to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Group</Label>
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Role in Group</Label>
              <Select
                value={selectedGroupRole}
                onValueChange={(v) => setSelectedGroupRole(v as 'member' | 'lead' | 'manager')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToGroup}
              disabled={!selectedGroupId || addGroupMemberMutation.isPending}
            >
              {addGroupMemberMutation.isPending ? 'Adding...' : 'Add to Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageLayout.Content>
    </PageLayout>
  );
}
