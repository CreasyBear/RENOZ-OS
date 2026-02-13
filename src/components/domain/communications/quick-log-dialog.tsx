/* eslint-disable react-refresh/only-export-components -- Dialog exports component + constants */
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
import { Link } from "@tanstack/react-router";
import {
  Phone,
  FileText,
  Users,
  ArrowLeft,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import { useCreateQuickLog } from "@/hooks/communications/use-quick-log";
import { CustomerSelectorContainer } from "@/components/domain/orders/creation/customer-selector-container";
import type { SelectedCustomer } from "@/components/domain/orders/creation/customer-selector";
import {
  quickLogFormSchema,
  type LogType,
  type QuickLogDialogProps,
  type QuickLogDialogPresenterProps,
  type QuickLogFormValues,
  type QuickLogButtonProps,
} from "@/lib/schemas/communications";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  NumberField,
  FormField,
  FormActions,
  extractFieldError,
} from "@/components/shared/forms";
import { Textarea } from "@/components/ui/textarea";

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

function QuickLogDialogPresenter({
  open,
  onOpenChange,
  customerId,
  customerName: initialCustomerName,
  defaultType,
  className,
  onSubmit,
  isSubmitting,
  requireCustomerSelection,
}: QuickLogDialogPresenterProps & { requireCustomerSelection?: boolean }) {
  const notesRef = React.useRef<HTMLTextAreaElement>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<SelectedCustomer | null>(null);
  const [showCustomerSelector, setShowCustomerSelector] =
    React.useState(requireCustomerSelection);

  const initialType = defaultType ?? getLastLogType();

  const form = useTanStackForm<QuickLogFormValues>({
    schema: quickLogFormSchema,
    defaultValues: {
      type: initialType,
      notes: "",
      duration: undefined,
    },
    onSubmit: async (values) => {
      setLastLogType(values.type);

      const didSucceed = await onSubmit({
        ...values,
        customerId: selectedCustomer?.id,
      });
      if (didSucceed) {
        setSubmitSuccess(true);
        onOpenChange(false);
      }
    },
  });

  // Reset type when defaultType changes (e.g. user clicked "Phone Call" from dropdown)
  React.useEffect(() => {
    if (open && defaultType) {
      form.setFieldValue("type", defaultType);
    }
  }, [open, defaultType, form]);

  const selectedType = form.useWatch("type");
  const customerName = selectedCustomer?.name || initialCustomerName;

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setShowCustomerSelector(requireCustomerSelection);
      setSelectedCustomer(null);
    }
  }, [open, requireCustomerSelection]);

  // Focus notes field when dialog opens (and not showing customer selector)
  React.useEffect(() => {
    if (open && !showCustomerSelector && notesRef.current) {
      const timer = setTimeout(() => {
        notesRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, showCustomerSelector]);

  // Reset form only after successful submission
  React.useEffect(() => {
    if (!open && submitSuccess) {
      form.reset({
        type: getLastLogType(),
        notes: "",
        duration: undefined,
      });
      setSubmitSuccess(false);
      setSelectedCustomer(null);
    }
  }, [open, submitSuccess, form]);

  const handleCustomerSelect = (customer: SelectedCustomer | null) => {
    if (customer) {
      setSelectedCustomer(customer);
      setShowCustomerSelector(false);
    }
  };

  const handleBackToCustomerSelector = () => {
    setShowCustomerSelector(true);
    setSelectedCustomer(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-[500px]", showCustomerSelector && "sm:max-w-[600px]", className)}
        onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {showCustomerSelector ? "Select Customer" : "Quick Log"}
          </DialogTitle>
          <DialogDescription>
            {showCustomerSelector
              ? "Choose a customer to log activity for"
              : customerName
                ? (
                    <>
                      Log activity for{" "}
                      {customerId ? (
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId }}
                          search={{}}
                          className="font-medium hover:underline text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {customerName}
                        </Link>
                      ) : (
                        customerName
                      )}
                      .
                    </>
                  )
                : "Log a call, note, or meeting"}
          </DialogDescription>
        </DialogHeader>

        {showCustomerSelector ? (
          <div className="py-4">
            <CustomerSelectorContainer
              selectedCustomerId={selectedCustomer?.id || null}
              onSelect={handleCustomerSelect}
            />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <fieldset disabled={isSubmitting} className="space-y-4">
              <form.Field name="type">
                {(field) => {
                  const error = extractFieldError(field);
                  return (
                    <FormField
                      label="Log Type"
                      name={field.name}
                      error={error}
                    >
                      <RadioGroup
                        value={field.state.value ?? ""}
                        onValueChange={(v) =>
                          form.setFieldValue("type", v as LogType)
                        }
                        onBlur={field.handleBlur}
                        className="flex gap-2"
                        aria-invalid={!!error}
                      >
                        {LOG_TYPES.map((logType) => {
                          const Icon = logType.icon;
                          const isSelected = field.state.value === logType.value;
                          return (
                            <Label
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
                              <Icon
                                className={cn(
                                  "h-5 w-5",
                                  isSelected && "text-primary"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  isSelected && "text-primary"
                                )}
                              >
                                {logType.label}
                              </span>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    </FormField>
                  );
                }}
              </form.Field>

              <form.Field name="notes">
                {(field) => {
                  const error = extractFieldError(field);
                  return (
                    <FormField
                      label="Notes"
                      name={field.name}
                      error={error}
                      required
                    >
                      <Textarea
                        ref={notesRef}
                        placeholder={
                          selectedType === "call"
                            ? "What was discussed?"
                            : selectedType === "meeting"
                              ? "Meeting notes..."
                              : "Add your note..."
                        }
                        className="resize-none"
                        rows={4}
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={isSubmitting}
                      />
                    </FormField>
                  );
                }}
              </form.Field>

              {(selectedType === "call" || selectedType === "meeting") && (
                <form.Field name="duration">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Duration (minutes)"
                      description="Optional"
                      min={0}
                      placeholder="e.g., 15"
                    />
                  )}
                </form.Field>
              )}
            </fieldset>

            <DialogFooter className="gap-2 flex flex-wrap">
              {requireCustomerSelection && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToCustomerSelector}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <FormActions
                form={form}
                submitLabel="Save Log"
                cancelLabel="Cancel"
                loadingLabel="Saving..."
                onCancel={() => onOpenChange(false)}
                submitDisabled={isSubmitting}
                className="flex-1 justify-end"
              />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function QuickLogDialog(props: QuickLogDialogProps) {
  const { customerId, opportunityId } = props;
  const createQuickLogMutation = useCreateQuickLog();

  // Require customer selection if no context provided
  const requireCustomerSelection = !customerId && !opportunityId;

  const handleSubmit = async (values: QuickLogFormValues & { customerId?: string }) => {
    try {
      // Use customerId from form values (selected in dialog) or from props
      const finalCustomerId = values.customerId || customerId || null;

      await createQuickLogMutation.mutateAsync({
        type: values.type,
        notes: values.notes,
        duration: values.duration,
        customerId: finalCustomerId,
        opportunityId: opportunityId ?? null,
      });

      toast.success(
        values.type === 'call'
          ? 'Call logged'
          : values.type === 'note'
            ? 'Note added'
            : 'Meeting recorded'
      );

      return true;
    } catch (error) {
      toast.error('Failed to save log', {
        description: getUserFriendlyMessage(error as Error),
        action: {
          label: 'Retry',
          onClick: () => {
            createQuickLogMutation.mutate({
              type: values.type,
              notes: values.notes,
              duration: values.duration,
              customerId: values.customerId || customerId || null,
              opportunityId: opportunityId ?? null,
            });
          },
        },
      });
      return false;
    }
  };

  return (
    <QuickLogDialogPresenter
      {...props}
      onSubmit={handleSubmit}
      isSubmitting={createQuickLogMutation.isPending}
      requireCustomerSelection={requireCustomerSelection}
    />
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

// QuickLogButtonProps imported from schemas

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
