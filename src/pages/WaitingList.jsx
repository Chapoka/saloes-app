import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { formatPhone } from "@/utils/formatters";
import { 
  ListOrdered, 
  Plus, 
  Search,
  MessageCircle,
  Calendar,
  Filter,
  UserPlus,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WaitingList() {
  const queryClient = useQueryClient();
  const { companyId, isProfissional, isSuperAdmin } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    whatsapp: "",
    modality: "corte",
    duration_mins: 60,
    preferred_days: [],
    priority: "normal",
    notes: "",
    company_id: companyId || null,
  });

  const { data: waitingList = [], isLoading } = useQuery({
    queryKey: ["waiting_list", companyId, isProfissional],
    queryFn: async () => {
      const all = await (db.entities.WaitingList?.list("-created_at") || Promise.resolve([]));
      if (isProfissional && companyId && !isSuperAdmin) return all.filter(i => i.company_id === companyId);
      return all;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", companyId, isProfissional],
    queryFn: () => isProfissional && companyId && !isSuperAdmin
      ? db.entities.Customer.filter({ status: "active", company_id: companyId })
      : db.entities.Customer.filter({ status: "active" }),
  });

  /** @type {import("@tanstack/react-query").UseMutationOptions<unknown, unknown, typeof formData>} */
  const createMutation = useMutation({
    mutationFn: async (data) => db.entities.WaitingList.create({ ...data, company_id: companyId || data?.company_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting_list"] });
      setShowAddModal(false);
      setFormData({
        customer_name: "",
        whatsapp: "",
        modality: "corte",
        duration_mins: 60,
        preferred_days: [],
        priority: "normal",
        notes: "",
        company_id: companyId || null,
      });
      toast.success("Cliente adicionado à fila!");
    },
  });

  /** @type {import("@tanstack/react-query").UseMutationOptions<boolean, unknown, string>} */
  const removeMutation = useMutation({
    mutationFn: async (id) => db.entities.WaitingList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting_list"] });
      toast.success("Removido da fila!");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDayToggle = (dayIndex) => {
    const current = formData.preferred_days || [];
    if (current.includes(dayIndex)) {
      setFormData({ ...formData, preferred_days: current.filter(d => d !== dayIndex) });
    } else {
      setFormData({ ...formData, preferred_days: [...current, dayIndex] });
    }
  };

  const filteredList = waitingList.filter(item => {
    const matchesSearch = item.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesModality = modalityFilter === "all" || item.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-branding-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-branding-primary to-branding-secondary">
                <ListOrdered className="w-6 h-6 text-white" />
              </div>
              Fila de Espera
            </h1>
            <p className="text-muted-foreground mt-1">{filteredList.length} pessoa(s) aguardando vaga</p>
          </div>
          
          <Button
            onClick={() => setShowAddModal(true)}
            className="btn-branding rounded-xl shadow-lg shadow-branding-primary/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar à Fila
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-outline-variant"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="rounded-xl">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo de Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="corte">Corte</SelectItem>
                  <SelectItem value="barba">Barba</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Waiting List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl p-6 animate-pulse h-32" />
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-12 text-center">
            <ListOrdered className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2">Fila vazia</h3>
            <p className="text-muted-foreground mb-6">Nenhum cliente aguardando vaga no momento</p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="btn-branding rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Primeiro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((item, index) => (
              <div 
                key={item.id}
                className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center text-white font-bold text-lg">
                        {index + 1}
                      </div>
                      {item.priority === "urgent" && (
                        <Badge className="mt-2 bg-red-100 text-red-700 text-xs">
                          Urgente
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-on-surface">{item.customer_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge                         className={cn(
                          "border",
                          item.modality === "corte" 
                            ? "bg-branding-primary/10 text-branding-primary border-branding-primary/20" 
                            : "bg-branding-secondary/10 text-branding-secondary border-branding-secondary/20"
                        )}>
                          {item.modality === "corte" ? "Corte" : "Barba"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.duration_mins}min
                        </Badge>
                        {item.whatsapp && (
                          <span className="text-sm text-on-surface-variant flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {item.whatsapp}
                          </span>
                        )}
                      </div>
                      
                      {item.preferred_days && item.preferred_days.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div className="flex gap-1">
                            {daysOfWeek.map((day, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold",
                                  item.preferred_days.includes(idx)
                                    ? "bg-branding-primary text-white"
                                    : "bg-surface-container-low text-muted-foreground"
                                )}
                              >
                                {day.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-sm text-on-surface-variant mb-4 bg-background p-3 rounded-lg">
                    {item.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    className="btn-branding rounded-lg"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Ativar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeMutation.mutate(item.id)}
                    className="rounded-lg ml-auto"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar à Fila de Espera</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Digite o nome"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                  placeholder="(11) 99999-9999"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Serviço</Label>
                  <Select 
                    value={formData.modality} 
                    onValueChange={(v) => setFormData({ ...formData, modality: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corte">Corte</SelectItem>
                      <SelectItem value="barba">Barba</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duração</Label>
                  <Select 
                    value={formData.duration_mins.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, duration_mins: parseInt(v) })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias Preferidos</Label>
                <div className="flex gap-2">
                  {daysOfWeek.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDayToggle(idx)}
                      className={cn(
                        "flex-1 h-10 rounded-lg text-xs font-bold transition-all",
                        formData.preferred_days?.includes(idx)
                          ? "bg-branding-primary text-white"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      )}
                    >
                      {day.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="flexible">Flexível</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl btn-branding"
                >
                  {createMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}