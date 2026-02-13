/**
 * Invite User Container Component
 *
 * Handles mutation for inviting new users.
 *
 * @source mutation from useSendInvitation hook
 *
 * @see src/routes/_authenticated/admin/users/invite-page.tsx - Presenter component
 */
import { useSendInvitation } from '@/hooks/users';
import InviteUserPagePresenter from './invite-page';

export default function InviteUserPageContainer() {
  const sendInvitation = useSendInvitation();

  return (
    <InviteUserPagePresenter
      sendInvitationMutation={sendInvitation}
    />
  );
}
