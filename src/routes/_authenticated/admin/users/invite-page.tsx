/**
 * Invite User Page Presenter Component
 *
 * Pure UI component for inviting new users to the organization.
 * Receives mutation handler via props from container.
 *
 * @source mutation from invite-page-container.tsx
 * @see src/routes/_authenticated/admin/users/invite-page-container.tsx - Container component
 */
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'manager', label: 'Manager', description: 'Team management and approvals' },
  { value: 'sales', label: 'Sales', description: 'Customer and pipeline access' },
  { value: 'operations', label: 'Operations', description: 'Order and inventory management' },
  { value: 'support', label: 'Support', description: 'Customer support access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const;

// ============================================================================
// PRESENTER PROPS INTERFACE
// ============================================================================

interface InviteUserPagePresenterProps {
  /** @source useSendInvitation hook in invite-page-container.tsx */
  sendInvitationMutation: UseMutationResult<unknown, Error, {
    email: string;
    role: 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
    personalMessage?: string;
  }, unknown>;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export default function InviteUserPagePresenter({
  sendInvitationMutation,
}: InviteUserPagePresenterProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('viewer');
  const [personalMessage, setPersonalMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await sendInvitationMutation.mutateAsync({
        email,
        role,
        personalMessage: personalMessage || undefined,
      });
      const sentEmail = email;
      setMessage({ type: 'success', text: `Invitation sent to ${sentEmail}` });
      toast.success(`Invitation sent to ${sentEmail}`, {
        action: {
          label: 'View Invitations',
          onClick: () =>
            navigate({
              to: '/admin/invitations',
              search: { page: 1, pageSize: 20, status: 'all' },
            }),
        },
      });
      // Reset form
      setEmail('');
      setRole('viewer');
      setPersonalMessage('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send invitation',
      });
    }
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invite User</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send an invitation to add a new user to your organization
          </p>
        </div>

        {/* Message */}
        {message && (
          <Alert
            variant={message.type === 'success' ? 'default' : 'destructive'}
            className="relative"
          >
            <AlertDescription>{message.text}</AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => setMessage(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invitation Details</CardTitle>
            <CardDescription>Fill in the details to send an invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">
                  Role
                </Label>
                <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The role determines what permissions the user will have
                </p>
              </div>

              {/* Personal Message */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  Personal Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a personal message to include in the invitation email..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <Link
                  to="/admin/users"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                disabled={sendInvitationMutation.isPending || !email}
              >
                {sendInvitationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sendInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <AlertTitle>What happens next?</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>The user will receive an email invitation</li>
              <li>They can click the link to create their account</li>
              <li>Once accepted, they will appear in your user list</li>
              <li>You can manage their role and permissions at any time</li>
            </ul>
          </AlertDescription>
        </Alert>
      </PageLayout.Content>
    </PageLayout>
  );
}
