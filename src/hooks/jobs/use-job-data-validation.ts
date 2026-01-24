/**
 * Job Data Validation Hook
 *
 * Integrates enhanced data parsing utilities into React forms.
 * Provides real-time validation with helpful error messages and auto-correction suggestions.
 */

import { useState, useCallback, useMemo } from 'react';
import { parseJobDate, parseJobAmount, formatJobAmount } from '@/lib/job-data-parsing';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  value: any;
  error?: string;
  suggestion?: string;
  originalValue?: string;
}

export interface ValidationState {
  [key: string]: ValidationResult;
}

export interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

const VALIDATION_RULES: Record<string, ValidationOptions> = {
  scheduledDate: {
    custom: (value: string) => {
      if (!value?.trim()) return { isValid: true, value: null };
      const parsed = parseJobDate(value);
      if (parsed) {
        return { isValid: true, value: parsed };
      }
      return {
        isValid: false,
        value: null,
        error:
          "Invalid date format. Try formats like: 'tomorrow', 'next Friday', '15/12/2024', '2024-12-15'",
        suggestion: "Use formats like 'tomorrow', 'next Friday', or '2024-12-15'",
      };
    },
  },
  estimatedAmount: {
    custom: (value: string) => {
      if (!value?.trim()) return { isValid: true, value: null };
      const parsed = parseJobAmount(value);
      if (parsed !== null) {
        return { isValid: true, value: parsed };
      }
      return {
        isValid: false,
        value: null,
        error: "Invalid amount format. Try formats like: '1,500.50', '$1500', '1500 AUD'",
        suggestion: "Use formats like '$1,500.50' or '1500 AUD'",
      };
    },
  },
  jobNumber: {
    required: true,
    pattern: /^JOB-\d{8}-\d{4}$/,
    custom: (value: string) => {
      if (!value?.trim()) return { isValid: false, value: null, error: 'Job number is required' };
      const pattern = /^JOB-\d{8}-\d{4}$/;
      if (pattern.test(value)) {
        return { isValid: true, value };
      }
      return {
        isValid: false,
        value: null,
        error: 'Invalid job number format. Should be JOB-YYYYMMDD-XXXX',
        suggestion: 'Job numbers are auto-generated when creating jobs',
      };
    },
  },
  customerName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  description: {
    maxLength: 500,
  },
  address: {
    maxLength: 255,
  },
  phoneNumber: {
    pattern: /^[+\d]{0,15}$/,
    custom: (value: string) => {
      if (!value?.trim()) return { isValid: true, value: '' };
      const cleaned = value.replace(/[\s-()]/g, '');
      const pattern = /^[+\d]{0,15}$/;
      if (pattern.test(cleaned)) {
        return { isValid: true, value: cleaned };
      }
      return {
        isValid: false,
        value: cleaned,
        error: 'Invalid phone number format',
        suggestion: "Use formats like '+61412345678' or '0412345678'",
      };
    },
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (!value?.trim()) return { isValid: true, value: '' };
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (pattern.test(value.trim())) {
        return { isValid: true, value: value.trim() };
      }
      return {
        isValid: false,
        value: value.trim(),
        error: 'Invalid email address',
        suggestion: "Use format like 'name@example.com'",
      };
    },
  },
};

// ============================================================================
// HOOK
// ============================================================================

export function useJobDataValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({});

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: any): ValidationResult => {
    const rules = VALIDATION_RULES[fieldName];
    if (!rules) {
      return { isValid: true, value };
    }

    // Required check
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return {
        isValid: false,
        value,
        error: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`,
      };
    }

    // Skip further validation if empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return { isValid: true, value };
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value);
      return result;
    }

    // Length checks
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return {
          isValid: false,
          value,
          error: `Must be at least ${rules.minLength} characters`,
        };
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return {
          isValid: false,
          value,
          error: `Must be no more than ${rules.maxLength} characters`,
        };
      }
    }

    // Pattern check
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return {
        isValid: false,
        value,
        error: `Invalid format`,
      };
    }

    return { isValid: true, value };
  }, []);

  // Validate all fields
  const validateAll = useCallback(
    (data: Record<string, any>) => {
      const newValidationState: ValidationState = {};
      let allValid = true;

      Object.keys(data).forEach((fieldName) => {
        const result = validateField(fieldName, data[fieldName]);
        newValidationState[fieldName] = result;
        if (!result.isValid) {
          allValid = false;
        }
      });

      setValidationState(newValidationState);
      return allValid;
    },
    [validateField]
  );

  // Validate single field and update state
  const validateSingleField = useCallback(
    (fieldName: string, value: any) => {
      const result = validateField(fieldName, value);
      setValidationState((prev) => ({
        ...prev,
        [fieldName]: result,
      }));
      return result;
    },
    [validateField]
  );

  // Get validation result for a field
  const getFieldValidation = useCallback(
    (fieldName: string) => {
      return validationState[fieldName] || { isValid: true, value: null };
    },
    [validationState]
  );

  // Check if all fields are valid
  const isValid = useMemo(() => {
    return Object.values(validationState).every((result) => result.isValid);
  }, [validationState]);

  // Clear validation state
  const clearValidation = useCallback(() => {
    setValidationState({});
  }, []);

  // Get formatted display value for a field
  const getFormattedValue = useCallback((fieldName: string, value: any) => {
    if (fieldName === 'estimatedAmount' && typeof value === 'number') {
      return formatJobAmount(value);
    }
    return value;
  }, []);

  return {
    validateAll,
    validateField: validateSingleField,
    getFieldValidation,
    isValid,
    clearValidation,
    getFormattedValue,
    validationState,
  };
}

// ============================================================================
// UTILITY HOOKS FOR COMMON VALIDATION SCENARIOS
// ============================================================================

/**
 * Hook for validating job creation/editing forms
 */
export function useJobFormValidation() {
  const validation = useJobDataValidation();

  const validateJobForm = useCallback(
    (formData: Record<string, any>) => {
      return validation.validateAll(formData);
    },
    [validation]
  );

  const getFieldError = useCallback(
    (fieldName: string) => {
      const result = validation.getFieldValidation(fieldName);
      return result.error;
    },
    [validation]
  );

  const getFieldSuggestion = useCallback(
    (fieldName: string) => {
      const result = validation.getFieldValidation(fieldName);
      return result.suggestion;
    },
    [validation]
  );

  return {
    ...validation,
    validateJobForm,
    getFieldError,
    getFieldSuggestion,
  };
}

/**
 * Hook for validating customer/contact data
 */
export function useContactValidation() {
  const validation = useJobDataValidation();

  const validateContact = useCallback(
    (contactData: Record<string, any>) => {
      const fields = ['customerName', 'phoneNumber', 'email', 'address'];
      return validation.validateAll(
        Object.fromEntries(fields.map((field) => [field, contactData[field]]))
      );
    },
    [validation]
  );

  return {
    ...validation,
    validateContact,
  };
}
