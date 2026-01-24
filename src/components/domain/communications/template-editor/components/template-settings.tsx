/**
 * Template Settings Component
 *
 * Active toggle and version creation options for template editing.
 *
 * @see DOM-COMMS-007
 */

'use client';

import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { TemplateFormValues } from '../types';

interface TemplateSettingsProps {
  form: UseFormReturn<TemplateFormValues>;
  currentVersion: number;
}

export function TemplateSettings({ form, currentVersion }: TemplateSettingsProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 pt-2">
      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="text-sm font-normal">Active</FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="createVersion"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Save as new version (v{currentVersion + 1})
            </FormLabel>
          </FormItem>
        )}
      />
    </div>
  );
}
