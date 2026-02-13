/**
 * Customer Detail Extended Server Functions
 *
 * Extended data fetching for customer detail view including:
 * - Alerts (credit hold, overdue orders, expiring warranties, open claims)
 * - Active items (quotes, orders, projects, claims in progress)
 * - Order summary metrics
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Types imported from schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, inArray, lt, isNull, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers,
  orders,
  opportunities,
  projects,
  warranties,
  warrantyClaims,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  customerDetailParamsSchema,
  type CustomerAlert,
  type CustomerAlertsResponse,
  type ActiveQuote,
  type CustomerActiveItems,
  type CustomerOrderSummary,
} from '@/lib/schemas/customers';

// ============================================================================
// CUSTOMER ALERTS
// ============================================================================

/**
 * Get alerts for a customer
 *
 * Alert types:
 * - credit_hold: Customer is on credit hold
 * - overdue_orders: Orders with overdue payment
 * - expiring_warranties: Warranties expiring within 90 days
 * - open_claims: Unresolved warranty claims
 * - stale_opportunities: Opportunities past expected close date
 */
export const getCustomerAlerts = createServerFn({ method: 'GET' })
  .inputValidator(customerDetailParamsSchema)
  .handler(async ({ data }): Promise<CustomerAlertsResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const { customerId } = data;

    const alerts: CustomerAlert[] = [];

    // Fetch all alert data in parallel
    const [
      customerData,
      overdueOrders,
      expiringWarranties,
      openClaims,
      staleOpportunities,
    ] = await Promise.all([
      // Customer credit hold status
      db
        .select({
          creditHold: customers.creditHold,
          creditHoldReason: customers.creditHoldReason,
          creditLimit: customers.creditLimit,
          healthScore: customers.healthScore,
        })
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1),

      // Overdue orders
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          balanceDue: orders.balanceDue,
          dueDate: orders.dueDate,
          total: orders.total,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customerId),
            eq(orders.organizationId, ctx.organizationId),
            eq(orders.paymentStatus, 'overdue'),
            isNull(orders.deletedAt),
            notInArray(orders.status, ['draft', 'cancelled'])
          )
        )
        .limit(5),

      // Expiring warranties (within 90 days)
      db
        .select({
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          expiryDate: warranties.expiryDate,
        })
        .from(warranties)
        .where(
          and(
            eq(warranties.customerId, customerId),
            eq(warranties.organizationId, ctx.organizationId),
            eq(warranties.status, 'expiring_soon')
          )
        )
        .limit(5),

      // Open warranty claims
      db
        .select({
          id: warrantyClaims.id,
          claimNumber: warrantyClaims.claimNumber,
          status: warrantyClaims.status,
          submittedAt: warrantyClaims.submittedAt,
        })
        .from(warrantyClaims)
        .where(
          and(
            eq(warrantyClaims.customerId, customerId),
            eq(warrantyClaims.organizationId, ctx.organizationId),
            inArray(warrantyClaims.status, ['submitted', 'under_review'])
          )
        )
        .limit(5),

      // Stale opportunities (past expected close date)
      db
        .select({
          id: opportunities.id,
          title: opportunities.title,
          stage: opportunities.stage,
          value: opportunities.value,
          expectedCloseDate: opportunities.expectedCloseDate,
        })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.customerId, customerId),
            eq(opportunities.organizationId, ctx.organizationId),
            notInArray(opportunities.stage, ['won', 'lost']),
            lt(opportunities.expectedCloseDate, sql`CURRENT_DATE`),
            isNull(opportunities.deletedAt)
          )
        )
        .limit(5),
    ]);

    const customer = customerData[0];

    // Credit Hold Alert
    if (customer?.creditHold) {
      alerts.push({
        id: 'credit-hold',
        type: 'credit_hold',
        severity: 'critical',
        title: 'Credit Hold',
        message: customer.creditHoldReason || 'Customer is on credit hold',
        action: {
          label: 'Review Account',
          href: `/customers/${customerId}/edit`,
        },
      });
    }

    // Overdue Orders Alert
    if (overdueOrders.length > 0) {
      const totalOverdue = overdueOrders.reduce(
        (sum, o) => sum + Number(o.balanceDue ?? 0),
        0
      );
      alerts.push({
        id: 'overdue-orders',
        type: 'overdue_orders',
        severity: 'critical',
        title: `${overdueOrders.length} Overdue Invoice${overdueOrders.length > 1 ? 's' : ''}`,
        message: `$${totalOverdue.toLocaleString()} outstanding`,
        action: {
          label: 'View Orders',
          href: `/orders?customerId=${customerId}&paymentStatus=overdue`,
        },
        data: {
          count: overdueOrders.length,
          totalAmount: totalOverdue,
          orders: overdueOrders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            amount: Number(o.balanceDue ?? 0),
          })),
        },
      });
    }

    // Expiring Warranties Alert
    if (expiringWarranties.length > 0) {
      alerts.push({
        id: 'expiring-warranties',
        type: 'expiring_warranties',
        severity: 'warning',
        title: `${expiringWarranties.length} Warranty${expiringWarranties.length > 1 ? ' Expiring' : ' Expires'} Soon`,
        message: 'Warranties expiring within 90 days',
        action: {
          label: 'View Warranties',
          href: `/support/warranties?customerId=${customerId}`,
        },
        data: {
          count: expiringWarranties.length,
          warranties: expiringWarranties.map((w) => ({
            id: w.id,
            warrantyNumber: w.warrantyNumber,
            expiryDate: w.expiryDate instanceof Date ? w.expiryDate.toISOString() : String(w.expiryDate),
          })),
        },
      });
    }

    // Open Claims Alert
    if (openClaims.length > 0) {
      alerts.push({
        id: 'open-claims',
        type: 'open_claims',
        severity: 'warning',
        title: `${openClaims.length} Open Claim${openClaims.length > 1 ? 's' : ''}`,
        message: 'Warranty claims awaiting resolution',
        action: {
          label: 'View Claims',
          href: `/support/claims?customerId=${customerId}`,
        },
        data: {
          count: openClaims.length,
          claims: openClaims.map((c) => ({
            id: c.id,
            claimNumber: c.claimNumber,
            status: c.status,
          })),
        },
      });
    }

    // Stale Opportunities Alert
    if (staleOpportunities.length > 0) {
      const totalValue = staleOpportunities.reduce(
        (sum, o) => sum + Number(o.value ?? 0),
        0
      );
      alerts.push({
        id: 'stale-opportunities',
        type: 'stale_opportunities',
        severity: 'warning',
        title: `${staleOpportunities.length} Overdue Quote${staleOpportunities.length > 1 ? 's' : ''}`,
        message: `$${totalValue.toLocaleString()} in pipeline past expected close`,
        action: {
          label: 'View Pipeline',
          href: `/pipeline?customerId=${customerId}`,
        },
        data: {
          count: staleOpportunities.length,
          totalValue,
        },
      });
    }

    // Low Health Score Alert
    const LOW_HEALTH_THRESHOLD = 40;
    if (customer?.healthScore !== null && customer.healthScore < LOW_HEALTH_THRESHOLD) {
      alerts.push({
        id: 'low-health',
        type: 'low_health_score',
        severity: 'info',
        title: 'At-Risk Customer',
        message: `Health score: ${customer.healthScore}/100`,
        action: {
          label: 'View Analytics',
          href: `/customers/${customerId}?tab=overview`,
        },
      });
    }

    return {
      alerts,
      hasAlerts: alerts.length > 0,
      criticalCount: alerts.filter((a) => a.severity === 'critical').length,
      warningCount: alerts.filter((a) => a.severity === 'warning').length,
    };
  });

// ============================================================================
// CUSTOMER ACTIVE ITEMS
// ============================================================================

/**
 * Get active items for a customer (in-progress work)
 *
 * - Quotes: stage NOT IN ('won', 'lost')
 * - Orders: status NOT IN ('delivered', 'cancelled', 'draft')
 * - Projects: status IN ('approved', 'in_progress')
 * - Claims: status IN ('submitted', 'under_review', 'approved')
 */
export const getCustomerActiveItems = createServerFn({ method: 'GET' })
  .inputValidator(customerDetailParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const { customerId } = data;

    // Fetch all active items in parallel
    const [activeQuotes, activeOrders, activeProjects, activeClaims] =
      await Promise.all([
        // Active quotes/opportunities
        db
          .select({
            id: opportunities.id,
            title: opportunities.title,
            stage: opportunities.stage,
            value: opportunities.value,
            probability: opportunities.probability,
            expectedCloseDate: opportunities.expectedCloseDate,
            daysInStage: opportunities.daysInStage,
          })
          .from(opportunities)
          .where(
            and(
              eq(opportunities.customerId, customerId),
              eq(opportunities.organizationId, ctx.organizationId),
              notInArray(opportunities.stage, ['won', 'lost']),
              isNull(opportunities.deletedAt)
            )
          )
          .orderBy(sql`${opportunities.expectedCloseDate} ASC NULLS LAST`)
          .limit(10),

        // Active orders
        db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            paymentStatus: orders.paymentStatus,
            total: orders.total,
            orderDate: orders.orderDate,
          })
          .from(orders)
          .where(
            and(
              eq(orders.customerId, customerId),
              eq(orders.organizationId, ctx.organizationId),
              notInArray(orders.status, ['delivered', 'cancelled', 'draft']),
              isNull(orders.deletedAt)
            )
          )
          .orderBy(sql`${orders.orderDate} DESC`)
          .limit(10),

        // Active projects
        db
          .select({
            id: projects.id,
            projectNumber: projects.projectNumber,
            title: projects.title,
            status: projects.status,
            progressPercent: projects.progressPercent,
            targetCompletionDate: projects.targetCompletionDate,
          })
          .from(projects)
          .where(
            and(
              eq(projects.customerId, customerId),
              eq(projects.organizationId, ctx.organizationId),
              inArray(projects.status, ['approved', 'in_progress'])
            )
          )
          .orderBy(sql`${projects.targetCompletionDate} ASC NULLS LAST`)
          .limit(10),

        // Active claims
        db
          .select({
            id: warrantyClaims.id,
            claimNumber: warrantyClaims.claimNumber,
            status: warrantyClaims.status,
            claimType: warrantyClaims.claimType,
            submittedAt: warrantyClaims.submittedAt,
          })
          .from(warrantyClaims)
          .where(
            and(
              eq(warrantyClaims.customerId, customerId),
              eq(warrantyClaims.organizationId, ctx.organizationId),
              inArray(warrantyClaims.status, [
                'submitted',
                'under_review',
                'approved',
              ])
            )
          )
          .orderBy(sql`${warrantyClaims.submittedAt} DESC`)
          .limit(10),
      ]);

    // Map quotes with days in stage from the stored column
    const quotesWithDays: ActiveQuote[] = activeQuotes.map((q) => ({
      id: q.id,
      title: q.title,
      stage: q.stage,
      value: Number(q.value ?? 0),
      probability: q.probability ?? 0,
      expectedCloseDate: q.expectedCloseDate,
      daysInStage: q.daysInStage ?? 0,
    }));

    return {
      quotes: quotesWithDays,
      orders: activeOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total ?? 0),
        orderDate: o.orderDate,
      })),
      projects: activeProjects.map((p) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        title: p.title,
        status: p.status,
        progressPercent: p.progressPercent ?? 0,
        targetCompletionDate: p.targetCompletionDate,
      })),
      claims: activeClaims.map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        status: c.status,
        claimType: c.claimType,
        submittedAt: c.submittedAt instanceof Date ? c.submittedAt.toISOString() : String(c.submittedAt),
      })),
      counts: {
        quotes: activeQuotes.length,
        orders: activeOrders.length,
        projects: activeProjects.length,
        claims: activeClaims.length,
      },
    } satisfies CustomerActiveItems;
  });

// ============================================================================
// CUSTOMER ORDER SUMMARY
// ============================================================================

/**
 * Get order summary for customer detail view
 */
export const getCustomerOrderSummary = createServerFn({ method: 'GET' })
  .inputValidator(customerDetailParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const { customerId } = data;

    // Run queries in parallel
    const [summaryResult, recentOrders, statusBreakdown] = await Promise.all([
      // Aggregate metrics
      db
        .select({
          totalOrders: sql<number>`COUNT(*)::int`,
          totalValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
          outstandingBalance: sql<number>`COALESCE(SUM(${orders.balanceDue}), 0)::numeric`,
          averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)::numeric`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customerId),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt),
            notInArray(orders.status, ['draft', 'cancelled'])
          )
        ),

      // Recent orders
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          orderDate: orders.orderDate,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customerId),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt),
            notInArray(orders.status, ['draft', 'cancelled'])
          )
        )
        .orderBy(sql`${orders.orderDate} DESC`)
        .limit(5),

      // Status breakdown
      db
        .select({
          status: orders.status,
          count: sql<number>`COUNT(*)::int`,
          totalValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customerId),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt),
            notInArray(orders.status, ['draft', 'cancelled'])
          )
        )
        .groupBy(orders.status),
    ]);

    const summary = summaryResult[0] ?? {
      totalOrders: 0,
      totalValue: 0,
      outstandingBalance: 0,
      averageOrderValue: 0,
    };

    return {
      totalOrders: Number(summary.totalOrders),
      totalValue: Number(summary.totalValue),
      outstandingBalance: Number(summary.outstandingBalance),
      averageOrderValue: Number(summary.averageOrderValue),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total ?? 0),
        orderDate: o.orderDate,
      })),
      ordersByStatus: statusBreakdown.map((s) => ({
        status: s.status,
        count: Number(s.count),
        totalValue: Number(s.totalValue),
      })),
    } satisfies CustomerOrderSummary;
  });
