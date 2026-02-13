/**
 * Invitations Page Presenter Component
 *
 * Pure UI component for invitation management with list, status tracking, and bulk actions.
 * Receives all data and handlers via props from container.
 *
 * @source data from invitations-page-container.tsx
 * @see src/routes/_authenticated/admin/invitations/invitations-page-container.tsx - Container component
 */

import { format, isPast, formatDistanceToNow } from 'date-fns';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Mail,
  MoreHorizontal,
  RefreshCw,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { invitationSearchSchema } from './index';
import type { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
type UserRole = 'owner' | 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
type InvitableRole = Exclude<UserRole, 'owner'>;

interface InvitationItem {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  personalMessage: string | null;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  inviter: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

type SearchParams = z.infer<typeof invitationSearchSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'manager', label: 'Manager', description: 'Team management' },
  { value: 'sales', label: 'Sales', description: 'Customer access' },
  { value: 'operations', label: 'Operations', description: 'Order management' },
  { value: 'support', label: 'Support', description: 'Support access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const;

const STATUS_CONFIG: Record<
  InvitationStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
};

// ============================================================================
// PRESENTER PROPS INTERFACE
// ============================================================================

interface InvitationsPagePresenterProps {
  /** @source useInvitationsFiltered hook in invitations-page-container.tsx (filtered by search query) */
  filteredInvitations: InvitationItem[];
  /** @source calculated from invitations data in invitations-page-container.tsx */
  stats: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
  };
  /** @source Route.useSearch() in invitations-page-container.tsx */
  search: SearchParams;
  /** @source invitations.pagination from invitations-page-container.tsx */
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  /** @source useState in invitations-page-container.tsx */
  searchQuery: string;
  /** @source useState in invitations-page-container.tsx */
  isCreateOpen: boolean;
  /** @source useState in invitations-page-container.tsx */
  newEmail: string;
  /** @source useState in invitations-page-container.tsx */
  newRole: InvitableRole;
  /** @source useState in invitations-page-container.tsx */
  newMessage: string;
  /** @source calculated from mutation states in invitations-page-container.tsx */
  isSubmitting: boolean;
  onSearchQueryChange: (value: string) => void;
  onIsCreateOpenChange: (open: boolean) => void;
  onNewEmailChange: (value: string) => void;
  onNewRoleChange: (role: InvitableRole) => void;
  onNewMessageChange: (value: string) => void;
  onStatusFilter: (status: SearchParams['status']) => void;
  onPageChange: (page: number) => void;
  onSendInvitation: () => void;
  onCancelInvitation: (invitationId: string) => void;
  onResendInvitation: (invitationId: string) => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export default function InvitationsPagePresenter({
  filteredInvitations,
  stats,
  search,
  pagination,
  searchQuery,
  isCreateOpen,
  newEmail,
  newRole,
  newMessage,
  isSubmitting,
  onSearchQueryChange,
  onIsCreateOpenChange,
  onNewEmailChange,
  onNewRoleChange,
  onNewMessageChange,
  onStatusFilter,
  onPageChange,
  onSendInvitation,
  onCancelInvitation,
  onResendInvitation,
}: InvitationsPagePresenterProps) {

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>
            <p className="text-muted-foreground">
              Manage user invitations and track acceptance status.
            </p>
          </div>
          <Button onClick={() => onIsCreateOpenChange(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() => onStatusFilter('all')}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-muted-foreground text-sm">Total Invitations</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() => onStatusFilter('pending')}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-muted-foreground text-sm">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() => onStatusFilter('accepted')}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.accepted}</p>
                <p className="text-muted-foreground text-sm">Accepted</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() => onStatusFilter('expired')}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <AlertCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-muted-foreground text-sm">Expired</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </div>
          <Select value={search.status} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invitations Table */}
        {filteredInvitations.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12">
            <Mail className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-medium">No invitations found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-center">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Send your first invitation to add users to your organization.'}
            </p>
            {!searchQuery && (
              <Button className="mt-4" onClick={() => onIsCreateOpenChange(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            )}
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation) => {
                  const statusConfig = STATUS_CONFIG[invitation.status];
                  const StatusIcon = statusConfig.icon;
                  const isExpired = isPast(new Date(invitation.expiresAt));
                  const effectiveStatus =
                    invitation.status === 'pending' && isExpired ? 'expired' : invitation.status;

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-4 w-4" />
                          <span className="font-medium">{invitation.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[effectiveStatus].color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {STATUS_CONFIG[effectiveStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invitation.inviter?.name || invitation.inviter?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(invitation.invitedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invitation.status === 'accepted'
                          ? format(new Date(invitation.acceptedAt!), 'MMM d, yyyy')
                          : format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {(invitation.status === 'pending' || effectiveStatus === 'expired') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onResendInvitation(invitation.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Resend
                              </DropdownMenuItem>
                              {invitation.status === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() => onCancelInvitation(invitation.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Send Invitation Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={onIsCreateOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Invitation</DialogTitle>
              <DialogDescription>
                Invite a new user to join your organization. Invitation emails are typically delivered within a few minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={newEmail}
                  onChange={(e) => onNewEmailChange(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => onNewRoleChange(v as InvitableRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-muted-foreground text-xs">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal note to the invitation..."
                  value={newMessage}
                  onChange={(e) => onNewMessageChange(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onIsCreateOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onSendInvitation} disabled={!newEmail.trim() || isSubmitting}>
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageLayout.Content>
    </PageLayout>
  );
}
