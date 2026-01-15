import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
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
  ChevronDown,
  ChevronRight,
  Receipt,
  Truck,
  ReceiptText,
  Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();
  
  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<string[]>(["Sales & CRM", "Inventory", "Accounting", "Reports"]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  // Standalone items (always visible)
  const standaloneItems: NavItem[] = [
    { name: t('common.dashboard'), href: "/", icon: LayoutDashboard },
    { name: t('common.pos'), href: "/pos", icon: Receipt },
  ];

  // Grouped navigation
  const navGroups: NavGroup[] = [
    {
      name: "Sales & CRM",
      icon: Users,
      items: [
        { name: "Customers", href: "/crm/customers", icon: Users },
        { name: "Sales Orders", href: "/sales/orders", icon: FileText },
      ],
    },
    {
      name: "Inventory",
      icon: Package,
      items: [
        { name: t('common.inventory'), href: "/inventory", icon: Package },
        { name: "Batch Tracking", href: "/inventory/batches", icon: Boxes },
        { name: "Physical Inventory", href: "/inventory/physical", icon: ClipboardList },
        { name: t('common.transfers'), href: "/transfers", icon: Truck },
        { name: t('common.purchaseOrders'), href: "/purchase-orders", icon: ShoppingCart },
      ],
    },
    {
      name: "Accounting",
      icon: Calculator,
      items: [
        { name: t('common.accounting'), href: "/accounting", icon: Calculator },
        { name: "Budgets", href: "/accounting/budgets", icon: Wallet },
        { name: "Multi-Currency", href: "/accounting/multi-currency", icon: Globe },
      ],
    },
    {
      name: "Reports",
      icon: BarChart3,
      items: [
        { name: t('common.reports'), href: "/reports", icon: BarChart3 },
        { name: "AI Reports", href: "/ai-reports", icon: Bot },
        { name: "Business Intelligence", href: "/business-intelligence", icon: TrendingUp },
      ],
    },
    {
      name: "System",
      icon: Cog,
      items: [
        ...(isAdmin ? [{ name: t('common.configuration'), href: "/configuration", icon: Settings }] : []),
        { name: "Integrations", href: "/integrations", icon: Link2 },
        { name: "Notifications", href: "/notifications", icon: Bell },
        ...(isAdmin ? [{ name: "Audit Log", href: "/audit-log", icon: ClipboardList }] : []),
      ],
    },
  ];

  // Check if current path is in a group
  const isPathInGroup = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'));
  };

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

        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {/* Standalone items */}
            {standaloneItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
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

            {/* Grouped navigation */}
            <div className="pt-2 space-y-1">
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups.includes(group.name);
                const hasActiveItem = isPathInGroup(group);
                
                return (
                  <Collapsible
                    key={group.name}
                    open={isOpen || hasActiveItem}
                    onOpenChange={() => toggleGroup(group.name)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors w-full",
                          hasActiveItem
                            ? "text-sidebar-primary-foreground bg-sidebar-primary/10"
                            : "text-sidebar-foreground hover:bg-sidebar-accent",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <GroupIcon className="w-5 h-5" />
                          <span className="font-medium text-sm">{group.name}</span>
                        </div>
                        {isOpen || hasActiveItem ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 mt-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                                isActive
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-sidebar-border">
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
