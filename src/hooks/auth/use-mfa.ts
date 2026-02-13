/**
 * Multi-Factor Authentication Hook
 *
 * Provides MFA operations using Supabase's built-in TOTP support.
 * Handles enrollment, verification, and factor management.
 *
 * @see https://supabase.com/docs/guides/auth/auth-mfa/totp
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase/client';
import type { Factor } from '@supabase/supabase-js';

export interface MFAState {
  isEnrolled: boolean;
  factors: Factor[];
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  loading: boolean;
  error: string | null;
}

export interface EnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function useMFA() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.auth.mfa.all(),
    queryFn: async (): Promise<MFAState> => {
      // Get AAL levels
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) throw aalError;

      // Get enrolled factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;

      const verifiedFactors = factorsData.totp.filter((f: Factor) => f.status === 'verified');

      return {
        isEnrolled: verifiedFactors.length > 0,
        factors: verifiedFactors,
        currentLevel: aalData.currentLevel,
        nextLevel: aalData.nextLevel,
        loading: false,
        error: null,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  const refreshStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.mfa.all() });
  }, [queryClient]);

  /**
   * Start MFA enrollment - returns QR code and secret
   */
  const startEnrollment = useCallback(async (): Promise<EnrollmentData | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      // Invalidate MFA status to refresh the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.mfa.all() });

      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };
    } catch {
      // Error is handled by the caller
      return null;
    }
  }, [queryClient]);

  /**
   * Verify enrollment with TOTP code from authenticator app
   */
  const verifyEnrollment = useCallback(
    async (factorId: string, code: string): Promise<boolean> => {
      try {
        // Create challenge
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        });

        if (challengeError) throw challengeError;

        // Verify with code
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code,
        });

        if (verifyError) throw verifyError;

        // Refresh status after successful verification
        await refreshStatus();

        return true;
      } catch {
        // Error is handled by the caller
        return false;
      }
    },
    [refreshStatus]
  );

  /**
   * Unenroll (disable) a factor
   */
  const unenroll = useCallback(
    async (factorId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });

        if (error) throw error;

        // Refresh status after unenrollment
        await refreshStatus();

        return true;
      } catch {
        // Error is handled by the caller
        return false;
      }
    },
    [refreshStatus]
  );

  /**
   * Verify MFA challenge during login (when AAL needs upgrading)
   */
  const verifyChallenge = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        // Get first TOTP factor
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

        if (factorsError) throw factorsError;

        const totpFactor = factorsData.totp[0];
        if (!totpFactor) throw new Error('No TOTP factor found');

        // Create and verify challenge
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id,
        });

        if (challengeError) throw challengeError;

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challengeData.id,
          code,
        });

        if (verifyError) throw verifyError;

        await refreshStatus();
        return true;
      } catch {
        // Error is handled by the caller
        return false;
      }
    },
    [refreshStatus]
  );

  const state = query.data ?? {
    isEnrolled: false,
    factors: [],
    currentLevel: null,
    nextLevel: null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };

  return {
    ...state,
    refreshStatus,
    startEnrollment,
    verifyEnrollment,
    unenroll,
    verifyChallenge,
  };
}
