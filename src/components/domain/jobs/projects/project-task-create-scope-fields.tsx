import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/forms';
import type { FormFieldWithType } from '@/components/shared/forms/types';
import type { ProjectWorkstream, SiteVisitItem } from '@/lib/schemas/jobs';

export interface ProjectTaskCreateScopeFieldsProps {
  workstreamField: FormFieldWithType<string | undefined>;
  workstreams: readonly ProjectWorkstream[];
  siteVisits: readonly SiteVisitItem[];
  selectedSiteVisitId: string;
  onSiteVisitChange: (siteVisitId: string) => void;
  onCreateSiteVisit: () => void;
  onCreateWorkstream: () => void;
}

export function ProjectTaskCreateScopeFields({
  workstreamField,
  workstreams,
  siteVisits,
  selectedSiteVisitId,
  onSiteVisitChange,
  onCreateSiteVisit,
  onCreateWorkstream,
}: ProjectTaskCreateScopeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Workstream" name={workstreamField.name}>
        <Select
          value={workstreamField.state.value || 'none'}
          onValueChange={(value) => {
            if (value === '__create_new__') {
              onCreateWorkstream();
              return;
            }
            workstreamField.setValue(value === 'none' ? '' : value);
          }}
          onOpenChange={(isOpen) => !isOpen && workstreamField.handleBlur()}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select workstream" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {workstreams.map((workstream) => (
              <SelectItem key={workstream.id} value={workstream.id}>
                {workstream.name}
              </SelectItem>
            ))}
            <SelectItem value="__create_new__" className="text-primary font-medium border-t mt-1 pt-1">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create new workstream
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {siteVisits.length >= 1 ? (
        <FormField label="Site Visit (optional)" name="siteVisitId">
          <Select
            value={selectedSiteVisitId || 'none'}
            onValueChange={(value) => onSiteVisitChange(value === 'none' ? '' : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No specific visit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific visit</SelectItem>
              {siteVisits.map((visit) => (
                <SelectItem key={visit.id} value={visit.id}>
                  {visit.visitNumber || 'Untitled Visit'}
                  {visit.scheduledDate
                    ? ` — ${new Date(visit.scheduledDate).toLocaleDateString()}`
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      ) : (
        <FormField label="Site Visit" name="siteVisitId">
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <span>No visits yet.</span>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-primary"
              onClick={onCreateSiteVisit}
            >
              Create one
            </Button>
          </div>
        </FormField>
      )}
    </div>
  );
}
