import { useUserRole } from "./useUserRole";

export const useIsAdmin = () => {
  const { isAdmin, isLoading } = useUserRole();
  return { isAdmin, isLoading };
};
