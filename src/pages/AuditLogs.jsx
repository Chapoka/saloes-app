import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  Search,
  Filter,
  User,
  Calendar,
  CheckCircle,
  Edit,
  Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const actionIcons = {
  create: CheckCircle,
  update: Edit,
  delete: Trash2,
};

const actionColors = {
  create: "text-emerald-400 bg-emerald-500/10",
  update: "text-branding-primary bg-branding-primary/10",
  delete: "text-red-400 bg-red-500/10",
};

const categoryColors = {
  financial: "bg-emerald-500/20 text-emerald-300",
  schedule: "bg-branding-primary/20 text-branding-primary",
  customers: "bg-purple-500/20 text-purple-300",
  system: "bg-surface-container-low text-on-surface",
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: () => db.entities.AuditLog?.list("-created_at", 100) || Promise.resolve([]),
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description?.toLowerCase().includes(search.toLowerCase()) ||
                          log.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-branding-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-branding-primary to-branding-secondary">
              <History className="w-6 h-6 text-white" />
            </div>
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground mt-1">Histórico de ações do sistema</p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar ações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-outline-variant"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-xl">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="schedule">Agenda</SelectItem>
                  <SelectItem value="customers">Clientes</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Logs Timeline */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card rounded-2xl p-6 animate-pulse h-24" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-12 text-center">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2">Nenhum log encontrado</h3>
            <p className="text-muted-foreground">As ações do sistema aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const ActionIcon = actionIcons[log.action] || Edit;
              
              return (
                <div 
                  key={log.id}
                  className={cn(
                    "bg-card rounded-2xl shadow-sm border-l-4 p-5 hover:shadow-md transition-all",
                    log.action === "create" ? "border-l-emerald-500" :
                    log.action === "delete" ? "border-l-red-500" : "border-l-branding-primary"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      actionColors[log.action] || "bg-surface-container-low text-on-surface-variant"
                    )}>
                      <ActionIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-on-surface font-medium">
                          {log.description || "Ação no sistema"}
                        </p>
                        <Badge className={cn("text-xs", categoryColors[log.category] || "bg-surface-container-low text-on-surface")}>
                          {log.category === "financial" ? "Financeiro" :
                           log.category === "schedule" ? "Agenda" :
                           log.category === "customers" ? "Clientes" : "Sistema"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.created_by || "Sistema"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}