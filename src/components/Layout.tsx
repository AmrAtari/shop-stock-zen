import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, AlertCircle, BarChart3, ShoppingCart, Store, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
interface LayoutProps {
  children: ReactNode;
}
const Layout = ({
  children
}: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isAdmin
  } = useIsAdmin();
  const navigation = [{
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard
  }, ...(isAdmin ? [{
    name: "System Configuration",
    href: "/configuration",
    icon: Settings
  }] : []), {
    name: "Inventory",
    href: "/inventory",
    icon: Package
  }, {
    name: "Purchase Orders",
    href: "/purchase-orders",
    icon: ShoppingCart
  }, {
    name: "Transfers",
    href: "/transfers",
    icon: Store
  }, {
    name: "Reports",
    href: "/reports",
    icon: BarChart3
  }, {
    name: "POS",
    href: "/pos",
    icon: ShoppingCart
  }];
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Failed to logout");
    }
  };
  return <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground">Quantom IVM</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Inventory Manager</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return <Link key={item.name} to={item.href} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>;
        })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>;
};
export default Layout;