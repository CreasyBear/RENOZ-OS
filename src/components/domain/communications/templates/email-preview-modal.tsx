/**
 * Email Preview Modal Component
 *
 * Modal for previewing email templates with rendered content
 * and sending test emails via Resend.
 *
 * @see INT-RES-006
 */

"use client";

import * as React from "react";
import { Send, Eye, Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";

import { useEmailPreview, useSendTestEmail } from "@/hooks/communications/use-email-preview";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  /** Initial variables to use for preview */
  variables?: Record<string, unknown>;
  /** Default recipient email (falls back to current user) */
  defaultRecipient?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmailPreviewModal({
  open,
  onOpenChange,
  templateId,
  templateName,
  variables: initialVariables,
  defaultRecipient = "",
}: EmailPreviewModalProps) {
  const [activeTab, setActiveTab] = React.useState<"preview" | "variables">("preview");
  const [recipientEmail, setRecipientEmail] = React.useState(defaultRecipient);
  const [customSubject, setCustomSubject] = React.useState("");
  const [customVariables, setCustomVariables] = React.useState<Record<string, string>>({});

  // Merge initial variables with custom overrides
  const mergedVariables = React.useMemo(() => {
    if (!customVariables || Object.keys(customVariables).length === 0) {
      return initialVariables;
    }
    return { ...initialVariables, ...customVariables };
  }, [initialVariables, customVariables]);

  // Fetch preview
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
    refetch: refetchPreview,
  } = useEmailPreview({
    templateId,
    variables: mergedVariables,
    enabled: open && !!templateId,
  });

  // Send test email mutation
  const sendTestMutation = useSendTestEmail();

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setActiveTab("preview");
      setRecipientEmail(defaultRecipient);
      setCustomSubject("");
      setCustomVariables({});
    }
  }, [open, defaultRecipient]);

  const handleSendTest = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    const result = await sendTestMutation.mutateAsync({
      templateId,
      recipientEmail,
      variables: mergedVariables,
      subject: customSubject || undefined,
    });

    if (result.success) {
      toast.success("Test email sent successfully!", {
        description: `Sent to ${recipientEmail}`,
      });
    } else {
      toast.error("Failed to send test email", {
        description: result.error || "Please try again.",
      });
    }
  };

  const handleVariableChange = (path: string, value: string) => {
    setCustomVariables((prev) => ({
      ...prev,
      [path]: value,
    }));
  };

  const handleRefreshPreview = () => {
    refetchPreview();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview: {templateName}
          </DialogTitle>
          <DialogDescription>
            Preview how your email will appear and send a test message
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "preview" | "variables")}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-2">
              <Mail className="h-4 w-4" />
              Variables & Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
            {previewLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load preview: {previewError.message}
                </AlertDescription>
              </Alert>
            ) : preview ? (
              <div className="flex flex-col gap-4 h-full">
                {/* Subject Preview */}
                <div className="bg-muted/40 rounded-md p-3">
                  <div className="text-xs text-muted-foreground mb-1">Subject:</div>
                  <div className="font-medium">{preview.subject}</div>
                </div>

                {/* Missing Variables Warning */}
                {preview.missingVariables.length > 0 && (
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Missing variables:{" "}
                      {preview.missingVariables.map((v) => `{{${v}}}`).join(", ")}
                    </AlertDescription>
                  </Alert>
                )}

                {/* HTML Preview in iframe */}
                <ScrollArea className="flex-1 border rounded-md bg-white min-h-[300px]">
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <style>
                            body {
                              font-family: system-ui, -apple-system, sans-serif;
                              padding: 16px;
                              margin: 0;
                              color: #333;
                              line-height: 1.6;
                            }
                            a { color: #0066cc; }
                            img { max-width: 100%; }
                          </style>
                        </head>
                        <body>${preview.html}</body>
                      </html>
                    `}
                    className="w-full min-h-[300px] border-0"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </ScrollArea>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="variables" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Send Test Section */}
                <div className="space-y-4">
                  <h4 className="font-medium">Send Test Email</h4>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="recipient">Recipient Email *</Label>
                      <Input
                        id="recipient"
                        type="email"
                        placeholder="your-email@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the email address to receive the test
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="custom-subject">Custom Subject (optional)</Label>
                      <Input
                        id="custom-subject"
                        placeholder={preview?.subject || "Leave blank to use template subject"}
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        [TEST] prefix will be automatically added
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Variable Overrides */}
                {preview?.missingVariables && preview.missingVariables.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Fill Missing Variables</h4>
                    <p className="text-sm text-muted-foreground">
                      Provide values for variables that couldn&apos;t be filled from sample data.
                    </p>

                    <div className="grid gap-3">
                      {preview.missingVariables.map((variable) => (
                        <div key={variable} className="grid gap-1.5">
                          <Label htmlFor={`var-${variable}`} className="text-xs">
                            {`{{${variable}}}`}
                          </Label>
                          <Input
                            id={`var-${variable}`}
                            placeholder={`Enter value for ${variable}`}
                            value={customVariables[variable] || ""}
                            onChange={(e) => handleVariableChange(variable, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshPreview}
                      disabled={previewLoading}
                    >
                      {previewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Refresh Preview
                    </Button>
                  </div>
                )}

                {/* Send Status */}
                {sendTestMutation.isSuccess && sendTestMutation.data?.success && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Test email sent successfully! Check your inbox.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSendTest}
            disabled={sendTestMutation.isPending || !recipientEmail}
            className="gap-2"
          >
            {sendTestMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
