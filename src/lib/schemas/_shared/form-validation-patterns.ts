/**
 * Form Validation Patterns
 *
 * Cross-field and complex validation patterns for forms.
 * Use with Zod's `.refine()` or `.superRefine()` methods.
 *
 * @example
 * ```ts
 * import { dateRangeRefinement, conditionalRequired } from './form-validation-patterns';
 *
 * const schema = z.object({
 *   startDate: z.date().optional(),
 *   endDate: z.date().optional(),
 *   status: z.enum(['active', 'inactive']),
 *   reason: z.string().optional(),
 * })
 *   .refine(...dateRangeRefinement('startDate', 'endDate'))
 *   .refine(...conditionalRequired('status', 'inactive', 'reason'));
 * ```
 */

import { z } from 'zod';

// ============================================================================
// DATE RANGE VALIDATION
// ============================================================================

/**
 * Validate that end date is after or equal to start date.
 *
 * @param startField - Name of the start date field
 * @param endField - Name of the end date field
 * @param message - Custom error message
 * @returns Refine arguments tuple
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   startDate: z.date(),
 *   endDate: z.date(),
 * }).refine(...dateRangeRefinement('startDate', 'endDate'));
 * ```
 */
export function dateRangeRefinement<T extends Record<string, unknown>>(
  startField: keyof T & string,
  endField: keyof T & string,
  message = 'End date must be on or after start date'
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const start = data[startField];
      const end = data[endField];

      // Skip if either is missing
      if (!start || !end) return true;

      // Both must be Date instances
      if (!(start instanceof Date) || !(end instanceof Date)) return true;

      return end >= start;
    },
    { message, path: [endField] },
  ];
}

/**
 * Validate date range with minimum gap requirement.
 *
 * @param startField - Name of the start date field
 * @param endField - Name of the end date field
 * @param minDays - Minimum number of days between dates
 * @param message - Custom error message
 */
export function dateRangeWithMinGap<T extends Record<string, unknown>>(
  startField: keyof T & string,
  endField: keyof T & string,
  minDays: number,
  message = `Dates must be at least ${minDays} days apart`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const start = data[startField];
      const end = data[endField];

      if (!start || !end) return true;
      if (!(start instanceof Date) || !(end instanceof Date)) return true;

      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return diffDays >= minDays;
    },
    { message, path: [endField] },
  ];
}

// ============================================================================
// CONDITIONAL REQUIRED
// ============================================================================

/**
 * Make a field required based on another field's value.
 *
 * @param conditionField - Field that triggers the requirement
 * @param conditionValue - Value that triggers the requirement
 * @param requiredField - Field that becomes required
 * @param message - Custom error message
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   status: z.enum(['approved', 'rejected']),
 *   rejectionReason: z.string().optional(),
 * }).refine(...conditionalRequired('status', 'rejected', 'rejectionReason'));
 * ```
 */
export function conditionalRequired<T extends Record<string, unknown>>(
  conditionField: keyof T & string,
  conditionValue: unknown,
  requiredField: keyof T & string,
  message = `${requiredField} is required when ${conditionField} is ${String(conditionValue)}`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      if (data[conditionField] !== conditionValue) return true;

      const value = data[requiredField];
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;

      return true;
    },
    { message, path: [requiredField] },
  ];
}

/**
 * Make a field required when condition function returns true.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   type: z.string(),
 *   details: z.string().optional(),
 * }).refine(...conditionalRequiredFn(
 *   (data) => data.type === 'custom',
 *   'details',
 *   'Details are required for custom types'
 * ));
 * ```
 */
export function conditionalRequiredFn<T extends Record<string, unknown>>(
  condition: (data: T) => boolean,
  requiredField: keyof T & string,
  message: string
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      if (!condition(data)) return true;

      const value = data[requiredField];
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;

      return true;
    },
    { message, path: [requiredField] },
  ];
}

// ============================================================================
// AT LEAST ONE REQUIRED
// ============================================================================

/**
 * Require at least one of the specified fields to have a value.
 *
 * @param fields - Array of field names
 * @param message - Custom error message
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   email: z.string().email().optional(),
 *   phone: z.string().optional(),
 * }).refine(...atLeastOneRequired(['email', 'phone']));
 * ```
 */
export function atLeastOneRequired<T extends Record<string, unknown>>(
  fields: (keyof T & string)[],
  message = `At least one of ${fields.join(', ')} is required`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      return fields.some((field) => {
        const value = data[field];
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });
    },
    { message, path: [fields[0]] },
  ];
}

/**
 * Require exactly one of the specified fields to have a value.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   customerId: z.string().optional(),
 *   newCustomer: z.object({...}).optional(),
 * }).refine(...exactlyOneRequired(['customerId', 'newCustomer']));
 * ```
 */
export function exactlyOneRequired<T extends Record<string, unknown>>(
  fields: (keyof T & string)[],
  message = `Exactly one of ${fields.join(', ')} must be provided`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const filledCount = fields.filter((field) => {
        const value = data[field];
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      }).length;

      return filledCount === 1;
    },
    { message, path: [fields[0]] },
  ];
}

// ============================================================================
// NUMERIC COMPARISON
// ============================================================================

/**
 * Validate that one numeric field is less than or equal to another.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   minPrice: z.number(),
 *   maxPrice: z.number(),
 * }).refine(...numericLessThanOrEqual('minPrice', 'maxPrice'));
 * ```
 */
export function numericLessThanOrEqual<T extends Record<string, unknown>>(
  lesserField: keyof T & string,
  greaterField: keyof T & string,
  message = `${lesserField} must be less than or equal to ${greaterField}`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const lesser = data[lesserField];
      const greater = data[greaterField];

      if (typeof lesser !== 'number' || typeof greater !== 'number') return true;

      return lesser <= greater;
    },
    { message, path: [lesserField] },
  ];
}

/**
 * Validate that a sum of fields doesn't exceed a maximum.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   discount: z.number(),
 *   tax: z.number(),
 *   subtotal: z.number(),
 * }).refine(...sumMaximum(['discount', 'tax'], 'subtotal'));
 * ```
 */
export function sumMaximum<T extends Record<string, unknown>>(
  fieldsToSum: (keyof T & string)[],
  maxField: keyof T & string,
  message?: string
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const sum = fieldsToSum.reduce((acc, field) => {
        const value = data[field];
        return acc + (typeof value === 'number' ? value : 0);
      }, 0);

      const max = data[maxField];
      if (typeof max !== 'number') return true;

      return sum <= max;
    },
    {
      message: message ?? `Sum of ${fieldsToSum.join(', ')} cannot exceed ${maxField}`,
      path: [fieldsToSum[0]],
    },
  ];
}

// ============================================================================
// ARRAY VALIDATION
// ============================================================================

/**
 * Validate that an array has unique values for a specific property.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   lineItems: z.array(z.object({
 *     productId: z.string(),
 *     quantity: z.number(),
 *   })),
 * }).refine(...uniqueArrayProperty('lineItems', 'productId'));
 * ```
 */
export function uniqueArrayProperty<T extends Record<string, unknown>>(
  arrayField: keyof T & string,
  propertyKey: string,
  message = `Duplicate ${propertyKey} values in ${arrayField}`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const arr = data[arrayField];
      if (!Array.isArray(arr)) return true;

      const values = arr.map((item) => (item as Record<string, unknown>)[propertyKey]);
      const uniqueValues = new Set(values);

      return values.length === uniqueValues.size;
    },
    { message, path: [arrayField] },
  ];
}

/**
 * Validate array minimum/maximum length based on condition.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   type: z.enum(['single', 'multiple']),
 *   items: z.array(z.string()),
 * }).refine(...conditionalArrayLength(
 *   (data) => data.type === 'multiple',
 *   'items',
 *   { min: 2, message: 'Multiple type requires at least 2 items' }
 * ));
 * ```
 */
export function conditionalArrayLength<T extends Record<string, unknown>>(
  condition: (data: T) => boolean,
  arrayField: keyof T & string,
  options: { min?: number; max?: number; message: string }
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      if (!condition(data)) return true;

      const arr = data[arrayField];
      if (!Array.isArray(arr)) return true;

      if (options.min !== undefined && arr.length < options.min) return false;
      if (options.max !== undefined && arr.length > options.max) return false;

      return true;
    },
    { message: options.message, path: [arrayField] },
  ];
}

// ============================================================================
// STRING PATTERN VALIDATION
// ============================================================================

/**
 * Validate that a string matches one of several patterns.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   code: z.string(),
 * }).refine(...matchesPattern('code', [/^[A-Z]{3}-\d{4}$/, /^[A-Z]{2}\d{6}$/]));
 * ```
 */
export function matchesPattern<T extends Record<string, unknown>>(
  field: keyof T & string,
  patterns: RegExp[],
  message = `${field} does not match expected format`
): [
  (data: T) => boolean,
  { message: string; path: string[] }
] {
  return [
    (data) => {
      const value = data[field];
      if (typeof value !== 'string') return true;
      if (value === '') return true;

      return patterns.some((pattern) => pattern.test(value));
    },
    { message, path: [field] },
  ];
}

// ============================================================================
// COMBINE REFINEMENTS
// ============================================================================

/**
 * Combine multiple refinements into a superRefine function.
 *
 * @example
 * ```ts
 * const schema = z.object({...}).superRefine(
 *   combineRefinements(
 *     dateRangeRefinement('startDate', 'endDate'),
 *     conditionalRequired('status', 'rejected', 'reason'),
 *   )
 * );
 * ```
 */
export function combineRefinements<T extends Record<string, unknown>>(
  ...refinements: Array<[(data: T) => boolean, { message: string; path: string[] }]>
): (data: T, ctx: z.RefinementCtx) => void {
  return (data, ctx) => {
    for (const [check, error] of refinements) {
      if (!check(data)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error.message,
          path: error.path,
        });
      }
    }
  };
}
