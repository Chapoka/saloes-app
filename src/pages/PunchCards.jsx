import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore } from "date-fns";

const EMPTY_FORM = {
  customer_id: "",
  service_id: "",
  total_services: 10,
  price_paid: 0,
  name: "Punch Card",
  notes: "",
  expires_at: "",
};

export default function PunchCards() {
  const queryClient = useQueryClient();
  const theme = useThemeMode();
  const { companyId, isSuperAdmin, isAdmin, ready } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [deletingCard, setDeletingCard] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const effectiveCompanyId = companyId;

  const { data: allCards = [], isLoading } = useQuery({
    queryKey: ["punch_cards", effectiveCompanyId],
    queryFn: () => db.entities.PunchCard.list("-created_at"),
    enabled: ready,
  });

  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => db.entities.Customer.list(),
    enabled: ready,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ["services", effectiveCompanyId],
    queryFn: () => db.entities.Service.list(),
    enabled: ready,
  });

  const cards = effectiveCompanyId
    ? allCards.filter(c => c.company_id === effectiveCompanyId)
    : allCards;

  const customers = effectiveCompanyId
    ? allCustomers.filter(s => {
        const sIds = s.company_ids?.length ? s.company_ids : (s.company_id ? [s.company_id] : []);
        return sIds.includes(effectiveCompanyId);
      })
    : allCustomers;

  const services = effectiveCompanyId
    ? allServices.filter(s => s.company_id === effectiveCompanyId)
    : allServices;

  const now = new Date();

  const filteredCards = cards.filter(card => {
    const matchSearch = !search ||
      card.name?.toLowerCase().includes(search.toLowerCase()) ||
      card.customer_name?.toLowerCase().includes(search.toLowerCase());

    let matchStatus = true;
    if (filterStatus === "active") {
      matchStatus = card.active !== false && card.used_services < card.total_services
        && (!card.expires_at || isAfter(parseISO(card.expires_at), now));
    } else if (filterStatus === "used") {
      matchStatus = card.used_services >= card.total_services;
    } else if (filterStatus === "expired") {
      matchStatus = card.expires_at && isBefore(parseISO(card.expires_at), now)
        && card.used_services < card.total_services;
    } else if (filterStatus === "all") {
      matchStatus = true;
    }

    return matchSearch && matchStatus;
  });

  const createCard = useMutation({
    mutationFn: (data) => {
      const service = services.find(s => s.id === data.service_id);
      return db.entities.PunchCard.create({
        ...data,
        company_id: effectiveCompanyId,
        price_per_service: data.total_services > 0 ? data.price_paid / data.total_services : 0,
        service_category: service?.category || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["punch_cards"]);
      toast.success("Punch card criado!");
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error("Erro ao criar: " + err.message),
  });

  const updateCard = useMutation({
    mutationFn: ({ id, ...data }) => db.entities.PunchCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["punch_cards"]);
      toast.success("Punch card atualizado!");
      setShowForm(false);
      setEditingCard(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteCard = useMutation({
    mutationFn: (id) => db.entities.PunchCard.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["punch_cards"]);
      toast.success("Punch card removido!");
      setDeletingCard(null);
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const handleSave = () => {
    if (!form.customer_id) return toast.error("Selecione o cliente");
    if (form.total_services < 1) return toast.error("Mínimo 1 serviço");
    if (form.price_paid < 0) return toast.error("Valor não pode ser negativo");

    if (editingCard) {
      updateCard.mutate({ id: editingCard.id, ...form });
    } else {
      createCard.mutate(form);
    }
  };

  const openEdit = (card) => {
    setEditingCard(card);
    setForm({
      customer_id: card.customer_id || "",
      service_id: card.service_id || "",
      total_services: card.total_services || 10,
      price_paid: card.price_paid || 0,
      name: card.name || "Punch Card",
      notes: card.notes || "",
      expires_at: card.expires_at || "",
    });
    setShowForm(true);
  };

  const getCustomerName = (customerId) => {
    const s = allCustomers.find(st => st.id === customerId);
    return s?.name || "Cliente";
  };

  const getServiceName = (serviceId) => {
    const s = services.find(sv => sv.id === serviceId);
    return s?.name || "Todos os serviços";
  };

  const totalActive = cards.filter(c => c.active !== false && c.used_services < c.total_services).length;
  const totalRemaining = cards.reduce((sum, c) => {
    if (c.active === false || c.used_services >= c.total_services) return sum;
    if (c.expires_at && isBefore(parseISO(c.expires_at), now)) return sum;
    return sum + (c.total_services - c.used_services);
  }, 0);

  return (
    <div className={cn("max-w-6xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.cardText }}>Punch Cards</h1>
          <p className="text-sm mt-1" style={{ color: theme.mutedText }}>Gerencie os cartões pré-pagos dos seus clientes</p>
        </div>
        <Button
          onClick={() => { setEditingCard(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="bg-branding-primary text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Punch Card
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-branding-primary" />
            <span className="text-xs" style={{ color: theme.mutedText }}>Ativos</span>
          </div>
          <span className="text-xl font-bold" style={{ color: theme.cardText }}>{totalActive}</span>
        </div>
        <div className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs" style={{ color: theme.mutedText }}>Serviços Restantes</span>
          </div>
          <span className="text-xl font-bold" style={{ color: theme.cardText }}>{totalRemaining}</span>
        </div>
        <div className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs" style={{ color: theme.mutedText }}>Total Vendidos</span>
          </div>
          <span className="text-xl font-bold" style={{ color: theme.cardText }}>
            R$ {cards.reduce((sum, c) => sum + (Number(c.price_paid) || 0), 0).toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscar por nome ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="used">Usados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">Nenhum punch card encontrado</p>
          <Button
            onClick={() => { setEditingCard(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="mt-4 bg-branding-primary text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro punch card
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCards.map(card => {
            const remaining = card.total_services - card.used_services;
            const progress = card.total_services > 0 ? (card.used_services / card.total_services) * 100 : 0;
            const isExpired = card.expires_at && isBefore(parseISO(card.expires_at), now);
            const isUsed = remaining <= 0;
            const isActive = card.active !== false && !isUsed && !isExpired;

            return (
              <div
                key={card.id}
                className={cn(
                  "rounded-xl border p-4 transition-all hover:shadow-md",
                  !isActive && "opacity-60"
                )}
                style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                      isActive ? "bg-branding-primary/10 text-branding-primary" :
                      isUsed ? "bg-emerald-100 text-emerald-600" :
                      "bg-amber-100 text-amber-600"
                    )}>
                      {isUsed ? <CheckCircle className="w-5 h-5" /> :
                       isExpired ? <AlertTriangle className="w-5 h-5" /> :
                       <CreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{card.name}</h3>
                      <p className="text-xs text-gray-500">
                        {card.customer_name || getCustomerName(card.customer_id)}
                        {card.service_id && ` • ${getServiceName(card.service_id)}`}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(card)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeletingCard(card)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{card.used_services} usado(s) de {card.total_services}</span>
                    <span>{remaining} restante(s)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isUsed ? "bg-emerald-500" :
                        isExpired ? "bg-amber-500" :
                        "bg-branding-primary"
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>R$ {Number(card.price_paid || 0).toFixed(2).replace(".", ",")}</span>
                    {card.total_services > 0 && (
                      <span className="text-gray-500">
                        (R$ {(Number(card.price_paid || 0) / card.total_services).toFixed(2).replace(".", ",")}/serviço)
                      </span>
                    )}
                  </div>
                  {card.expires_at && (
                    <span className={cn(
                      "flex items-center gap-1",
                      isExpired ? "text-amber-600 font-medium" : ""
                    )}>
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(card.expires_at), "dd/MM/yyyy")}
                      {isExpired && " (expirado)"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORM MODAL */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Editar Punch Card" : "Novo Punch Card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Punch Card *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: 10 Cortes"
              />
            </div>
            <div>
              <Label>Cliente *</Label>
              <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serviço (opcional)</Label>
              <Select value={form.service_id || "all"} onValueChange={v => setForm(f => ({ ...f, service_id: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Todos os serviços" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {services.filter(s => s.active !== false).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — R$ {Number(s.price || 0).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total de Serviços *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.total_services}
                  onChange={e => setForm(f => ({ ...f, total_services: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Valor Pago (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.price_paid}
                  onChange={e => setForm(f => ({ ...f, price_paid: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            {form.total_services > 0 && form.price_paid > 0 && (
              <div className="bg-branding-primary/5 rounded-lg p-2 text-xs text-branding-primary">
                Valor por serviço: R$ {(form.price_paid / form.total_services).toFixed(2).replace(".", ",")}
              </div>
            )}
            <div>
              <Label>Data de Expiração (opcional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observações (opcional)"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-branding-primary text-white">
                {editingCard ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deletingCard} onOpenChange={() => setDeletingCard(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir punch card?</AlertDialogTitle>
            <AlertDialogDescription>
              O punch card "{deletingCard?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCard.mutate(deletingCard.id)}
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
