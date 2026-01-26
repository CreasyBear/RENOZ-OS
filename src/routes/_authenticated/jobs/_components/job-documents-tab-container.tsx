import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { JobDocumentsTab } from '@/components/domain/jobs';
import {
  useJobDocuments,
  useUploadJobDocument,
  useDeleteJobDocument,
} from '@/hooks/jobs';

interface JobDocumentsTabContainerProps {
  jobAssignmentId: string;
}

export function JobDocumentsTabContainer({ jobAssignmentId }: JobDocumentsTabContainerProps) {
  const [selectedType, setSelectedType] = useState<string>('before');
  const [caption, setCaption] = useState<string>('');

  const {
    data: documentsResponse,
    isLoading,
    error,
  } = useJobDocuments({ jobAssignmentId });

  const uploadMutation = useUploadJobDocument();
  const deleteMutation = useDeleteJobDocument();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadMutation.mutate({
          jobAssignmentId,
          file: acceptedFiles[0],
          type: selectedType,
          caption: caption || undefined,
        });
        setCaption('');
      }
    },
    [uploadMutation, jobAssignmentId, selectedType, caption]
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
      onDelete={(documentId) => deleteMutation.mutate({ documentId, jobAssignmentId })}
      isUploading={uploadMutation.isPending}
      isDeleting={deleteMutation.isPending}
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      isDragActive={isDragActive}
    />
  );
}
