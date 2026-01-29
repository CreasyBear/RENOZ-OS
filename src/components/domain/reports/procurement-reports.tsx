/**
 * ProcurementReports Component
 *
 * Advanced procurement analytics and automated reporting dashboard.
 * Comprehensive system with supplier performance, spend analysis, efficiency metrics, and custom reporting.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-ANALYTICS-REPORTING)
 */
import { memo, useState, useCallback } from 'react';
import {
  TrendingDown,
  Download,
  Calendar,
  FileText,
  Settings,
  DollarSign,
  Target,
  Zap,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerWithRange, type DateRange } from '@/components/ui/date-picker-with-range';
import { Progress } from '@/components/ui/progress';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ProcurementAnalytics {
  supplierPerformance: Array<{
    supplierId: string;
    supplierName: string;
    totalOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    qualityScore: number;
    onTimeDelivery: number;
    defectRate: number;
    leadTimeDays: number;
    costSavings: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  spendAnalysis: {
    byCategory: Array<{
      category: string;
      totalSpend: number;
      percentage: number;
      trend: number;
    }>;
    bySupplier: Array<{
      supplierId: string;
      supplierName: string;
      totalSpend: number;
      orderCount: number;
      avgOrderValue: number;
    }>;
    trends: Array<{
      date: string;
      spend: number;
      orders: number;
      savings: number;
    }>;
  };
  efficiencyMetrics: {
    avgProcessingTime: number;
    approvalCycleTime: number;
    orderFulfillmentRate: number;
    costSavingsRate: number;
    automationRate: number;
    supplierDiversity: number;
  };
  costSavings: {
    totalSavings: number;
    savingsByType: Array<{
      type: string;
      amount: number;
      percentage: number;
    }>;
    monthlySavings: Array<{
      month: string;
      negotiatedSavings: number;
      volumeDiscounts: number;
      processImprovements: number;
      total: number;
    }>;
  };
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'supplier-performance' | 'spend-analysis' | 'efficiency' | 'cost-savings' | 'custom';
  dateRange: DateRange;
  filters: {
    suppliers?: string[];
    categories?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'email';
  };
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

/**
 * Safe average calculation to prevent division by zero.
 * Returns 0 if array is empty.
 */
function safeAverage<T>(items: T[], getValue: (item: T) => number): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + getValue(item), 0) / items.length;
}

const REPORT_TYPES = [
  { value: 'supplier-performance', label: 'Supplier Performance', icon: Award },
  { value: 'spend-analysis', label: 'Spend Analysis', icon: DollarSign },
  { value: 'efficiency', label: 'Efficiency Metrics', icon: Zap },
  { value: 'cost-savings', label: 'Cost Savings', icon: TrendingDown },
  { value: 'custom', label: 'Custom Report', icon: Settings },
];

// ============================================================================
// PROPS
// ============================================================================

export interface ProcurementReportsProps {
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useQuery result */
  analytics: ProcurementAnalytics | undefined;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useQuery isLoading */
  isLoading: boolean;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useQuery error */
  error: Error | null;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useState */
  dateRange: DateRange;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useState setter */
  onDateRangeChange: (range: DateRange) => void;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useCallback */
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useCallback */
  onCreateCustomReport: (input: {
    name: string;
    description?: string;
    reportType: ReportConfig['type'];
  }) => void;
  /** @source Container: route/_authenticated/reports/procurement/index.tsx - useCallback */
  onScheduleReport: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProcurementReports = memo(function ProcurementReports({
  analytics,
  isLoading,
  error,
  dateRange,
  onDateRangeChange,
  onExport,
  onCreateCustomReport,
  onScheduleReport,
}: ProcurementReportsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReportType, setSelectedReportType] = useState<string>('supplier-performance');
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [customReportName, setCustomReportName] = useState('');
  const [customReportDescription, setCustomReportDescription] = useState('');

  // Handle export
  const handleExport = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    onExport(format);
    setExportDialog(false);
  }, [onExport]);

  // Handle custom report creation
  const handleCreateCustomReport = useCallback(() => {
    if (!customReportName.trim()) return;
    onCreateCustomReport({
      name: customReportName.trim(),
      description: customReportDescription.trim() || undefined,
      reportType: selectedReportType as ReportConfig['type'],
    });
    setCustomReportDialog(false);
    setCustomReportName('');
    setCustomReportDescription('');
  }, [customReportName, customReportDescription, onCreateCustomReport, selectedReportType]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <p className="text-destructive text-lg font-medium">Failed to load procurement analytics</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    );
  }

  // Handle loading state
  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="bg-muted h-24 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Procurement Analytics</h2>
          <p className="text-muted-foreground">
            Advanced analytics and automated reporting for procurement operations
          </p>
        </div>

        <div className="flex items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => range && onDateRangeChange(range)}
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportDialog(true)}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={onScheduleReport}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
            <Button onClick={() => setCustomReportDialog(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Custom Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                analytics.spendAnalysis.bySupplier.reduce((sum, s) => sum + s.totalSpend, 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Across {analytics.supplierPerformance.length} suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingDown className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.costSavings.totalSavings)}
            </div>
            <p className="text-muted-foreground text-xs">
              {analytics.efficiencyMetrics.costSavingsRate.toFixed(1)}% of spend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <Award className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeAverage(analytics.supplierPerformance, (s) => s.qualityScore).toFixed(1)}%
            </div>
            <Progress
              value={safeAverage(analytics.supplierPerformance, (s) => s.qualityScore)}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeAverage(analytics.supplierPerformance, (s) => s.onTimeDelivery).toFixed(1)}%
            </div>
            <Progress
              value={safeAverage(analytics.supplierPerformance, (s) => s.onTimeDelivery)}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="supplier-performance">Supplier Performance</TabsTrigger>
          <TabsTrigger value="spend-analysis">Spend Analysis</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="cost-savings">Cost Savings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Spend Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Spend Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.spendAnalysis.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Spend']} />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Spend by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.spendAnalysis.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="totalSpend"
                    >
                      {analytics.spendAnalysis.byCategory.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.efficiencyMetrics.avgProcessingTime.toFixed(1)}h
                  </div>
                  <div className="text-muted-foreground text-sm">Avg Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.efficiencyMetrics.orderFulfillmentRate.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-sm">Fulfillment Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.efficiencyMetrics.automationRate.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-sm">Automation Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Performance Tab */}
        <TabsContent value="supplier-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead className="text-center">Quality</TableHead>
                    <TableHead className="text-center">On-Time</TableHead>
                    <TableHead className="text-center">Defect Rate</TableHead>
                    <TableHead className="text-right">Cost Savings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.supplierPerformance.map((supplier) => (
                    <TableRow key={supplier.supplierId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.supplierName}</p>
                          <p className="text-muted-foreground text-sm">
                            Lead time: {supplier.leadTimeDays} days
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{supplier.totalOrders}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(supplier.totalSpend)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{supplier.qualityScore.toFixed(1)}%</span>
                          <Progress value={supplier.qualityScore} className="h-2 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{supplier.onTimeDelivery.toFixed(1)}%</span>
                          <Progress value={supplier.onTimeDelivery} className="h-2 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            supplier.defectRate < 0.5
                              ? 'text-green-600'
                              : supplier.defectRate < 1.0
                                ? 'text-orange-600'
                                : 'text-red-600'
                          )}
                        >
                          {supplier.defectRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(supplier.costSavings)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spend Analysis Tab */}
        <TabsContent value="spend-analysis" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spend by Supplier</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.spendAnalysis.bySupplier}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplierName" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="totalSpend" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.spendAnalysis.byCategory.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{category.percentage.toFixed(1)}%</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              category.trend > 0
                                ? 'bg-green-100 text-green-800'
                                : category.trend < 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {category.trend > 0 ? '+' : ''}
                            {category.trend.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <div className="text-muted-foreground text-xs">
                        {formatCurrency(category.totalSpend)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Processing Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Processing Time</span>
                    <span className="font-medium">
                      {analytics.efficiencyMetrics.avgProcessingTime.toFixed(1)}h
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      ((24 - analytics.efficiencyMetrics.avgProcessingTime) / 24) * 100
                    )}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Approval Cycle Time</span>
                    <span className="font-medium">
                      {analytics.efficiencyMetrics.approvalCycleTime.toFixed(1)}h
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      ((24 - analytics.efficiencyMetrics.approvalCycleTime) / 24) * 100
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment & Automation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Fulfillment Rate</span>
                    <span className="font-medium">
                      {analytics.efficiencyMetrics.orderFulfillmentRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={analytics.efficiencyMetrics.orderFulfillmentRate} />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Automation Rate</span>
                    <span className="font-medium">
                      {analytics.efficiencyMetrics.automationRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={analytics.efficiencyMetrics.automationRate} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supplier Diversity</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-2 text-4xl font-bold text-blue-600">
                  {analytics.efficiencyMetrics.supplierDiversity}
                </div>
                <p className="text-muted-foreground text-sm">Active Suppliers</p>
                <div className="mt-4">
                  <Badge variant="secondary">Good Diversity</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Savings Tab */}
        <TabsContent value="cost-savings" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Savings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.costSavings.savingsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="amount"
                    >
                      {analytics.costSavings.savingsByType.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {analytics.costSavings.savingsByType.map((saving, index) => (
                    <div key={saving.type} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm">{saving.type}</span>
                      <span className="text-muted-foreground ml-auto text-sm">
                        {saving.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Savings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.costSavings.monthlySavings}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Savings']} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="negotiatedSavings"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="volumeDiscounts"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Choose the format and date range for your report export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleExport('pdf')} className="h-20">
                <FileText className="mr-2 h-6 w-6" />
                PDF Report
              </Button>
              <Button onClick={() => handleExport('csv')} variant="outline" className="h-20">
                <FileText className="mr-2 h-6 w-6" />
                CSV Export
              </Button>
              <Button onClick={() => handleExport('excel')} variant="outline" className="h-20">
                <Download className="mr-2 h-6 w-6" />
                Excel Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Report Dialog */}
      <Dialog open={customReportDialog} onOpenChange={setCustomReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>
              Build a custom report with specific filters and metrics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  placeholder="Enter report name"
                  value={customReportName}
                  onChange={(event) => setCustomReportName(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the purpose of this report"
                value={customReportDescription}
                onChange={(event) => setCustomReportDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateCustomReport} disabled={!customReportName.trim()}>
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
