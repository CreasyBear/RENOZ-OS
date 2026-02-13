/**
 * ProductBulkImport Component
 *
 * Wizard-style interface for importing products from CSV.
 */
import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  useParseImportFile,
  useImportProducts,
  useImportTemplate,
} from "@/hooks/products";
import { toastError } from "@/hooks";

interface ProductBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type ImportMode = "create_only" | "update_only" | "create_or_update";

interface ParsedRow {
  row: number;
  data: {
    sku: string;
    name: string;
    description?: string;
    categoryName?: string;
    type?: "physical" | "service" | "digital" | "bundle";
    status?: "active" | "inactive" | "discontinued";
    basePrice: number;
    costPrice?: number;
  };
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  row: number;
  sku: string;
  status: "created" | "updated" | "skipped" | "error";
  message?: string;
}

export function ProductBulkImport({
  open,
  onOpenChange,
  onComplete,
}: ProductBulkImportProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [_file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    rows: ParsedRow[];
    headers: string[];
  } | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("create_or_update");
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    results: ImportResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutations and queries
  const parseFile = useParseImportFile();
  const importProducts = useImportProducts();
  const { data: templateData } = useImportTemplate();

  const isProcessing = parseFile.isPending || importProducts.isPending;

  // Reset state when dialog closes
  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setParsedData(null);
    setImportProgress(0);
    setImportResults(null);
    setError(null);
    onOpenChange(false);
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    parseFile.mutate(
      { file: selectedFile, hasHeaders: true },
      {
        onSuccess: (result) => {
          setParsedData(result as {
            totalRows: number;
            validCount: number;
            invalidCount: number;
            rows: ParsedRow[];
            headers: string[];
          });
          setStep("preview");
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : "Failed to parse file";
          toastError(errorMessage);
          setError(errorMessage);
        },
      }
    );
  }, [parseFile]);

  // Handle drop zone
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.type === "text/csv")) {
        handleFileSelect(droppedFile);
      } else {
        setError("Please select a CSV file");
      }
    },
    [handleFileSelect]
  );

  // Handle file input
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  // Download template
  const handleDownloadTemplate = () => {
    if (templateData) {
      const data = templateData as { content: string; filename: string };
      const blob = new Blob([data.content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Start import
  const handleStartImport = () => {
    if (!parsedData) return;

    setStep("importing");
    setImportProgress(0);

    const validRows = parsedData.rows.filter((r) => r.isValid).map((r) => r.data);

    // Simulate progress (in a real app, this would be streamed)
    const progressInterval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 10, 90));
    }, 200);

    importProducts.mutate(
      {
        rows: validRows,
        mode: importMode,
        skipErrors: true,
      },
      {
        onSuccess: (result) => {
          clearInterval(progressInterval);
          setImportProgress(100);
          setImportResults(result as {
            success: boolean;
            created: number;
            updated: number;
            skipped: number;
            errors: number;
            results: ImportResult[];
          });
          setStep("complete");
        },
        onError: (err) => {
          clearInterval(progressInterval);
          const errorMessage = err instanceof Error ? err.message : "Import failed";
          toastError(errorMessage);
          setError(errorMessage);
          setStep("preview");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import products"}
            {step === "preview" && "Review and validate your data before importing"}
            {step === "importing" && "Importing products..."}
            {step === "complete" && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                Drop your CSV file here, or click to select
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports CSV files up to 10MB
              </p>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
                <span>Parsing file...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Template download */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Need a template?</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && parsedData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Total Rows</CardDescription>
                  <CardTitle className="text-2xl">{parsedData.totalRows}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Valid</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {parsedData.validCount}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Errors</CardDescription>
                  <CardTitle className="text-2xl text-red-600">
                    {parsedData.invalidCount}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Import mode */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Import mode:</span>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_or_update">Create or Update</SelectItem>
                  <SelectItem value="create_only">Create Only</SelectItem>
                  <SelectItem value="update_only">Update Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(0, 50).map((row) => (
                    <TableRow key={row.row} className={!row.isValid ? "bg-red-50" : ""}>
                      <TableCell className="text-muted-foreground">{row.row}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.data.sku}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{row.data.name}</TableCell>
                      <TableCell>${row.data.basePrice?.toFixed(2) ?? "-"}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <span className="text-xs text-red-600">{row.errors.join(", ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedData.rows.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 50 of {parsedData.rows.length} rows
              </p>
            )}

            {/* Warnings */}
            {parsedData.invalidCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    {parsedData.invalidCount} rows have errors and will be skipped
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-lg font-medium">Importing products...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your data
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && importResults && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResults.errors === 0 ? (
                <Check className="h-12 w-12 mx-auto text-green-600 mb-4" />
              ) : (
                <AlertTriangle className="h-12 w-12 mx-auto text-amber-600 mb-4" />
              )}
              <p className="text-lg font-medium">
                {importResults.errors === 0 ? "Import completed successfully!" : "Import completed with some errors"}
              </p>
            </div>

            {/* Results summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Created</CardDescription>
                  <CardTitle className="text-xl text-green-600">{importResults.created}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Updated</CardDescription>
                  <CardTitle className="text-xl text-blue-600">{importResults.updated}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Skipped</CardDescription>
                  <CardTitle className="text-xl text-gray-600">{importResults.skipped}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardDescription>Errors</CardDescription>
                  <CardTitle className="text-xl text-red-600">{importResults.errors}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Error details */}
            {importResults.errors > 0 && (
              <div className="border rounded-lg max-h-[200px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.results
                      .filter((r) => r.status === "error")
                      .map((result) => (
                        <TableRow key={result.row}>
                          <TableCell>{result.row}</TableCell>
                          <TableCell className="font-mono">{result.sku}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{result.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{result.message}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={parsedData?.validCount === 0}
              >
                Import {parsedData?.validCount} Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button
              onClick={() => {
                handleClose();
                onComplete?.();
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
