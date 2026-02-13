/**
 * Project Files Grid Presentation Component
 *
 * Displays project files in a gallery/grid layout with categorization.
 *
 * @path src/components/jobs/presentation/files/ProjectFilesGrid.tsx
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Image,
  FileSpreadsheet,
  MoreHorizontal,
  Download,
  Eye,
  File,
  FileImage,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import type { ProjectFile, ProjectFileType } from '@/lib/schemas/jobs';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectFilesGridProps {
  files: ProjectFile[];
  onPreview?: (file: ProjectFile) => void;
  onDownload?: (file: ProjectFile) => void;
  onDelete?: (file: ProjectFile) => void;
  isLoading?: boolean;
}

// ============================================================================
// FILE TYPE CONFIGURATION
// ============================================================================

const FILE_TYPE_CONFIG: Record<ProjectFileType, { 
  icon: React.ElementType; 
  color: string; 
  label: string;
  bgColor: string;
}> = {
  proposal: { 
    icon: FileText, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    label: 'Proposal' 
  },
  contract: { 
    icon: FileText, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50',
    label: 'Contract' 
  },
  specification: { 
    icon: FileSpreadsheet, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    label: 'Specification' 
  },
  drawing: { 
    icon: FileImage, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50',
    label: 'Drawing' 
  },
  photo: { 
    icon: Image, 
    color: 'text-pink-600', 
    bgColor: 'bg-pink-50',
    label: 'Photo' 
  },
  report: { 
    icon: FileText, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50',
    label: 'Report' 
  },
  warranty: { 
    icon: FileText, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50',
    label: 'Warranty' 
  },
  other: { 
    icon: File, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50',
    label: 'Other' 
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getFileExtension(filename?: string | null): string {
  if (!filename) return '';
  return filename.split('.').pop()?.toUpperCase() || '';
}

// ============================================================================
// COMPONENTS
// ============================================================================

function FileTypeBadge({ type }: { type: ProjectFileType }) {
  const config = FILE_TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', config.color, config.bgColor)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function FileCard({ 
  file, 
  onPreview, 
  onDownload, 
  onDelete,
  viewMode,
}: { 
  file: ProjectFile; 
  onPreview?: (file: ProjectFile) => void;
  onDownload?: (file: ProjectFile) => void;
  onDelete?: (file: ProjectFile) => void;
  viewMode: 'grid' | 'list';
}) {
  const config = FILE_TYPE_CONFIG[file.fileType as ProjectFileType];
  const IconComponent = config.icon;
  const extension = getFileExtension(file.fileName);
  const isImage = false; // TODO: Detect from mimeType when properly stored

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', config.bgColor)}>
          <IconComponent className={cn('h-5 w-5', config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{file.fileName}</p>
            <FileTypeBadge type={file.fileType} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.fileSize)} • Added {format(new Date(file.createdAt), 'MMM d, yyyy')}
            {file.description && ` • ${file.description}`}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPreview && (
            <Button variant="ghost" size="icon" onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button variant="ghost" size="icon" onClick={() => onDownload(file)}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onPreview && (
                <DropdownMenuItem onClick={() => onPreview(file)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={() => onDownload(file)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Preview Area */}
        <div 
          className={cn(
            'relative h-32 flex items-center justify-center',
            config.bgColor
          )}
        >
          {isImage && file.fileUrl ? (
            <img 
              src={file.fileUrl} 
              alt={file.fileName || 'File'}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="text-center">
              <IconComponent className={cn('h-12 w-12 mx-auto', config.color)} />
              <span className={cn('text-xs font-bold mt-1 block', config.color)}>
                {extension}
              </span>
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onPreview && (
              <Button size="icon" variant="secondary" onClick={() => onPreview(file)}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onDownload && (
              <Button size="icon" variant="secondary" onClick={() => onDownload(file)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* File Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{file.fileName || 'Unnamed file'}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.fileSize)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPreview && (
                  <DropdownMenuItem onClick={() => onPreview(file)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                )}
                {onDownload && (
                  <DropdownMenuItem onClick={() => onDownload(file)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-2">
            <FileTypeBadge type={file.fileType} />
          </div>
          {file.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {file.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilePreviewDialog({ 
  file, 
  open, 
  onOpenChange 
}: { 
  file: ProjectFile | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf = file.mimeType?.includes('pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {file.fileName}
            <FileTypeBadge type={file.fileType} />
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-[300px] flex items-center justify-center bg-muted/50 rounded-lg">
          {isImage ? (
            <img 
              src={file.fileUrl || ''} 
              alt={file.fileName || 'File'}
              className="max-w-full max-h-[60vh] object-contain"
            />
          ) : isPdf ? (
            <iframe 
              src={file.fileUrl ?? undefined}
              className="w-full h-[60vh]"
              title={file.fileName || 'File'}
            />
          ) : (
            <div className="text-center p-8">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Preview not available for this file type.</p>
              {file.fileUrl && (
                <a 
                  href={file.fileUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline mt-2 inline-block"
                >
                  Open in new tab
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectFilesGrid({ files, onPreview, onDownload, onDelete, isLoading }: ProjectFilesGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const handlePreview = (file: ProjectFile) => {
    if (onPreview) {
      onPreview(file);
    } else {
      setPreviewFile(file);
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        'grid gap-4',
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
      )}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-32 bg-muted" />
            <CardContent className="p-3">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No files yet"
        message="Upload files to keep all project documents in one place."
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      <div className={cn(
        'grid gap-4',
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
      )}>
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onPreview={handlePreview}
            onDownload={onDownload}
            onDelete={onDelete}
            viewMode={viewMode}
          />
        ))}
      </div>

      {!onPreview && (
        <FilePreviewDialog
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
        />
      )}
    </>
  );
}
