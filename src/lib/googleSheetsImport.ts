/**
 * Extract spreadsheet ID from various Google Sheets URL formats
 */
export function extractSpreadsheetId(url: string): string | null {
  // Handle different URL formats:
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
  
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Validate if a URL is a valid Google Sheets URL
 */
export function isValidGoogleSheetsUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets') && extractSpreadsheetId(url) !== null;
}
