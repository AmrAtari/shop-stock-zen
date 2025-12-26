import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  AlertCircle,
  BarChart3,
  ShoppingCart,
  Store,
  LogOut,
  Settings,
  Bot,
  Calculator,
  ClipboardList,
  Users,
  FileText,
  Bell,
  TrendingUp,
  Boxes,
  Wallet,
  Globe,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();

  const navigation = [
    { name: t('common.dashboard'), href: "/", icon: LayoutDashboard },
    ...(isAdmin ? [{ name: t('common.configuration'), href: "/configuration", icon: Settings }] : []),
    { name: "CRM", href: "/crm/customers", icon: Users },
    { name: "Sales Orders", href: "/sales/orders", icon: FileText },
    { name: t('common.inventory'), href: "/inventory", icon: Package },
    { name: "Batch Tracking", href: "/inventory/batches", icon: Boxes },
    { name: "Physical Inventory", href: "/inventory/physical", icon: ClipboardList },
    { name: t('common.purchaseOrders'), href: "/purchase-orders", icon: ShoppingCart },
    { name: t('common.transfers'), href: "/transfers", icon: Store },
    { name: t('common.accounting'), href: "/accounting", icon: Calculator },
    { name: "Business Intelligence", href: "/business-intelligence", icon: TrendingUp },
    { name: t('common.reports'), href: "/reports", icon: BarChart3 },
    { name: "AI Reports", href: "/ai-reports", icon: Bot },
    { name: t('common.pos'), href: "/pos", icon: ShoppingCart },
    { name: "Budgeting", href: "/accounting/budgeting", icon: Wallet },
    { name: "Multi-Currency", href: "/accounting/multi-currency", icon: Globe },
    { name: "Integrations", href: "/integrations", icon: Link2 },
    { name: "Notifications", href: "/notifications", icon: Bell },
    ...(isAdmin ? [{ name: "Audit Log", href: "/audit-log", icon: ClipboardList }] : []),
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sidebar-foreground">Quantom IMS</h1>
            <p className="text-sm text-sidebar-foreground/70 mt-1">Inventory Manager</p>
          </div>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">{t('common.logout')}</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
};

export default Layout;
