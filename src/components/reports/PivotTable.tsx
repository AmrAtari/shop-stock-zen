import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface PivotTableProps {
  data: any[];
  title: string;
  description: string;
}

const PivotTable = ({ data, title, description }: PivotTableProps) => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  
  const [rowField, setRowField] = useState<string>("category");
  const [columnField, setColumnField] = useState<string>("brand");
  const [valueField, setValueField] = useState<string>("total_sales_amount");
  const [aggregation, setAggregation] = useState<string>("sum");

  // Available fields for pivot
  const availableFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => 
      !['item_id', 'sku', 'first_sale_date', 'last_sale_date'].includes(key)
    );
  }, [data]);

  // Numeric fields for values
  const numericFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => 
      typeof firstRow[key] === 'number'
    );
  }, [data]);

  // Generate pivot table
  const pivotData = useMemo(() => {
    if (!data || data.length === 0) return { rows: [], columns: [], values: {} };

    // Get unique values for rows and columns
    const rowValues = [...new Set(data.map(item => item[rowField] || "N/A"))].sort();
    const columnValues = [...new Set(data.map(item => item[columnField] || "N/A"))].sort();

    // Calculate aggregated values
    const values: Record<string, Record<string, number>> = {};
    
    rowValues.forEach(row => {
      values[row] = {};
      columnValues.forEach(col => {
        const filteredData = data.filter(
          item => (item[rowField] || "N/A") === row && (item[columnField] || "N/A") === col
        );
        
        if (filteredData.length === 0) {
          values[row][col] = 0;
        } else {
          switch (aggregation) {
            case "sum":
              values[row][col] = filteredData.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
              break;
            case "avg":
              const sum = filteredData.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
              values[row][col] = sum / filteredData.length;
              break;
            case "count":
              values[row][col] = filteredData.length;
              break;
            case "min":
              values[row][col] = Math.min(...filteredData.map(item => Number(item[valueField]) || 0));
              break;
            case "max":
              values[row][col] = Math.max(...filteredData.map(item => Number(item[valueField]) || 0));
              break;
            default:
              values[row][col] = 0;
          }
        }
      });
    });

    return { rows: rowValues, columns: columnValues, values };
  }, [data, rowField, columnField, valueField, aggregation]);

  // Calculate totals
  const totals = useMemo(() => {
    const rowTotals: Record<string, number> = {};
    const columnTotals: Record<string, number> = {};
    let grandTotal = 0;

    pivotData.rows.forEach(row => {
      rowTotals[row] = 0;
      pivotData.columns.forEach(col => {
        const value = pivotData.values[row]?.[col] || 0;
        rowTotals[row] += value;
        columnTotals[col] = (columnTotals[col] || 0) + value;
        grandTotal += value;
      });
    });

    return { rowTotals, columnTotals, grandTotal };
  }, [pivotData]);

  const exportToCSV = () => {
    const headers = [rowField, ...pivotData.columns, "Total"];
    const rows = pivotData.rows.map(row => [
      row,
      ...pivotData.columns.map(col => pivotData.values[row]?.[col] || 0),
      totals.rowTotals[row]
    ]);
    const totalRow = ["Total", ...pivotData.columns.map(col => totals.columnTotals[col] || 0), totals.grandTotal];
    
    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
      totalRow.join(",")
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pivot-table-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatValue = (value: number) => {
    if (valueField.includes("amount") || valueField.includes("price") || valueField.includes("cost") || valueField.includes("profit")) {
      return formatCurrency(value, currency);
    }
    return formatNumber(value, aggregation === "avg" ? 2 : 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pivot Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Row Field</label>
            <Select value={rowField} onValueChange={setRowField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>
                    {field.replace(/_/g, " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Column Field</label>
            <Select value={columnField} onValueChange={setColumnField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>
                    {field.replace(/_/g, " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Value Field</label>
            <Select value={valueField} onValueChange={setValueField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map(field => (
                  <SelectItem key={field} value={field}>
                    {field.replace(/_/g, " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Aggregation</label>
            <Select value={aggregation} onValueChange={setAggregation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sum">Sum</SelectItem>
                <SelectItem value="avg">Average</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pivot Table */}
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">{rowField.replace(/_/g, " ").toUpperCase()}</TableHead>
                {pivotData.columns.map(col => (
                  <TableHead key={col} className="text-right">{col}</TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotData.rows.map(row => (
                <TableRow key={row}>
                  <TableCell className="font-medium">{row}</TableCell>
                  {pivotData.columns.map(col => (
                    <TableCell key={col} className="text-right">
                      {formatValue(pivotData.values[row]?.[col] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {formatValue(totals.rowTotals[row])}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-bold">
                <TableCell>Total</TableCell>
                {pivotData.columns.map(col => (
                  <TableCell key={col} className="text-right">
                    {formatValue(totals.columnTotals[col] || 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {formatValue(totals.grandTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PivotTable;
