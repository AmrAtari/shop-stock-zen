import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVendorAging } from "@/hooks/useAccountsPayable";
import { Skeleton } from "@/components/ui/skeleton";

export const VendorAgingReport = () => {
  const { data: agingData, isLoading } = useVendorAging();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor Aging Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totals = agingData?.reduce(
    (acc, row) => ({
      current: acc.current + row.current,
      days_30: acc.days_30 + row.days_30,
      days_60: acc.days_60 + row.days_60,
      days_90: acc.days_90 + row.days_90,
      over_90: acc.over_90 + row.over_90,
      total: acc.total + row.total,
    }),
    { current: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0, total: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Aging Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1-30 Days</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">61-90 Days</TableHead>
                <TableHead className="text-right">Over 90 Days</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingData?.map((row) => (
                <TableRow key={row.supplier_id}>
                  <TableCell className="font-medium">{row.supplier_name}</TableCell>
                  <TableCell className="text-right">${row.current.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${row.days_30.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${row.days_60.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${row.days_90.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    ${row.over_90.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold">${row.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {totals && (
                <TableRow className="bg-muted font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">${totals.current.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${totals.days_30.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${totals.days_60.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${totals.days_90.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    ${totals.over_90.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">${totals.total.toFixed(2)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {agingData?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No outstanding payables found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
