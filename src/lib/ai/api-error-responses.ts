export const AI_ARTIFACT_STREAM_ERROR_MESSAGE =
  'AI artifact stream failed. Please retry.';

export const AI_DEBUG_RLS_ERROR_MESSAGE =
  'Unable to inspect AI RLS visibility. Check server logs for details.';

export function getAIArtifactStreamErrorPayload(_error: unknown): {
  message: string;
  code: 'STREAM_ERROR';
} {
  return {
    message: AI_ARTIFACT_STREAM_ERROR_MESSAGE,
    code: 'STREAM_ERROR',
  };
}

export function getAIDebugRlsErrorPayload(_error: unknown): {
  ok: false;
  error: string;
} {
  return {
    ok: false,
    error: AI_DEBUG_RLS_ERROR_MESSAGE,
  };
}
