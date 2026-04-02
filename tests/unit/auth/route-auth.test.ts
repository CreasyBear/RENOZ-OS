import { describe, expect, it, vi } from 'vitest'
import { isRetryableAuthError, withAuthRetry } from '@/lib/auth/route-auth'

describe('route-auth retry behavior', () => {
  it('treats temporary 401s as retryable during auth bootstrap', () => {
    expect(isRetryableAuthError({ status: 401 })).toBe(true)
  })

  it('treats temporary 403s as retryable during auth bootstrap', () => {
    expect(isRetryableAuthError({ status: 403 })).toBe(true)
  })

  it('treats AUTH_USER_MISSING as terminal anonymous state', () => {
    expect(isRetryableAuthError(new Error('AUTH_USER_MISSING'))).toBe(false)
  })

  it('treats Supabase auth session missing as terminal anonymous state', () => {
    expect(isRetryableAuthError(new Error('Auth session missing!'))).toBe(false)
  })

  it('retries transient 403 and eventually resolves', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 403 })
      .mockResolvedValueOnce('ok')

    const result = await withAuthRetry(fn, 1, 1)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries transient 401 and eventually resolves', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 401 })
      .mockResolvedValueOnce('ok')

    const result = await withAuthRetry(fn, 1, 1)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
