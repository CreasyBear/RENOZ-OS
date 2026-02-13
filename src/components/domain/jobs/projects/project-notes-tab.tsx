/**
 * Project Notes Tab - Enhanced
 *
 * Full-featured notes management with:
 * - Note type badges (general, meeting, audio, site_visit, client_feedback)
 * - Audio player for voice notes
 * - Author avatars and timestamps
 * - Status indicators (draft, completed, processing)
 * - Type-based filtering
 *
 * @source notes from useNotes hook
 * @source users from useUserLookup hook
 * @source mutations from useDeleteNote hook
 *
 * SPRINT-03: Enhanced notes tab maximizing schema potential
 */

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  FileText,
  Mic,
  Users,
  HardHat,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Progress } from '@/components/ui/progress';
import { toast } from '@/lib/toast';

// Hooks
import { useNotes, useDeleteNote } from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';

// Dialogs
import { NoteCreateDialog, NoteEditDialog } from './note-dialogs';

// Types
import type { ProjectNote, ProjectNoteType, ProjectNoteStatus, NoteTranscriptSegment } from '@/lib/schemas/jobs';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectNotesTabProps {
  projectId: string;
}

interface NoteWithAuthor extends ProjectNote {
  authorName?: string;
  authorAvatar?: string;
}

type NoteTypeFilter = 'all' | ProjectNoteType;

// ============================================================================
// CONFIG
// ============================================================================

const NOTE_TYPE_CONFIG: Record<ProjectNoteType, { 
  label: string; 
  icon: React.ElementType; 
  color: string; 
  bg: string;
  description: string;
}> = {
  general: {
    label: 'General',
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    description: 'General project notes',
  },
  meeting: {
    label: 'Meeting',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    description: 'Meeting minutes and decisions',
  },
  audio: {
    label: 'Audio',
    icon: Mic,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    description: 'Voice recordings',
  },
  site_visit: {
    label: 'Site Visit',
    icon: HardHat,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    description: 'On-site observations',
  },
  client_feedback: {
    label: 'Client Feedback',
    icon: MessageSquare,
    color: 'text-green-600',
    bg: 'bg-green-100',
    description: 'Client communications',
  },
};

const NOTE_STATUS_CONFIG: Record<ProjectNoteStatus, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
}> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    color: 'text-gray-500',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'text-amber-500',
  },
};

// ============================================================================
// AUDIO PLAYER
// ============================================================================

function AudioPlayer({ 
  duration, 
  transcript 
}: { 
  duration: string; 
  transcript?: NoteTranscriptSegment[];
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [_progress, _setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  // Parse duration string "HH:mm:ss" or "mm:ss" to seconds
  const parseDuration = (durationStr: string): number => {
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + parts[1];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationSeconds = parseDuration(duration);

  return (
    <div className="space-y-2">
      {/* Player */}
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
        
        <div className="flex-1">
          <Progress value={_progress} className="h-1.5" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {formatTime((_progress / 100) * durationSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(durationSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </Button>
          
          {showTranscript && transcript && (
            <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground max-h-32 overflow-y-auto space-y-2">
              {transcript.map((segment) => (
                <div key={segment.id} className="flex gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">[{segment.timestamp}]</span>
                  <span className="text-xs font-medium text-foreground shrink-0">{segment.speaker}:</span>
                  <span>{segment.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// NOTE CARD
// ============================================================================

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: NoteWithAuthor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeConfig = NOTE_TYPE_CONFIG[note.noteType];
  const statusConfig = NOTE_STATUS_CONFIG[note.status];
  const TypeIcon = typeConfig.icon;
  // _StatusIcon defined but not currently used
  void statusConfig.icon;
  const isAudio = note.noteType === 'audio';
  const isProcessing = note.status === 'processing';

  // Parse relative time
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });
  const fullDate = format(new Date(note.updatedAt), 'MMM d, yyyy h:mm a');

  return (
    <Card className={cn(
      'group overflow-hidden transition-all',
      isProcessing && 'opacity-80'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type Icon */}
            <div className={cn('p-2 rounded-lg shrink-0', typeConfig.bg)}>
              <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground">{note.title}</h4>
                
                {/* Type Badge */}
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs', typeConfig.bg, typeConfig.color)}
                >
                  {typeConfig.label}
                </Badge>

                {/* Status Badge (if not completed) */}
                {note.status !== 'completed' && (
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs', statusConfig.color)}
                  >
                    {isProcessing && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {statusConfig.label}
                  </Badge>
                )}
              </div>

              {/* Author & Time */}
              <div className="flex items-center gap-2 mt-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={note.authorAvatar} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {note.authorName?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {note.authorName || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-help">
                        {timeAgo}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fullDate}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        {note.content && (
          <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {note.content}
          </div>
        )}

        {/* Audio Player */}
        {isAudio && note.audioData && (
          <div className="mt-3">
            <AudioPlayer 
              duration={note.audioData.duration}
              transcript={note.audioData.transcript}
            />
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing audio transcription...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

function NotesSummaryCards({ notes }: { notes: NoteWithAuthor[] }) {
  const stats = useMemo(() => {
    const total = notes.length;
    
    // By type
    const byType = notes.reduce<Record<string, number>>((acc, note) => {
      acc[note.noteType] = (acc[note.noteType] || 0) + 1;
      return acc;
    }, {});
    
    // By status
    const processing = notes.filter(n => n.status === 'processing').length;
    const audioNotes = notes.filter(n => n.noteType === 'audio').length;
    
    // Recent (last 7 days)
    const recent = notes.filter(n => {
      // eslint-disable-next-line react-hooks/purity -- Date.now() for relative time; stable per mount
      const days = (Date.now() - new Date(n.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    }).length;

    return { total, byType, processing, audioNotes, recent };
  }, [notes]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Notes</p>
              <p className="text-xl font-semibold">{stats.total}</p>
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

      {/* Audio */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Mic className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Audio Notes</p>
              <p className="text-xl font-semibold">{stats.audioNotes}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              stats.processing > 0 ? 'bg-amber-100' : 'bg-gray-100'
            )}>
              <Loader2 className={cn(
                'h-4 w-4',
                stats.processing > 0 ? 'text-amber-600' : 'text-gray-600'
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Processing</p>
              <p className={cn(
                'text-xl font-semibold',
                stats.processing > 0 ? 'text-amber-600' : ''
              )}>
                {stats.processing}
              </p>
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

function TypeFilterBar({
  selected,
  onSelect,
  counts,
}: {
  selected: NoteTypeFilter;
  onSelect: (type: NoteTypeFilter) => void;
  counts: Record<string, number>;
}) {
  const types: { value: NoteTypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'general', label: 'General' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'audio', label: 'Audio' },
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'client_feedback', label: 'Client' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {types.map(({ value, label }) => (
        <Button
          key={value}
          variant={selected === value ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onSelect(value)}
        >
          {label}
          {counts[value] > 0 && (
            <span className="ml-1.5 text-[10px] bg-background/20 px-1.5 rounded-full">
              {counts[value]}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyNotesState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-12 text-center">
      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No notes yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Add notes to track meetings, site visits, client feedback, and general project information.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add First Note
      </Button>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectNotesTab({ projectId }: ProjectNotesTabProps) {
  const { data: notesData, isLoading, refetch } = useNotes(projectId);
  const deleteNote = useDeleteNote(projectId);
  const { getUser } = useUserLookup();

  const [filter, setFilter] = useState<NoteTypeFilter>('all');
  const [editingNote, setEditingNote] = useState<NoteWithAuthor | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Transform notes with author info
  const notes = useMemo(() => {
    const rawNotes = notesData?.data || [];
    return rawNotes.map((note: ProjectNote): NoteWithAuthor => {
      const author = note.createdBy ? getUser(note.createdBy) : null;
      return {
        ...note,
        authorName: author?.name ?? 'Unknown',
      };
    });
  }, [notesData, getUser]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    if (filter === 'all') return notes;
    return notes.filter(n => n.noteType === filter);
  }, [notes, filter]);

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length };
    notes.forEach(n => {
      counts[n.noteType] = (counts[n.noteType] || 0) + 1;
    });
    return counts;
  }, [notes]);

  const handleDeleteNote = async (note: NoteWithAuthor) => {
    if (confirm(`Delete note "${note.title}"?`)) {
      try {
        await deleteNote.mutateAsync(note.id);
        toast.success('Note deleted');
      } catch {
        toast.error('Failed to delete note');
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

  if (notes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Notes</h3>
            <p className="text-sm text-muted-foreground">
              Meeting minutes, site observations, and feedback
            </p>
          </div>
        </div>
        <EmptyNotesState onAdd={() => setCreateDialogOpen(true)} />
        <NoteCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
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
          <h3 className="text-lg font-medium">Notes</h3>
          <p className="text-sm text-muted-foreground">
            {filteredNotes.length} of {notes.length} notes
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Summary */}
      <NotesSummaryCards notes={notes} />

      {/* Filters */}
      <TypeFilterBar
        selected={filter}
        onSelect={setFilter}
        counts={typeCounts}
      />

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onEdit={() => setEditingNote(note)}
            onDelete={() => handleDeleteNote(note)}
          />
        ))}
      </div>

      {/* Dialogs */}
      <NoteCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={() => refetch()}
      />
      <NoteEditDialog
        open={!!editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
        note={editingNote}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
