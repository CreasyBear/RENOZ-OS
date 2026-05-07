/**
 * Note Dialogs
 *
 * Create and edit dialogs for project notes with audio support.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Added NoteEditDialog
 */

import { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { Plus, Mic, MicOff, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  FormDialog,
  TextField,
  TextareaField,
  SelectField,
} from '@/components/shared/forms';
import { formatProjectNoteMutationError, useCreateNote, useUpdateNote } from '@/hooks/jobs';
import {
  discardUploadedProjectFile,
  uploadProjectFile,
} from '@/server/functions/files/upload-project-file';
import { toast } from 'sonner';
import type { AudioNoteData, ProjectNote } from '@/lib/schemas/jobs';

// ============================================================================
// SCHEMAS
// ============================================================================

const noteFormSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  noteType: z.enum(['general', 'meeting', 'audio', 'site_visit', 'client_feedback']),
});

const noteTypeOptions = [
  { value: 'general', label: 'General' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'audio', label: 'Audio' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'client_feedback', label: 'Client Feedback' },
];

const noteStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
];

interface RecordedAudio {
  file: File;
  duration: string;
}

function formatAudioDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, '0'))
    .join(':');
}

function makeRecordedAudioFile(chunks: Blob[], projectId: string): File {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  return new File([blob], `project-${projectId}-audio-${Date.now()}.webm`, {
    type: 'audio/webm',
  });
}

async function uploadRecordedAudio(projectId: string, recordedAudio: RecordedAudio) {
  const uploadResult = await uploadProjectFile({
    projectId,
    filename: recordedAudio.file.name,
    fileBody: recordedAudio.file,
    contentType: recordedAudio.file.type || 'audio/webm',
  });
  const fileUrl = uploadResult.publicUrl || `storage://${uploadResult.bucket}/${uploadResult.path}`;
  const audioData: AudioNoteData = {
    fileUrl,
    fileName: recordedAudio.file.name,
    duration: recordedAudio.duration,
    aiSummary: 'Transcription is not available yet for this audio note.',
    keyPoints: [],
    insights: [],
    transcript: [],
  };

  return { uploadResult, audioData };
}

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);

  const form = useTanStackForm({
    schema: noteFormSchema,
    defaultValues: {
      title: '',
      content: '',
      noteType: 'general' as const,
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      if (isRecording) stopRecording();
      setSubmitError(null);
      let uploadResult: Awaited<ReturnType<typeof uploadProjectFile>> | null = null;
      try {
        const audioPayload = recordedAudio
          ? await uploadRecordedAudio(projectId, recordedAudio)
          : null;
        uploadResult = audioPayload?.uploadResult ?? null;

        await createNote.mutateAsync({
          title: data.title,
          content: data.content,
          noteType: audioPayload ? 'audio' : data.noteType,
          status: 'completed',
          audioData: audioPayload?.audioData,
        });

        toast.success('Note created');
        onOpenChange(false);
        form.reset();
        setRecordedAudio(null);
        setRecordingTime(0);
        onSuccess?.();
      } catch (error) {
        if (uploadResult) {
          await discardUploadedProjectFile({
            projectId,
            path: uploadResult.path,
            bucket: uploadResult.bucket,
          });
        }
        const msg = formatProjectNoteMutationError(error, 'create');
        setSubmitError(msg);
        toast.error(msg);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setSubmitError(null);
        setRecordedAudio(null);
        setRecordingTime(0);
        recordingTimeRef.current = 0;
      }, 0);
      form.reset({
        title: '',
        content: '',
        noteType: 'general',
      });
    }
  }, [open, form]);

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
        const file = makeRecordedAudioFile(audioChunksRef.current, projectId);
        setRecordedAudio({
          file,
          duration: formatAudioDuration(Math.max(1, recordingTimeRef.current)),
        });
        form.setFieldValue('noteType', 'audio');
        toast.success('Audio recorded');

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch {
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && createNote.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Note
        </span>
      }
      description="Create a new note for this project"
      form={form}
      submitLabel="Create"
      submitError={submitError}
      submitDisabled={createNote.isPending}
      size="lg"
      className="max-w-lg"
      resetOnClose={false}
    >
      <form.Field name="title">
            {(field) => (
              <TextField
                field={field}
                label="Title"
                placeholder="Optional title..."
                required
              />
            )}
          </form.Field>

          <form.Field name="noteType">
            {(field) => (
              <SelectField
                field={field}
                label="Note Type"
                options={noteTypeOptions}
                required
              />
            )}
          </form.Field>

          {/* Content field with custom label including record button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content *</Label>
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
            <form.Field name="content">
              {(field) => (
                <TextareaField
                  field={field}
                  label=""
                  placeholder="Enter note content..."
                  rows={5}
                  className="[&>label]:hidden"
                />
              )}
            </form.Field>
            {recordedAudio && !isRecording && (
              <p className="text-xs text-muted-foreground">
                Audio recorded: {recordedAudio.duration}
              </p>
            )}
          </div>
    </FormDialog>
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

export function NoteEditDialog({ open, onOpenChange, note, onSuccess }: NoteEditDialogProps) {
  const updateNote = useUpdateNote(note?.projectId ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);

  const form = useTanStackForm({
    schema: noteEditFormSchema,
    defaultValues: {
      title: note?.title ?? '',
      content: note?.content ?? '',
      noteType: note?.noteType ?? 'general',
      status: note?.status ?? 'completed',
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      if (!note) return;

      if (isRecording) stopRecording();
      setSubmitError(null);
      let uploadResult: Awaited<ReturnType<typeof uploadProjectFile>> | null = null;
      try {
        const audioPayload = recordedAudio
          ? await uploadRecordedAudio(note.projectId, recordedAudio)
          : null;
        uploadResult = audioPayload?.uploadResult ?? null;

        await updateNote.mutateAsync({
          id: note.id,
          ...data,
          noteType: audioPayload ? 'audio' : data.noteType,
          audioData: audioPayload?.audioData,
        });

        toast.success('Note updated successfully');
        form.reset();
        setRecordedAudio(null);
        setRecordingTime(0);
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        if (uploadResult) {
          await discardUploadedProjectFile({
            projectId: note.projectId,
            path: uploadResult.path,
            bucket: uploadResult.bucket,
          });
        }
        const msg = formatProjectNoteMutationError(error, 'update');
        setSubmitError(msg);
        toast.error(msg);
      }
    },
  });

  useEffect(() => {
    if (open && note) {
      setTimeout(() => {
        setSubmitError(null);
        setRecordedAudio(null);
        setRecordingTime(0);
        recordingTimeRef.current = 0;
      }, 0);
      form.reset({
        title: note.title,
        content: note.content ?? '',
        noteType: note.noteType,
        status: note.status,
      });
    }
  }, [open, note, form]);

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
        const file = makeRecordedAudioFile(audioChunksRef.current, note?.projectId ?? 'project');
        setRecordedAudio({
          file,
          duration: formatAudioDuration(Math.max(1, recordingTimeRef.current)),
        });
        form.setFieldValue('noteType', 'audio');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch {
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
    if (isRecording) stopRecording();
    setSubmitError(null);
    setRecordedAudio(null);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    form.reset();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && updateNote.isPending) return;
    if (nextOpen) {
      onOpenChange(true);
    } else {
      handleCancel();
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
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Edit Note
        </span>
      }
      description="Update this project note."
      form={form}
      submitLabel="Save Changes"
      submitError={submitError}
      submitDisabled={updateNote.isPending}
      size="lg"
      className="sm:max-w-[525px]"
      resetOnClose={false}
    >
      <form.Field name="title">
            {(field) => (
              <TextField
                field={field}
                label="Title"
                placeholder="Enter note title..."
                required
              />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="noteType">
              {(field) => (
                <SelectField
                  field={field}
                  label="Type"
                  options={noteTypeOptions}
                  required
                />
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <SelectField
                  field={field}
                  label="Status"
                  options={noteStatusOptions}
                  required
                />
              )}
            </form.Field>
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

          <form.Field name="content">
            {(field) => (
              <TextareaField
                field={field}
                label="Content"
                placeholder="Enter note content..."
                rows={5}
              />
            )}
          </form.Field>
          {recordedAudio && !isRecording && (
            <p className="text-xs text-muted-foreground">
              Audio recorded: {recordedAudio.duration}
            </p>
          )}
    </FormDialog>
  );
}
