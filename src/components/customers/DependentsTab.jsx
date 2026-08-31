import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Edit, Trash2, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
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
import CustomerForm from "@/components/customers/CustomerForm";

export default function DependentsTab({ guardian, plans, companies }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDependent, setEditingDependent] = useState(null);
  const [deletingDependent, setDeletingDependent] = useState(null);

  const { data: dependents = [], isLoading } = useQuery({
    queryKey: ["dependents", guardian.id],
    queryFn: () => db.entities.Student.filter({ guardian_id: guardian.id }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const accessToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      let credits = 0;
      if (data.custom_plan) {
        credits = data.custom_plan.total_services || 0;
      } else if (data.plan_id) {
        const plan = plans.find((p) => p.id === data.plan_id);
        credits = plan?.session_count || 0;
      }
      return db.entities.Student.create({
        ...data,
        guardian_id: guardian.id,
        company_id: guardian.company_id,
        access_token: accessToken,
        current_credits: credits,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents", guardian.id] });
      setShowForm(false);
      toast.success("Dependente cadastrado com sucesso!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Student.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents", guardian.id] });
      setEditingDependent(null);
      setShowForm(false);
      toast.success("Dependente atualizado com sucesso!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Student.update(id, { status: "inactive" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents", guardian.id] });
      setDeletingDependent(null);
      toast.success("Dependente inativado com sucesso!");
    },
  });

  const handleSubmit = (data) => {
    if (editingDependent) {
      updateMutation.mutate({ id: editingDependent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPlanName = (customer) => {
    if (customer.custom_plan) return "Plano Personalizado";
    const plan = plans.find((p) => p.id === customer.plan_id);
    return plan?.name || "Sem plano";
  };

  if (showForm) {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={() => { setShowForm(false); setEditingDependent(null); }}
          className="mb-4"
        >
          ← Voltar para Dependentes
        </Button>
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          {editingDependent ? "Editar Dependente" : "Novo Dependente"}
        </h3>
        <CustomerForm
          customer={editingDependent}
          plans={plans}
          companies={companies}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingDependent(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
          isTeacher={false}
          guardianMode={true}
          guardianName={guardian.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          Dependentes vinculados a <strong>{guardian.name}</strong>
        </p>
        <Button
          onClick={() => setShowForm(true)}
          className="btn-branding rounded-xl"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar Dependente
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      ) : dependents.length === 0 ? (
        <div className="text-center py-10 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
          <Users className="w-10 h-10 text-on-surface-variant mx-auto mb-3" />
          <p className="text-on-surface-variant font-medium">Nenhum dependente cadastrado</p>
          <p className="text-sm text-on-surface-variant mt-1">Clique em "Adicionar Dependente" para vincular</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dependents.map((dep) => (
            <div
              key={dep.id}
              className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {dep.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{dep.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-on-surface-variant">{getPlanName(dep)}</span>
                    <span className="text-xs text-on-surface-variant">•</span>
                    <Badge
                      className={cn(
                        "text-xs",
                        dep.billing_mode === "consolidated"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                      )}
                    >
                      {dep.billing_mode === "consolidated" ? "💳 Cobrança no responsável" : "💳 Cobrança individual"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm">
                  <CreditCard className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span className={cn("font-medium", (dep.current_credits || 0) <= 1 ? "text-red-400" : "text-emerald-400")}>
                    {dep.current_credits || 0} serviço(s)
                  </span>
                </div>
                <Link to={createPageUrl(`CustomerDetail?id=${dep.id}`)}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setEditingDependent(dep); setShowForm(true); }}
                >
                  <Edit className="w-4 h-4 text-on-surface-variant" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeletingDependent(dep)}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingDependent} onOpenChange={() => setDeletingDependent(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar dependente?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingDependent?.name}</strong> será movido para inativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingDependent.id)}
              className="bg-orange-600 hover:bg-orange-700 rounded-xl"
            >
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
