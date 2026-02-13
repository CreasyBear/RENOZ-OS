/**
 * Signature Editor Component
 *
 * Rich text editor for creating and editing email signatures.
 * Uses a simple contentEditable approach with formatting toolbar.
 *
 * @see DOM-COMMS-006
 */

"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Eye,
  Edit2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn, sanitizeHtml } from "@/lib/utils";

import {
  useCreateSignature,
  useUpdateSignature,
} from "@/hooks/communications/use-signatures";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import {
  signatureFormSchema,
  type SignatureEditorProps,
  type SignatureFormValues,
} from "@/lib/schemas/communications";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  TextField,
  CheckboxField,
  FormField,
  FormActions,
  extractFieldError,
} from "@/components/shared/forms";

// Re-export for consumers that import from this module
export type { SignatureFormValues };

// ============================================================================
// COMPONENT
// ============================================================================

export function SignatureEditor({
  signature,
  onSave,
  onCancel,
  className,
}: SignatureEditorProps) {
  const [activeTab, setActiveTab] = React.useState<"edit" | "preview">("edit");
  const editorRef = React.useRef<HTMLDivElement>(null);
  const createSignature = useCreateSignature();
  const updateSignature = useUpdateSignature();

  const form = useTanStackForm<SignatureFormValues>({
    schema: signatureFormSchema,
    defaultValues: {
      name: signature?.name ?? "",
      content: signature?.content ?? "",
      isDefault: signature?.isDefault ?? false,
    },
    onSubmit: async (values) => {
      if (signature?.id) {
        updateSignature.mutate(
          {
            id: signature.id,
            ...values,
          },
          {
            onSuccess: () => {
              toast.success("Signature updated");
              onSave?.();
            },
            onError: (error) => {
              toast.error("Failed to update signature", {
                description: getUserFriendlyMessage(error as Error),
              });
            },
          }
        );
      } else {
        createSignature.mutate(
          { ...values, isCompanyWide: false },
          {
            onSuccess: () => {
              toast.success("Signature created");
              onSave?.();
            },
            onError: (error) => {
              toast.error("Failed to update signature", {
                description: getUserFriendlyMessage(error as Error),
              });
            },
          }
        );
      }
    },
  });

  const contentValue = form.useWatch("content");

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      form.setFieldValue("content", editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      form.setFieldValue("content", editorRef.current.innerHTML);
    }
  };

  React.useEffect(() => {
    if (signature) {
      form.reset({
        name: signature.name ?? "",
        content: signature.content ?? "",
        isDefault: signature.isDefault ?? false,
      });
      if (editorRef.current) {
        editorRef.current.innerHTML = signature.content ?? "";
      }
    } else {
      form.reset({ name: "", content: "", isDefault: false });
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }
  }, [signature, form]);

  const isPending =
    createSignature.isPending || updateSignature.isPending;

  return (
    <Card className={className} aria-label="signature-editor">
      <CardHeader>
        <CardTitle>
          {signature?.id ? "Edit Signature" : "Create Signature"}
        </CardTitle>
        <CardDescription>
          Create a personal signature for your outgoing emails
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Signature Name"
                placeholder="My Signature"
              />
            )}
          </form.Field>

          <form.Field name="content">
            {(field) => {
              const error = extractFieldError(field);
              return (
                <FormField
                  label="Signature Content"
                  name={field.name}
                  error={error}
                  required
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) =>
                      setActiveTab(v as "edit" | "preview")
                    }
                  >
                    <TabsList className="mb-2">
                      <TabsTrigger value="edit" className="gap-1">
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="edit" className="mt-0">
                      <div
                        className="flex flex-wrap gap-1 p-2 border border-b-0 rounded-t-md bg-muted/30"
                        role="toolbar"
                        aria-label="formatting-toolbar"
                      >
                        <ToolbarButton
                          icon={Bold}
                          label="Bold (Ctrl+B)"
                          onClick={() => execCommand("bold")}
                        />
                        <ToolbarButton
                          icon={Italic}
                          label="Italic (Ctrl+I)"
                          onClick={() => execCommand("italic")}
                        />
                        <ToolbarButton
                          icon={Underline}
                          label="Underline (Ctrl+U)"
                          onClick={() => execCommand("underline")}
                        />
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton
                          icon={AlignLeft}
                          label="Align Left"
                          onClick={() => execCommand("justifyLeft")}
                        />
                        <ToolbarButton
                          icon={AlignCenter}
                          label="Align Center"
                          onClick={() => execCommand("justifyCenter")}
                        />
                        <ToolbarButton
                          icon={AlignRight}
                          label="Align Right"
                          onClick={() => execCommand("justifyRight")}
                        />
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton
                          icon={List}
                          label="Bullet List"
                          onClick={() => execCommand("insertUnorderedList")}
                        />
                        <ToolbarButton
                          icon={ListOrdered}
                          label="Numbered List"
                          onClick={() => execCommand("insertOrderedList")}
                        />
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton
                          icon={Link}
                          label="Insert Link"
                          onClick={() => {
                            const url = prompt("Enter URL:");
                            if (url) execCommand("createLink", url);
                          }}
                        />
                      </div>

                      <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleEditorInput}
                        className={cn(
                          "min-h-[200px] p-3 border rounded-b-md",
                          "prose prose-sm max-w-none",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          "[&_a]:text-primary [&_a]:underline"
                        )}
                        aria-label="signature-content"
                        suppressContentEditableWarning
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="mt-0">
                      <div
                        className="min-h-[200px] p-4 border rounded-md bg-muted/20"
                        aria-label="preview-panel"
                      >
                        <div className="text-sm text-muted-foreground mb-2">
                          Preview:
                        </div>
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              sanitizeHtml(contentValue) || "<p>No content</p>",
                          }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </FormField>
              );
            }}
          </form.Field>

          <form.Field name="isDefault">
            {(field) => (
              <CheckboxField
                field={field}
                label="Set as my default signature"
                className="flex flex-row items-center space-x-2 space-y-0"
              />
            )}
          </form.Field>

          <FormActions
            form={form}
            submitLabel={signature?.id ? "Update Signature" : "Create Signature"}
            cancelLabel="Cancel"
            loadingLabel="Saving..."
            onCancel={onCancel}
            submitDisabled={isPending}
            showCancel={!!onCancel}
          />
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TOOLBAR BUTTON SUBCOMPONENT
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon: Icon, label, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
