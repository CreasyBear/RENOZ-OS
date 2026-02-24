'use server'

/**
 * Internal audit logging - server-only.
 * Uses getRequest() for IP/user-agent. Must NOT be imported by client code.
 * Import from this file only in other server functions.
 *
 * @see audit-logs.ts for createServerFn exports (client-safe)
 */
import { getRequest } from '@tanstack/react-start/server'
import { db } from '@/lib/db'
import { auditLogs } from 'drizzle/schema'
import type { AuditAction, AuditEntityType } from 'drizzle/schema'

export interface LogAuditEventInput {
  organizationId: string
  userId: string | null
  action: AuditAction | string
  entityType: AuditEntityType | string
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Internal function to log an audit event.
 * Call this from other server functions when actions occur.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  let ipAddress: string | null = null
  let userAgent: string | null = null

  try {
    const request = getRequest()
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
      ipAddress = forwardedFor.split(',')[0].trim()
    } else {
      const realIp = request.headers.get('x-real-ip')
      if (realIp) {
        ipAddress = realIp
      }
    }
    userAgent = request.headers.get('user-agent')
  } catch {
    ipAddress = null
    userAgent = null
  }

  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    oldValues: input.oldValues,
    newValues: input.newValues,
    ipAddress,
    userAgent,
    metadata: input.metadata,
  })
}
