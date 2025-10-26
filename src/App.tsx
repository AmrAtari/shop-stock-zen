import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import PhysicalInventory from "./pages/PhysicalInventory";
import PhysicalInventoryNew from "./pages/PhysicalInventoryNew";
import PhysicalInventoryDetail from "./pages/PhysicalInventoryDetail";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import AIReports from "./pages/AIReports";

// POS
import POSHome from "./pages/POS/POSHome";
import POSReceipts from "./pages/POS/POSReceipts";
import POSRefunds from "./pages/POS/POSRefunds";
import ClosingCash from "./pages/POS/ClosingCash";
import { POSProvider } from "./pages/POS/POSContext";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// NEW ADMIN PAGE IMPORT
import DatabaseAdmin from "./pages/DatabaseAdmin";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner richColors />
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />

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
              path="/inventory/physical"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PhysicalInventory />
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

            {/* NEW DATABASE ADMIN ROUTE */}
            <Route
              path="/admin/database"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DatabaseAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* POS ROUTES */}
            <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <POSProvider>
                    <POSHome />
                  </POSProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/receipts"
              element={
                <ProtectedRoute>
                  <POSHome>
                    <POSReceipts />
                  </POSHome>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/refunds"
              element={
                <ProtectedRoute>
                  <POSHome>
                    <POSRefunds />
                  </POSHome>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/closing-cash"
              element={
                <ProtectedRoute>
                  <POSHome>
                    <ClosingCash />
                  </POSHome>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
