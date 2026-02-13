'use server'

import { createServerSupabase } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { organizations, users } from 'drizzle/schema';
import { eq } from 'drizzle-orm';
import { AuthError, ValidationError } from '@/lib/server/errors';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/server/rate-limit';
import { sanitizeInternalRedirect } from '@/lib/auth/redirects';
import { toAuthErrorCode } from '@/lib/auth/error-codes';
import { authLogger } from '@/lib/logger';

// ============================================================================
// COMPLETE SIGNUP - Create org and user after email confirmation
// ============================================================================

const completeSignupSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  organizationName: z.string().min(1),
});

export const completeSignup = createServerFn({ method: 'POST' })
  .inputValidator(completeSignupSchema)
  .handler(async ({ data }) => {
    const request = getRequest();
    const supabase = createServerSupabase(request);

    // Get the user from Supabase auth
    const { data: authUser, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser.user) {
      throw new AuthError('Authentication required');
    }

    // Verify the user ID matches
    if (authUser.user.id !== data.userId) {
      throw new ValidationError('User ID mismatch');
    }

    // Check if user already exists (idempotent)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.authId, data.userId))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: true, user: existingUser[0] };
    }

    // Use transaction to ensure atomicity - if user insert fails, org is rolled back
    // This prevents orphaned organizations with no owner
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: data.organizationName,
          slug: data.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          isActive: true,
          plan: 'free',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create user as owner
      const [user] = await tx
        .insert(users)
        .values({
          authId: data.userId,
          organizationId: organization.id,
          email: data.email,
          name: data.name,
          role: 'owner',
          status: 'active',
          type: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { user, organization };
    });

    return { success: true, ...result };
  });

// ============================================================================
// CONFIRM EMAIL - Verify OTP and complete signup
// ============================================================================

export const confirmEmailFn = createServerFn({ method: 'GET' })
  .inputValidator((searchParams: unknown) => {
    if (searchParams && typeof searchParams === 'object') {
      const params = searchParams as Record<string, unknown>;
      if (typeof params.token_hash === 'string' && typeof params.type === 'string') {
        return params;
      }
    }
    throw new ValidationError('Invalid search params');
  })
  .handler(async ({ data }) => {
    const request = getRequest();

    if (!request) {
      throw redirect({ to: `/auth/error`, search: { error: 'invalid_request' } });
    }

    const searchParams = data;
    const token_hash = searchParams['token_hash'] as string;
    const type = searchParams['type'] as EmailOtpType | null;
    const next = sanitizeInternalRedirect(searchParams['next'], { fallback: '/' });

    // Throttle token verification to reduce abuse and token-guess attempts.
    const clientId = getClientIdentifier(request);
    checkRateLimit('auth-confirm-email', `${clientId}:${token_hash}`, RATE_LIMITS.publicAction);

    if (token_hash && type) {
      const supabase = createServerSupabase(request);

      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        // After successful OTP verification, complete the signup process
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const userMeta = userData.user.user_metadata;
            await completeSignup({
              data: {
                userId: userData.user.id,
                email: userData.user.email!,
                name: userMeta?.name || 'Unknown',
                organizationName: userMeta?.organization_name || 'My Organization',
              },
            });
          }
        } catch (signupError) {
          authLogger.error('Signup completion error', signupError);
          throw redirect({
            to: `/auth/error`,
            search: { error: 'account_creation_failed' },
          });
        }

        // Redirect to specified URL or root
        throw redirect({ href: next });
      } else {
        throw redirect({
          to: `/auth/error`,
          search: { error: toAuthErrorCode(error?.message) },
        });
      }
    }

    throw redirect({
      to: `/auth/error`,
      search: { error: 'invalid_request' },
    });
  });
