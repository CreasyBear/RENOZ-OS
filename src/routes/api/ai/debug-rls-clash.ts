/**
 * Debug endpoint to verify whether RLS context affects query visibility.
 *
 * GET /api/ai/debug-rls-clash?orgId=<uuid>
 *
 * DEV ONLY. Disabled in production.
 */
import { and, count, eq, isNull, notInArray, sql, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, orders } from 'drizzle/schema'

type Range = '7d' | '30d' | '90d' | '365d' | 'all'

function getStartDate(range: Range, now: Date): Date | null {
  const d = new Date(now)
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 7)
      return d
    case '30d':
      d.setDate(d.getDate() - 30)
      return d
    case '90d':
      d.setDate(d.getDate() - 90)
      return d
    case '365d':
      d.setFullYear(d.getFullYear() - 1)
      return d
    default:
      return null
  }
}

async function computeKpiSlices(orgId: string, range: Range) {
  const now = new Date()
  const startDate = getStartDate(range, now)

  const currentCustomerCondition = and(
    eq(customers.organizationId, orgId),
    isNull(customers.deletedAt),
    startDate ? sql`${customers.createdAt} >= ${startDate}` : sql`1=1`
  )

  const validOrderCondition = and(
    eq(orders.organizationId, orgId),
    isNull(orders.deletedAt),
    notInArray(orders.status, ['draft', 'cancelled'])
  )

  const [customerMetrics, revenueMetrics] = await Promise.all([
    db
      .select({
        totalCustomers: count(),
      })
      .from(customers)
      .where(currentCustomerCondition),
    db
      .select({
        totalRevenue: sum(orders.total),
      })
      .from(orders)
      .innerJoin(
        customers,
        and(eq(orders.customerId, customers.id), currentCustomerCondition)
      )
      .where(validOrderCondition),
  ])

  return {
    totalCustomers: Number(customerMetrics[0]?.totalCustomers ?? 0),
    totalRevenue: Number(revenueMetrics[0]?.totalRevenue ?? 0),
    startDate: startDate?.toISOString() ?? null,
  }
}

export async function GET({ request }: { request: Request }) {
  if (process.env.NODE_ENV === 'production') {
    return new Response(
      JSON.stringify({ ok: false, error: 'debug-rls-clash is disabled in production' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const url = new URL(request.url)
    const range = (url.searchParams.get('range') || '30d') as Range
    const orgId = url.searchParams.get('orgId') || process.env.DEBUG_ORG_ID || ''

    if (!orgId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Provide ?orgId=<uuid> or set DEBUG_ORG_ID in .env',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const beforeCtxRows = await db.execute(
      sql`select nullif(current_setting('app.organization_id', true), '') as org_ctx`
    )
    const beforeCtx = (beforeCtxRows as unknown as Array<{ org_ctx: string | null }>)[0]?.org_ctx ?? null
    const before = await computeKpiSlices(orgId, range)

    await db.execute(sql`select set_config('app.organization_id', ${orgId}, false)`)

    const afterCtxRows = await db.execute(
      sql`select nullif(current_setting('app.organization_id', true), '') as org_ctx`
    )
    const afterCtx = (afterCtxRows as unknown as Array<{ org_ctx: string | null }>)[0]?.org_ctx ?? null
    const after = await computeKpiSlices(orgId, range)

    return new Response(
      JSON.stringify(
        {
          ok: true,
          orgId,
          range,
          context: {
            beforeSetConfig: beforeCtx,
            afterSetConfig: afterCtx,
          },
          metrics: {
            beforeSetConfig: before,
            afterSetConfig: after,
          },
          interpretation:
            before.totalCustomers === after.totalCustomers && before.totalRevenue === after.totalRevenue
              ? 'No RLS-context delta detected for this connection'
              : 'RLS/context likely affecting row visibility',
        },
        null,
        2
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
