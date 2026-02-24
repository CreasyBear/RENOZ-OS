import { inventoryLogger } from '@/lib/logger';

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

export const SERIAL_LINEAGE_FLAGS = {
  canonicalWrite: parseBooleanEnv(process.env.SERIAL_CANONICAL_WRITE, true),
  readCanonicalFirst: parseBooleanEnv(process.env.SERIAL_READ_CANONICAL_FIRST, true),
  legacyFallbackRead: parseBooleanEnv(process.env.SERIAL_LEGACY_FALLBACK_READ, true),
  autoUpsertOnMiss: parseBooleanEnv(process.env.SERIAL_AUTO_UPSERT_ON_MISS, true),
  fallbackTelemetry: parseBooleanEnv(process.env.SERIAL_FALLBACK_TELEMETRY, true),
} as const;

export function emitSerializedFallbackTelemetry(
  event: 'canonical_hit' | 'canonical_miss' | 'legacy_fallback_hit' | 'legacy_fallback_miss' | 'auto_upsert_on_miss',
  payload: {
    organizationId: string;
    serialNumber: string;
    source?: string;
    productId?: string | null;
    inventoryId?: string | null;
    reason?: string;
  }
): void {
  if (!SERIAL_LINEAGE_FLAGS.fallbackTelemetry) return;
  inventoryLogger.info(`[serialized-lineage] ${event}`, {
    orgId: payload.organizationId,
    serial: payload.serialNumber,
    source: payload.source ?? 'unknown',
    productId: payload.productId ?? null,
    inventoryId: payload.inventoryId ?? null,
    reason: payload.reason ?? null,
  });
}

