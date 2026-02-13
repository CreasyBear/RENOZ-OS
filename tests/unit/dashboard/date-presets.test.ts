/**
 * Date Presets Unit Tests
 *
 * Tests for dashboard date range URL sync and preset logic.
 *
 * @see src/lib/utils/date-presets.ts
 * @see DASH-DATE-RANGE
 */

import { describe, it, expect } from 'vitest';
import {
  dateRangeFromSearchParams,
  dateRangeToSearchParams,
  detectPreset,
  getPresetRange,
  validateDateRange,
  DEFAULT_PRESET,
  type DateRange,
} from '@/lib/utils/date-presets';

const fixedToday = new Date('2025-02-10T12:00:00.000Z');

describe('date-presets', () => {
  describe('dateRangeFromSearchParams', () => {
    it('defaults to this-month when no params', () => {
      const { range, preset } = dateRangeFromSearchParams({}, fixedToday);
      expect(preset).toBe('this-month');
      expect(range.from).toBeInstanceOf(Date);
      expect(range.to).toBeInstanceOf(Date);
      expect(range.to.getTime()).toBeGreaterThanOrEqual(range.from.getTime());
    });

    it('uses dateRange param when provided', () => {
      const { range, preset } = dateRangeFromSearchParams(
        { dateRange: 'today' },
        fixedToday
      );
      expect(preset).toBe('today');
      expect(range.from.toISOString().split('T')[0]).toBe('2025-02-10');
      expect(range.to.toISOString().split('T')[0]).toBe('2025-02-10');
    });

    it('parses custom range from start/end', () => {
      const { range, preset } = dateRangeFromSearchParams(
        {
          dateRange: 'custom',
          start: '2025-01-01',
          end: '2025-01-31',
        },
        fixedToday
      );
      expect(preset).toBe('custom');
      expect(range.from.toISOString().split('T')[0]).toBe('2025-01-01');
      expect(range.to.toISOString().split('T')[0]).toBe('2025-01-31');
    });

    it('falls back to this-month for invalid custom range', () => {
      const { preset } = dateRangeFromSearchParams(
        {
          dateRange: 'custom',
          start: '2025-01-31',
          end: '2025-01-01', // end before start
        },
        fixedToday
      );
      expect(preset).toBe('this-month');
    });

    it('returns this-month for unknown preset value', () => {
      const { preset } = dateRangeFromSearchParams(
        { dateRange: 'invalid-preset' },
        fixedToday
      );
      expect(preset).toBe('this-month');
    });
  });

  describe('dateRangeToSearchParams', () => {
    it('returns preset key for preset range', () => {
      const range = getPresetRange('this-week', fixedToday)!;
      const params = dateRangeToSearchParams(range, 'this-week');
      expect(params).toEqual({ dateRange: 'this-week' });
    });

    it('returns custom with start/end for custom range', () => {
      const range: DateRange = {
        from: new Date('2025-01-15'),
        to: new Date('2025-01-20'),
      };
      const params = dateRangeToSearchParams(range, 'custom');
      expect(params.dateRange).toBe('custom');
      expect(params.start).toBe('2025-01-15');
      expect(params.end).toBe('2025-01-20');
    });
  });

  describe('detectPreset', () => {
    it('returns preset value when range matches', () => {
      const range = getPresetRange('this-month', fixedToday)!;
      expect(detectPreset(range, fixedToday)).toBe('this-month');
    });

    it('returns custom when range does not match any preset', () => {
      const range: DateRange = {
        from: new Date('2025-01-15'),
        to: new Date('2025-01-20'),
      };
      expect(detectPreset(range, fixedToday)).toBe('custom');
    });
  });

  describe('validateDateRange', () => {
    it('returns valid for normal range', () => {
      const result = validateDateRange({
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error when end before start', () => {
      const result = validateDateRange({
        from: new Date('2025-01-31'),
        to: new Date('2025-01-01'),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be after start date');
    });
  });

  describe('DEFAULT_PRESET', () => {
    it('is this-month', () => {
      expect(DEFAULT_PRESET).toBe('this-month');
    });
  });
});
