// Currency and number formatting utilities

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  SAR: "ر.س",
  AED: "د.إ",
  EGP: "ج.م",
  KWD: "د.ك",
  BHD: "د.ب",
  OMR: "ر.ع",
  QAR: "ر.ق",
  JOD: "د.أ",
  LBP: "ل.ل",
  IQD: "ع.د",
};

/**
 * Format a number as currency using the specified currency code
 * @param amount - The amount to format
 * @param currencyCode - Currency code (e.g., "USD", "EUR")
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencyCode: string = "USD", decimals: number = 2): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode + " ";
  // Always round to 2 decimals to ensure consistent display
  const roundedAmount = Math.round(amount * 100) / 100;
  return `${symbol}${roundedAmount.toFixed(2)}`;
}

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage
 * @param value - The value to format (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
