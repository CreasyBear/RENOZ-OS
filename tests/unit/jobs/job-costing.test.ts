/**
 * Job Costing Unit Tests
 *
 * Verifies currency/unit handling:
 * - job_materials.unit_cost is stored in dollars (no /100)
 * - orders.total is stored in dollars (no /100)
 * - Labor rate is stored in cents (hourlyRate = laborRateCents / 100)
 *
 * @see src/server/functions/jobs/job-costing.ts
 * @see src/server/functions/jobs/job-costing-utils.ts
 */

import { describe, it, expect } from 'vitest';
import {
  unitCostToDollars,
  orderTotalToQuotedAmount,
  laborRateCentsToHourlyRate,
} from '@/server/functions/jobs/job-costing-utils';

describe('job-costing-utils', () => {
  describe('unitCostToDollars', () => {
    it('returns unit cost as-is when stored in dollars (no /100)', () => {
      expect(unitCostToDollars(500)).toBe(500);
      expect(unitCostToDollars(19.99)).toBe(19.99);
    });

    it('handles string input', () => {
      expect(unitCostToDollars('500')).toBe(500);
    });

    it('handles null/undefined as 0', () => {
      expect(unitCostToDollars(null)).toBe(0);
      expect(unitCostToDollars(undefined as unknown as null)).toBe(0);
    });
  });

  describe('orderTotalToQuotedAmount', () => {
    it('returns order total as-is when stored in dollars (no /100)', () => {
      expect(orderTotalToQuotedAmount(19052)).toBe(19052);
      expect(orderTotalToQuotedAmount(10500.5)).toBe(10500.5);
    });

    it('returns 0 when orderTotal is null or undefined', () => {
      expect(orderTotalToQuotedAmount(null)).toBe(0);
      expect(orderTotalToQuotedAmount(undefined as unknown as null)).toBe(0);
    });

    it('handles string input', () => {
      expect(orderTotalToQuotedAmount('19052')).toBe(19052);
    });
  });

  describe('laborRateCentsToHourlyRate', () => {
    it('converts labor rate from cents to dollars per hour', () => {
      expect(laborRateCentsToHourlyRate(7500)).toBe(75);
      expect(laborRateCentsToHourlyRate(10000)).toBe(100);
      expect(laborRateCentsToHourlyRate(5500)).toBe(55);
    });
  });
});
