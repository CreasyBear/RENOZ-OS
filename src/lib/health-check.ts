/**
 * Health Check System
 *
 * Comprehensive health monitoring for the suppliers domain including
 * API connectivity, data integrity, and system performance checks.
 */

import { performanceMonitor, logger, userAnalytics } from './monitoring';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  responseTime?: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: number;
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  registerCheck(name: string, checkFn: () => Promise<HealthCheckResult>) {
    this.checks.set(name, checkFn);
  }

  async runAllChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    for (const [serviceName, checkFn] of this.checks) {
      try {
        const result = await performanceMonitor.measureAsyncExecutionTime(
          `health_check.${serviceName}`,
          () => checkFn(),
          { service: serviceName }
        );
        results.push(result);
      } catch (error) {
        logger.error(`Health check failed for ${serviceName}`, error as Error);
        results.push({
          service: serviceName,
          status: 'unhealthy',
          message: `Check failed: ${(error as Error).message}`,
          timestamp: Date.now(),
        });
      }
    }

    const overall = this.determineOverallHealth(results);
    const totalTime = Date.now() - startTime;

    performanceMonitor.trackMetric('health_check.total', totalTime, 'ms', {
      overall,
      servicesChecked: results.length,
    });

    const health: SystemHealth = {
      overall,
      services: results,
      timestamp: Date.now(),
    };

    logger.info('Health check completed', {
      overall,
      servicesChecked: results.length,
      totalTime,
    });

    return health;
  }

  private determineOverallHealth(results: HealthCheckResult[]): SystemHealth['overall'] {
    const unhealthyCount = results.filter((r) => r.status === 'unhealthy').length;
    const degradedCount = results.filter((r) => r.status === 'degraded').length;

    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    }
    return 'healthy';
  }
}

// ============================================================================
// SUPPLIERS DOMAIN HEALTH CHECKS
// ============================================================================

const suppliersHealthChecker = new HealthChecker();

// API Connectivity Check
suppliersHealthChecker.registerCheck('suppliers_api', async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();

  try {
    // Try to call a simple suppliers endpoint
    // In a real implementation, this would call an actual health endpoint
    const response = await fetch('/api/health/suppliers', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        service: 'suppliers_api',
        status: 'healthy',
        message: 'Suppliers API is responding',
        details: { responseTime },
        timestamp: Date.now(),
        responseTime,
      };
    } else {
      return {
        service: 'suppliers_api',
        status: 'degraded',
        message: `Suppliers API returned ${response.status}`,
        details: { status: response.status, responseTime },
        timestamp: Date.now(),
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'suppliers_api',
      status: 'unhealthy',
      message: `Suppliers API unreachable: ${(error as Error).message}`,
      details: { error: (error as Error).message, responseTime },
      timestamp: Date.now(),
      responseTime,
    };
  }
});

// Database Connectivity Check
suppliersHealthChecker.registerCheck('suppliers_database', async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();

  try {
    // Try to execute a simple database query
    // In a real implementation, this would call a database health endpoint
    const response = await fetch('/api/health/database', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        service: 'suppliers_database',
        status: 'healthy',
        message: 'Database connection healthy',
        details: { ...data, responseTime },
        timestamp: Date.now(),
        responseTime,
      };
    } else {
      return {
        service: 'suppliers_database',
        status: 'degraded',
        message: `Database check returned ${response.status}`,
        details: { status: response.status, responseTime },
        timestamp: Date.now(),
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'suppliers_database',
      status: 'unhealthy',
      message: `Database unreachable: ${(error as Error).message}`,
      details: { error: (error as Error).message, responseTime },
      timestamp: Date.now(),
      responseTime,
    };
  }
});

// Component Loading Check
suppliersHealthChecker.registerCheck(
  'suppliers_components',
  async (): Promise<HealthCheckResult> => {
    try {
      // Check if critical components can be imported
      const startTime = Date.now();

      // Dynamic imports to test component loading
      // Only import components that exist
      await Promise.all([import('@/components/domain/suppliers')]);

      const loadTime = Date.now() - startTime;

      performanceMonitor.trackMetric('component_load.suppliers', loadTime, 'ms');

      return {
        service: 'suppliers_components',
        status: loadTime > 2000 ? 'degraded' : 'healthy',
        message: `Components loaded in ${loadTime}ms`,
        details: { loadTime },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        service: 'suppliers_components',
        status: 'unhealthy',
        message: `Component loading failed: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        timestamp: Date.now(),
      };
    }
  }
);

// Feature Flag Check
suppliersHealthChecker.registerCheck('feature_flags', async (): Promise<HealthCheckResult> => {
  try {
    const { FEATURE_FLAGS } = await import('@/lib/feature-flags');

    const issues: string[] = [];

    // Check for required feature flags
    if (FEATURE_FLAGS.SUPPLIERS_REAL_API === undefined) {
      issues.push('SUPPLIERS_REAL_API flag not defined');
    }

    if (FEATURE_FLAGS.SUPPLIERS_PRICING_REAL_API === undefined) {
      issues.push('SUPPLIERS_PRICING_REAL_API flag not defined');
    }

    return {
      service: 'feature_flags',
      status: issues.length > 0 ? 'degraded' : 'healthy',
      message:
        issues.length > 0
          ? `Feature flag issues: ${issues.join(', ')}`
          : 'All feature flags properly configured',
      details: { flags: FEATURE_FLAGS, issues },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      service: 'feature_flags',
      status: 'unhealthy',
      message: `Feature flag check failed: ${(error as Error).message}`,
      details: { error: (error as Error).message },
      timestamp: Date.now(),
    };
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export const runSuppliersHealthCheck = () => suppliersHealthChecker.runAllChecks();

export { HealthChecker };

// Periodic health check (every 5 minutes in production)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(
    async () => {
      try {
        const health = await runSuppliersHealthCheck();
        userAnalytics.trackEvent('health_check_completed', {
          overall: health.overall,
          services: health.services.length,
          timestamp: health.timestamp,
        });

        // Alert if system is unhealthy
        if (health.overall === 'unhealthy') {
          logger.error('System health check failed', undefined, {
            component: 'health_check',
            metadata: {
              services: health.services,
            },
          });
        }
      } catch (error) {
        logger.error('Health check system failed', error as Error);
      }
    },
    5 * 60 * 1000
  ); // 5 minutes
}
