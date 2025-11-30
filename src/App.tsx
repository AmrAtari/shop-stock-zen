import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderNew from "./pages/PurchaseOrderNew";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import Stores from "./pages/Stores";
import Configuration from "./pages/Configuration";
import Duplicates from "./pages/Duplicates";
import Transfers from "./pages/Transfers";
import TransferDetail from "./pages/TransferDetail";
import PhysicalInventoryDashboard from "./pages/PhysicalInventoryDashboard";
import PhysicalInventoryNew from "./pages/PhysicalInventoryNew";
import PhysicalInventoryDetail from "./pages/PhysicalInventoryDetail";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import AIReports from "./pages/AIReports";
import InventoryRecalculate from "./pages/InventoryRecalculate";

// Accounting Components
import AccountingDashboard from "./pages/accounting/AccountingDashboard";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import AccountsPayable from "./pages/accounting/AccountsPayable";
import Vendors from "./pages/accounting/Vendors";
import NewVendor from "./pages/accounting/NewVendor";
import EditVendor from "./pages/accounting/EditVendor";
import VendorDetail from "./pages/accounting/VendorDetail";
import Bills from "./pages/accounting/Bills";
import NewBill from "./pages/accounting/NewBill";
import EditBill from "./pages/accounting/EditBill";
import BillDetail from "./pages/accounting/BillDetail";

// Missing Accounting Imports
import AccountsReceivable from "./pages/accounting/AccountsReceivable";
import FinancialReports from "./pages/accounting/FinancialReports";
import BalanceSheet from "./pages/accounting/BalanceSheet";
import IncomeStatement from "./pages/accounting/IncomeStatement";
import CashFlow from "./pages/accounting/CashFlow";
import TrialBalance from "./pages/accounting/TrialBalance";
import GeneralLedger from "./pages/accounting/GeneralLedger";
import JournalEntries from "./pages/accounting/JournalEntries";
import JournalEntryNew from "./pages/accounting/JournalEntryNew";
import JournalEntryDetail from "./pages/accounting/JournalEntryDetail";
import JournalEntryEdit from "./pages/accounting/JournalEntryEdit";
import BankAccounts from "./pages/accounting/BankAccounts";
import NewBankAccount from "./pages/accounting/NewBankAccount";
import BankAccountDetail from "./pages/accounting/BankAccountDetail";
import BankAccountEdit from "./pages/accounting/BankAccountEdit";
import BankReconciliation from "./pages/accounting/BankReconciliation";
import OpeningStockEntry from "./pages/accounting/OpeningStockEntry";

// === START: TAX MANAGEMENT COMPONENT IMPORTS ===
import TaxManagementIndex from "./pages/accounting/TaxManagementIndex";
import TaxConfiguration from "./pages/accounting/TaxConfiguration";
import TaxJurisdictions from "./pages/accounting/TaxJurisdictions";
import TaxSettings from "./pages/accounting/TaxSettings";
import NewTaxRate from "./pages/accounting/NewTaxRate";
import EditTaxRate from "./pages/accounting/EditTaxRate";
import NewTaxJurisdiction from "./pages/accounting/NewTaxJurisdiction";
import EditTaxJurisdiction from "./pages/accounting/EditTaxJurisdiction";
// === END: TAX MANAGEMENT COMPONENT IMPORTS ===

// POS Components
import POSHome from "./pages/POS/POSHome";
import { POSProvider } from "./pages/POS/POSContext";

// Layouts and Wrappers (Assumed to exist)
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SystemSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes - Main */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Alerts />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AIReports />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Inventory Management Routes */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Inventory />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stores"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Stores />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transfers"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Transfers />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transfers/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TransferDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/physical-inventory"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PhysicalInventoryDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/physical-inventory/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PhysicalInventoryNew />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/physical-inventory/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PhysicalInventoryDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory-recalculate"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <InventoryRecalculate />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Procurement/Purchase Order Routes */}
              <Route
                path="/purchase-orders"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PurchaseOrders />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase-orders/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PurchaseOrderNew />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase-orders/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PurchaseOrderDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Accounting Routes */}
              <Route
                path="/accounting"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AccountingDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Chart of Accounts - Add both routes for compatibility */}
              <Route
                path="/accounting/accounts"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ChartOfAccounts />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/chart-of-accounts"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ChartOfAccounts />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Accounting Reports - Add both routes for compatibility */}
              <Route
                path="/accounting/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <FinancialReports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/reports/balance-sheet"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BalanceSheet />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/reports/income-statement"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IncomeStatement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/reports/cash-flow"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CashFlow />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/reports/trial-balance"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TrialBalance />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/reports/general-ledger"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GeneralLedger />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Accounts Payable Routes */}
              <Route
                path="/accounting/accounts-payable"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AccountsPayable />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bills"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Bills />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bills/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewBill />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bills/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BillDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bills/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditBill />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Vendor Routes */}
              <Route
                path="/accounting/vendors"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Vendors />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/vendors/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewVendor />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/vendors/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <VendorDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/vendors/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditVendor />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* === START: TAX MANAGEMENT ROUTES (New) === */}
              <Route
                path="/accounting/tax"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaxManagementIndex />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/rates"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaxConfiguration />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/rates/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewTaxRate />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/rates/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditTaxRate />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/jurisdictions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaxJurisdictions />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/jurisdictions/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewTaxJurisdiction />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/jurisdictions/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditTaxJurisdiction />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaxSettings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              {/* === END: TAX MANAGEMENT ROUTES (New) === */}

              {/* === START: MISSING ACCOUNTING ROUTES === */}

              {/* Accounts Receivable */}
              <Route
                path="/accounting/accounts-receivable"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AccountsReceivable />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Financial Reports */}
              <Route
                path="/accounting/financial-reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <FinancialReports />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Balance Sheet */}
              <Route
                path="/accounting/balance-sheet"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BalanceSheet />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Income Statement */}
              <Route
                path="/accounting/income-statement"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IncomeStatement />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Cash Flow */}
              <Route
                path="/accounting/cash-flow"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CashFlow />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Trial Balance */}
              <Route
                path="/accounting/trial-balance"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TrialBalance />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* General Ledger */}
              <Route
                path="/accounting/general-ledger"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GeneralLedger />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Journal Entries */}
              <Route
                path="/accounting/journal-entries"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <JournalEntries />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/journal-entries/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <JournalEntryNew />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/journal-entries/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <JournalEntryDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/journal-entries/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <JournalEntryEdit />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Bank Accounts */}
              <Route
                path="/accounting/bank-accounts"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BankAccounts />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bank-accounts/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewBankAccount />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bank-accounts/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BankAccountDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/bank-accounts/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BankAccountEdit />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Bank Reconciliation */}
              <Route
                path="/accounting/bank-reconciliation"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BankReconciliation />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Opening Stock Entry */}
              <Route
                path="/accounting/opening-stock"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <OpeningStockEntry />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* === END: MISSING ACCOUNTING ROUTES === */}

              {/* POS Routes */}
              <Route
                path="/pos"
                element={
                  <ProtectedRoute>
                    <POSProvider>
                      <Layout>
                        <POSHome />
                      </Layout>
                    </POSProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/physical"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PhysicalInventoryDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Configuration & Administration */}
              <Route
                path="/configuration"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Configuration />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/duplicates"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Duplicates />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Notifications />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SystemSettingsProvider>
    </QueryClientProvider>
  );
};

export default App;
