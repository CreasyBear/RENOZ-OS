import { getUserFriendlyMessage } from '@/lib/error-handling';
import { isUnsafeMutationErrorMessage } from '@/lib/mutation-error-feedback';

export const AI_ARTIFACT_ERROR_FALLBACK_MESSAGE =
  'AI artifact is temporarily unavailable. Please retry.';

export const AI_CHAT_ERROR_FALLBACK_MESSAGE =
  'AI assistant is temporarily unavailable. Please retry.';

function isUnsafeAIErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isUnsafeMutationErrorMessage(message) ||
    normalized.includes('api key') ||
    normalized.includes('authorization') ||
    normalized.includes('bearer') ||
    normalized.includes('client_secret') ||
    normalized.includes('model provider') ||
    normalized.includes('openai') ||
    normalized.includes('provider token') ||
    normalized.includes('secret') ||
    normalized.includes('token')
  );
}

function getSafeAIErrorMessage(error: unknown, fallback: string): string {
  const message = getUserFriendlyMessage(error).trim();
  if (!message || isUnsafeAIErrorMessage(message)) {
    return fallback;
  }

  return message;
}

export function getAIArtifactErrorMessage(error: unknown): string {
  return getSafeAIErrorMessage(error, AI_ARTIFACT_ERROR_FALLBACK_MESSAGE);
}

export function getAIChatErrorMessage(error: unknown): string {
  return getSafeAIErrorMessage(error, AI_CHAT_ERROR_FALLBACK_MESSAGE);
}
