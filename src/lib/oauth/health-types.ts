/**
 * OAuth Connection Health Types
 *
 * Type definitions and status enums for OAuth connection health monitoring.
 * Based on midday patterns for connection validation and monitoring.
 */

export enum ConnectionHealthStatus {
  HEALTHY = 'healthy',
  TOKEN_EXPIRED = 'token_expired',
  API_ERROR = 'api_error',
  RATE_LIMITED = 'rate_limited',
  INACTIVE = 'inactive',
  NETWORK_ERROR = 'network_error',
  CONFIG_ERROR = 'config_error',
  UNKNOWN = 'unknown',
}

export enum ServiceHealthStatus {
  HEALTHY = 'healthy',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  RATE_LIMITED = 'rate_limited',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// Alias for backward compatibility
export const HealthStatus = ConnectionHealthStatus;
export const ServiceStatus = ServiceHealthStatus;

export interface ServiceHealthCheck {
  service: 'calendar' | 'email' | 'contacts';
  status: ServiceHealthStatus;
  responseTime?: number;
  lastChecked: Date;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface ConnectionHealthCheck {
  connectionId: string;
  organizationId: string;
  provider: 'google_workspace' | 'microsoft_365';
  overallStatus: ConnectionHealthStatus;
  services: ServiceHealthCheck[];
  lastChecked: Date;
  nextCheckDue: Date;
  consecutiveFailures: number;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  success: boolean;
  status: ConnectionHealthStatus;
  services: ServiceHealthCheck[];
  errorMessage?: string;
  responseTime: number;
}

export interface BulkHealthCheckResult {
  totalConnections: number;
  healthyConnections: number;
  unhealthyConnections: number;
  results: ConnectionHealthCheck[];
  errors: Array<{
    connectionId: string;
    error: string;
  }>;
}

// ============================================================================
// HEALTH MONITORING CONFIGURATION
// ============================================================================

export interface HealthMonitoringConfig {
  /** How often to check connection health (in minutes) */
  checkIntervalMinutes: number;

  /** Maximum number of consecutive failures before marking inactive */
  maxConsecutiveFailures: number;

  /** How long to cache health results (in minutes) */
  cacheTTLMminutes: number;

  /** Timeout for individual health checks (in seconds) */
  requestTimeoutSeconds: number;

  /** Whether to enable automatic background monitoring */
  enableBackgroundMonitoring: boolean;

  /** Alert thresholds */
  alertThresholds: {
    consecutiveFailures: number;
    unhealthyPercentage: number;
  };
}

export const DEFAULT_HEALTH_CONFIG: HealthMonitoringConfig = {
  checkIntervalMinutes: 60, // Check every hour
  maxConsecutiveFailures: 3,
  cacheTTLMminutes: 30, // Cache results for 30 minutes
  requestTimeoutSeconds: 10,
  enableBackgroundMonitoring: true,
  alertThresholds: {
    consecutiveFailures: 2,
    unhealthyPercentage: 20, // Alert if >20% connections are unhealthy
  },
};

// ============================================================================
// ALERTING TYPES
// ============================================================================

export enum HealthAlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface HealthAlert {
  id: string;
  connectionId: string;
  organizationId: string;
  severity: HealthAlertSeverity;
  type:
    | 'connection_down'
    | 'service_unavailable'
    | 'token_expired'
    | 'rate_limited'
    | 'quota_exceeded';
  message: string;
  details: Record<string, any>;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface HealthMetrics {
  totalConnections: number;
  healthyConnections: number;
  unhealthyConnections: number;
  averageResponseTime: number;
  alertsGenerated: number;
  lastUpdated: Date;
}

// ============================================================================
// PROVIDER-SPECIFIC HEALTH CHECKS
// ============================================================================

export interface GoogleWorkspaceHealthCheck {
  calendar?: {
    canListCalendars: boolean;
    canCreateEvents: boolean;
  };
  gmail?: {
    canListMessages: boolean;
    canSendEmail: boolean;
  };
  contacts?: {
    canListContacts: boolean;
    canCreateContacts: boolean;
  };
}

export interface Microsoft365HealthCheck {
  calendar?: {
    canListCalendars: boolean;
    canCreateEvents: boolean;
  };
  mail?: {
    canListMessages: boolean;
    canSendEmail: boolean;
  };
  contacts?: {
    canListContacts: boolean;
    canCreateContacts: boolean;
  };
}

export type ProviderHealthCheck = GoogleWorkspaceHealthCheck | Microsoft365HealthCheck;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determines the overall connection health status from service health checks.
 */
export function calculateOverallHealthStatus(
  services: ServiceHealthCheck[]
): ConnectionHealthStatus {
  // If any service has critical issues, mark connection as unhealthy
  const hasCriticalIssues = services.some((service) =>
    [
      ServiceHealthStatus.UNAUTHORIZED,
      ServiceHealthStatus.FORBIDDEN,
      ServiceHealthStatus.SERVICE_UNAVAILABLE,
    ].includes(service.status)
  );

  if (hasCriticalIssues) {
    return ConnectionHealthStatus.API_ERROR;
  }

  // If all services are healthy, connection is healthy
  const allHealthy = services.every((service) => service.status === ServiceHealthStatus.HEALTHY);

  if (allHealthy) {
    return ConnectionHealthStatus.HEALTHY;
  }

  // Check for rate limiting or quota issues
  const hasRateLimitIssues = services.some((service) =>
    [ServiceHealthStatus.RATE_LIMITED, ServiceHealthStatus.QUOTA_EXCEEDED].includes(service.status)
  );

  if (hasRateLimitIssues) {
    return ConnectionHealthStatus.RATE_LIMITED;
  }

  // Default to API error for other issues
  return ConnectionHealthStatus.API_ERROR;
}

/**
 * Checks if a health check result indicates a problem that needs attention.
 */
export function isHealthIssue(status: ConnectionHealthStatus | ServiceHealthStatus): boolean {
  const problematicStatuses = [
    ConnectionHealthStatus.TOKEN_EXPIRED,
    ConnectionHealthStatus.API_ERROR,
    ConnectionHealthStatus.RATE_LIMITED,
    ConnectionHealthStatus.NETWORK_ERROR,
    ConnectionHealthStatus.CONFIG_ERROR,
    ServiceHealthStatus.UNAUTHORIZED,
    ServiceHealthStatus.FORBIDDEN,
    ServiceHealthStatus.RATE_LIMITED,
    ServiceHealthStatus.QUOTA_EXCEEDED,
    ServiceHealthStatus.SERVICE_UNAVAILABLE,
    ServiceHealthStatus.TIMEOUT,
  ];

  return problematicStatuses.includes(status as any);
}

/**
 * Gets a user-friendly description for a health status.
 */
export function getHealthStatusDescription(
  status: ConnectionHealthStatus | ServiceHealthStatus
): string {
  // Connection-specific descriptions
  const connectionDescriptions: Record<ConnectionHealthStatus, string> = {
    [ConnectionHealthStatus.HEALTHY]: 'Connection is working normally',
    [ConnectionHealthStatus.TOKEN_EXPIRED]: 'Access token has expired and needs refresh',
    [ConnectionHealthStatus.API_ERROR]: 'API request failed - check service status',
    [ConnectionHealthStatus.RATE_LIMITED]: 'Rate limit exceeded - reduce request frequency',
    [ConnectionHealthStatus.INACTIVE]: 'Connection is inactive and needs reactivation',
    [ConnectionHealthStatus.NETWORK_ERROR]: 'Network connectivity issues',
    [ConnectionHealthStatus.CONFIG_ERROR]: 'Configuration error - check settings',
    [ConnectionHealthStatus.UNKNOWN]: 'Unable to determine connection status',
  };

  // Service-specific descriptions
  const serviceDescriptions: Record<ServiceHealthStatus, string> = {
    [ServiceHealthStatus.HEALTHY]: 'Service is accessible and responding',
    [ServiceHealthStatus.UNAUTHORIZED]: 'Authentication failed - check token validity',
    [ServiceHealthStatus.FORBIDDEN]: 'Access denied - insufficient permissions',
    [ServiceHealthStatus.NOT_FOUND]: 'Resource not found',
    [ServiceHealthStatus.RATE_LIMITED]: 'Rate limit exceeded',
    [ServiceHealthStatus.QUOTA_EXCEEDED]: 'API quota exceeded',
    [ServiceHealthStatus.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
    [ServiceHealthStatus.NETWORK_ERROR]: 'Network connectivity issues',
    [ServiceHealthStatus.TIMEOUT]: 'Request timed out',
    [ServiceHealthStatus.UNKNOWN]: 'Unable to determine service status',
  };

  // Check if it's a ConnectionHealthStatus first
  if (Object.values(ConnectionHealthStatus).includes(status as ConnectionHealthStatus)) {
    return connectionDescriptions[status as ConnectionHealthStatus] || 'Unknown status';
  }

  return serviceDescriptions[status as ServiceHealthStatus] || 'Unknown status';
}
