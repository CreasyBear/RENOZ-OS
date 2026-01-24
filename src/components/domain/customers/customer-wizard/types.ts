/**
 * Customer Wizard Types
 *
 * Shared type definitions for the customer creation wizard.
 */
import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
import type { ManagedContact } from '../contact-manager';
import type { ManagedAddress } from '../address-manager';

// ============================================================================
// WIZARD STEPS
// ============================================================================

export const wizardSteps = ['basic', 'contacts', 'addresses', 'review'] as const;
export type WizardStep = (typeof wizardSteps)[number];

// ============================================================================
// FORM SCHEMA
// ============================================================================

export const customerWizardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  legalName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: z.enum(['prospect', 'active', 'inactive', 'suspended', 'blacklisted']),
  type: z.enum(['individual', 'business', 'government', 'non_profit']),
  size: z.enum(['micro', 'small', 'medium', 'large', 'enterprise']).optional(),
  industry: z.string().max(100).optional(),
  taxId: z.string().max(20).optional(),
  registrationNumber: z.string().max(50).optional(),
  creditHold: z.boolean(),
  tags: z.array(z.string().max(50)),
});

export type CustomerWizardValues = z.infer<typeof customerWizardSchema>;

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
  form: UseFormReturn<CustomerWizardValues>;
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
