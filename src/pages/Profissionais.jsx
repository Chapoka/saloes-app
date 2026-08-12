import { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  UserCog,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Search,
  Scissors,
  Package,
  ArrowLeft,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_PROFESSIONAL = {
  name: "",
  email: "",
  phone: "",
  role: "profissional",
  active: true,
};

const TABS = [
  { key: "info", label: "Informações" },
  { key: "services", label: "Serviços" },
  { key: "products", label: "Produtos" },
];

export default function Profissionais() {
  const queryClient = useQueryClient();
  const theme = useThemeMode();
  const { companyId, isSuperAdmin, isAdmin, ready } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);
  const [editingProf, setEditingProf] = useState(null);
  const [deletingProf, setDeletingProf] = useState(null);
  const [profForm, setProfForm] = useState(EMPTY_PROFESSIONAL);
  const [activeTab, setActiveTab] = useState("services");

  const effectiveCompanyId = companyId;

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => db.entities.User.list(),
    enabled: ready,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => db.entities.Service.list(),
    enabled: ready,
  });

  const { data: allProServ = [] } = useQuery({
    queryKey: ["professional_services"],
    queryFn: () => db.entities.ProfessionalService.list(),
    enabled: ready,
  });

  const professionals = allUsers.filter(u => {
    const rawRole = u.role || "";
    const role = rawRole === "teacher" ? "profissional" : rawRole;
    const isProf = role === "profissional";
    const matchCompany = !effectiveCompanyId || u.company_id === effectiveCompanyId || (u.company_ids || []).includes(effectiveCompanyId);
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return isProf && matchCompany && matchSearch;
  });

  const services = effectiveCompanyId
    ? allServices.filter(s => s.company_id === effectiveCompanyId && s.active !== false)
    : allServices.filter(s => s.active !== false);

  const onlyServices = services.filter(s => s.type === "service");
  const onlyProducts = services.filter(s => s.type === "product");

  const proServForProf = (profId) => {
    return allProServ.filter(ps => ps.professional_id === profId);
  };

  const proServByType = (profId, type) => {
    const links = allProServ.filter(ps => ps.professional_id === profId);
    if (type === "services") {
      return links.filter(l => allServices.some(s => s.id === l.service_id && s.type === "service"));
    }
    if (type === "products") {
      return links.filter(l => allServices.some(s => s.id === l.service_id && s.type === "product"));
    }
    return links;
  };

  const createProf = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.auth.admin.createUser({
        email: data.email,
        password: "123456",
        email_confirm: true,
      });
      if (error) throw error;
      const { error: profileError } = await supabase.from("users").insert({
        id: result.user.id,
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        role: "profissional",
        company_id: effectiveCompanyId,
        must_change_password: true,
      });
      if (profileError) throw profileError;
      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("Profissional criado! Senha: 123456");
      setShowForm(false);
      setProfForm(EMPTY_PROFESSIONAL);
    },
    onError: (err) => toast.error("Erro ao criar: " + err.message),
  });

  const updateProf = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { error } = await supabase.from("users").update({
        full_name: data.name,
        phone: data.phone,
        active: data.active,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("Profissional atualizado!");
      setShowForm(false);
      setEditingProf(null);
      setProfForm(EMPTY_PROFESSIONAL);
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteProf = useMutation({
    mutationFn: async (id) => {
      await supabase.from("professional_services").delete().eq("professional_id", id);
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      queryClient.invalidateQueries(["professional_services"]);
      toast.success("Profissional removido!");
      setDeletingProf(null);
      setSelectedProf(null);
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const saveLink = useMutation({
    mutationFn: async ({ professionalId, serviceId, commission, performs_service, price_override, duration_override }) => {
      const existing = allProServ.find(
        ps => ps.professional_id === professionalId && ps.service_id === serviceId
      );
      const payload = {
        commission_pct: commission,
        performs_service: performs_service,
        price_override: price_override,
        duration_override: duration_override,
      };
      if (existing) {
        const { error } = await supabase.from("professional_services").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professional_services").insert({
          professional_id: professionalId,
          service_id: serviceId,
          company_id: effectiveCompanyId,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["professional_services"]);
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const removeLink = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("professional_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["professional_services"]);
      toast.success("Removido!");
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const handleSaveProf = () => {
    if (!profForm.name) return toast.error("Nome é obrigatório");
    if (!profForm.email) return toast.error("E-mail é obrigatório");
    if (editingProf) {
      updateProf.mutate({ id: editingProf.id, ...profForm });
    } else {
      createProf.mutate(profForm);
    }
  };

  const handleAddService = (serviceId) => {
    const svc = allServices.find(s => s.id === serviceId);
    saveLink.mutate({
      professionalId: selectedProf.id,
      serviceId,
      commission: svc?.comissao || 0,
      performs_service: true,
      price_override: svc?.price || 0,
      duration_override: svc?.duration_mins || 30,
    });
  };

  const formatDuration = (mins) => {
    const h = Math.floor((mins || 0) / 60);
    const m = (mins || 0) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const parseDuration = (str) => {
    const [h, m] = str.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const selectedProfServices = selectedProf ? proServByType(selectedProf.id, activeTab) : [];
  const linkedIds = selectedProfServices.map(ps => ps.service_id);
  const availableItems = activeTab === "services"
    ? onlyServices.filter(s => !linkedIds.includes(s.id))
    : onlyProducts.filter(s => !linkedIds.includes(s.id));

  // --- LIST VIEW ---
  if (!selectedProf) {
    return (
      <div className={cn("max-w-6xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.cardText }}>Profissionais</h1>
            <p className="text-sm mt-1" style={{ color: theme.mutedText }}>Gerencie profissionais, serviços e comissões</p>
          </div>
          <Button
            onClick={() => { setEditingProf(null); setProfForm(EMPTY_PROFESSIONAL); setShowForm(true); }}
            className="bg-branding-primary text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Profissional
          </Button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input placeholder="Buscar profissional..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loadingUsers ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-12">
            <UserCog className="w-12 h-12 mx-auto text-gray-500 mb-3" />
            <p className="text-gray-500">Nenhum profissional encontrado</p>
            <Button onClick={() => { setEditingProf(null); setProfForm(EMPTY_PROFESSIONAL); setShowForm(true); }} className="mt-4 bg-branding-primary text-white">
              <Plus className="w-4 h-4 mr-2" /> Criar primeiro profissional
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {professionals.map(prof => {
              const svcCount = proServByType(prof.id, "services").length;
              const prodCount = proServByType(prof.id, "products").length;
              return (
                <div
                  key={prof.id}
                  onClick={() => { setSelectedProf(prof); setActiveTab("services"); }}
                  className={cn(
                    "rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer",
                    prof.active === false ? "opacity-60" : ""
                  )}
                  style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-branding-primary/10 flex items-center justify-center text-branding-primary font-bold text-lg">
                        {(prof.full_name || prof.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{prof.full_name || "Sem nome"}</h3>
                        <p className="text-xs text-gray-500">{prof.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", prof.active !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200")}>
                        {prof.active !== false ? "Ativo" : "Inativo"}
                      </Badge>
                      {svcCount > 0 && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{svcCount} serviços</Badge>}
                      {prodCount > 0 && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{prodCount} produtos</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CREATE MODAL */}
        <AlertDialog open={showForm} onOpenChange={setShowForm}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{editingProf ? "Editar Profissional" : "Novo Profissional"}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome *</Label>
                <Input value={profForm.name} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input type="email" value={profForm.email} onChange={e => setProfForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" disabled={!!editingProf} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={profForm.phone} onChange={e => setProfForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              {!editingProf && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-700">Senha temporária: <strong>123456</strong></p>
                </div>
              )}
              {editingProf && (
                <div className="flex items-center gap-2">
                  <Switch checked={profForm.active} onCheckedChange={v => setProfForm(f => ({ ...f, active: v }))} />
                  <Label className="text-sm">Ativo</Label>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveProf} className="bg-branding-primary text-white">
                {editingProf ? "Salvar" : "Criar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deletingProf} onOpenChange={() => setDeletingProf(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
              <AlertDialogDescription>"{deletingProf?.full_name}" será removido permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteProf.mutate(deletingProf.id)} className="bg-red-600 text-white hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  const currentTabLabel = TABS.find(t => t.key === activeTab)?.label || "";

  return (
    <div className={cn("max-w-6xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedProf(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-branding-primary/10 flex items-center justify-center text-branding-primary font-bold">
            {(selectedProf.full_name || "?")[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: theme.cardText }}>{selectedProf.full_name}</h1>
            <p className="text-sm" style={{ color: theme.mutedText }}>{selectedProf.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit" style={{ background: theme.isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-5 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Informações */}
      {activeTab === "info" && (
        <div className="rounded-xl border p-6 space-y-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <h2 className="text-lg font-semibold" style={{ color: theme.cardText }}>Dados do Profissional</h2>
          <InfoField label="Nome" value={selectedProf.full_name} />
          <InfoField label="E-mail" value={selectedProf.email} />
          <InfoField label="Telefone" value={selectedProf.phone || "-"} />
          <InfoField label="Status" value={selectedProf.active !== false ? "Ativo" : "Inativo"} />
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingProf(selectedProf);
                setProfForm({ name: selectedProf.full_name || "", email: selectedProf.email || "", phone: selectedProf.phone || "", role: "profissional", active: selectedProf.active !== false });
                setShowForm(true);
              }}
            >
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeletingProf(selectedProf)}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          </div>

          <AlertDialog open={showForm} onOpenChange={setShowForm}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Editar Profissional</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nome *</Label>
                  <Input value={profForm.name} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>E-mail *</Label>
                  <Input type="email" value={profForm.email} onChange={e => setProfForm(f => ({ ...f, email: e.target.value }))} disabled />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={profForm.phone} onChange={e => setProfForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={profForm.active} onCheckedChange={v => setProfForm(f => ({ ...f, active: v }))} />
                  <Label className="text-sm">Ativo</Label>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSaveProf} className="bg-branding-primary text-white">Salvar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* TAB: Serviços / Produtos (table) */}
      {(activeTab === "services" || activeTab === "products") && (
        <div className="space-y-4">
          {/* Add row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>{activeTab === "services" ? "Adicionar Serviço" : "Adicionar Produto"}</Label>
              <Select onValueChange={handleAddService}>
                <SelectTrigger><SelectValue placeholder={`Selecione ${activeTab === "services" ? "um serviço" : "um produto"}...`} /></SelectTrigger>
                <SelectContent>
                  {availableItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                  {availableItems.length === 0 && <SelectItem value="__none" disabled>Nenhum disponível</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {selectedProfServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm rounded-xl border" style={{ borderColor: theme.cardBorder }}>
              Nenhum {activeTab === "services" ? "serviço" : "produto"} vinculado.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.cardBorder }}>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ background: theme.isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: theme.mutedText }}>
                <div className="col-span-3">Nome</div>
                <div className="col-span-2 text-center">{activeTab === "services" ? "Barbeiro faz?" : "Ativo?"}</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-1 text-center">Valor (R$)</div>
                <div className="col-span-2 text-center">Tempo</div>
                <div className="col-span-2 text-center">Comissão (%)</div>
              </div>
              {/* Table Rows */}
              {selectedProfServices.map(ps => {
                const svc = allServices.find(s => s.id === ps.service_id);
                if (!svc) return null;
                return (
                  <div
                    key={ps.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t text-sm"
                    style={{ borderColor: theme.cardBorder, background: theme.cardBg }}
                  >
                    {/* Nome */}
                    <div className="col-span-3 font-medium truncate" style={{ color: theme.cardText }}>{svc.name}</div>
                    {/* Barbeiro faz? / Ativo? */}
                    <div className="col-span-2 flex justify-center">
                      <Checkbox
                        checked={ps.performs_service !== false}
                        onCheckedChange={v => saveLink.mutate({
                          professionalId: selectedProf.id,
                          serviceId: ps.service_id,
                          commission: ps.commission_pct || 0,
                          performs_service: v,
                          price_override: ps.price_override,
                          duration_override: ps.duration_override,
                        })}
                      />
                    </div>
                    {/* Tipo */}
                    <div className="col-span-2 text-center">
                      <Badge variant="outline" className="text-xs">
                        {svc.service_type || "Normal"}
                      </Badge>
                    </div>
                    {/* Valor */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={ps.price_override ?? svc.price ?? 0}
                        onChange={e => saveLink.mutate({
                          professionalId: selectedProf.id,
                          serviceId: ps.service_id,
                          commission: ps.commission_pct || 0,
                          performs_service: ps.performs_service,
                          price_override: parseFloat(e.target.value) || 0,
                          duration_override: ps.duration_override,
                        })}
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    {/* Tempo */}
                    <div className="col-span-2">
                      <Input
                        type="text"
                        value={formatDuration(ps.duration_override ?? svc.duration_mins)}
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d{0,2}:?\d{0,2}$/.test(val)) {
                            saveLink.mutate({
                              professionalId: selectedProf.id,
                              serviceId: ps.service_id,
                              commission: ps.commission_pct || 0,
                              performs_service: ps.performs_service,
                              price_override: ps.price_override,
                              duration_override: parseDuration(val),
                            });
                          }
                        }}
                        onBlur={e => {
                          const mins = parseDuration(e.target.value);
                          if (mins > 0) {
                            saveLink.mutate({
                              professionalId: selectedProf.id,
                              serviceId: ps.service_id,
                              commission: ps.commission_pct || 0,
                              performs_service: ps.performs_service,
                              price_override: ps.price_override,
                              duration_override: mins,
                            });
                          }
                        }}
                        className="h-8 text-xs text-center"
                        placeholder="00:00"
                      />
                    </div>
                    {/* Comissão */}
                    <div className="col-span-2 flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={ps.commission_pct || 0}
                        onChange={e => saveLink.mutate({
                          professionalId: selectedProf.id,
                          serviceId: ps.service_id,
                          commission: parseFloat(e.target.value) || 0,
                          performs_service: ps.performs_service,
                          price_override: ps.price_override,
                          duration_override: ps.duration_override,
                        })}
                        className="h-8 text-xs text-center"
                      />
                      <span className="text-xs text-gray-400">%</span>
                      <button
                        onClick={() => removeLink.mutate(ps.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-500 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
