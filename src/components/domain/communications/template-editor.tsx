/**
 * Template Editor Component
 *
 * Rich text editor for creating and editing email templates.
 * Includes formatting toolbar and variable insertion.
 *
 * @see DOM-COMMS-007
 */

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  History,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { TemplateVariableMenu } from "./template-variable-menu";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/communications/use-templates";
import {
  substituteTemplateVariables,
  getSampleTemplateData,
} from "@/lib/communications/template-utils";
import type { TemplateCategory } from "../../../../drizzle/schema";
import { toast } from "sonner";

// ============================================================================
// SCHEMAS
// ============================================================================

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum([
    "quotes",
    "orders",
    "installations",
    "warranty",
    "support",
    "marketing",
    "follow_up",
    "custom",
  ]),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Body is required"),
  isActive: z.boolean(),
  createVersion: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface TemplateEditorProps {
  template?: {
    id: string;
    name: string;
    description?: string | null;
    category: TemplateCategory;
    subject: string;
    bodyHtml: string;
    isActive: boolean;
    version: number;
  };
  onSave?: () => void;
  onCancel?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

// ============================================================================
// CATEGORY OPTIONS
// ============================================================================

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "quotes", label: "Quotes" },
  { value: "orders", label: "Orders" },
  { value: "installations", label: "Installations" },
  { value: "warranty", label: "Warranty" },
  { value: "support", label: "Support" },
  { value: "marketing", label: "Marketing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "custom", label: "Custom" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplateEditor({
  template,
  onSave,
  onCancel,
  onViewHistory,
  className,
}: TemplateEditorProps) {
  const [activeTab, setActiveTab] = React.useState<"edit" | "preview">("edit");
  const editorRef = React.useRef<HTMLDivElement>(null);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      category: template?.category ?? "custom",
      subject: template?.subject ?? "",
      bodyHtml: template?.bodyHtml ?? "",
      isActive: template?.isActive ?? true,
      createVersion: false,
    },
  });

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  const onSubmit = (values: TemplateFormValues) => {
    if (template?.id) {
      updateTemplate.mutate(
        {
          id: template.id,
          name: values.name,
          description: values.description,
          category: values.category,
          subject: values.subject,
          bodyHtml: values.bodyHtml,
          isActive: values.isActive,
          createVersion: values.createVersion,
        },
        {
          onSuccess: () => {
            toast.success("Template updated");
            onSave?.();
          },
          onError: (error) => {
            toast.error(
              error instanceof Error ? error.message : "Failed to update template"
            );
          },
        }
      );
    } else {
      createTemplate.mutate(
        {
          name: values.name,
          description: values.description,
          category: values.category,
          subject: values.subject,
          bodyHtml: values.bodyHtml,
          variables: [],
        },
        {
          onSuccess: () => {
            toast.success("Template created");
            onSave?.();
          },
          onError: (error) => {
            toast.error(
              error instanceof Error ? error.message : "Failed to create template"
            );
          },
        }
      );
    }
  };

  // Format command helper
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      form.setValue("bodyHtml", editorRef.current.innerHTML);
    }
  };

  // Handle editor content changes
  const handleEditorInput = () => {
    if (editorRef.current) {
      form.setValue("bodyHtml", editorRef.current.innerHTML);
    }
  };

  // Handle variable insertion
  const handleInsertVariable = (variable: string) => {
    const selection = window.getSelection();
    if (selection && editorRef.current?.contains(selection.anchorNode)) {
      document.execCommand("insertText", false, variable);
    } else {
      // If no selection in editor, append to end
      if (editorRef.current) {
        editorRef.current.innerHTML += variable;
        form.setValue("bodyHtml", editorRef.current.innerHTML);
      }
    }
  };

  // Set initial editor content
  React.useEffect(() => {
    if (editorRef.current && template?.bodyHtml) {
      editorRef.current.innerHTML = template.bodyHtml;
    }
  }, [template?.bodyHtml]);

  // Generate preview content
  const previewContent = React.useMemo(() => {
    const sampleData = getSampleTemplateData();
    const subject = substituteTemplateVariables(
      form.watch("subject") || "",
      sampleData
    );
    const body = substituteTemplateVariables(
      form.watch("bodyHtml") || "",
      sampleData
    );
    return { subject, body };
  }, [form.watch("subject"), form.watch("bodyHtml")]);

  return (
    <Card className={className} aria-label="template-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {template?.id ? "Edit Template" : "Create Template"}
            </CardTitle>
            <CardDescription>
              Create reusable email templates with variable placeholders
            </CardDescription>
          </div>
          {template?.id && onViewHistory && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewHistory}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Version History
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name & Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Welcome Email"
                        {...field}
                        aria-label="template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="category-tabs">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of when to use this template"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Subject</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Your {{quote.number}} is ready"
                        {...field}
                        className="flex-1"
                        aria-label="template-subject"
                      />
                      <TemplateVariableMenu
                        onInsert={(variable) =>
                          field.onChange(field.value + variable)
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Editor with Tabs */}
            <FormField
              control={form.control}
              name="bodyHtml"
              render={() => (
                <FormItem>
                  <FormLabel>Email Body</FormLabel>
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <TabsList>
                        <TabsTrigger value="edit" className="gap-1">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </TabsTrigger>
                      </TabsList>
                      {activeTab === "edit" && (
                        <TemplateVariableMenu onInsert={handleInsertVariable} />
                      )}
                    </div>

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
                            "min-h-[300px] p-3 border rounded-b-md",
                            "prose prose-sm max-w-none",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            "[&_a]:text-primary [&_a]:underline"
                          )}
                          aria-label="template-body"
                          suppressContentEditableWarning
                        />
                      </FormControl>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-0">
                      <div
                        className="min-h-[300px] border rounded-md bg-muted/20"
                        aria-label="preview-panel"
                      >
                        {/* Subject Preview */}
                        <div className="p-3 border-b bg-muted/40">
                          <div className="text-xs text-muted-foreground mb-1">
                            Subject:
                          </div>
                          <div className="font-medium">
                            {previewContent.subject || "(No subject)"}
                          </div>
                        </div>
                        {/* Body Preview */}
                        <div className="p-4">
                          <div className="text-xs text-muted-foreground mb-2">
                            Preview with sample data:
                          </div>
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html:
                                previewContent.body || "<p>No content</p>",
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Toggle & Version Option */}
            {template?.id && (
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Active
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="createVersion"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Save as new version (v{(template?.version ?? 0) + 1})
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                    {template?.id ? "Update" : "Create"} Template
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
