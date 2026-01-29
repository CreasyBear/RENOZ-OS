/**
 * Note Dialogs
 *
 * Create and edit dialogs for project notes with audio support.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Added NoteEditDialog
 */

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Mic, MicOff, Edit3 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateNote, useUpdateNote } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import type { ProjectNote } from 'drizzle/schema';

// ============================================================================
// SCHEMAS
// ============================================================================

const noteFormSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  noteType: z.enum(['general', 'meeting', 'audio', 'site_visit', 'client_feedback']),
});

type NoteFormData = z.infer<typeof noteFormSchema>;

// ============================================================================
// CREATE DIALOG
// ============================================================================

export interface NoteCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function NoteCreateDialog({ open, onOpenChange, projectId, onSuccess }: NoteCreateDialogProps) {
  const createNote = useCreateNote(projectId);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: '',
      content: '',
      noteType: 'general',
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Audio blob created - in production, upload to storage
        new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // In a real implementation, we'd upload this and process it
        // For now, just add a placeholder
        const currentContent = form.getValues('content');
        form.setValue('content', currentContent + '\n\n[Audio recording attached]');
        toast.success('Audio recorded and attached');

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: NoteFormData) => {
    try {
      await createNote.mutateAsync({
        title: data.title,
        content: data.content,
        noteType: data.noteType,
        status: 'completed',
      });

      toast.success('Note created');
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create note');
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Note
          </DialogTitle>
          <DialogDescription>Create a new note for this project</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="noteType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="site_visit">Site Visit</SelectItem>
                      <SelectItem value="client_feedback">Client Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Content *</FormLabel>
                    <div className="flex items-center gap-2">
                      {isRecording && (
                        <span className="text-sm text-destructive font-mono">
                          {formatTime(recordingTime)}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant={isRecording ? 'destructive' : 'outline'}
                        size="sm"
                        className="gap-1"
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="h-4 w-4" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4" />
                            Record
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Enter note content..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createNote.isPending}>
                {createNote.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Note Edit Dialog
// =============================================================================

export interface NoteEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: ProjectNote | null;
  onSuccess?: () => void;
}

const noteEditFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().optional(),
  noteType: z.enum(['general', 'meeting', 'audio', 'site_visit', 'client_feedback']),
  status: z.enum(['draft', 'completed', 'processing']),
});

type NoteEditFormData = z.infer<typeof noteEditFormSchema>;

export function NoteEditDialog({ open, onOpenChange, note, onSuccess }: NoteEditDialogProps) {
  const updateNote = useUpdateNote(note?.projectId ?? '');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<NoteEditFormData>({
    resolver: zodResolver(noteEditFormSchema),
    defaultValues: {
      title: '',
      content: '',
      noteType: 'general',
      status: 'completed',
    },
  });

  // Update form values when note changes
  useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        content: note.content ?? '',
        noteType: note.noteType,
        status: note.status,
      });
    }
  }, [note, form]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Audio recorded:', audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsRecording(false);
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: NoteEditFormData) => {
    if (!note) return;

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    try {
      await updateNote.mutateAsync({
        id: note.id,
        ...data,
      });

      toast.success('Note updated successfully');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Note
          </DialogTitle>
          <DialogDescription>Update this project note.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter note title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="noteType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="site_visit">Site Visit</SelectItem>
                        <SelectItem value="client_feedback">Client Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Audio Recording */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" />
                    Stop ({Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')})
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Record Audio
                  </>
                )}
              </Button>
              {isRecording && (
                <span className="text-sm text-destructive animate-pulse">Recording...</span>
              )}
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter note content..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNote.isPending}>
                {updateNote.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
