import { supabase } from "@/integrations/supabase/client";

// --- Interface Definitions for Data Structures ---

// Data from the tax_rates table
interface TaxRate {
  id: string;
  name: string;
  rate_percentage: number;
  is_compound: boolean;
  liability_account_id: string;
}

// Data from the tax_jurisdictions table (joined with tax_rates)
interface TaxJurisdictionRule {
  id: string;
  name: string;
  country_code: string;
  jurisdiction_type: string; // e.g., 'State', 'City'
  tax_rate_id: string;
  tax_rates: TaxRate; // Joined rate object
}

// Data from the tax_settings table
interface TaxSettings {
  determination_policy: 'Origin' | 'Destination';
  default_tax_rate_id: string | null;
}

// Input for the calculation function
export interface TaxCalculationInput {
  taxableAmount: number;
  transactionType: string; // Must match tax_rates.tax_type (e.g., 'Sales', 'Purchase')
  originAddress: { countryCode: string; state?: string; city?: string };
  destinationAddress: { countryCode: string; state?: string; city?: string };
}

// Output of the calculation function
export interface TaxCalculationResult {
  totalTax: number;
  totalAmount: number; // taxableAmount + totalTax
  taxBreakdown: Array<{
    rateId: string;
    rateName: string;
    ratePercentage: number;
    taxAmount: number;
    isCompound: boolean;
    liabilityAccountId: string; // For automatic GL posting
    appliedRule: string; // e.g., "Matched Jurisdiction: CA State" or "Default Policy"
  }>;
}

/**
 * CORE ERP TAX CALCULATION FUNCTION
 * Determines the applicable tax rate and calculates the tax for a transaction.
 */
export async function calculateTax({
  taxableAmount,
  transactionType,
  originAddress,
  destinationAddress,
}: TaxCalculationInput): Promise<TaxCalculationResult> {
  let totalTax = 0;
  const taxBreakdown: TaxCalculationResult['taxBreakdown'] = [];

  // 1. Fetch Global Tax Settings
  const { data: settingsData, error: settingsError } = await supabase
    .from('tax_settings')
    .select('determination_policy, default_tax_rate_id')
    .limit(1)
    .single();

  if (settingsError && settingsError.code !== 'PGRST116') {
    // PGRST116 means no row found, which is handled below. Other errors should be thrown.
    throw new Error(`Failed to fetch tax settings: ${settingsError.message}`);
  }
  const settings: TaxSettings = settingsData || { determination_policy: 'Destination', default_tax_rate_id: null };

  // 2. Determine the Address to use based on Policy
  const relevantAddress = settings.determination_policy === 'Origin' ? originAddress : destinationAddress;

  // 3. Attempt to find a matching Jurisdiction Rule
  const { data: jurisdictionRules, error: rulesError } = await supabase
    .from('tax_jurisdictions')
    // We join the tax_rates table to get the rate details directly
    .select('*, tax_rates(*)')
    .eq('is_active', true)
    .eq('country_code', relevantAddress.countryCode)
    .eq('tax_rates.tax_type', transactionType) // Ensure the rate is for the correct type (Sales/Purchase)
    .order('jurisdiction_type', { ascending: true }); // Order by type for multi-level taxes (e.g., State then City)

  if (rulesError) {
    throw new Error(`Failed to fetch jurisdiction rules: ${rulesError.message}`);
  }

  // A list to hold the final rates that apply
  let applicableRates: TaxRate[] = [];
  let applicableRule: string = 'No match found.';

  if (jurisdictionRules && jurisdictionRules.length > 0) {
    // Filter rules to find the most specific match (e.g., City > State > Country)
    const matchedRule = jurisdictionRules.find(rule => 
        (rule.jurisdiction_type === 'City' && rule.name === relevantAddress.city) ||
        (rule.jurisdiction_type === 'State' && rule.name === relevantAddress.state)
        // If your jurisdiction table stores the full address components, you'd match them here.
    ) as TaxJurisdictionRule | undefined;

    if (matchedRule) {
      // In a simple ERP, a jurisdiction usually points to ONE tax rate.
      applicableRates.push(matchedRule.tax_rates);
      applicableRule = `Matched Jurisdiction: ${matchedRule.name}`;
    }
  }

  // 4. Fallback to Default Rate if no jurisdiction matches
  if (applicableRates.length === 0 && settings.default_tax_rate_id) {
    const { data: defaultRate, error: defaultRateError } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('id', settings.default_tax_rate_id)
      .eq('is_active', true)
      .eq('tax_type', transactionType)
      .limit(1)
      .single();

    if (defaultRate && !defaultRateError) {
      applicableRates.push(defaultRate as TaxRate);
      applicableRule = 'Applied Global Default Rate.';
    }
  }
  
  // 5. Final Calculation and Compounding Logic
  let runningTaxableBase = taxableAmount;
  let runningTotalTax = 0;

  // IMPORTANT: Calculate non-compound rates first, then compound rates on the new base.
  // Although your rates table only has is_compound, professional ERPs might have multiple rates.
  const nonCompoundRates = applicableRates.filter(r => !r.is_compound);
  const compoundRates = applicableRates.filter(r => r.is_compound);

  // a) Calculate Non-Compound Taxes
  for (const rate of nonCompoundRates) {
    const taxAmount = Math.round(taxableAmount * rate.rate_percentage * 100) / 100;
    runningTotalTax += taxAmount;

    taxBreakdown.push({
      rateId: rate.id,
      rateName: rate.name,
      ratePercentage: rate.rate_percentage,
      taxAmount: taxAmount,
      isCompound: false,
      liabilityAccountId: rate.liability_account_id,
      appliedRule: applicableRule,
    });
  }

  // Update the base for compound taxes
  runningTaxableBase = taxableAmount + runningTotalTax;

  // b) Calculate Compound Taxes
  for (const rate of compoundRates) {
    // Compound tax is calculated on the original taxable amount PLUS all non-compound taxes
    const taxAmount = Math.round(runningTaxableBase * rate.rate_percentage * 100) / 100; 
    runningTotalTax += taxAmount;

    taxBreakdown.push({
      rateId: rate.id,
      rateName: rate.name,
      ratePercentage: rate.rate_percentage,
      taxAmount: taxAmount,
      isCompound: true,
      liabilityAccountId: rate.liability_account_id,
      appliedRule: applicableRule,
    });
  }

  totalTax = runningTotalTax;

  return {
    totalTax: totalTax,
    totalAmount: taxableAmount + totalTax,
    taxBreakdown: taxBreakdown,
  };
}

// --- Example Usage (For your testing) ---
/*
// You would call this from your invoice creation page:
async function handleSalesInvoiceCreation() {
  const invoiceSubtotal = 100.00;
  const shopLocation = { countryCode: 'US', state: 'New York' }; 
  const customerLocation = { countryCode: 'US', state: 'California', city: 'Los Angeles' }; 

  try {
    const result = await calculateTax({
      taxableAmount: invoiceSubtotal,
      transactionType: 'Sales', // Must match tax_rates.tax_type
      originAddress: shopLocation,
      destinationAddress: customerLocation,
    });

    console.log("Tax Result:", result);
    // Result object is used to display tax on the invoice and create GL entries
    // result.taxBreakdown[0].liabilityAccountId is used for posting to the GL.

  } catch (error) {
    console.error("Tax calculation failed:", error);
  }
}
*/
