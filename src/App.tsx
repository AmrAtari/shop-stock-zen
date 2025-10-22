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

// POS Pages
import POSHome from "./pages/POS/POSHome";
import POSReceipts from "./pages/POS/POSReceipts";
import POSRefunds from "./pages/POS/POSRefunds";
import ClosingCash from "./pages/POS/ClosingCash";
import { POSProvider } from "./pages/POS/POSContext";

// Placeholder for new page (Approvals)
const Approvals = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold mb-4">Pending Approvals & Notifications</h1>
    <p className="text-muted-foreground">
      This page will display a full list of all inventory-related items awaiting your review or action, such as Purchase
      Orders and Transfer requests.
    </p>
  </div>
);

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
                  <Approvals />
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
