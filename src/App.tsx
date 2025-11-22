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
import Reports from "./pages/Reports"; // General Business Reports (Transfers, Sales, PO, Inventory)
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

// Accounting
import AccountingDashboard from "./pages/accounting/AccountingDashboard";
import JournalEntries from "./pages/accounting/JournalEntries";
import JournalEntryDetail from "./pages/accounting/JournalEntryDetail";
import JournalEntryNew from "./pages/accounting/JournalEntryNew";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import JournalEntryEdit from "./pages/accounting/JournalEntryEdit";
import FinancialReports from "./pages/accounting/FinancialReports";
import BalanceSheet from "./pages/accounting/BalanceSheet";

// Bank Accounts
import BankAccounts from "./pages/accounting/BankAccounts";
import NewBankAccount from "./pages/accounting/NewBankAccount";
import BankAccountDetail from "./pages/accounting/BankAccountDetail";
import BankAccountEdit from "./pages/accounting/BankAccountEdit";

// Tax Management (Completed Imports)
import TaxConfiguration from "./pages/accounting/TaxConfiguration";
import NewTaxRate from "./pages/accounting/NewTaxRate";
import EditTaxRate from "./pages/accounting/EditTaxRate";
import TaxJurisdictions from "./pages/accounting/TaxJurisdictions";
import NewTaxJurisdiction from "./pages/accounting/NewTaxJurisdiction";
import EditTaxJurisdiction from "./pages/accounting/EditTaxJurisdiction";

// Vendor Management (NEW IMPORT)
import Vendors from "./pages/accounting/Vendors";

// Components/Layouts
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SystemSettingsProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes */}
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
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Inventory />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              {/* Purchase Order Routes */}
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
              {/* Transfer Routes */}
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
              {/* Physical Inventory Routes */}
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
              <Route
                path="/accounting/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AccountingDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Financial Reporting Routes */}
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

              {/* Journal Entry Routes */}
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

              {/* Bank Accounts Routes */}
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

              {/* Tax Management Routes */}
              <Route
                path="/accounting/tax"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaxConfiguration />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewTaxRate />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/tax/:id/edit"
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
              {/* End Tax Management Routes */}

              {/* Vendor Management Routes (NEW) */}
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
              {/* Placeholder routes for Vendor CRUD (to be added next) */}
              <Route
                path="/accounting/vendors/new"
                element={
                  <ProtectedRoute>
                    <Layout>{/* <NewVendor /> */}</Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/vendors/:id"
                element={
                  <ProtectedRoute>
                    <Layout>{/* <VendorDetail /> */}</Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounting/vendors/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>{/* <EditVendor /> */}</Layout>
                  </ProtectedRoute>
                }
              />
              {/* End Vendor Management Routes */}

              {/* System/Utility Routes */}
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
              {/* This route still correctly points to the General Business Reports */}
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
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Notifications />
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
