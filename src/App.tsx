import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
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
import PhysicalInventoryPage from "./pages/PhysicalInventoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
                  <PhysicalInventoryPage />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
