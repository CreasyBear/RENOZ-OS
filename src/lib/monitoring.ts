/**
 * Production Monitoring & Logging
 *
 * Centralized monitoring system for production deployment with error tracking,
 * performance metrics, and user analytics.
 */

import { logger as centralLogger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface UserEvent {
  event: string;
  userId?: string;
  organizationId?: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

/** Cast at boundary; monitoring types differ from logger. */
type LogContext = Record<string, unknown>;

// ============================================================================
// LOGGER
// ============================================================================

class Logger {
  private isProduction = import.meta.env.PROD;
  private logLevel = (import.meta.env.VITE_LOG_LEVEL as string) || 'info';

  private levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private shouldLog(level: keyof typeof this.levels): boolean {
    return this.levels[level] <= this.levels[this.logLevel as keyof typeof this.levels];
  }

  error(message: string, error?: Error, context?: ErrorContext) {
    if (this.shouldLog('error')) {
      centralLogger.error(message, error, context as LogContext);

      // In production, send to error reporting service
      if (this.isProduction) {
        this.reportError(message, error, context);
      }
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    if (this.shouldLog('warn')) {
      centralLogger.warn(message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    if (this.shouldLog('info')) {
      centralLogger.info(message, context);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (this.shouldLog('debug')) {
      centralLogger.debug(message, context);
    }
  }

  private async reportError(message: string, error?: Error, context?: ErrorContext) {
    try {
      // Send to error reporting service (e.g., Sentry, Rollbar, etc.)
      const errorData = {
        message,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Placeholder for error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });

      centralLogger.debug('[ERROR REPORT]', errorData);
    } catch (reportingError) {
      centralLogger.error('Failed to report error', reportingError as Error, {});
    }
  }
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isEnabled = import.meta.env.NEXT_PUBLIC_PERFORMANCE_MONITORING !== 'false';

  trackMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'],
    context?: Record<string, unknown>
  ) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // In production, send to analytics service
    if (import.meta.env.PROD) {
      this.reportMetric(metric);
    }

    logger.debug(`Performance metric: ${name}`, { value, unit, context });
  }

  measureExecutionTime<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.trackMetric(`${name}.duration`, duration, 'ms', context);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackMetric(`${name}.error.duration`, duration, 'ms', context);
      throw error;
    }
  }

  async measureAsyncExecutionTime<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.trackMetric(`${name}.duration`, duration, 'ms', context);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackMetric(`${name}.error.duration`, duration, 'ms', context);
      throw error;
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }

  private async reportMetric(metric: PerformanceMetric) {
    try {
      // Send to analytics service (e.g., Mixpanel, Amplitude, etc.)
      // await fetch('/api/metrics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric),
      // });

      centralLogger.debug('[METRIC]', metric as unknown as LogContext);
    } catch (error) {
      logger.error('Failed to report metric', error as Error);
    }
  }
}

// ============================================================================
// USER ANALYTICS
// ============================================================================

class UserAnalytics {
  private isEnabled = import.meta.env.NEXT_PUBLIC_ANALYTICS !== 'false';

  trackEvent(
    event: string,
    properties?: Record<string, unknown>,
    userId?: string,
    organizationId?: string
  ) {
    if (!this.isEnabled) return;

    const userEvent: UserEvent = {
      event,
      userId,
      organizationId,
      properties,
      timestamp: Date.now(),
    };

    // In production, send to analytics service
    if (import.meta.env.PROD) {
      this.reportEvent(userEvent);
    }

    logger.debug(`User event: ${event}`, { properties, userId, organizationId });
  }

  trackPageView(page: string, properties?: Record<string, unknown>) {
    this.trackEvent('page_view', { page, ...properties });
  }

  trackFeatureUsage(feature: string, action: string, properties?: Record<string, unknown>) {
    this.trackEvent('feature_usage', { feature, action, ...properties });
  }

  trackError(error: Error, context?: ErrorContext) {
    this.trackEvent('error_occurred', {
      error_name: error.name,
      error_message: error.message,
      component: context?.component,
      action: context?.action,
      ...context?.metadata,
    });
  }

  private async reportEvent(event: UserEvent) {
    try {
      // Send to analytics service
      // await fetch('/api/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });

      centralLogger.debug('[EVENT]', event as unknown as LogContext);
    } catch (error) {
      logger.error('Failed to report event', error as Error);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const logger = new Logger();
export const performanceMonitor = new PerformanceMonitor();
export const userAnalytics = new UserAnalytics();

// Convenience functions for common operations
export const logError = (message: string, error?: Error, context?: ErrorContext) =>
  logger.error(message, error, context);

export const logWarn = (message: string, context?: Record<string, unknown>) =>
  logger.warn(message, context);

export const logInfo = (message: string, context?: Record<string, unknown>) =>
  logger.info(message, context);

export const trackPerformance = (
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  context?: Record<string, unknown>
) => performanceMonitor.trackMetric(name, value, unit, context);

export const measureExecutionTime = <T>(name: string, fn: () => T, context?: Record<string, unknown>) =>
  performanceMonitor.measureExecutionTime(name, fn, context);

export const measureAsyncExecutionTime = <T>(
  name: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
) => performanceMonitor.measureAsyncExecutionTime(name, fn, context);

export const trackUserEvent = (
  event: string,
  properties?: Record<string, unknown>,
  userId?: string,
  organizationId?: string
) => userAnalytics.trackEvent(event, properties, userId, organizationId);

// ============================================================================
// HOOKS
// ============================================================================

// React hook for component performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const trackRender = (duration: number) => {
    trackPerformance(`${componentName}.render`, duration, 'ms');
  };

  const trackInteraction = (action: string, duration?: number) => {
    trackPerformance(`${componentName}.${action}`, duration || 0, 'ms');
    userAnalytics.trackFeatureUsage(componentName, action);
  };

  return {
    trackRender,
    trackInteraction,
    measureExecutionTime: (fn: () => unknown) => measureExecutionTime(`${componentName}.operation`, fn),
  };
}

// Error boundary hook
export function useErrorReporting(componentName: string) {
  const reportError = (error: Error, context?: Record<string, unknown>) => {
    logError(`Error in ${componentName}`, error, {
      component: componentName,
      ...context,
    });
    userAnalytics.trackError(error, { component: componentName, ...context });
  };

  return { reportError };
}
