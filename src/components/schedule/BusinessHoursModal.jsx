import { useState, useEffect } from "react";
import { Clock, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h <= 23; h++) {
    options.push(`${h.toString().padStart(2, "0")}:00`);
    options.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return options;
};

const timeOptions = generateTimeOptions();

export default function BusinessHoursModal({ open, onClose, company, companies = [], companyId, isSuperAdmin, onSave }) {
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("18:00");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveCompany = company || companies.find(c => c.id === selectedCompanyId);
  const showCompanySelect = isSuperAdmin || companies.length > 1;

  useEffect(() => {
    if (open) {
      if (company) {
        setOpeningTime(company.opening_time || "08:00");
        setClosingTime(company.closing_time || "18:00");
        setSelectedCompanyId(company.id);
      } else if (companies.length === 1) {
        setSelectedCompanyId(companies[0].id);
        setOpeningTime(companies[0].opening_time || "08:00");
        setClosingTime(companies[0].closing_time || "18:00");
      } else if (companyId && companies.find(c => c.id === companyId)) {
        const c = companies.find(co => co.id === companyId);
        setSelectedCompanyId(companyId);
        setOpeningTime(c?.opening_time || "08:00");
        setClosingTime(c?.closing_time || "18:00");
      } else {
        setOpeningTime("08:00");
        setClosingTime("18:00");
      }
    }
  }, [open, company, companyId, companies]);

  const handleCompanyChange = (id) => {
    setSelectedCompanyId(id);
    const c = companies.find(co => co.id === id);
    if (c) {
      setOpeningTime(c.opening_time || "08:00");
      setClosingTime(c.closing_time || "18:00");
    }
  };

  const targetCompanyId = company?.id || selectedCompanyId;

  const handleSave = async () => {
    if (!targetCompanyId) {
      toast.error("Selecione um salão primeiro");
      return;
    }
    if (openingTime >= closingTime) {
      toast.error("O horário de abertura deve ser anterior ao horário de fechamento");
      return;
    }
    setSaving(true);
    try {
      await onSave({ opening_time: openingTime, closing_time: closingTime }, targetCompanyId);
      toast.success("Horário de funcionamento atualizado!");
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar horário: " + (err.message || "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const noCompany = !targetCompanyId && companies.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-branding-primary" />
            Horário de Funcionamento
          </DialogTitle>
        </DialogHeader>

        {noCompany ? (
          <div className="py-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Nenhum salão vinculado à sua conta. Fale com o suporte.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {showCompanySelect && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Salão</Label>
                <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione o salão" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Abertura</Label>
              <Select value={openingTime} onValueChange={setOpeningTime}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={`open-${t}`} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Fechamento</Label>
              <Select value={closingTime} onValueChange={setClosingTime}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={`close-${t}`} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-xl bg-branding-primary/5 border border-branding-primary/20 text-sm text-branding-primary flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                Horário de funcionamento: <strong>{openingTime} - {closingTime}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          {!noCompany && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl btn-branding"
            >
              {saving ? "Salvando..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
