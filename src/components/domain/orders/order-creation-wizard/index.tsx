/**
 * OrderCreationWizard Component
 *
 * Multi-step wizard for creating new orders.
 * Steps: Customer > Products > Pricing > Shipping > Review
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */

import { memo } from 'react';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Steps
import { CustomerStep } from './steps/customer-step';
import { ProductsStep } from './steps/products-step';
import { PricingStep } from './steps/pricing-step';
import { ShippingStep } from './steps/shipping-step';
import { ReviewStep } from './steps/review-step';

// Hooks and types
import { useOrderWizard, STEPS } from './hooks/use-order-wizard';
import type { OrderCreationWizardProps } from './types';

export const OrderCreationWizard = memo(function OrderCreationWizard({
  onComplete,
  onCancel,
  className,
}: OrderCreationWizardProps) {
  const { currentStep, state, setState, canProceed, isPending, goNext, goBack, handleSubmit } =
    useOrderWizard({ onComplete });

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <CustomerStep state={state} setState={setState} />;
      case 2:
        return <ProductsStep state={state} setState={setState} />;
      case 3:
        return <PricingStep state={state} setState={setState} />;
      case 4:
        return <ShippingStep state={state} setState={setState} />;
      case 5:
        return <ReviewStep state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Indicator */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {STEPS.map((step, stepIdx) => (
            <li
              key={step.id}
              className={cn('relative', stepIdx !== STEPS.length - 1 ? 'flex-1 pr-8' : '')}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    currentStep > step.id
                      ? 'border-primary bg-primary'
                      : currentStep === step.id
                        ? 'border-primary bg-background'
                        : 'border-muted bg-background'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="text-primary-foreground h-5 w-5" />
                  ) : (
                    <step.icon
                      className={cn(
                        'h-5 w-5',
                        currentStep === step.id ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  )}
                </div>
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-5 right-0 left-10 h-0.5',
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
              <div className="mt-2">
                <p
                  className={cn(
                    'text-xs font-medium',
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </p>
                <p className="text-muted-foreground hidden text-xs sm:block">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <Separator />

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStep()}</div>

      <Separator />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceed}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

// Re-export types for consumers
export type { OrderCreationWizardProps } from './types';
export default OrderCreationWizard;
