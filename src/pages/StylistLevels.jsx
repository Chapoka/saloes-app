import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  Award,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  DollarSign,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const LEVEL_PRESETS = [
  { name: "Júnior", slug: "junior", multiplier: 1.0, color: "#60a5fa" },
  { name: "Pleno", slug: "pleno", multiplier: 1.25, color: "#34d399" },
  { name: "Sênior", slug: "senior", multiplier: 1.5, color: "#fbbf24" },
  { name: "Master", slug: "master", multiplier: 2.0, color: "#f472b6" },
  { name: "Premium", slug: "premium", multiplier: 2.5, color: "#a78bfa" },
];

const EMPTY_LEVEL = { name: "", slug: "", multiplier: 1.0, color: "#6366f1" };

export default function StylistLevels() {
  const queryClient = useQueryClient();
  const theme = useThemeMode();
  const { companyId, isSuperAdmin, isAdmin, ready } = useCurrentUser();

  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [deletingLevel, setDeletingLevel] = useState(null);
  const [levelForm, setLevelForm] = useState(EMPTY_LEVEL);

  const effectiveCompanyId = companyId;

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ["stylist_levels", effectiveCompanyId],
    queryFn: () => db.entities.StylistLevel.list("sort_order"),
    enabled: ready,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => db.entities.User.list(),
    enabled: ready,
  });

  const companyLevels = effectiveCompanyId
    ? levels.filter(l => l.company_id === effectiveCompanyId)
    : levels;

  const usersByLevel = {};
  allUsers.forEach(u => {
    if (u.stylist_level_id) {
      usersByLevel[u.stylist_level_id] = (usersByLevel[u.stylist_level_id] || 0) + 1;
    }
  });

  const createLevel = useMutation({
    mutationFn: (data) => db.entities.StylistLevel.create({ ...data, company_id: effectiveCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["stylist_levels"]);
      toast.success("Nível criado!");
      setShowForm(false);
      setLevelForm(EMPTY_LEVEL);
    },
    onError: (err) => toast.error("Erro ao criar nível: " + err.message),
  });

  const updateLevel = useMutation({
    mutationFn: ({ id, ...data }) => db.entities.StylistLevel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["stylist_levels"]);
      toast.success("Nível atualizado!");
      setShowForm(false);
      setEditingLevel(null);
      setLevelForm(EMPTY_LEVEL);
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => db.entities.StylistLevel.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries(["stylist_levels"]),
  });

  const deleteLevel = useMutation({
    mutationFn: (id) => db.entities.StylistLevel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["stylist_levels"]);
      toast.success("Nível removido!");
      setDeletingLevel(null);
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const handleSave = () => {
    if (!levelForm.name) return toast.error("Nome é obrigatório");
    if (levelForm.multiplier < 0.5) return toast.error("Multiplicador mínimo: 0.5x");
    if (levelForm.multiplier > 5) return toast.error("Multiplicador máximo: 5.0x");

    if (editingLevel) {
      updateLevel.mutate({ id: editingLevel.id, ...levelForm });
    } else {
      createLevel.mutate(levelForm);
    }
  };

  const openEdit = (level) => {
    setEditingLevel(level);
    setLevelForm({
      name: level.name || "",
      slug: level.slug || "",
      multiplier: level.multiplier || 1.0,
      color: level.color || "#6366f1",
    });
    setShowForm(true);
  };

  const applyPreset = (preset) => {
    setLevelForm(f => ({
      ...f,
      name: preset.name,
      slug: preset.slug,
      multiplier: preset.multiplier,
      color: preset.color,
    }));
  };

  const activeLevels = companyLevels.filter(l => l.active !== false);
  const maxMultiplier = activeLevels.length
    ? Math.max(...activeLevels.map(l => Number(l.multiplier) || 1))
    : 1;

  return (
    <div className={cn("max-w-4xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.cardText }}>Níveis do Profissional</h1>
          <p className="text-sm mt-1" style={{ color: theme.mutedText }}>Defina níveis de atendimento com multiplicadores de preço</p>
        </div>
        <Button
          onClick={() => { setEditingLevel(null); setLevelForm(EMPTY_LEVEL); setShowForm(true); }}
          className="bg-branding-primary text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Nível
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-branding-primary/5 to-branding-secondary/5 rounded-xl border border-branding-primary/10 p-4">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-branding-primary mt-0.5" />
          <div className="text-sm text-on-surface-variant">
            <p className="font-medium text-on-surface mb-1">Como funciona os níveis</p>
            <p>Cada profissional pode ser vinculado a um nível. O multiplicador do nível é aplicado sobre o preço base do serviço.
            Por exemplo, se um corte custa R$ 50 e o profissional é "Sênior" (1.5x), o cliente paga R$ 75.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-branding-primary" />
            <span className="text-xs" style={{ color: theme.mutedText }}>Níveis Ativos</span>
          </div>
          <span className="text-xl font-bold" style={{ color: theme.cardText }}>{activeLevels.length}</span>
        </div>
        <div className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs" style={{ color: theme.mutedText }}>Maior Multiplicador</span>
          </div>
          <span className="text-xl font-bold" style={{ color: theme.cardText }}>{maxMultiplier.toFixed(1)}x</span>
        </div>
        <div className="rounded-xl border p-4" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs" style={{ color: theme.mutedText }}>Profissionais</span>
          </div>
          <span className="text-xl font-bold" style={{ color: theme.cardText }}>
            {Object.values(usersByLevel).reduce((a, b) => a + b, 0)}
          </span>
        </div>
      </div>

      {/* Level Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-on-surface-variant">Carregando...</div>
      ) : companyLevels.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-12 h-12 mx-auto text-on-surface-variant mb-3" />
          <p className="text-on-surface-variant">Nenhum nível configurado</p>
          <p className="text-xs text-on-surface-variant mt-1">Crie níveis para diferenciar preços por profissional</p>
          <Button
            onClick={() => { setEditingLevel(null); setLevelForm(EMPTY_LEVEL); setShowForm(true); }}
            className="mt-4 bg-branding-primary text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro nível
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {companyLevels.map(level => {
            const userCount = usersByLevel[level.id] || 0;
            const isActive = level.active !== false;
            return (
              <div
                key={level.id}
                className={cn(
                  "rounded-xl border p-4 transition-all hover:shadow-md",
                  !isActive && "opacity-60"
                )}
                style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: level.color || "#6366f1" }}
                    >
                      {level.multiplier ? `${Number(level.multiplier).toFixed(1)}x` : "1.0x"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface">{level.name}</h3>
                      <p className="text-xs text-on-surface-variant">
                        Multiplicador: <span className="font-medium">{Number(level.multiplier || 1).toFixed(2)}x</span>
                        {userCount > 0 && (
                          <span className="ml-2 text-branding-primary">
                            • {userCount} profissional{userCount > 1 ? "éis" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Price preview */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-on-surface-variant mr-2">
                      <span>R$ 50</span>
                      <span>→</span>
                      <span className="font-semibold text-on-surface">
                        R$ {(50 * Number(level.multiplier || 1)).toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => toggleActive.mutate({ id: level.id, active: v })}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-surface-container transition-colors">
                          <MoreVertical className="w-4 h-4 text-on-surface-variant" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(level)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingLevel(level)} className="text-red-400">
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
            <DialogTitle>{editingLevel ? "Editar Nível" : "Novo Nível"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Presets */}
            {!editingLevel && (
              <div>
                <Label className="text-xs text-on-surface-variant mb-2 block">Predefinições rápidas</Label>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_PRESETS.map(preset => (
                    <button
                      key={preset.slug}
                      onClick={() => applyPreset(preset)}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-xs font-medium hover:border-outline-variant/50 transition-colors"
                      style={{ borderLeftColor: preset.color, borderLeftWidth: 3 }}
                    >
                      {preset.name} ({preset.multiplier}x)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Nome *</Label>
              <Input
                value={levelForm.name}
                onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Sênior"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Multiplicador *</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.25}
                  value={levelForm.multiplier}
                  onChange={e => setLevelForm(f => ({ ...f, multiplier: parseFloat(e.target.value) || 1 }))}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                  {levelForm.multiplier >= 1
                    ? `+${((levelForm.multiplier - 1) * 100).toFixed(0)}% sobre o preço base`
                    : `${((1 - levelForm.multiplier) * 100).toFixed(0)}% de desconto`
                  }
                </p>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={levelForm.color}
                    onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={levelForm.color}
                    onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Price preview */}
            <div className="bg-surface-container-low rounded-lg p-3 text-sm">
              <p className="text-on-surface-variant mb-1">Preview de preço (serviço de R$ 50,00):</p>
              <p className="text-xl font-bold text-on-surface">
                R$ {(50 * Number(levelForm.multiplier || 1)).toFixed(2).replace(".", ",")}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-branding-primary text-white">
                {editingLevel ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deletingLevel} onOpenChange={() => setDeletingLevel(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nível?</AlertDialogTitle>
            <AlertDialogDescription>
              O nível "{deletingLevel?.name}" será removido.
              {usersByLevel[deletingLevel?.id] > 0 && (
                <span className="block mt-1 text-amber-400 font-medium">
                  {usersByLevel[deletingLevel.id]} profissional(is) vinculados perderão o nível.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLevel.mutate(deletingLevel.id)}
              className="bg-error text-white hover:bg-error/80"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
