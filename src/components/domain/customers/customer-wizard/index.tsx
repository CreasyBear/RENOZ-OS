/**
 * CustomerWizard Component
 *
 * Multi-step wizard for creating new customers with:
 * 1. Basic Information - Name, type, status, business details
 * 2. Contacts - Add key contacts for the customer
 * 3. Addresses - Add billing/shipping addresses
 * 4. Review - Review all information before submission
 *
 * Features:
 * - Step navigation with validation
 * - Progress indicator
 * - Data persistence across steps
 * - Summary review before submission
 */
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ContactManager } from '../contact-manager';
import { AddressManager } from '../address-manager';
import { useCustomerWizard } from './hooks/use-customer-wizard';
import { StepIndicator } from './steps/step-indicator';
import { BasicInfoStep } from './steps/basic-info-step';
import { ReviewStep } from './steps/review-step';
import type { CustomerWizardProps } from './types';

export function CustomerWizard({
  onSubmit,
  onCancel,
  isLoading = false,
  availableTags = [],
}: CustomerWizardProps) {
  const {
    form,
    currentStep,
    completedSteps,
    isFirstStep,
    isLastStep,
    contacts,
    setContacts,
    addresses,
    setAddresses,
    goToNextStep,
    goToPreviousStep,
    getWizardData,
  } = useCustomerWizard();

  const handleSubmit = async () => {
    await onSubmit(getWizardData());
  };

  return (
    <div className="mx-auto max-w-3xl">
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {currentStep === 'basic' && <BasicInfoStep form={form} availableTags={availableTags} />}

          {currentStep === 'contacts' && (
            <ContactManager contacts={contacts} onChange={setContacts} />
          )}

          {currentStep === 'addresses' && (
            <AddressManager addresses={addresses} onChange={setAddresses} />
          )}

          {currentStep === 'review' && <ReviewStep data={getWizardData()} />}

          <div className="mt-8 flex justify-between border-t pt-4">
            <div>
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={goToPreviousStep}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>

              {!isLastStep ? (
                <Button type="button" onClick={goToNextStep}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Create Customer
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Re-export types for consumers
export type { CustomerWizardProps, CustomerWizardData, CustomerWizardValues } from './types';
