/**
 * useTemplateEditor Hook (Presenter Support)
 *
 * Manages template editor state including form and editor commands.
 * Mutations are handled by the container - this hook accepts an onSubmit handler.
 *
 * @see DOM-COMMS-007
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  substituteTemplateVariables,
  getSampleTemplateData,
} from '@/lib/communications/template-utils';
import { templateFormSchema, type TemplateFormValues, type TemplateEditorProps } from '../types';

export function useTemplateEditor({
  template,
  onSubmit: onSubmitProp,
}: Pick<TemplateEditorProps, 'template' | 'onSubmit'>) {
  const [activeTab, setActiveTab] = React.useState<'edit' | 'preview'>('edit');
  const editorRef = React.useRef<HTMLDivElement>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      category: template?.category ?? 'custom',
      subject: template?.subject ?? '',
      bodyHtml: template?.bodyHtml ?? '',
      isActive: template?.isActive ?? true,
      createVersion: false,
    },
  });

  const handleSubmit = async (values: TemplateFormValues) => {
    await onSubmitProp(values);
  };

  // Format command helper
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      form.setValue('bodyHtml', editorRef.current.innerHTML);
    }
  };

  // Handle editor content changes
  const handleEditorInput = () => {
    if (editorRef.current) {
      form.setValue('bodyHtml', editorRef.current.innerHTML);
    }
  };

  // Handle variable insertion
  const handleInsertVariable = (variable: string) => {
    const selection = window.getSelection();
    if (selection && editorRef.current?.contains(selection.anchorNode)) {
      document.execCommand('insertText', false, variable);
    } else {
      // If no selection in editor, append to end
      if (editorRef.current) {
        editorRef.current.innerHTML += variable;
        form.setValue('bodyHtml', editorRef.current.innerHTML);
      }
    }
  };

  // Set initial editor content
  React.useEffect(() => {
    if (editorRef.current && template?.bodyHtml) {
      editorRef.current.innerHTML = template.bodyHtml;
    }
  }, [template?.bodyHtml]);

  // Generate preview content (extract watched values for deps)
  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() returns functions that cannot be memoized; known limitation
  const watchedSubject = form.watch('subject');
  const watchedBodyHtml = form.watch('bodyHtml');
  const previewContent = React.useMemo(() => {
    const sampleData = getSampleTemplateData();
    const subject = substituteTemplateVariables(watchedSubject || '', sampleData);
    const body = substituteTemplateVariables(watchedBodyHtml || '', sampleData);
    return { subject, body };
  }, [watchedSubject, watchedBodyHtml]);

  return {
    form,
    activeTab,
    setActiveTab,
    editorRef,
    handleSubmit,
    execCommand,
    handleEditorInput,
    handleInsertVariable,
    previewContent,
  };
}
