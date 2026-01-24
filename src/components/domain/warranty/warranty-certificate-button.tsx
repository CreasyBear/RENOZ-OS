/**
 * Warranty Certificate Button Component
 *
 * A button component for managing warranty certificates:
 * - Shows "Generate Certificate" if none exists
 * - Shows "Download Certificate" if exists (opens in new tab)
 * - Shows "Regenerate" option via dropdown menu
 * - Handles loading states during generation
 *
 * Features:
 * - Progressive disclosure (only shows regenerate if certificate exists)
 * - Loading states with spinner
 * - Error handling via toast notifications
 * - Accessible keyboard navigation
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-004c
 */

import { FileText, Download, RefreshCw, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyCertificateButtonProps {
  /** The warranty ID to manage certificate for */
  warrantyId: string;
  /** The warranty number for display */
  warrantyNumber: string;
  /** Optional: Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  /** Optional: Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Optional: Additional class names */
  className?: string;
  /** Optional: Callback after successful generation */
  onSuccess?: () => void;
  /** From route container (certificate status). */
  hasCertificate?: boolean;
  /** From route container (certificate status). */
  certificateUrl?: string | null;
  /** From route container (loading flags). */
  isLoadingStatus?: boolean;
  /** From route container (generation). */
  isGenerating?: boolean;
  /** From route container (regeneration). */
  isRegenerating?: boolean;
  /** From route container (generation). */
  onGenerate?: () => Promise<void>;
  /** From route container (regeneration). */
  onRegenerate?: () => Promise<void>;
  /** From route container (download/view). */
  onDownload?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WarrantyCertificateButton({
  warrantyId: _warrantyId,
  warrantyNumber,
  variant = 'outline',
  size = 'default',
  className,
  onSuccess,
  hasCertificate = false,
  certificateUrl,
  isLoadingStatus,
  isGenerating,
  isRegenerating,
  onGenerate,
  onRegenerate,
  onDownload,
}: WarrantyCertificateButtonProps) {
  const isLoading = !!isLoadingStatus || !!isGenerating || !!isRegenerating;

  // Handlers
  const handleGenerate = async () => {
    if (!onGenerate) return;
    await onGenerate();
    onSuccess?.();
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    await onRegenerate();
    onSuccess?.();
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (certificateUrl) {
      window.open(certificateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // If still loading status and no data yet, show skeleton button
  if (isLoadingStatus && !certificateUrl && !hasCertificate) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        aria-label="Loading certificate status"
      >
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // If no certificate exists, show generate button
  if (!hasCertificate) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleGenerate}
        disabled={isGenerating}
        aria-label={
          isGenerating
            ? 'Generating certificate...'
            : `Generate certificate for warranty ${warrantyNumber}`
        }
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="mr-2 size-4" />
            Generate Certificate
          </>
        )}
      </Button>
    );
  }

  // Certificate exists - show download button with dropdown for regenerate
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={isLoading}
            aria-label={
              isRegenerating
                ? 'Regenerating certificate...'
                : `Certificate options for warranty ${warrantyNumber}`
            }
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                Certificate
                <ChevronDown className="ml-2 size-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleDownload}>
            <ExternalLink className="mr-2 size-4" />
            View Certificate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload} className="text-muted-foreground">
            <Download className="mr-2 size-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRegenerate} disabled={isRegenerating}>
            <RefreshCw className="mr-2 size-4" />
            Regenerate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ============================================================================
// SIMPLE VARIANT (Just download link if certificate exists)
// ============================================================================

export interface WarrantyCertificateLinkProps {
  /** The warranty ID to check certificate for */
  warrantyId: string;
  /** Optional: Additional class names */
  className?: string;
  /** From route container (certificate status). */
  certificateUrl?: string | null;
  /** From route container (loading). */
  isLoading?: boolean;
}

/**
 * A simpler variant that just shows a download link if a certificate exists.
 * Useful for inline display in tables or lists.
 */
export function WarrantyCertificateLink({
  warrantyId: _warrantyId,
  className,
  certificateUrl,
  isLoading,
}: WarrantyCertificateLinkProps) {
  if (isLoading) {
    return (
      <span className="text-muted-foreground text-sm">
        <Loader2 className="mr-1 inline size-3 animate-spin" />
        Loading...
      </span>
    );
  }

  if (!certificateUrl) {
    return null;
  }

  return (
    <a
      href={certificateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary inline-flex items-center gap-1 text-sm hover:underline ${className ?? ''}`}
    >
      <FileText className="size-3" />
      View Certificate
      <ExternalLink className="size-3" />
    </a>
  );
}
