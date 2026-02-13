/**
 * Accept Invitation — Loading State
 */

import { AuthStatusCard } from './auth-status-card';

export function AcceptInvitationLoadingView() {
  return (
    <AuthStatusCard
      variant="loading"
      title="Loading"
      description="Loading invitation details..."
    />
  );
}
