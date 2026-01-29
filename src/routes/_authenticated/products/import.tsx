/**
 * Product Import Route
 *
 * CSV import wizard for bulk product creation/update.
 *
 * LAYOUT: full-width
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 * @see _Initiation/_prd/2-domains/products/products.prd.json
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useParseImportFile, useImportProducts, type ImportProductsResult, type ImportPreviewRow } from '@/hooks/products';
import { toast } from '@/lib/toast';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/products/import')({
  component: ProductImportPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/products" />
  ),
});

// ============================================================================
// TYPES
// ============================================================================

type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProductImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Preview state
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  
  // Results state
  const [importResults, setImportResults] = useState<ImportProductsResult | null>(null);
  
  // Mutations
  const parseMutation = useParseImportFile();
  const importMutation = useImportProducts();
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'txt'].includes(extension)) {
      toast.error('Invalid file type. Please upload a CSV file.');
      return;
    }
    
    setSelectedFile(file);
  }, []);
  
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      const result = await parseMutation.mutateAsync({ file: selectedFile });
      setPreviewData(result.rows);
      setCurrentStep('preview');
    } catch (error) {
      toast.error('Failed to parse file', {
        description: error instanceof Error ? error.message : 'Please check the file format',
      });
    }
  }, [selectedFile, parseMutation]);
  
  const handleImport = useCallback(async () => {
    if (previewData.length === 0) return;
    
    setCurrentStep('importing');
    
    try {
      // Extract valid rows and map to import format
      const validRows = previewData.filter(p => p.isValid);
      const rows = validRows.map(p => p.data);
      
      const result = await importMutation.mutateAsync({
        rows,
        mode: updateExisting ? 'create_or_update' : 'create_only',
      });
      
      setImportResults(result);
      setCurrentStep('results');
    } catch (error) {
      setCurrentStep('preview');
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  }, [previewData, updateExisting, importMutation]);
  
  const handleBack = useCallback(() => {
    if (currentStep === 'preview') {
      setCurrentStep('upload');
      setSelectedFile(null);
      setPreviewData([]);
    } else if (currentStep === 'results') {
      navigate({ to: '/products' });
    } else {
      navigate({ to: '/products' });
    }
  }, [currentStep, navigate]);
  
  const handleDownloadTemplate = useCallback(() => {
    const template = 'sku,name,description,categoryName,type,status,basePrice,costPrice,barcode\n' +
      'PROD-001,Sample Product,Description here,Category A,physical,active,99.99,50.00,123456789\n' +
      'PROD-002,Another Product,,Category B,physical,active,149.99,75.00,';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const validRows = previewData.filter(r => r.isValid);
  const invalidRows = previewData.filter(r => !r.isValid);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Import Products"
        description="Bulk import products via CSV file"
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 'results' ? 'Back to Products' : 'Cancel'}
          </Button>
        }
      />
      
      <PageLayout.Content>
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl">
            {[
              { key: 'upload', label: 'Upload' },
              { key: 'preview', label: 'Preview' },
              { key: 'importing', label: 'Import' },
              { key: 'results', label: 'Results' },
            ].map((step, index) => {
              const isActive = currentStep === step.key;
              const stepOrder = ['upload', 'preview', 'importing', 'results'];
              const isPast = stepOrder.indexOf(currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isPast ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isPast ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {isPast ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={`
                    ml-2 text-sm
                    ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}
                  `}>
                    {step.label}
                  </span>
                  {index < 3 && (
                    <div className="w-12 h-px bg-border mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Select a CSV file containing your product data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Download */}
              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Need a template? Download a sample CSV file to get started</span>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                </AlertDescription>
              </Alert>
              
              {/* File Upload Area */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-colors hover:bg-muted/50
                  ${selectedFile ? 'border-primary bg-primary/5' : 'border-border'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="h-12 w-12 text-primary mb-4" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      CSV files up to 10MB
                    </p>
                  </div>
                )}
              </div>
              
              {/* Required Fields Info */}
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>sku</code> - Product SKU (unique identifier)</li>
                  <li><code>name</code> - Product name</li>
                  <li><code>basePrice</code> - Selling price</li>
                </ul>
                <p className="font-medium text-foreground mt-4 mb-2">Optional columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>description</code> - Product description</li>
                  <li><code>categoryName</code> - Category (will be created if not exists)</li>
                  <li><code>type</code> - physical, service, digital, bundle</li>
                  <li><code>status</code> - active, inactive, discontinued</li>
                  <li><code>costPrice</code> - Cost price</li>
                  <li><code>weight</code> - Weight in kg</li>
                  <li><code>barcode</code> - Barcode/UPC</li>
                  <li><code>tags</code> - Comma-separated tags</li>
                </ul>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || parseMutation.isPending}
                >
                  {parseMutation.isPending ? 'Parsing...' : 'Preview Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 2: Preview */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{previewData.length}</div>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                  <p className="text-sm text-muted-foreground">Valid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
                  <p className="text-sm text-muted-foreground">Invalid</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Options */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="update-existing"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                  <Label htmlFor="update-existing">
                    Update existing products (matching SKU)
                  </Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Review your data before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row) => (
                        <TableRow key={row.row}>
                          <TableCell>{row.row}</TableCell>
                          <TableCell>{row.data.sku}</TableCell>
                          <TableCell>{row.data.name}</TableCell>
                          <TableCell>${row.data.basePrice}</TableCell>
                          <TableCell>{row.data.categoryName || '-'}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Valid
                              </span>
                            ) : (
                              <span className="flex items-center text-red-600" title={row.errors.join(', ')}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Invalid
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing...' : `Import ${validRows.length} Products`}
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Importing */}
        {currentStep === 'importing' && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-lg font-medium">Importing products...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we process your file
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Step 4: Results */}
        {currentStep === 'results' && importResults && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{importResults.totalProcessed}</div>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResults.created}</div>
                    <p className="text-sm text-muted-foreground">Created</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                    <p className="text-sm text-muted-foreground">Updated</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Error Details */}
            {importResults.errors > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Errors ({importResults.errors})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-auto max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.results
                          .filter(r => r.status === 'error')
                          .map((result, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{result.row}</TableCell>
                              <TableCell>{result.sku}</TableCell>
                              <TableCell className="text-red-600">{result.message}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => {
                setCurrentStep('upload');
                setSelectedFile(null);
                setPreviewData([]);
                setImportResults(null);
              }}>
                Import Another File
              </Button>
              <Button onClick={() => navigate({ to: '/products' })}>
                Back to Products
              </Button>
            </div>
          </div>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}
