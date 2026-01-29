/**
 * Project Files Tab - Enhanced
 *
 * Full-featured file management with:
 * - File type icons and color coding
 * - Preview support for images
 * - Download actions
 * - Storage stats and progress
 * - Batch operations
 *
 * @source files from useFiles hook
 * @source users from useUserLookup hook
 * @source mutations from useDeleteFile hook
 *
 * SPRINT-03: Enhanced files tab maximizing schema potential
 */

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  File,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Upload,
  Folder,
  Clock,
  HardDrive,
  FileCheck,
  AlertCircle,
  X,
  Grid3X3,
  List,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';

// Hooks
import { useFiles, useDeleteFile } from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';

// Types
import type { ProjectFile } from 'drizzle/schema';

// Dialogs
import { FileUploadDialog } from './file-dialogs';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectFilesTabProps {
  projectId: string;
}

interface FileWithUploader extends ProjectFile {
  uploaderName?: string;
  uploaderAvatar?: string;
}

type ViewMode = 'grid' | 'list';
type FileTypeFilter = 'all' | 'image' | 'document' | 'spreadsheet' | 'other';

// ============================================================================
// FILE TYPE HELPERS
// ============================================================================

type FileCategory = 'image' | 'document' | 'spreadsheet' | 'code' | 'archive' | 'other';

interface FileTypeInfo {
  category: FileCategory;
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}

function getFileTypeInfo(mimeType: string | null, fileName: string): FileTypeInfo {
  const safeMimeType = mimeType ?? '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Images
  if (safeMimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return {
      category: 'image',
      icon: Image,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      label: 'Image',
    };
  }
  
  // Spreadsheets
  if (
    safeMimeType.includes('excel') ||
    safeMimeType.includes('spreadsheet') ||
    ['xls', 'xlsx', 'csv'].includes(ext)
  ) {
    return {
      category: 'spreadsheet',
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Spreadsheet',
    };
  }
  
  // Documents
  if (
    safeMimeType.includes('pdf') ||
    safeMimeType.includes('word') ||
    safeMimeType.includes('document') ||
    ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)
  ) {
    return {
      category: 'document',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      label: 'Document',
    };
  }
  
  // Code
  if (
    safeMimeType.includes('json') ||
    safeMimeType.includes('javascript') ||
    safeMimeType.includes('typescript') ||
    ['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py'].includes(ext)
  ) {
    return {
      category: 'code',
      icon: FileCode,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      label: 'Code',
    };
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {
      category: 'archive',
      icon: Folder,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      label: 'Archive',
    };
  }
  
  // Default
  return {
    category: 'other',
    icon: File,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    label: 'File',
  };
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// ============================================================================
// FILE PREVIEW DIALOG
// ============================================================================

function FilePreviewDialog({
  file,
  isOpen,
  onClose,
}: {
  file: FileWithUploader | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!file) return null;
  
  const typeInfo = getFileTypeInfo(file.mimeType, file.fileName);
  const isImage = typeInfo.category === 'image';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <typeInfo.icon className={cn('h-5 w-5', typeInfo.color)} />
            {file.fileName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview */}
          {isImage ? (
            <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[300px]">
              {file.fileUrl ? (
                <img 
                  src={file.fileUrl} 
                  alt={file.fileName}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Image className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>Image not available</p>
                  <p className="text-sm">{file.fileName}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center bg-muted rounded-lg p-8">
              <div className="text-center">
                <typeInfo.icon className={cn('h-20 w-20 mx-auto mb-4 opacity-50', typeInfo.color)} />
                <p className="text-lg font-medium">{file.fileName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(file.fileSize)} • {typeInfo.label}
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">File Name</p>
              <p className="font-medium">{file.fileName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{typeInfo.label}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="font-medium">{formatFileSize(file.fileSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Uploaded</p>
              <p className="font-medium">
                {format(new Date(file.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Mime Type</p>
              <p className="font-medium text-xs">{file.mimeType ?? 'Unknown'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              className="flex-1" 
              onClick={() => file.fileUrl && window.open(file.fileUrl, '_blank')}
              disabled={!file.fileUrl}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {file.fileUrl && (
              <Button 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(file.fileUrl!);
                  toast.success('Link copied to clipboard');
                }}
              >
                Copy Link
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// FILE LIST ITEM (Row View)
// ============================================================================

function FileListRow({
  file,
  onPreview,
  onDelete,
}: {
  file: FileWithUploader;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const typeInfo = getFileTypeInfo(file.mimeType, file.fileName);
  const TypeIcon = typeInfo.icon;
  
  const timeAgo = formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true });

  return (
    <div className="group flex items-center gap-4 p-3 hover:bg-muted rounded-lg transition-colors">
      {/* Icon */}
      <div className={cn('p-2.5 rounded-lg shrink-0', typeInfo.bg)}>
        <TypeIcon className={cn('h-5 w-5', typeInfo.color)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 
            className="font-medium truncate cursor-pointer hover:text-primary"
            onClick={onPreview}
          >
            {file.fileName}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{formatFileSize(file.fileSize)}</span>
          <span>•</span>
          <span>{typeInfo.label}</span>
          <span>•</span>
          <span>{timeAgo}</span>
          {file.createdBy && (
            <>
              <span>•</span>
              <span>by {file.createdBy}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPreview}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Preview</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// FILE GRID CARD
// ============================================================================

function FileGridCard({
  file,
  onPreview,
  onDelete,
}: {
  file: FileWithUploader;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const typeInfo = getFileTypeInfo(file.mimeType, file.fileName);
  const TypeIcon = typeInfo.icon;
  const isImage = typeInfo.category === 'image';

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Preview / Icon */}
        <div 
          className={cn(
            'h-32 flex items-center justify-center relative cursor-pointer',
            typeInfo.bg.replace('100', '50')
          )}
          onClick={onPreview}
        >
          {isImage ? (
            file.fileUrl ? (
              <img 
                src={file.fileUrl} 
                alt={file.fileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Image className={cn('h-12 w-12 opacity-40', typeInfo.color)} />
              </div>
            )
          ) : (
            <TypeIcon className={cn('h-16 w-16 opacity-40', typeInfo.color)} />
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full">
              <Eye className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate" title={file.fileName}>
                {file.fileName}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatFileSize(file.fileSize)} • {typeInfo.label}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-1">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

function FilesSummaryCards({ files }: { files: FileWithUploader[] }) {
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalSize = files.reduce((acc, f) => acc + (f.fileSize ?? 0), 0);
    
    // By category
    const byCategory = files.reduce((acc, file) => {
      const cat = getFileTypeInfo(file.mimeType, file.fileName).category;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Recent uploads (last 7 days)
    const recent = files.filter(f => {
      const days = (Date.now() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    }).length;

    return { totalFiles, totalSize, byCategory, recent };
  }, [files]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Files */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <File className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Files</p>
              <p className="text-xl font-semibold">{stats.totalFiles}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Size */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <HardDrive className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Storage Used</p>
              <p className="text-xl font-semibold">{formatFileSize(stats.totalSize)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-xl font-semibold">{stats.recent}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <FileCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="text-xl font-semibold">{stats.byCategory.document || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================

function FilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FileTypeFilter;
  onFilterChange: (filter: FileTypeFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const filters: { value: FileTypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'document', label: 'Documents' },
    { value: 'spreadsheet', label: 'Spreadsheets' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Type Filter */}
      <div className="flex gap-1">
        {filters.map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => onFilterChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center border rounded-md p-0.5">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('grid')}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyFilesState({ onUpload }: { onUpload: () => void }) {
  return (
    <Card className="p-12 text-center">
      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
        <Upload className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No files yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Upload documents, images, and other files to keep all project materials in one place.
      </p>
      <Button onClick={onUpload}>
        <Upload className="mr-2 h-4 w-4" />
        Upload First File
      </Button>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const { data: filesData, isLoading, refetch } = useFiles(projectId);
  const deleteFile = useDeleteFile(projectId);
  const { getUser } = useUserLookup();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [previewFile, setPreviewFile] = useState<FileWithUploader | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Transform files with uploader info
  const files = useMemo(() => {
    const rawFiles = filesData?.data || [];
    return rawFiles.map((file: ProjectFile): FileWithUploader => {
      const uploader = file.createdBy ? getUser(file.createdBy) : null;
      return {
        ...file,
        uploaderName: uploader?.name ?? 'Unknown',
      };
    });
  }, [filesData, getUser]);

  // Filter files
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Search filter
      const searchMatch = !searchQuery || 
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Type filter
      let typeMatch = true;
      if (typeFilter !== 'all') {
        const category = getFileTypeInfo(file.mimeType, file.fileName).category;
        typeMatch = category === typeFilter;
      }
      
      return searchMatch && typeMatch;
    });
  }, [files, searchQuery, typeFilter]);

  const handleDeleteFile = async (file: FileWithUploader) => {
    if (confirm(`Delete "${file.fileName}"?`)) {
      try {
        await deleteFile.mutateAsync(file.id);
        toast.success('File deleted');
      } catch (err) {
        toast.error('Failed to delete file');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Files</h3>
            <p className="text-sm text-muted-foreground">
              Documents, images, and project materials
            </p>
          </div>
        </div>
        <EmptyFilesState onUpload={() => setUploadDialogOpen(true)} />
        <FileUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          projectId={projectId}
          onSuccess={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Files</h3>
          <p className="text-sm text-muted-foreground">
            {filteredFiles.length} of {files.length} files
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Summary */}
      <FilesSummaryCards files={files} />

      {/* Filters */}
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        filter={typeFilter}
        onFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No files match your filters</p>
          <Button 
            variant="ghost" 
            onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
          >
            Clear Filters
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map(file => (
            <FileGridCard
              key={file.id}
              file={file}
              onPreview={() => setPreviewFile(file)}
              onDelete={() => handleDeleteFile(file)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2 space-y-1">
            {filteredFiles.map(file => (
              <FileListRow
                key={file.id}
                file={file}
                onPreview={() => setPreviewFile(file)}
                onDelete={() => handleDeleteFile(file)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
