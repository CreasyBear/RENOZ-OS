import { describe, expect, it } from 'vitest';
import {
  DISALLOW_REDIRECT_PATHS,
  getLoginRedirectSearch,
  getPostLoginTarget,
} from '@/lib/auth/route-policy';

describe('route-policy', () => {
  describe('DISALLOW_REDIRECT_PATHS', () => {
    it('includes /login to prevent redirect loops', () => {
      expect(DISALLOW_REDIRECT_PATHS).toContain('/login');
    });

    it('includes auth-related paths', () => {
      expect(DISALLOW_REDIRECT_PATHS).toContain('/sign-up');
      expect(DISALLOW_REDIRECT_PATHS).toContain('/forgot-password');
    });
  });

  describe('getLoginRedirectSearch', () => {
    it('returns redirect undefined when reason is set', () => {
      expect(getLoginRedirectSearch('/dashboard', 'session_expired')).toEqual({
        redirect: undefined,
        reason: 'session_expired',
      });
      expect(getLoginRedirectSearch('/customers', 'invalid_user')).toEqual({
        redirect: undefined,
        reason: 'invalid_user',
      });
    });

    it('returns redirect undefined for /, /login, or missing pathname', () => {
      expect(getLoginRedirectSearch()).toEqual({ redirect: undefined });
      expect(getLoginRedirectSearch('/')).toEqual({ redirect: undefined });
      expect(getLoginRedirectSearch('/login')).toEqual({ redirect: undefined });
    });

    it('returns safe redirect for protected paths', () => {
      expect(getLoginRedirectSearch('/dashboard')).toEqual({
        redirect: '/dashboard',
      });
      expect(getLoginRedirectSearch('/customers/123')).toEqual({
        redirect: '/customers/123',
      });
    });

    it('never returns redirect=/login', () => {
      const search = getLoginRedirectSearch('/login');
      expect(search.redirect).toBeUndefined();
    });
  });

  describe('getPostLoginTarget', () => {
    it('returns fallback for undefined or empty redirect', () => {
      expect(getPostLoginTarget(undefined)).toBe('/dashboard');
      expect(getPostLoginTarget('')).toBe('/dashboard');
    });

    it('returns fallback for disallowed paths', () => {
      expect(getPostLoginTarget('/login')).toBe('/dashboard');
      expect(getPostLoginTarget('/sign-up')).toBe('/dashboard');
      expect(getPostLoginTarget('/forgot-password')).toBe('/dashboard');
    });

    it('returns sanitized path for safe internal redirects', () => {
      expect(getPostLoginTarget('/dashboard')).toBe('/dashboard');
      expect(getPostLoginTarget('/customers?tab=active')).toBe('/customers?tab=active');
    });

    it('rejects open redirect attempts', () => {
      expect(getPostLoginTarget('//evil.com')).toBe('/dashboard');
      expect(getPostLoginTarget('https://evil.com')).toBe('/dashboard');
    });

    it('uses custom fallback when provided', () => {
      expect(getPostLoginTarget('/login', { fallback: '/portal' })).toBe('/portal');
    });
  });
});
