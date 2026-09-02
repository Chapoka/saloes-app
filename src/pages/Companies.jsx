import { useState, useEffect } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function CopyIdButton({ id }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copiar ID"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-branding-primary transition-colors font-mono bg-background border border-outline-variant rounded px-1.5 py-0.5"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiado!" : id.slice(0, 8) + "…"}
    </button>
  );
}
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit, Trash2, MoreVertical, GitBranch, Copy, Check, LayoutGrid, List, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import CompanyFormModal from "@/components/companies/CompanyFormModal";

const ESTABELECIMENTO_LABELS = {
  barbearia: "Barbearia",
  clinica_estetica: "Clínica / Estética",
  salao_beleza: "Salão de Beleza",
  studio_manicure: "Studio / Manicure",
};

const getEstabelecimentoLabel = (tipo) => ESTABELECIMENTO_LABELS[tipo] || tipo || "";

export default function Companies() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [form, setForm] = useState({
    name: "", cnpj: "", tipo: "", estabelecimento_tipo: "", razao_social: "", situacao_cadastral: "",
    data_abertura: "", capital_social: "", porte: "", cnae_principal: "",
    natureza_juridica: "", cep: "", uf: "", cidade: "", bairro: "",
    logradouro: "", numero: "", complemento: "", phone: "", email: "",
    owner_email: "", owner_name: "", owner_phone: "", owner_cpf: "", active: true, has_branch: false,
  });

  useEffect(() => {
    db.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const rawRole = currentUser?.role;
  const role = rawRole === "teacher" ? "profissional" : rawRole === "user" ? "cliente" : rawRole;
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const userCompanyIds = currentUser?.company_ids?.length ? currentUser.company_ids : (currentUser?.company_id ? [currentUser.company_id] : []);

  const { data: allCompanies = [], isLoading, error: queryError } = useQuery({
    queryKey: ["companies"],
    queryFn: () => db.entities.Company.list("-created_at"),
    onError: (err) => toast.error("Erro ao listar salões: " + (err?.message || "verifique sua conexão")),
  });

  // Filter: super_admin sees all, admin/profissional see only linked companies
  const companies = isSuperAdmin
    ? allCompanies
    : allCompanies.filter(c => userCompanyIds.includes(c.id));

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Company.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (result?.id) queryClient.invalidateQueries({ queryKey: ["userCompany", result.id] });
      toast.success("Salão criado!");
      closeModal();
    },
    onError: (err) => toast.error("Erro ao criar salão: " + (err?.message || "verifique os dados")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Company.update(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["userCompany", variables.id] });
      toast.success("Salão atualizado!");
      closeModal();
    },
    onError: (err) => toast.error("Erro ao atualizar salão: " + (err?.message || "verifique os dados")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Company.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["companies"] }); toast.success("Salão removido!"); },
    onError: (err) => toast.error("Erro ao excluir salão: " + (err?.message || "verifique se não há dependências")),
  });

  const openModal = (company = null) => {
    if (company) {
      setEditing(company);
      setForm({
        name: company.name || "", cnpj: company.cnpj || "", tipo: company.tipo || "",
        estabelecimento_tipo: company.estabelecimento_tipo || "",
        razao_social: company.razao_social || "", situacao_cadastral: company.situacao_cadastral || "",
        data_abertura: company.data_abertura || "", capital_social: company.capital_social || "",
        porte: company.porte || "", cnae_principal: company.cnae_principal || "",
        natureza_juridica: company.natureza_juridica || "", cep: company.cep || "",
        uf: company.uf || "", cidade: company.cidade || "", bairro: company.bairro || "",
        logradouro: company.logradouro || "", numero: company.numero || "",
        complemento: company.complemento || "", phone: company.phone || "",
        email: company.email || "", owner_email: company.owner_email || "",
        owner_name: company.owner_name || "", owner_phone: company.owner_phone || "",
        owner_cpf: company.owner_cpf || "",
        active: company.active !== false, has_branch: company.has_branch || false,
      });
    } else {
      setEditing(null);
      setForm({
        name: "", cnpj: "", tipo: "", estabelecimento_tipo: "", razao_social: "", situacao_cadastral: "",
        data_abertura: "", capital_social: "", porte: "", cnae_principal: "",
        natureza_juridica: "", cep: "", uf: "", cidade: "", bairro: "",
        logradouro: "", numero: "", complemento: "", phone: "", email: "",
        owner_email: "", owner_name: "", owner_phone: "", owner_cpf: "", active: true, has_branch: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSave = () => {
    // Required fields validation
    const requiredFields = [
      { key: "name", label: "Nome Fantasia" },
      { key: "estabelecimento_tipo", label: "Tipo de Estabelecimento" },
    ];
    for (const field of requiredFields) {
      if (!form[field.key] || String(form[field.key]).trim() === "") {
        return toast.error(`O campo "${field.label}" precisa ser preenchido`);
      }
    }
    // Sanitize data: convert formatted strings to proper types
    const COMPANY_COLUMNS = [
      "name", "cnpj", "tipo", "estabelecimento_tipo", "razao_social", "situacao_cadastral",
      "data_abertura", "capital_social", "porte", "cnae_principal", "natureza_juridica",
      "cep", "uf", "cidade", "bairro", "logradouro", "numero", "complemento",
      "phone", "email", "owner_email", "owner_name", "owner_phone", "owner_cpf",
      "active", "has_branch",
      "branding_app_name", "branding_logo_url",
    ];
    const sanitize = (raw) => {
      const out = {};
      // Only include known columns
      for (const key of COMPANY_COLUMNS) {
        if (raw[key] !== undefined && raw[key] !== null) out[key] = raw[key];
      }
      // Clean formatted documents to digits only
      if (out.cnpj) out.cnpj = String(out.cnpj).replace(/\D/g, "");
      if (out.cep) out.cep = String(out.cep).replace(/\D/g, "");
      if (out.phone) out.phone = String(out.phone).replace(/\D/g, "");
      if (out.owner_phone) out.owner_phone = String(out.owner_phone).replace(/\D/g, "");
      // capital_social: "1.000,00" -> 1000.00 (number)
      if (out.capital_social !== "" && out.capital_social != null) {
        const num = Number(String(out.capital_social).replace(/\./g, "").replace(",", "."));
        out.capital_social = isNaN(num) ? null : num;
      } else {
        out.capital_social = null;
      }
      // Empty strings -> undefined (avoid constraint errors)
       ["data_abertura", "email", "owner_email", "tipo", "estabelecimento_tipo",
        "branding_app_name", "branding_logo_url",
       ].forEach(key => {
        if (out[key] === "") out[key] = null;
      });
      return out;
    };
    const payload = sanitize(form);
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-branding-primary to-branding-secondary">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              Salões
            </h1>
            <p className="text-muted-foreground mt-1">{companies.length} salão(s) cadastrado(s)</p>
          </div>
          <div className="flex items-center gap-3">
            {companies.length > 0 && (
              <div className="inline-flex rounded-xl border border-outline-variant bg-card p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "cards" ? "bg-branding-primary text-white" : "text-muted-foreground hover:text-on-surface"}`}
                  title="Visualização em cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "list" ? "bg-branding-primary text-white" : "text-muted-foreground hover:text-on-surface"}`}
                  title="Visualização em lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
            {isSuperAdmin && (
              <Button onClick={() => openModal()} className="btn-branding rounded-xl shadow-lg shadow-branding-primary/20">
                <Plus className="w-5 h-5 mr-2" /> Novo Salão
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-card rounded-2xl p-6 animate-pulse h-40" />)}
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-12 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2">Nenhum salão cadastrado</h3>
            {isSuperAdmin && (
              <>
                <p className="text-muted-foreground mb-6">Crie seu primeiro salão para começar</p>
                <Button onClick={() => openModal()} className="btn-branding rounded-xl">
                  <Plus className="w-5 h-5 mr-2" /> Novo Salão
                </Button>
              </>
            )}
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(company => (
              <div key={company.id} className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 p-6 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-semibold"
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      }}
                    >
                      {company.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface">{company.name}</h3>
                      {company.cnpj && <p className="text-xs text-muted-foreground">{company.cnpj}</p>}
                    </div>
                  </div>
                  {(isSuperAdmin || isAdmin) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openModal(company)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        {isSuperAdmin && (
                          <DropdownMenuItem onClick={() => setDeletingCompany(company)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {company.email && <p>✉️ {company.email}</p>}
                  {company.phone && <p>📞 {company.phone}</p>}
                  {company.owner_name && <p>👤 {company.owner_name}</p>}
                  {company.cidade && <p>📍 {company.cidade}{company.uf ? ` - ${company.uf}` : ""}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={company.active !== false ? "bg-emerald-500/20 text-emerald-300" : "bg-surface-container-low text-muted-foreground"}>
                      {company.active !== false ? "Ativa" : "Inativa"}
                    </Badge>
                    {company.estabelecimento_tipo && (
                      <Badge
                        className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                      >
                        <span
                          className="w-2 h-2 rounded-full bg-primary"
                        />
                        {getEstabelecimentoLabel(company.estabelecimento_tipo)}
                      </Badge>
                    )}
                    {company.has_branch && (
                      <Badge className="bg-blue-500/20 text-blue-300 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> Possui Filial
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-muted-foreground">ID:</span>
                    <CopyIdButton id={company.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-outline-variant/30">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Salão</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Tipo</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">CNPJ</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Contato</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Responsável</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Cidade</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {companies.map(company => (
                    <tr key={company.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                            style={{
                              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            }}
                          >
                            {company.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-on-surface truncate">{company.name}</p>
                            <span className="text-xs text-muted-foreground md:hidden">{company.cnpj || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {company.estabelecimento_tipo ? (
                          <Badge
                            className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                          >
                            <span
                              className="w-2 h-2 rounded-full bg-primary"
                            />
                            {getEstabelecimentoLabel(company.estabelecimento_tipo)}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{company.cnpj || "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5 text-muted-foreground">
                          {company.phone && <p className="truncate">📞 {company.phone}</p>}
                          {company.email && <p className="truncate">✉️ {company.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5 text-muted-foreground">
                          {company.owner_name && <p className="truncate">👤 {company.owner_name}</p>}
                          {company.owner_phone && (
                            <a
                              href={`https://wa.me/55${company.owner_phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#25D366] hover:underline"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {company.cidade ? `${company.cidade}${company.uf ? ` - ${company.uf}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={company.active !== false ? "bg-emerald-500/20 text-emerald-300" : "bg-surface-container-low text-muted-foreground"}>
                            {company.active !== false ? "Ativa" : "Inativa"}
                          </Badge>
                          {company.has_branch && (
                            <Badge className="bg-blue-500/20 text-blue-300 flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(isSuperAdmin || isAdmin) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openModal(company)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <DropdownMenuItem onClick={() => setDeletingCompany(company)} className="text-red-400">
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <CopyIdButton id={company.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CompanyFormModal
          editing={editing}
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir salão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingCompany?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteMutation.mutate(deletingCompany?.id); setDeletingCompany(null); }}
              className="bg-error hover:bg-error/80 rounded-xl"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}