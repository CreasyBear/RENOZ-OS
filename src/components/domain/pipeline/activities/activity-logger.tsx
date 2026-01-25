/**
 * ActivityLogger Component
 *
 * Quick activity logging interface for opportunities.
 * Supports call, email, meeting, note, and follow-up types.
 * Can schedule follow-ups and track outcomes.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-ACTIVITIES-UI)
 */

import { memo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Clock,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toastSuccess, toastError } from "@/hooks";
import { logActivity } from "@/server/functions/pipeline/pipeline";
import type { OpportunityActivityType } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityLoggerProps {
  opportunityId: string;
  onSuccess?: () => void;
  variant?: "inline" | "popover" | "card";
  defaultType?: OpportunityActivityType;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_TYPES: Array<{
  value: OpportunityActivityType;
  label: string;
  icon: typeof Phone;
  placeholder: string;
}> = [
  {
    value: "call",
    label: "Call",
    icon: Phone,
    placeholder: "What was discussed on the call?",
  },
  {
    value: "email",
    label: "Email",
    icon: Mail,
    placeholder: "Summary of the email exchange...",
  },
  {
    value: "meeting",
    label: "Meeting",
    icon: Calendar,
    placeholder: "Meeting notes and outcomes...",
  },
  {
    value: "note",
    label: "Note",
    icon: MessageSquare,
    placeholder: "Add a note about this opportunity...",
  },
  {
    value: "follow_up",
    label: "Follow-up",
    icon: Clock,
    placeholder: "What needs to be followed up?",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ActivityLogger = memo(function ActivityLogger({
  opportunityId,
  onSuccess,
  variant = "card",
  defaultType = "note",
}: ActivityLoggerProps) {
  const queryClient = useQueryClient();

  // Form state
  const [type, setType] = useState<OpportunityActivityType>(defaultType);
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Get current type config
  const currentType = ACTIVITY_TYPES.find((t) => t.value === type) ?? ACTIVITY_TYPES[3];
  const Icon = currentType.icon;

  // Log activity mutation
  const logMutation = useMutation({
    mutationFn: async () => {
      return logActivity({
        data: {
          opportunityId,
          type,
          description,
          outcome: outcome || undefined,
          scheduledAt: scheduleFollowUp && followUpDate ? new Date(followUpDate) : undefined,
          completedAt: scheduleFollowUp ? undefined : new Date(),
        },
      });
    },
    onSuccess: () => {
      toastSuccess(`${currentType.label} logged successfully.`);
      // Reset form
      setDescription("");
      setOutcome("");
      setScheduleFollowUp(false);
      setFollowUpDate("");
      setIsOpen(false);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      onSuccess?.();
    },
    onError: () => {
      toastError("Failed to log activity. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    logMutation.mutate();
  };

  const canSubmit = description.trim().length > 0 && !logMutation.isPending;

  // Render form content
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Activity Type Selection */}
      <div className="flex gap-1">
        {ACTIVITY_TYPES.map((actType) => {
          const TypeIcon = actType.icon;
          return (
            <Button
              key={actType.value}
              type="button"
              variant={type === actType.value ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setType(actType.value)}
            >
              <TypeIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{actType.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={currentType.placeholder}
          rows={3}
          required
          maxLength={2000}
        />
      </div>

      {/* Outcome (for calls and meetings) */}
      {(type === "call" || type === "meeting") && (
        <div className="space-y-2">
          <Label htmlFor="outcome">Outcome</Label>
          <Input
            id="outcome"
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
            onCheckedChange={(checked) => setScheduleFollowUp(checked === true)}
          />
          <label
            htmlFor="schedule-followup"
            className="text-sm cursor-pointer"
          >
            Schedule as a follow-up (not completed)
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

      {/* Submit */}
      <div className="flex justify-end gap-2">
        {variant === "popover" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit}>
          <Send className="h-4 w-4 mr-2" />
          {logMutation.isPending ? "Logging..." : "Log Activity"}
        </Button>
      </div>
    </form>
  );

  // Render based on variant
  if (variant === "popover") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <div className="space-y-2 mb-4">
            <h4 className="font-medium">Log Activity</h4>
            <p className="text-sm text-muted-foreground">
              Record an interaction with this opportunity
            </p>
          </div>
          {formContent}
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === "inline") {
    return formContent;
  }

  // Default: card variant
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          Log Activity
        </CardTitle>
        <CardDescription>
          Record an interaction with this opportunity
        </CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
});

export default ActivityLogger;
