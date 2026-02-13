export function sanitizeInternalRedirect(
  redirect: unknown,
  options?: {
    fallback?: string;
    disallowPaths?: string[];
  }
): string {
  const fallback = options?.fallback ?? '/dashboard';
  const disallowPaths = new Set(options?.disallowPaths ?? []);

  if (typeof redirect !== 'string' || redirect.length === 0) {
    return fallback;
  }

  // Quick rejects for common open redirect tricks.
  if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.includes('\\')) {
    return fallback;
  }

  try {
    const parsed = new URL(redirect, 'https://renoz.local');
    if (parsed.origin !== 'https://renoz.local') {
      return fallback;
    }

    if (disallowPaths.has(parsed.pathname)) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function isSecureOrLocalhost(url: URL): boolean {
  const isHttps = url.protocol === 'https:';
  const isLocalhost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '::1' ||
    url.hostname.endsWith('.localhost');

  return isHttps || isLocalhost;
}

function normalizeAllowlist(allowlist: string[]): URL[] {
  return allowlist
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        return [new URL(value)];
      } catch {
        return [];
      }
    })
    .filter((url) => !url.username && !url.password);
}

function pathsMatch(allowedPathname: string, candidatePathname: string): boolean {
  if (allowedPathname === '/' || allowedPathname === '') {
    return true;
  }

  if (candidatePathname === allowedPathname) {
    return true;
  }

  const normalized = allowedPathname.endsWith('/') ? allowedPathname : `${allowedPathname}/`;
  return candidatePathname.startsWith(normalized);
}

export function isAllowedExternalRedirect(
  redirectUrl: string,
  options?: {
    allowlist?: string[];
    appUrl?: string;
    nodeEnv?: string;
  }
): boolean {
  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUrl);
  } catch {
    return false;
  }

  if (!isSecureOrLocalhost(parsedRedirect) || parsedRedirect.username || parsedRedirect.password) {
    return false;
  }

  const allowlistInput = options?.allowlist ?? [];
  const withAppUrl = [...allowlistInput, options?.appUrl ?? ''].filter(Boolean);
  const normalizedAllowlist = normalizeAllowlist(withAppUrl);

  // Fail-closed in production when no allowlist is configured.
  if (normalizedAllowlist.length === 0) {
    return options?.nodeEnv === 'development' && isSecureOrLocalhost(parsedRedirect);
  }

  return normalizedAllowlist.some((allowed) => {
    return allowed.origin === parsedRedirect.origin && pathsMatch(allowed.pathname, parsedRedirect.pathname);
  });
}
