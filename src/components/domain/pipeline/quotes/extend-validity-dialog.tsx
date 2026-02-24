/**
 * ExtendValidityDialog Component
 *
 * Dialog for extending quote validity with reason tracking.
 * Supports preset periods or custom date selection.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-VALIDITY-UI)
 */

import { memo, useState, useCallback } from "react";
import { CalendarPlus, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toastError } from "@/hooks";
import { useExtendQuoteValidity } from "@/hooks/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface ExtendValidityDialogProps {
  opportunityId: string;
  quoteNumber: string;
  currentValidUntil: Date | string | null;
  onSuccess?: (newValidUntil: Date) => void;
  trigger?: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ExtensionPreset = "7days" | "14days" | "30days" | "60days" | "90days" | "custom";

const PRESETS: { value: ExtensionPreset; label: string; getDays: () => number }[] = [
  { value: "7days", label: "7 days", getDays: () => 7 },
  { value: "14days", label: "14 days", getDays: () => 14 },
  { value: "30days", label: "30 days", getDays: () => 30 },
  { value: "60days", label: "60 days", getDays: () => 60 },
  { value: "90days", label: "90 days", getDays: () => 90 },
  { value: "custom", label: "Custom date", getDays: () => 0 },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ExtendValidityDialog = memo(function ExtendValidityDialog({
  opportunityId,
  quoteNumber,
  currentValidUntil,
  onSuccess,
  trigger,
  className,
  open: controlledOpen,
  onOpenChange,
}: ExtendValidityDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [preset, setPreset] = useState<ExtensionPreset>("30days");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");

  const extendMutation = useExtendQuoteValidity();

  const currentDate = currentValidUntil
    ? typeof currentValidUntil === "string"
      ? new Date(currentValidUntil)
      : currentValidUntil
    : new Date();

  const getNewValidUntil = useCallback((): Date => {
    if (preset === "custom" && customDate) {
      return customDate;
    }
    const presetConfig = PRESETS.find((p) => p.value === preset);
    if (presetConfig) {
      return addDays(new Date(), presetConfig.getDays());
    }
    return addDays(new Date(), 30);
  }, [preset, customDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preset === "custom" && !customDate) {
      toastError("Please select a custom date");
      return;
    }
    const newValidUntil = getNewValidUntil();
    extendMutation.mutate(
      {
        opportunityId,
        newExpirationDate: newValidUntil,
        reason: reason.trim() || "No reason provided",
      },
      {
        onSuccess: () => {
          if (!onOpenChange) {
            setInternalOpen(false);
          } else {
            onOpenChange(false);
          }
          setReason("");
          onSuccess?.(newValidUntil);
        },
      }
    );
  };

  const newValidUntil = getNewValidUntil();

  return (
    <Dialog open={open} onOpenChange={createPendingDialogOpenChangeHandler(extendMutation.isPending, setOpen)}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm" className={className}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Extend Validity
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        onEscapeKeyDown={createPendingDialogInteractionGuards(extendMutation.isPending).onEscapeKeyDown}
        onInteractOutside={createPendingDialogInteractionGuards(extendMutation.isPending).onInteractOutside}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Extend Quote Validity</DialogTitle>
            <DialogDescription>
              Extend the validity period for quote {quoteNumber}.
              {currentValidUntil && (
                <>
                  {" "}
                  Currently valid until{" "}
                  {format(currentDate, "PPP")}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extension-preset">Extension Period</Label>
              <Select
                value={preset}
                onValueChange={(v) => setPreset(v as ExtensionPreset)}
              >
                <SelectTrigger id="extension-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preset === "custom" && (
              <div className="space-y-2">
                <Label>New Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate ? format(customDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={setCustomDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="extension-reason">Reason (optional)</Label>
              <Textarea
                id="extension-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer requested more time to review..."
                rows={2}
              />
            </div>

            {preset !== "custom" || customDate ? (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>
                  <span className="font-medium">New expiration date:</span>{" "}
                  {format(newValidUntil, "PPPP")}
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                extendMutation.isPending ||
                (preset === "custom" && !customDate)
              }
            >
              {extendMutation.isPending ? "Extending..." : "Extend Validity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default ExtendValidityDialog;
