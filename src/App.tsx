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
import Inventory from "./pages/Inventory"; // ✅ Works with default export
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

// Accounting
import AccountingDashboard from "./pages/accounting/AccountingDashboard";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import JournalEntries from "./pages/accounting/JournalEntries";
import JournalEntryDetail from "./pages/accounting/JournalEntryDetail";
import JournalEntryNew from "./pages/accounting/JournalEntryNew";
import AccountsPayable from "./pages/accounting/AccountsPayable";
import AccountsReceivable from "./pages/accounting/AccountsReceivable";
import AccountingReports from "./pages/accounting/Reports";
import BalanceSheet from "./pages/accounting/BalanceSheet";
import IncomeStatement from "./pages/accounting/IncomeStatement";
import CashFlow from "./pages/accounting/CashFlow";
import TrialBalance from "./pages/accounting/TrialBalance";
import GeneralLedger from "./pages/accounting/GeneralLedger";
import BankAccounts from "./pages/accounting/BankAccounts";
import BankReconciliation from "./pages/accounting/BankReconciliation";

// POS
import POSHome from "./pages/POS/POSHome";
import POSReceipts from "./pages/POS/POSReceipts";
import POSRefunds from "./pages/POS/POSRefunds";
import ClosingCash from "./pages/POS/ClosingCash";
import { POSProvider } from "./pages/POS/POSContext";

// Layout & ProtectedRoute
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SystemSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/auth" element={<Auth />} />

            {/* POS Routes */}
            <Route
              path="/pos/*"
              element={
                <POSProvider>
                  <Routes>
                    <Route
                      index
                      element={
                        <ProtectedRoute>
                          <POSHome />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="receipts"
                      element={
                        <ProtectedRoute>
                          <POSReceipts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="refunds"
                      element={
                        <ProtectedRoute>
                          <POSRefunds />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="closing"
                      element={
                        <ProtectedRoute>
                          <ClosingCash />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </POSProvider>
              }
            />

            {/* Main App Routes */}
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
              path="/ai-reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AIReports />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Inventory */}
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
              path="/inventory/physical"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PhysicalInventoryDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/physical/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PhysicalInventoryNew />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/physical/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PhysicalInventoryDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/recalculate"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryRecalculate />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Purchase Orders */}
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
            <Route
              path="/purchase-orders/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseOrderNew />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Transfers */}
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

            {/* Approvals / Notifications */}
            <Route
              path="/approvals"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Accounting Module */}
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
              path="/accounting/chart-of-accounts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChartOfAccounts />
                  </Layout>
                </ProtectedRoute>
              }
            />
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
              path="/accounting/accounts-receivable"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AccountsReceivable />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AccountingReports />
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
              path="/accounting/bank-accounts/:accountId/reconciliation"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BankReconciliation />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/bank-reconciliation/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BankReconciliation />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/bank-accounts/reconciliation/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BankReconciliation />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Misc Pages */}
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
