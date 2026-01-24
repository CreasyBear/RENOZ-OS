/**
 * Onboarding Checklist Component
 *
 * Floating checklist that guides new users through onboarding steps.
 * Shows progress, allows completion/dismissal of steps, and provides actions.
 *
 * @see src/server/functions/onboarding.ts for server functions
 */

import { useState, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  getOnboardingProgress,
  completeOnboardingStep,
  dismissOnboardingStep,
} from '@/server/functions/users/onboarding';
import { toast } from '@/hooks';

// UI Components
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Icons
import { CheckCircle2, Circle, ChevronRight, Sparkles, PartyPopper, Loader2 } from 'lucide-react';

// Types
interface OnboardingStep {
  key: string;
  name: string;
  description: string;
  action: string;
  isCompleted: boolean;
  completedAt: Date | null;
  isDismissed: boolean;
  dismissedAt: Date | null;
}

interface OnboardingStats {
  totalSteps: number;
  completedSteps: number;
  dismissedSteps: number;
  remainingSteps: number;
  percentComplete: number;
}

interface OnboardingChecklistProps {
  /** Render as sheet (sidebar) or popover (floating) */
  variant?: 'sheet' | 'popover';
  /** Auto-hide when all steps completed */
  autoHideOnComplete?: boolean;
}

export function OnboardingChecklist({
  variant = 'popover',
  autoHideOnComplete = true,
}: OnboardingChecklistProps) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getProgressFn = useServerFn(getOnboardingProgress);
  const completeStepFn = useServerFn(completeOnboardingStep);
  const dismissStepFn = useServerFn(dismissOnboardingStep);

  // Fetch onboarding progress
  const fetchProgress = async () => {
    try {
      const result = await getProgressFn({ data: {} });
      setSteps(result.steps as OnboardingStep[]);
      setStats(result.stats);
    } catch {
      // Silently fail - onboarding is not critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  // Handle step completion
  const handleComplete = async (stepKey: string) => {
    setActionLoading(stepKey);
    try {
      await completeStepFn({ data: { stepKey } });
      toast.success('Step completed!');
      fetchProgress();
    } catch {
      toast.error('Failed to complete step');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle step dismissal
  const handleDismiss = async (stepKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(stepKey);
    try {
      await dismissStepFn({ data: { stepKey } });
      fetchProgress();
    } catch {
      toast.error('Failed to dismiss step');
    } finally {
      setActionLoading(null);
    }
  };

  // Navigate to action
  const handleAction = (action: string) => {
    window.location.href = action;
  };

  // Don't render if loading or complete
  if (loading) return null;
  if (!stats) return null;
  if (autoHideOnComplete && stats.percentComplete === 100) return null;

  // Active steps (not completed or dismissed)
  const activeSteps = steps.filter((s) => !s.isCompleted && !s.isDismissed);

  const content = (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Your Progress</span>
          <span className="text-muted-foreground">{stats.percentComplete}%</span>
        </div>
        <Progress value={stats.percentComplete} className="h-2" />
        <p className="text-muted-foreground text-xs">
          {stats.completedSteps} of {stats.totalSteps} steps completed
        </p>
      </div>

      {/* Completion celebration */}
      {stats.percentComplete === 100 && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">All done!</p>
            <p className="text-xs text-green-700">You've completed all onboarding steps</p>
          </div>
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isLoading = actionLoading === step.key;

          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                step.isCompleted
                  ? 'bg-muted/50 border-muted'
                  : step.isDismissed
                    ? 'bg-muted/30 border-muted opacity-50'
                    : 'bg-background hover:bg-muted/50 cursor-pointer'
              }`}
              onClick={() => !step.isCompleted && !step.isDismissed && handleAction(step.action)}
            >
              {/* Status icon */}
              <div className="mt-0.5">
                {isLoading ? (
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                ) : step.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.isCompleted || step.isDismissed ? 'text-muted-foreground line-through' : ''
                  }`}
                >
                  {step.name}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">{step.description}</p>

                {/* Actions for active steps */}
                {!step.isCompleted && !step.isDismissed && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(step.key);
                      }}
                      disabled={isLoading}
                    >
                      Mark Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground h-7 text-xs"
                      onClick={(e) => handleDismiss(step.key, e)}
                      disabled={isLoading}
                    >
                      Skip
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation arrow for active steps */}
              {!step.isCompleted && !step.isDismissed && !isLoading && (
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Trigger button
  const trigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Sparkles className="h-4 w-4" />
      <span>Get Started</span>
      {activeSteps.length > 0 && (
        <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs">
          {activeSteps.length}
        </span>
      )}
    </Button>
  );

  if (variant === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Getting Started</SheetTitle>
            <SheetDescription>
              Complete these steps to get the most out of the platform
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="mb-3">
          <h4 className="font-semibold">Getting Started</h4>
          <p className="text-muted-foreground text-xs">Complete these steps to get set up</p>
        </div>
        {content}
      </PopoverContent>
    </Popover>
  );
}
