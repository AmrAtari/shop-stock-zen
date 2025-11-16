import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, AlertCircle } from "lucide-react";
// NOTE: Assuming extractSpreadsheetId and isValidGoogleSheetsUrl are defined elsewhere
import { extractSpreadsheetId, isValidGoogleSheetsUrl } from "@/lib/googleSheetsImport";

interface GoogleSheetsInputProps {
  onImport: (data: any[]) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export function GoogleSheetsInput({ onImport, isProcessing, setIsProcessing }: GoogleSheetsInputProps) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [error, setError] = useState("");

  const handleImport = async () => {
    setError("");

    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL");
      return;
    }

    if (!isValidGoogleSheetsUrl(sheetUrl)) {
      setError("Invalid Google Sheets URL. Please enter a valid spreadsheet URL.");
      return;
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setError("Could not extract spreadsheet ID from URL");
      return;
    }

    setIsProcessing(true);

    try {
      // NOTE: This assumes you have a Supabase Edge function or similar service set up
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-google-sheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to fetch data from Google Sheets.");
      }

      // Assuming data.body is an array of objects
      onImport(data.body || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during import.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Make sure your Google Sheet is publicly accessible (Anyone with the link can view). To share: File → Share →
          Change to "Anyone with the link"
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="sheet-url">Google Sheets URL</Label>
        <Input
          id="sheet-url"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sheet-name">Sheet Name (tab name)</Label>
        <Input
          id="sheet-name"
          placeholder="Sheet1"
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleImport} disabled={isProcessing || !sheetUrl.trim()} className="w-full">
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {isProcessing ? "Importing..." : "Import from Sheets"}
      </Button>
    </div>
  );
}
