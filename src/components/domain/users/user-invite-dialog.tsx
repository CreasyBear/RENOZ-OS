/**
 * User Invite Dialog
 *
 * Dialog for inviting new users to the organization.
 * Can be triggered from assignee dropdowns or other user selection contexts.
 *
 * ARCHITECTURE: Container/Presenter Pattern
 * - Container handles data fetching (useSendInvitation hook)
 * - Presenter renders UI and receives callbacks via props
 *
 * @example
 * ```tsx
 * <UserInviteDialog
 *   open={showInviteDialog}
 *   onOpenChange={setShowInviteDialog}
 *   onSuccess={(email) => console.log(`Invited ${email}`)}
 * />
 * ```
 */

import { useState, useCallback } from 'react';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSendInvitation } from '@/hooks/users';
import { toast } from '@/lib/toast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'manager', label: 'Manager', description: 'Team management and approvals' },
  { value: 'sales', label: 'Sales', description: 'Customer and pipeline access' },
  { value: 'operations', label: 'Operations', description: 'Order and inventory management' },
  { value: 'support', label: 'Support', description: 'Customer support access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const;

// ============================================================================
// TYPES
// ============================================================================

export interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (email: string) => void;
}

export interface UserInviteDialogPresenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  role: (typeof ROLE_OPTIONS)[number]['value'];
  personalMessage: string;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: (typeof ROLE_OPTIONS)[number]['value']) => void;
  onPersonalMessageChange: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  isValid: boolean;
}

// ============================================================================
// PRESENTER
// ============================================================================

/**
 * User Invite Dialog Presenter
 *
 * Pure UI component - receives all data and callbacks via props.
 * No data fetching hooks.
 */
export function UserInviteDialogPresenter({
  open,
  onOpenChange,
  email,
  role,
  personalMessage,
  onEmailChange,
  onRoleChange,
  onPersonalMessageChange,
  onSubmit,
  isPending,
  isValid,
}: UserInviteDialogPresenterProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new user to your organization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                required
                placeholder="colleague@example.com"
                className="pl-9"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(val) => onRoleChange(val as typeof role)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines what permissions the user will have
            </p>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="invite-message">Personal Message (Optional)</Label>
            <Textarea
              id="invite-message"
              value={personalMessage}
              onChange={(e) => onPersonalMessageChange(e.target.value)}
              rows={3}
              placeholder="Add a personal message to include in the invitation email..."
            />
          </div>

          {/* Info Box */}
          <Alert>
            <AlertTitle>What happens next?</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>They&apos;ll receive an email invitation</li>
                <li>They click the link to create their account</li>
                <li>Once accepted, they&apos;ll appear in your user list</li>
              </ul>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * User Invite Dialog Container
 *
 * Container responsibilities:
 * - Fetches mutation hook (useSendInvitation)
 * - Handles form submission logic
 * - Manages form state
 * - Passes data and callbacks to presenter
 *
 * @source sendInvitation from useSendInvitation hook
 */
export function UserInviteDialog({
  open,
  onOpenChange,
  onSuccess,
}: UserInviteDialogProps) {
  const sendInvitation = useSendInvitation();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('viewer');
  const [personalMessage, setPersonalMessage] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        await sendInvitation.mutateAsync({
          email,
          role,
          personalMessage: personalMessage || undefined,
        });

        toast.success(`Invitation sent to ${email}`);
        onSuccess?.(email);

        // Reset form
        setEmail('');
        setRole('viewer');
        setPersonalMessage('');
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
      }
    },
    [email, role, personalMessage, sendInvitation, onSuccess, onOpenChange]
  );

  return (
    <UserInviteDialogPresenter
      open={open}
      onOpenChange={onOpenChange}
      email={email}
      role={role}
      personalMessage={personalMessage}
      onEmailChange={setEmail}
      onRoleChange={setRole}
      onPersonalMessageChange={setPersonalMessage}
      onSubmit={handleSubmit}
      isPending={sendInvitation.isPending}
      isValid={!!email}
    />
  );
}
