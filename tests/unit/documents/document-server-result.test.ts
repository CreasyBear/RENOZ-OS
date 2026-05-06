import { describe, expect, it } from 'vitest';
import {
  unwrapDocumentServerFnResult,
  unwrapDocumentServerRecord,
} from '@/hooks/documents/document-server-result';

describe('document server result helpers', () => {
  it('unwraps nested result and data envelopes', async () => {
    await expect(
      unwrapDocumentServerFnResult(
        {
          result: {
            data: {
              id: 'doc-1',
            },
          },
        },
        'Document generation'
      )
    ).resolves.toEqual({ id: 'doc-1' });
  });

  it('unwraps JSON Response payloads before returning the record', async () => {
    await expect(
      unwrapDocumentServerFnResult(
        new Response(JSON.stringify({ result: { id: 'doc-2' } }), {
          headers: {
            'content-type': 'application/json',
          },
        }),
        'Document status'
      )
    ).resolves.toEqual({ id: 'doc-2' });
  });

  it('rejects non-JSON Response payloads with the supplied context', async () => {
    await expect(
      unwrapDocumentServerFnResult(
        new Response('not json', {
          headers: {
            'content-type': 'text/plain',
          },
        }),
        'Project document generation'
      )
    ).rejects.toThrow('Project document generation returned a non-JSON response');
  });

  it('requires an object record after unwrapping', async () => {
    await expect(unwrapDocumentServerRecord(null, 'Document generation')).rejects.toThrow(
      'Document generation returned an invalid response'
    );
  });
});
