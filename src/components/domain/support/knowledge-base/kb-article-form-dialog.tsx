/**
 * Knowledge Base Article Form Dialog
 *
 * Dialog for creating and editing KB articles.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { KbArticleResponse, KbCategoryResponse } from '@/lib/schemas/support/knowledge-base';
import { useState } from 'react';

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
  const isEditing = !!article;
  const [tagInput, setTagInput] = useState('');

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
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
  });

  // Auto-generate slug from title
  const watchTitle = form.watch('title');
  const handleTitleBlur = () => {
    const currentSlug = form.getValues('slug');
    if (!currentSlug && watchTitle) {
      const generatedSlug = watchTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      form.setValue('slug', generatedSlug);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;

    const currentTags = form.getValues('tags') ?? [];
    if (currentTags.includes(tag)) {
      setTagInput('');
      return;
    }
    if (currentTags.length >= 20) {
      toast.error('Maximum 20 tags allowed');
      return;
    }

    form.setValue('tags', [...currentTags, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') ?? [];
    form.setValue(
      'tags',
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  const handleSubmit = async (values: ArticleFormValues) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
      form.reset();
    } catch {
      // errors handled by container
    }
  };

  const isPending = isSubmitting ?? false;
  const watchTags = form.watch('tags') ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Article' : 'Create Article'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="How to Install Your Battery System"
                      {...field}
                      onBlur={() => {
                        field.onBlur();
                        handleTitleBlur();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="how-to-install-battery" {...field} />
                    </FormControl>
                    <FormDescription>URL-friendly identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value ?? 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {(categories ?? []).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief summary for article listings..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Short description shown in search results</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Article content (supports Markdown)..."
                      className="resize-none font-mono text-sm"
                      rows={10}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Full article content. Markdown formatting is supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
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
                  {watchTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {watchTags.map((tag) => (
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
                  <FormDescription>Press Enter or click Add to add tags</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SEO Fields */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-muted-foreground text-sm font-medium">SEO (Optional)</h4>
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Custom title for search engines"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Custom description for search engines"
                        className="resize-none"
                        rows={2}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
