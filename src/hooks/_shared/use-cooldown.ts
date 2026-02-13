/**
 * Cooldown Hook
 *
 * Countdown timer for rate-limiting UI (e.g. resend email, OTP).
 * Returns remaining seconds and a function to start the cooldown.
 *
 * @example
 * ```tsx
 * const [cooldown, startCooldown] = useCooldown(60);
 * const handleResend = () => {
 *   resendMutation.mutate(..., { onSuccess: () => startCooldown() });
 * };
 * <Button disabled={cooldown > 0}>Resend in {cooldown}s</Button>
 * ```
 */
import { useState, useEffect, useCallback } from 'react';

export function useCooldown(seconds: number): [number, () => void] {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const startCooldown = useCallback(() => setCooldown(seconds), [seconds]);

  return [cooldown, startCooldown];
}
