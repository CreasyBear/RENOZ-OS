/**
 * Entity Activity Logger
 *
 * Generic activity logging dialog that can be used with any entity type.
 * Accepts an onSubmit callback so the parent can handle persistence.
 *
 * @see src/components/domain/pipeline/activities/activity-logger.tsx (opportunity-specific version)
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Phone,
  Mail,
  Users,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  generateNextSteps,
  type SuggestedAction,
} from '@/lib/activities/activity-next-steps';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'follow_up';

export interface ActivityLogData {
  type: ActivityType;
  description: string;
  title?: string;
  body?: string;
  category?: string;
  importance?: string;
  outcome?: string;
  scheduledAt?: Date;
  isFollowUp: boolean;
}

export interface EntityActivityLoggerProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Entity display name (e.g., "Order #12345") */
  entityLabel: string;
  /** Callback when activity is submitted */
  onSubmit: (data: ActivityLogData) => Promise<void>;
  /** Default activity type */
  defaultType?: ActivityType;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Callback after successful submission (for next step suggestions) */
  onSuccess?: (data: ActivityLogData) => void;
  /** Entity ID for navigation suggestions */
  entityId?: string;
  /** Entity type for navigation suggestions */
  entityType?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_TYPES: Array<{
  value: ActivityType;
  label: string;
  icon: typeof Phone;
  placeholder: string;
}> = [
  { value: 'call', label: 'Call', icon: Phone, placeholder: 'What was discussed on the call?' },
  { value: 'email', label: 'Email', icon: Mail, placeholder: 'Summary of the email exchange...' },
  { value: 'meeting', label: 'Meeting', icon: Users, placeholder: 'Meeting notes and outcomes...' },
  { value: 'note', label: 'Note', icon: FileText, placeholder: 'Add a note...' },
  { value: 'follow_up', label: 'Follow-up', icon: Clock, placeholder: 'What needs to be followed up?' },
];

const NOTE_CATEGORIES = [
  { value: 'update', label: 'Update' },
  { value: 'customer-comment', label: 'Customer comment' },
  { value: 'internal-note', label: 'Internal note' },
  { value: 'risk', label: 'Risk' },
  { value: 'decision', label: 'Decision' },
  { value: 'next-step', label: 'Next step' },
] as const;

const NOTE_IMPORTANCE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export const EntityActivityLogger = memo(function EntityActivityLogger({
  open,
  onOpenChange,
  entityLabel,
  onSubmit,
  defaultType = 'note',
  isSubmitting = false,
  onSuccess,
  entityId,
  entityType,
}: EntityActivityLoggerProps) {
  const navigate = useNavigate();
  const [activityType, setActivityType] = useState<ActivityType>(defaultType);
  const [description, setDescription] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteCategory, setNoteCategory] = useState('');
  const [noteImportance, setNoteImportance] = useState('');
  const [outcome, setOutcome] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const currentType = ACTIVITY_TYPES.find((t) => t.value === activityType) ?? ACTIVITY_TYPES[3];
  const isStructuredNote = activityType === 'note';

  // Get default datetime for follow-up (tomorrow at 9am)
  const getDefaultFollowUpDateTime = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16); // For datetime-local input
  };

  const resetForm = useCallback(() => {
    setActivityType(defaultType);
    setDescription('');
    setNoteTitle('');
    setNoteBody('');
    setNoteCategory('');
    setNoteImportance('');
    setOutcome('');
    setScheduleFollowUp(false);
    setFollowUpDate('');
    setShowSuccess(false);
  }, [defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryContent = isStructuredNote ? noteBody.trim() : description.trim();
    if (!primaryContent) return;

    const data: ActivityLogData = {
      type: activityType,
      description: primaryContent,
      title: isStructuredNote ? noteTitle.trim() || undefined : undefined,
      body: isStructuredNote ? primaryContent : undefined,
      category: isStructuredNote ? noteCategory || undefined : undefined,
      importance: isStructuredNote ? noteImportance || undefined : undefined,
      outcome: outcome.trim() || undefined,
      scheduledAt: scheduleFollowUp && followUpDate ? new Date(followUpDate) : undefined,
      isFollowUp: scheduleFollowUp,
    };

    try {
      await onSubmit(data);
      setShowSuccess(true);
      onSuccess?.(data);
    } catch {
      // The submit handler owns user-facing error feedback; keep the dialog open.
    }
  };

  const handleClose = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    },
    [resetForm, onOpenChange]
  );

  const canSubmit = (isStructuredNote ? noteBody.trim().length > 0 : description.trim().length > 0) && !isSubmitting;

  // Generate suggested next actions using utility function
  const suggestedActions = useMemo<SuggestedAction[]>(() => {
    const handleNavigate = (path: string) => {
      handleClose(false);
      // Use TanStack Router navigate per WORKFLOW-CONTINUITY §8
      navigate({ to: path });
    };

    return generateNextSteps({
      activityType,
      entityType,
      entityId,
      entityLabel,
      hasScheduledFollowUp: scheduleFollowUp,
      onResetForm: resetForm,
      onSetActivityType: setActivityType,
      onScheduleFollowUp: () => {
        setShowSuccess(false);
        setScheduleFollowUp(true);
        setFollowUpDate(getDefaultFollowUpDateTime());
      },
      onClose: () => handleClose(false),
      onNavigate: handleNavigate,
    });
  }, [
    activityType,
    entityId,
    entityType,
    entityLabel,
    scheduleFollowUp,
    navigate,
    resetForm,
    setActivityType,
    handleClose,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {showSuccess ? (
          <SuccessState
            activityType={activityType}
            entityLabel={entityLabel}
            suggestedActions={suggestedActions}
            onClose={() => handleClose(false)}
          />
        ) : (
          <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>
              Record an interaction for {entityLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Activity Type Selection */}
            <div className="flex gap-1">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={activityType === type.value ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setActivityType(type.value)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{type.label}</span>
                  </Button>
                );
              })}
            </div>

            {isStructuredNote ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="activity-note-title">Title</Label>
                  <Input
                    id="activity-note-title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Short note title"
                    maxLength={200}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="activity-note-category">Category</Label>
                    <Select value={noteCategory} onValueChange={setNoteCategory}>
                      <SelectTrigger id="activity-note-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activity-note-importance">Importance</Label>
                    <Select value={noteImportance} onValueChange={setNoteImportance}>
                      <SelectTrigger id="activity-note-importance">
                        <SelectValue placeholder="Select importance" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_IMPORTANCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-note-body">Body *</Label>
                  <Textarea
                    id="activity-note-body"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Capture what happened, what changed, or what matters next..."
                    rows={5}
                    required
                    maxLength={2000}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="activity-description">Description *</Label>
                <Textarea
                  id="activity-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={currentType.placeholder}
                  rows={3}
                  required
                  maxLength={2000}
                />
              </div>
            )}

            {/* Outcome (for calls and meetings) */}
            {(activityType === 'call' || activityType === 'meeting') && (
              <div className="space-y-2">
                <Label htmlFor="activity-outcome">Outcome</Label>
                <Input
                  id="activity-outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="What was the result?"
                  maxLength={1000}
                />
              </div>
            )}

            {/* Schedule Follow-up */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule-followup"
                  checked={scheduleFollowUp}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setScheduleFollowUp(isChecked);
                    if (isChecked && !followUpDate) {
                      setFollowUpDate(getDefaultFollowUpDateTime());
                    }
                  }}
                />
                <label htmlFor="schedule-followup" className="text-sm cursor-pointer">
                  Schedule as a follow-up
                </label>
              </div>

              {scheduleFollowUp && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="followup-date">Follow-up Date</Label>
                  <Input
                    id="followup-date"
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required={scheduleFollowUp}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Logging...' : 'Log Activity'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
});

// ============================================================================
// SUCCESS STATE COMPONENT
// ============================================================================

interface SuccessStateProps {
  activityType: ActivityType;
  entityLabel: string;
  suggestedActions: SuggestedAction[];
  onClose: () => void;
}

function SuccessState({
  activityType,
  entityLabel,
  suggestedActions,
  onClose,
}: SuccessStateProps) {
  const activityTypeLabel = ACTIVITY_TYPES.find((t) => t.value === activityType)?.label ?? 'Activity';
  
  // Separate primary and secondary actions
  const primaryAction = suggestedActions.find((a) => a.variant === 'default') ?? suggestedActions[0];
  const secondaryActions = suggestedActions.filter((a) => 
    a.variant !== 'default' && a !== primaryAction
  );

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <DialogTitle className="text-center text-xl">Activity logged!</DialogTitle>
        <DialogDescription className="text-center text-base mt-2">
          Your {activityTypeLabel.toLowerCase()} for <span className="font-medium">{entityLabel}</span> has been
          recorded.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Primary action - most important next step */}
        {primaryAction && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">What&apos;s next?</p>
            <Button
              type="button"
              variant={primaryAction.variant ?? 'default'}
              className="w-full justify-start h-auto py-3"
              onClick={primaryAction.onClick}
            >
              <primaryAction.icon className="h-5 w-5 mr-3" />
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium">{primaryAction.label}</span>
                {primaryAction.description && (
                  <span className="text-xs opacity-80 mt-0.5">{primaryAction.description}</span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        )}

        {/* Secondary actions */}
        {secondaryActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Other options:</p>
            <div className="flex flex-col gap-2">
              {secondaryActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    type="button"
                    variant={action.variant ?? 'outline'}
                    className="w-full justify-start h-auto py-2.5"
                    onClick={action.onClick}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <div className="flex flex-col items-start flex-1">
                      <span>{action.label}</span>
                      {action.description && (
                        <span className="text-xs opacity-70 mt-0.5">{action.description}</span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

export default EntityActivityLogger;
