import { createServerSupabase } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { organizations, users } from 'drizzle/schema';
import { eq } from 'drizzle-orm';

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
      throw new Error('Authentication required');
    }

    // Verify the user ID matches
    if (authUser.user.id !== data.userId) {
      throw new Error('User ID mismatch');
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

    // Create organization
    const [organization] = await db
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
    const [user] = await db
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

    return { success: true, user, organization };
  });

// ============================================================================
// CONFIRM EMAIL - Verify OTP and complete signup
// ============================================================================

export const confirmEmailFn = createServerFn({ method: 'GET' })
  .inputValidator((searchParams: unknown) => {
    if (
      searchParams &&
      typeof searchParams === 'object' &&
      'token_hash' in searchParams &&
      'type' in searchParams &&
      'next' in searchParams
    ) {
      return searchParams;
    }
    throw new Error('Invalid search params');
  })
  .handler(async ({ data }) => {
    const request = getRequest();

    if (!request) {
      throw redirect({ to: `/auth/error`, search: { error: 'No request' } });
    }

    const searchParams = data;
    const token_hash = searchParams['token_hash'] as string;
    const type = searchParams['type'] as EmailOtpType | null;
    const _next = searchParams['next'] as string;
    const next = _next?.startsWith('/') ? _next : '/';

    if (token_hash && type) {
      const supabase = createClient();

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
          console.error('Signup completion error:', signupError);
          throw redirect({
            to: `/auth/error`,
            search: { error: 'Account creation failed. Please try signing up again.' },
          });
        }

        // Redirect to specified URL or root
        throw redirect({ href: next });
      } else {
        throw redirect({
          to: `/auth/error`,
          search: { error: error?.message },
        });
      }
    }

    throw redirect({
      to: `/auth/error`,
      search: { error: 'No token hash or type' },
    });
  });
