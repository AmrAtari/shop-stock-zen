import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, AlertCircle } from "lucide-react";
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-google-sheet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            spreadsheetId,
            sheetName: sheetName.trim() || "Sheet1",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to import from Google Sheets");
      }

      if (!result.data || result.data.length === 0) {
        setError("No data found in the sheet");
        setIsProcessing(false);
        return;
      }

      onImport(result.data);
      setSheetUrl("");
      setSheetName("Sheet1");
    } catch (err) {
      console.error("Google Sheets import error:", err);
      setError(err instanceof Error ? err.message : "Failed to import from Google Sheets");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Make sure your Google Sheet is publicly accessible (Anyone with the link can view).
          To share: File → Share → Change to "Anyone with the link"
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

      <Button
        onClick={handleImport}
        disabled={isProcessing || !sheetUrl.trim()}
        className="w-full"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {isProcessing ? "Importing..." : "Import from Google Sheets"}
      </Button>
    </div>
  );
}
