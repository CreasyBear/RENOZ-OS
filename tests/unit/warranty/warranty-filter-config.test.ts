/**
 * Warranty Filter Config Unit Tests
 *
 * Validates filter state structure and default values.
 *
 * @see src/components/domain/warranty/warranty-filter-config.ts
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WARRANTY_FILTERS,
  WARRANTY_STATUS_OPTIONS,
  WARRANTY_POLICY_TYPE_OPTIONS,
  WARRANTY_FILTER_CONFIG,
  type WarrantyFiltersState,
} from '@/components/domain/warranty/warranty-filter-config';

describe('warranty-filter-config', () => {
  describe('DEFAULT_WARRANTY_FILTERS', () => {
    it('has expected structure and default values', () => {
      expect(DEFAULT_WARRANTY_FILTERS).toEqual({
        search: '',
        status: null,
        policyType: null,
        customerId: null,
      });
    });

    it('satisfies WarrantyFiltersState', () => {
      const filters: WarrantyFiltersState = DEFAULT_WARRANTY_FILTERS;
      expect(filters.search).toBe('');
      expect(filters.status).toBeNull();
      expect(filters.policyType).toBeNull();
      expect(filters.customerId).toBeNull();
    });
  });

  describe('WARRANTY_STATUS_OPTIONS', () => {
    it('includes all warranty statuses', () => {
      const values = WARRANTY_STATUS_OPTIONS.map((o) => o.value);
      expect(values).toContain('active');
      expect(values).toContain('expiring_soon');
      expect(values).toContain('expired');
      expect(values).toContain('voided');
      expect(values).toContain('transferred');
      expect(WARRANTY_STATUS_OPTIONS.length).toBe(5);
    });

    it('each option has value and label', () => {
      for (const opt of WARRANTY_STATUS_OPTIONS) {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('label');
        expect(opt).toHaveProperty('icon');
      }
    });
  });

  describe('WARRANTY_POLICY_TYPE_OPTIONS', () => {
    it('includes all policy types', () => {
      const values = WARRANTY_POLICY_TYPE_OPTIONS.map((o) => o.value);
      expect(values).toContain('battery_performance');
      expect(values).toContain('inverter_manufacturer');
      expect(values).toContain('installation_workmanship');
      expect(WARRANTY_POLICY_TYPE_OPTIONS.length).toBe(3);
    });
  });

  describe('WARRANTY_FILTER_CONFIG', () => {
    it('has search config with placeholder', () => {
      expect(WARRANTY_FILTER_CONFIG.search).toBeDefined();
      expect(WARRANTY_FILTER_CONFIG.search?.placeholder).toContain('Search');
    });

    it('has filters array with status and policyType', () => {
      const keys = WARRANTY_FILTER_CONFIG.filters.map((f) => f.key);
      expect(keys).toContain('status');
      expect(keys).toContain('policyType');
      expect(keys).toContain('customerId');
    });

    it('has presets for active, expiring, expired', () => {
      const presetIds = (WARRANTY_FILTER_CONFIG.presets ?? []).map((p) => p.id);
      expect(presetIds).toContain('active');
      expect(presetIds).toContain('expiring-soon');
      expect(presetIds).toContain('expired');
    });
  });
});
