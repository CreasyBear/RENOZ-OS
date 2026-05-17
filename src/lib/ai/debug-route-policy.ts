export const AI_DEBUG_ROUTE_DISABLED_MESSAGE = 'Not found';

export function areAIDebugRoutesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.AI_DEBUG_ROUTES_ENABLED === 'true'
  );
}

export function createAIDebugRouteDisabledResponse(): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: AI_DEBUG_ROUTE_DISABLED_MESSAGE,
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
