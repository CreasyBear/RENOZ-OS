import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/forms';
import type { ProjectTaskTemplateOption } from './project-task-dialog-form-state';

export interface ProjectTaskCreateTemplateFieldProps {
  templateOptions: readonly ProjectTaskTemplateOption[];
  onApplyTemplate: (option: ProjectTaskTemplateOption) => void;
}

export function ProjectTaskCreateTemplateField({
  templateOptions,
  onApplyTemplate,
}: ProjectTaskCreateTemplateFieldProps) {
  if (templateOptions.length === 0) {
    return null;
  }

  return (
    <FormField label="From template (optional)" name="taskTemplate">
      <Select
        value="none"
        onValueChange={(value) => {
          if (value === 'none') return;
          const option = templateOptions.find(taskOption => taskOption.value === value);
          if (option) {
            onApplyTemplate(option);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pre-fill from template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Start from scratch</SelectItem>
          {templateOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
