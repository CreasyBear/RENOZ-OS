/**
 * Web Vitals Monitoring
 *
 * Tracks Core Web Vitals and other performance metrics using the web-vitals library.
 * Reports metrics to console in development and can be extended to send to analytics.
 *
 * @see https://web.dev/vitals/
 * @see https://github.com/GoogleChrome/web-vitals
 */
import { 
  onCLS, 
  onINP, 
  onLCP, 
  onTTFB, 
  onFCP,
  type Metric 
} from 'web-vitals';
import { logger } from '@/lib/logger';

/**
 * Web Vitals metric thresholds based on Core Web Vitals
 * @see https://web.dev/vitals/#core-web-vitals
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },    // Largest Contentful Paint (ms)
  INP: { good: 200, poor: 500 },       // Interaction to Next Paint (ms)
  CLS: { good: 0.1, poor: 0.25 },      // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },     // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },     // Time to First Byte (ms)
} as const;

type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Get rating for a metric value
 */
function getMetricRating(
  name: keyof typeof THRESHOLDS,
  value: number
): MetricRating {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Get emoji indicator for rating (for dev console readability)
 */
function getRatingEmoji(rating: MetricRating): string {
  switch (rating) {
    case 'good': return '✅';
    case 'needs-improvement': return '⚠️';
    case 'poor': return '❌';
  }
}

/**
 * Report metric to console in development
 */
function reportToConsole(metric: Metric) {
  if (!import.meta.env.DEV) return;

  const rating = getMetricRating(metric.name as keyof typeof THRESHOLDS, metric.value);

  logger.debug(`[Web Vitals] ${getRatingEmoji(rating)} ${metric.name}`, {
    name: metric.name,
    value: Math.round(metric.value),
    unit: metric.name === 'CLS' ? '' : 'ms',
    rating,
  });
}

/**
 * Report metric to analytics endpoint
 * Extend this function to send metrics to your analytics service
 */
function reportToAnalytics(_metric: Metric) {
  // Example: Send to analytics endpoint
  // const body = JSON.stringify({
  //   name: metric.name,
  //   value: metric.value,
  //   rating: getMetricRating(metric.name as keyof typeof THRESHOLDS, metric.value),
  //   id: metric.id,
  //   navigationType: metric.navigationType,
  // });
  // 
  // navigator.sendBeacon?.('/analytics/vitals', body) ||
  //   fetch('/analytics/vitals', { body, method: 'POST', keepalive: true });
}

/**
 * Handle metric reporting
 */
function handleMetric(metric: Metric) {
  reportToConsole(metric);
  reportToAnalytics(metric);
}

/**
 * Initialize Web Vitals monitoring
 * Call this once in your app's entry point
 */
export function initWebVitals() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Core Web Vitals
  onLCP(handleMetric);  // Largest Contentful Paint
  onINP(handleMetric);  // Interaction to Next Paint
  onCLS(handleMetric);  // Cumulative Layout Shift
  
  // Additional metrics
  onFCP(handleMetric);  // First Contentful Paint
  onTTFB(handleMetric); // Time to First Byte

  if (import.meta.env.DEV) {
    logger.debug('[Web Vitals] Monitoring initialized');
  }
}

/**
 * Hook to get real-time Web Vitals updates
 * Useful for development or real-time dashboards
 */
export function useWebVitals() {
  // This could be extended to provide reactive metrics
  // For now, just initializes monitoring
  initWebVitals();
}

/**
 * Measure custom performance mark
 * Use for tracking specific user interactions or feature performance
 */
export function markPerformance(markName: string) {
  if (typeof window === 'undefined') return;
  
  performance.mark(markName);
  
  if (import.meta.env.DEV) {
    logger.debug('[Performance] Mark', { markName });
  }
}

/**
 * Measure duration between two marks
 */
export function measurePerformance(measureName: string, startMark: string, endMark?: string) {
  if (typeof window === 'undefined') return null;
  
  try {
    const measure = performance.measure(measureName, startMark, endMark);
    
    if (import.meta.env.DEV) {
      logger.debug('[Performance] Measure', { measureName, durationMs: Math.round(measure.duration) });
    }
    
    return measure.duration;
  } catch (e) {
    logger.warn('[Performance] Failed to measure', { measureName, error: String(e) });
    return null;
  }
}

/**
 * Observe long tasks (performance optimization indicator)
 * Long tasks can block the main thread and cause jank
 */
export function observeLongTasks() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Long tasks > 50ms can cause jank
        if (entry.duration > 50) {
          logger.warn('[Performance] Long task detected', {
            durationMs: Math.round(entry.duration),
            name: entry.name,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // Long task observer not supported
  }
}
