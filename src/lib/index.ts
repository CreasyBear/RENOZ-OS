/**
 * Lib Barrel Export
 *
 * Centralized exports for common utilities and configurations.
 */

export * from './query-keys';
export * from './constants';
export * from './formatters';
export * from './currency';
export * from './utils';
export * from './toast';
export * from './health-check';
export * from './keyboard-shortcuts';
export * from './logger';
export * from './error-handling';
export { isFeatureEnabled, getFeatureFlag, environment } from './feature-flags';
export {
  logger as monitoringLogger,
  performanceMonitor,
  userAnalytics,
  logError,
  logWarn,
  logInfo,
  trackPerformance,
  measureExecutionTime,
  measureAsyncExecutionTime,
  trackUserEvent,
  usePerformanceMonitoring,
  useErrorReporting,
} from './monitoring';
export type {
  ErrorContext as MonitoringErrorContext,
  PerformanceMetric,
  UserEvent,
} from './monitoring';
