import { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Key,
  Save,
  Eye,
  EyeOff,
  Users,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Shield,
  Building2,
  List,
  Layers,
  PaintBucket,
  Award,
  Crown,
  UserCog,
} from "lucide-react";
import CompanyIntegrationCard from "@/components/settings/CompanyIntegrationCard";
import ModalitiesSection from "@/components/settings/ModalitiesSection";
import CompanyBrandingCard from "@/components/settings/CompanyBrandingCard";
import AsaasSubaccountsModal from "@/components/settings/AsaasSubaccountsModal";
import CompanyMultiSelect from "@/components/settings/CompanyMultiSelect";
import LoginImagesCard from "@/components/settings/LoginImagesCard";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import PageNotFound from "@/lib/PageNotFound";
import { cn } from "@/lib/utils";

export default function Settings() {
  const queryClient = useQueryClient();
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    asaas_master_api_key: "",
    asaas_master_environment: "sandbox",
    asaas_api_key: "",
    asaas_environment: "sandbox",
    whatsapp_token: "",
    whatsapp_phone_id: "",
    app_url: "",
  });
  const [showMasterKey, setShowMasterKey] = useState(false);

  const [userFormData, setUserFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    cpf: "",
    rg: "",
    birth_date: "",
    role: "cliente",
    company_ids: [],
    is_master: false,
    is_professional: false,
  });

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [mustChangeOnLogin, setMustChangeOnLogin] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [subaccountsCompany, setSubaccountsCompany] = useState(null);

  useEffect(() => {
    db.auth.me().then(async (user) => {
      if (user?.id) {
        const { data: userCompanies } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id);
        setCurrentUser({
          ...user,
          company_ids: (userCompanies || []).map(uc => uc.company_id),
        });
      } else {
        setCurrentUser(user);
      }
    }).catch(() => {});
  }, []);

  const rawRole = currentUser?.role;
  // Backward compat
  const role = rawRole === "teacher" ? "profissional" : rawRole === "user" ? "cliente" : rawRole;
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "super_admin" || role === "admin";
  const isProfissional = role === "profissional";

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => db.entities.Settings.list(),
    enabled: isSuperAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const userList = await db.entities.User.list("-created_at");
      if (!userList.length) return userList;
      const { data: userCompanies } = await supabase.from("user_companies").select("user_id, company_id");
      const companyMap = {};
      (userCompanies || []).forEach(uc => {
        if (!companyMap[uc.user_id]) companyMap[uc.user_id] = [];
        companyMap[uc.user_id].push(uc.company_id);
      });
      return userList.map(u => ({ ...u, company_ids: companyMap[u.id] || [] }));
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => db.entities.Company.list(),
  });

  const { data: allStylistLevels = [] } = useQuery({
    queryKey: ["stylist_levels"],
    queryFn: () => db.entities.StylistLevel.list(),
  });

  const getCompanyName = (companyId) => {
    const c = companies.find(c => c.id === companyId);
    return c ? c.name : null;
  };

  // Filter users based on role:
  // - Super admin: sees all users
  // - Admin: sees only professionals/clientes from their companies
  // - Profissional: sees only professionals/clientes from their company
  const currentUserCompanyIds = currentUser?.company_ids?.length ? currentUser.company_ids : (currentUser?.company_id ? [currentUser.company_id] : []);

  const companyLevels = currentUserCompanyIds.length
    ? allStylistLevels.filter(l => currentUserCompanyIds.includes(l.company_id))
    : allStylistLevels;
  const visibleUsers = isSuperAdmin
    ? users.filter(u => {
        const uRole = u.role === "teacher" ? "profissional" : u.role === "user" ? "cliente" : u.role;
        return uRole === "super_admin" || uRole === "admin";
      })
    : isAdmin
      ? users.filter(u => {
          const uRole = u.role === "teacher" ? "profissional" : u.role === "user" ? "cliente" : u.role;
          const uIds = u.company_ids?.length ? u.company_ids : (u.company_id ? [u.company_id] : []);
          return (uRole === "super_admin" || uRole === "admin") && currentUserCompanyIds.some(cid => uIds.includes(cid));
        })
      : [];

  useEffect(() => {
    if (settings.length > 0) {
      const settingsMap = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setFormData(prev => ({
        ...prev,
        asaas_master_api_key: settingsMap.asaas_master_api_key || "",
        asaas_master_environment: settingsMap.asaas_master_environment || "sandbox",
        asaas_api_key: settingsMap.asaas_api_key || "",
        asaas_environment: settingsMap.asaas_environment || "sandbox",
        whatsapp_token: settingsMap.whatsapp_token || "",
        whatsapp_phone_id: settingsMap.whatsapp_phone_id || "",
        app_url: settingsMap.app_url || "",
      }));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const keys = Object.keys(data);
      
      for (const key of keys) {
        const existing = settings.find(s => s.key === key);
        if (existing) {
          await db.entities.Settings.update(existing.id, { value: data[key] });
        } else {
          await db.entities.Settings.create({ key, value: data[key] });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const saveUserMutation = useMutation({
    mutationFn: async (userData) => {
      if (editingUser) {
        const cleanData = {
          full_name: userData.full_name || null,
          email: userData.email || null,
          role: userData.role,
          cpf: userData.cpf || null,
          rg: userData.rg || null,
          birth_date: userData.birth_date || null,
          is_master: userData.is_master || false,
          is_professional: userData.is_professional || false,
        };
        const { error: updateError } = await supabase
          .from("users")
          .update(cleanData)
          .eq("id", editingUser.id);
        if (updateError) throw updateError;
        await supabase.from("user_companies").delete().eq("user_id", editingUser.id);
        if (userData.company_ids?.length) {
          const rows = userData.company_ids.map(company_id => ({
            user_id: editingUser.id,
            company_id,
          }));
          const { error: insertError } = await supabase.from("user_companies").insert(rows);
          if (insertError) throw insertError;
        }
        return editingUser;
      } else {
        if (!userData.password || userData.password.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres");
        }
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${window.location.origin}/api/auth/admin-create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            full_name: userData.full_name || "",
            role: userData.role || "cliente",
            company_ids: userData.company_ids || [],
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Erro ao criar usuário");

        if (result.user_id && userData.company_ids?.length) {
          const rows = userData.company_ids.map(company_id => ({
            user_id: result.user_id,
            company_id,
          }));
          await supabase.from("user_companies").insert(rows);
        }

        if (result.user_id && userData.is_professional) {
          await supabase.from("users").update({ is_professional: true }).eq("id", result.user_id);
        }

        const roleLabel = userData.role === "super_admin" ? "Super Admin" : userData.role === "admin" ? "Administrador" : userData.role === "profissional" ? "Profissional" : "Cliente";
        await db.entities.AuditLog.create({
          action: "create",
          entity_type: "User",
          category: "system",
          description: `Usuário ${userData.email} criado como ${roleLabel}`,
          user_name: currentUser?.full_name || currentUser?.email,
          user_email: currentUser?.email,
        });
        return result;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (editingUser) {
        toast.success("Usuário atualizado!");
      } else {
        toast.success("Usuário criado com sucesso!");
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ full_name: "", email: "", password: "", cpf: "", rg: "", birth_date: "", role: "cliente", company_ids: [], is_master: false, is_professional: false });
    },
    onError: (error) => {
      console.error("saveUserMutation error:", error);
      const msg = error?.message || error?.error?.message || "Erro ao salvar usuário";
      toast.error(msg);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      // Tenta via servidor (mais confiável, usa service_role)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${window.location.origin}/api/auth/admin-delete-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({ user_id: userId }),
        });
        if (res.ok) return;
        console.warn("admin-delete-user failed, falling back to client-side delete");
      } catch (e) {
        console.warn("admin-delete-user error, falling back:", e);
      }

      // Fallback: client-side
      await supabase.from("user_companies").delete().eq("user_id", userId);
      await db.entities.User.delete(userId);
      await supabase.rpc("delete_user_direct", { p_user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído!");
    },
    onError: (error) => {
      console.error("deleteUserMutation error:", error);
      toast.error("Erro ao excluir usuário: " + (error?.message || ""));
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: ({ id, active }) => db.entities.User.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        password: "",
        cpf: user.cpf || "",
        rg: user.rg || "",
        birth_date: user.birth_date || "",
        role: user.role || "cliente",
        company_ids: user.company_ids || [],
        is_master: user.is_master || false,
        is_professional: user.is_professional || user.role === "profissional" || false,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        full_name: "", email: "", password: "", cpf: "", rg: "", birth_date: "",
        role: "cliente",
        company_ids: isSuperAdmin ? [] : currentUserCompanyIds.length ? [currentUserCompanyIds[0]] : [],
        is_master: false,
        is_professional: false,
      });
    }
    setShowUserModal(true);
  };

  const isEditingUserDirty = () => {
    if (!editingUser) return true;
    return (
      userFormData.full_name !== (editingUser.full_name || "") ||
      userFormData.email !== (editingUser.email || "") ||
      userFormData.cpf !== (editingUser.cpf || "") ||
      userFormData.rg !== (editingUser.rg || "") ||
      userFormData.birth_date !== (editingUser.birth_date || "") ||
      userFormData.role !== (editingUser.role || "cliente") ||
      (userFormData.is_master || false) !== (editingUser.is_master || false) ||
      (userFormData.is_professional || false) !== (editingUser.is_professional || false) ||
      JSON.stringify(userFormData.company_ids) !== JSON.stringify(editingUser.company_ids || [])
    );
  };

  const handleSaveUser = () => {
    if (!userFormData.email) {
      toast.error("Email é obrigatório");
      return;
    }
    if (editingUser && !isEditingUserDirty()) {
      toast.info("Nenhuma alteração efetuada");
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ full_name: "", email: "", password: "", cpf: "", rg: "", birth_date: "", role: "cliente", company_ids: [], is_master: false, is_professional: false });
      return;
    }
    saveUserMutation.mutate(userFormData);
  };

  const handleDeleteUser = (userId) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleOpenResetPassword = (user) => {
    setResetTargetUser(user);
    setNewPassword("");
    setMustChangeOnLogin(false);
    setShowNewPassword(false);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await fetch(`${window.location.origin}/api/auth/admin-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentSession?.access_token}`,
        },
        body: JSON.stringify({
          user_id: resetTargetUser.id,
          new_password: newPassword,
          must_change_password: mustChangeOnLogin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      // Clear temp_password after successful reset (password was changed)
      try {
        await supabase
          .from("users")
          .update({ temp_password: null })
          .eq("id", resetTargetUser.id);
      } catch (clearErr) {
        console.warn("Failed to clear temp_password:", clearErr);
      }

      // Invalidate users query so that the UI updates
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Senha redefinida com sucesso!");
      setShowResetPasswordModal(false);
    } catch (err) {
      toast.error("Erro ao redefinir senha: " + (err.message || err));
    }
  };

  // While loading user, show nothing (prevent flash of Settings for profissionais)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-branding-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Block profissionais from accessing Settings — show 404 Page Not Found
  if (isProfissional) {
    return <PageNotFound />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-branding-primary/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-branding-primary to-branding-secondary">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            Configurações
          </h1>
          <p className="text-gray-500 mt-1">Configure as integrações do sistema</p>
        </div>

        <div className="space-y-6">
          {/* Asaas Master Account - Super Admin only */}
          {isSuperAdmin && (
            <Card className="rounded-2xl shadow-sm border border-amber-100 bg-amber-50/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Conta Mestre Asaas</CardTitle>
                    <CardDescription>
                      Chave da sua conta principal. As subcontas das empresas serão criadas através dela.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Chave de API (Conta Mestre)</Label>
                  <div className="relative">
                    <Input
                      type={showMasterKey ? "text" : "password"}
                      value={formData.asaas_master_api_key}
                      onChange={e => setFormData(f => ({ ...f, asaas_master_api_key: e.target.value }))}
                      placeholder="$aas_xxxxxxxxxxxxxxxx"
                      className="pr-10 rounded-xl bg-white"
                    />
                    <button type="button" onClick={() => setShowMasterKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={() => saveMutation.mutate({ asaas_master_api_key: formData.asaas_master_api_key })}
                  disabled={saveMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 rounded-xl"
                >
                  {saveMutation.isPending ? "Salvando..." : <><Save className="w-4 h-4 mr-2" />Salvar Conta Mestre</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Portal URL - Super Admin only */}
          {isSuperAdmin && (
            <Card className="rounded-2xl shadow-sm border border-blue-100 bg-blue-50/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">URL do Portal do Cliente</CardTitle>
                    <CardDescription>
                      Usada nos links enviados por WhatsApp. Ex: https://seu-app.db.app
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">URL do app (sem barra no final)</Label>
                  <Input
                    type="url"
                    value={formData.app_url}
                    onChange={e => setFormData(f => ({ ...f, app_url: e.target.value }))}
                    placeholder="https://seu-app.db.app"
                    className="rounded-xl bg-white"
                  />
{formData.app_url && (
                      <p className="text-xs text-blue-600">Link que será enviado: <strong>{formData.app_url}/portalcliente</strong></p>
                    )}
                </div>
                <Button
                  onClick={() => saveMutation.mutate({ app_url: formData.app_url })}
                  disabled={saveMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />Salvar URL
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Integrations per company - Super Admin only */}
          {isSuperAdmin && companies.length > 0 && (
            <Card className="rounded-2xl shadow-sm border border-gray-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-branding-primary/10">
                      <Building2 className="w-5 h-5 text-branding-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Integrações por Salão</CardTitle>
                      <CardDescription>Asaas e WhatsApp configurados individualmente para cada salão</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {companies.map(company => (
                  <div key={company.id}>
                    <CompanyIntegrationCard company={company} />
                    <div className="mt-1 flex justify-end">
                      <button
                        onClick={() => setSubaccountsCompany(company)}
                        className="text-xs text-branding-primary hover:underline flex items-center gap-1 px-2 py-1"
                      >
                        <List className="w-3 h-3" /> Gerenciar Subcontas Asaas
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Profissional/Admin: show own company integration (read-only summary) */}
          {(isProfissional || isAdmin) && (currentUser?.company_ids?.length || currentUser?.company_id) && (
            <Card className="rounded-2xl shadow-sm border border-gray-100">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-branding-primary/10">
                    <Building2 className="w-5 h-5 text-branding-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Integrações do Salão</CardTitle>
                    <CardDescription>Configurações Asaas e WhatsApp do seu salão</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {companies.filter(c => {
                  const cIds = currentUser?.company_ids?.length ? currentUser.company_ids : (currentUser?.company_id ? [currentUser.company_id] : []);
                  return cIds.includes(c.id);
                }).map(company => (
                  <CompanyIntegrationCard key={company.id} company={company} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Fotos da Tela de Entrada (Login) */}
          {isSuperAdmin && (
            <LoginImagesCard />
          )}

          {/* Branding por Empresa */}
          {(isSuperAdmin || isAdmin) && companies.length > 0 && (
            <Card className="rounded-2xl shadow-sm border border-gray-100">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <PaintBucket className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Marca por Salão</CardTitle>
                    <CardDescription>Personalize cores, logo e nome do app para cada salão</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {companies.map(company => (
                  <CompanyBrandingCard key={company.id} company={company} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Users Management */}
          {(isSuperAdmin || isAdmin) && (
          <Card className="rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-branding-secondary/10">
                    <Users className="w-5 h-5 text-branding-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
                    <CardDescription>Gerencie os usuários que têm acesso ao sistema</CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => handleOpenUserModal()}
                  className="bg-branding-secondary hover:bg-branding-secondary/90 rounded-xl w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visibleUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center text-white font-semibold">
                        {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-1.5">
                          {user.full_name || "Sem nome"}
                          {user.is_master && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                              <Crown className="w-3 h-3" />
                              Master
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {(() => {
                          const cIds = user.company_ids?.length ? user.company_ids : (user.company_id ? [user.company_id] : []);
                          if (cIds.length === 0) return null;
                          return (
                            <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                              🏢 {cIds.map(id => getCompanyName(id)).filter(Boolean).join(", ") || cIds[0]}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
<span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === "super_admin" ? "bg-purple-100 text-purple-700" :
                        user.role === "admin" ? "bg-amber-100 text-amber-700" :
                        user.role === "profissional" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                       }`}>
                        {user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Administrador" : user.role === "profissional" ? "Profissional" : "Cliente"}
                       </span>
                      <Switch
                        checked={user.active !== false}
                        onCheckedChange={(checked) =>
                          toggleUserActiveMutation.mutate({ id: user.id, active: checked })
                        }
                        title={user.active !== false ? "Ativo" : "Inativo"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenUserModal(user)}
                        className="text-gray-600 hover:text-branding-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.is_master && !isSuperAdmin}
                        className={user.is_master && !isSuperAdmin ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:text-red-600"}
                        title={user.is_master && !isSuperAdmin ? "Somente Super Admin pode excluir o Master" : "Excluir"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {visibleUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Nenhum usuário cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Modalities Management */}
          <ModalitiesSection />

          {/* No global save button needed - per-company cards have their own save */}
        </div>

        {/* Reset Password Modal */}
        {showResetPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-branding-primary" />
                Redefinir Senha
              </h3>
              <p className="text-sm text-gray-500">
                Defina uma nova senha temporária para <strong>{resetTargetUser?.full_name || resetTargetUser?.email}</strong>.
              </p>

              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={mustChangeOnLogin}
                  onChange={(e) => setMustChangeOnLogin(e.target.checked)}
                  className="w-4 h-4 text-branding-primary"
                />
                <div>
                  <p className="text-sm font-medium text-amber-900">Solicitar troca no próximo login</p>
                  <p className="text-xs text-amber-600">O usuário deverá criar uma nova senha ao entrar</p>
                </div>
              </label>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowResetPasswordModal(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={handleResetPassword}
                  className="flex-1 bg-branding-primary hover:bg-branding-primary/90 rounded-xl"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={userFormData.full_name}
                    onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                    placeholder="João da Silva"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="joao@exemplo.com"
                    className="rounded-xl"
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="rounded-xl"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input
                      value={userFormData.cpf}
                      onChange={(e) => setUserFormData({ ...userFormData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>RG</Label>
                    <Input
                      value={userFormData.rg}
                      onChange={(e) => setUserFormData({ ...userFormData, rg: e.target.value })}
                      placeholder="00.000.000-0"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={userFormData.birth_date}
                    onChange={(e) => setUserFormData({ ...userFormData, birth_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Shield className="w-4 h-4" /> Perfil</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(isSuperAdmin
                      ? [
                          { value: "super_admin", label: "Super Admin", color: "purple" },
                          { value: "admin", label: "Admin", color: "amber" },
                          { value: "profissional", label: "Profissional", color: "blue" },
                          { value: "cliente", label: "Cliente", color: "gray" },
                        ]
                      : isAdmin
                        ? [
                            { value: "admin", label: "Admin", color: "amber" },
                            { value: "profissional", label: "Profissional", color: "blue" },
                            { value: "cliente", label: "Cliente", color: "gray" },
                          ]
                        : [
                            { value: "profissional", label: "Profissional", color: "blue" },
                            { value: "cliente", label: "Cliente", color: "gray" },
                          ]
                    ).map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setUserFormData({ ...userFormData, role: value })}
                        className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          userFormData.role === value
                            ? color === "purple" ? "border-purple-500 bg-purple-50 text-purple-700"
                            : color === "amber" ? "border-amber-500 bg-amber-50 text-amber-700"
                            : color === "blue" ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-400 bg-gray-100 text-gray-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Company multi-select dropdown */}
                {(isSuperAdmin || isAdmin) && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</Label>
                    <CompanyMultiSelect
                      companies={isSuperAdmin ? companies : companies.filter(c => currentUserCompanyIds.includes(c.id))}
                      selectedIds={userFormData.company_ids}
                      onChange={(ids) => setUserFormData({ ...userFormData, company_ids: ids })}
                    />
                  </div>
                )}

                {/* Professional toggle */}
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={userFormData.is_professional || false}
                    onChange={(e) => setUserFormData({ ...userFormData, is_professional: e.target.checked })}
                    className="w-4 h-4 text-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-blue-900 flex items-center gap-1.5">
                      <UserCog className="w-4 h-4" />
                      É profissional
                    </p>
                    <p className="text-xs text-blue-600">Permitirá agendar este usuário como profissional nos atendimentos</p>
                  </div>
                </label>

                {/* Master toggle - only super_admin */}
                {isSuperAdmin && editingUser && (
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <input
                      type="checkbox"
                      checked={userFormData.is_master || false}
                      onChange={(e) => setUserFormData({ ...userFormData, is_master: e.target.checked })}
                      className="w-4 h-4 text-amber-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-amber-900 flex items-center gap-1.5">
                        <Crown className="w-4 h-4" />
                        Master da Conta
                      </p>
                      <p className="text-xs text-amber-600">Responsável pelo recebimento de cobranças. Não pode ser excluído.</p>
                    </div>
                  </label>
                )}

                {editingUser && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserModal(false);
                        handleOpenResetPassword(editingUser);
                      }}
                      className="flex items-center gap-2 text-sm text-branding-primary hover:underline"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Redefinir senha
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveUser}
                  disabled={saveUserMutation.isPending || (!editingUser && (!userFormData.email || !userFormData.password || userFormData.password.length < 6))}
                  className="flex-1 bg-branding-secondary hover:bg-branding-secondary/90 rounded-xl"
                >
                  {saveUserMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {subaccountsCompany && (
        <AsaasSubaccountsModal
          company={subaccountsCompany}
          onClose={() => setSubaccountsCompany(null)}
        />
      )}
    </div>
  );
}