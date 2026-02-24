/**
 * Customer Wizard Schema
 *
 * Validation schema for the multi-step customer creation wizard.
 * Aligns with createCustomerSchema; creditHoldReason required when creditHold is true.
 */

import { z } from 'zod';
import { optionalEmailSchema, phoneSchema, urlSchema } from '../_shared/patterns';
import {
  customerStatusSchema,
  customerTypeSchema,
  customerSizeSchema,
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from './customers';

// Re-export for consumers that need the raw arrays
export { customerStatusValues, customerTypeValues, customerSizeValues };

const customerWizardBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  legalName: z.string().max(255).optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  website: urlSchema,
  status: customerStatusSchema.default('prospect'),
  type: customerTypeSchema.default('business'),
  size: customerSizeSchema.optional(),
  industry: z.string().max(100).optional(),
  taxId: z.string().max(20).optional(),
  registrationNumber: z.string().max(50).optional(),
  creditHold: z.boolean().default(false),
  creditHoldReason: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(50).default([]),
});

/**
 * Customer wizard form schema.
 * Credit hold reason required when credit hold is enabled.
 */
export const customerWizardSchema = customerWizardBaseSchema.refine(
  (data) => !data.creditHold || !!data.creditHoldReason,
  {
    message: 'Credit hold reason is required when credit hold is enabled',
    path: ['creditHoldReason'],
  }
);

export type CustomerWizardValues = z.infer<typeof customerWizardSchema>;
