/**
 * Auth Layout
 *
 * Shared layout wrapper for auth routes (login, sign-up, forgot-password, accept-invitation).
 * Centers content, applies consistent max-width, and provides a polished auth experience.
 */

import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  children: React.ReactNode;
  /** Tailwind max-width class. Default: max-w-sm */
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg';
  className?: string;
}

export function AuthLayout({ children, maxWidth = 'max-w-sm', className }: AuthLayoutProps) {
  return (
    <div
      className={cn(
        'flex min-h-svh w-full items-center justify-center',
        'bg-gradient-to-b from-background via-background to-muted/30',
        'px-4 py-8 sm:px-6 sm:py-12 md:px-10 md:py-16',
        className
      )}
    >
      <div className={cn('w-full', maxWidth)}>{children}</div>
    </div>
  );
}
