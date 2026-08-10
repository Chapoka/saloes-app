import { useState } from "react";
import { db } from "@/api/dbClient";
import {
  X, Plus, RefreshCw, Loader2, AlertCircle, Trash2, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const emptyForm = {
  name: "",
  email: "",
  cpfCnpj: "",
  companyType: "MEI",
  phone: "",
  mobilePhone: "",
  address: "",
  addressNumber: "",
  province: "",
  postalCode: "",
};

export default function AsaasSubaccountsModal({ company, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subaccounts, setSubaccounts] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const fetchSubaccounts = async () => {
    setLoading(true);
    setFetchError(null);
    const res = await db.functions.invoke("asaasSubaccounts", {
      action: "list",
      company_id: company.id,
    });
    setLoading(false);
    if (res.data?.error) { setFetchError(res.data.error); return; }
    setSubaccounts(res.data?.data || res.data?.object || []);
  };

  const handleCreate = async () => {
    if (!form.name || !form.cpfCnpj) {
      toast.error("Nome e CPF/CNPJ são obrigatórios");
      return;
    }
    setLoading(true);
    const res = await db.functions.invoke("asaasSubaccounts", {
      action: "create",
      company_id: company.id,
      data: form,
    });
    setLoading(false);
    if (res.data?.error || res.data?.errors) {
      toast.error(res.data?.error || JSON.stringify(res.data?.errors));
      return;
    }
    toast.success("Subconta criada com sucesso!");
    setShowCreate(false);
    setForm(emptyForm);
    fetchSubaccounts();
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta subconta?")) return;
    setLoading(true);
    const res = await db.functions.invoke("asaasSubaccounts", {
      action: "delete",
      company_id: company.id,
      subaccount_id: id,
    });
    setLoading(false);
    toast.success("Subconta excluída");
    fetchSubaccounts();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-branding-primary" />
            Subcontas Asaas — {company.name}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 mb-5">
          <Button onClick={fetchSubaccounts} variant="outline" disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Listar Subcontas
          </Button>
          <Button onClick={() => setShowCreate(s => !s)} className="rounded-xl bg-branding-primary hover:bg-branding-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Subconta
          </Button>
        </div>

        {fetchError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />{fetchError}
          </div>
        )}

        {showCreate && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3 border border-gray-200">
            <p className="font-semibold text-gray-700 mb-2">Nova Subconta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "name", label: "Nome completo *" },
                { key: "email", label: "Email *" },
                { key: "cpfCnpj", label: "CPF/CNPJ *" },
                { key: "phone", label: "Telefone" },
                { key: "mobilePhone", label: "Celular" },
                { key: "postalCode", label: "CEP" },
                { key: "address", label: "Endereço" },
                { key: "addressNumber", label: "Número" },
                { key: "province", label: "Bairro" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="rounded-xl text-sm"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Salão</Label>
                <select
                  value={form.companyType}
                  onChange={e => setForm(p => ({ ...p, companyType: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="MEI">MEI</option>
                  <option value="LIMITED">Ltda</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ASSOCIATION">Associação</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl flex-1">Cancelar</Button>
              <Button onClick={handleCreate} disabled={loading} className="rounded-xl flex-1 bg-branding-primary hover:bg-branding-primary/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar
              </Button>
            </div>
          </div>
        )}

        {subaccounts !== null && (
          <div className="space-y-3">
            {subaccounts.length === 0 ? (
              <p className="text-center text-gray-500 py-6">Nenhuma subconta encontrada</p>
            ) : subaccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{acc.name}</p>
                  <p className="text-sm text-gray-500">{acc.email} · CPF/CNPJ: {acc.cpfCnpj}</p>
                  <p className="text-xs text-gray-500">ID: {acc.id} · {acc.accountStatus === "ACTIVE" ? "✅ Ativo" : acc.accountStatus}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}