/**
 * Welcome Checklist Container
 *
 * ARCHITECTURE: Container Component - handles data fetching and passes to presenter.
 *
 * @source progress from useOnboardingProgress hook
 * @source dismiss from useDismissWelcomeChecklist hook
 */

import {
  useWelcomeChecklistProgress,
  useDismissWelcomeChecklist,
} from '@/hooks/dashboard';
import { WelcomeChecklistPresenter } from './welcome-checklist';

// ============================================================================
// TYPES
// ============================================================================

export interface WelcomeChecklistContainerProps {
  className?: string;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function WelcomeChecklistContainer({
  className,
}: WelcomeChecklistContainerProps) {
  const { data, isLoading, isError } = useWelcomeChecklistProgress();
  const dismissMutation = useDismissWelcomeChecklist();

  // Don't render if loading, error, no data, or dismissed
  if (isLoading || isError || !data || data.dismissed) {
    return null;
  }

  return (
    <WelcomeChecklistPresenter
      hasCustomer={data.hasCustomer}
      hasProduct={data.hasProduct}
      hasQuote={data.hasQuote}
      onDismiss={() => dismissMutation.mutate()}
      isDismissing={dismissMutation.isPending}
      className={className}
    />
  );
}
