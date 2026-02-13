/**
 * Win/Loss Analysis Schemas
 *
 * Types for win/loss analysis presenter and container.
 */

import type { WinLossAnalysisResult, Competitor } from '@/hooks/reports';
import type { CreateScheduledReportInput } from './scheduled-reports';

// ============================================================================
// PROPS
// ============================================================================

export interface WinLossAnalysisPresenterProps {
  analysis: WinLossAnalysisResult | undefined;
  competitors: Competitor[];
  isLoading: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
  onExport: (format: 'pdf' | 'excel') => void;
  onScheduleReport: () => void;
  scheduleOpen: boolean;
  onScheduleOpenChange: (open: boolean) => void;
  onScheduleSubmit: (input: CreateScheduledReportInput) => Promise<void>;
  isScheduleSubmitting: boolean;
  className?: string;
}

export type WinLossAnalysisProps = WinLossAnalysisPresenterProps;
