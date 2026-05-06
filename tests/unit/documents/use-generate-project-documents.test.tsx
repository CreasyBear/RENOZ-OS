import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockGenerateProjectDocument = vi.fn();
const mockGenerateProjectWorkOrderPdf = vi.fn();
const mockGenerateProjectCompletionCertificatePdf = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>(
    '@tanstack/react-start'
  );
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

vi.mock('@/server/functions/documents', () => ({
  generateProjectDocument: (...args: unknown[]) => mockGenerateProjectDocument(...args),
  generateProjectWorkOrderPdf: (...args: unknown[]) =>
    mockGenerateProjectWorkOrderPdf(...args),
  generateProjectCompletionCertificatePdf: (...args: unknown[]) =>
    mockGenerateProjectCompletionCertificatePdf(...args),
}));

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'GenerateProjectDocumentsWrapper';
  return { queryClient, wrapper: Wrapper };
}

describe('project document generation hooks', () => {
  beforeEach(() => {
    mockGenerateProjectDocument.mockReset();
    mockGenerateProjectWorkOrderPdf.mockReset();
    mockGenerateProjectCompletionCertificatePdf.mockReset();
  });

  it('normalizes wrapped project document responses and invalidates project document views', async () => {
    const projectId = 'b346f94d-8f2f-4019-a6d5-f43cb2cc8ad6';
    mockGenerateProjectDocument.mockResolvedValue({
      result: {
        projectId,
        documentType: 'handover-pack',
        url: 'https://example.com/handover-pack.pdf',
        filename: 'handover-pack.pdf',
        storagePath: 'projects/handover-pack.pdf',
        fileSize: 1234,
        checksum: 'abc123',
      },
    });

    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.projects.detail(projectId), { id: projectId });
    queryClient.setQueryData(queryKeys.documents.history('project', projectId), []);

    const { useGenerateProjectDocument } = await import(
      '@/hooks/documents/use-generate-project-documents'
    );

    const { result } = renderHook(() => useGenerateProjectDocument(), { wrapper });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        projectId,
        documentType: 'handover-pack',
      });
    });

    expect(mockGenerateProjectDocument).toHaveBeenCalledWith({
      data: {
        projectId,
        documentType: 'handover-pack',
      },
    });
    expect(mutationResult).toMatchObject({
      projectId,
      documentType: 'handover-pack',
      url: 'https://example.com/handover-pack.pdf',
      filename: 'handover-pack.pdf',
    });
    expect(queryClient.getQueryState(queryKeys.projects.detail(projectId))?.isInvalidated).toBe(
      true
    );
    expect(
      queryClient.getQueryState(queryKeys.documents.history('project', projectId))?.isInvalidated
    ).toBe(true);
  });

  it('normalizes raw Response payloads from project document server functions', async () => {
    const projectId = '2d81e95a-ae35-48ca-a8bd-7d1c489ca33b';
    mockGenerateProjectWorkOrderPdf.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            projectId,
            documentType: 'work-order',
            url: 'https://example.com/work-order.pdf',
            filename: 'work-order.pdf',
            storagePath: 'projects/work-order.pdf',
            fileSize: 987,
            checksum: 'def456',
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );

    const { wrapper } = createHarness();
    const { useGenerateWorkOrder } = await import(
      '@/hooks/documents/use-generate-project-documents'
    );

    const { result } = renderHook(() => useGenerateWorkOrder(), { wrapper });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ projectId });
    });

    expect(mutationResult).toMatchObject({
      projectId,
      documentType: 'work-order',
      url: 'https://example.com/work-order.pdf',
      filename: 'work-order.pdf',
    });
  });

  it('falls back to the input project id when completion certificate responses omit it', async () => {
    const projectId = 'bf932275-9853-4724-b8f8-fd570d42a621';
    mockGenerateProjectCompletionCertificatePdf.mockResolvedValue({
      data: {
        documentType: 'completion-certificate',
        url: 'https://example.com/completion-certificate.pdf',
        filename: 'completion-certificate.pdf',
      },
    });

    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(queryKeys.projects.detail(projectId), { id: projectId });
    queryClient.setQueryData(queryKeys.documents.history('project', projectId), []);

    const { useGenerateCompletionCertificate } = await import(
      '@/hooks/documents/use-generate-project-documents'
    );

    const { result } = renderHook(() => useGenerateCompletionCertificate(), { wrapper });

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ projectId });
    });

    expect(mutationResult).toMatchObject({
      projectId,
      documentType: 'completion-certificate',
      url: 'https://example.com/completion-certificate.pdf',
      filename: 'completion-certificate.pdf',
    });
    expect(queryClient.getQueryState(queryKeys.projects.detail(projectId))?.isInvalidated).toBe(
      true
    );
    expect(
      queryClient.getQueryState(queryKeys.documents.history('project', projectId))?.isInvalidated
    ).toBe(true);
  });
});
