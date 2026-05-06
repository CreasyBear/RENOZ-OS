export function extractAuthErrorMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function isUnsafeAuthProviderMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('api key') ||
    normalized.includes('client_secret') ||
    normalized.includes('service_role') ||
    normalized.includes('access token') ||
    normalized.includes('refresh token') ||
    normalized.includes('jwt') ||
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('sql') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error') ||
    normalized.includes('typeerror') ||
    normalized.includes('referenceerror') ||
    normalized.includes('syntaxerror') ||
    normalized.includes('not a function') ||
    /cannot (read|set) properties of (undefined|null)/.test(normalized) ||
    /\bat\s+[\w.$<>]+\s*\(/.test(message)
  );
}
