/**
 * Group Detail Route
 *
 * Displays group information with tabs for members, settings, and activity.
 * Supports adding/removing members and editing group details.
 *
 * @see src/server/functions/user-groups.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  getGroup,
  updateGroup,
  listGroupMembers,
  addGroupMember,
  updateGroupMemberRole,
  removeGroupMember,
} from '@/server/functions/users/user-groups';
import { listUsers } from '@/server/functions/users/users';
import { z } from 'zod';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirmation } from '@/hooks/use-confirmation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

// Icons
import {
  ArrowLeft,
  Users,
  Settings,
  Activity,
  UserPlus,
  Trash2,
  Pencil,
  Check,
  ChevronsUpDown,
  Crown,
  Shield,
  User,
} from 'lucide-react';

// Types
type GroupMemberRole = 'member' | 'lead' | 'manager';

interface GroupData {
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

interface MemberItem {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: Date;
  addedBy: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
  };
}

interface MembersData {
  items: MemberItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

// Search params
const groupDetailSchema = z.object({
  tab: z.enum(['members', 'settings', 'activity']).default('members'),
});

import { RouteErrorFallback } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute('/_authenticated/admin/groups/$groupId' as any)({
  validateSearch: groupDetailSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loaderDeps: ({ search }: any) => search,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: async ({ params }: any) => {
    const [group, members, usersData] = await Promise.all([
      getGroup({ data: { id: params.groupId } }),
      listGroupMembers({ data: { groupId: params.groupId, page: 1, pageSize: 100 } }),
      listUsers({ data: { page: 1, pageSize: 100, status: 'active' } }),
    ]);
    return { group, members, availableUsers: usersData.items, groupId: params.groupId };
  },
  component: GroupDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/groups" />
  ),
  pendingComponent: () => (
    <div className="p-6">
      <AdminDetailSkeleton />
    </div>
  ),
});

// Group colors
const GROUP_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

function GroupDetailPage() {
  const confirm = useConfirmation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = Route.useSearch() as any;
  const loaderData = Route.useLoaderData() as {
    group: GroupData;
    members: MembersData;
    availableUsers: UserOption[];
    groupId: string;
  };
  const { group, members, availableUsers, groupId } = loaderData;
  const tab = search.tab || 'members';

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description || '');
  const [editColor, setEditColor] = useState(group.color || GROUP_COLORS[0]);
  const [editIsActive, setEditIsActive] = useState(group.isActive);

  // Add member state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<GroupMemberRole>('member');
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Server functions
  const updateGroupFn = useServerFn(updateGroup);
  const addMemberFn = useServerFn(addGroupMember);
  const updateMemberRoleFn = useServerFn(updateGroupMemberRole);
  const removeMemberFn = useServerFn(removeGroupMember);

  // Filter available users (exclude existing members)
  const existingMemberIds = new Set(members.items.map((m) => m.userId));
  const filteredUsers = availableUsers.filter((u) => !existingMemberIds.has(u.id));
  const selectedUser = filteredUsers.find((u) => u.id === selectedUserId);

  // Navigation helper
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  // Handlers
  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      await updateGroupFn({
        data: {
          id: groupId,
          updates: {
            name: editName,
            description: editDescription || undefined,
            color: editColor,
            isActive: editIsActive,
          },
        },
      });
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    setIsSubmitting(true);
    try {
      await addMemberFn({
        data: {
          groupId,
          userId: selectedUserId,
          role: selectedRole,
        },
      });
      setIsAddMemberOpen(false);
      setSelectedUserId('');
      setSelectedRole('member');
      window.location.reload();
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (member: MemberItem, role: GroupMemberRole) => {
    try {
      await updateMemberRoleFn({
        data: { groupId: member.groupId, userId: member.userId, role },
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleRemoveMember = async (member: MemberItem) => {
    const confirmed = await confirm.confirm({
      title: 'Remove Member',
      description: `Are you sure you want to remove ${member.user.name || member.user.email} from this group?`,
      confirmLabel: 'Remove Member',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      setIsSubmitting(true);
      try {
        await removeMemberFn({
          data: { groupId: member.groupId, userId: member.userId },
        });
        window.location.reload();
      } catch (error) {
        console.error('Failed to remove member:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleTabChange = (newTab: string) => {
    navigateTo(`/admin/groups/${groupId}?tab=${newTab}`);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <a
          href="/admin/groups"
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: group.color || '#6B7280' }}
          >
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              {!group.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {group.description && <p className="text-muted-foreground mt-1">{group.description}</p>}
            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{members.pagination.totalItems} members</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Group
          </Button>
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          {members.items.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Users className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="text-lg font-medium">No members yet</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-center">
                Add team members to this group to collaborate together.
              </p>
              <Button className="mt-4" onClick={() => setIsAddMemberOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Group Role</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.items.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.user.name || 'Unnamed User'}</div>
                            <div className="text-muted-foreground text-sm">{member.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleUpdateRole(member, value as GroupMemberRole)
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Manager
                              </div>
                            </SelectItem>
                            <SelectItem value="lead">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Lead
                              </div>
                            </SelectItem>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Member
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member)}
                        >
                          <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Group Settings</CardTitle>
              <CardDescription>Configure group details and behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={group.name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: group.color || '#6B7280' }}
                    />
                    <span className="text-muted-foreground text-sm">
                      {group.color || 'Default'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-muted-foreground text-sm">
                  {group.description || 'No description provided.'}
                </p>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-muted-foreground text-sm">
                    Inactive groups are hidden from selection lists.
                  </p>
                </div>
                <Badge variant={group.isActive ? 'default' : 'secondary'}>
                  {group.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="border-t pt-4">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card className="flex flex-col items-center justify-center py-12">
            <Activity className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-medium">Activity Coming Soon</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-center">
              Group activity tracking will be available in a future update.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group name, description, and settings.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
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
                      editColor === color
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-muted-foreground text-sm">
                  Inactive groups are hidden from lists.
                </p>
              </div>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={!editName.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Add a user to this group and assign their role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="justify-between"
                  >
                    {selectedUser ? selectedUser.name || selectedUser.email : 'Select user...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {filteredUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.email}
                            onSelect={() => {
                              setSelectedUserId(user.id);
                              setUserSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <div className="flex flex-col">
                              <span>{user.name || 'Unnamed User'}</span>
                              <span className="text-muted-foreground text-sm">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Role in Group</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as GroupMemberRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Member - Basic access
                    </div>
                  </SelectItem>
                  <SelectItem value="lead">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Lead - Can manage members
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Manager - Full control
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
