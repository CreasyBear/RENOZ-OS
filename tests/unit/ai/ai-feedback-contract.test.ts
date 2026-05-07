import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_ARTIFACT_ERROR_FALLBACK_MESSAGE,
  AI_CHAT_ERROR_FALLBACK_MESSAGE,
  getAIArtifactErrorMessage,
  getAIChatErrorMessage,
} from '@/components/domain/ai/ai-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('AI feedback contract', () => {
  it('formats AI artifact failures without leaking unsafe internals', () => {
    expect(
      getAIArtifactErrorMessage(
        new Error('OpenAI provider token missing in stack trace for artifact renderer')
      )
    ).toBe(AI_ARTIFACT_ERROR_FALLBACK_MESSAGE);

    expect(getAIArtifactErrorMessage(new Error('Artifact data is not available yet.'))).toBe(
      'Artifact data is not available yet.'
    );
  });

  it('formats AI chat failures without leaking unsafe internals', () => {
    expect(
      getAIChatErrorMessage(
        new Error('api key rejected by model provider with internal server stack')
      )
    ).toBe(AI_CHAT_ERROR_FALLBACK_MESSAGE);

    expect(
      getAIChatErrorMessage({ statusCode: 429, message: 'Too many AI requests' })
    ).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('keeps AI component errors behind domain helpers', () => {
    const artifactRenderer = read('src/components/domain/ai/artifact-renderer.tsx');
    const chatPanel = read('src/components/domain/ai/chat-panel.tsx');

    expect(artifactRenderer).toContain('getAIArtifactErrorMessage(error)');
    expect(artifactRenderer).not.toContain("error.message || 'Failed to load artifact'");
    expect(chatPanel).toContain('getAIChatErrorMessage(error)');
    expect(chatPanel).not.toContain('{error.message}');
  });

  it('keeps AI API failure payloads behind route-safe helpers', () => {
    const artifactRoute = read('src/routes/api/ai/artifacts.$id.ts');
    const debugRoute = read('src/routes/api/ai/debug-rls-clash.ts');

    expect(artifactRoute).toContain('getAIArtifactStreamErrorPayload(error)');
    expect(debugRoute).toContain('getAIDebugRlsErrorPayload(error)');
    expect(artifactRoute).not.toContain('message: error instanceof Error ? error.message');
    expect(debugRoute).not.toContain('error instanceof Error ? error.message');
  });
});
