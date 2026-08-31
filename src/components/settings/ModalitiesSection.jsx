import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ModalitiesSection() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const { data: modalities = [], isLoading } = useQuery({
    queryKey: ["modalities"],
    queryFn: () => db.entities.Modality.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => db.entities.Modality.create({ name, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modalities"] });
      setNewName("");
      toast.success("Tipo de serviço criado!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => db.entities.Modality.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modalities"] });
      setEditingId(null);
      toast.success("Tipo de serviço atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Modality.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modalities"] });
      toast.success("Tipo de serviço removido!");
    },
  });

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const handleUpdate = () => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id: editingId, name: trimmed });
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-outline-variant/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Tipos de Serviço</CardTitle>
            <CardDescription>Gerencie os tipos de serviço disponíveis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Create new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
            placeholder="Nome do novo tipo de serviço"
            className="rounded-xl"
          />
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !newName.trim()}
            className="rounded-xl bg-secondary hover:bg-secondary/80 shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-on-surface-variant">Carregando...</p>
        ) : modalities.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-4">Nenhum tipo de serviço cadastrado</p>
        ) : (
          <div className="space-y-2">
            {modalities.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl"
              >
                {editingId === m.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditingId(null); }}
                      className="h-7 rounded-lg text-sm"
                    />
                    <button onClick={handleUpdate} className="text-green-400 hover:text-green-300">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-on-surface-variant hover:text-on-surface-variant">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium text-on-surface text-sm">{m.name}</span>
                    <Badge variant="outline" className="text-xs text-on-surface-variant font-mono">{m.id}</Badge>
                  </div>
                )}
                {editingId !== m.id && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-on-surface-variant hover:text-purple-400"
                      onClick={() => { setEditingId(m.id); setEditingName(m.name); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-on-surface-variant hover:text-red-400"
                      onClick={() => deleteMutation.mutate(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}