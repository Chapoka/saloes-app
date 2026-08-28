import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, ChevronDown, Tag, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/auth/useCurrentUser";

export default function ModalitySelector({ value, onChange }) {
  const queryClient = useQueryClient();
  const { companyId } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: modalities = [] } = useQuery({
    queryKey: ["modalities"],
    queryFn: () => db.entities.Modality.list(),
  });

  const createModalityMutation = useMutation({
    mutationFn: (name) => db.entities.Modality.create({ name, active: true }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["modalities"] });
      onChange(created.name);
      setNewName("");
      setNewPrice("");
      setNewDiscount("");
      setCreating(false);
      setOpen(false);
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (data) => db.entities.Service.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["services"]);
    },
  });

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Create the modality first
    const createdModality = await createModalityMutation.mutateAsync(trimmed);

    // If price is provided, also create a service
    if (newPrice && parseFloat(newPrice) > 0) {
      await createServiceMutation.mutateAsync({
        name: trimmed,
        category: trimmed.toLowerCase(),
        duration_mins: 30,
        price: parseFloat(newPrice) || 0,
        discount: parseFloat(newDiscount) || 0,
        description: "",
        active: true,
      });
    }

    onChange(createdModality.name);
    setNewName("");
    setNewPrice("");
    setNewDiscount("");
    setCreating(false);
    setOpen(false);
  };

  const selected = modalities.find((m) => m.name === value);
  const displayLabel = selected ? selected.name : value || "Selecione...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="max-h-48 overflow-y-auto">
          {modalities.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">Nenhum tipo de serviço cadastrado</p>
          )}
          {modalities.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.name); setOpen(false); }}
              className="flex items-center w-full px-2 py-1.5 text-sm rounded hover:bg-accent gap-2"
            >
              <Check className={cn("w-4 h-4", value === m.name ? "opacity-100 text-branding-primary" : "opacity-0")} />
              {m.name}
            </button>
          ))}
        </div>

        <div className="border-t mt-1 pt-1">
          {creating ? (
            <div className="px-1 space-y-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } if (e.key === "Escape") setCreating(false); }}
                placeholder="Nome do tipo de serviço"
                className="h-7 text-xs rounded-lg"
              />
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Valor do serviço (R$)"
                  className="h-7 text-xs rounded-lg pl-7"
                />
              </div>
              <div className="relative">
                <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  placeholder="Desconto (R$)"
                  className="h-7 text-xs rounded-lg pl-7"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={createModalityMutation.isPending || !newName.trim()}
                  className="h-7 px-2 rounded-lg bg-branding-primary hover:bg-branding-primary/90 text-xs flex-1"
                >
                  {createModalityMutation.isPending ? "..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreating(false)}
                  className="h-7 px-2 rounded-lg text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-branding-primary hover:bg-accent rounded"
            >
              <Plus className="w-4 h-4" />
              Novo tipo de serviço
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}