/**
 * ConfirmDeliveryDialog Component
 *
 * Dialog for confirming delivery with signature and photo upload.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-UI)
 */
import { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  CheckCircle,
  Camera,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks";
import { useConfirmDelivery } from "@/hooks/orders";
import { useUploadFile, useFetchDownloadUrl } from "@/hooks/files";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// ============================================================================
// TYPES
// ============================================================================

export interface ConfirmDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  onSuccess?: () => void;
}

// ============================================================================
// SIGNATURE PAD COMPONENT
// ============================================================================

interface SignaturePadProps {
  value: string | null;
  onChange: (signature: string | null) => void;
}

const SignaturePad = memo(function SignaturePad({
  value,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoords = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save signature as base64
    const signature = canvas.toDataURL("image/png");
    onChange(signature);
  };

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }, [onChange]);

  // Initialize canvas with resize support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupCanvas = () => {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height || 150;
        setupCanvas(); // Re-apply styles after resize
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Signature</Label>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            className="h-auto py-1"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-32 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Draw signature above using mouse or touch
      </p>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConfirmDeliveryDialog = memo(function ConfirmDeliveryDialog({
  open,
  onOpenChange,
  shipmentId,
  onSuccess,
}: ConfirmDeliveryDialogProps) {
  // Form state
  const [signedBy, setSignedBy] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("signature");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the hook for confirm delivery
  const confirmDeliveryMutation = useConfirmDelivery();
  const uploadFile = useUploadFile();
  const fetchDownloadUrl = useFetchDownloadUrl();

  const uploadPhoto = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file.");
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Image must be 10MB or smaller.");
      }

      const uploadResult = await uploadFile.mutateAsync({
        file,
        entityType: "shipment",
        entityId: shipmentId,
      });

      const download = await fetchDownloadUrl.mutateAsync(
        uploadResult.attachment.id
      );

      return download?.downloadUrl ?? "";
    },
    [fetchDownloadUrl, shipmentId, uploadFile]
  );

  // Wrapper mutation to handle file upload logic
  const handleConfirm = async () => {
    let finalPhotoUrl = photoUrl;
    if (photoFile && !photoUrl) {
      try {
        setIsUploadingPhoto(true);
        finalPhotoUrl = await uploadPhoto(photoFile);
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to upload photo");
        setIsUploadingPhoto(false);
        return;
      }
      setIsUploadingPhoto(false);
    }

    confirmDeliveryMutation.mutate(
      {
        id: shipmentId,
        signedBy: signedBy || undefined,
        signature: signature || undefined,
        photoUrl: finalPhotoUrl || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toastSuccess("Delivery confirmed successfully");
          onOpenChange(false);
          onSuccess?.();
          // Reset form
          setSignedBy("");
          setSignature(null);
          setPhotoUrl("");
          setPhotoFile(null);
          setPhotoPreview(null);
          setNotes("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
        onError: (error) => {
          toastError(
            error instanceof Error ? error.message : "Failed to confirm delivery"
          );
        },
      }
    );
  };

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toastError("Please select an image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > MAX_UPLOAD_BYTES) {
        toastError("Image must be 10MB or smaller");
        return;
      }

      setPhotoFile(file);
      setPhotoUrl("");

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.onerror = () => {
        toastError("Failed to read image file");
        setPhotoFile(null);
        setPhotoPreview(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const isPending = confirmDeliveryMutation.isPending || isUploadingPhoto;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirm Delivery
          </DialogTitle>
          <DialogDescription>
            Record proof of delivery with signature or photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="signed-by">Recipient Name</Label>
            <Input
              id="signed-by"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Enter name of person who received delivery"
            />
          </div>

          {/* Proof of Delivery Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signature">
                <Pencil className="h-4 w-4 mr-2" />
                Signature
              </TabsTrigger>
              <TabsTrigger value="photo">
                <Camera className="h-4 w-4 mr-2" />
                Photo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signature" className="mt-4">
              <SignaturePad value={signature} onChange={setSignature} />
            </TabsContent>

            <TabsContent value="photo" className="mt-4 space-y-3">
              {/* Photo Preview */}
              {(photoPreview || photoUrl) && (
                <div className="relative">
                  <img
                    src={photoPreview || photoUrl}
                    alt="Delivery proof"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={clearPhoto}
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload Button */}
              {!photoPreview && !photoUrl && (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
                    "hover:border-primary hover:bg-primary/5 transition-colors"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload a photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Or Enter URL */}
              <div className="space-y-2">
                <Label htmlFor="photo-url">Or enter photo URL</Label>
                <Input
                  id="photo-url"
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  placeholder="https://..."
                  disabled={!!photoFile}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional delivery notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirmDeliveryMutation.isPending || isUploadingPhoto}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmDeliveryMutation.isPending || isUploadingPhoto}
          >
            {confirmDeliveryMutation.isPending || isUploadingPhoto ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploadingPhoto ? "Uploading..." : "Confirming..."}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Delivery
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ConfirmDeliveryDialog;
