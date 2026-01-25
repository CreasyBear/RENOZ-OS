/**
 * Job Form Validation Schemas
 *
 * Zod schemas for job form validation with custom error messages and transformations.
 * Replaces imperative validation logic with declarative Zod schemas.
 *
 * @see src/lib/job-data-parsing.ts for parsing utilities
 */

import { z } from 'zod';
import { useState, useCallback, useMemo } from 'react';
import { parseJobDate, parseJobAmount, formatJobAmount } from '@/lib/job-data-parsing';

// ============================================================================
// CUSTOM REFINEMENTS
// ============================================================================

/**
 * Parses natural language dates (e.g., "tomorrow", "next Friday", "15/12/2024").
 * Returns ISO date string or null.
 */
const flexibleDateSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val?.trim()) return null;
    return parseJobDate(val);
  })
  .refine((val) => val === null || val !== undefined, {
    message:
      "Invalid date format. Try formats like: 'tomorrow', 'next Friday', '15/12/2024', '2024-12-15'",
  });

/**
 * Parses flexible amount formats (e.g., "1,500.50", "$1500", "1500 AUD").
 * Returns number or null.
 */
const flexibleAmountSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val?.trim()) return null;
    return parseJobAmount(val);
  })
  .refine((val) => val === null || typeof val === 'number', {
    message: "Invalid amount format. Try formats like: '1,500.50', '$1500', '1500 AUD'",
  });

// ============================================================================
// FIELD SCHEMAS
// ============================================================================

/**
 * Job number format: JOB-YYYYMMDD-XXXX
 */
export const jobNumberSchema = z
  .string()
  .min(1, 'Job number is required')
  .regex(/^JOB-\d{8}-\d{4}$/, 'Invalid job number format. Should be JOB-YYYYMMDD-XXXX');

/**
 * Customer name validation.
 */
export const customerNameSchema = z
  .string()
  .min(2, 'Customer name must be at least 2 characters')
  .max(100, 'Customer name must be no more than 100 characters');

/**
 * Description validation.
 */
export const descriptionSchema = z
  .string()
  .max(500, 'Description must be no more than 500 characters')
  .optional();

/**
 * Address validation.
 */
export const addressSchema = z
  .string()
  .max(255, 'Address must be no more than 255 characters')
  .optional();

/**
 * Phone number validation with auto-cleaning.
 */
export const phoneNumberSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val?.trim()) return '';
    // Remove spaces, dashes, and parentheses
    return val.replace(/[\s\-()]/g, '');
  })
  .refine((val) => !val || /^[+\d]{0,15}$/.test(val), {
    message: "Invalid phone number format. Use formats like '+61412345678' or '0412345678'",
  });

/**
 * Email validation.
 */
export const emailSchema = z
  .string()
  .optional()
  .transform((val) => val?.trim() || '')
  .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "Invalid email address. Use format like 'name@example.com'",
  });

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Job creation/editing form validation schema.
 */
export const jobFormSchema = z.object({
  jobNumber: jobNumberSchema.optional(), // Auto-generated, optional for creation
  customerName: customerNameSchema,
  description: descriptionSchema,
  address: addressSchema,
  scheduledDate: flexibleDateSchema,
  estimatedAmount: flexibleAmountSchema,
  phoneNumber: phoneNumberSchema,
  email: emailSchema,
});

export type JobFormInput = z.input<typeof jobFormSchema>;
export type JobFormOutput = z.output<typeof jobFormSchema>;

/**
 * Contact information validation schema.
 */
export const contactFormSchema = z.object({
  customerName: customerNameSchema,
  phoneNumber: phoneNumberSchema,
  email: emailSchema,
  address: addressSchema,
});

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormOutput = z.output<typeof contactFormSchema>;

/**
 * Quick job creation schema (minimal fields).
 */
export const quickJobFormSchema = z.object({
  customerName: customerNameSchema,
  description: descriptionSchema,
  scheduledDate: flexibleDateSchema,
  estimatedAmount: flexibleAmountSchema,
});

export type QuickJobFormInput = z.input<typeof quickJobFormSchema>;
export type QuickJobFormOutput = z.output<typeof quickJobFormSchema>;

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates job form data and returns parsed result with errors.
 */
export function validateJobForm(data: JobFormInput) {
  return jobFormSchema.safeParse(data);
}

/**
 * Validates contact form data and returns parsed result with errors.
 */
export function validateContactForm(data: ContactFormInput) {
  return contactFormSchema.safeParse(data);
}

/**
 * Validates quick job form data and returns parsed result with errors.
 */
export function validateQuickJobForm(data: QuickJobFormInput) {
  return quickJobFormSchema.safeParse(data);
}

/**
 * Extracts field-specific error messages from Zod validation result.
 */
export function getFieldErrors(
  result: z.SafeParseReturnType<unknown, unknown>
): Record<string, string> {
  if (result.success) return {};

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue: z.ZodIssue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return errors;
}

// ============================================================================
// REACT HOOK ADAPTER
// ============================================================================

/**
 * Hook-compatible validation result type.
 */
export interface ValidationResult {
  isValid: boolean;
  value: unknown;
  error?: string;
  suggestion?: string;
}

/**
 * Field validation suggestions for UI hints.
 */
export const FIELD_SUGGESTIONS: Record<string, string> = {
  scheduledDate: "Use formats like 'tomorrow', 'next Friday', or '2024-12-15'",
  estimatedAmount: "Use formats like '$1,500.50' or '1500 AUD'",
  jobNumber: 'Job numbers are auto-generated when creating jobs',
  phoneNumber: "Use formats like '+61412345678' or '0412345678'",
  email: "Use format like 'name@example.com'",
};

/**
 * Validates a single field and returns hook-compatible result.
 */
export function validateField(fieldName: keyof JobFormInput, value: unknown): ValidationResult {
  const schema = jobFormSchema.shape[fieldName];
  if (!schema) {
    return { isValid: true, value };
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return { isValid: true, value: result.data };
  }

  return {
    isValid: false,
    value,
    error: result.error.issues[0]?.message,
    suggestion: FIELD_SUGGESTIONS[fieldName],
  };
}

// ============================================================================
// REACT HOOK (Backward-compatible adapter)
// ============================================================================

interface ValidationState {
  [key: string]: ValidationResult;
}

/**
 * React hook for job form validation.
 * Provides backward-compatible API that uses Zod schemas internally.
 */
export function useJobFormValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({});

  const validateSingleField = useCallback((fieldName: string, value: unknown) => {
    const result = validateField(fieldName as keyof JobFormInput, value);
    setValidationState((prev) => ({
      ...prev,
      [fieldName]: result,
    }));
    return result;
  }, []);

  const validateAll = useCallback((data: Record<string, unknown>) => {
    const newValidationState: ValidationState = {};
    let allValid = true;

    Object.keys(data).forEach((fieldName) => {
      const result = validateField(fieldName as keyof JobFormInput, data[fieldName]);
      newValidationState[fieldName] = result;
      if (!result.isValid) {
        allValid = false;
      }
    });

    setValidationState(newValidationState);
    return allValid;
  }, []);

  const getFieldValidation = useCallback(
    (fieldName: string) => {
      return validationState[fieldName] || { isValid: true, value: null };
    },
    [validationState]
  );

  const getFieldError = useCallback(
    (fieldName: string) => {
      return validationState[fieldName]?.error;
    },
    [validationState]
  );

  const getFieldSuggestion = useCallback(
    (fieldName: string) => {
      return validationState[fieldName]?.suggestion;
    },
    [validationState]
  );

  const isValid = useMemo(() => {
    return Object.values(validationState).every((result) => result.isValid);
  }, [validationState]);

  const clearValidation = useCallback(() => {
    setValidationState({});
  }, []);

  const getFormattedValue = useCallback((fieldName: string, value: unknown) => {
    if (fieldName === 'estimatedAmount' && typeof value === 'number') {
      return formatJobAmount(value);
    }
    return value;
  }, []);

  return {
    validateAll,
    validateField: validateSingleField,
    getFieldValidation,
    getFieldError,
    getFieldSuggestion,
    isValid,
    clearValidation,
    getFormattedValue,
    validationState,
  };
}
