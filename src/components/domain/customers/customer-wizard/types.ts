/**
 * Customer Wizard Types
 *
 * Shared type definitions for the customer creation wizard.
 */
import type { TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';
import type { ManagedContact } from '../contact-manager';
import type { ManagedAddress } from '../address-manager';
import type { CustomerWizardValues } from '@/lib/schemas/customers';

export type { CustomerWizardValues };

// ============================================================================
// WIZARD STEPS
// ============================================================================

export const wizardSteps = ['basic', 'contacts', 'addresses', 'review'] as const;
export type WizardStep = (typeof wizardSteps)[number];

// ============================================================================
// WIZARD DATA
// ============================================================================

export interface CustomerWizardData {
  customer: CustomerWizardValues;
  contacts: ManagedContact[];
  addresses: ManagedAddress[];
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface CustomerWizardProps {
  onSubmit: (data: CustomerWizardData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  availableTags?: Array<{ id: string; name: string; color: string }>;
}

export interface BasicInfoStepProps {
  form: TanStackFormApi<CustomerWizardValues>;
  availableTags?: Array<{ id: string; name: string; color: string }>;
}

export interface ReviewStepProps {
  data: CustomerWizardData;
}

// ============================================================================
// LABELS
// ============================================================================

export const statusLabels: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
};

export const typeLabels: Record<string, string> = {
  individual: 'Individual',
  business: 'Business',
  government: 'Government',
  non_profit: 'Non-Profit',
};

export const sizeLabels: Record<string, string> = {
  micro: 'Micro (1-9)',
  small: 'Small (10-49)',
  medium: 'Medium (50-249)',
  large: 'Large (250-999)',
  enterprise: 'Enterprise (1000+)',
};
