import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "supervisor" | "inventory_man" | "cashier" | null;

export interface UserPermissions {
  canManageUsers: boolean;
  canViewUsers: boolean;
  canEditItems: boolean;
  canDeleteItems: boolean;
  canCreatePurchaseOrders: boolean;
  canApprovePurchaseOrders: boolean;
  canCreateTransfers: boolean;
  canApproveTransfers: boolean;
  canAcceptTransfers: boolean;
  canViewAllReports: boolean;
  canViewOwnStoreReports: boolean;
  canViewStock: boolean;
  canManageConfiguration: boolean;
  canExportData: boolean;
  canImportData: boolean;
}

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canManageUsers: false,
    canViewUsers: false,
    canEditItems: false,
    canDeleteItems: false,
    canCreatePurchaseOrders: false,
    canApprovePurchaseOrders: false,
    canCreateTransfers: false,
    canApproveTransfers: false,
    canAcceptTransfers: false,
    canViewAllReports: false,
    canViewOwnStoreReports: false,
    canViewStock: false,
    canManageConfiguration: false,
    canExportData: false,
    canImportData: false,
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking user role:", error);
        setRole(null);
      } else {
        const userRole = data?.role as UserRole;
        setRole(userRole);
        setPermissions(getPermissionsForRole(userRole));
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionsForRole = (userRole: UserRole): UserPermissions => {
    switch (userRole) {
      case "admin":
        // Admin: Full access (add, modify, delete everything)
        return {
          canManageUsers: true,
          canViewUsers: true,
          canEditItems: true,
          canDeleteItems: true,
          canCreatePurchaseOrders: true,
          canApprovePurchaseOrders: true,
          canCreateTransfers: true,
          canApproveTransfers: true,
          canAcceptTransfers: true,
          canViewAllReports: true,
          canViewOwnStoreReports: true,
          canViewStock: true,
          canManageConfiguration: true,
          canExportData: true,
          canImportData: true,
        };
      
      case "supervisor":
        // Supervisor: Add products, import stock, create purchase orders, approve transfers, view all reports
        // Cannot modify system config
        return {
          canManageUsers: false,
          canViewUsers: true,
          canEditItems: true,
          canDeleteItems: false,
          canCreatePurchaseOrders: true,
          canApprovePurchaseOrders: true,
          canCreateTransfers: true,
          canApproveTransfers: true,
          canAcceptTransfers: true,
          canViewAllReports: true,
          canViewOwnStoreReports: true,
          canViewStock: true,
          canManageConfiguration: false,
          canExportData: true,
          canImportData: true,
        };
      
      case "inventory_man":
        // Inventory Man: Transfer stock between stores, upload transfer data, view own store reports only
        return {
          canManageUsers: false,
          canViewUsers: false,
          canEditItems: false,
          canDeleteItems: false,
          canCreatePurchaseOrders: false,
          canApprovePurchaseOrders: false,
          canCreateTransfers: true,
          canApproveTransfers: false,
          canAcceptTransfers: true,
          canViewAllReports: false,
          canViewOwnStoreReports: true,
          canViewStock: true,
          canManageConfiguration: false,
          canExportData: true,
          canImportData: true,
        };
      
      case "cashier":
        // Cashier: Read-only access to check stock availability by SKU/barcode
        return {
          canManageUsers: false,
          canViewUsers: false,
          canEditItems: false,
          canDeleteItems: false,
          canCreatePurchaseOrders: false,
          canApprovePurchaseOrders: false,
          canCreateTransfers: false,
          canApproveTransfers: false,
          canAcceptTransfers: false,
          canViewAllReports: false,
          canViewOwnStoreReports: false,
          canViewStock: true,
          canManageConfiguration: false,
          canExportData: false,
          canImportData: false,
        };
      
      default:
        // No role: No permissions
        return {
          canManageUsers: false,
          canViewUsers: false,
          canEditItems: false,
          canDeleteItems: false,
          canCreatePurchaseOrders: false,
          canApprovePurchaseOrders: false,
          canCreateTransfers: false,
          canApproveTransfers: false,
          canAcceptTransfers: false,
          canViewAllReports: false,
          canViewOwnStoreReports: false,
          canViewStock: false,
          canManageConfiguration: false,
          canExportData: false,
          canImportData: false,
        };
    }
  };

  return { 
    role, 
    isLoading, 
    permissions,
    isAdmin: role === "admin",
    isSupervisor: role === "supervisor",
    isInventoryMan: role === "inventory_man",
    isCashier: role === "cashier",
  };
};
