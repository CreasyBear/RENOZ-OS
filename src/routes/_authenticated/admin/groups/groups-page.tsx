/**
 * Groups Page Presenter Component
 *
 * Pure UI component for displaying user groups in a card grid.
 * Receives all data and handlers via props from container.
 *
 * @source data from groups-page-container.tsx
 * @see src/routes/_authenticated/admin/groups/groups-page-container.tsx - Container component
 */

import type { UseMutationResult } from '@tanstack/react-query';
import type { NavigateOptions } from '@tanstack/react-router';
import type { CreateGroup } from '@/lib/schemas/users';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLayout } from '@/components/layout';

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

// ============================================================================
// TYPES
// ============================================================================

interface GroupItem {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  memberCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

// ============================================================================
// PRESENTER PROPS INTERFACE
// ============================================================================

interface GroupsPagePresenterProps {
  /** @source useGroups hook in groups-page-container.tsx (filtered by search query) */
  filteredGroups: GroupItem[];
  /** @source groups.pagination.totalItems in groups-page-container.tsx */
  totalGroups: number;
  /** @source useState in groups-page-container.tsx */
  searchQuery: string;
  /** @source useState in groups-page-container.tsx */
  isCreateDialogOpen: boolean;
  /** @source useState in groups-page-container.tsx */
  newGroupName: string;
  /** @source useState in groups-page-container.tsx */
  newGroupDescription: string;
  /** @source useState in groups-page-container.tsx */
  newGroupColor: string;
  /** @source useCreateGroup hook in groups-page-container.tsx */
  createGroupMutation: UseMutationResult<unknown, Error, CreateGroup, unknown>;
  onSearchQueryChange: (value: string) => void;
  onIsCreateDialogOpenChange: (open: boolean) => void;
  onNewGroupNameChange: (value: string) => void;
  onNewGroupDescriptionChange: (value: string) => void;
  onNewGroupColorChange: (color: string) => void;
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  /** @source useNavigate hook in groups-page-container.tsx */
  onNavigate: (options: NavigateOptions) => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export default function GroupsPagePresenter({
  filteredGroups,
  totalGroups,
  searchQuery,
  isCreateDialogOpen,
  newGroupName,
  newGroupDescription,
  newGroupColor,
  createGroupMutation,
  onSearchQueryChange,
  onIsCreateDialogOpenChange,
  onNewGroupNameChange,
  onNewGroupDescriptionChange,
  onNewGroupColorChange,
  onCreateGroup,
  onDeleteGroup,
  onNavigate,
}: GroupsPagePresenterProps) {

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
          <Dialog open={isCreateDialogOpen} onOpenChange={onIsCreateDialogOpenChange}>
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
                    onChange={(e) => onNewGroupNameChange(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this group..."
                    value={newGroupDescription}
                    onChange={(e) => onNewGroupDescriptionChange(e.target.value)}
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
                        onClick={() => onNewGroupColorChange(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onIsCreateDialogOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={onCreateGroup}
                  disabled={!newGroupName.trim() || createGroupMutation.isPending}
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
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
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </div>
          <Badge variant="secondary">
            {totalGroups} group{totalGroups !== 1 ? 's' : ''}
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
              <Button className="mt-4" onClick={() => onIsCreateDialogOpenChange(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onDelete={() => onDeleteGroup(group.id)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// GROUP CARD COMPONENT
// ============================================================================

interface GroupCardProps {
  group: GroupItem;
  onDelete: () => void;
  onNavigate: (options: NavigateOptions) => void;
}

function GroupCard({ group, onDelete, onNavigate }: GroupCardProps) {
  const handleNavigate = (groupId: string, tab?: 'members' | 'settings' | 'activity') => {
    onNavigate({
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
        <button
          type="button"
          onClick={() => handleNavigate(group.id, 'members')}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <Users className="h-4 w-4" />
          <span>
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          </span>
        </button>
      </CardFooter>
    </Card>
  );
}
