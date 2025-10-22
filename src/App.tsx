// App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Standard App Components
// FIX: Changed paths from './components/...' to '../components/...'
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";

// Standard Page Components
// FIX: Changed paths from './pages/...' to './...'
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import Inventory from "./Inventory";
import Alerts from "./Alerts";
import Reports from "./Reports";
import PurchaseOrders from "./PurchaseOrders";
import PurchaseOrderNew from "./PurchaseOrderNew";
import PurchaseOrderDetail from "./PurchaseOrderDetail";
import Stores from "./Stores";
import Configuration from "./Configuration";
import Duplicates from "./Duplicates";
import Transfers from "./Transfers";
import TransferDetail from "./TransferDetail";
import PhysicalInventory from "./PhysicalInventory";
import PhysicalInventoryNew from "./PhysicalInventoryNew";
import PhysicalInventoryDetail from "./PhysicalInventoryDetail";
import NotFound from "./NotFound";

// New Notifications Page
import Notifications from "./Notifications";

// POS Pages
// FIX: Changed paths from './pages/POS/...' to './POS/...'
import POSHome from "./POS/POSHome";
import POSReceipts from "./POS/POSReceipts";
import POSRefunds from "./POS/POSRefunds";
import ClosingCash from "./POS/ClosingCash";
import { POSProvider } from "./POS/POSContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* --- Public Auth --- */}
          <Route path="/auth" element={<Auth />} />

          {/* =======================================================
              POS ROUTES (Full Screen / No Layout)
              Wrapped with POSProvider to share cashier session state
          ======================================================= */}
          <Route
            path="/pos/*"
            element={
              <POSProvider>
                <Routes>
                  <Route
                    path=""
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

          {/* =======================================================
              MAIN APP ROUTES (With Sidebar Layout)
          ======================================================= */}
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

          {/* --- Approvals/Notifications Page --- */}
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

          {/* --- Misc Pages --- */}
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
