/**
 * Job Batch Processing Utilities
 *
 * Efficient batch operations for job data with error recovery and progress tracking.
 * Adapted from midday job batch processing patterns.
 */

import { logger } from '@/lib/logger';
import type { JsonValue } from '@/lib/schemas/_shared/patterns';
import type {
  JobBatchOperation,
  JobBatchResult,
  JobRollbackData,
} from '@/lib/schemas/jobs/job-batch';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchProcessingOptions<T> {
  items: T[];
  batchSize: number;
  concurrency?: number; // Number of concurrent batches
  onProgress?: (completed: number, total: number, currentBatch: T[]) => void;
  onError?: (error: Error, item: T, batchIndex: number) => void;
  continueOnError?: boolean; // Continue processing other batches if one fails
}

export interface BatchProcessingResult<T, R> {
  successful: R[];
  failed: { item: T; error: Error }[];
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  duration: number;
}

// ============================================================================
// CORE BATCH PROCESSING
// ============================================================================

/**
 * Process items in batches with configurable concurrency and error handling.
 * Adapted from midday batch processing with job-specific enhancements.
 */
export async function processJobBatch<T, R>(
  options: BatchProcessingOptions<T> & {
    processor: (batch: T[]) => Promise<R[]>;
  }
): Promise<BatchProcessingResult<T, R>> {
  const {
    items,
    batchSize,
    concurrency = 1,
    processor,
    onProgress,
    onError,
    continueOnError = true,
  } = options;

  const startTime = Date.now();
  const batches: T[][] = [];
  const results: BatchProcessingResult<T, R> = {
    successful: [],
    failed: [],
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    duration: 0,
  };

  // Split items into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchSlice = batches.slice(i, i + concurrency);

    const batchPromises = batchSlice.map(async (batch, batchOffset) => {
      const batchIndex = i + batchOffset;

      try {
        const batchResults = await processor(batch);

        results.successful.push(...batchResults);
        results.totalSuccessful += batchResults.length;
        results.totalProcessed += batch.length;

        onProgress?.(results.totalProcessed, items.length, batch);

        return batchResults;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        onError?.(err, batch[0], batchIndex); // Report error with first item of batch

        if (!continueOnError) {
          throw err;
        }

        // Add all items in this batch to failed
        batch.forEach((item) => {
          results.failed.push({ item, error: err });
        });

        results.totalFailed += batch.length;
        results.totalProcessed += batch.length;

        onProgress?.(results.totalProcessed, items.length, batch);

        return [];
      }
    });

    await Promise.allSettled(batchPromises);
  }

  results.duration = Date.now() - startTime;
  return results;
}

// ============================================================================
// JOB-SPECIFIC BATCH OPERATIONS
// ============================================================================

export type { JobBatchOperation, JobBatchResult };

/**
 * Process job operations in batches with rollback support.
 */
export async function processJobOperations(
  operations: JobBatchOperation[],
  options: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
    onError?: (error: Error, operation: JobBatchOperation) => void;
    enableRollback?: boolean;
  } = {}
): Promise<{
  results: JobBatchResult[];
  rollbackData?: JobRollbackData[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
}> {
  const { batchSize = 10, onProgress, onError, enableRollback = false } = options;

  const rollbackData: JobRollbackData[] = [];
  const results: JobBatchResult[] = [];
  const startTime = Date.now();

  // Group operations by type for optimized processing
  const operationsByType = operations.reduce(
    (acc, op) => {
      if (!acc[op.type]) acc[op.type] = [];
      acc[op.type].push(op);
      return acc;
    },
    {} as Record<string, JobBatchOperation[]>
  );

  // Process each operation type
  for (const [, typeOperations] of Object.entries(operationsByType)) {
    const batchResult = await processJobBatch({
      items: typeOperations,
      batchSize,
      processor: async (batch) => {
        // Process batch based on operation type
        const batchResults: JobBatchResult[] = [];

        for (const operation of batch) {
          const operationStart = Date.now();

          try {
            let result: Record<string, unknown> | undefined;

            // Route to appropriate handler based on operation type
            switch (operation.type) {
              case 'create':
                result = (await handleJobCreate(operation.data)) as Record<string, unknown>;
                break;
              case 'update':
                result = (await handleJobUpdate(operation.data)) as Record<string, unknown>;
                break;
              case 'delete':
                result = (await handleJobDelete(operation.data)) as Record<string, unknown>;
                break;
              case 'reschedule':
                result = (await handleJobReschedule(operation.data)) as Record<string, unknown>;
                break;
              case 'assign':
                result = (await handleJobAssign(operation.data)) as Record<string, unknown>;
                break;
              default:
                throw new Error(`Unknown operation type: ${operation.type}`);
            }

            // Store rollback data if enabled
            if (enableRollback) {
              rollbackData.push({
                operationId: operation.id,
                type: operation.type,
                originalData: operation.data as Record<string, JsonValue>,
                result: result as Record<string, JsonValue>,
              });
            }

            batchResults.push({
              operationId: operation.id,
              success: true,
              result: result as Record<string, JsonValue>,
              duration: Date.now() - operationStart,
            });
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            onError?.(err, operation);

            batchResults.push({
              operationId: operation.id,
              success: false,
              error: err.message,
              duration: Date.now() - operationStart,
            });
          }
        }

        return batchResults;
      },
      onProgress: (completed) => {
        onProgress?.(results.length + completed, operations.length);
      },
      continueOnError: true,
    });

    results.push(...batchResult.successful);
  }

  const summary = {
    total: operations.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    duration: Date.now() - startTime,
  };

  return {
    results,
    rollbackData: enableRollback ? rollbackData : undefined,
    summary,
  };
}


async function handleJobCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Placeholder - integrate with actual job creation logic
  logger.debug('Creating job', { data });
  return { id: `job-${Date.now()}`, ...data };
}

async function handleJobUpdate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Placeholder - integrate with actual job update logic
  logger.debug('Updating job', { data });
  return { updated: true, ...data };
}

async function handleJobDelete(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Placeholder - integrate with actual job deletion logic
  logger.debug('Deleting job', { data });
  return { deleted: true, ...data };
}

async function handleJobReschedule(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Placeholder - integrate with actual job rescheduling logic
  logger.debug('Rescheduling job', { data });
  return { rescheduled: true, ...data };
}

async function handleJobAssign(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Placeholder - integrate with actual job assignment logic
  logger.debug('Assigning job', { data });
  return { assigned: true, ...data };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Split large dataset into optimized batches for database operations.
 */
export function createOptimizedBatches<T>(
  items: T[],
  options: {
    maxBatchSize?: number;
    maxConcurrentBatches?: number;
    itemSizeEstimator?: (item: T) => number;
    maxTotalSize?: number;
  } = {}
): T[][] {
  const {
    maxBatchSize = 100,
    itemSizeEstimator = () => 1,
    maxTotalSize = 1000,
  } = options;

  const batches: T[][] = [];
  let currentBatch: T[] = [];
  let currentBatchSize = 0;

  for (const item of items) {
    const itemSize = itemSizeEstimator(item);

    // Check if adding this item would exceed batch limits
    if (currentBatch.length >= maxBatchSize || currentBatchSize + itemSize > maxTotalSize) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
    }

    currentBatch.push(item);
    currentBatchSize += itemSize;
  }

  // Add remaining items
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Validate batch operation data before processing.
 */
export function validateBatchOperations(operations: JobBatchOperation[]): {
  isValid: boolean;
  errors: string[];
  validOperations: JobBatchOperation[];
} {
  const errors: string[] = [];
  const validOperations: JobBatchOperation[] = [];

  const validTypes = ['create', 'update', 'delete', 'reschedule', 'assign'];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    if (!op.id) {
      errors.push(`Operation ${i}: Missing operation ID`);
      continue;
    }

    if (!validTypes.includes(op.type)) {
      errors.push(`Operation ${i}: Invalid operation type '${op.type}'`);
      continue;
    }

    if (!op.data) {
      errors.push(`Operation ${i}: Missing operation data`);
      continue;
    }

    validOperations.push(op);
  }

  return {
    isValid: errors.length === 0,
    errors,
    validOperations,
  };
}
