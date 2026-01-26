/**
 * Settings Domain Components
 *
 * Exports all settings-related UI components.
 */

export {
  WinLossReasonsManager,
  type WinLossReasonsManagerProps,
} from "./win-loss-reasons-manager";

// Re-export types from hooks for backwards compatibility
export type { ReasonForm } from "@/hooks/settings";

export { TargetForm } from './target-form';
export type { TargetFormProps } from './target-form';

export { ScheduledReportForm } from './scheduled-report-form';
export type { ScheduledReportFormProps } from './scheduled-report-form';
