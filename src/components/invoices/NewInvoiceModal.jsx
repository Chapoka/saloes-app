import { useState } from "react";
import { db } from "@/api/dbClient";
import { CheckCircle, Loader2, FileText, CreditCard, AlertCircle, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function NewInvoiceModal({ open, onClose, customers, plans, onCreated }) {
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState({ whatsapp: false, email: false });

  const [form, setForm] = useState({
    customer_id: "",
    charge_type: "plan",
    plan_id: "",
    description: "",
    value: "",
    due_date: "",
  });

  const selectedCustomer = customers.find(s => s.id === form.customer_id);
  const selectedPlan = plans.find(p => p.id === form.plan_id);

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(s => s.id === customerId);
    let planId = "";
    let value = "";
    if (customer?.custom_plan) {
      const cp = customer.custom_plan;
      value = cp.frequency_type === "weekly"
        ? (cp.price_per_service || 0) * (cp.frequency_count || 1) * 4
        : (cp.price_per_service || 0) * (cp.total_services || 1);
    } else if (customer?.plan_id) {
      planId = customer.plan_id;
      const plan = plans.find(p => p.id === customer.plan_id);
      if (plan) value = (plan.price || 0) * (plan.session_count || 4);
    }
    setForm({ ...form, customer_id: customerId, plan_id: planId, value: String(value || ""), charge_type: "plan", description: "" });
  };

  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p.id === planId);
    const value = plan ? (plan.price || 0) * (plan.session_count || 4) : "";
    setForm({ ...form, plan_id: planId, value: String(value) });
  };

  const handleChargeTypeChange = (type) => {
    if (type === "plan") {
      const customer = customers.find(s => s.id === form.customer_id);
      let planId = customer?.plan_id || "";
      let value = "";
      if (customer?.custom_plan) {
        const cp = customer.custom_plan;
        value = cp.frequency_type === "weekly"
          ? (cp.price_per_service || 0) * (cp.frequency_count || 1) * 4
          : (cp.price_per_service || 0) * (cp.total_services || 1);
      } else if (planId) {
        const plan = plans.find(p => p.id === planId);
        value = plan ? (plan.price || 0) * (plan.session_count || 4) : "";
      }
      setForm({ ...form, charge_type: "plan", plan_id: planId, value: String(value), description: "" });
    } else {
      setForm({ ...form, charge_type: "custom", plan_id: "", value: "", description: "" });
    }
  };

  const isFormValid = () => {
    if (!form.customer_id) return false;
    if (!form.value || parseFloat(form.value) <= 0) return false;
    if (!form.due_date) return false;
    if (form.charge_type === "custom" && !form.description.trim()) return false;
    return true;
  };

  const handleFormNext = (e) => {
    e.preventDefault();
    if (!isFormValid()) { toast.error("Preencha todos os campos obrigatórios"); return; }
    setStep("choose_type");
  };

  const buildInvoiceData = () => {
    const customer = customers.find(s => s.id === form.customer_id);
    const plan = plans.find(p => p.id === form.plan_id);
    return {
      customer_id: form.customer_id,
      customer_name: customer?.name || "",
      plan_id: form.plan_id || null,
      plan_name: form.charge_type === "custom"
        ? form.description
        : (selectedCustomer?.custom_plan ? "Plano Personalizado" : (plan?.name || "")),
      value: parseFloat(form.value),
      due_date: form.due_date,
      status: "pending",
      company_id: customer?.company_id || null,
    };
  };

  const sendNotifications = async (paymentUrl) => {
    const customer = customers.find(s => s.id === form.customer_id);
    if (!customer) return { whatsapp: false, email: false };
    const value = parseFloat(form.value);
    const description = form.charge_type === "custom" ? form.description : (selectedPlan?.name || "Plano");

    let planDetails = "";
    if (form.charge_type === "plan") {
      if (customer.custom_plan) {
        const cp = customer.custom_plan;
        const modalityLabel = cp.modality === "corte" ? "Corte" : cp.modality === "barba" ? "Barba" : cp.modality || "";
        planDetails += `\n✂️ Tipo: ${modalityLabel}`;
        planDetails += `\n📚 Total de serviços: ${cp.total_services || "-"}`;
        planDetails += `\n💵 Valor por serviço: R$ ${cp.price_per_service?.toFixed(2) || "-"}`;
      } else if (selectedPlan) {
        const modalityLabel = selectedPlan.modality === "corte" ? "Corte" : selectedPlan.modality === "barba" ? "Barba" : selectedPlan.modality || "";
        planDetails += `\n✂️ Tipo: ${modalityLabel}`;
        planDetails += `\n📚 Total de serviços: ${selectedPlan.session_count || "-"}`;
        planDetails += `\n💵 Valor por serviço: R$ ${selectedPlan.price?.toFixed(2) || "-"}`;
      }
    }

    const message = `Olá, ${customer.name}! 💳\n\nSua cobrança está disponível:\n\n📋 Plano: *${description}*${planDetails}\n\n💰 Valor total: *R$ ${value.toFixed(2)}*\n📅 Vencimento: ${new Date(form.due_date + "T12:00:00").toLocaleDateString("pt-BR")}${paymentUrl ? `\n\n🔗 Clique para pagar:\n${paymentUrl}` : ""}\n\nQualquer dúvida, estamos à disposição! ✂️`;
    const sent = { whatsapp: false, email: false };
    if (customer.whatsapp && customer.company_id) {
      try {
        const res = await db.functions.invoke("whatsappSend", { company_id: customer.company_id, phone: customer.whatsapp, message });
        sent.whatsapp = !!res.data?.ok;
      } catch (_) {}
    }
    if (customer.email) {
      try {
        await db.integrations.Core.SendEmail({
          to: customer.email,
          subject: `💳 Cobrança de R$ ${value.toFixed(2)}`,
          body: `<p>${message.replace(/\n/g, "<br>").replace(/\*(.*?)\*/g, "<strong>$1</strong>")}</p>`,
        });
        sent.email = true;
      } catch (_) {}
    }
    return sent;
  };

  const handleSimple = async () => {
    setLoading(true); setError(null);
    try {
      const data = buildInvoiceData();
      await db.entities.Invoice.create(data);
      const sent = await sendNotifications(null);
      setNotifications(sent);
      setResult({ type: "simple", value: data.value, due_date: data.due_date, description: data.plan_name });
      setStep("result");
      onCreated?.();
      toast.success("Cobrança criada!");
    } catch (e) {
      setError(e.message || "Erro ao criar cobrança");
    } finally {
      setLoading(false);
    }
  };

  const handleAsaas = async () => {
    setLoading(true); setError(null);
    try {
      const customer = customers.find(s => s.id === form.customer_id);
      const value = parseFloat(form.value);
      const description = form.charge_type === "custom" ? form.description : (selectedPlan?.name || "Cobrança");

      const res = await db.functions.invoke("asaasCustomer", {
        action: "create_single_payment",
        customer_id: form.customer_id,
        company_id: customer?.company_id,
        value,
        due_date: form.due_date,
        description,
      });

      const data = res.data;
      if (!data?.ok) { setError(data?.error || "Erro ao criar cobrança no Asaas"); return; }

      const invoiceData = buildInvoiceData();
      await db.entities.Invoice.create({
        ...invoiceData,
        asaas_id: data.payment_id,
        asaas_url: data.payment_url,
      });

      const sent = await sendNotifications(data.payment_url);
      setNotifications(sent);
      setResult({ type: "asaas", value, due_date: form.due_date, description, payment_url: data.payment_url });
      setStep("result");
      onCreated?.();
      toast.success("Cobrança criada no Asaas!");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setForm({ customer_id: "", charge_type: "plan", plan_id: "", description: "", value: "", due_date: "" });
    setResult(null); setError(null); setMode(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Nova Cobrança" : step === "choose_type" ? "Como gerar a cobrança?" : "Cobrança Criada!"}
          </DialogTitle>
        </DialogHeader>

        {/* STEP: FORM */}
        {step === "form" && (
          <form onSubmit={handleFormNext} className="space-y-4 pt-2">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de cobrança */}
            {form.customer_id && (
              <div className="space-y-1.5">
                <Label>Tipo de Cobrança *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button"
                    onClick={() => handleChargeTypeChange("plan")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.charge_type === "plan" ? "border-branding-primary bg-branding-primary/5" : "border-outline-variant/30 hover:border-outline-variant/50"}`}>
                    <p className="font-medium text-sm text-on-surface">Por Plano</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Usa plano existente</p>
                  </button>
                  <button type="button"
                    onClick={() => handleChargeTypeChange("custom")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.charge_type === "custom" ? "border-branding-primary bg-branding-primary/5" : "border-outline-variant/30 hover:border-outline-variant/50"}`}>
                    <p className="font-medium text-sm text-on-surface">Avulsa</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Valor e desc. livres</p>
                  </button>
                </div>
              </div>
            )}

            {/* Plano (se tipo = plan) */}
            {form.customer_id && form.charge_type === "plan" && (
              <div className="space-y-1.5">
                <Label>Plano *</Label>
                {selectedCustomer?.custom_plan ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10">
                    <span className="text-sm text-purple-300 font-medium">Plano Personalizado</span>
                  </div>
                ) : (
                  <Select value={form.plan_id} onValueChange={handlePlanChange}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                    <SelectContent>
                      {plans.filter(p => p.active !== false).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price?.toFixed(2)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Descrição (se tipo = custom) */}
            {form.customer_id && form.charge_type === "custom" && (
              <div className="space-y-1.5">
                <Label>Descrição *</Label>
                <Input
                  placeholder="Ex: Serviço avulso, Taxa de abertura..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Valor e Vencimento */}
            {form.customer_id && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" min="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="rounded-xl" placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento *</Label>
                  <Input type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={!isFormValid()} className="flex-1 rounded-xl btn-branding">
                Continuar
              </Button>
            </div>
          </form>
        )}

        {/* STEP: CHOOSE TYPE */}
        {step === "choose_type" && (
          <div className="space-y-4 pt-2">
            {/* Summary */}
            <div className="p-3 bg-surface-container-low rounded-xl text-sm space-y-1">
              <div className="flex justify-between"><span className="text-on-surface-variant">Cliente:</span><span className="font-medium">{selectedCustomer?.name}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Valor:</span><span className="font-semibold text-branding-primary">R$ {parseFloat(form.value).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Vencimento:</span><span className="font-medium">{new Date(form.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</span></div>
              {form.charge_type === "custom" && <div className="flex justify-between"><span className="text-on-surface-variant">Descrição:</span><span className="font-medium">{form.description}</span></div>}
              {form.charge_type === "plan" && <div className="flex justify-between"><span className="text-on-surface-variant">Plano:</span><span className="font-medium">{selectedCustomer?.custom_plan ? "Plano Personalizado" : selectedPlan?.name}</span></div>}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <p className="text-sm text-on-surface-variant text-center">Como deseja registrar essa cobrança?</p>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSimple} disabled={loading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-outline-variant/30 hover:border-branding-primary hover:bg-branding-primary/5 transition-all disabled:opacity-50">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                  {loading && mode !== "asaas" ? <Loader2 className="w-5 h-5 animate-spin text-branding-primary" /> : <FileText className="w-5 h-5 text-on-surface-variant" />}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-on-surface">Cobrança Simples</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Registro interno apenas</p>
                </div>
              </button>

              <button onClick={() => { setMode("asaas"); handleAsaas(); }} disabled={loading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-outline-variant/30 hover:border-branding-secondary hover:bg-branding-secondary/5 transition-all disabled:opacity-50">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                  {loading && mode === "asaas" ? <Loader2 className="w-5 h-5 animate-spin text-branding-secondary" /> : <CreditCard className="w-5 h-5 text-on-surface-variant" />}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-on-surface">Registrar no Asaas</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Gera link de pagamento</p>
                </div>
              </button>
            </div>

            <Button variant="ghost" onClick={() => setStep("form")} disabled={loading} className="w-full text-on-surface-variant rounded-xl">
              ← Voltar
            </Button>
          </div>
        )}

        {/* STEP: RESULT */}
        {step === "result" && result && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-on-surface">Cobrança criada com sucesso!</h3>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl text-sm space-y-2">
              <div className="flex justify-between"><span className="text-on-surface-variant">Cliente:</span><span className="font-medium">{selectedCustomer?.name}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Descrição:</span><span className="font-medium">{result.description}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Valor:</span><span className="font-semibold text-emerald-300">R$ {result.value?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Vencimento:</span><span className="font-medium">{new Date(result.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</span></div>
            </div>

            {result.payment_url && (
              <a href={result.payment_url} target="_blank" rel="noopener noreferrer"
                className="block text-center text-sm text-branding-primary hover:underline font-medium">
                🔗 Ver link de pagamento →
              </a>
            )}

            <div className="space-y-1.5">
              {selectedCustomer?.whatsapp && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${notifications.whatsapp ? "bg-emerald-500/10 text-emerald-300" : "bg-surface-container-low text-on-surface-variant"}`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  {notifications.whatsapp ? `✓ WhatsApp enviado` : `WhatsApp não enviado`}
                </div>
              )}
              {selectedCustomer?.email && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${notifications.email ? "bg-emerald-500/10 text-emerald-300" : "bg-surface-container-low text-on-surface-variant"}`}>
                  <Mail className="w-3.5 h-3.5" />
                  {notifications.email ? `✓ E-mail enviado` : `E-mail não enviado`}
                </div>
              )}
            </div>

            <Button onClick={handleClose} className="w-full btn-branding rounded-xl">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
