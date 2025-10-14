import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js"; // Import Supabase client creation
import { Button } from "@/components/ui/button"; // Assuming you use shadcn/ui Button for Pagination

// =================================================================
// 1. SUPABASE CLIENT CONFIGURATION (Move this to a dedicated file in a real app!)
// =================================================================
// NOTE: These credentials must be kept secure, ideally in environment variables.
const supabaseUrl = "https://lxpaycvpgbadjwnsnhum.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4cGF5Y3ZwZ2JhZGp3bnNuaHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzMwNDIsImV4cCI6MjA3NTc0OTA0Mn0.w9-LfPkjGrviGSLcNq-CLtTxt7nJgoQ5bFcWoL3t5a0";
const supabase = createClient(supabaseUrl, supabaseKey);

// =================================================================
// 2. TYPES/INTERFACES for Data Structures
// =================================================================
interface CategoryValue {
  category: string;
  total_value: number;
}
interface StockMovement {
  date: string;
  adjustment: number;
}
interface ProfitMarginItem {
  name: string;
  margin: number;
  profit: number;
}
interface RecentAdjustment {
  created_at: string;
  item_name: string;
  previous_quantity: number;
  new_quantity: number;
  adjustment: number;
  reason: string;
}
interface ReportsData {
  categoryValue: CategoryValue[];
  stockMovement: StockMovement[];
  profitMargins: ProfitMarginItem[];
  recentAdjustments: RecentAdjustment[];
  isLoading: boolean;
  error: Error | null;
}
interface UsePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage: number;
}

// =================================================================
// 3. PAGINATION HOOK (Recreated here for a single-file solution)
// =================================================================
const usePagination = ({ totalItems, itemsPerPage, initialPage }: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(
    () => Math.min(startIndex + itemsPerPage, totalItems),
    [startIndex, itemsPerPage, totalItems],
  );
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages],
  );
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return { currentPage, totalPages, startIndex, endIndex, goToPage, canGoPrev, canGoNext };
};

// =================================================================
// 4. PAGINATION CONTROLS COMPONENT (Recreated here for a single-file solution)
// =================================================================
const PaginationControls = ({
  currentPage,
  totalPages,
  goToPage,
  canGoPrev,
  canGoNext,
  totalItems,
  startIndex,
  endIndex,
}: ReturnType<typeof usePagination> & { totalItems: number; startIndex: number; endIndex: number }) => (
  <div className="flex items-center justify-between px-2 pt-4">
    <div className="text-sm text-muted-foreground">
      Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
    </div>
    <div className="space-x-2">
      <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={!canGoPrev}>
        Previous
      </Button>
      <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={!canGoNext}>
        Next
      </Button>
    </div>
  </div>
);

// =================================================================
// 5. DATA FETCHING HOOK (Replaces mock data with Supabase calls)
// =================================================================
const useReportsData = (): ReportsData => {
  const [data, setData] = useState<ReportsData>({
    categoryValue: [],
    stockMovement: [],
    profitMargins: [],
    recentAdjustments: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch all data concurrently
        const [categoryValueRes, stockMovementRes, profitMarginsRes, adjustmentsRes] = await Promise.all([
          // RPC: Inventory Value by Category (Requires get_category_value function)
          supabase.rpc("get_category_value").select("*"),

          // RPC: Daily Stock Movement (Requires get_daily_stock_movement function)
          supabase.rpc("get_daily_stock_movement").select("*").limit(30),

          // VIEW: Profit Margin Analysis (Requires profit_margins_view)
          supabase.from("profit_margins_view").select("name, margin, profit").order("margin", { ascending: false }),

          // TABLE: Recent Stock Adjustments (Requires inventory_adjustments table)
          supabase
            .from("inventory_adjustments")
            .select("created_at, item_name, previous_quantity, new_quantity, adjustment, reason")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

        // Check for fetch errors
        if (categoryValueRes.error) throw new Error(`Category Value Error: ${categoryValueRes.error.message}`);
        if (stockMovementRes.error) throw new Error(`Stock Movement Error: ${stockMovementRes.error.message}`);
        if (profitMarginsRes.error) throw new Error(`Profit Margins Error: ${profitMarginsRes.error.message}`);
        if (adjustmentsRes.error) throw new Error(`Adjustments Error: ${adjustmentsRes.error.message}`);

        // Set final data
        setData({
          categoryValue: (categoryValueRes.data as CategoryValue[]) || [],
          stockMovement: (stockMovementRes.data as StockMovement[]) || [],
          profitMargins: (profitMarginsRes.data as ProfitMarginItem[]) || [],
          recentAdjustments: (adjustmentsRes.data as RecentAdjustment[]) || [],
          isLoading: false,
          error: null,
        });
      } catch (e) {
        setData((prev) => ({ ...prev, isLoading: false, error: e as Error }));
        console.error("Supabase Report Fetch Failed:", e);
      }
    };

    fetchData();
  }, []);

  return data;
};

// =================================================================
// 6. MAIN REPORTS COMPONENT (Your original UI logic)
// =================================================================
const Reports = () => {
  const { categoryValue, stockMovement, profitMargins, recentAdjustments, isLoading, error } = useReportsData();

  // Pagination for Profit Margins
  const profitMarginsPagination = usePagination({
    totalItems: profitMargins.length,
    itemsPerPage: 10, // Changed to 10 for better table size
    initialPage: 1,
  });

  // Pagination for Adjustments
  const adjustmentsPagination = usePagination({
    totalItems: recentAdjustments.length,
    itemsPerPage: 10, // Changed to 10 for better table size
    initialPage: 1,
  });

  // Apply Pagination Slices
  const paginatedProfitMargins = profitMargins.slice(
    profitMarginsPagination.startIndex,
    profitMarginsPagination.endIndex,
  );

  const paginatedAdjustments = recentAdjustments.slice(
    adjustmentsPagination.startIndex,
    adjustmentsPagination.endIndex,
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed insights into your inventory</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading reports: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Detailed insights into your inventory</p>
      </div>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Value by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryValue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Total Value"]} />
                <Bar dataKey="total_value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Movement Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Movement Trend (Past 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockMovement}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="adjustment"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TABLES SECTION */}

      {/* Profit Margin Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Margin Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Profit Margin</TableHead>
                <TableHead>Profit per Unit</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfitMargins.map((item) => {
                const margin = item.margin;
                let performanceVariant: "success" | "warning" | "destructive" = "destructive";
                if (margin > 50) {
                  performanceVariant = "success";
                } else if (margin > 30) {
                  performanceVariant = "warning";
                }

                return (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{margin.toFixed(1)}%</TableCell>
                    <TableCell>${item.profit.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={performanceVariant as any}>
                        {margin > 50 ? "Excellent" : margin > 30 ? "Good" : "Low"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls
            currentPage={profitMarginsPagination.currentPage}
            totalPages={profitMarginsPagination.totalPages}
            goToPage={profitMarginsPagination.goToPage}
            canGoPrev={profitMarginsPagination.canGoPrev}
            canGoNext={profitMarginsPagination.canGoNext}
            totalItems={profitMargins.length}
            startIndex={profitMarginsPagination.startIndex}
            endIndex={profitMarginsPagination.endIndex}
          />
        </CardContent>
      </Card>

      {/* Recent Stock Adjustments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Previous Qty</TableHead>
                <TableHead>New Qty</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAdjustments.map((adj, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(adj.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{adj.item_name}</TableCell>
                  <TableCell>{adj.previous_quantity}</TableCell>
                  <TableCell>{adj.new_quantity}</TableCell>
                  <TableCell>
                    <Badge variant={adj.adjustment > 0 ? "success" : "destructive"}>
                      {adj.adjustment > 0 ? "+" : ""}
                      {adj.adjustment}
                    </Badge>
                  </TableCell>
                  <TableCell>{adj.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            currentPage={adjustmentsPagination.currentPage}
            totalPages={adjustmentsPagination.totalPages}
            goToPage={adjustmentsPagination.goToPage}
            canGoPrev={adjustmentsPagination.canGoPrev}
            canGoNext={adjustmentsPagination.canGoNext}
            totalItems={recentAdjustments.length}
            startIndex={adjustmentsPagination.startIndex}
            endIndex={adjustmentsPagination.endIndex}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
