/**
 * Project Notes List Presentation Component
 *
 * Displays a list of project notes with audio transcript support.
 *
 * @path src/components/jobs/presentation/notes/ProjectNotesList.tsx
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Mic,
  Users,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Play,
  Pause,
  Sparkles,

  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import type { ProjectNote } from '@/lib/schemas/jobs';
// NoteType values from schema (used for NOTE_TYPE_CONFIG keys)
type NoteTypeValue = 'general' | 'meeting' | 'audio' | 'site_visit' | 'client_feedback';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectNotesListProps {
  notes: ProjectNote[];
  onEdit?: (note: ProjectNote) => void;
  onDelete?: (note: ProjectNote) => void;
  isLoading?: boolean;
}

// ============================================================================
// TYPE ICONS & COLORS
// ============================================================================

const NOTE_TYPE_CONFIG: Record<NoteTypeValue, { icon: React.ElementType; color: string; label: string }> = {
  general: { icon: FileText, color: 'text-blue-600 bg-blue-50', label: 'General' },
  meeting: { icon: Users, color: 'text-purple-600 bg-purple-50', label: 'Meeting' },
  audio: { icon: Mic, color: 'text-amber-600 bg-amber-50', label: 'Audio' },
  site_visit: { icon: MapPin, color: 'text-green-600 bg-green-50', label: 'Site Visit' },
  client_feedback: { icon: MessageSquare, color: 'text-pink-600 bg-pink-50', label: 'Client Feedback' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function NoteTypeBadge({ type }: { type: NoteTypeValue }) {
  const config = NOTE_TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function AudioPlayer({ duration }: { url: string; duration: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [_progress] = useState(0);

  // Simulated audio player - in production, use actual audio element
  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full bg-white"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-amber-600" />
        ) : (
          <Play className="h-4 w-4 text-amber-600" />
        )}
      </Button>
      <div className="flex-1">
        <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${_progress}%` }}
          />
        </div>
      </div>
      <span className="text-sm text-amber-700 font-medium">{duration}</span>
    </div>
  );
}

function TranscriptSegment({ segment }: { segment: { id: string; speaker: string; timestamp: string; text: string } }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-16 shrink-0">
        <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{segment.speaker}</p>
        <p className="text-sm text-muted-foreground">{segment.text}</p>
      </div>
    </div>
  );
}

function AISummary({ summary, keyPoints, insights }: { summary?: string; keyPoints: string[]; insights: string[] }) {
  if (!summary && keyPoints.length === 0 && insights.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-semibold text-violet-700">AI Summary</span>
      </div>
      
      {summary && (
        <p className="text-sm text-violet-900 mb-4">{summary}</p>
      )}

      {keyPoints.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-violet-600 mb-2">Key Points</p>
          <ul className="space-y-1">
            {keyPoints.map((point, i) => (
              <li key={i} className="text-sm text-violet-800 flex items-start gap-2">
                <span className="text-violet-400">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-violet-600 mb-2">Insights</p>
          <div className="flex flex-wrap gap-2">
            {insights.map((insight, i) => (
              <Badge key={i} variant="secondary" className="text-xs bg-violet-100 text-violet-700">
                {insight}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AudioNoteCard({ note }: { note: ProjectNote }) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const audioData = note.audioData;

  if (!audioData) return null;

  return (
    <div className="space-y-3">
      <AudioPlayer url={audioData.fileUrl} duration={audioData.duration} />
      
      <AISummary 
        summary={audioData.aiSummary}
        keyPoints={audioData.keyPoints}
        insights={audioData.insights}
      />

      {audioData.transcript.length > 0 && (
        <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Transcript ({audioData.transcript.length} segments)</span>
              {isTranscriptOpen ? 'Hide' : 'Show'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1 border rounded-lg p-3 bg-muted/30">
              {audioData.transcript.map((segment: { id: string; speaker: string; timestamp: string; text: string }) => (
                <TranscriptSegment key={segment.id} segment={segment} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function NoteCard({ note, onEdit, onDelete }: { note: ProjectNote; onEdit?: (note: ProjectNote) => void; onDelete?: (note: ProjectNote) => void }) {
  const isAudio = note.noteType === 'audio';
  const isProcessing = note.status === 'processing';

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {note.createdBy?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold">{note.title}</CardTitle>
                <NoteTypeBadge type={note.noteType} />
                {isProcessing && (
                  <Badge variant="outline" className="text-amber-600 bg-amber-50 flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" />
                    Processing
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Added {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(note)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(note)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {note.content && (
          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
        )}
        
        {isAudio && <AudioNoteCard note={note} />}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectNotesList({ notes, onEdit, onDelete, isLoading }: ProjectNotesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No notes yet"
        message="Add your first note to keep track of important project information."
      />
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
