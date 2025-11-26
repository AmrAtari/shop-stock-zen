import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

// --- Data Interfaces ---
interface Bill {
  id: string;
  balance: number;
  due_date: string;
  suppliers: {
    name: string;
  };
}

interface VendorAging {
  vendorName: string;
  current: number;
  "1-30": number;
  "31-60": number;
  "61-90": number;
  "Over 90": number;
  totalDue: number;
}

// Aging Calculation Logic
const calculateAging = (bills: Bill[]): VendorAging[] => {
  const today = new Date();
  const agingMap = new Map<string, Omit<VendorAging, "vendorName">>();

  for (const bill of bills) {
    if (bill.balance <= 0) continue;

    const dueDate = new Date(bill.due_date);
    // Calculate days overdue
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const balance = bill.balance;

    const vendorKey = bill.suppliers.name;
    if (!agingMap.has(vendorKey)) {
      agingMap.set(vendorKey, {
        current: 0,
        "1-30": 0,
        "31-60": 0,
        "61-90": 0,
        "Over 90": 0,
        totalDue: 0,
      });
    }

    const agingData = agingMap.get(vendorKey)!;

    // Assign balance to the correct bucket
    if (diffDays <= 0) {
      agingData.current += balance;
    } else if (diffDays <= 30) {
      agingData["1-30"] += balance;
    } else if (diffDays <= 60) {
      agingData["31-60"] += balance;
    } else if (diffDays <= 90) {
      agingData["61-90"] += balance;
    } else {
      agingData["Over 90"] += balance;
    }

    agingData.totalDue += balance;
  }

  // Convert Map to Array and add vendorName
  return Array.from(agingMap, ([vendorName, data]) => ({ vendorName, ...data }));
};

export const VendorAgingReport = () => {
  // FIX: Retrieve the base currency from system settings
  const { settings } = useSystemSettings();
  const baseCurrency = settings?.currency || "USD";

  // Query for all open vendor bills
  const {
    data: openBills,
    isLoading,
    error,
  } = useQuery<Bill[]>({
    queryKey: ["vendorAgingBills"],
    queryFn: async () => {
      // Fetch bills that are not fully paid and have a balance greater than 0
      const { data, error } = await supabase
        .from("vendor_bills")
        .select(
          `
                    id,
                    balance,
                    due_date,
                    suppliers (name)
                `,
        )
        .neq("status", "Paid")
        .neq("status", "Void")
        .gt("balance", 0);

      if (error) throw error;
      return data as Bill[];
    },
  });

  // Calculate aging buckets whenever openBills changes
  const agingData = useMemo(() => {
    return openBills ? calculateAging(openBills) : [];
  }, [openBills]);

  // Calculate Grand Totals
  const grandTotals = useMemo(() => {
    return agingData.reduce(
      (acc, row) => ({
        current: acc.current + row.current,
        "1-30": acc["1-30"] + row["1-30"],
        "31-60": acc["31-60"] + row["31-60"],
        "61-90": acc["61-90"] + row["61-90"],
        "Over 90": acc["Over 90"] + row["Over 90"],
        totalDue: acc.totalDue + row.totalDue,
      }),
      {
        current: 0,
        "1-30": 0,
        "31-60": 0,
        "61-90": 0,
        "Over 90": 0,
        totalDue: 0,
      },
    );
  }, [agingData]);

  if (error) return <div className="text-red-500">Error loading aging report.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-600" />
          Vendor Aging Report ({baseCurrency})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Vendor</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">Over 90 Days</TableHead>
                  <TableHead className="text-right font-bold w-[120px]">Total Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.vendorName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.current, baseCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row["1-30"], baseCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row["31-60"], baseCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row["61-90"], baseCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row["Over 90"], baseCurrency)}</TableCell>
                    <TableCell className="text-right font-bold bg-gray-50">
                      {formatCurrency(row.totalDue, baseCurrency)}
                    </TableCell>
                  </TableRow>
                ))}
                {agingData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No outstanding balances found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableBody className="border-t-2 border-primary/20">
                <TableRow className="font-bold bg-primary/5 hover:bg-primary/10">
                  <TableCell className="text-lg">GRAND TOTALS</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotals.current, baseCurrency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotals["1-30"], baseCurrency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotals["31-60"], baseCurrency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotals["61-90"], baseCurrency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotals["Over 90"], baseCurrency)}</TableCell>
                  <TableCell className="text-right text-lg">
                    {formatCurrency(grandTotals.totalDue, baseCurrency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
