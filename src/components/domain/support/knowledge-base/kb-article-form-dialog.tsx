/**
 * Knowledge Base Article Form Dialog
 *
 * Dialog for creating and editing KB articles.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import { useEffect, useState, startTransition } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { useConfirmation } from '@/hooks';
import {
  TextField,
  TextareaField,
  SelectField,
  FormFieldDisplayProvider,
} from '@/components/shared/forms';
import type { KbArticleResponse, KbCategoryResponse } from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// FORM SCHEMA
// ============================================================================

const articleFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(300)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20),
  status: z.enum(['draft', 'published', 'archived']),
  metaTitle: z.string().max(100).optional().nullable(),
  metaDescription: z.string().max(200).optional().nullable(),
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface KbArticleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KbArticleResponse | null;
  /** From route container (useKbCategories). */
  categories?: KbCategoryResponse[];
  /** From route container (useCreateKbArticle/useUpdateKbArticle). */
  isSubmitting?: boolean;
  /** From route container (useCreateKbArticle/useUpdateKbArticle). */
  onSubmit: (values: ArticleFormValues) => Promise<void>;
}

export function KbArticleFormDialog({
  open,
  onOpenChange,
  article,
  categories,
  isSubmitting,
  onSubmit,
}: KbArticleFormDialogProps) {
  const confirm = useConfirmation();
  const isEditing = !!article;
  const [tagInput, setTagInput] = useState('');
  const [slugConflictError, setSlugConflictError] = useState<string | null>(null);

  const form = useTanStackForm({
    schema: articleFormSchema,
    defaultValues: {
      title: article?.title ?? '',
      slug: article?.slug ?? '',
      summary: article?.summary ?? '',
      content: article?.content ?? '',
      categoryId: article?.categoryId ?? null,
      tags: article?.tags ?? [],
      status: article?.status ?? 'draft',
      metaTitle: article?.metaTitle ?? '',
      metaDescription: article?.metaDescription ?? '',
    },
    onSubmit: async (values) => {
      try {
        setSlugConflictError(null);
        await onSubmit(values);
        onOpenChange(false);
        form.reset();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save article';
        if (message.toLowerCase().includes('slug') && message.toLowerCase().includes('exist')) {
          setSlugConflictError(message);
        }
        throw error;
      }
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
  });

  // Reset form when article changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: article?.title ?? '',
        slug: article?.slug ?? '',
        summary: article?.summary ?? '',
        content: article?.content ?? '',
        categoryId: article?.categoryId ?? null,
        tags: article?.tags ?? [],
        status: article?.status ?? 'draft',
        metaTitle: article?.metaTitle ?? '',
        metaDescription: article?.metaDescription ?? '',
      });
      startTransition(() => setTagInput(''));
      globalThis.queueMicrotask(() => setSlugConflictError(null));
    }
  }, [open, article, form]);

  // Auto-generate slug from title
  const handleTitleBlur = () => {
    const currentSlug = form.getFieldValue('slug');
    const currentTitle = form.getFieldValue('title');
    if (!currentSlug && currentTitle) {
      const generatedSlug = currentTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      form.setFieldValue('slug', generatedSlug);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;

    const currentTags = form.getFieldValue('tags') ?? [];
    if (currentTags.includes(tag)) {
      setTagInput('');
      return;
    }
    if (currentTags.length >= 20) {
      toast.error('Maximum 20 tags allowed');
      return;
    }

    form.setFieldValue('tags', [...currentTags, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getFieldValue('tags') ?? [];
    form.setFieldValue(
      'tags',
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  const isPending = isSubmitting ?? form.state.isSubmitting;
  const isDirty = form.state.isDirty;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    if (!nextOpen && isDirty) {
      void (async () => {
        const result = await confirm.confirm({
          title: 'Discard Unsaved Changes?',
          description: 'You have unsaved changes in this article form. Discard changes and close?',
          confirmLabel: 'Discard',
          variant: 'destructive',
        });
        if (result.confirmed) {
          onOpenChange(false);
        }
      })();
      return;
    }
    onOpenChange(nextOpen);
  };

  const categoryOptions = [
    { value: '', label: 'Uncategorized' },
    ...(categories ?? []).map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Article' : 'Create Article'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <FormFieldDisplayProvider form={form}>
          <form.Field name="title">
            {(field) => (
              <TextField
                field={field}
                label="Title"
                placeholder="How to Install Your Battery System"
                required
                onBlur={handleTitleBlur}
              />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="slug">
              {(field) => (
                <TextField
                  field={field}
                  label="Slug"
                  placeholder="how-to-install-battery"
                  description="URL-friendly identifier"
                  required
                  onChange={() => setSlugConflictError(null)}
                />
              )}
            </form.Field>
            {slugConflictError && (
              <p className="text-destructive text-xs">{slugConflictError}</p>
            )}

            <form.Field name="status">
              {(field) => (
                <SelectField
                  field={field}
                  label="Status"
                  placeholder="Select status"
                  options={statusOptions}
                  required
                />
              )}
            </form.Field>
          </div>

          <form.Field name="categoryId">
            {(field) => (
              <SelectField
                field={field}
                label="Category"
                placeholder="Select category"
                options={categoryOptions}
              />
            )}
          </form.Field>

          <form.Field name="summary">
            {(field) => (
              <TextareaField
                field={field}
                label="Summary"
                placeholder="Brief summary for article listings..."
                description="Short description shown in search results"
                rows={2}
              />
            )}
          </form.Field>

          <form.Field name="content">
            {(field) => (
              <TextareaField
                field={field}
                label="Content"
                placeholder="Article content (supports Markdown)..."
                description="Full article content. Markdown formatting is supported."
                rows={10}
                required
                className="[&_textarea]:font-mono [&_textarea]:text-sm"
              />
            )}
          </form.Field>

          {/* Tags - Custom implementation with form.Subscribe for reactivity */}
          <form.Subscribe selector={(state) => state.values.tags}>
            {(tags) => (
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags && tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Press Enter or click Add to add tags</p>
              </div>
            )}
          </form.Subscribe>

          {/* SEO Fields */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-muted-foreground text-sm font-medium">SEO (Optional)</h4>
            <form.Field name="metaTitle">
              {(field) => (
                <TextField
                  field={field}
                  label="Meta Title"
                  placeholder="Custom title for search engines"
                />
              )}
            </form.Field>

            <form.Field name="metaDescription">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Meta Description"
                  placeholder="Custom description for search engines"
                  rows={2}
                />
              )}
            </form.Field>
          </div>

          </FormFieldDisplayProvider>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
