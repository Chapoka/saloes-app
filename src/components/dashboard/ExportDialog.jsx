import { useState } from "react";
import { format } from "date-fns";
import { FileDown, FileSpreadsheet, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function ExportDialog({ open, onClose }) {
  const [month, setMonth] = useState(format(new Date(), "M"));
  const [year, setYear] = useState(format(new Date(), "yyyy"));
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeCustomers, setIncludeStudents] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [accountantEmail, setAccountantEmail] = useState("");

  const handleExportExcel = () => {
    toast.success("Exportando para Excel...");
    onClose();
  };

  const handleExportPDF = () => {
    toast.success("Exportando para PDF...");
    onClose();
  };

  const handleSendToAccountant = () => {
    if (!accountantEmail) {
      toast.error("Digite o e-mail do contador");
      return;
    }
    toast.success(`Relatório enviado para ${accountantEmail}`);
    onClose();
  };

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-branding-primary" />
            Exportação Contábil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Period Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-on-surface-variant uppercase">Período</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-on-surface-variant uppercase">Dados para Exportar</Label>
            <div className="space-y-3 bg-surface-container-low rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={includeInvoices} 
                  onCheckedChange={setIncludeInvoices}
                  id="invoices"
                />
                <div className="flex-1">
                  <label htmlFor="invoices" className="text-sm font-medium cursor-pointer">
                    Faturas & Pagamentos
                  </label>
                  <p className="text-xs text-on-surface-variant">Extrato detalhado do Asaas</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={includeCustomers} 
                  onCheckedChange={setIncludeStudents}
                  id="customers"
                />
                <div className="flex-1">
                  <label htmlFor="customers" className="text-sm font-medium cursor-pointer">
                    Cadastros de Clientes
                  </label>
                  <p className="text-xs text-on-surface-variant">Dados cadastrais</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={includeDocs} 
                  onCheckedChange={setIncludeDocs}
                  id="docs"
                />
                <div className="flex-1">
                  <label htmlFor="docs" className="text-sm font-medium cursor-pointer">
                    Documentos Fiscais
                  </label>
                  <p className="text-xs text-on-surface-variant">Notas fiscais (NFSe)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Accountant Email */}
          <div className="space-y-2">
            <Label>E-mail do Contador (opcional)</Label>
            <Input
              type="email"
              value={accountantEmail}
              onChange={(e) => setAccountantEmail(e.target.value)}
              placeholder="contato@contabilidade.com"
              className="rounded-xl"
            />
          </div>

          {/* Export Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleExportExcel}
              className="w-full bg-emerald-500 hover:bg-emerald-500/80 rounded-xl h-12"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Exportar como Excel (.xlsx)
            </Button>
            
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="w-full rounded-xl h-12"
            >
              <FileText className="w-5 h-5 mr-2" />
              Exportar como PDF
            </Button>

            {accountantEmail && (
              <Button
                onClick={handleSendToAccountant}
                className="w-full bg-branding-primary hover:bg-branding-primary rounded-xl h-12"
              >
                <Send className="w-5 h-5 mr-2" />
                Enviar para Contador
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}