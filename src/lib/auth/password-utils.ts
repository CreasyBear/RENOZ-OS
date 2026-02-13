/**
 * Password Utilities
 *
 * Shared password strength calculation for auth forms.
 * Used by accept-invitation, sign-up, password-change-form.
 *
 * @see lib/schemas/auth/auth.ts for PasswordStrength type and password schemas
 */

import type { PasswordStrength } from '@/lib/schemas/auth';

/**
 * Calculate password strength for UI feedback.
 * Aligns with registerSchema / accept-invitation password rules.
 */
export function getPasswordStrength(pwd: string): PasswordStrength {
  if (pwd.length < 8) return { strength: 0, label: 'Too short', color: 'bg-red-500' };

  let score = 0;
  if (/[a-z]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  const labels: PasswordStrength['label'][] = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return {
    strength: score,
    label: labels[score - 1] ?? 'Weak',
    color: colors[score - 1] ?? 'bg-red-500',
  };
}
