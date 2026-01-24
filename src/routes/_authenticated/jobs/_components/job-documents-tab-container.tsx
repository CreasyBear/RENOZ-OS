import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { JobDocumentsTab } from '@/components/domain/jobs/job-documents-tab';
import {
  uploadJobDocument,
  listJobDocuments,
  deleteJobDocument,
} from '@/server/functions/jobs/job-documents';
import { queryKeys } from '@/lib/query-keys';

interface JobDocumentsTabContainerProps {
  jobAssignmentId: string;
}

export function JobDocumentsTabContainer({ jobAssignmentId }: JobDocumentsTabContainerProps) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('before');
  const [caption, setCaption] = useState<string>('');

  const {
    data: documentsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.jobDocuments.list(jobAssignmentId),
    queryFn: async () => listJobDocuments({ data: { jobAssignmentId } }),
    staleTime: 30000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadJobDocument({
        data: {
          jobAssignmentId,
          file,
          type: selectedType,
          caption: caption || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobDocuments.list(jobAssignmentId) });
      setCaption('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) =>
      deleteJobDocument({
        data: { documentId, jobAssignmentId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobDocuments.list(jobAssignmentId) });
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadMutation.mutate(acceptedFiles[0]);
      }
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: uploadMutation.isPending,
  });

  return (
    <JobDocumentsTab
      documents={documentsResponse?.documents ?? []}
      isLoading={isLoading}
      error={error ?? null}
      selectedType={selectedType}
      caption={caption}
      onSelectedTypeChange={setSelectedType}
      onCaptionChange={setCaption}
      onDelete={(documentId) => deleteMutation.mutate(documentId)}
      isUploading={uploadMutation.isPending}
      isDeleting={deleteMutation.isPending}
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      isDragActive={isDragActive}
    />
  );
}
