/**
 * OpportunityForm Component
 *
 * Form for editing opportunity details including title, description, value,
 * probability, expected close date, and stage. Used inline on the opportunity
 * detail page.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-DETAIL-UI)
 */

import * as React from "react";
import { memo } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  STAGE_PROBABILITY_DEFAULTS,
  type OpportunityStage,
} from "@/lib/schemas/pipeline";
import { useOrgFormat } from "@/hooks/use-org-format";
import { FormFieldDisplayProvider, DateStringField } from "@/components/shared/forms";

// ============================================================================
// TYPES
// ============================================================================

const opportunityFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional(),
  stage: z.enum(["new", "qualified", "proposal", "negotiation"]),
  probability: z.number().min(0).max(100),
  value: z.number().min(0),
  expectedCloseDate: z.string().optional(),
  tags: z.array(z.string()).max(20),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityData {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  probability: number | null;
  value: number;
  expectedCloseDate: Date | string | null;
  tags: string[] | null;
}

interface CustomerData {
  id: string;
  name: string;
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
}

export interface OpportunityFormProps {
  opportunity: OpportunityData;
  customer: CustomerData | null;
  contact: ContactData | null;
  onSave: (updates: Partial<OpportunityData>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const FORM_STAGES = ["new", "qualified", "proposal", "negotiation"] as const;
type OpportunityFormStage = (typeof FORM_STAGES)[number];

const STAGE_OPTIONS: Array<{ value: OpportunityFormStage; label: string }> = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const OpportunityForm = memo(function OpportunityForm({
  opportunity,
  customer,
  contact,
  onSave,
  onCancel,
  isLoading = false,
}: OpportunityFormProps) {
  const { formatCurrency } = useOrgFormat();

  const form = useTanStackForm<OpportunityFormValues>({
    schema: opportunityFormSchema,
    defaultValues: {
      title: opportunity.title,
      description: opportunity.description ?? "",
      stage: (FORM_STAGES.includes(opportunity.stage as OpportunityFormStage) ? opportunity.stage : "new") as OpportunityFormStage,
      probability: opportunity.probability ?? 10,
      value: opportunity.value,
      expectedCloseDate: opportunity.expectedCloseDate
        ? new Date(opportunity.expectedCloseDate).toISOString().split("T")[0]
        : "",
      tags: opportunity.tags ?? [],
    },
    onSubmit: (values) => {
      onSave({
        title: values.title,
        description: values.description || null,
        stage: values.stage,
        probability: values.probability,
        value: values.value,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate) : null,
        tags: values.tags,
      });
    },
  });

  const probability = form.useWatch("probability");
  const stage = form.useWatch("stage");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Edit Opportunity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormFieldDisplayProvider form={form}>
            {/* Customer & Contact (read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input
                  value={customer?.name ?? "Unknown Customer"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input
                  value={
                    contact
                      ? `${contact.firstName} ${contact.lastName}`
                      : "No contact assigned"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Title */}
            <form.Field name="title">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Opportunity title"
                    maxLength={255}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Add details about this opportunity..."
                    rows={4}
                    maxLength={2000}
                  />
                </div>
              )}
            </form.Field>

            {/* Stage and Probability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form.Field name="stage">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select
                      value={field.state.value ?? "new"}
                      onValueChange={(v) =>
                        field.handleChange(
                          (FORM_STAGES.includes(v as OpportunityFormStage) ? v : (field.state.value ?? "new")) as OpportunityFormStage
                        )
                      }
                    >
                      <SelectTrigger id="stage">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label} (Default: {STAGE_PROBABILITY_DEFAULTS[option.value]}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              <form.Field name="probability">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability: {field.state.value ?? 0}%</Label>
                    <Slider
                      id="probability"
                      value={[field.state.value ?? 0]}
                      onValueChange={([val]) => field.handleChange(val)}
                      min={0}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Stage default: {STAGE_PROBABILITY_DEFAULTS[stage as OpportunityStage]}%
                    </p>
                  </div>
                )}
              </form.Field>
            </div>

            {/* Value and Expected Close Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form.Field name="value">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="value">Value (AUD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="value"
                        type="number"
                        value={field.state.value ?? ""}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value);
                          field.handleChange(!isNaN(num) ? num : 0);
                        }}
                        onBlur={field.handleBlur}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Weighted value:{" "}
                      {formatCurrency(
                        ((field.state.value ?? 0) * (probability ?? 0)) / 100,
                        { cents: false, showCents: true }
                      )}
                    </p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="expectedCloseDate">
                {(field) => (
                  <DateStringField
                    field={field}
                    label="Expected Close Date"
                    placeholder="Select date"
                  />
                )}
              </form.Field>
            </div>

            {/* Tags - array field with add/remove */}
            <form.Field name="tags">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <TagsEditor
                    tags={field.state.value ?? []}
                    onChange={field.handleChange}
                    maxTags={20}
                  />
                </div>
              )}
            </form.Field>
          </FormFieldDisplayProvider>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
});

// Helper for tags with add/remove
function TagsEditor({
  tags,
  onChange,
  maxTags,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags: number;
}) {
  const [newTag, setNewTag] = React.useState("");

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add a tag..."
          maxLength={50}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTag();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAddTag}
          disabled={!newTag.trim() || tags.length >= maxTags}
        >
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleRemoveTag(tag)}
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} tags. Click a tag to remove it.
      </p>
    </div>
  );
}

export default OpportunityForm;
