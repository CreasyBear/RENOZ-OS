/**
 * Forecast Engine
 *
 * Demand forecasting algorithms and utilities.
 *
 * Features:
 * - Moving average forecasting
 * - Exponential smoothing
 * - Seasonal adjustment
 * - Forecast accuracy metrics
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DemandDataPoint {
  date: Date;
  quantity: number;
}

export interface ForecastResult {
  date: Date;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number; // Mean Absolute Error
  bias: number; // Forecast Bias
  accuracy: number; // 100 - MAPE
}

export interface SeasonalFactors {
  monthly: number[]; // 12 factors for each month
  weekly: number[]; // 7 factors for each day of week
}

export type ForecastMethod =
  | "simple_average"
  | "moving_average"
  | "exponential_smoothing"
  | "double_exponential"
  | "seasonal";

// ============================================================================
// FORECASTING METHODS
// ============================================================================

/**
 * Simple Moving Average forecast.
 */
export function movingAverage(
  data: DemandDataPoint[],
  periods: number = 3
): number {
  if (data.length === 0) return 0;
  if (data.length < periods) return simpleAverage(data);

  const recentData = data.slice(-periods);
  return recentData.reduce((sum, d) => sum + d.quantity, 0) / periods;
}

/**
 * Simple Average of all historical data.
 */
export function simpleAverage(data: DemandDataPoint[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d.quantity, 0) / data.length;
}

/**
 * Exponential Smoothing forecast.
 */
export function exponentialSmoothing(
  data: DemandDataPoint[],
  alpha: number = 0.3
): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0].quantity;

  // Start with first value
  let forecast = data[0].quantity;

  // Apply exponential smoothing
  for (let i = 1; i < data.length; i++) {
    forecast = alpha * data[i].quantity + (1 - alpha) * forecast;
  }

  return forecast;
}

/**
 * Double Exponential Smoothing (Holt's method) for trend data.
 */
export function doubleExponentialSmoothing(
  data: DemandDataPoint[],
  alpha: number = 0.3,
  beta: number = 0.1
): { level: number; trend: number; forecast: number } {
  if (data.length === 0) return { level: 0, trend: 0, forecast: 0 };
  if (data.length === 1)
    return { level: data[0].quantity, trend: 0, forecast: data[0].quantity };

  // Initialize
  let level = data[0].quantity;
  let trend = data[1].quantity - data[0].quantity;

  // Apply double exponential smoothing
  for (let i = 1; i < data.length; i++) {
    const newLevel = alpha * data[i].quantity + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
    trend = newTrend;
  }

  return {
    level,
    trend,
    forecast: level + trend,
  };
}

/**
 * Calculate seasonal factors from historical data.
 */
export function calculateSeasonalFactors(
  data: DemandDataPoint[]
): SeasonalFactors {
  // Initialize accumulators
  const monthlyTotals: number[] = Array(12).fill(0);
  const monthlyCounts: number[] = Array(12).fill(0);
  const weeklyTotals: number[] = Array(7).fill(0);
  const weeklyCounts: number[] = Array(7).fill(0);

  // Calculate average
  const overallAvg = simpleAverage(data);
  if (overallAvg === 0) {
    return {
      monthly: Array(12).fill(1),
      weekly: Array(7).fill(1),
    };
  }

  // Accumulate by month and day of week
  data.forEach((d) => {
    const month = d.date.getMonth();
    const dayOfWeek = d.date.getDay();

    monthlyTotals[month] += d.quantity;
    monthlyCounts[month]++;
    weeklyTotals[dayOfWeek] += d.quantity;
    weeklyCounts[dayOfWeek]++;
  });

  // Calculate factors
  const monthly = monthlyTotals.map((total, i) =>
    monthlyCounts[i] > 0 ? total / monthlyCounts[i] / overallAvg : 1
  );

  const weekly = weeklyTotals.map((total, i) =>
    weeklyCounts[i] > 0 ? total / weeklyCounts[i] / overallAvg : 1
  );

  return { monthly, weekly };
}

/**
 * Apply seasonal adjustment to a forecast.
 */
export function applySeasonality(
  baseForecast: number,
  targetDate: Date,
  factors: SeasonalFactors
): number {
  const monthFactor = factors.monthly[targetDate.getMonth()];
  const dayFactor = factors.weekly[targetDate.getDay()];

  // Combine factors (multiplicative model)
  return baseForecast * monthFactor * dayFactor;
}

// ============================================================================
// FORECAST GENERATION
// ============================================================================

/**
 * Generate forecast for multiple periods ahead.
 */
export function generateForecast(
  data: DemandDataPoint[],
  periodsAhead: number,
  method: ForecastMethod = "exponential_smoothing",
  options: {
    alpha?: number;
    beta?: number;
    movingPeriods?: number;
    confidenceLevel?: number;
  } = {}
): ForecastResult[] {
  const {
    alpha = 0.3,
    beta = 0.1,
    movingPeriods = 3,
    confidenceLevel = 0.95,
  } = options;

  if (data.length === 0) {
    return [];
  }

  const results: ForecastResult[] = [];
  const lastDate = data[data.length - 1].date;

  // Calculate base forecast
  let baseForecast: number;
  let trend = 0;

  switch (method) {
    case "simple_average":
      baseForecast = simpleAverage(data);
      break;
    case "moving_average":
      baseForecast = movingAverage(data, movingPeriods);
      break;
    case "exponential_smoothing":
      baseForecast = exponentialSmoothing(data, alpha);
      break;
    case "double_exponential":
      const des = doubleExponentialSmoothing(data, alpha, beta);
      baseForecast = des.forecast;
      trend = des.trend;
      break;
    case "seasonal":
      baseForecast = exponentialSmoothing(data, alpha);
      break;
    default:
      baseForecast = simpleAverage(data);
  }

  // Calculate standard error for confidence intervals
  const stdError = calculateStandardError(data, baseForecast);
  const zScore = getZScore(confidenceLevel);

  // Get seasonal factors if using seasonal method
  const seasonalFactors =
    method === "seasonal" ? calculateSeasonalFactors(data) : null;

  // Generate forecasts
  for (let i = 1; i <= periodsAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    let predicted = baseForecast + trend * i;

    // Apply seasonality
    if (seasonalFactors) {
      predicted = applySeasonality(predicted, forecastDate, seasonalFactors);
    }

    // Ensure non-negative
    predicted = Math.max(0, predicted);

    // Confidence intervals widen with time
    const marginOfError = zScore * stdError * Math.sqrt(i);

    results.push({
      date: forecastDate,
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - marginOfError)),
      upper: Math.round(predicted + marginOfError),
      confidence: confidenceLevel,
    });
  }

  return results;
}

// ============================================================================
// ACCURACY METRICS
// ============================================================================

/**
 * Calculate forecast accuracy metrics.
 */
export function calculateAccuracy(
  actual: number[],
  predicted: number[]
): ForecastAccuracy {
  if (actual.length === 0 || actual.length !== predicted.length) {
    return { mape: 0, rmse: 0, mae: 0, bias: 0, accuracy: 100 };
  }

  let sumAPE = 0;
  let sumSE = 0;
  let sumAE = 0;
  let sumError = 0;
  let validCount = 0;

  for (let i = 0; i < actual.length; i++) {
    const error = predicted[i] - actual[i];
    const absError = Math.abs(error);

    sumError += error;
    sumAE += absError;
    sumSE += error * error;

    if (actual[i] !== 0) {
      sumAPE += (absError / actual[i]) * 100;
      validCount++;
    }
  }

  const n = actual.length;
  const mape = validCount > 0 ? sumAPE / validCount : 0;
  const rmse = Math.sqrt(sumSE / n);
  const mae = sumAE / n;
  const bias = sumError / n;

  return {
    mape: Math.round(mape * 10) / 10,
    rmse: Math.round(rmse * 10) / 10,
    mae: Math.round(mae * 10) / 10,
    bias: Math.round(bias * 10) / 10,
    accuracy: Math.max(0, Math.round((100 - mape) * 10) / 10),
  };
}

/**
 * Get accuracy rating based on MAPE.
 */
export function getAccuracyRating(
  mape: number
): "excellent" | "good" | "acceptable" | "poor" {
  if (mape <= 10) return "excellent";
  if (mape <= 20) return "good";
  if (mape <= 30) return "acceptable";
  return "poor";
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate standard error of forecast.
 */
function calculateStandardError(
  data: DemandDataPoint[],
  forecast: number
): number {
  if (data.length < 2) return 0;

  const sumSqDiff = data.reduce(
    (sum, d) => sum + Math.pow(d.quantity - forecast, 2),
    0
  );

  return Math.sqrt(sumSqDiff / (data.length - 1));
}

/**
 * Get Z-score for confidence level.
 */
function getZScore(confidenceLevel: number): number {
  // Common confidence levels
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  return zScores[confidenceLevel] ?? 1.96;
}

/**
 * Detect trend direction from data.
 */
export function detectTrend(
  data: DemandDataPoint[]
): "increasing" | "decreasing" | "stable" {
  if (data.length < 3) return "stable";

  // Use linear regression slope
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  data.forEach((d, i) => {
    sumX += i;
    sumY += d.quantity;
    sumXY += i * d.quantity;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgY = sumY / n;

  // Normalize slope by average to get percentage change
  const normalizedSlope = avgY > 0 ? slope / avgY : 0;

  if (normalizedSlope > 0.02) return "increasing";
  if (normalizedSlope < -0.02) return "decreasing";
  return "stable";
}

/**
 * Calculate days of inventory remaining.
 */
export function calculateDaysOfInventory(
  currentStock: number,
  averageDailyDemand: number
): number | null {
  if (averageDailyDemand <= 0) return null;
  return Math.floor(currentStock / averageDailyDemand);
}

/**
 * Recommend forecast method based on data characteristics.
 */
export function recommendForecastMethod(
  data: DemandDataPoint[]
): ForecastMethod {
  if (data.length < 7) return "simple_average";
  if (data.length < 30) return "moving_average";

  // Check for trend
  const trend = detectTrend(data);
  if (trend !== "stable") return "double_exponential";

  // Check for seasonality (rough check)
  const factors = calculateSeasonalFactors(data);
  const monthlyVariance =
    factors.monthly.reduce((sum, f) => sum + Math.pow(f - 1, 2), 0) / 12;

  if (monthlyVariance > 0.1) return "seasonal";

  return "exponential_smoothing";
}

export default {
  movingAverage,
  simpleAverage,
  exponentialSmoothing,
  doubleExponentialSmoothing,
  calculateSeasonalFactors,
  applySeasonality,
  generateForecast,
  calculateAccuracy,
  getAccuracyRating,
  detectTrend,
  calculateDaysOfInventory,
  recommendForecastMethod,
};
