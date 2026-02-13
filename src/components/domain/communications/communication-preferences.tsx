/**
 * Communication Preferences Component
 *
 * Container/Presenter pattern for managing contact communication preferences.
 * Container handles data fetching, presenter handles UI rendering.
 *
 * @see DOM-COMMS-005
 * @see STANDARDS.md - Container/Presenter Pattern
 */

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useContactPreferences,
  usePreferenceHistory,
  useUpdateContactPreferences,
} from "@/hooks/communications/use-contact-preferences";
import { Mail, MessageSquare, Loader2, History, Check } from "lucide-react";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import type {
  ContactPreferences,
  PreferenceHistoryItem,
  CommunicationPreferencesProps,
  PreferenceHistoryProps,
} from "@/lib/schemas/communications";

// ============================================================================
// SCHEMAS
// ============================================================================

const preferencesFormSchema = z.object({
  emailOptIn: z.boolean(),
  smsOptIn: z.boolean(),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

// ============================================================================
// PRESENTER COMPONENTS
// ============================================================================

/**
 * Communication Preferences Presenter
 * Pure UI component - receives data via props
 */
interface CommunicationPreferencesPresenterProps {
  /** @source useContactPreferences hook in CommunicationPreferencesContainer */
  preferences: ContactPreferences | null;
  /** @source useUpdateContactPreferences hook in CommunicationPreferencesContainer */
  isUpdating: boolean;
  contactName?: string;
  className?: string;
  onToggle: (field: "emailOptIn" | "smsOptIn", value: boolean) => void;
  onConfirmOptOut: (field: "emailOptIn" | "smsOptIn") => void;
  confirmOptOut: "email" | "sms" | null;
  onConfirmOptOutChange: (value: "email" | "sms" | null) => void;
}

function CommunicationPreferencesPresenter({
  preferences,
  isUpdating,
  contactName,
  className,
  onToggle,
  onConfirmOptOut,
  confirmOptOut,
  onConfirmOptOutChange,
}: CommunicationPreferencesPresenterProps) {
  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      emailOptIn: true,
      smsOptIn: false,
    },
    values: preferences
      ? {
          emailOptIn: preferences.emailOptIn,
          smsOptIn: preferences.smsOptIn,
        }
      : undefined,
  });

  const displayName =
    contactName ||
    (preferences
      ? `${preferences.firstName} ${preferences.lastName}`
      : "this contact");

  return (
    <>
      <Card className={className} aria-label="preference-form">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Communication Preferences
          </CardTitle>
          <CardDescription>
            Manage how we communicate with {displayName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-4">
              {/* Email Opt-In */}
              <FormField
                control={form.control}
                name="emailOptIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          onToggle("emailOptIn", checked === true)
                        }
                        disabled={isUpdating}
                        aria-label="email-opt-in"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email Communications
                        {field.value && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Opted In
                          </span>
                        )}
                      </FormLabel>
                      <FormDescription>
                        Receive marketing emails, newsletters, and promotional
                        content
                      </FormDescription>
                      {preferences?.emailOptInAt && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Last updated:{" "}
                          {format(
                            new Date(preferences.emailOptInAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {/* SMS Opt-In */}
              <FormField
                control={form.control}
                name="smsOptIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          onToggle("smsOptIn", checked === true)
                        }
                        disabled={isUpdating}
                        aria-label="sms-opt-in"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 cursor-pointer">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        SMS Communications
                        {field.value && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Opted In
                          </span>
                        )}
                      </FormLabel>
                      <FormDescription>
                        Receive text messages for updates and notifications
                      </FormDescription>
                      {preferences?.smsOptInAt && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Last updated:{" "}
                          {format(
                            new Date(preferences.smsOptInAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {isUpdating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating preferences...
                </div>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Opt-Out Confirmation Dialog */}
      <AlertDialog
        open={!!confirmOptOut}
        onOpenChange={(open) => !open && onConfirmOptOutChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Opt-Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to opt {displayName} out of{" "}
              {confirmOptOut === "email" ? "email" : "SMS"} communications? They
              will no longer receive{" "}
              {confirmOptOut === "email"
                ? "marketing emails, newsletters, and promotional content"
                : "text message notifications"}{" "}
              from us.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmOptOut) {
                  const field = confirmOptOut === "email" ? "emailOptIn" : "smsOptIn";
                  onConfirmOptOut(field);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Opt-Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Preference History Presenter
 * Pure UI component - receives data via props
 */
interface PreferenceHistoryPresenterProps {
  /** @source usePreferenceHistory hook in PreferenceHistoryContainer */
  history: PreferenceHistoryItem[];
  className?: string;
}

function PreferenceHistoryPresenter({
  history,
  className,
}: PreferenceHistoryPresenterProps) {
  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Preference History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No preference changes recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Preference History
        </CardTitle>
        <CardDescription>
          Audit trail of communication preference changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="tabular-nums">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.metadata?.contactName || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                        item.metadata?.channel === "email"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      )}
                    >
                      {item.metadata?.channel === "email" ? (
                        <Mail className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {item.metadata?.channel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-sm",
                        item.metadata?.newValue
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {item.metadata?.newValue ? "Opted In" : "Opted Out"}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {item.metadata?.changedAt
                      ? format(
                          new Date(item.metadata.changedAt),
                          "MMM d, yyyy h:mm a"
                        )
                      : format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CONTAINER COMPONENTS
// ============================================================================

/**
 * Communication Preferences Container
 * Handles data fetching and business logic
 * @source preferences from useContactPreferences hook
 * @source updateMutation from useUpdateContactPreferences hook
 */
export function CommunicationPreferences({
  contactId,
  contactName,
  className,
}: CommunicationPreferencesProps) {
  const [confirmOptOut, setConfirmOptOut] = React.useState<
    "email" | "sms" | null
  >(null);

  // Fetch current preferences
  const { data: preferencesData, isLoading } = useContactPreferences({
    contactId,
    enabled: !!contactId,
  });

  const preferences = preferencesData ?? null;

  const updateMutation = useUpdateContactPreferences();

  const handleToggle = React.useCallback(
    (field: "emailOptIn" | "smsOptIn", value: boolean) => {
      // If opting out, show confirmation dialog
      if (!value) {
        setConfirmOptOut(field === "emailOptIn" ? "email" : "sms");
        return;
      }

      // If opting in, update immediately
      updateMutation.mutate(
        { contactId, [field]: value },
        {
          onSuccess: () => {
            toast.success("Preferences updated");
          },
          onError: (error) => {
            toast.error("Failed to update preferences", {
              description: getUserFriendlyMessage(error as Error),
            });
          },
        }
      );
    },
    [contactId, updateMutation]
  );

  const confirmOptOutAction = React.useCallback(
    (field: "emailOptIn" | "smsOptIn") => {
      updateMutation.mutate(
        { contactId, [field]: false },
        {
          onSuccess: () => {
            toast.success("Preferences updated");
          },
          onError: (error) => {
            toast.error("Failed to update preferences", {
              description: getUserFriendlyMessage(error as Error),
            });
          },
        }
      );
      setConfirmOptOut(null);
    },
    [contactId, updateMutation]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={className} aria-label="preference-form">
        <CardHeader>
          <CardTitle className="text-lg">Communication Preferences</CardTitle>
          <CardDescription>
            Manage how we communicate with this contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CommunicationPreferencesPresenter
      preferences={preferences}
      isUpdating={updateMutation.isPending}
      contactName={contactName}
      className={className}
      onToggle={handleToggle}
      onConfirmOptOut={confirmOptOutAction}
      confirmOptOut={confirmOptOut}
      onConfirmOptOutChange={setConfirmOptOut}
    />
  );
}

/**
 * Preference History Container
 * Handles data fetching
 * @source history from usePreferenceHistory hook
 */
export function PreferenceHistory({
  contactId,
  customerId,
  className,
}: PreferenceHistoryProps) {
  const { data: historyData, isLoading } = usePreferenceHistory({
    contactId,
    customerId,
    limit: 50,
    enabled: !!contactId || !!customerId,
  });

  const history = historyData?.items ?? [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Preference History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <PreferenceHistoryPresenter history={history} className={className} />;
}
