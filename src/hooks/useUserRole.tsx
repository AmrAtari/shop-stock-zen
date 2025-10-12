import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "supervisor" | "inventory_man" | "cashier" | null;

export interface UserPermissions {
  canAddProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canImportData: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canTransferStock: boolean;
  canAcceptTransfers: boolean;
  canViewAllStores: boolean;
  canModifySystem: boolean;
  canProcessTransactions: boolean;
  canViewStock: boolean;
}

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canImportData: false,
    canExportData: false,
    canManageUsers: false,
    canViewReports: false,
    canTransferStock: false,
    canAcceptTransfers: false,
    canViewAllStores: false,
    canModifySystem: false,
    canProcessTransactions: false,
    canViewStock: false,
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
        // Admin: Full permissions on everything
        return {
          canAddProducts: true,
          canEditProducts: true,
          canDeleteProducts: true,
          canImportData: true,
          canExportData: true,
          canManageUsers: true,
          canViewReports: true,
          canTransferStock: true,
          canAcceptTransfers: true,
          canViewAllStores: true,
          canModifySystem: true,
          canProcessTransactions: true,
          canViewStock: true,
        };
      
      case "supervisor":
        // Supervisor: Can add products, import stock, do transactions, accept transfers
        // Cannot modify system settings or delete
        return {
          canAddProducts: true,
          canEditProducts: false,
          canDeleteProducts: false,
          canImportData: true,
          canExportData: true,
          canManageUsers: false,
          canViewReports: true,
          canTransferStock: true,
          canAcceptTransfers: true,
          canViewAllStores: true,
          canModifySystem: false,
          canProcessTransactions: true,
          canViewStock: true,
        };
      
      case "inventory_man":
        // Inventory Man: Can transfer stock, upload data, get reports for own store only
        return {
          canAddProducts: false,
          canEditProducts: false,
          canDeleteProducts: false,
          canImportData: true,
          canExportData: true,
          canManageUsers: false,
          canViewReports: true,
          canTransferStock: true,
          canAcceptTransfers: false,
          canViewAllStores: false,
          canModifySystem: false,
          canProcessTransactions: false,
          canViewStock: true,
        };
      
      case "cashier":
        // Cashier: Can only view available stock
        return {
          canAddProducts: false,
          canEditProducts: false,
          canDeleteProducts: false,
          canImportData: false,
          canExportData: false,
          canManageUsers: false,
          canViewReports: false,
          canTransferStock: false,
          canAcceptTransfers: false,
          canViewAllStores: false,
          canModifySystem: false,
          canProcessTransactions: false,
          canViewStock: true,
        };
      
      default:
        // No role: No permissions
        return {
          canAddProducts: false,
          canEditProducts: false,
          canDeleteProducts: false,
          canImportData: false,
          canExportData: false,
          canManageUsers: false,
          canViewReports: false,
          canTransferStock: false,
          canAcceptTransfers: false,
          canViewAllStores: false,
          canModifySystem: false,
          canProcessTransactions: false,
          canViewStock: false,
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
