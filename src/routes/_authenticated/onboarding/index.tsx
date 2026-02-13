/**
 * Onboarding Route
 *
 * Dedicated onboarding flow for new users after accepting an invitation.
 * Renders the onboarding checklist in a full-page layout.
 * On completion, redirects to dashboard.
 *
 * @see src/components/shared/onboarding-checklist.tsx
 * @see src/hooks/users/use-onboarding.ts
 */
import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout';
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnboardingProgress } from '@/hooks/users';
import { trackOnboardingStarted, trackOnboardingCompleted } from '@/lib/analytics';
import { Loader2, PartyPopper, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useOnboardingProgress();

  const stats = data?.stats ?? null;
  const isComplete = stats?.percentComplete === 100;

  useEffect(() => {
    if (!isLoading) trackOnboardingStarted();
  }, [isLoading]);

  const handleGoToDashboard = () => {
    trackOnboardingCompleted({ percentComplete: stats?.percentComplete ?? 100 });
    navigate({ to: '/dashboard', search: { tab: 'overview' }, replace: true });
  };

  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content className="mx-auto max-w-2xl space-y-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome! Let&apos;s get you set up</h1>
          <p className="mt-2 text-muted-foreground">
            Complete these steps to get the most out of the platform.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow the checklist below. You can skip any step and come back later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingChecklist variant="inline" autoHideOnComplete={false} />
          </CardContent>
        </Card>

        {isComplete && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <PartyPopper className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-green-900">All set!</h3>
                <p className="text-sm text-green-700">
                  You&apos;ve completed the setup. Head to your dashboard to get started.
                </p>
              </div>
              <Button onClick={handleGoToDashboard} size="lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}
