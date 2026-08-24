import { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, X, Loader2, Calendar, AlertCircle, FileText, Repeat, Mail, MessageSquare, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AsaasSubscriptionModal({ customer, plans, companyId, onClose }) {
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [paymentTemplate, setPaymentTemplate] = useState(null);
  const [notifications, setNotifications] = useState({ whatsapp: false, email: false });
  const [cpf, setCpf] = useState(customer?.cpf || "");
  const [cpfRequired, setCpfRequired] = useState(false);

  useEffect(() => {
    db.entities.Template.filter({ trigger: "payment_link" })
      .then(templates => {
        const compId = companyId || customer.company_id || (customer.company_ids || [])[0];
        const t = templates.find(t => !t.company_id || t.company_id === compId) || templates[0];
        if (t) setPaymentTemplate(t);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!customer?.cpf) {
      setCpfRequired(true);
    }
  }, [customer]);

  const getPlanInfo = () => {
    if (customer?.custom_plan) {
      const cp = customer.custom_plan;
      const services = cp.total_services || cp.frequency_count || 0;
      let value = 0;
      if (cp.frequency_type === "weekly") value = (cp.price_per_service || 0) * (cp.frequency_count || 1) * 4;
      else value = (cp.price_per_service || 0) * services;
      return { name: "Plano Personalizado", value, services };
    }
    const plan = plans?.find(p => p.id === customer?.plan_id);
    if (plan) {
      const services = plan.session_count || 4;
      return { name: plan.name, value: (plan.price || 0) * services, services };
    }
    return null;
  };

  const planInfo = getPlanInfo();

  const getNextDueDate = () => {
    const now = new Date();
    let due = new Date(now.getFullYear(), now.getMonth(), 5);
    if (due <= now) due = new Date(now.getFullYear(), now.getMonth() + 1, 5);
    return due.toISOString().split("T")[0];
  };

  const buildMessage = (paymentUrl, value) => {
    const template = paymentTemplate?.message ||
      `Olá, {nome_cliente}! 💳\n\nSua fatura no valor de R$ {valor_plano} está disponível.\n\nClique para pagar: {link_pagamento}\n\nApós o pagamento, seus créditos serão liberados automaticamente! ✂️`;

    return template
      .replace(/{nome_cliente}/g, customer.name)
      .replace(/{valor_plano}/g, value?.toFixed(2) || "0.00")
      .replace(/{link_pagamento}/g, paymentUrl || "(sem link disponível)");
  };

  const sendNotifications = async (paymentUrl, value) => {
    const compId = companyId || customer.company_id || (customer.company_ids || [])[0];
    const message = buildMessage(paymentUrl, value);
    const sent = { whatsapp: false, email: false };

    if (customer.whatsapp && compId) {
      try {
        await db.functions.invoke("whatsappSend", {
          company_id: compId,
          phone: customer.whatsapp,
          message,
        });
        sent.whatsapp = true;
      } catch (_) {}
    }

    if (customer.email) {
      try {
        const emailBody = message.replace(/\n/g, "<br>").replace(/\*(.*?)\*/g, "<strong>$1</strong>");
        await db.integrations.Core.SendEmail({
          to: customer.email,
          subject: `💳 Sua fatura de R$ ${value?.toFixed(2)} está disponível`,
          body: `<p>${emailBody}</p>`,
        });
        sent.email = true;
      } catch (_) {}
    }

    return sent;
  };

  const handleSaveCpf = async () => {
    if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
      toast.error("CPF inválido. Informe 11 dígitos.");
      return;
    }
    try {
      await supabase.from("users").update({ cpf }).eq("id", customer.id).then(() => {});
      await db.entities.Customer.update(customer.id, { cpf });
      setCpfRequired(false);
      toast.success("CPF salvo!");
    } catch (e) {
      toast.error("Erro ao salvar CPF: " + e.message);
    }
  };

  const handleCreateInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const dueDate = getNextDueDate();
      const resolvedCompanyId = companyId || customer.company_id || (customer.company_ids || [])[0] || null;
      await db.entities.Invoice.create({
        customer_id: customer.id,
        customer_name: customer.name,
        plan_id: customer.plan_id || null,
        plan_name: planInfo?.name || "",
        value: planInfo?.value || 0,
        due_date: dueDate,
        status: "pending",
        company_id: resolvedCompanyId,
      });

      const sent = await sendNotifications(null, planInfo?.value);
      setNotifications(sent);
      setResult({ type: "invoice", dueDate, value: planInfo?.value });
      toast.success("Cobrança criada com sucesso!");
    } catch (e) {
      setError(e.message || "Erro ao criar cobrança");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await db.functions.invoke("asaasCustomer", {
        action: "create_customer_and_subscription",
        customer_id: customer.id,
        company_id: companyId || customer.company_id || (customer.company_ids || [])[0],
      });
      const data = res.data;
      if (data.ok) {
        const sent = await sendNotifications(data.payment_url, data.plan_value);
        setNotifications(sent);
        setResult({ type: "subscription", ...data });
        toast.success("Assinatura criada com sucesso!");
      } else {
        setError(data.error || "Erro ao criar assinatura");
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">

        {result ? (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {result.type === "invoice" ? "Cobrança criada!" : "Assinatura criada!"}
              </h3>
            </div>

            {result.type === "invoice" ? (
              <div className="space-y-2 p-4 bg-gray-50 rounded-xl text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Plano:</span><span className="font-medium">{planInfo?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor:</span><span className="font-semibold text-emerald-700">R$ {result.value?.toFixed(2)}</span></div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <Calendar className="w-4 h-4 text-branding-primary" />
                  <span className="text-branding-primary font-medium">Vencimento: {new Date(result.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4 bg-gray-50 rounded-xl text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Plano:</span><span className="font-medium">{result.plan_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor:</span><span className="font-semibold text-emerald-700">R$ {result.plan_value?.toFixed(2)}/mês</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Serviços:</span><span className="font-medium">{result.session_count}/mês</span></div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <Calendar className="w-4 h-4 text-branding-primary" />
                  <span className="text-branding-primary font-medium">Vencimento: dia 05 de cada mês</span>
                </div>
              </div>
            )}

            {result.payment_url && (
              <a href={result.payment_url} target="_blank" rel="noopener noreferrer"
                className="block text-center text-sm text-branding-primary hover:underline">
                Ver link do primeiro pagamento →
              </a>
            )}

            <div className="space-y-1.5">
              {customer.whatsapp && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${notifications.whatsapp ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  {notifications.whatsapp
                    ? `✓ WhatsApp enviado para ${customer.whatsapp}`
                    : `WhatsApp não enviado (${customer.whatsapp})`}
                </div>
              )}
              {customer.email && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${notifications.email ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}`}>
                  <Mail className="w-3.5 h-3.5" />
                  {notifications.email
                    ? `✓ E-mail enviado para ${customer.email}`
                    : `E-mail não enviado (${customer.email})`}
                </div>
              )}
            </div>

            <Button onClick={onClose} className="w-full btn-branding rounded-xl">
              Fechar
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Gerar cobrança para {customer.name}?</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CPF Section */}
            {cpfRequired && (
              <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Label className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  CPF do cliente
                </Label>
                <p className="text-xs text-amber-600">Necessário para gerar cobranças</p>
                <div className="flex gap-2">
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="rounded-xl flex-1"
                    maxLength={14}
                  />
                  <Button
                    onClick={handleSaveCpf}
                    variant="outline"
                    className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}

            {planInfo ? (
              <div className="p-4 bg-branding-primary/5 border border-branding-primary/20 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Plano:</span><span className="font-medium">{planInfo.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor:</span><span className="font-semibold text-branding-primary">R$ {planInfo.value?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Serviços/mês:</span><span className="font-medium">{planInfo.services}</span></div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Nenhum plano vinculado. Configure um plano para gerar cobrança.
              </div>
            )}

            <div className="flex gap-2">
              {customer.whatsapp && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                  <MessageSquare className="w-3 h-3" /> WhatsApp
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                  <Mail className="w-3 h-3" /> E-mail
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <p className="text-sm text-gray-500 text-center">Escolha como deseja gerar a cobrança:</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setMode("invoice"); handleCreateInvoice(); }}
                disabled={loading || !planInfo || cpfRequired}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-branding-primary hover:bg-branding-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {loading && mode === "invoice" ? <Loader2 className="w-5 h-5 animate-spin text-branding-primary" /> : <FileText className="w-5 h-5 text-gray-600" />}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-gray-900">Cobrança Registrada</p>
                  <p className="text-xs text-gray-500 mt-0.5">Registro interno, sem Asaas</p>
                </div>
              </button>

              <button
                onClick={() => { setMode("subscription"); handleCreateSubscription(); }}
                disabled={loading || !planInfo || cpfRequired}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-branding-secondary hover:bg-branding-secondary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {loading && mode === "subscription" ? <Loader2 className="w-5 h-5 animate-spin text-branding-secondary" /> : <Repeat className="w-5 h-5 text-gray-600" />}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-gray-900">Cobrança Avulsa</p>
                  <p className="text-xs text-gray-500 mt-0.5">Via Asaas (PIX)</p>
                </div>
              </button>
            </div>

            <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full text-gray-500 rounded-xl">
              Pular por enquanto
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
