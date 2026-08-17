import { useState } from "react";
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
  Search,
  ArrowLeft,
  Camera,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

const EMPTY_PROFESSIONAL = {
  name: "", email: "", phone: "", active: true,
  commission_pct: 0, specialty: "", photo_url: "",
  work_days: ["seg", "ter", "qua", "qui", "sex", "sab"],
};

const WORK_DAYS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const TABS = [
  { key: "info", label: "Informações" },
  { key: "services", label: "Serviços" },
  { key: "products", label: "Produtos" },
];

export default function Profissionais() {
  const queryClient = useQueryClient();
  const theme = useThemeMode();
  const { companyId, ready } = useCurrentUser();

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

  const proServForProf = (profId) => allProServ.filter(ps => ps.professional_id === profId);

  const proServByType = (profId, type) => {
    const links = allProServ.filter(ps => ps.professional_id === profId);
    if (type === "services") return links.filter(l => allServices.some(s => s.id === l.service_id && s.type === "service"));
    if (type === "products") return links.filter(l => allServices.some(s => s.id === l.service_id && s.type === "product"));
    return links;
  };

  const createProf = useMutation({
    mutationFn: async (data) => {
      const extra = {
        phone: data.phone,
        commission_pct: data.commission_pct || 0,
        specialty: data.specialty || "",
        photo_url: data.photo_url || "",
        work_days: data.work_days || [],
      };
      if (effectiveCompanyId) {
        extra.company_id = effectiveCompanyId;
        extra.company_ids = [effectiveCompanyId];
      }
      const result = await db.users.inviteUser(data.email, "profissional", data.name, extra);
      // Fallback: update fields on the client if server didn't handle them
      if (result?.user_id) {
        try {
          await supabase.from("users").update({
            phone: data.phone,
            commission_pct: data.commission_pct || 0,
            specialty: data.specialty || "",
            photo_url: data.photo_url || "",
            work_days: data.work_days || [],
            must_change_password: true,
            company_id: effectiveCompanyId,
            company_ids: effectiveCompanyId ? [effectiveCompanyId] : undefined,
          }).eq("id", result.user_id);
        } catch {
          // RLS might block client-side update, that's OK — server already saved
        }
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(["users"]);
      toast.success(`Profissional criado! Senha: ${result?.temp_password || "123456"}`);
      setShowForm(false);
      setProfForm(EMPTY_PROFESSIONAL);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateProf = useMutation({
    mutationFn: async ({ id, ...data }) => {
      try {
        await db.users.updateUser(id, {
          full_name: data.name,
          phone: data.phone,
          active: data.active,
          commission_pct: data.commission_pct || 0,
          specialty: data.specialty || "",
          photo_url: data.photo_url || "",
          work_days: data.work_days || [],
        });
      } catch {
        // Fallback: try client-side (may fail with RLS)
        await supabase.from("users").update({
          full_name: data.name,
          phone: data.phone,
          active: data.active,
        }).eq("id", id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries(["users"]); toast.success("Atualizado!"); setShowForm(false); setEditingProf(null); },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteProf = useMutation({
    mutationFn: async (id) => {
      await supabase.from("professional_services").delete().eq("professional_id", id);
      // Delete from auth.users via RPC
      try {
        await supabase.rpc("delete_user_direct", { p_user_id: id });
      } catch {
        // Fallback: delete from public users only
        await supabase.from("users").delete().eq("id", id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries(["users"]); queryClient.invalidateQueries(["professional_services"]); toast.success("Removido!"); setDeletingProf(null); setSelectedProf(null); },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const saveLink = useMutation({
    mutationFn: async ({ professionalId, serviceId, commission, performs_service, price_override, duration_override }) => {
      const existing = allProServ.find(ps => ps.professional_id === professionalId && ps.service_id === serviceId);
      const payload = { commission_pct: commission, performs_service, price_override, duration_override };
      if (existing) {
        const { error } = await supabase.from("professional_services").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professional_services").insert({ professional_id: professionalId, service_id: serviceId, company_id: effectiveCompanyId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries(["professional_services"]),
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const removeLink = useMutation({
    mutationFn: async (id) => { const { error } = await supabase.from("professional_services").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries(["professional_services"]); toast.success("Removido!"); },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const handleSaveProf = () => {
    if (!profForm.name) return toast.error("Nome é obrigatório");
    if (!editingProf && !profForm.email) return toast.error("E-mail é obrigatório");
    if (editingProf) updateProf.mutate({ id: editingProf.id, ...profForm });
    else createProf.mutate(profForm);
  };

  const handleAddService = (serviceId) => {
    const svc = allServices.find(s => s.id === serviceId);
    saveLink.mutate({
      professionalId: selectedProf.id, serviceId,
      commission: svc?.comissao || 0, performs_service: true,
      price_override: svc?.price || 0, duration_override: svc?.duration_mins || 30,
    });
  };

  const formatDuration = (mins) => `${String(Math.floor((mins || 0) / 60)).padStart(2, "0")}:${String((mins || 0) % 60).padStart(2, "0")}`;
  const parseDuration = (str) => { const [h, m] = str.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

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
          <Button onClick={() => { setEditingProf(null); setProfForm(EMPTY_PROFESSIONAL); setShowForm(true); }} className="bg-branding-primary text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Novo Profissional
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
          </div>
        ) : (
          <div className="space-y-3">
            {professionals.map(prof => {
              const svcCount = proServByType(prof.id, "services").length;
              const prodCount = proServByType(prof.id, "products").length;
              return (
                <div key={prof.id} onClick={() => { setSelectedProf(prof); setActiveTab("services"); }}
                  className={cn("rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer", prof.active === false ? "opacity-60" : "")}
                  style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {prof.photo_url ? (
                        <img src={prof.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-branding-primary/10 flex items-center justify-center text-branding-primary font-bold text-lg">
                          {(prof.full_name || prof.email || "?")[0].toUpperCase()}
                        </div>
                      )}
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

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProf ? "Editar" : "Novo Profissional"}</DialogTitle></DialogHeader>
            <div className="space-y-5">
              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <Label className="text-sm font-medium">Foto do Profissional</Label>
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                  {profForm.photo_url ? (
                    <img src={profForm.photo_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl"
                    onClick={async () => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        try {
                          const result = await db.integrations.Core.UploadFile({ file });
                          setProfForm(f => ({ ...f, photo_url: result.file_url }));
                        } catch (err) {
                          toast.error("Erro ao fazer upload: " + (err.message || err));
                        }
                      };
                      input.click();
                    }}>
                    <Upload className="w-4 h-4 mr-1" /> Escolher Foto
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl"
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                        const video = document.createElement("video");
                        video.srcObject = stream;
                        video.play();
                        await new Promise(r => setTimeout(r, 2000));
                        const canvas = document.createElement("canvas");
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        canvas.getContext("2d").drawImage(video, 0, 0);
                        stream.getTracks().forEach(t => t.stop());
                        canvas.toBlob(async (blob) => {
                          if (!blob) return;
                          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                          try {
                            const result = await db.integrations.Core.UploadFile({ file });
                            setProfForm(f => ({ ...f, photo_url: result.file_url }));
                          } catch (err) {
                            toast.error("Erro ao enviar selfie: " + (err.message || err));
                          }
                        }, "image/jpeg", 0.8);
                      } catch {
                        toast.error("Câmera não disponível");
                      }
                    }}>
                    <Camera className="w-4 h-4 mr-1" /> Tirar Selfie
                  </Button>
                </div>
              </div>

              {/* Nome */}
              <div>
                <Label className="text-sm font-medium">Nome Completo <span className="text-red-500">*</span></Label>
                <Input value={profForm.name} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do profissional" className="mt-1" />
              </div>

              {/* Telefone + Comissão */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <Input value={profForm.phone} onChange={e => setProfForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Comissão (%)</Label>
                  <Input type="number" min={0} max={100} value={profForm.commission_pct || 0} onChange={e => setProfForm(f => ({ ...f, commission_pct: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-sm font-medium">E-mail</Label>
                <Input type="email" value={profForm.email} onChange={e => setProfForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" disabled={!!editingProf} className="mt-1" />
              </div>

              {/* Especialidade */}
              <div>
                <Label className="text-sm font-medium">Especialidade</Label>
                <Input value={profForm.specialty} onChange={e => setProfForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ex: Cortes modernos, Barbas" className="mt-1" />
              </div>

              {/* Dias de Trabalho */}
              <div>
                <Label className="text-sm font-medium">Dias de Trabalho</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {WORK_DAYS.map(day => (
                    <label key={day.key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={(profForm.work_days || []).includes(day.key)}
                        onCheckedChange={(checked) => {
                          setProfForm(f => ({
                            ...f,
                            work_days: checked
                              ? [...(f.work_days || []), day.key]
                              : (f.work_days || []).filter(d => d !== day.key),
                          }));
                        }}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: "var(--border, #e5e7eb)" }}>
                <div>
                  <p className="text-sm font-medium">Profissional Ativo</p>
                  <p className="text-xs text-gray-500">Disponível para agendamento</p>
                </div>
                <Switch checked={profForm.active} onCheckedChange={v => setProfForm(f => ({ ...f, active: v }))} />
              </div>

              {!editingProf && <p className="text-sm text-amber-600">Senha padrão: <strong>123456</strong></p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleSaveProf} className="bg-branding-primary text-white rounded-xl">{editingProf ? "Salvar" : "Criar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  return (
    <div className={cn("max-w-6xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedProf(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          {selectedProf.photo_url ? (
            <img src={selectedProf.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-branding-primary/10 flex items-center justify-center text-branding-primary font-bold">
              {(selectedProf.full_name || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold" style={{ color: theme.cardText }}>{selectedProf.full_name}</h1>
            <p className="text-sm" style={{ color: theme.mutedText }}>{selectedProf.email}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit" style={{ background: theme.isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn("px-5 py-2 rounded-md text-sm font-medium transition-all", activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="rounded-xl border p-6 space-y-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <h2 className="text-lg font-semibold" style={{ color: theme.cardText }}>Dados do Profissional</h2>
          {selectedProf.photo_url && (
            <div className="flex justify-center mb-4">
              <img src={selectedProf.photo_url} alt={selectedProf.full_name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
            </div>
          )}
          {[["Nome", selectedProf.full_name], ["E-mail", selectedProf.email], ["Telefone", selectedProf.phone || "-"], ["Especialidade", selectedProf.specialty || "-"], ["Comissão", `${selectedProf.commission_pct || 0}%`], ["Dias", (selectedProf.work_days || []).map(d => WORK_DAYS.find(w => w.key === d)?.label).filter(Boolean).join(", ") || "-"], ["Status", selectedProf.active !== false ? "Ativo" : "Inativo"]].map(([l, v]) => (
            <div key={l}><p className="text-xs text-gray-500">{l}</p><p className="text-sm font-medium">{v}</p></div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => { setEditingProf(selectedProf); setProfForm({ name: selectedProf.full_name || "", email: selectedProf.email || "", phone: selectedProf.phone || "", active: selectedProf.active !== false, commission_pct: selectedProf.commission_pct || 0, specialty: selectedProf.specialty || "", photo_url: selectedProf.photo_url || "", work_days: selectedProf.work_days || ["seg", "ter", "qua", "qui", "sex", "sab"] }); setShowForm(true); }}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeletingProf(selectedProf)}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          </div>
        </div>
      )}

      {(activeTab === "services" || activeTab === "products") && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>{activeTab === "services" ? "Adicionar Serviço" : "Adicionar Produto"}</Label>
              <Select onValueChange={handleAddService}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {availableItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  {availableItems.length === 0 && <SelectItem value="__" disabled>Nenhum disponível</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedProfServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm rounded-xl border" style={{ borderColor: theme.cardBorder }}>
              Nenhum {activeTab === "services" ? "serviço" : "produto"} vinculado.
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto" style={{ borderColor: theme.cardBorder }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase" style={{ background: theme.isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: theme.mutedText }}>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-center px-4 py-3">{activeTab === "services" ? "Barbeiro faz?" : "Ativo?"}</th>
                    <th className="text-center px-4 py-3">Tipo</th>
                    <th className="text-center px-4 py-3">Valor (R$)</th>
                    <th className="text-center px-4 py-3">Tempo (HH:MM)</th>
                    <th className="text-center px-4 py-3">Comissão (%)</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProfServices.map(ps => {
                    const svc = allServices.find(s => s.id === ps.service_id);
                    if (!svc) return null;
                    return (
                      <tr key={ps.id} className="border-t" style={{ borderColor: theme.cardBorder }}>
                        <td className="px-4 py-3 font-medium" style={{ color: theme.cardText }}>{svc.name}</td>
                        <td className="px-4 py-3 text-center">
                          <Checkbox
                            checked={ps.performs_service !== false}
                            onCheckedChange={v => saveLink.mutate({ professionalId: selectedProf.id, serviceId: ps.service_id, commission: ps.commission_pct || 0, performs_service: v, price_override: ps.price_override, duration_override: ps.duration_override })}
                          />
                        </td>
                        <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-xs">{svc.service_type || "Normal"}</Badge></td>
                        <td className="px-4 py-3 text-center">
                          <Input type="number" min={0} step={0.5} value={ps.price_override ?? svc.price ?? 0}
                            onChange={e => saveLink.mutate({ professionalId: selectedProf.id, serviceId: ps.service_id, commission: ps.commission_pct || 0, performs_service: ps.performs_service, price_override: parseFloat(e.target.value) || 0, duration_override: ps.duration_override })}
                            className="h-8 w-20 text-xs text-center mx-auto" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Input type="text" value={formatDuration(ps.duration_override ?? svc.duration_mins)}
                            onChange={e => { const val = e.target.value; if (/^\d{0,2}:?\d{0,2}$/.test(val)) saveLink.mutate({ professionalId: selectedProf.id, serviceId: ps.service_id, commission: ps.commission_pct || 0, performs_service: ps.performs_service, price_override: ps.price_override, duration_override: parseDuration(val) }); }}
                            className="h-8 w-20 text-xs text-center mx-auto" placeholder="00:00" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Input type="number" min={0} max={100} step={0.5} value={ps.commission_pct || 0}
                              onChange={e => saveLink.mutate({ professionalId: selectedProf.id, serviceId: ps.service_id, commission: parseFloat(e.target.value) || 0, performs_service: ps.performs_service, price_override: ps.price_override, duration_override: ps.duration_override })}
                              className="h-8 w-16 text-xs text-center" />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => removeLink.mutate(ps.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Profissional</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <Label className="text-sm font-medium">Foto do Profissional</Label>
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {profForm.photo_url ? (
                  <img src={profForm.photo_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl"
                  onClick={async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      try {
                        const result = await db.integrations.Core.UploadFile({ file });
                        setProfForm(f => ({ ...f, photo_url: result.file_url }));
                      } catch (err) {
                        toast.error("Erro ao fazer upload: " + (err.message || err));
                      }
                    };
                    input.click();
                  }}>
                  <Upload className="w-4 h-4 mr-1" /> Escolher Foto
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-xl"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                      const video = document.createElement("video");
                      video.srcObject = stream;
                      video.play();
                      await new Promise(r => setTimeout(r, 2000));
                      const canvas = document.createElement("canvas");
                      canvas.width = video.videoWidth;
                      canvas.height = video.videoHeight;
                      canvas.getContext("2d").drawImage(video, 0, 0);
                      stream.getTracks().forEach(t => t.stop());
                      canvas.toBlob(async (blob) => {
                        if (!blob) return;
                        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                        try {
                          const result = await db.integrations.Core.UploadFile({ file });
                          setProfForm(f => ({ ...f, photo_url: result.file_url }));
                        } catch (err) {
                          toast.error("Erro ao enviar selfie: " + (err.message || err));
                        }
                      }, "image/jpeg", 0.8);
                    } catch {
                      toast.error("Câmera não disponível");
                    }
                  }}>
                  <Camera className="w-4 h-4 mr-1" /> Tirar Selfie
                </Button>
              </div>
            </div>

            {/* Nome */}
            <div>
              <Label className="text-sm font-medium">Nome Completo <span className="text-red-500">*</span></Label>
              <Input value={profForm.name} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do profissional" className="mt-1" />
            </div>

            {/* Telefone + Comissão */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Telefone</Label>
                <Input value={profForm.phone} onChange={e => setProfForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Comissão (%)</Label>
                <Input type="number" min={0} max={100} value={profForm.commission_pct || 0} onChange={e => setProfForm(f => ({ ...f, commission_pct: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-sm font-medium">E-mail</Label>
              <Input type="email" value={profForm.email} disabled className="mt-1" />
            </div>

            {/* Especialidade */}
            <div>
              <Label className="text-sm font-medium">Especialidade</Label>
              <Input value={profForm.specialty} onChange={e => setProfForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ex: Cortes modernos, Barbas" className="mt-1" />
            </div>

            {/* Dias de Trabalho */}
            <div>
              <Label className="text-sm font-medium">Dias de Trabalho</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                {WORK_DAYS.map(day => (
                  <label key={day.key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={(profForm.work_days || []).includes(day.key)}
                      onCheckedChange={(checked) => {
                        setProfForm(f => ({
                          ...f,
                          work_days: checked
                            ? [...(f.work_days || []), day.key]
                            : (f.work_days || []).filter(d => d !== day.key),
                        }));
                      }}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: "var(--border, #e5e7eb)" }}>
              <div>
                <p className="text-sm font-medium">Profissional Ativo</p>
                <p className="text-xs text-gray-500">Disponível para agendamento</p>
              </div>
              <Switch checked={profForm.active} onCheckedChange={v => setProfForm(f => ({ ...f, active: v }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSaveProf} className="bg-branding-primary text-white rounded-xl">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingProf} onOpenChange={() => setDeletingProf(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Excluir profissional?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">"{deletingProf?.full_name}" será removido permanentemente.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeletingProf(null)}>Cancelar</Button>
            <Button onClick={() => deleteProf.mutate(deletingProf.id)} className="bg-red-600 text-white hover:bg-red-700">Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
