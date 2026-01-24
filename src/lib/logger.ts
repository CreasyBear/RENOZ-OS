/**
 * Structured Logger
 *
 * Centralized logging with level control and context.
 * Replaces console.* calls for better production control.
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.info('Order created', { domain: 'orders', orderId: '123' });
 * logger.error('Failed to create order', error, { orderId: '123' });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  domain?: string;
  userId?: string;
  orgId?: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')) as LogLevel;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[logLevel];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  /**
   * Debug level - only in development
   */
  debug: (message: string, context?: LogContext) => {
    if (shouldLog('debug') && !isProduction) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  /**
   * Info level - general operational messages
   */
  info: (message: string, context?: LogContext) => {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context));
    }
  },

  /**
   * Warn level - potential issues that don't break functionality
   */
  warn: (message: string, context?: LogContext) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  /**
   * Error level - errors that need attention
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    if (shouldLog('error')) {
      const errorInfo =
        error instanceof Error
          ? { errorMessage: error.message, errorStack: error.stack }
          : { errorMessage: String(error) };

      console.error(formatMessage('error', message, { ...errorInfo, ...context }));
    }
  },

  /**
   * Create a child logger with preset context
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...defaultContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { ...defaultContext, ...context }),
  }),
};

// Domain-specific loggers for common use cases
export const authLogger = logger.child({ domain: 'auth' });
export const ordersLogger = logger.child({ domain: 'orders' });
export const pipelineLogger = logger.child({ domain: 'pipeline' });
export const inventoryLogger = logger.child({ domain: 'inventory' });
export const customersLogger = logger.child({ domain: 'customers' });
