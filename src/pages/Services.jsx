import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  Scissors,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  MoreVertical,
  Search,
  Package,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const CATEGORIES = [
  { value: "corte", label: "Corte", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "barba", label: "Barba", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "coloracao", label: "Coloração", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "tratamento", label: "Tratamento", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "manicure", label: "Manicure/Pedicure", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "sobrancelha", label: "Sobrancelha", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "outro", label: "Outro", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const getCategoryInfo = (cat) => {
  const found = CATEGORIES.find(c => c.value === cat || c.label === cat);
  return found || { value: cat, label: cat, color: "bg-gray-100 text-gray-700 border-gray-200" };
};

  const EMPTY_SERVICE = {
    type: "service",
    service_type: "Normal",
    name: "",
    category: "Corte",
    duration_mins: 30,
    price: 0,
    preco_custo: 0,
    description: "",
    active: true,
    unidade_medida: "unidade",
    quantidade_estoque: 0,
    desconto: 0,
    comissao: 0,
    _customCategory: false,
  };

const EMPTY_COMBO = {
  name: "",
  combo_price: 0,
  description: "",
  selected_services: [],
};

export default function Services() {
  const queryClient = useQueryClient();
  const theme = useThemeMode();
  const { companyId, isSuperAdmin, isAdmin, ready } = useCurrentUser();

  const [tab, setTab] = useState("services");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterServiceType, setFilterServiceType] = useState("all");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);
  const [showComboForm, setShowComboForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [deletingCombo, setDeletingCombo] = useState(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [comboForm, setComboForm] = useState(EMPTY_COMBO);

  const effectiveCompanyId = companyId;

  const { data: allServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services", effectiveCompanyId],
    queryFn: () => db.entities.Service.list("-created_at"),
    enabled: ready,
  });

  const { data: allCombos = [], isLoading: loadingCombos } = useQuery({
    queryKey: ["service_combos", effectiveCompanyId],
    queryFn: () => db.entities.ServiceCombo.list("-created_at"),
    enabled: ready,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => db.entities.Plan.list(),
    enabled: ready,
  });

  const { data: planServices = [] } = useQuery({
    queryKey: ["plan_services"],
    queryFn: () => db.entities.PlanService.list(),
    enabled: ready,
  });

  const services = effectiveCompanyId
    ? allServices.filter(s => s.company_id === effectiveCompanyId)
    : allServices;

  const combos = effectiveCompanyId
    ? allCombos.filter(c => c.company_id === effectiveCompanyId)
    : allCombos;

  const filteredServices = services.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || s.category === filterCategory;
    const matchServiceType = filterServiceType === "all" || s.service_type === filterServiceType;
    return matchSearch && matchCategory && matchServiceType;
  });

  const createService = useMutation({
    mutationFn: (data) => db.entities.Service.create({ ...data, company_id: effectiveCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["services"]);
      toast.success("Serviço criado!");
      setShowServiceForm(false);
      setServiceForm(EMPTY_SERVICE);
    },
    onError: (err) => toast.error("Erro ao criar serviço: " + err.message),
  });

  const updateService = useMutation({
    mutationFn: ({ id, ...data }) => db.entities.Service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["services"]);
      toast.success("Serviço atualizado!");
      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm(EMPTY_SERVICE);
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  const toggleServiceActive = useMutation({
    mutationFn: ({ id, active }) => db.entities.Service.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries(["services"]),
  });

  const deleteService = useMutation({
    mutationFn: (id) => db.entities.Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["services"]);
      toast.success("Serviço removido!");
      setDeletingService(null);
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const createCombo = useMutation({
    mutationFn: async (data) => {
      const { selected_services, ...comboData } = data;
      const combo = await db.entities.ServiceCombo.create({
        ...comboData,
        company_id: effectiveCompanyId,
      });
      if (selected_services?.length) {
        for (const svcId of selected_services) {
          await db.entities.ServiceComboItem.create({
            combo_id: combo.id,
            service_id: svcId,
            quantity: 1,
          });
        }
      }
      return combo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["service_combos"]);
      queryClient.invalidateQueries(["service_combo_items"]);
      toast.success("Combo criado!");
      setShowComboForm(false);
      setComboForm(EMPTY_COMBO);
    },
    onError: (err) => toast.error("Erro ao criar combo: " + err.message),
  });

  const updateCombo = useMutation({
    mutationFn: async ({ id, data }) => {
      const { selected_services, ...comboData } = data;
      await db.entities.ServiceCombo.update(id, comboData);
      // Replace combo items
      const existingItems = allComboItems.filter(ci => ci.combo_id === id);
      for (const item of existingItems) {
        await db.entities.ServiceComboItem.delete(item.id);
      }
      if (selected_services?.length) {
        for (const svcId of selected_services) {
          await db.entities.ServiceComboItem.create({
            combo_id: id,
            service_id: svcId,
            quantity: 1,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["service_combos"]);
      queryClient.invalidateQueries(["service_combo_items"]);
      toast.success("Combo atualizado!");
      setShowComboForm(false);
      setEditingCombo(null);
      setComboForm(EMPTY_COMBO);
    },
    onError: (err) => toast.error("Erro ao atualizar combo: " + err.message),
  });

  const { data: allComboItems = [] } = useQuery({
    queryKey: ["service_combo_items"],
    queryFn: () => db.entities.ServiceComboItem.list(),
    enabled: ready,
  });

  const deleteCombo = useMutation({
    mutationFn: async (id) => {
      // Delete combo items first
      const items = allComboItems.filter(ci => ci.combo_id === id);
      for (const item of items) {
        await db.entities.ServiceComboItem.delete(item.id);
      }
      return db.entities.ServiceCombo.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["service_combos"]);
      toast.success("Combo removido!");
      setDeletingCombo(null);
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const handleSaveService = () => {
    if (!serviceForm.name) return toast.error("Nome é obrigatório");
    if (serviceForm.type === "service" && serviceForm.duration_mins < 5) return toast.error("Duração mínima: 5 min");
    if (serviceForm.type === "product" && serviceForm.quantidade_estoque < 0) return toast.error("Estoque não pode ser negativo");
    if (serviceForm.price < 0) return toast.error("Preço não pode ser negativo");
    if (serviceForm.preco_custo < 0) return toast.error("Preço de custo não pode ser negativo");
    if (!serviceForm.category) return toast.error("Categoria é obrigatória");

    const { _customCategory, ...dataToSend } = serviceForm;

    if (editingService) {
      updateService.mutate({ id: editingService.id, ...dataToSend });
    } else {
      createService.mutate(dataToSend);
    }
  };

  const handleSaveCombo = () => {
    if (!comboForm.name) return toast.error("Nome do combo é obrigatório");
    if (comboForm.selected_services.length < 2) return toast.error("Selecione pelo menos 2 serviços");
    if (comboForm.combo_price <= 0) return toast.error("Preço do combo deve ser maior que 0");
    if (editingCombo) {
      updateCombo.mutate({ id: editingCombo.id, data: comboForm });
    } else {
      createCombo.mutate(comboForm);
    }
  };

  const openEditCombo = (combo) => {
    setEditingCombo(combo);
    const items = allComboItems.filter(ci => ci.combo_id === combo.id).map(ci => ci.service_id);
    setComboForm({
      name: combo.name || "",
      combo_price: combo.combo_price || 0,
      description: combo.description || "",
      selected_services: items,
    });
    setShowComboForm(true);
  };

  const openEditService = (svc) => {
    setEditingService(svc);
    const isCustom = svc.category && !CATEGORIES.some(c => c.label === svc.category);
    setServiceForm({
      type: svc.type || "service",
      service_type: svc.service_type || "Normal",
      name: svc.name || "",
      category: svc.category || "Corte",
      duration_mins: svc.duration_mins || 30,
      price: svc.price || 0,
      preco_custo: svc.preco_custo || 0,
      description: svc.description || "",
      active: svc.active !== false,
      unidade_medida: svc.unidade_medida || "unidade",
      quantidade_estoque: svc.quantidade_estoque || 0,
      desconto: svc.desconto || 0,
      comissao: svc.comissao || 0,
      _customCategory: isCustom,
    });
    setShowServiceForm(true);
  };

  const totalRevenue = filteredServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const avgPrice = filteredServices.length ? (totalRevenue / filteredServices.length).toFixed(2) : "0.00";
  const servicesWithCost = filteredServices.filter(s => s.preco_custo > 0 && s.price > 0);
  const avgMargin = servicesWithCost.length
    ? (servicesWithCost.reduce((sum, s) => sum + ((s.price - s.preco_custo) / s.price * 100), 0) / servicesWithCost.length).toFixed(0)
    : "-";

  return (
    <div className={cn("max-w-6xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.cardText }}>Catálogo de Produtos e Serviços</h1>
          <p className="text-sm mt-1" style={{ color: theme.mutedText }}>Gerencie os produtos e serviços oferecidos pelo seu salão</p>
        </div>
        <Button
          onClick={() => { setEditingService(null); setServiceForm(EMPTY_SERVICE); setShowServiceForm(true); }}
          className="bg-branding-primary text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
Novo Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Serviços Ativos", value: services.filter(s => s.active !== false).length, icon: Scissors, color: "text-blue-600" },
          { label: "Inativos", value: services.filter(s => s.active === false).length, icon: PowerOff, color: "text-gray-500" },
          { label: "Preço Médio", value: `R$ ${avgPrice}`, icon: DollarSign, color: "text-emerald-600" },
          { label: "Margem Média", value: avgMargin !== "-" ? `${avgMargin}%` : "-", icon: DollarSign, color: "text-blue-600" },
          { label: "Vinculados a Planos", value: [...new Set(planServices.map(ps => ps.service_id))].length, icon: Package, color: "text-purple-600" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              <span className="text-xs" style={{ color: theme.mutedText }}>{stat.label}</span>
            </div>
            <span className="text-xl font-bold" style={{ color: theme.cardText }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit" style={{ background: theme.isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6" }}>
        {[
          { key: "services", label: "Serviços" },
          { key: "combos", label: "Combos" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SERVICES TAB */}
      {tab === "services" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Buscar serviço..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
                {[...new Set(services.map(s => s.category).filter(c => c && !CATEGORIES.some(pre => pre.value === c || pre.label === c)))].map(customCat => (
                  <SelectItem key={customCat} value={customCat}>{customCat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterServiceType} onValueChange={setFilterServiceType}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Pacote de serviço">Pacote de serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Service Cards */}
          {loadingServices ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-12 h-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-500">Nenhum serviço encontrado</p>
              <Button
                onClick={() => { setEditingService(null); setServiceForm(EMPTY_SERVICE); setShowServiceForm(true); }}
                className="mt-4 bg-branding-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Criar primeiro serviço
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(svc => {
                const cat = getCategoryInfo(svc.category);
                return (
                  <div
                    key={svc.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all hover:shadow-md",
                      svc.active === false ? "opacity-60" : ""
                    )}
                    style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-branding-primary/10 flex items-center justify-center">
                          {svc.type === "product" ? (
                            <Package className="w-5 h-5 text-branding-primary" />
                          ) : (
                            <Scissors className="w-5 h-5 text-branding-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{svc.name}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
                              {cat.label}
                            </Badge>
                            {svc.service_type === "Pacote de serviço" && (
                              <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                                Pacote
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditService(svc)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleServiceActive.mutate({ id: svc.id, active: svc.active === false })}
                          >
                            {svc.active === false ? (
                              <><Power className="w-4 h-4 mr-2" /> Ativar</>
                            ) : (
                              <><PowerOff className="w-4 h-4 mr-2" /> Desativar</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingService(svc)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {svc.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{svc.description}</p>
                    )}

                    {(() => {
                      const linkedPlans = planServices
                        .filter(ps => ps.service_id === svc.id)
                        .map(ps => plans.find(p => p.id === ps.plan_id))
                        .filter(Boolean);
                      if (linkedPlans.length === 0) return null;
                      return (
                        <div className="mb-3 pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                            <Package className="w-3.5 h-3.5" />
                            Planos vinculados
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {linkedPlans.map(plan => (
                              <span key={plan.id} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200">{plan.name}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      {svc.type === "product" ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Package className="w-3.5 h-3.5" />
                          Estoque: {svc.quantidade_estoque || 0} {svc.unidade_medida || "un"}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.floor((svc.duration_mins || 0) / 60)}h{(svc.duration_mins || 0) % 60 > 0 ? ` ${(svc.duration_mins || 0) % 60}min` : ""}
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900 block">
                          R$ {Number(svc.price || 0).toFixed(2).replace(".", ",")}
                        </span>
                        {svc.comissao > 0 && (
                          <span className="text-[10px] text-blue-600 block">
                            Comissão: {svc.comissao}%
                          </span>
                        )}
                        {svc.preco_custo > 0 && (
                          <span className="text-[10px] text-gray-500 block">
                            Custo: R$ {Number(svc.preco_custo).toFixed(2).replace(".", ",")}
                            {svc.price > 0 && (
                              <span className={cn("ml-1 font-medium", ((svc.price - svc.preco_custo) / svc.price * 100) >= 50 ? "text-emerald-600" : "text-amber-600")}>
                                ({((svc.price - svc.preco_custo) / svc.price * 100).toFixed(0)}% margem)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMBOS TAB */}
      {tab === "combos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditingCombo(null); setComboForm(EMPTY_COMBO); setShowComboForm(true); }}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Combo
            </Button>
          </div>

          {loadingCombos ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : combos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-500">Nenhum combo criado</p>
              <p className="text-xs text-gray-500 mt-1">Combine serviços e ofereça um preço especial</p>
            </div>
          ) : (
            <div className="space-y-3">
              {combos.map(combo => (
                <div key={combo.id} className="rounded-xl border p-4 transition-all hover:shadow-md" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{combo.name}</h3>
                        {combo.description && <p className="text-xs text-gray-500">{combo.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-purple-600">
                        R$ {Number(combo.combo_price || 0).toFixed(2).replace(".", ",")}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-lg hover:bg-gray-100">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditCombo(combo)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingCombo(combo)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SERVICE FORM MODAL */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingService ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo: Servio ou Produto */}
            <div>
              <Label>Tipo</Label>
              <Select value={serviceForm.type} onValueChange={v => setServiceForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Servio</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {serviceForm.type === "service" && (
              <div>
                <Label>Tipo de Serviço</Label>
                <Select value={serviceForm.service_type} onValueChange={v => setServiceForm(f => ({ ...f, service_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Pacote de serviço">Pacote de serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Nome *</Label>
              <Input
                value={serviceForm.name}
                onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte degradê"
              />
            </div>
            {serviceForm.type === "service" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  {serviceForm._customCategory ? (
                    <div className="flex gap-1.5">
                      <Input
                        value={serviceForm.category}
                        onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="Nome da categoria"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs px-2"
                        onClick={() => setServiceForm(f => ({ ...f, _customCategory: false }))}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={CATEGORIES.some(c => c.label === serviceForm.category) ? serviceForm.category : ""}
                      onValueChange={v => {
                        if (v === "__new__") {
                          setServiceForm(f => ({ ...f, category: "", _customCategory: true }));
                        } else {
                          setServiceForm(f => ({ ...f, category: v }));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>
                        ))}
                        <SelectItem value="__new__">
                          <span className="flex items-center gap-1.5"><Plus className="w-3 h-3" /> Criar nova...</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label>Duração (min) *</Label>
                  <Input type="number" min={5} step={5} value={serviceForm.duration_mins} onChange={e => setServiceForm(f => ({ ...f, duration_mins: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            )}
            {serviceForm.type === "product" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Unidade de Medida *</Label>
                    <Select value={serviceForm.unidade_medida} onValueChange={v => setServiceForm(f => ({ ...f, unidade_medida: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidade">Unidade</SelectItem>
                        <SelectItem value="L">Litro (L)</SelectItem>
                        <SelectItem value="ml">Mililitro (ml)</SelectItem>
                        <SelectItem value="kg">Quilograma (kg)</SelectItem>
                        <SelectItem value="g">Grama (g)</SelectItem>
                        <SelectItem value="caixa">Caixa</SelectItem>
                        <SelectItem value="peca">Peça</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estoque *</Label>
                    <Input type="number" min={0} value={serviceForm.quantidade_estoque} onChange={e => setServiceForm(f => ({ ...f, quantidade_estoque: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desconto (%)</Label>
                <Input type="number" min={0} max={100} step={0.5} value={serviceForm.desconto} onChange={e => setServiceForm(f => ({ ...f, desconto: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input type="number" min={0} max={100} step={0.5} value={serviceForm.comissao} onChange={e => setServiceForm(f => ({ ...f, comissao: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço de Custo (R$)</Label>
                <Input type="number" min={0} step={0.5} value={serviceForm.preco_custo} onChange={e => setServiceForm(f => ({ ...f, preco_custo: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Preço de Venda (R$) *</Label>
                <Input type="number" min={0} step={0.5} value={serviceForm.price} onChange={e => setServiceForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do item (opcional)" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={serviceForm.active} onCheckedChange={v => setServiceForm(f => ({ ...f, active: v }))} />
              <Label className="text-sm">Ativo</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowServiceForm(false)}>Cancelar</Button>
              <Button onClick={handleSaveService} className="bg-branding-primary text-white">
                {editingService ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* COMBO FORM MODAL */}
      <Dialog open={showComboForm} onOpenChange={setShowComboForm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCombo ? "Editar Combo" : "Novo Combo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Combo *</Label>
              <Input
                value={comboForm.name}
                onChange={e => setComboForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte + Barba"
              />
            </div>
            <div>
              <Label>Preço do Combo (R$) *</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={comboForm.combo_price}
                onChange={e => setComboForm(f => ({ ...f, combo_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Serviços Incluídos (mín. 2)</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {services.filter(s => s.active !== false).map(svc => (
                  <label key={svc.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comboForm.selected_services.includes(svc.id)}
                      onChange={e => {
                        setComboForm(f => ({
                          ...f,
                          selected_services: e.target.checked
                            ? [...f.selected_services, svc.id]
                            : f.selected_services.filter(id => id !== svc.id),
                        }));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{svc.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      R$ {Number(svc.price || 0).toFixed(2).replace(".", ",")}
                    </span>
                  </label>
                ))}
                {services.filter(s => s.active !== false).length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">Crie serviços primeiro</p>
                )}
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={comboForm.description}
                onChange={e => setComboForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição do combo (opcional)"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowComboForm(false)}>Cancelar</Button>
              <Button onClick={handleSaveCombo} className="bg-purple-600 text-white hover:bg-purple-700">
                {editingCombo ? "Salvar" : "Criar Combo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE SERVICE DIALOG */}
      <AlertDialog open={!!deletingService} onOpenChange={() => setDeletingService(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              O serviço "{deletingService?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteService.mutate(deletingService.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE COMBO DIALOG */}
      <AlertDialog open={!!deletingCombo} onOpenChange={() => setDeletingCombo(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir combo?</AlertDialogTitle>
            <AlertDialogDescription>
              O combo "{deletingCombo?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCombo.mutate(deletingCombo.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
