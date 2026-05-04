import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailSuppression } from "drizzle/schema";
import { NotFoundError } from "@/lib/server/errors";
import {
  suppressionRecordSchema,
  type SuppressionRecord,
} from "@/lib/schemas/communications/email-suppression";
import type {
  addSuppressionSchema,
  removeSuppressionSchema,
} from "@/lib/schemas/communications/email-suppression";
import type { z } from "zod";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function addSuppressionRecord(params: {
  organizationId: string;
  data: z.infer<typeof addSuppressionSchema>;
}): Promise<SuppressionRecord> {
  const normalizedEmail = normalizeEmail(params.data.email);

  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: params.organizationId,
      email: normalizedEmail,
      reason: params.data.reason,
      bounceType: params.data.bounceType ?? null,
      source: params.data.source ?? "manual",
      resendEventId: params.data.resendEventId ?? null,
      metadata: params.data.metadata ?? {},
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return suppressionRecordSchema.parse(inserted);
  }

  const [existing] = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, params.organizationId),
        eq(emailSuppression.email, normalizedEmail),
        isNull(emailSuppression.deletedAt),
      ),
    )
    .limit(1);

  return suppressionRecordSchema.parse(existing);
}

export async function removeSuppressionRecord(params: {
  organizationId: string;
  userId: string;
  data: z.infer<typeof removeSuppressionSchema>;
}): Promise<{ success: boolean }> {
  const [updated] = await db
    .update(emailSuppression)
    .set({
      deletedAt: new Date(),
      deletedBy: params.userId,
      deletedReason: params.data.reason ?? "Manual removal",
    })
    .where(
      and(
        eq(emailSuppression.id, params.data.id),
        eq(emailSuppression.organizationId, params.organizationId),
        isNull(emailSuppression.deletedAt),
      ),
    )
    .returning({ id: emailSuppression.id });

  if (!updated) {
    throw new NotFoundError("Suppression record not found or already removed", "email_suppression");
  }

  return { success: true };
}

export async function addSuppressionDirect(params: {
  organizationId: string;
  email: string;
  reason: "bounce" | "complaint" | "unsubscribe" | "manual";
  bounceType?: "hard" | "soft" | null;
  source?: "webhook" | "manual" | "import" | "api";
  resendEventId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; isNew: boolean }> {
  const normalizedEmail = normalizeEmail(params.email);

  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: params.organizationId,
      email: normalizedEmail,
      reason: params.reason,
      bounceType: params.bounceType ?? null,
      source: params.source ?? "webhook",
      resendEventId: params.resendEventId ?? null,
      metadata: params.metadata ?? {},
    })
    .onConflictDoNothing()
    .returning({ id: emailSuppression.id });

  if (inserted) {
    return { id: inserted.id, isNew: true };
  }

  const [existing] = await db
    .select({ id: emailSuppression.id })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, params.organizationId),
        eq(emailSuppression.email, normalizedEmail),
        isNull(emailSuppression.deletedAt),
      ),
    )
    .limit(1);

  return { id: existing?.id ?? "", isNew: false };
}
