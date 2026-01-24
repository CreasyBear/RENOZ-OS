/**
 * Template Editor Component (Presenter)
 *
 * Rich text editor for creating and editing email templates.
 * Includes formatting toolbar and variable insertion.
 * All mutations are handled by the container.
 *
 * @see DOM-COMMS-007
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */

'use client';

import { Save, Loader2, History, Eye, Edit2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { TemplateVariableMenu } from '../template-variable-menu';
import { EditorToolbar } from './components/editor-toolbar';
import { TemplatePreview } from './components/template-preview';
import { TemplateSettings } from './components/template-settings';
import { useTemplateEditor } from './hooks/use-template-editor';
import { CATEGORY_OPTIONS, type TemplateEditorProps } from './types';

export function TemplateEditor({
  template,
  onSubmit,
  onCancel,
  onViewHistory,
  isSubmitting = false,
  className,
}: TemplateEditorProps) {
  const {
    form,
    activeTab,
    setActiveTab,
    editorRef,
    handleSubmit,
    execCommand,
    handleEditorInput,
    handleInsertVariable,
    previewContent,
  } = useTemplateEditor({ template, onSubmit });

  return (
    <Card className={className} aria-label="template-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template?.id ? 'Edit Template' : 'Create Template'}</CardTitle>
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name & Category Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome Email" {...field} aria-label="template-name" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        onInsert={(variable) => field.onChange(field.value + variable)}
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
                    onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}
                  >
                    <div className="mb-2 flex items-center justify-between">
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
                      {activeTab === 'edit' && (
                        <TemplateVariableMenu onInsert={handleInsertVariable} />
                      )}
                    </div>

                    <TabsContent value="edit" className="mt-0">
                      <EditorToolbar execCommand={execCommand} />

                      {/* Editor Area */}
                      <FormControl>
                        <div
                          ref={editorRef}
                          contentEditable
                          onInput={handleEditorInput}
                          className={cn(
                            'min-h-[300px] rounded-b-md border p-3',
                            'prose prose-sm max-w-none',
                            'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
                            '[&_a]:text-primary [&_a]:underline'
                          )}
                          aria-label="template-body"
                          suppressContentEditableWarning
                        />
                      </FormControl>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-0">
                      <TemplatePreview
                        subject={previewContent.subject}
                        body={previewContent.body}
                      />
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Toggle & Version Option */}
            {template?.id && (
              <TemplateSettings form={form} currentVersion={template?.version ?? 0} />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {template?.id ? 'Update' : 'Create'} Template
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
