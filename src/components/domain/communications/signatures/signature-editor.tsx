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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
  Save,
  Loader2,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  createEmailSignature,
  updateEmailSignature,
} from "@/lib/server/email-signatures";
import { toast } from "sonner";

// ============================================================================
// SCHEMAS
// ============================================================================

const signatureFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Signature content is required"),
  isDefault: z.boolean(),
});

export type SignatureFormValues = z.infer<typeof signatureFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface SignatureEditorProps {
  signature?: {
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
  };
  onSave?: () => void;
  onCancel?: () => void;
  className?: string;
}

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
  const queryClient = useQueryClient();

  const form = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureFormSchema),
    defaultValues: {
      name: signature?.name ?? "",
      content: signature?.content ?? "",
      isDefault: signature?.isDefault ?? false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: SignatureFormValues) => {
      return createEmailSignature({ data: values });
    },
    onSuccess: () => {
      toast.success("Signature created");
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.signatures() });
      onSave?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create signature"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: SignatureFormValues) => {
      if (!signature?.id) throw new Error("No signature ID");
      return updateEmailSignature({
        data: {
          id: signature.id,
          ...values,
        },
      });
    },
    onSuccess: () => {
      toast.success("Signature updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.signatures() });
      onSave?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update signature"
      );
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: SignatureFormValues) => {
    if (signature?.id) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  // Format command helper
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    // Update form value after formatting
    if (editorRef.current) {
      form.setValue("content", editorRef.current.innerHTML);
    }
  };

  // Handle editor content changes
  const handleEditorInput = () => {
    if (editorRef.current) {
      form.setValue("content", editorRef.current.innerHTML);
    }
  };

  // Set initial editor content
  React.useEffect(() => {
    if (editorRef.current && signature?.content) {
      editorRef.current.innerHTML = signature.content;
    }
  }, [signature?.content]);

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signature Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Signature"
                      {...field}
                      aria-label="signature-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Editor with Tabs */}
            <FormField
              control={form.control}
              name="content"
              render={() => (
                <FormItem>
                  <FormLabel>Signature Content</FormLabel>
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
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
                      {/* Formatting Toolbar */}
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

                      {/* Editor Area */}
                      <FormControl>
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
                      </FormControl>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-0">
                      {/* Preview Area */}
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
                            __html: form.watch("content") || "<p>No content</p>",
                          }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Checkbox */}
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Set as default signature"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Set as my default signature
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {signature?.id ? "Update" : "Create"} Signature
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
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
