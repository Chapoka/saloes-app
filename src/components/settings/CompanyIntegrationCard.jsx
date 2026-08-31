import { useState } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key, MessageCircle, Save, Eye, EyeOff, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Loader2, Building2, Plus, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPhone, formatCPF, formatCNPJ, formatCEP } from "@/utils/formatters";

const masks = {
  cpfCnpj: (v, personType) => {
    if (personType === "JURIDICA") return formatCNPJ(v);
    return formatCPF(v);
  },
  mobilePhone: (v) => formatPhone(v),
  postalCode: (v) => formatCEP(v),
  incomeValue: (v) => {
    const n = v.replace(/\D/g, "");
    if (!n) return "";
    return (parseInt(n) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  birthDate: (v) => {
    const n = v.replace(/\D/g, "").slice(0,8);
    return n.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
  },
};

const applyMask = (key, value, personType) => {
  if (masks[key]) return masks[key](value, personType);
  return value;
};

const providerInfo = {
  meta: {
    label: "Meta (WhatsApp Business API)",
    fields: [
      { key: "whatsapp_phone", label: "Phone Number ID", placeholder: "1234567890" },
      { key: "whatsapp_api_token", label: "Token de Acesso", placeholder: "EAAG...", secret: true },
    ],
  },
  evolution: {
    label: "Evolution API",
    fields: [
      { key: "whatsapp_api_url", label: "URL da API", placeholder: "https://api.seudominio.com" },
      { key: "whatsapp_instance", label: "Nome da Instância", placeholder: "minha-instancia" },
      { key: "whatsapp_api_token", label: "API Key", placeholder: "xxxxx", secret: true },
      { key: "whatsapp_webhook_url", label: "Webhook URL (opcional)", placeholder: "https://..." },
    ],
  },
  waha: {
    label: "WAHA (WhatsApp HTTP API)",
    fields: [
      { key: "whatsapp_api_url", label: "URL da API", placeholder: "http://localhost:3000" },
      { key: "whatsapp_instance", label: "Nome da Sessão", placeholder: "default" },
      { key: "whatsapp_api_token", label: "API Key (opcional)", placeholder: "xxxxx", secret: true },
      { key: "whatsapp_webhook_url", label: "Webhook URL (opcional)", placeholder: "https://..." },
    ],
  },
};

export default function CompanyIntegrationCard({ company }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [form, setForm] = useState(null);
  const [showSubaccountModal, setShowSubaccountModal] = useState(false);
  const [subaccountForm, setSubaccountForm] = useState({
    personType: "JURIDICA",
    name: company.name || "",
    email: company.email || "",
    cpfCnpj: company.cnpj || "",
    mobilePhone: company.phone || "",
    companyType: "LIMITED",
    incomeValue: "",
    address: "",
    addressNumber: "",
    province: "",
    postalCode: "",
  });
  const [creatingSubaccount, setCreatingSubaccount] = useState(false);
  const [subaccountResult, setSubaccountResult] = useState(null); // { success, data, errors }

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["company-integration", company.id],
    queryFn: () => db.entities.CompanyIntegration.filter({ company_id: company.id }),
    onSuccess: (data) => {
      if (data[0] && !form) setForm(data[0]);
    },
  });

  const cfg = integrations[0];
  const currentForm = form || cfg || { company_id: company.id, asaas_environment: "sandbox", whatsapp_provider: "meta" };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Validate WhatsApp fields per provider
      const provider = data.whatsapp_provider || "meta";
      if (provider === "meta" && data.whatsapp_api_token && !data.whatsapp_phone) {
        throw new Error("Phone Number ID é obrigatório para o provedor Meta");
      }
      if ((provider === "evolution" || provider === "waha") && data.whatsapp_api_token) {
        if (!data.whatsapp_api_url) throw new Error("URL da API é obrigatória");
        if (!data.whatsapp_instance) throw new Error("Nome da instância/sessão é obrigatório");
      }
      if (cfg) return db.entities.CompanyIntegration.update(cfg.id, data);
      return db.entities.CompanyIntegration.create({ ...data, company_id: company.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-integration", company.id] });
      toast.success(`Integração de ${company.name} salva com sucesso!`);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar integração");
    },
  });

  const setField = (key, value) => setForm(f => ({ ...(f || currentForm), [key]: value }));
  const toggleSecret = (key) => setShowSecrets(s => ({ ...s, [key]: !s[key] }));

  const handleCreateSubaccount = async () => {
    setCreatingSubaccount(true);
    setSubaccountResult(null);
    try {
      // Convert birthDate DD/MM/YYYY → YYYY-MM-DD for API
      const payload = { ...subaccountForm };
      if (payload.birthDate && payload.birthDate.includes("/")) {
        const [d, m, y] = payload.birthDate.split("/");
        payload.birthDate = `${y}-${m}-${d}`;
      }
      const res = await db.functions.invoke("asaasSubaccounts", {
        action: "create",
        company_id: company.id,
        data: payload,
      });
      const result = res.data;
      if (result.id) {
        queryClient.invalidateQueries({ queryKey: ["company-integration", company.id] });
        setSubaccountResult({ success: true, data: result });
      } else {
        const errors = result.errors || (result.message ? [{ description: result.message }] : [{ description: "Erro desconhecido" }]);
        setSubaccountResult({ success: false, errors });
      }
    } catch (e) {
      setSubaccountResult({ success: false, errors: [{ description: e.message || "Erro ao criar subconta" }] });
    } finally {
      setCreatingSubaccount(false);
    }
  };

  const providerFields = providerInfo[currentForm.whatsapp_provider || "meta"]?.fields || [];
  const providerLabel = providerInfo[currentForm.whatsapp_provider || "meta"]?.label;

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // { ok, message, error }
  const [testingAsaas, setTestingAsaas] = useState(false);
  const [asaasStatus, setAsaasStatus] = useState(null);

  const handleTestAsaas = async () => {
    setTestingAsaas(true);
    setAsaasStatus(null);
    try {
      const res = await db.functions.invoke("testAsaasConnection", { company_id: company.id });
      setAsaasStatus(res.data);
    } catch (err) {
      setAsaasStatus({ ok: false, error: err?.response?.data?.error || err.message || "Erro ao testar conexão" });
    } finally {
      setTestingAsaas(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await db.functions.invoke("testWhatsappConnection", { company_id: company.id });
      setConnectionStatus(res.data);
    } catch (err) {
      setConnectionStatus({ ok: false, error: err?.response?.data?.error || err.message || "Erro ao testar conexão" });
    } finally {
      setTestingConnection(false);
    }
  };

  const isConnected = cfg?.whatsapp_connected;

  return (
    <div className="border border-outline-variant rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-on-surface">{company.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {cfg?.asaas_api_key ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" />Asaas</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3" />Asaas</span>
              )}
              {cfg?.whatsapp_api_token ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" />WhatsApp ({cfg.whatsapp_provider})</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3" />WhatsApp</span>
              )}
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Subaccount creation modal */}
      {showSubaccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-on-surface">Criar Subconta Asaas</h3>
              <button onClick={() => { setShowSubaccountModal(false); setSubaccountResult(null); }} className="text-muted-foreground hover:text-on-surface-variant"><X className="w-5 h-5" /></button>
            </div>

            {/* Success result */}
            {subaccountResult?.success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Subconta criada com sucesso!
                </div>
                <div className="text-xs text-emerald-200 space-y-1">
                  <p><span className="font-medium">ID:</span> {subaccountResult.data.id}</p>
                  <p><span className="font-medium">Nome:</span> {subaccountResult.data.name}</p>
                  <p><span className="font-medium">E-mail:</span> {subaccountResult.data.email}</p>
                  {subaccountResult.data.walletId && <p><span className="font-medium">Wallet ID:</span> {subaccountResult.data.walletId}</p>}
                  {subaccountResult.data.apiKey && <p><span className="font-medium">API Key:</span> <span className="font-mono break-all">{subaccountResult.data.apiKey}</span></p>}
                </div>
                <Button onClick={() => { setShowSubaccountModal(false); setSubaccountResult(null); }} className="w-full bg-emerald-500 hover:bg-emerald-500/80 rounded-xl mt-2">Fechar</Button>
              </div>
            )}

            {/* Error result */}
            {subaccountResult && !subaccountResult.success && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-semibold">
                  <AlertCircle className="w-5 h-5" />
                  Erro ao criar subconta
                </div>
                <ul className="text-xs text-red-300 space-y-1 list-disc list-inside">
                  {subaccountResult.errors.map((e, i) => (
                    <li key={i}>{e.description || e.message || JSON.stringify(e)}</li>
                  ))}
                </ul>
              </div>
            )}

            {!subaccountResult?.success && (
              <>
                <p className="text-sm text-muted-foreground">Crie uma subconta no Asaas vinculada a <strong>{company.name}</strong> para gerenciar pagamentos.</p>

                {/* Person type */}
                <div>
                  <Label className="text-sm font-medium text-on-surface mb-2 block">Tipo de Pessoa</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ v: "JURIDICA", l: "Pessoa Jurídica (CNPJ)" }, { v: "FISICA", l: "Pessoa Física (CPF)" }].map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => setSubaccountForm(f => ({ ...f, personType: v }))}
                        className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${subaccountForm.personType === v ? "border-branding-primary bg-branding-primary/10 text-branding-primary" : "border-outline-variant text-muted-foreground"}`}
                      >{l}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: "name", label: "Nome / Razão Social *", placeholder: "Salão Aqua" },
                    { key: "email", label: "E-mail *", placeholder: "contato@salao.com" },
                    { key: "cpfCnpj", label: subaccountForm.personType === "JURIDICA" ? "CNPJ *" : "CPF *", placeholder: subaccountForm.personType === "JURIDICA" ? "00.000.000/0001-00" : "000.000.000-00" },
                    ...(subaccountForm.personType === "FISICA" ? [{ key: "birthDate", label: "Data de Nascimento *", placeholder: "YYYY-MM-DD" }] : []),
                    { key: "mobilePhone", label: "Celular *", placeholder: "(11) 99999-9999" },
                    { key: "incomeValue", label: subaccountForm.personType === "JURIDICA" ? "Faturamento Mensal (R$) *" : "Renda Mensal (R$) *", placeholder: "5000" },
                    { key: "address", label: "Endereço (Rua) *", placeholder: "Rua das Flores" },
                    { key: "addressNumber", label: "Número *", placeholder: "123" },
                    { key: "province", label: "Bairro *", placeholder: "Centro" },
                    { key: "postalCode", label: "CEP *", placeholder: "00000-000" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <Label className="text-xs text-on-surface-variant mb-1 block">{label}</Label>
                      <input
                        type="text"
                        value={subaccountForm[key] || ""}
                        onChange={e => setSubaccountForm(f => ({ ...f, [key]: applyMask(key, e.target.value, f.personType) }))}
                        placeholder={placeholder}
                        className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-branding-primary"
                      />
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs text-on-surface-variant mb-1 block">Tipo de Salão</Label>
                    <select
                      value={subaccountForm.companyType || "LIMITED"}
                      onChange={e => setSubaccountForm(f => ({ ...f, companyType: e.target.value }))}
                      className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-branding-primary"
                    >
                      <option value="MEI">MEI</option>
                      <option value="LIMITED">Limitada (LTDA)</option>
                      <option value="INDIVIDUAL">Empresa Individual</option>
                      <option value="ASSOCIATION">Associação</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setShowSubaccountModal(false); setSubaccountResult(null); }} className="flex-1 rounded-xl">Cancelar</Button>
                  <Button
                    onClick={handleCreateSubaccount}
                    disabled={creatingSubaccount}
                    className="flex-1 bg-branding-primary hover:bg-branding-primary/90 rounded-xl"
                  >
                    {creatingSubaccount ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Criando...</> : "Criar Subconta"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-outline-variant/30 p-5 space-y-6 bg-surface-container-low/30">
          {/* Asaas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-branding-primary" />
                <p className="font-semibold text-on-surface">Asaas</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubaccountModal(true)}
                className="flex items-center gap-1.5 text-xs text-branding-primary border border-branding-primary rounded-lg px-3 py-1.5 hover:bg-branding-primary/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Subconta
              </button>
            </div>
            {cfg?.asaas_subaccount_id && (
              <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Subconta vinculada: <span className="font-mono">{cfg.asaas_subaccount_id}</span>
              </div>
            )}
            <div>
              <Label className="text-xs text-on-surface-variant mb-1 block">API Key da Subconta</Label>
              <div className="relative">
                <Input
                  type={showSecrets["asaas_api_key"] ? "text" : "password"}
                  value={currentForm.asaas_api_key || ""}
                  onChange={e => setField("asaas_api_key", e.target.value)}
                  placeholder="$aas_xxxxxxxxxxxxxxxx"
                  className="pr-10 rounded-xl bg-card text-sm"
                />
                <button type="button" onClick={() => toggleSecret("asaas_api_key")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showSecrets["asaas_api_key"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 italic">Se preenchida, substitui a Chave Mestre para este salão.</p>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleTestAsaas}
                disabled={testingAsaas}
                variant="outline"
                className="w-full rounded-xl border-branding-primary text-branding-primary hover:bg-branding-primary/10"
              >
                {testingAsaas ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                {testingAsaas ? "Testando..." : "Testar Conexão Asaas"}
              </Button>
              {asaasStatus && (
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-xl text-sm",
                  asaasStatus.ok
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/30 text-red-300"
                )}>
                  {asaasStatus.ok
                    ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{asaasStatus.ok ? asaasStatus.message : asaasStatus.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <p className="font-semibold text-on-surface">WhatsApp</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-on-surface-variant mb-1 block">Provedor</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["meta", "evolution", "waha"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setField("whatsapp_provider", p)}
                      className={cn(
                        "py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all",
                        (currentForm.whatsapp_provider || "meta") === p
                          ? "border-[#25D366] bg-[#25D366]/10 text-[#128C7E]"
                          : "border-outline-variant text-muted-foreground hover:border-outline"
                      )}
                    >
                      {p === "meta" ? "Meta / Business" : p === "evolution" ? "Evolution API" : "WAHA"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{providerLabel}</p>
              </div>

              {providerFields.map(field => (
                <div key={field.key}>
                  <Label className="text-xs text-on-surface-variant mb-1 block">{field.label}</Label>
                  {field.secret ? (
                    <div className="relative">
                      <Input
                        type={showSecrets[field.key] ? "text" : "password"}
                        value={currentForm[field.key] || ""}
                        onChange={e => setField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="pr-10 rounded-xl bg-card text-sm"
                      />
                      <button type="button" onClick={() => toggleSecret(field.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <Input
                      value={currentForm[field.key] || ""}
                      onChange={e => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="rounded-xl bg-card text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Test Connection */}
          {cfg?.whatsapp_api_token && (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                variant="outline"
                className="w-full rounded-xl border-[#25D366] text-[#128C7E] hover:bg-[#25D366]/10"
              >
                {testingConnection ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                {testingConnection ? "Testando..." : "Testar Conexão WhatsApp"}
              </Button>
              {connectionStatus && (
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-xl text-sm",
                  connectionStatus.ok
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/30 text-red-300"
                )}>
                  {connectionStatus.ok
                    ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{connectionStatus.ok ? connectionStatus.message : connectionStatus.error}</span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate(currentForm)}
            disabled={saveMutation.isPending}
            className="w-full btn-branding rounded-xl"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  );
}