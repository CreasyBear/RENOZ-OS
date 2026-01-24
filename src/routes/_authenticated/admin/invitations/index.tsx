/**
 * Invitation Management Route
 *
 * Comprehensive invitation management with list, status tracking, and bulk actions.
 * Allows admins to view, resend, and cancel invitations.
 *
 * @see src/server/functions/invitations.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  listInvitations,
  sendInvitation,
  cancelInvitation,
  resendInvitation,
} from '@/server/functions/users/invitations';
import { z } from 'zod';
import { format, isPast, formatDistanceToNow } from 'date-fns';

// UI Components
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Icons
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
} from 'lucide-react';

// Types
type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
type UserRole = 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';

interface InvitationItem {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  personalMessage: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  invitedBy: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface InvitationsData {
  items: InvitationItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Search params
const invitationSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled', 'all']).default('all'),
});

import { RouteErrorFallback } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute('/_authenticated/admin/invitations/' as any)({
  validateSearch: invitationSearchSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loaderDeps: ({ search }: any) => search,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: async ({ deps }: any) => {
    const invitations = await listInvitations({
      data: {
        page: deps.page,
        pageSize: deps.pageSize,
        status: deps.status === 'all' ? undefined : deps.status,
      },
    });
    return { invitations };
  },
  component: InvitationsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <div className="p-6">
      <AdminTableSkeleton />
    </div>
  ),
});

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

function InvitationsPage() {
  const confirm = useConfirmation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = Route.useSearch() as any;
  const loaderData = Route.useLoaderData() as { invitations: InvitationsData };
  const { invitations } = loaderData;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [newMessage, setNewMessage] = useState('');

  // Server functions
  const sendInvitationFn = useServerFn(sendInvitation);
  const cancelInvitationFn = useServerFn(cancelInvitation);
  const resendInvitationFn = useServerFn(resendInvitation);

  // Filter invitations by search
  const filteredInvitations = invitations.items.filter((inv) =>
    inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: invitations.pagination.totalItems,
    pending: invitations.items.filter((i) => i.status === 'pending').length,
    accepted: invitations.items.filter((i) => i.status === 'accepted').length,
    expired: invitations.items.filter((i) => i.status === 'expired').length,
  };

  // Navigation helper
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const handleStatusFilter = (status: string) => {
    navigateTo(`/admin/invitations?status=${status}`);
  };

  // Handlers
  const handleSendInvitation = async () => {
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await sendInvitationFn({
        data: {
          email: newEmail.trim(),
          role: newRole,
          personalMessage: newMessage.trim() || undefined,
        },
      });
      setIsCreateOpen(false);
      resetForm();
      window.location.reload();
    } catch (error) {
      console.error('Failed to send invitation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitation: InvitationItem) => {
    const confirmed = await confirm.confirm({
      title: 'Cancel Invitation',
      description: `Are you sure you want to cancel the invitation to ${invitation.email}? They will no longer be able to accept this invitation.`,
      confirmLabel: 'Cancel Invitation',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      setIsSubmitting(true);
      try {
        await cancelInvitationFn({ data: { id: invitation.id } });
        window.location.reload();
      } catch (error) {
        console.error('Failed to cancel invitation:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResendInvitation = async (invitation: InvitationItem) => {
    const confirmed = await confirm.confirm({
      title: 'Resend Invitation',
      description: `Resend invitation email to ${invitation.email}?`,
      confirmLabel: 'Resend Invitation',
    });

    if (confirmed.confirmed) {
      setIsSubmitting(true);
      try {
        await resendInvitationFn({ data: { id: invitation.id } });
        window.location.reload();
      } catch (error) {
        console.error('Failed to resend invitation:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setNewEmail('');
    setNewRole('viewer');
    setNewMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>
          <p className="text-muted-foreground">
            Manage user invitations and track acceptance status.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Send Invitation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card
          className="hover:bg-muted/50 cursor-pointer"
          onClick={() => handleStatusFilter('all')}
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
          onClick={() => handleStatusFilter('pending')}
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
          onClick={() => handleStatusFilter('accepted')}
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
          onClick={() => handleStatusFilter('expired')}
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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={search.status || 'all'} onValueChange={handleStatusFilter}>
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
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
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
                      {invitation.invitedBy.name || invitation.invitedBy.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
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
                            <DropdownMenuItem onClick={() => handleResendInvitation(invitation)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend
                            </DropdownMenuItem>
                            {invitation.status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => handleCancelInvitation(invitation)}
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
        </Card>
      )}

      {/* Send Invitation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>Invite a new user to join your organization.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
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
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvitation} disabled={!newEmail.trim() || isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
