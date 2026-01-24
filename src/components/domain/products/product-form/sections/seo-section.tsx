/**
 * SEOSection Component
 *
 * SEO metadata and tags.
 */
import { Controller } from 'react-hook-form';
import { Tags } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { FormSection } from './form-section';
import type { SEOSectionProps } from '../types';

export function SEOSection({ control }: SEOSectionProps) {
  return (
    <FormSection
      title="SEO & Tags"
      description="Search engine optimization and categorization"
      icon={Tags}
      defaultOpen={false}
    >
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="seoTitle">SEO Title</Label>
          <Controller
            name="seoTitle"
            control={control}
            render={({ field }) => (
              <Input
                id="seoTitle"
                placeholder="Page title for search engines"
                maxLength={255}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
          <p className="text-muted-foreground text-xs">Recommended: 50-60 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seoDescription">SEO Description</Label>
          <Controller
            name="seoDescription"
            control={control}
            render={({ field }) => (
              <Textarea
                id="seoDescription"
                placeholder="Brief description for search results"
                rows={3}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
          <p className="text-muted-foreground text-xs">Recommended: 150-160 characters</p>
        </div>

        {/* Tags - simplified for now */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <p className="text-muted-foreground text-sm">
            Tag management will be available after saving
          </p>
        </div>
      </div>
    </FormSection>
  );
}
