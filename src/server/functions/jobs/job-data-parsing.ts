/**
 * Job Data Parsing Server Functions
 *
 * Enhanced data parsing and validation for job-related data.
 * Uses midday-inspired parsing utilities for international formats.
 */

import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';
import { jobAssignments } from '@/../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/server/protected';
import { z } from 'zod';
import {
  parseJobDate,
  formatJobDate,
  parseJobTime,
  parseJobAmount,
  parseJobNumber,
  validateJobSchedulingData,
} from '@/lib/job-data-parsing';

// ============================================================================
// SCHEMAS
// ============================================================================

export const parseJobDataSchema = z.object({
  rawData: z.record(z.string(), z.any()), // Flexible input for various data formats
  parseOptions: z
    .object({
      dateFields: z.array(z.string()).default(['scheduledDate', 'createdDate', 'updatedDate']),
      timeFields: z.array(z.string()).default(['scheduledTime', 'startTime', 'endTime']),
      amountFields: z.array(z.string()).default(['amount', 'cost', 'price', 'total']),
      jobNumberFields: z.array(z.string()).default(['jobNumber', 'reference', 'id']),
      currency: z.string().default('AUD'),
    })
    .default(() => ({})),
});

export const validateAndParseJobDataSchema = z.object({
  jobData: z.object({
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    estimatedDuration: z.number().optional(),
    amount: z.string().optional(),
    jobNumber: z.string().optional(),
  }),
  options: z
    .object({
      strict: z.boolean().default(false),
      currency: z.string().default('AUD'),
    })
    .default(() => ({})),
});

export const bulkParseJobDataSchema = z.object({
  dataRows: z.array(z.record(z.string(), z.any())),
  mapping: z.object({
    jobNumber: z.string(),
    title: z.string(),
    customer: z.string(),
    scheduledDate: z.string(),
    scheduledTime: z.string().optional(),
    amount: z.string().optional(),
  }),
  options: z
    .object({
      skipInvalidRows: z.boolean().default(true),
      currency: z.string().default('AUD'),
      dateFormat: z.enum(['auto', 'australian', 'us', 'european']).default('auto'),
    })
    .default(() => ({})),
});

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parses raw job data using enhanced parsing utilities.
 */
export const parseJobData = createServerFn({ method: 'POST' })
  .inputValidator(parseJobDataSchema)
  .handler(async ({ data }) => {
    const _ctx = await withAuth();

    const parsedData: Record<string, any> = {};
    const parsingResults: Array<{
      field: string;
      originalValue: any;
      parsedValue: any;
      success: boolean;
      error?: string;
    }> = [];

    // Parse dates
    for (const field of data.parseOptions.dateFields) {
      const rawValue = data.rawData[field];
      if (rawValue !== undefined && rawValue !== null) {
        try {
          const parsedDate = parseJobDate(String(rawValue));
          const formattedDate = parsedDate
            ? formatJobDate(parsedDate.toISOString().split('T')[0])
            : null;

          parsedData[field] = formattedDate;
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: formattedDate,
            success: !!formattedDate,
            error: formattedDate ? undefined : 'Invalid date format',
          });
        } catch (error) {
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: null,
            success: false,
            error: error instanceof Error ? error.message : 'Date parsing error',
          });
        }
      }
    }

    // Parse times
    for (const field of data.parseOptions.timeFields) {
      const rawValue = data.rawData[field];
      if (rawValue !== undefined && rawValue !== null) {
        try {
          const parsedTime = parseJobTime(String(rawValue));

          parsedData[field] = parsedTime;
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: parsedTime,
            success: !!parsedTime,
            error: parsedTime ? undefined : 'Invalid time format',
          });
        } catch (error) {
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: null,
            success: false,
            error: error instanceof Error ? error.message : 'Time parsing error',
          });
        }
      }
    }

    // Parse amounts
    for (const field of data.parseOptions.amountFields) {
      const rawValue = data.rawData[field];
      if (rawValue !== undefined && rawValue !== null) {
        try {
          const parsedAmount = parseJobAmount(String(rawValue), {
            currency: data.parseOptions.currency,
          });

          parsedData[field] = parsedAmount?.value;
          parsedData[`${field}Currency`] = parsedAmount?.currency;
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: parsedAmount,
            success: !!parsedAmount,
            error: parsedAmount ? undefined : 'Invalid amount format',
          });
        } catch (error) {
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: null,
            success: false,
            error: error instanceof Error ? error.message : 'Amount parsing error',
          });
        }
      }
    }

    // Parse job numbers
    for (const field of data.parseOptions.jobNumberFields) {
      const rawValue = data.rawData[field];
      if (rawValue !== undefined && rawValue !== null) {
        try {
          const parsedJobNumber = parseJobNumber(String(rawValue));

          parsedData[field] = parsedJobNumber;
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: parsedJobNumber,
            success: !!parsedJobNumber,
            error: parsedJobNumber ? undefined : 'Invalid job number format',
          });
        } catch (error) {
          parsingResults.push({
            field,
            originalValue: rawValue,
            parsedValue: null,
            success: false,
            error: error instanceof Error ? error.message : 'Job number parsing error',
          });
        }
      }
    }

    // Copy remaining fields as-is
    for (const [key, value] of Object.entries(data.rawData)) {
      if (!(key in parsedData)) {
        parsedData[key] = value;
      }
    }

    return {
      success: true,
      parsedData,
      parsingResults,
      summary: {
        totalFields: Object.keys(data.rawData).length,
        parsedFields: parsingResults.filter((r) => r.success).length,
        failedFields: parsingResults.filter((r) => !r.success).length,
      },
    };
  });

/**
 * Validates and parses job scheduling data with enhanced error handling.
 */
export const validateAndParseJobSchedulingData = createServerFn({ method: 'POST' })
  .inputValidator(validateAndParseJobDataSchema)
  .handler(async ({ data }) => {
    const _ctx = await withAuth();

    const validation = validateJobSchedulingData({
      scheduledDate: data.jobData.scheduledDate,
      scheduledTime: data.jobData.scheduledTime,
      estimatedDuration: data.jobData.estimatedDuration,
    });

    let parsedAmount;
    if (data.jobData.amount) {
      try {
        parsedAmount = parseJobAmount(data.jobData.amount, {
          currency: data.options.currency,
        });
      } catch (error) {
        if (data.options.strict) {
          validation.errors.push('Invalid amount format');
        }
      }
    }

    let parsedJobNumber;
    if (data.jobData.jobNumber) {
      try {
        parsedJobNumber = parseJobNumber(data.jobData.jobNumber);
      } catch (error) {
        if (data.options.strict) {
          validation.errors.push('Invalid job number format');
        }
      }
    }

    return {
      ...validation,
      parsedData: {
        ...validation.normalizedData,
        amount: parsedAmount?.value,
        amountCurrency: parsedAmount?.currency,
        jobNumber: parsedJobNumber,
      },
    };
  });

// ============================================================================
// BULK PARSING FUNCTIONS
// ============================================================================

/**
 * Bulk parses job data from multiple rows with field mapping.
 */
export const bulkParseJobData = createServerFn({ method: 'POST' })
  .inputValidator(bulkParseJobDataSchema)
  .handler(async ({ data }) => {
    const _ctx = await withAuth();

    const results = {
      parsedRows: [] as Array<{
        originalRow: any;
        parsedData: any;
        isValid: boolean;
        errors: string[];
      }>,
      summary: {
        totalRows: data.dataRows.length,
        validRows: 0,
        invalidRows: 0,
        totalErrors: 0,
      },
    };

    for (const row of data.dataRows) {
      const parsedData: any = {};
      const errors: string[] = [];

      try {
        // Parse job number (required)
        const rawJobNumber = row[data.mapping.jobNumber];
        if (!rawJobNumber) {
          errors.push('Missing job number');
        } else {
          const parsedJobNumber = parseJobNumber(String(rawJobNumber));
          if (!parsedJobNumber) {
            errors.push('Invalid job number format');
          } else {
            parsedData.jobNumber = parsedJobNumber;
          }
        }

        // Parse title (required)
        const rawTitle = row[data.mapping.title];
        if (!rawTitle) {
          errors.push('Missing job title');
        } else {
          parsedData.title = String(rawTitle).trim();
        }

        // Parse customer (required)
        const rawCustomer = row[data.mapping.customer];
        if (!rawCustomer) {
          errors.push('Missing customer information');
        } else {
          parsedData.customerName = String(rawCustomer).trim();
        }

        // Parse scheduled date (required)
        const rawScheduledDate = row[data.mapping.scheduledDate];
        if (!rawScheduledDate) {
          errors.push('Missing scheduled date');
        } else {
          const parsedDate = parseJobDate(String(rawScheduledDate));
          if (!parsedDate) {
            errors.push('Invalid scheduled date format');
          } else {
            parsedData.scheduledDate = formatJobDate(parsedDate.toISOString().split('T')[0]);
          }
        }

        // Parse scheduled time (optional)
        if (data.mapping.scheduledTime) {
          const rawScheduledTime = row[data.mapping.scheduledTime];
          if (rawScheduledTime) {
            const parsedTime = parseJobTime(String(rawScheduledTime));
            if (parsedTime) {
              parsedData.scheduledTime = parsedTime;
            } else {
              errors.push('Invalid scheduled time format');
            }
          }
        }

        // Parse amount (optional)
        if (data.mapping.amount) {
          const rawAmount = row[data.mapping.amount];
          if (rawAmount) {
            const parsedAmount = parseJobAmount(String(rawAmount), {
              currency: data.options.currency,
            });
            if (parsedAmount) {
              parsedData.amount = parsedAmount.value;
              parsedData.currency = parsedAmount.currency;
            } else {
              errors.push('Invalid amount format');
            }
          }
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Parsing error');
      }

      const isValid =
        errors.length === 0 && parsedData.jobNumber && parsedData.title && parsedData.scheduledDate;

      results.parsedRows.push({
        originalRow: row,
        parsedData,
        isValid,
        errors,
      });

      if (isValid) {
        results.summary.validRows++;
      } else {
        results.summary.invalidRows++;
      }

      results.summary.totalErrors += errors.length;
    }

    return {
      success: true,
      results,
    };
  });

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Imports parsed job data into the database.
 */
export const importParsedJobData = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      parsedRows: z.array(
        z.object({
          parsedData: z.any(),
          isValid: z.boolean(),
        })
      ),
      options: z
        .object({
          skipInvalidRows: z.boolean().default(true),
          updateExisting: z.boolean().default(false),
          createCustomers: z.boolean().default(false),
        })
        .default(() => ({})),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const results = {
      imported: [] as Array<{ jobNumber: string; jobId: string }>,
      skipped: [] as Array<{ jobNumber: string; reason: string }>,
      errors: [] as Array<{ jobNumber: string; error: string }>,
    };

    for (const row of data.parsedRows) {
      if (!row.isValid && data.options.skipInvalidRows) {
        results.skipped.push({
          jobNumber: row.parsedData.jobNumber || 'unknown',
          reason: 'Invalid data',
        });
        continue;
      }

      try {
        const jobData = row.parsedData;

        // Check if job already exists
        const existingJob = await db
          .select({ id: jobAssignments.id })
          .from(jobAssignments)
          .where(
            and(
              eq(jobAssignments.organizationId, ctx.organizationId),
              eq(jobAssignments.jobNumber, jobData.jobNumber)
            )
          );

        if (existingJob.length > 0) {
          if (data.options.updateExisting) {
            // Update existing job (simplified - would need more fields)
            await db
              .update(jobAssignments)
              .set({
                title: jobData.title,
                scheduledDate: jobData.scheduledDate,
                scheduledTime: jobData.scheduledTime,
                updatedAt: new Date(),
              })
              .where(eq(jobAssignments.id, existingJob[0].id));

            results.imported.push({
              jobNumber: jobData.jobNumber,
              jobId: existingJob[0].id,
            });
          } else {
            results.skipped.push({
              jobNumber: jobData.jobNumber,
              reason: 'Job already exists',
            });
          }
          continue;
        }

        // Create new job (simplified - would need customer lookup/validation)
        // Note: This is incomplete - requires customerId and installerId which aren't in parsed data
        // TODO: Add customer lookup logic before production use
        const newJob = await db
          .insert(jobAssignments)
          .values({
            id: crypto.randomUUID(),
            organizationId: ctx.organizationId,
            jobNumber: jobData.jobNumber,
            title: jobData.title,
            scheduledDate: jobData.scheduledDate,
            scheduledTime: jobData.scheduledTime,
            status: 'scheduled',
            // customerId and installerId would need to be resolved from parsed data
            // This is a simplified example and will fail without these required fields
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any) // Using 'as any' because this is incomplete - needs customerId/installerId
          .returning({ id: jobAssignments.id, jobNumber: jobAssignments.jobNumber });

        results.imported.push({
          jobNumber: newJob[0].jobNumber,
          jobId: newJob[0].id,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({
          jobNumber: row.parsedData.jobNumber || 'unknown',
          error: errorMessage,
        });
      }
    }

    return {
      success: true,
      summary: {
        total: data.parsedRows.length,
        imported: results.imported.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      results,
    };
  });

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets parsing examples and supported formats.
 */
export const getJobDataParsingExamples = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    success: true,
    examples: {
      dates: {
        supported: [
          '2024-01-15',
          '15/01/2024', // Australian
          '01/15/2024', // US
          '15.01.2024', // European
          'Jan 15, 2024',
          '15 January 2024',
        ],
        parsed: '2024-01-15',
      },
      times: {
        supported: ['09:00', '9:00 AM', '9:00AM', '0900', '9AM'],
        parsed: '09:00',
      },
      amounts: {
        supported: ['$1,234.56', '€1.234,56', '1234.56', '1,234.56'],
        parsed: { value: 1234.56, currency: 'AUD' },
      },
      jobNumbers: {
        supported: ['JOB-1234', 'SOLAR-001', '2024001', 'JB001'],
        parsed: 'JOB-1234',
      },
    },
    formats: {
      australian: {
        date: 'DD/MM/YYYY',
        number: '1,234.56',
        currency: 'AUD',
      },
      us: {
        date: 'MM/DD/YYYY',
        number: '1,234.56',
        currency: 'USD',
      },
      european: {
        date: 'DD.MM.YYYY',
        number: '1.234,56',
        currency: 'EUR',
      },
    },
  };
});
