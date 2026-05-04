import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailSuppression } from "drizzle/schema";

const SOFT_BOUNCE_THRESHOLD = 3;
const SOFT_BOUNCE_WINDOW_DAYS = 7;

export async function trackSoftBounce(params: {
  organizationId: string;
  email: string;
  resendEventId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{
  id: string;
  bounceCount: number;
  suppressed: boolean;
  isNew: boolean;
}> {
  const normalizedEmail = params.email.toLowerCase().trim();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - SOFT_BOUNCE_WINDOW_DAYS);

  const [existing] = await db
    .select({
      id: emailSuppression.id,
      bounceCount: emailSuppression.bounceCount,
      createdAt: emailSuppression.createdAt,
    })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, params.organizationId),
        eq(emailSuppression.email, normalizedEmail),
        eq(emailSuppression.reason, "bounce"),
        eq(emailSuppression.bounceType, "soft"),
        isNull(emailSuppression.deletedAt),
        gte(emailSuppression.createdAt, windowStart),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(emailSuppression)
      .set({
        bounceCount: sql`COALESCE(${emailSuppression.bounceCount}, 0) + 1`,
        resendEventId: params.resendEventId ?? undefined,
        metadata: params.metadata
          ? sql`COALESCE(${emailSuppression.metadata}, '{}'::jsonb) || ${JSON.stringify(params.metadata)}::jsonb`
          : undefined,
      })
      .where(eq(emailSuppression.id, existing.id))
      .returning({ bounceCount: emailSuppression.bounceCount });

    const bounceCount = updated?.bounceCount ?? (existing.bounceCount ?? 0) + 1;

    return {
      id: existing.id,
      bounceCount,
      suppressed: bounceCount >= SOFT_BOUNCE_THRESHOLD,
      isNew: false,
    };
  }

  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: params.organizationId,
      email: normalizedEmail,
      reason: "bounce",
      bounceType: "soft",
      bounceCount: 1,
      source: "webhook",
      resendEventId: params.resendEventId ?? null,
      metadata: params.metadata ?? {},
    })
    .returning({ id: emailSuppression.id });

  return {
    id: inserted.id,
    bounceCount: 1,
    suppressed: false,
    isNew: true,
  };
}
