/**
 * Signatures List Component
 *
 * Settings page component for managing email signatures.
 * Lists all signatures with actions to edit, delete, and set default.
 *
 * @see DOM-COMMS-006
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
  Edit2,
  Building2,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

import {
  getEmailSignatures,
  deleteEmailSignature,
  setDefaultSignature,
} from "@/lib/server/email-signatures";
import { SignatureEditor } from "./signature-editor";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  isCompanyWide: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SignaturesListProps {
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SignaturesList({ className }: SignaturesListProps) {
  const [editingSignature, setEditingSignature] = React.useState<Signature | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Signature | null>(null);
  const queryClient = useQueryClient();

  const { data: signaturesData, isLoading } = useQuery({
    queryKey: ["email-signatures"],
    queryFn: () => getEmailSignatures({ data: { includeCompanyWide: true } }),
  });

  const signatures = (signaturesData as Signature[] | undefined) ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteEmailSignature({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Signature deleted");
      queryClient.invalidateQueries({ queryKey: ["email-signatures"] });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete signature"
      );
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return setDefaultSignature({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Default signature updated");
      queryClient.invalidateQueries({ queryKey: ["email-signatures"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to set default"
      );
    },
  });

  const handleSave = () => {
    setEditingSignature(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingSignature(null);
    setIsCreating(false);
  };

  // Show editor when creating or editing
  if (isCreating || editingSignature) {
    return (
      <SignatureEditor
        signature={editingSignature ?? undefined}
        onSave={handleSave}
        onCancel={handleCancel}
        className={className}
      />
    );
  }

  // Personal and company signatures
  const personalSignatures = signatures.filter((s) => !s.isCompanyWide);
  const companySignatures = signatures.filter((s) => s.isCompanyWide);

  return (
    <Card className={className} aria-label="signatures-list">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Signatures</CardTitle>
            <CardDescription>
              Create personal signatures for your outgoing emails
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Signature
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : signatures.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <User className="h-10 w-10" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No signatures yet</EmptyTitle>
              <EmptyDescription>
                Create a signature to automatically add to your emails.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setIsCreating(true)} className="gap-2 mt-4">
              <Plus className="h-4 w-4" />
              Create Your First Signature
            </Button>
          </Empty>
        ) : (
          <div className="space-y-6">
            {/* Personal Signatures */}
            {personalSignatures.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  My Signatures
                </h4>
                <div className="space-y-3">
                  {personalSignatures.map((signature) => (
                    <SignatureCard
                      key={signature.id}
                      signature={signature}
                      onEdit={() => setEditingSignature(signature)}
                      onDelete={() => setDeleteConfirm(signature)}
                      onSetDefault={() => setDefaultMutation.mutate(signature.id)}
                      isSettingDefault={setDefaultMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Company Signatures */}
            {companySignatures.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Signatures
                </h4>
                <div className="space-y-3">
                  {companySignatures.map((signature) => (
                    <SignatureCard
                      key={signature.id}
                      signature={signature}
                      isCompany
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Signature</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteConfirm?.name}"? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SIGNATURE CARD SUBCOMPONENT
// ============================================================================

interface SignatureCardProps {
  signature: Signature;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  isSettingDefault?: boolean;
  isCompany?: boolean;
}

function SignatureCard({
  signature,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault,
  isCompany,
}: SignatureCardProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-colors hover:bg-muted/50",
        signature.isDefault && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-medium truncate">{signature.name}</h5>
            {signature.isDefault && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-current" />
                Default
              </Badge>
            )}
            {isCompany && (
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" />
                Company
              </Badge>
            )}
          </div>
          <div
            className="prose prose-sm max-w-none text-muted-foreground line-clamp-2"
            dangerouslySetInnerHTML={{ __html: signature.content }}
          />
        </div>

        {/* Actions (only for personal signatures) */}
        {!isCompany && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {!signature.isDefault && (
                <DropdownMenuItem
                  onClick={onSetDefault}
                  disabled={isSettingDefault}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
