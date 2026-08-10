import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Send, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InvoiceDetailModal({ invoice, customer, appointments, onClose }) {
  const [printing, setPrinting] = useState(false);
  
  if (!invoice) return null;

  const invoiceDate = invoice.due_date ? parseISO(invoice.due_date) : new Date();
  const monthStart = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1);
  const monthEnd = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0);
  
  const periodAppointments = (appointments || []).filter(l => {
    if (!l.date) return false;
    const appointmentDate = parseISO(l.date);
    return l.customer_id === invoice.customer_id && 
           appointmentDate >= monthStart && 
           appointmentDate <= monthEnd;
  });

  const presentCount = periodAppointments.filter(l => l.status === "present").length;
  const absentCount = periodAppointments.filter(l => l.status === "absent").length;
  const confirmedCount = periodAppointments.filter(l => l.status === "confirmed").length;
  const totalCompleted = presentCount + confirmedCount;
  
  const pricePerService = invoice.value;
  const totalValue = pricePerService * presentCount;
  const finalValue = totalValue;

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 500);
  };

  const handleSendWhatsApp = () => {
    const message = `*Fatura - ${customer.name}*\n\n` +
      `Período: ${format(monthStart, "MMM/yyyy", { locale: ptBR })}\n` +
      `Valor por serviço: R$ ${pricePerService.toFixed(2)}\n` +
      `Serviços realizados: ${presentCount}\n` +
      `Faltas: ${absentCount}\n` +
      `*Total: R$ ${finalValue.toFixed(2)}*\n\n` +
      (invoice.asaas_url ? `Pagar: ${invoice.asaas_url}` : "");
    
    const encodedMessage = encodeURIComponent(message);
    const phone = customer?.whatsapp?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, "_blank");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Cobrança</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{customer?.name || invoice.customer_name || "Cliente"}</h3>
              <Badge className={cn(
                invoice.status === "received" ? "bg-green-100 text-green-700" :
                invoice.status === "pending" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {invoice.status === "received" ? "Pago" :
                 invoice.status === "pending" ? "Pendente" : "Vencido"}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{customer?.whatsapp || "-"}</p>
          </div>

          {/* Period Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Período: {format(monthStart, "MMMM/yyyy", { locale: ptBR })}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plano contratado:</span>
                <span className="font-medium">{invoice.plan_name || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valor por serviço:</span>
                <span className="font-medium">R$ {invoice.value.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Appointments Summary */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Resumo de Serviços</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Serviços realizados</span>
                </div>
                <span className="font-semibold text-green-600">{totalCompleted}</span>
              </div>
              
              {absentCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-gray-600">Faltas</span>
                  </div>
                  <span className="font-semibold text-red-600">{absentCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Calculation */}
          <div className="bg-branding-primary/5 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Valor unitário:</span>
              <span>R$ {pricePerService.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quantidade de serviços:</span>
              <span>× {presentCount}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total:</span>
              <span className="text-branding-primary">R$ {finalValue.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handlePrint}
              disabled={printing}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              {printing ? "Imprimindo..." : "Imprimir"}
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] rounded-xl"
            >
              <Send className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
