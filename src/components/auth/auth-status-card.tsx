/**
 * Auth Status Card
 *
 * Shared loading/success/error state for auth flows.
 * Replaces inline SVGs with design system icons.
 */

import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthStatusCardProps {
  variant: 'loading' | 'success' | 'error';
  title: string;
  description: string;
  /** Optional action (Link or Button) */
  action?: React.ReactNode;
  className?: string;
}

const variantConfig = {
  loading: {
    icon: Loader2,
    iconClassName: 'h-8 w-8 animate-spin text-primary',
    wrapperClassName: 'bg-muted',
  },
  success: {
    icon: CheckCircle2,
    iconClassName: 'h-6 w-6 text-green-600',
    wrapperClassName: 'bg-green-100',
  },
  error: {
    icon: XCircle,
    iconClassName: 'h-6 w-6 text-destructive',
    wrapperClassName: 'bg-destructive/10',
  },
} as const;

export function AuthStatusCard({
  variant,
  title,
  description,
  action,
  className,
}: AuthStatusCardProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex min-h-svh w-full items-center justify-center p-6 md:p-10',
        className
      )}
    >
      <div className="w-full max-w-md space-y-8 text-center">
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            config.wrapperClassName
          )}
        >
          <Icon className={config.iconClassName} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
