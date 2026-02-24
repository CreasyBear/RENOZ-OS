/**
 * Exchange PKCE code for session (client-only).
 *
 * Used by password reset and other auth callback routes.
 * Must be called from client; supabase client uses static import to avoid
 * dynamic chunk loading issues (STANDARDS.md §8, TanStack Start best practices).
 *
 * @see https://supabase.com/docs/guides/auth/sessions/pkce-flow
 */
import { supabase } from '@/lib/supabase/client';

export async function exchangeCodeForSession(code: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error: error ?? null };
}
