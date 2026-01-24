'use client';

import { useState } from 'react';
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { Upload, File, Image, Trash2, Download, Eye, AlertCircle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { jobDocumentTypeValues, type JobDocumentResponse } from '@/lib/schemas/jobs/job-documents';
import { cn } from '@/lib/utils';

interface JobDocumentsTabProps {
  /** Source: Jobs documents container query result. */
  documents: JobDocumentResponse[];
  /** Source: Jobs documents container query. */
  isLoading: boolean;
  /** Source: Jobs documents container query. */
  error: Error | null;
  /** Source: Jobs documents container local state. */
  selectedType: string;
  /** Source: Jobs documents container local state. */
  caption: string;
  /** Source: Jobs documents container. */
  onSelectedTypeChange: (value: string) => void;
  /** Source: Jobs documents container. */
  onCaptionChange: (value: string) => void;
  /** Source: Jobs documents container delete mutation. */
  onDelete: (documentId: string) => void;
  /** Source: Jobs documents container upload mutation. */
  isUploading: boolean;
  /** Source: Jobs documents container delete mutation. */
  isDeleting: boolean;
  /** Source: Jobs documents container dropzone hook. */
  getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  /** Source: Jobs documents container dropzone hook. */
  getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
  /** Source: Jobs documents container dropzone hook. */
  isDragActive: boolean;
}

export function JobDocumentsTab({
  documents,
  isLoading,
  error,
  selectedType,
  caption,
  onSelectedTypeChange,
  onCaptionChange,
  onDelete,
  isUploading,
  isDeleting,
  getRootProps,
  getInputProps,
  isDragActive,
}: JobDocumentsTabProps) {
  const documentStats = getDocumentStats(documents);

  if (isLoading) {
    return <JobDocumentsTabSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load documents. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <File className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Before Photos</CardTitle>
            <Image className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.before}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">After Photos</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.after}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.issues}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Add photos, receipts, permits, and other documents to this job.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Upload Controls */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={selectedType} onValueChange={onSelectedTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {jobDocumentTypeValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getDocumentTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => onCaptionChange(e.target.value)}
                placeholder="Describe this document..."
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              isUploading && 'pointer-events-none opacity-50'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Upload className="text-muted-foreground h-8 w-8" />
              {isDragActive ? (
                <p className="text-muted-foreground text-sm">Drop the file here...</p>
              ) : (
                <div>
                  <p className="text-sm font-medium">Drag & drop a file here, or click to select</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Supports images, PDFs, and documents up to 50MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {isUploading && (
            <div className="flex items-center justify-center py-4">
              <div className="border-primary mr-2 h-6 w-6 animate-spin rounded-full border-b-2"></div>
              <span className="text-muted-foreground text-sm">Uploading document...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Job Documents</CardTitle>
          <CardDescription>All documents and photos associated with this job.</CardDescription>
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <div className="py-8 text-center">
              <File className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="text-muted-foreground text-lg font-medium">No documents yet</h3>
              <p className="text-muted-foreground text-sm">
                Upload photos and documents to track job progress.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={() => onDelete(doc.id)}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// DOCUMENT CARD COMPONENT
// ============================================================================

interface DocumentCardProps {
  document: JobDocumentResponse;
  onDelete: () => void;
  isDeleting: boolean;
}

function DocumentCard({ document, onDelete, isDeleting }: DocumentCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const isImage = document.photoUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const canPreview = isImage || document.photoUrl.includes('.pdf');

  return (
    <>
      <Card className="relative">
        <CardContent className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <Badge variant="secondary" className="text-xs">
              {getDocumentTypeLabel(document.type)}
            </Badge>
            <div className="flex gap-1">
              {canPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isImage ? (
            <div className="bg-muted mb-2 aspect-video overflow-hidden rounded-md">
              <img
                src={document.photoUrl}
                alt={document.caption || 'Job document'}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="bg-muted mb-2 flex aspect-video items-center justify-center rounded-md">
              <File className="text-muted-foreground h-8 w-8" />
            </div>
          )}

          {document.caption && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{document.caption}</p>
          )}

          <p className="text-muted-foreground mt-2 text-xs">
            {new Date(document.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-h-[80vh] max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Document Preview
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              {isImage ? (
                <img
                  src={document.photoUrl}
                  alt={document.caption || 'Job document'}
                  className="h-auto w-full"
                />
              ) : document.photoUrl.includes('.pdf') ? (
                <iframe
                  src={document.photoUrl}
                  className="h-[600px] w-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="py-8 text-center">
                  <File className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                  <p className="text-muted-foreground">Preview not available for this file type.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.open(document.photoUrl, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function JobDocumentsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="mb-2 aspect-video w-full rounded-md" />
                  <Skeleton className="mb-1 h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    before: 'Before Work',
    during: 'During Work',
    after: 'After Work',
    issue: 'Issue/Problem',
    signature: 'Signature',
  };
  return labels[type] || type;
}

function getDocumentStats(documents: JobDocumentResponse[]) {
  return {
    total: documents.length,
    before: documents.filter((d) => d.type === 'before').length,
    during: documents.filter((d) => d.type === 'during').length,
    after: documents.filter((d) => d.type === 'after').length,
    issues: documents.filter((d) => d.type === 'issue').length,
    signatures: documents.filter((d) => d.type === 'signature').length,
  };
}
