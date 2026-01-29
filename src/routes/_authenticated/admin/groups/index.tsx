/**
 * Team Groups Administration Index Route
 *
 * Displays all user groups in a card grid with member counts and management actions.
 * Supports creating, editing, and deleting groups.
 *
 * @see src/server/functions/user-groups.ts for server functions
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listGroups, createGroup, deleteGroup } from '@/server/functions/users/user-groups';
import { z } from 'zod';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useConfirmation } from '@/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Settings,
} from 'lucide-react';

// Types
interface GroupItem {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
  memberCount: number;
}

interface GroupsData {
  items: GroupItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Search params
const groupSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(24),
  includeInactive: z.coerce.boolean().default(false),
});

import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminCardGridSkeleton } from '@/components/skeletons/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute('/_authenticated/admin/groups/' as any)({
  validateSearch: groupSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const groupsData = await listGroups({ data: deps });
    return { groups: groupsData };
  },
  component: GroupsAdminPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminCardGridSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// Default group colors
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

function GroupsAdminPage() {
  const confirm = useConfirmation();
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData() as { groups: GroupsData };
  const groups = loaderData.groups;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);

  // Server functions
  const createGroupFn = useServerFn(createGroup);
  const deleteGroupFn = useServerFn(deleteGroup);

  // Filter groups by search query
  const filteredGroups = groups.items.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    setIsSubmitting(true);
    try {
      await createGroupFn({
        data: {
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
          color: newGroupColor,
        },
      });
      setIsCreateDialogOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor(GROUP_COLORS[0]);
      // Invalidate and refetch by navigating to same route
      navigate({ to: '/admin/groups' });
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group: GroupItem) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Group',
      description: `Are you sure you want to delete the group "${group.name}"? This will remove the group but users will remain.`,
      confirmLabel: 'Delete Group',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      setIsSubmitting(true);
      try {
        await deleteGroupFn({ data: { id: group.id } });
        navigate({ to: '/admin/groups' });
      } catch (error) {
        console.error('Failed to delete group:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams & Groups</h1>
          <p className="text-muted-foreground">
            Organize users into teams for collaboration and access control.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a team or group to organize users and manage access.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sales Team"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description for this group..."
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        newGroupColor === color
                          ? 'border-primary scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewGroupColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search groups..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="secondary">
          {groups.pagination.totalItems} group{groups.pagination.totalItems !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Users className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="text-lg font-medium">No groups found</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-center">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first group to organize team members.'}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGroups.map((group) => (
            <GroupCard key={group.id} group={group} onDelete={() => handleDeleteGroup(group)} />
          ))}
        </div>
      )}
      </PageLayout.Content>
    </PageLayout>
  );
}

// Group Card Component
function GroupCard({ group, onDelete }: { group: GroupItem; onDelete: () => void }) {
  const navigate = useNavigate();

  const handleNavigate = (groupId: string, tab?: 'members' | 'settings' | 'activity') => {
    navigate({
      to: '/admin/groups/$groupId',
      params: { groupId },
      search: tab ? { tab } : undefined,
    });
  };

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Color bar */}
      <div
        className="absolute top-0 right-0 left-0 h-1"
        style={{ backgroundColor: group.color || '#6B7280' }}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: group.color || '#6B7280' }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="line-clamp-1 text-base">{group.name}</CardTitle>
              {!group.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleNavigate(group.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate(group.id, 'members')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate(group.id, 'settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {group.description ? (
          <CardDescription className="line-clamp-2">{group.description}</CardDescription>
        ) : (
          <CardDescription className="italic">No description</CardDescription>
        )}
      </CardContent>

      <CardFooter className="border-t pt-2">
        <Link
          to={`/admin/groups/${group.id}` as '/admin/users'}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <Users className="h-4 w-4" />
          <span>
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          </span>
        </Link>
      </CardFooter>
    </Card>
  );
}
