// Utility functions for exporting financial reports

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (elementId: string, filename: string) => {
  // This is a placeholder for PDF export functionality
  // You would need to install a library like jsPDF or html2pdf
  console.log("PDF export would be implemented here for:", elementId, filename);
  alert("PDF export functionality will be implemented. For now, please use the CSV export or print to PDF from your browser.");
};

export const formatReportData = (data: any[], reportType: string) => {
  // Format data based on report type for export
  switch (reportType) {
    case "balance_sheet":
      return data.map(item => ({
        "Account Code": item.account_code,
        "Account Name": item.account_name,
        "Account Type": item.account_type,
        "Balance": item.balance?.toFixed(2) || "0.00"
      }));
    
    case "income_statement":
      return data.map(item => ({
        "Account Code": item.account_code,
        "Account Name": item.account_name,
        "Type": item.account_type,
        "Amount": item.balance?.toFixed(2) || "0.00"
      }));
    
    case "trial_balance":
      return data.map(item => ({
        "Account Code": item.account_code,
        "Account Name": item.account_name,
        "Type": item.account_type,
        "Debit": item.debitBalance?.toFixed(2) || "0.00",
        "Credit": item.creditBalance?.toFixed(2) || "0.00"
      }));
    
    case "general_ledger":
      return data.map(item => ({
        "Date": item.journal_entry?.entry_date || "",
        "Entry Number": item.journal_entry?.entry_number || "",
        "Account": item.account?.account_name || "",
        "Description": item.description || item.journal_entry?.description || "",
        "Debit": item.debit_amount > 0 ? item.debit_amount.toFixed(2) : "0.00",
        "Credit": item.credit_amount > 0 ? item.credit_amount.toFixed(2) : "0.00",
        "Balance": item.runningBalance?.toFixed(2) || "0.00"
      }));
    
    default:
      return data;
  }
};
