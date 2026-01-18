/**
 * Customer Duplicate Detection Server Functions
 *
 * Uses PostgreSQL pg_trgm extension for fuzzy string matching
 * to detect potential duplicate customers during creation.
 *
 * @see drizzle/migrations/0007_pg_trgm_extension.sql
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sql, eq, and, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, contacts } from '@/../drizzle/schema'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// SCHEMAS
// ============================================================================

export const detectDuplicatesInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  threshold: z.number().min(0).max(1).default(0.3),
  excludeCustomerId: z.string().uuid().optional(),
  limit: z.number().min(1).max(10).default(5),
})

export type DetectDuplicatesInput = z.infer<typeof detectDuplicatesInputSchema>

export interface DuplicateMatch {
  customerId: string
  customerCode: string
  name: string
  email: string | null
  phone: string | null
  matchScore: number
  matchReasons: string[]
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Detect potential duplicate customers based on name, email, or phone
 *
 * Uses PostgreSQL pg_trgm similarity() function for fuzzy matching.
 * Returns matches above the threshold, sorted by match score.
 */
export const detectDuplicates = createServerFn({ method: 'POST' })
  .validator(detectDuplicatesInputSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { name, email, phone, threshold, excludeCustomerId, limit } = data

    // If no search criteria provided, return empty
    if (!name && !email && !phone) {
      return { duplicates: [], hasMore: false }
    }

    const matches: DuplicateMatch[] = []

    // Build similarity queries based on provided fields
    const similarityConditions: ReturnType<typeof sql>[] = []
    const selectFields: Record<string, ReturnType<typeof sql>> = {}

    // Name similarity (on customers table)
    if (name && name.length >= 2) {
      selectFields.nameSimilarity = sql<number>`similarity(${customers.name}, ${name})`
      similarityConditions.push(sql`similarity(${customers.name}, ${name}) >= ${threshold}`)
    }

    // For email/phone, we need to join with contacts
    if (email || phone) {
      // Query contacts for email/phone similarity
      const contactMatches = await db
        .select({
          customerId: contacts.customerId,
          email: contacts.email,
          phone: contacts.phone,
          mobile: contacts.mobile,
          emailSimilarity: email
            ? sql<number>`COALESCE(similarity(${contacts.email}, ${email}), 0)`
            : sql<number>`0`,
          phoneSimilarity: phone
            ? sql<number>`GREATEST(
                COALESCE(similarity(${contacts.phone}, ${phone}), 0),
                COALESCE(similarity(${contacts.mobile}, ${phone}), 0)
              )`
            : sql<number>`0`,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            or(
              email ? sql`similarity(${contacts.email}, ${email}) >= ${threshold}` : sql`false`,
              phone
                ? sql`GREATEST(
                    COALESCE(similarity(${contacts.phone}, ${phone}), 0),
                    COALESCE(similarity(${contacts.mobile}, ${phone}), 0)
                  ) >= ${threshold}`
                : sql`false`
            )
          )
        )
        .limit(limit * 2)

      // Get customer details for matching contacts
      if (contactMatches.length > 0) {
        const customerIds = [...new Set(contactMatches.map((c) => c.customerId))]
        const customerDetails = await db
          .select({
            id: customers.id,
            customerCode: customers.customerCode,
            name: customers.name,
          })
          .from(customers)
          .where(
            and(
              eq(customers.organizationId, ctx.organizationId),
              sql`${customers.id} = ANY(${customerIds})`,
              excludeCustomerId ? sql`${customers.id} != ${excludeCustomerId}` : sql`true`,
              sql`${customers.deletedAt} IS NULL`
            )
          )

        const customerMap = new Map(customerDetails.map((c) => [c.id, c]))

        for (const contact of contactMatches) {
          const customer = customerMap.get(contact.customerId)
          if (!customer) continue

          const matchReasons: string[] = []
          let maxScore = 0

          if (email && contact.emailSimilarity >= threshold) {
            matchReasons.push(`Email: ${contact.email}`)
            maxScore = Math.max(maxScore, contact.emailSimilarity)
          }
          if (phone && contact.phoneSimilarity >= threshold) {
            matchReasons.push(`Phone: ${contact.phone || contact.mobile}`)
            maxScore = Math.max(maxScore, contact.phoneSimilarity)
          }

          if (matchReasons.length > 0) {
            const existing = matches.find((m) => m.customerId === customer.id)
            if (existing) {
              existing.matchReasons.push(...matchReasons)
              existing.matchScore = Math.max(existing.matchScore, maxScore)
            } else {
              matches.push({
                customerId: customer.id,
                customerCode: customer.customerCode,
                name: customer.name,
                email: contact.email,
                phone: contact.phone || contact.mobile,
                matchScore: maxScore,
                matchReasons,
              })
            }
          }
        }
      }
    }

    // Name similarity search (on customers table directly)
    if (name && name.length >= 2) {
      const nameMatches = await db
        .select({
          id: customers.id,
          customerCode: customers.customerCode,
          name: customers.name,
          nameSimilarity: sql<number>`similarity(${customers.name}, ${name})`,
        })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, ctx.organizationId),
            sql`similarity(${customers.name}, ${name}) >= ${threshold}`,
            excludeCustomerId ? sql`${customers.id} != ${excludeCustomerId}` : sql`true`,
            sql`${customers.deletedAt} IS NULL`
          )
        )
        .orderBy(sql`similarity(${customers.name}, ${name}) DESC`)
        .limit(limit)

      // Get primary contact info for name matches
      for (const customer of nameMatches) {
        const primaryContact = await db
          .select({
            email: contacts.email,
            phone: contacts.phone,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.customerId, customer.id),
              eq(contacts.isPrimary, true)
            )
          )
          .limit(1)

        const existing = matches.find((m) => m.customerId === customer.id)
        if (existing) {
          existing.matchReasons.push(`Name: ${customer.name}`)
          existing.matchScore = Math.max(existing.matchScore, customer.nameSimilarity)
        } else {
          matches.push({
            customerId: customer.id,
            customerCode: customer.customerCode,
            name: customer.name,
            email: primaryContact[0]?.email ?? null,
            phone: primaryContact[0]?.phone ?? null,
            matchScore: customer.nameSimilarity,
            matchReasons: [`Name: ${customer.name}`],
          })
        }
      }
    }

    // Sort by match score and limit
    const sortedMatches = matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)

    return {
      duplicates: sortedMatches,
      hasMore: matches.length > limit,
    }
  })

/**
 * Check if exact email already exists
 * Used for quick validation before detailed similarity search
 */
export const checkEmailExists = createServerFn({ method: 'POST' })
  .validator(z.object({
    email: z.string().email(),
    excludeCustomerId: z.string().uuid().optional(),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { email, excludeCustomerId } = data

    const result = await db
      .select({
        customerId: contacts.customerId,
      })
      .from(contacts)
      .innerJoin(customers, eq(contacts.customerId, customers.id))
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          sql`LOWER(${contacts.email}) = LOWER(${email})`,
          excludeCustomerId ? sql`${customers.id} != ${excludeCustomerId}` : sql`true`,
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .limit(1)

    return { exists: result.length > 0, customerId: result[0]?.customerId }
  })
