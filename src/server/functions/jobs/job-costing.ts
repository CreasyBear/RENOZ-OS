/**
 * Job Costing Server Functions
 *
 * Battery installation job cost calculation and profitability analysis.
 * Aggregates material costs (from job_materials) and labor costs (from time entries)
 * to compare against quoted prices.
 *
 * @see src/lib/schemas/job-costing.ts
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-008a
 */

import { createServerFn } from '@tanstack/react-start';
import { and, eq, gte, lte, sql, desc, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  jobAssignments,
  jobMaterials,
  jobTimeEntries,
  products,
  orders,
  customers,
  users,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  calculateJobCostSchema,
  getJobProfitabilitySchema,
  getJobCostingReportSchema,
  type JobCostResult,
  type JobProfitabilityResult,
  type JobCostingReportResult,
  type MaterialCost,
  type LaborCost,
} from '@/lib/schemas';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default labor rate per hour (in cents) - can be overridden per organization */
const DEFAULT_LABOR_RATE_CENTS = 7500; // $75.00/hr

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate hours worked from time entry timestamps.
 */
function calculateHoursWorked(startTime: Date, endTime: Date | null): number {
  if (!endTime) return 0;
  const ms = endTime.getTime() - startTime.getTime();
  return Math.max(0, ms / (1000 * 60 * 60)); // Convert ms to hours
}

/**
 * Determine profitability status from margin percentage.
 */
function getProfitabilityStatus(marginPercent: number): 'profitable' | 'break_even' | 'loss' {
  if (marginPercent > 1) return 'profitable';
  if (marginPercent >= -1) return 'break_even';
  return 'loss';
}

// ============================================================================
// CALCULATE JOB COST
// ============================================================================

/**
 * Calculate total cost for a job (materials + labor).
 */
export const calculateJobCost = createServerFn({ method: 'GET' })
  .inputValidator(calculateJobCostSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const laborRateCents = data.laborRateOverride
      ? Math.round(data.laborRateOverride * 100)
      : DEFAULT_LABOR_RATE_CENTS;

    // Verify job exists and belongs to organization
    const job = await db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.id, data.jobId),
          eq(jobAssignments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!job.length) {
      throw new Error('Job not found');
    }

    // Get material costs
    const materialsData = await db
      .select({
        productId: jobMaterials.productId,
        productName: products.name,
        productSku: products.sku,
        unitCost: jobMaterials.unitCost,
        quantityUsed: jobMaterials.quantityUsed,
      })
      .from(jobMaterials)
      .innerJoin(products, eq(jobMaterials.productId, products.id))
      .where(
        and(eq(jobMaterials.jobId, data.jobId), eq(jobMaterials.organizationId, ctx.organizationId))
      );

    const materials: MaterialCost[] = materialsData.map((m) => {
      const unitCostDollars = Number(m.unitCost) / 100;
      const qty = Number(m.quantityUsed) || 0;
      return {
        productId: m.productId,
        productName: m.productName,
        productSku: m.productSku,
        unitCost: unitCostDollars,
        quantityUsed: qty,
        totalCost: unitCostDollars * qty,
      };
    });

    const materialCost = materials.reduce((sum, m) => sum + m.totalCost, 0);

    // Get labor costs from time entries
    const timeEntriesData = await db
      .select({
        userId: jobTimeEntries.userId,
        userName: users.name,
        startTime: jobTimeEntries.startTime,
        endTime: jobTimeEntries.endTime,
      })
      .from(jobTimeEntries)
      .innerJoin(users, eq(jobTimeEntries.userId, users.id))
      .where(
        and(
          eq(jobTimeEntries.jobId, data.jobId),
          eq(jobTimeEntries.organizationId, ctx.organizationId),
          isNotNull(jobTimeEntries.endTime) // Only completed entries
        )
      );

    // Aggregate by user
    const laborByUser = new Map<string, { userName: string; hoursWorked: number }>();

    for (const entry of timeEntriesData) {
      const hours = calculateHoursWorked(entry.startTime, entry.endTime);
      const existing = laborByUser.get(entry.userId);
      if (existing) {
        existing.hoursWorked += hours;
      } else {
        laborByUser.set(entry.userId, {
          userName: entry.userName ?? 'Unknown',
          hoursWorked: hours,
        });
      }
    }

    const hourlyRate = laborRateCents / 100;
    const labor: LaborCost[] = Array.from(laborByUser.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      hoursWorked: Math.round(data.hoursWorked * 100) / 100, // Round to 2 decimals
      hourlyRate,
      totalCost: Math.round(data.hoursWorked * hourlyRate * 100) / 100,
    }));

    const laborCost = labor.reduce((sum, l) => sum + l.totalCost, 0);

    const result: JobCostResult = {
      jobId: data.jobId,
      materialCost: Math.round(materialCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      totalCost: Math.round((materialCost + laborCost) * 100) / 100,
      materials,
      labor,
    };

    return result;
  });

// ============================================================================
// GET JOB PROFITABILITY
// ============================================================================

/**
 * Get profitability analysis for a single job.
 */
export const getJobProfitability = createServerFn({ method: 'GET' })
  .inputValidator(getJobProfitabilitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get job with order and customer data
    const jobData = await db
      .select({
        id: jobAssignments.id,
        jobNumber: jobAssignments.jobNumber,
        title: jobAssignments.title,
        jobType: jobAssignments.jobType,
        status: jobAssignments.status,
        customerName: customers.name,
        orderTotal: orders.total,
      })
      .from(jobAssignments)
      .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
      .leftJoin(orders, eq(jobAssignments.orderId, orders.id))
      .where(
        and(
          eq(jobAssignments.id, data.jobId),
          eq(jobAssignments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!jobData.length) {
      throw new Error('Job not found');
    }

    const job = jobData[0];

    // Calculate costs
    const costResult = await calculateJobCost({
      data: {
        jobId: data.jobId,
        laborRateOverride: data.laborRateOverride,
      },
    });

    // Quoted amount from order (convert from cents to dollars)
    const quotedAmount = job.orderTotal ? Number(job.orderTotal) / 100 : 0;
    const actualCost = costResult.totalCost;
    const profit = quotedAmount - actualCost;
    const marginPercent = quotedAmount > 0 ? (profit / quotedAmount) * 100 : 0;

    const result: JobProfitabilityResult = {
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      customerName: job.customerName,
      jobType: job.jobType,
      status: job.status,
      quotedAmount: Math.round(quotedAmount * 100) / 100,
      actualCost: Math.round(actualCost * 100) / 100,
      materialCost: costResult.materialCost,
      laborCost: costResult.laborCost,
      profit: Math.round(profit * 100) / 100,
      marginPercent: Math.round(marginPercent * 10) / 10, // 1 decimal place
      profitabilityStatus: getProfitabilityStatus(marginPercent),
    };

    return result;
  });

// ============================================================================
// GET JOB COSTING REPORT
// ============================================================================

/**
 * Get job costing report with list of jobs and summary statistics.
 */
export const getJobCostingReport = createServerFn({ method: 'GET' })
  .inputValidator(getJobCostingReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Build query conditions
    const conditions = [eq(jobAssignments.organizationId, ctx.organizationId)];

    if (data.dateFrom) {
      conditions.push(gte(jobAssignments.scheduledDate, data.dateFrom));
    }
    if (data.dateTo) {
      conditions.push(lte(jobAssignments.scheduledDate, data.dateTo));
    }
    if (data.customerId) {
      conditions.push(eq(jobAssignments.customerId, data.customerId));
    }
    if (data.jobType) {
      conditions.push(eq(jobAssignments.jobType, data.jobType));
    }
    if (data.status) {
      conditions.push(eq(jobAssignments.status, data.status));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobAssignments)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    // Get jobs with pagination
    const jobsData = await db
      .select({
        id: jobAssignments.id,
        jobNumber: jobAssignments.jobNumber,
        title: jobAssignments.title,
        jobType: jobAssignments.jobType,
        status: jobAssignments.status,
        customerName: customers.name,
        orderTotal: orders.total,
      })
      .from(jobAssignments)
      .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
      .leftJoin(orders, eq(jobAssignments.orderId, orders.id))
      .where(and(...conditions))
      .orderBy(desc(jobAssignments.scheduledDate))
      .limit(data.limit)
      .offset(data.offset);

    // Batch fetch materials and time entries for all jobs to avoid N+1 queries
    const jobIds = jobsData.map((j) => j.id);

    const [allMaterials, allTimeEntries] = await Promise.all([
      // Batch fetch materials for all jobs
      jobIds.length > 0
        ? db
            .select({
              jobId: jobMaterials.jobId,
              productId: jobMaterials.productId,
              productName: products.name,
              productSku: products.sku,
              unitCost: jobMaterials.unitCost,
              quantityUsed: jobMaterials.quantityUsed,
            })
            .from(jobMaterials)
            .innerJoin(products, eq(jobMaterials.productId, products.id))
            .where(
              and(
                sql`${jobMaterials.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`,
                eq(jobMaterials.organizationId, ctx.organizationId)
              )
            )
        : [],
      // Batch fetch time entries for all jobs
      jobIds.length > 0
        ? db
            .select({
              jobId: jobTimeEntries.jobId,
              userId: jobTimeEntries.userId,
              userName: users.name,
              startTime: jobTimeEntries.startTime,
              endTime: jobTimeEntries.endTime,
            })
            .from(jobTimeEntries)
            .innerJoin(users, eq(jobTimeEntries.userId, users.id))
            .where(
              and(
                sql`${jobTimeEntries.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`,
                eq(jobTimeEntries.organizationId, ctx.organizationId),
                isNotNull(jobTimeEntries.endTime)
              )
            )
        : [],
    ]);

    // Group materials and time entries by job ID
    const materialsByJob = new Map<string, typeof allMaterials>();
    for (const material of allMaterials) {
      const existing = materialsByJob.get(material.jobId) || [];
      existing.push(material);
      materialsByJob.set(material.jobId, existing);
    }

    const timeEntriesByJob = new Map<string, typeof allTimeEntries>();
    for (const entry of allTimeEntries) {
      const existing = timeEntriesByJob.get(entry.jobId) || [];
      existing.push(entry);
      timeEntriesByJob.set(entry.jobId, existing);
    }

    // Calculate profitability for each job using batched data
    const jobs: JobProfitabilityResult[] = [];
    let totalQuoted = 0;
    let totalActualCost = 0;
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let profitableCount = 0;
    let breakEvenCount = 0;
    let lossCount = 0;

    const laborRateCents = data.laborRateOverride
      ? Math.round(data.laborRateOverride * 100)
      : DEFAULT_LABOR_RATE_CENTS;
    const hourlyRate = laborRateCents / 100;

    for (const job of jobsData) {
      // Calculate material cost from batched data
      const jobMaterialsData = materialsByJob.get(job.id) || [];
      const materialCost = jobMaterialsData.reduce((sum, m) => {
        const unitCostDollars = Number(m.unitCost) / 100;
        const qty = Number(m.quantityUsed) || 0;
        return sum + unitCostDollars * qty;
      }, 0);

      // Calculate labor cost from batched data
      const jobTimeEntriesData = timeEntriesByJob.get(job.id) || [];
      const laborByUser = new Map<string, { hoursWorked: number }>();
      for (const entry of jobTimeEntriesData) {
        const hours = calculateHoursWorked(entry.startTime, entry.endTime);
        const existing = laborByUser.get(entry.userId);
        if (existing) {
          existing.hoursWorked += hours;
        } else {
          laborByUser.set(entry.userId, { hoursWorked: hours });
        }
      }
      const laborCost = Array.from(laborByUser.values()).reduce(
        (sum, { hoursWorked }) => sum + hoursWorked * hourlyRate,
        0
      );

      const quotedAmount = job.orderTotal ? Number(job.orderTotal) / 100 : 0;
      const actualCost = materialCost + laborCost;
      const profit = quotedAmount - actualCost;
      const marginPercent = quotedAmount > 0 ? (profit / quotedAmount) * 100 : 0;
      const profitabilityStatus = getProfitabilityStatus(marginPercent);

      jobs.push({
        jobId: job.id,
        jobNumber: job.jobNumber,
        jobTitle: job.title,
        customerName: job.customerName,
        jobType: job.jobType,
        status: job.status,
        quotedAmount: Math.round(quotedAmount * 100) / 100,
        actualCost: Math.round(actualCost * 100) / 100,
        materialCost: Math.round(materialCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        profitabilityStatus,
      });

      // Accumulate totals
      totalQuoted += quotedAmount;
      totalActualCost += actualCost;
      totalMaterialCost += materialCost;
      totalLaborCost += laborCost;

      if (profitabilityStatus === 'profitable') profitableCount++;
      else if (profitabilityStatus === 'break_even') breakEvenCount++;
      else lossCount++;
    }

    const totalProfit = totalQuoted - totalActualCost;
    const averageMarginPercent = totalQuoted > 0 ? (totalProfit / totalQuoted) * 100 : 0;

    const result: JobCostingReportResult = {
      jobs,
      summary: {
        totalJobs: jobs.length,
        totalQuoted: Math.round(totalQuoted * 100) / 100,
        totalActualCost: Math.round(totalActualCost * 100) / 100,
        totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
        totalLaborCost: Math.round(totalLaborCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        averageMarginPercent: Math.round(averageMarginPercent * 10) / 10,
        profitableCount,
        breakEvenCount,
        lossCount,
      },
      pagination: {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + jobs.length < total,
      },
    };

    return result;
  });
