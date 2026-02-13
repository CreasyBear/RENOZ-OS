/**
 * Expiring Warranty Urgency Status Config
 *
 * Status config for urgency badges per STATUS-BADGE-STANDARDS.
 * Replaces hardcoded badge styles in expiring-warranties-page.
 *
 * @see reports_domain_remediation Phase 7.4
 */

export type ExpiringWarrantyUrgencyLevel = 'urgent' | 'warning' | 'approaching' | 'healthy';

export interface UrgencyStatusConfig {
  label: string;
  variant: 'destructive' | 'default' | 'secondary' | 'outline';
  className: string;
  rowClassName: string;
}

export const expiringWarrantyUrgencyConfig: Record<ExpiringWarrantyUrgencyLevel, UrgencyStatusConfig> = {
  urgent: {
    label: 'Urgent',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
    rowClassName: 'border-l-4 border-l-red-500',
  },
  warning: {
    label: 'Warning',
    variant: 'default',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
    rowClassName: 'border-l-4 border-l-amber-500',
  },
  approaching: {
    label: 'Approaching',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800',
    rowClassName: 'border-l-4 border-l-yellow-500',
  },
  healthy: {
    label: 'Healthy',
    variant: 'outline',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800',
    rowClassName: '',
  },
};
