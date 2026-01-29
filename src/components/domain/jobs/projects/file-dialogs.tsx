/**
 * File Dialogs
 *
 * Upload dialog for project files with Supabase Storage integration.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Integrated with Supabase Storage
 */

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, File, X, FileText, Image, FileCode, FileSpreadsheet } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useCreateFile, type CreateFileInput } from '@/hooks/jobs';
import { uploadFile } from '@/lib/storage';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ============================================================================
// SCHEMAS
// ============================================================================

const fileUploadFormSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  fileType: z.enum([
    'proposal',
    'contract',
    'specification',
    'drawing',
    'photo',
    'report',
    'warranty',
    'other',
  ]),
});

type FileUploadFormData = z.infer<typeof fileUploadFormSchema>;

interface FileWithPreview extends File {
  preview?: string;
}

// ============================================================================
// UPLOAD DIALOG
// ============================================================================

export interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function FileUploadDialog({ open, onOpenChange, projectId, onSuccess }: FileUploadDialogProps) {
  const createFile = useCreateFile(projectId);
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FileUploadFormData>({
    resolver: zodResolver(fileUploadFormSchema),
    defaultValues: {
      title: '',
      description: '',
      fileType: 'other' as const,
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const fileWithPreview = Object.assign(file, {
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
      setSelectedFile(fileWithPreview);
      // Auto-set title from filename
      form.setValue('title', file.name.replace(/\.[^/.]+$/, ''));
    }
  }, [form]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
  });

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel'))
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    if (type.includes('code') || type.includes('text'))
      return <FileCode className="h-8 w-8 text-purple-500" />;
    return <File className="h-8 w-8 text-slate-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onSubmit = async (data: FileUploadFormData) => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Step 1: Upload to Supabase Storage
      const storagePath = `projects/${projectId}/${Date.now()}_${selectedFile.name}`;
      
      // Simulate progress during upload (actual upload doesn't have progress callback in this util)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 10;
        });
      }, 100);

      const uploadResult = await uploadFile({
        path: storagePath,
        fileBody: selectedFile,
        contentType: selectedFile.type || 'application/octet-stream',
      });

      clearInterval(progressInterval);
      setUploadProgress(90);

      // Get public URL for the file
      const { publicUrl } = uploadResult;

      // Step 2: Create project file record
      const fileData: Omit<CreateFileInput, 'projectId'> = {
        fileUrl: publicUrl || `storage://${storagePath}`,
        fileName: data.title || selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'application/octet-stream',
        fileType: data.fileType,
        description: data.description,
        position: 0,
      };
      
      await createFile.mutateAsync(fileData);

      setUploadProgress(100);
      toast.success('File uploaded successfully');
      
      // Reset and close
      onOpenChange(false);
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);
      onSuccess?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const fileTypeLabels: Record<string, string> = {
    proposal: 'Proposal',
    contract: 'Contract',
    specification: 'Specification',
    drawing: 'Drawing',
    photo: 'Photo',
    report: 'Report',
    warranty: 'Warranty',
    other: 'Other',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File
          </DialogTitle>
          <DialogDescription>Upload a file to this project</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* File Dropzone */}
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse (max 50MB)
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {selectedFile.preview ? (
                    <img
                      src={selectedFile.preview}
                      alt="Preview"
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(selectedFile)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedFile(null);
                      form.setValue('title', '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Progress value={uploadProgress} className="mt-3" />
                )}
              </div>
            )}

            {fileRejections.length > 0 && (
              <p className="text-sm text-destructive">
                File too large or invalid type. Max size: 50MB
              </p>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="File title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fileType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(fileTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setSelectedFile(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || !selectedFile || createFile.isPending}>
                {isUploading || createFile.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
