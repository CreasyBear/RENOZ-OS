/**
 * WinLossReasonsManager Component
 *
 * Settings component for managing win/loss reasons.
 * Allows creating, editing, and deactivating reasons.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { memo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Trophy,
  XCircle,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import {
  listWinLossReasons,
  createWinLossReason,
  updateWinLossReason,
  deleteWinLossReason,
} from "@/server/functions/win-loss-reasons";
import type { WinLossReasonType } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface WinLossReasonsManagerProps {
  className?: string;
}

interface ReasonForm {
  name: string;
  type: WinLossReasonType;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: ReasonForm = {
  name: "",
  type: "win",
  description: "",
  isActive: true,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const WinLossReasonsManager = memo(function WinLossReasonsManager({
  className,
}: WinLossReasonsManagerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<WinLossReasonType>("win");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReasonForm>(EMPTY_FORM);

  // Fetch reasons
  const { data, isLoading } = useQuery({
    queryKey: ["win-loss-reasons"],
    queryFn: async () => {
      const result = await listWinLossReasons({ data: {} });
      return result;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ReasonForm) => {
      return createWinLossReason({ data });
    },
    onSuccess: () => {
      toastSuccess("Reason created successfully");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["win-loss-reasons"] });
    },
    onError: () => {
      toastError("Failed to create reason");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReasonForm }) => {
      return updateWinLossReason({ data: { id, data } });
    },
    onSuccess: () => {
      toastSuccess("Reason updated successfully");
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["win-loss-reasons"] });
    },
    onError: () => {
      toastError("Failed to update reason");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteWinLossReason({ data: { id } });
    },
    onSuccess: (result) => {
      if (result.deactivated) {
        toastSuccess(`Reason deactivated (used by ${result.usageCount} opportunities)`);
      } else {
        toastSuccess("Reason deleted successfully");
      }
      setDeleteDialogOpen(false);
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["win-loss-reasons"] });
    },
    onError: () => {
      toastError("Failed to delete reason");
    },
  });

  // Filter reasons by type
  const winReasons = data?.reasons.filter((r) => r.type === "win") ?? [];
  const lossReasons = data?.reasons.filter((r) => r.type === "loss") ?? [];

  // Handle edit
  const handleEdit = (reason: (typeof data)["reasons"][0]) => {
    setEditingId(reason.id);
    setForm({
      name: reason.name,
      type: reason.type,
      description: reason.description ?? "",
      isActive: reason.isActive,
    });
    setDialogOpen(true);
  };

  // Handle save
  const handleSave = () => {
    if (!form.name.trim()) {
      toastError("Name is required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  // Render reason list
  const renderReasonList = (reasons: typeof winReasons, type: WinLossReasonType) => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (reasons.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {type} reasons yet. Add one to get started.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {reasons.map((reason) => (
          <div
            key={reason.id}
            className={cn(
              "flex items-center justify-between p-4 border rounded-lg",
              !reason.isActive && "opacity-50"
            )}
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{reason.name}</span>
                  {!reason.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                {reason.description && (
                  <p className="text-sm text-muted-foreground">
                    {reason.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(reason)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(reason.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Win/Loss Reasons</CardTitle>
            <CardDescription>
              Manage reasons for winning and losing opportunities
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setForm({ ...EMPTY_FORM, type: activeTab });
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Reason
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WinLossReasonType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="win" className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-600" />
              Win Reasons ({winReasons.length})
            </TabsTrigger>
            <TabsTrigger value="loss" className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Loss Reasons ({lossReasons.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="win" className="mt-4">
            {renderReasonList(winReasons, "win")}
          </TabsContent>

          <TabsContent value="loss" className="mt-4">
            {renderReasonList(lossReasons, "loss")}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Reason" : "Add Reason"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the win/loss reason details."
                : "Create a new reason for tracking wins or losses."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason-name">Name</Label>
              <Input
                id="reason-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Better pricing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as WinLossReasonType })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="win">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-green-600" />
                      Win Reason
                    </div>
                  </SelectItem>
                  <SelectItem value="loss">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Loss Reason
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason-description">Description (optional)</Label>
              <Textarea
                id="reason-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Additional context for this reason..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="reason-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label htmlFor="reason-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingId
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reason</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reason? If it&apos;s currently
              used by any opportunities, it will be deactivated instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

export default WinLossReasonsManager;
