/**
 * Supabase Client Exports
 *
 * Barrel file for Supabase clients. Import from this file for convenience:
 *
 * @example
 * ```ts
 * // Browser client (React components)
 * import { supabase, getCurrentUser, onAuthStateChange } from '~/lib/supabase'
 *
 * // Server client (server functions)
 * import { createServerSupabase, createAdminSupabase } from '~/lib/supabase'
 * ```
 */

// Browser client exports
export { supabase, getCurrentUser, getSession, onAuthStateChange } from './client'

// Server client exports
export {
  createServerSupabase,
  createAdminSupabase,
  getServerUser,
  requireServerUser,
} from './server'
