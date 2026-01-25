/**
 * Quick Log Dialog Component
 *
 * Streamlined UI for manually logging calls, notes, and meetings
 * with minimal friction.
 *
 * Features:
 * - Keyboard shortcut: Cmd+L
 * - Remembers last log type
 * - Auto-links to customer/opportunity context
 *
 * @see COMMS-AUTO-003
 */

"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Phone,
  FileText,
  Users,
  Clock,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { createQuickLog } from "@/lib/server/quick-log";

// ============================================================================
// TYPES
// ============================================================================

export type LogType = "call" | "note" | "meeting";

interface QuickLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  opportunityId?: string;
  customerName?: string;
  className?: string;
}

// ============================================================================
// STORAGE KEY FOR REMEMBERING LAST LOG TYPE
// ============================================================================

const LAST_LOG_TYPE_KEY = "renoz-quick-log-type";

function getLastLogType(): LogType {
  if (typeof window === "undefined") return "call";
  const stored = localStorage.getItem(LAST_LOG_TYPE_KEY);
  if (stored === "call" || stored === "note" || stored === "meeting") {
    return stored;
  }
  return "call";
}

function setLastLogType(type: LogType): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_LOG_TYPE_KEY, type);
}

// ============================================================================
// SCHEMA
// ============================================================================

const quickLogSchema = z.object({
  type: z.enum(["call", "note", "meeting"]),
  notes: z.string().min(1, "Please add some notes"),
  duration: z.number().min(0).optional(),
});

type QuickLogFormValues = z.infer<typeof quickLogSchema>;

// ============================================================================
// LOG TYPE CONFIG
// ============================================================================

const LOG_TYPES: { value: LogType; label: string; icon: typeof Phone; description: string }[] = [
  {
    value: "call",
    label: "Call",
    icon: Phone,
    description: "Log a phone call",
  },
  {
    value: "note",
    label: "Note",
    icon: FileText,
    description: "Add a quick note",
  },
  {
    value: "meeting",
    label: "Meeting",
    icon: Users,
    description: "Record a meeting",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickLogDialog({
  open,
  onOpenChange,
  customerId,
  opportunityId,
  customerName,
  className,
}: QuickLogDialogProps) {
  const queryClient = useQueryClient();
  const notesRef = React.useRef<HTMLTextAreaElement>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const form = useForm<QuickLogFormValues>({
    resolver: zodResolver(quickLogSchema),
    defaultValues: {
      type: getLastLogType(),
      notes: "",
      duration: undefined,
    },
  });

  const selectedType = form.watch("type");

  // Focus notes field when dialog opens
  React.useEffect(() => {
    if (open && notesRef.current) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        notesRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset form only after successful submission
  React.useEffect(() => {
    if (!open && submitSuccess) {
      form.reset({
        type: getLastLogType(),
        notes: "",
        duration: undefined,
      });
      setSubmitSuccess(false);
    }
  }, [open, submitSuccess, form]);

  // Create activity mutation
  const createMutation = useMutation({
    mutationFn: async (values: QuickLogFormValues) => {
      // Remember the log type for next time
      setLastLogType(values.type);

      // Use the server function to create the quick log
      return createQuickLog({
        data: {
          type: values.type,
          notes: values.notes,
          duration: values.duration,
          customerId: customerId ?? null,
          opportunityId: opportunityId ?? null,
        },
      });
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      toast.success(
        selectedType === "call"
          ? "Call logged"
          : selectedType === "note"
            ? "Note added"
            : "Meeting recorded"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.byCustomer(customerId) });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save log",
        {
          action: {
            label: "Retry",
            onClick: () => {
              const values = form.getValues();
              createMutation.mutate(values);
            },
          },
        }
      );
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    createMutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-[425px]", className)}
        onInteractOutside={(e) => {
          if (createMutation.isPending) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (createMutation.isPending) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Quick Log</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Log activity for ${customerName}`
              : "Log a call, note, or meeting"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={createMutation.isPending} className="space-y-4">
              {/* Log Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-2"
                    >
                      {LOG_TYPES.map((logType) => {
                        const Icon = logType.icon;
                        const isSelected = field.value === logType.value;
                        return (
                          <label
                            key={logType.value}
                            className={cn(
                              "flex-1 flex flex-col items-center gap-1 p-3 rounded-md border transition-colors cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            )}
                          >
                            <RadioGroupItem
                              value={logType.value}
                              className="sr-only"
                              aria-label={logType.label}
                            />
                            <Icon className={cn("h-5 w-5", isSelected && "text-primary")} />
                            <span className={cn("text-sm font-medium", isSelected && "text-primary")}>
                              {logType.label}
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="notes">Notes</Label>
                  <FormControl>
                    <Textarea
                      id="notes"
                      placeholder={
                        selectedType === "call"
                          ? "What was discussed?"
                          : selectedType === "meeting"
                            ? "Meeting notes..."
                            : "Add your note..."
                      }
                      className="resize-none"
                      rows={4}
                      {...field}
                      ref={(e) => {
                        field.ref(e);
                        notesRef.current = e;
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration (only for calls and meetings) */}
            {(selectedType === "call" || selectedType === "meeting") && (
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="duration" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration (minutes)
                      <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <FormControl>
                      <Input
                        id="duration"
                        type="number"
                        min={0}
                        placeholder="e.g., 15"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : parseInt(val, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Log
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// KEYBOARD SHORTCUT HOOK
// ============================================================================

/**
 * Hook to handle Cmd+L keyboard shortcut for opening quick log dialog.
 *
 * @param onOpen - Callback when shortcut is triggered
 */
export function useQuickLogShortcut(onOpen: () => void): void {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+L (Mac) or Ctrl+L (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        // Don't trigger if in an input or textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        onOpen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);
}

// ============================================================================
// QUICK LOG BUTTON COMPONENT
// ============================================================================

interface QuickLogButtonProps {
  customerId?: string;
  opportunityId?: string;
  customerName?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * Self-contained quick log button with dialog.
 * Use this when you need a complete log solution.
 */
export function QuickLogButton({
  customerId,
  opportunityId,
  customerName,
  variant = "outline",
  size = "sm",
  className,
}: QuickLogButtonProps) {
  const [open, setOpen] = React.useState(false);

  // Enable keyboard shortcut
  useQuickLogShortcut(() => setOpen(true));

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn("gap-2", className)}
      >
        <FileText className="h-4 w-4" />
        Log Activity
        <kbd className="hidden sm:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-60">
          <span className="text-xs">⌘</span>L
        </kbd>
      </Button>

      <QuickLogDialog
        open={open}
        onOpenChange={setOpen}
        customerId={customerId}
        opportunityId={opportunityId}
        customerName={customerName}
      />
    </>
  );
}
