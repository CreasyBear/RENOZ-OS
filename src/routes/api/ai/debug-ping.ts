/**
 * Explicitly enabled local diagnostic ping for API route checks.
 * GET /api/ai/debug-ping
 */
import {
  areAIDebugRoutesEnabled,
  createAIDebugRouteDisabledResponse,
} from '@/lib/ai/debug-route-policy';

export async function GET() {
  if (!areAIDebugRoutesEnabled()) {
    return createAIDebugRouteDisabledResponse();
  }

  return new Response(JSON.stringify({ ok: true, message: 'API route works' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
