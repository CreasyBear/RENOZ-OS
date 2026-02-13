/**
 * Bulk User Import Container Component
 *
 * Handles mutation for bulk user import.
 *
 * @source mutation from useBatchSendInvitations hook
 *
 * @see src/routes/_authenticated/admin/users/import-page.tsx - Presenter component
 */
import { useBatchSendInvitations } from '@/hooks/users';
import BulkUserImportPresenter from './import-page';

export default function BulkUserImportContainer() {
  const batchSendInvitationsMutation = useBatchSendInvitations();

  return (
    <BulkUserImportPresenter
      batchSendInvitationsMutation={batchSendInvitationsMutation}
    />
  );
}
