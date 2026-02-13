/**
 * No-auth ping to verify API routes work.
 * GET /api/ai/debug-ping
 */
export async function GET() {
  return new Response(JSON.stringify({ ok: true, message: 'API route works' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
