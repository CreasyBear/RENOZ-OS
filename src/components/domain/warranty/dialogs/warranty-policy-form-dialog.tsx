/**
 * Warranty Policy Form Dialog Component
 *
 * Dialog for creating/editing warranty policies.
 * Supports configuring policy terms, SLA settings, and cycle limits.
 *
 * @see src/hooks/use-warranty-policies.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-001c
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { WarrantyPolicy, WarrantyPolicyTerms } from 'drizzle/schema';
import type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';
import { Battery, Zap, Wrench, Shield } from 'lucide-react';

interface WarrantyPolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Policy to edit (null for create mode) */
  policy?: WarrantyPolicy | null;
  /** Callback when policy is saved */
  onSuccess?: () => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    policyId?: string;
    name: string;
    description: string | null;
    type: WarrantyPolicyTypeValue;
    durationMonths: number;
    cycleLimit: number | null;
    terms: WarrantyPolicyTerms;
    isDefault: boolean;
    isActive: boolean;
  }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

const POLICY_TYPES: { value: WarrantyPolicyTypeValue; label: string; icon: typeof Shield }[] = [
  { value: 'battery_performance', label: 'Battery Performance', icon: Battery },
  { value: 'inverter_manufacturer', label: 'Inverter Manufacturer', icon: Zap },
  { value: 'installation_workmanship', label: 'Installation Workmanship', icon: Wrench },
];

/**
 * Default duration presets by policy type.
 */
const DEFAULT_DURATIONS: Record<WarrantyPolicyTypeValue, { months: number; cycles?: number }> = {
  battery_performance: { months: 120, cycles: 10000 },
  inverter_manufacturer: { months: 60 },
  installation_workmanship: { months: 24 },
};

export function WarrantyPolicyFormDialog({
  open,
  onOpenChange,
  policy,
  onSuccess,
  onSubmit,
  isSubmitting,
}: WarrantyPolicyFormDialogProps) {
  const isEditMode = !!policy;

  // Form state - basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WarrantyPolicyTypeValue>('battery_performance');
  const [durationMonths, setDurationMonths] = useState(120);
  const [cycleLimit, setCycleLimit] = useState<number | null>(10000);
  const [isDefault, setIsDefault] = useState(false);

  // Form state - terms
  const [coverage, setCoverage] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [claimRequirements, setClaimRequirements] = useState('');
  const [transferable, setTransferable] = useState(true);

  // Reset form when dialog opens or policy changes
  useEffect(() => {
    if (open) {
      if (policy) {
        // Edit mode - populate from existing policy
        setName(policy.name);
        setDescription(policy.description ?? '');
        setType(policy.type);
        setDurationMonths(policy.durationMonths);
        setCycleLimit(policy.cycleLimit);
        setIsDefault(policy.isDefault);

        // Parse terms
        const terms = policy.terms as WarrantyPolicyTerms | null;
        setCoverage(terms?.coverage?.join('\n') ?? '');
        setExclusions(terms?.exclusions?.join('\n') ?? '');
        setClaimRequirements(terms?.claimRequirements?.join('\n') ?? '');
        setTransferable(terms?.transferable ?? true);
      } else {
        // Create mode - reset to defaults
        setName('');
        setDescription('');
        setType('battery_performance');
        setDurationMonths(120);
        setCycleLimit(10000);
        setIsDefault(false);
        setCoverage('');
        setExclusions('');
        setClaimRequirements('');
        setTransferable(true);
      }
    }
  }, [open, policy]);

  // Update defaults when type changes (in create mode only)
  useEffect(() => {
    if (!isEditMode && open) {
      const defaults = DEFAULT_DURATIONS[type];
      setDurationMonths(defaults.months);
      setCycleLimit(defaults.cycles ?? null);
    }
  }, [type, isEditMode, open]);

  // Parse multiline text to array
  const parseTextToArray = (text: string): string[] =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  // Build terms object
  const buildTerms = (): WarrantyPolicyTerms => ({
    coverage: parseTextToArray(coverage),
    exclusions: parseTextToArray(exclusions),
    claimRequirements: parseTextToArray(claimRequirements),
    transferable,
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    if (durationMonths < 1) {
      toast.error('Duration must be at least 1 month');
      return;
    }

    if (type === 'battery_performance' && cycleLimit !== null && cycleLimit < 1) {
      toast.error('Cycle limit must be at least 1');
      return;
    }

    try {
      const formData = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        durationMonths,
        cycleLimit: type === 'battery_performance' ? cycleLimit : null,
        terms: buildTerms(),
        isDefault,
        isActive: true,
      };

      if (isEditMode && policy) {
        await onSubmit({ policyId: policy.id, ...formData });
      } else {
        await onSubmit(formData);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      // Error toast is handled by the mutation hook
    }
  };

  const isPending = isSubmitting ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Warranty Policy' : 'Create Warranty Policy'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the warranty policy details and terms.'
                : 'Create a new warranty policy for products.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Policy Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Battery Performance Warranty"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the warranty policy..."
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Policy Type *</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as WarrantyPolicyTypeValue)}
                  disabled={isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_TYPES.map(({ value, label, icon: Icon }) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEditMode && (
                  <p className="text-muted-foreground text-xs">
                    Policy type cannot be changed after creation
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="durationMonths">Duration (months) *</Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    min={1}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-muted-foreground text-xs">
                    {durationMonths >= 12
                      ? `${Math.floor(durationMonths / 12)} year${Math.floor(durationMonths / 12) !== 1 ? 's' : ''}${durationMonths % 12 ? ` ${durationMonths % 12} month${durationMonths % 12 !== 1 ? 's' : ''}` : ''}`
                      : `${durationMonths} month${durationMonths !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {type === 'battery_performance' && (
                  <div className="grid gap-2">
                    <Label htmlFor="cycleLimit">Cycle Limit</Label>
                    <Input
                      id="cycleLimit"
                      type="number"
                      min={0}
                      value={cycleLimit ?? ''}
                      onChange={(e) =>
                        setCycleLimit(e.target.value ? parseInt(e.target.value) : null)
                      }
                      placeholder="e.g., 10000"
                    />
                    <p className="text-muted-foreground text-xs">Maximum charge/discharge cycles</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch id="isDefault" checked={isDefault} onCheckedChange={setIsDefault} />
                <Label htmlFor="isDefault">
                  Set as default policy for {POLICY_TYPES.find((t) => t.value === type)?.label}
                </Label>
              </div>
            </div>

            <Separator />

            {/* Terms Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Policy Terms</h3>

              <div className="grid gap-2">
                <Label htmlFor="coverage">Coverage (one per line)</Label>
                <Textarea
                  id="coverage"
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  placeholder="Capacity retention below 60%&#10;Manufacturing defects&#10;Cell failure"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exclusions">Exclusions (one per line)</Label>
                <Textarea
                  id="exclusions"
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="Physical damage&#10;Improper installation&#10;Unauthorized modifications"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="claimRequirements">Claim Requirements (one per line)</Label>
                <Textarea
                  id="claimRequirements"
                  value={claimRequirements}
                  onChange={(e) => setClaimRequirements(e.target.value)}
                  placeholder="Proof of purchase&#10;Installation certificate&#10;Diagnostic report"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="transferable"
                  checked={transferable}
                  onCheckedChange={setTransferable}
                />
                <Label htmlFor="transferable">Warranty is transferable</Label>
              </div>
            </div>
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
              {isPending ? 'Saving...' : isEditMode ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
