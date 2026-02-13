/**
 * Expiring Warranties Report Page
 *
 * Thin wrapper that composes container. Route provides search state.
 *
 * @see expiring-warranties-container.tsx for data fetching
 * @see expiring-warranties-report.tsx for UI
 */

import { ExpiringWarrantiesReportContainer } from './expiring-warranties-container';
import type { ExpiringWarrantiesReportPageProps } from '@/lib/schemas/reports/expiring-warranties';

export type { ExpiringWarrantiesReportPageProps };

export function ExpiringWarrantiesReportPage(props: ExpiringWarrantiesReportPageProps) {
  return <ExpiringWarrantiesReportContainer {...props} />;
}
