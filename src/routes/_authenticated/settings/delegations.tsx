/**
 * Delegation Management Route
 *
 * Allows users to set up out-of-office delegations and manage active delegations.
 * Shows both delegations created by the user and delegations assigned to them.
 *
 * @see src/hooks/users/use-delegations.ts for data hooks
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { SettingsTabsSkeleton } from '@/components/skeletons/settings';
import {
  useMyDelegations,
  useDelegationsToMe,
  useCreateDelegation,
  useCancelDelegation,
  useUsers,
} from '@/hooks/users';
import { z } from 'zod';
import { format, isBefore, isAfter, addDays } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useConfirmation } from '@/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Icons
import {
  Plus,
  Calendar as CalendarIcon,
  UserCheck,
  Users,
  ArrowRight,
  Clock,
  Check,
  ChevronsUpDown,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks';

// Types
interface DelegationUser {
  id: string;
  email: string;
  name: string | null;
}

interface DelegationItem {
  id: string;
  organizationId: string;
  delegatorId: string;
  delegateId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  delegator?: DelegationUser;
  delegate?: DelegationUser;
}

// Search params
const delegationSearchSchema = z.object({
  tab: z.enum(['my-delegations', 'delegated-to-me']).default('my-delegations'),
});

export const Route = createFileRoute('/_authenticated/settings/delegations')({
  validateSearch: delegationSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Delegation Management" description="Manage your out-of-office delegations" />
      <PageLayout.Content>
        <SettingsTabsSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
  component: DelegationsPage,
});

function DelegationsPage() {
  const confirm = useConfirmation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab = search.tab ?? 'my-delegations';

  // Fetch data using hooks
  const { data: myDelegationsData, isLoading: isLoadingMyDelegations } = useMyDelegations({ page: 1, pageSize: 50 });
  const { data: delegationsToMeData, isLoading: isLoadingDelegationsToMe } = useDelegationsToMe({ page: 1, pageSize: 50 });
  const { data: usersData, isLoading: isLoadingUsers } = useUsers({ page: 1, pageSize: 100, sortOrder: 'asc', status: 'active' });

  // Mutations
  const createDelegationMutation = useCreateDelegation();
  const cancelDelegationMutation = useCancelDelegation();

  // State
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [reason, setReason] = useState('');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  // Derived data
  const myDelegations = myDelegationsData ?? { items: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } };
  const delegationsToMe = delegationsToMeData ?? { items: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } };
  const availableUsers = usersData?.items ?? [];

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  const isLoading = isLoadingMyDelegations || isLoadingDelegationsToMe || isLoadingUsers;
  const isSubmitting = createDelegationMutation.isPending || cancelDelegationMutation.isPending;

  const handleTabChange = (newTab: string) => {
    navigate({
      to: '/settings/delegations',
      search: { tab: newTab as 'my-delegations' | 'delegated-to-me' },
    });
  };

  // Handlers
  const handleCreateDelegation = async () => {
    if (!selectedUserId || !startDate || !endDate) return;

    try {
      await createDelegationMutation.mutateAsync({
        delegateId: selectedUserId,
        startDate,
        endDate,
        reason: reason || undefined,
      });
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create delegation');
    }
  };

  const handleCancelDelegation = async (delegation: DelegationItem) => {
    const delegateName = delegation.delegate?.name ?? delegation.delegate?.email ?? 'this user';
    const confirmed = await confirm.confirm({
      title: 'Cancel Delegation',
      description: `Are you sure you want to cancel the delegation to ${delegateName}? They will no longer be able to act on your behalf.`,
      confirmLabel: 'Cancel Delegation',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await cancelDelegationMutation.mutateAsync(delegation.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel delegation');
      }
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setStartDate(addDays(new Date(), 1));
    setEndDate(addDays(new Date(), 7));
    setReason('');
  };

  // Get active delegations count
  const activeDelegations = myDelegations.items.filter((d) => {
    const now = new Date();
    return d.isActive && isBefore(new Date(d.startDate), now) && isAfter(new Date(d.endDate), now);
  });

  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Delegation Management" description="Manage your out-of-office delegations" />
        <PageLayout.Content>
          <SettingsTabsSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Delegation Management"
        description="Set up out-of-office delegations and manage tasks assigned to you."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Delegation
          </Button>
        }
      />
      <PageLayout.Content className="space-y-6">

      {/* Active Delegation Banner */}
      {activeDelegations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-900">
                You have {activeDelegations.length} active delegation
                {activeDelegations.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-blue-700">
                {activeDelegations[0].delegate?.name || activeDelegations[0].delegate?.email} is
                handling your tasks until{' '}
                {format(new Date(activeDelegations[0].endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="my-delegations" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Delegations
            {myDelegations.pagination.totalItems > 0 && (
              <Badge variant="secondary" className="ml-1">
                {myDelegations.pagination.totalItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delegated-to-me" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Delegated to Me
            {delegationsToMe.pagination.totalItems > 0 && (
              <Badge variant="secondary" className="ml-1">
                {delegationsToMe.pagination.totalItems}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Delegations Tab */}
        <TabsContent value="my-delegations" className="mt-6">
          {myDelegations.items.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Users className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="text-lg font-medium">No delegations yet</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-center">
                Create a delegation when you need someone to handle your tasks while you&apos;re away.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Delegation
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myDelegations.items.map((delegation) => (
                <DelegationCard
                  key={delegation.id}
                  delegation={delegation as DelegationItem}
                  type="outgoing"
                  onCancel={() => handleCancelDelegation(delegation as DelegationItem)}
                  isLoading={cancelDelegationMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Delegated to Me Tab */}
        <TabsContent value="delegated-to-me" className="mt-6">
          {delegationsToMe.items.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <UserCheck className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="text-lg font-medium">No tasks delegated to you</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-center">
                When someone delegates their tasks to you, they&apos;ll appear here.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setIsCreateOpen(true);
                  handleTabChange('my-delegations');
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your own delegation
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {delegationsToMe.items.map((delegation) => (
                <DelegationCard key={delegation.id} delegation={delegation as DelegationItem} type="incoming" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Delegation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Delegation</DialogTitle>
            <DialogDescription>
              Delegate your tasks to a colleague while you&apos;re away.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Delegate Selection */}
            <div className="grid gap-2">
              <Label>Delegate To</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="justify-between"
                  >
                    {selectedUser ? selectedUser.name || selectedUser.email : 'Select colleague...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search colleagues..." />
                    <CommandList>
                      <CommandEmpty>No colleagues found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.email}
                            onSelect={() => {
                              setSelectedUserId(user.id);
                              setUserSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <Avatar className="mr-2 h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
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

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setStartPickerOpen(false);
                      }}
                      disabled={(date) => isBefore(date, new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setEndPickerOpen(false);
                      }}
                      disabled={(date) =>
                        startDate ? isBefore(date, startDate) : isBefore(date, new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Validation warning */}
            {startDate && endDate && isBefore(endDate, startDate) && (
              <div className="text-destructive flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                End date must be after start date
              </div>
            )}

            {/* Reason */}
            <div className="grid gap-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Vacation, Medical leave, Conference..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDelegation}
              disabled={
                !selectedUserId ||
                !startDate ||
                !endDate ||
                (endDate && startDate && isBefore(endDate, startDate)) ||
                isSubmitting
              }
            >
              {createDelegationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Delegation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageLayout.Content>
    </PageLayout>
  );
}

// Delegation Card Component
function DelegationCard({
  delegation,
  type,
  onCancel,
  isLoading,
}: {
  delegation: DelegationItem;
  type: 'outgoing' | 'incoming';
  onCancel?: () => void;
  isLoading?: boolean;
}) {
  const now = new Date();
  const startDate = new Date(delegation.startDate);
  const endDate = new Date(delegation.endDate);

  // Determine status
  let status: 'upcoming' | 'active' | 'expired' | 'cancelled';
  if (!delegation.isActive) {
    status = 'cancelled';
  } else if (isBefore(now, startDate)) {
    status = 'upcoming';
  } else if (isAfter(now, endDate)) {
    status = 'expired';
  } else {
    status = 'active';
  }

  const statusConfig = {
    upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: Check },
    expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const otherUser = type === 'outgoing' ? delegation.delegate : delegation.delegator;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        {/* User Avatar */}
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {(otherUser?.name || otherUser?.email || '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">
              {type === 'outgoing' ? 'Delegated to' : 'Delegated by'}{' '}
              {otherUser?.name || otherUser?.email || 'Unknown User'}
            </span>
            <Badge variant="secondary" className={cn('text-xs', config.color)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{format(startDate, 'MMM d, yyyy')}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{format(endDate, 'MMM d, yyyy')}</span>
          </div>
          {delegation.reason && (
            <p className="text-muted-foreground mt-1 truncate text-sm">{delegation.reason}</p>
          )}
        </div>

        {/* Actions */}
        {type === 'outgoing' && (status === 'upcoming' || status === 'active') && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-1 h-4 w-4" />
            )}
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
