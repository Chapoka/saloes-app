import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

function normalizeRole(role) {
  if (!role) return 'cliente';
  if (role === 'teacher') return 'profissional';
  if (role === 'user') return 'cliente';
  return role;
}

export function useCurrentUser() {
  const { user, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingAuth) {
      setLoading(false);
    }
  }, [isLoadingAuth]);

  const normalizedRole = normalizeRole(user?.role);
  const companyIds = user?.company_ids || (user?.company_id ? [user.company_id] : []);
  const primaryCompanyId = companyIds[0] || user?.company_id || null;

  return {
    currentUser: user,
    loading,
    role: normalizedRole,
    isSuperAdmin: normalizedRole === "super_admin",
    isAdmin: normalizedRole === "super_admin" || normalizedRole === "admin",
    isProfissional: normalizedRole === "profissional",
    isCliente: normalizedRole === "cliente",
    companyId: primaryCompanyId,
    companyIds,
    ready: !loading && user !== null,
  };
}
