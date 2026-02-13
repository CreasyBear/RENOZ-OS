/**
 * Group Detail Page Presenter Component
 *
 * Pure UI component for group detail page.
 * Receives all data and handlers via props from container.
 *
 * @source group from group-detail-page-container.tsx
 * @source members from group-detail-page-container.tsx
 * @source users from group-detail-page-container.tsx
 * @see src/routes/_authenticated/admin/groups/group-detail-page-container.tsx - Container component
 */
import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import type { UseMutationResult } from '@tanstack/react-query';

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

import { PageLayout } from '@/components/layout';

// Types imported from schemas (single source of truth per SCHEMA-TRACE.md)
import type { MemberItem, GroupMemberRole } from '@/lib/schemas/users';

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

// ============================================================================
// PRESENTER PROPS INTERFACE
// ============================================================================

interface GroupDetailPagePresenterProps {
  /** @source useGroup hook in group-detail-page-container.tsx */
  group: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
  } & Record<string, unknown>;
  /** @source useGroupMembers hook in group-detail-page-container.tsx */
  members: MemberItem[];
  /** @source useUsers hook in group-detail-page-container.tsx */
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  } & Record<string, unknown>>;
  /** Active tab */
  tab: string;
  /** Group ID */
  groupId: string;
  /** Mutation objects */
  updateGroupMutation: UseMutationResult<unknown, Error, { id: string; updates: { name?: string; description?: string; color?: string; isActive?: boolean } }, unknown>;
  addMemberMutation: UseMutationResult<unknown, Error, { groupId: string; userId: string; role: 'member' | 'lead' | 'manager' }, unknown>;
  updateMemberRoleMutation: UseMutationResult<unknown, Error, { groupId: string; userId: string; role: 'member' | 'lead' | 'manager' }, unknown>;
  removeMemberMutation: UseMutationResult<unknown, Error, { groupId: string; userId: string }, unknown>;
  /** Handlers */
  onSaveChanges: (updates: { name?: string; description?: string; color?: string; isActive?: boolean }) => Promise<void>;
  onAddMember: (userId: string, role: 'member' | 'lead' | 'manager') => Promise<void>;
  onUpdateRole: (memberGroupId: string, memberUserId: string, role: 'member' | 'lead' | 'manager') => Promise<void>;
  onRemoveMember: (memberGroupId: string, memberUserId: string, memberName: string) => Promise<void>;
  onTabChange: (tab: 'members' | 'settings' | 'activity') => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export default function GroupDetailPagePresenter({
  group,
  members,
  users,
  tab,
  groupId: _groupId,
  updateGroupMutation,
  addMemberMutation,
  updateMemberRoleMutation: _updateMemberRoleMutation,
  removeMemberMutation,
  onSaveChanges,
  onAddMember,
  onUpdateRole,
  onRemoveMember,
  onTabChange,
}: GroupDetailPagePresenterProps) {

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState(GROUP_COLORS[0]);
  const [editIsActive, setEditIsActive] = useState(true);

  // Add member state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<GroupMemberRole>('member');
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Filter available users (exclude existing members)
  const existingMemberIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members]
  );
  const filteredUsers = useMemo(
    () => users.filter((u) => !existingMemberIds.has(u.id)),
    [users, existingMemberIds]
  );
  const selectedUser = filteredUsers.find((u) => u.id === selectedUserId);

  // Handlers
  const handleSaveChanges = async () => {
    try {
      await onSaveChanges({
        name: editName,
        description: editDescription,
        color: editColor,
        isActive: editIsActive,
      });
      setIsEditing(false);
    } catch {
      // Error handling and toast notification done in container
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      await onAddMember(selectedUserId, selectedRole);
      setIsAddMemberOpen(false);
      setSelectedUserId('');
      setSelectedRole('member');
    } catch {
      // Error handling and toast notification done in container
    }
  };

  const handleUpdateRole = async (member: MemberItem, role: GroupMemberRole) => {
    try {
      await onUpdateRole(member.groupId, member.userId, role);
    } catch {
      // Error handling and toast notification done in container
    }
  };

  const handleRemoveMember = async (member: MemberItem) => {
    const memberName = member.user?.name || member.user?.email || 'this member';
    try {
      await onRemoveMember(member.groupId, member.userId, memberName);
    } catch {
      // Error handling and toast notification done in container
    }
  };

  const handleOpenEdit = () => {
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditColor(group.color || GROUP_COLORS[0]);
    setEditIsActive(group.isActive);
    setIsEditing(true);
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="space-y-6">
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
              <span>{members.length} members</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenEdit}>
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
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as 'members' | 'settings' | 'activity')}>
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
          {members.length === 0 ? (
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
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.filter((m) => m.user).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(member.user?.name || member.user?.email || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              to="/admin/users/$userId"
                              params={{ userId: member.userId }}
                              className="font-medium hover:underline"
                            >
                              {member.user?.name || 'Unnamed User'}
                            </Link>
                            <div className="text-muted-foreground text-sm">{member.user?.email}</div>
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
                        <Badge variant="outline">{member.user?.status ?? 'unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
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
                <Button variant="outline" onClick={handleOpenEdit}>
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
            <Button
              onClick={handleSaveChanges}
              disabled={!editName.trim() || updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending ? 'Saving...' : 'Save Changes'}
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
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageLayout.Content>
    </PageLayout>
  );
}
