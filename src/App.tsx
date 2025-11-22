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
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts"; // <-- CORRECTED: Used ChartOfAccounts.tsx
import Vendors from "./pages/accounting/Vendors";
import NewVendor from "./pages/accounting/NewVendor";
import EditVendor from "./pages/accounting/EditVendor";
import VendorDetail from "./pages/accounting/VendorDetail";
import Bills from "./pages/accounting/Bills";
import NewBill from "./pages/accounting/NewBill";
import EditBill from "./pages/accounting/EditBill";
import BillDetail from "./pages/accounting/BillDetail";

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
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes - General */}
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
                path="/accounting/accounts"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ChartOfAccounts /> {/* <-- CORRECTED COMPONENT */}
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Accounts Payable (Bills) Routes */}
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
