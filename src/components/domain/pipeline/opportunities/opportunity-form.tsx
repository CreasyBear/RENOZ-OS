/**
 * OpportunityForm Component
 *
 * Form for editing opportunity details including title, description, value,
 * probability, expected close date, and stage. Used inline on the opportunity
 * detail page.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-DETAIL-UI)
 */

import { memo, useState } from "react";
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
  isValidOpportunityStage,
} from "@/lib/schemas/pipeline";
import { useOrgFormat } from "@/hooks/use-org-format";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGE_OPTIONS: Array<{ value: OpportunityStage; label: string }> = [
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
  // Form state
  const [title, setTitle] = useState(opportunity.title);
  const [description, setDescription] = useState(opportunity.description ?? "");
  const [stage, setStage] = useState<OpportunityStage>(() => {
    return isValidOpportunityStage(opportunity.stage) ? opportunity.stage : 'new';
  });
  const [probability, setProbability] = useState(opportunity.probability ?? 10);
  const [value, setValue] = useState(opportunity.value);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>(() => {
    if (!opportunity.expectedCloseDate) return "";
    const date = new Date(opportunity.expectedCloseDate);
    return date.toISOString().split("T")[0];
  });
  const [tags, setTags] = useState<string[]>(opportunity.tags ?? []);
  const [newTag, setNewTag] = useState("");

  // Update probability when stage changes (if user wants default)
  const handleStageChange = (newStage: OpportunityStage) => {
    setStage(newStage);
    // Optionally auto-update probability to stage default
    // setProbability(STAGE_PROBABILITY_DEFAULTS[newStage]);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description: description || null,
      stage,
      probability,
      value,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      tags,
    });
  };

  // Handle tag addition
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 20) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Update value from dollars input
  const handleValueChange = (dollars: string) => {
    const num = parseFloat(dollars);
    if (!isNaN(num)) {
      setValue(num);
    } else if (dollars === "") {
      setValue(0);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Edit Opportunity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opportunity title"
              required
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this opportunity..."
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Stage and Probability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select value={stage} onValueChange={handleStageChange}>
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

            <div className="space-y-2">
              <Label htmlFor="probability">Probability: {probability}%</Label>
              <Slider
                id="probability"
                value={[probability]}
                onValueChange={([val]) => setProbability(val)}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">
                Stage default: {STAGE_PROBABILITY_DEFAULTS[stage]}%
              </p>
            </div>
          </div>

          {/* Value and Expected Close Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value (AUD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="value"
                  type="number"
                  value={value || ""}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Weighted value: {formatCurrency((value * probability) / 100, { cents: false, showCents: true })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
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
                disabled={!newTag.trim() || tags.length >= 20}
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
              {tags.length}/20 tags. Click a tag to remove it.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !title.trim()}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
});

export default OpportunityForm;
