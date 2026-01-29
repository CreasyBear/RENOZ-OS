/**
 * Signature Selector Component
 *
 * Dropdown for selecting an email signature in the email composer.
 * Shows preview on hover and allows quick selection.
 *
 * @see DOM-COMMS-006
 */

"use client";

import * as React from "react";
import { Check, ChevronDown, FileSignature, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSignatures } from "@/hooks/communications/use-signatures";

// ============================================================================
// TYPES
// ============================================================================

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  isCompanyWide: boolean;
}

interface SignatureSelectorProps {
  value?: string;
  onChange: (signatureId: string | null, content: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SignatureSelector({
  value,
  onChange,
  onCreateNew,
  className,
}: SignatureSelectorProps) {
  const { data: signaturesData, isLoading } = useSignatures({
    includeCompanyWide: true,
  });

  const signatures = (signaturesData as Signature[] | undefined) ?? [];
  const selectedSignature = signatures.find((s) => s.id === value);

  // Auto-select default signature if no value provided
  React.useEffect(() => {
    if (!value && signatures.length > 0) {
      const defaultSig = signatures.find((s) => s.isDefault);
      if (defaultSig) {
        onChange(defaultSig.id, defaultSig.content);
      }
    }
  }, [value, signatures, onChange]);

  const handleSelect = (signature: Signature | null) => {
    if (signature) {
      onChange(signature.id, signature.content);
    } else {
      onChange(null, "");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          disabled={isLoading}
          aria-label="Select email signature"
        >
          <FileSignature className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {selectedSignature?.name ?? "No signature"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Email Signature</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* No signature option */}
        <DropdownMenuItem onClick={() => handleSelect(null)}>
          <span className="flex-1 text-muted-foreground">No signature</span>
          {!value && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Personal signatures */}
        {signatures.filter((s) => !s.isCompanyWide).length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              My Signatures
            </DropdownMenuLabel>
            {signatures
              .filter((s) => !s.isCompanyWide)
              .map((signature) => (
                <SignatureMenuItem
                  key={signature.id}
                  signature={signature}
                  isSelected={value === signature.id}
                  onSelect={handleSelect}
                />
              ))}
          </>
        )}

        {/* Company signatures */}
        {signatures.filter((s) => s.isCompanyWide).length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Company Signatures
            </DropdownMenuLabel>
            {signatures
              .filter((s) => s.isCompanyWide)
              .map((signature) => (
                <SignatureMenuItem
                  key={signature.id}
                  signature={signature}
                  isSelected={value === signature.id}
                  onSelect={handleSelect}
                />
              ))}
          </>
        )}

        {/* Create new option */}
        {onCreateNew && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Signature
            </DropdownMenuItem>
          </>
        )}

        {/* Empty state */}
        {signatures.length === 0 && !isLoading && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No signatures yet
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// SIGNATURE MENU ITEM SUBCOMPONENT
// ============================================================================

interface SignatureMenuItemProps {
  signature: Signature;
  isSelected: boolean;
  onSelect: (signature: Signature) => void;
}

function SignatureMenuItem({
  signature,
  isSelected,
  onSelect,
}: SignatureMenuItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuItem
          onClick={() => onSelect(signature)}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            <span className="truncate max-w-[150px]">{signature.name}</span>
            {signature.isDefault && (
              <span className="text-xs text-muted-foreground">(default)</span>
            )}
          </span>
          {isSelected && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[300px]">
        <div className="text-sm font-medium mb-1">{signature.name}</div>
        <div
          className="prose prose-sm max-w-none text-xs"
          dangerouslySetInnerHTML={{ __html: signature.content }}
        />
      </TooltipContent>
    </Tooltip>
  );
}
