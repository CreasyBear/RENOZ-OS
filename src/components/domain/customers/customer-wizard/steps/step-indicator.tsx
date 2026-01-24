/**
 * StepIndicator Component
 *
 * Visual progress indicator showing wizard steps with completion state.
 */
import { Building2, User, MapPin, CheckCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { wizardSteps, type WizardStep } from '../types';

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
}

const stepConfig: Record<WizardStep, { label: string; icon: typeof Building2 }> = {
  basic: { label: 'Basic Info', icon: Building2 },
  contacts: { label: 'Contacts', icon: User },
  addresses: { label: 'Addresses', icon: MapPin },
  review: { label: 'Review', icon: CheckCircle },
};

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="mb-8 flex items-center justify-center">
      {wizardSteps.map((step, index) => {
        const config = stepConfig[step];
        const Icon = config.icon;
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const stepIndex = wizardSteps.indexOf(currentStep);
        const isPast = index < stepIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isPast && !isCompleted && 'border-muted-foreground bg-muted',
                  !isActive && !isCompleted && !isPast && 'border-muted bg-background'
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  isActive && 'text-primary',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {config.label}
              </span>
            </div>
            {index < wizardSteps.length - 1 && (
              <div
                className={cn('mx-4 h-0.5 w-16', isPast || isCompleted ? 'bg-primary' : 'bg-muted')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
