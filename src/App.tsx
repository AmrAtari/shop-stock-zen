// App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Standard App Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Standard Page Components
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
import NotFound from "./pages/NotFound";

// POS Page Components (Dedicated pages for professional flow)
import POSHome from "./pages/POS/POSHome"; // Main sales/cashier screen
import POSTransactions from "./pages/POS/POSTransactions"; // View transactions/history
import POSTransactionDetail from "./pages/POS/POSTransactionDetail"; // Receipt, reprint, email, refund entry
import POSRefund from "./pages/POS/POSRefund"; // Dedicated refund processing flow
import POSSettings from "./pages/POS/POSSettings"; // POS hardware/user settings

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* --- Public Route --- */}
          <Route path="/auth" element={<Auth />} />

          {/* =======================================================
            --- POS Routes (Full-Screen/Kiosk Mode) ---
            These routes DO NOT use the <Layout> component for a 
            professional, uninterrupted cash register experience.
            =======================================================
          */}
          <Route path="/pos">
            <Route
              index // /pos - Main Sales/Cashier View
              element={
                <ProtectedRoute>
                  <POSHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="transactions" // /pos/transactions - View completed transactions
              element={
                <ProtectedRoute>
                  <POSTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="transactions/:id" // /pos/transactions/:id - Receipt/Refund detail view
              element={
                <ProtectedRoute>
                  <POSTransactionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="refund" // /pos/refund - Dedicated refund processing flow
              element={
                <ProtectedRoute>
                  <POSRefund />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings" // /pos/settings - POS-specific configuration
              element={
                <ProtectedRoute>
                  <POSSettings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* =======================================================
            --- Protected Main Routes (Standard Layout) ---
            These routes use the <Layout> component for navigation.
            =======================================================
          */}
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

          {/* --- Inventory Management --- */}
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

          {/* --- Purchases --- */}
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

          {/* --- Transfers --- */}
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

          {/* --- Other Sections (Alerts, Reports, Stores, etc.) --- */}
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

          {/* --- Fallback --- */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
