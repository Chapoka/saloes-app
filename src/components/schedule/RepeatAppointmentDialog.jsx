import { useState } from "react";
import { format, addWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RepeatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function RepeatAppointmentDialog({ open, onClose, appointment, onConfirm, isLoading }) {
  const [weeks, setWeeks] = useState("8");

  if (!appointment) return null;

  const appointmentDate = parseISO(appointment.date);
  const dayOfWeek = appointmentDate.getDay();
  const dayName = DAY_NAMES[dayOfWeek];

  const previewDates = [];
  for (let i = 1; i <= Math.min(parseInt(weeks), 4); i++) {
    previewDates.push(format(addWeeks(appointmentDate, i), "dd/MM/yyyy", { locale: ptBR }));
  }

  const handleConfirm = () => {
    onConfirm(appointment, parseInt(weeks));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RepeatIcon className="w-5 h-5 text-branding-primary" />
            Repetir Semanalmente?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-branding-primary/5 border border-branding-primary/20 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              Deseja agendar toda <strong>{dayName}</strong> às <strong>{appointment.start_time}</strong> para{" "}
              <strong>{appointment.customer_name}</strong>?
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Por quantas semanas?</Label>
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 semanas (1 mês)</SelectItem>
                <SelectItem value="8">8 semanas (2 meses)</SelectItem>
                <SelectItem value="12">12 semanas (3 meses)</SelectItem>
                <SelectItem value="16">16 semanas (4 meses)</SelectItem>
                <SelectItem value="20">20 semanas (5 meses)</SelectItem>
                <SelectItem value="24">24 semanas (6 meses)</SelectItem>
                <SelectItem value="32">32 semanas (8 meses)</SelectItem>
                <SelectItem value="40">40 semanas (10 meses)</SelectItem>
                <SelectItem value="48">48 semanas (12 meses)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {previewDates.length > 0 && (
            <div className="text-xs text-gray-500">
              <p className="mb-1 font-medium">Próximos agendamentos:</p>
              {previewDates.map((d, i) => (
                <span key={i} className="inline-block mr-2 bg-gray-100 px-2 py-0.5 rounded">{d}</span>
              ))}
              {parseInt(weeks) > 4 && <span className="text-gray-500">+ mais...</span>}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Não, apenas esta
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 rounded-xl btn-branding"
            >
              {isLoading ? "Criando..." : `Repetir por ${weeks} sem.`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
