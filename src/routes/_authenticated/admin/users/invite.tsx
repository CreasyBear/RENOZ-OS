/**
 * Invite User Route
 *
 * Form for inviting new users to the organization.
 * Part of USER-INVITATION-UI story - basic implementation.
 *
 * @see src/hooks/users/use-users.ts for TanStack Query hooks
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { useSendInvitation } from '@/hooks/users/use-users';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminFormSkeleton } from '@/components/skeletons/admin';

export const Route = createFileRoute('/_authenticated/admin/users/invite')({
  component: InviteUserPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/users" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminFormSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'manager', label: 'Manager', description: 'Team management and approvals' },
  { value: 'sales', label: 'Sales', description: 'Customer and pipeline access' },
  { value: 'operations', label: 'Operations', description: 'Order and inventory management' },
  { value: 'support', label: 'Support', description: 'Customer support access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const;

function InviteUserPage() {
  const sendInvitation = useSendInvitation();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('viewer');
  const [personalMessage, setPersonalMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await sendInvitation.mutateAsync({
        email,
        role,
        personalMessage: personalMessage || undefined,
      });
      setMessage({ type: 'success', text: `Invitation sent to ${email}` });
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
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-700">
              Users
            </Link>
          </li>
          <li>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900">Invite User</span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invite User</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send an invitation to add a new user to your organization
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`relative rounded px-4 py-3 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
          role="alert"
        >
          <span className="block sm:inline">{message.text}</span>
          <button
            className="absolute top-0 right-0 bottom-0 px-4 py-3"
            onClick={() => setMessage(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            The role determines what permissions the user will have
          </p>
        </div>

        {/* Personal Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Personal Message (Optional)
          </label>
          <textarea
            id="message"
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={3}
            placeholder="Add a personal message to include in the invitation email..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            to="/admin/users"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={sendInvitation.isPending || !email}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
          <li>The user will receive an email invitation</li>
          <li>They can click the link to create their account</li>
          <li>Once accepted, they will appear in your user list</li>
          <li>You can manage their role and permissions at any time</li>
        </ul>
      </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
