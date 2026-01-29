/**
 * Communication Preferences Component
 *
 * UI for managing contact communication preferences (email/SMS opt-in).
 * Includes audit history table for compliance.
 *
 * @see DOM-COMMS-005
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

import { toast } from "sonner";

// ============================================================================
// SCHEMAS
// ============================================================================

const preferencesFormSchema = z.object({
  emailOptIn: z.boolean(),
  smsOptIn: z.boolean(),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface CommunicationPreferencesProps {
  contactId: string;
  contactName?: string;
  className?: string;
}

interface ContactPreferences {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  emailOptIn: boolean;
  smsOptIn: boolean;
  emailOptInAt: string | null;
  smsOptInAt: string | null;
}

interface PreferenceHistoryItem {
  id: string;
  description: string;
  createdAt: string;
  metadata: {
    channel?: string;
    oldValue?: boolean;
    newValue?: boolean;
    changedAt?: string;
    contactName?: string;
  };
}

interface PreferenceHistoryResponse {
  items: PreferenceHistoryItem[];
  total: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

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

  const preferences = preferencesData as ContactPreferences | undefined;

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

  const updateMutation = useUpdateContactPreferences();

  const handleToggle = (field: "emailOptIn" | "smsOptIn", value: boolean) => {
    // If opting out, show confirmation dialog
    if (!value) {
      setConfirmOptOut(field === "emailOptIn" ? "email" : "sms");
      return;
    }

    // If opting in, update immediately
    form.setValue(field, value);
    updateMutation.mutate(
      { contactId, [field]: value },
      {
        onSuccess: () => {
          toast.success("Preferences updated");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to update preferences"
          );
        },
      }
    );
  };

  const confirmOptOutAction = () => {
    if (!confirmOptOut) return;

    const field = confirmOptOut === "email" ? "emailOptIn" : "smsOptIn";
    form.setValue(field, false);
    updateMutation.mutate(
      { contactId, [field]: false },
      {
        onSuccess: () => {
          toast.success("Preferences updated");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to update preferences"
          );
        },
      }
    );
    setConfirmOptOut(null);
  };

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
                          handleToggle("emailOptIn", checked === true)
                        }
                        disabled={updateMutation.isPending}
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
                          handleToggle("smsOptIn", checked === true)
                        }
                        disabled={updateMutation.isPending}
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

              {updateMutation.isPending && (
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
        onOpenChange={(open) => !open && setConfirmOptOut(null)}
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
              onClick={confirmOptOutAction}
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

// ============================================================================
// PREFERENCE HISTORY COMPONENT
// ============================================================================

interface PreferenceHistoryProps {
  contactId?: string;
  customerId?: string;
  className?: string;
}

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

  const history = (historyData as PreferenceHistoryResponse | undefined)?.items ?? [];

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
