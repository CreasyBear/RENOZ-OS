/**
 * useCustomerWizard Hook
 *
 * Manages wizard state including:
 * - Current step navigation
 * - Step completion tracking
 * - Form state via react-hook-form
 * - Contact and address collections
 */
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ManagedContact } from '../../contact-manager';
import type { ManagedAddress } from '../../address-manager';
import {
  wizardSteps,
  customerWizardSchema,
  type WizardStep,
  type CustomerWizardValues,
  type CustomerWizardData,
} from '../types';

export interface UseCustomerWizardReturn {
  // Form
  form: ReturnType<typeof useForm<CustomerWizardValues>>;

  // Step state
  currentStep: WizardStep;
  currentStepIndex: number;
  completedSteps: Set<WizardStep>;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Collections
  contacts: ManagedContact[];
  setContacts: React.Dispatch<React.SetStateAction<ManagedContact[]>>;
  addresses: ManagedAddress[];
  setAddresses: React.Dispatch<React.SetStateAction<ManagedAddress[]>>;

  // Navigation
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => void;

  // Data
  getWizardData: () => CustomerWizardData;
}

export function useCustomerWizard(): UseCustomerWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [contacts, setContacts] = useState<ManagedContact[]>([]);
  const [addresses, setAddresses] = useState<ManagedAddress[]>([]);

  const form = useForm<CustomerWizardValues>({
    resolver: zodResolver(customerWizardSchema),
    defaultValues: {
      name: '',
      status: 'prospect',
      type: 'business',
      creditHold: false,
      tags: [],
    },
  });

  const currentStepIndex = wizardSteps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  const goToNextStep = useCallback(async () => {
    // Validate basic info step before proceeding
    if (currentStep === 'basic') {
      const isValid = await form.trigger(['name']);
      if (!isValid) return;
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep(wizardSteps[currentStepIndex + 1]);
  }, [currentStep, currentStepIndex, form]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(wizardSteps[currentStepIndex - 1]);
  }, [currentStepIndex]);

  const getWizardData = useCallback(
    (): CustomerWizardData => ({
      customer: form.getValues(),
      contacts,
      addresses,
    }),
    [form, contacts, addresses]
  );

  return {
    form,
    currentStep,
    currentStepIndex,
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
  };
}
