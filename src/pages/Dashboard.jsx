import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/dbClient";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  FileDown,
  Building2,
  Scissors,
  LayoutGrid,
  List,
  Sparkles,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportDialog from "@/components/dashboard/ExportDialog";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfDay, endOfDay, parseISO, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/StatsCard";
import AlertCard from "@/components/dashboard/AlertCard";
import PeriodFilter from "@/components/dashboard/PeriodFilter";
import { useThemeMode } from "@/hooks/useThemeMode";

export default function Dashboard() {
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userReady, setUserReady] = useState(false);
  const [companyView, setCompanyView] = useState("grid");
  const [period, setPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customRange, setCustomRange] = useState(null);

  useEffect(() => {
    db.auth.me().then(u => { setCurrentUser(u); setUserReady(true); }).catch(() => setUserReady(true));
  }, []);

  const rawRole = currentUser?.role;
  const normalizedRole = rawRole === "teacher" ? "profissional" : rawRole === "user" ? "cliente" : rawRole;
  const role = normalizedRole;
  const isSuperAdmin = normalizedRole === "super_admin";
  const isProfissional = normalizedRole === "profissional";
  const isAdmin = normalizedRole === "super_admin" || normalizedRole === "admin";
  const companyId = currentUser?.company_id;

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => db.entities.Company.list(),
    enabled: userReady && isSuperAdmin,
  });

  const userCompany = companies.find(c => c.id === companyId);
  const brandingPalette = userCompany?.branding_palette || "barbearia";
  const theme = useThemeMode(brandingPalette);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-dashboard"],
    queryFn: () => db.entities.User.list(),
    enabled: userReady && isSuperAdmin,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", companyId, isProfissional],
    queryFn: () => isProfissional && companyId && !isSuperAdmin
      ? db.entities.Customer.filter({ company_id: companyId })
      : db.entities.Customer.list(),
    enabled: userReady,
  });

  const { data: customerCompanies = [] } = useQuery({
    queryKey: ["customer-companies-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_companies").select("customer_id, company_id");
      if (error) throw error;
      return data || [];
    },
    enabled: userReady && isSuperAdmin,
  });

  const companyToCustomerIds = {};
  customerCompanies.forEach(cc => {
    if (!companyToCustomerIds[cc.company_id]) companyToCustomerIds[cc.company_id] = new Set();
    companyToCustomerIds[cc.company_id].add(cc.customer_id);
  });

  const customerIds = customers.map(s => s.id);
  const customerIdSet = new Set(customerIds);

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices-all"],
    queryFn: () => db.entities.Invoice.list(),
    enabled: userReady,
  });

  const invoices = (isProfissional && companyId && !isSuperAdmin)
    ? allInvoices.filter(inv => customerIdSet.has(inv.customer_id))
    : allInvoices;

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["appointments-all"],
    queryFn: () => db.entities.Appointment.list("-date", 100),
    enabled: userReady,
  });

  const appointments = (isProfissional && companyId && !isSuperAdmin)
    ? allAppointments.filter(l => customerIdSet.has(l.customer_id))
    : allAppointments;

  const activeCustomers = customers.filter(s => s.status === "active").length;
  const now = new Date();

  const periodRange = (() => {
    if (period === "custom" && customRange?.from) return { start: customRange.from, end: customRange.to || endOfDay(customRange.from) };
    if (period === "today") return { start: startOfDay(now), end: endOfDay(now) };
    if (period === "7d") return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    if (period === "14d") return { start: startOfDay(subDays(now, 13)), end: endOfDay(now) };
    if (period === "year") return { start: startOfYear(new Date(selectedYear, 0, 1)), end: endOfYear(new Date(selectedYear, 0, 1)) };
    return { start: startOfMonth(now), end: endOfMonth(now) };
  })();

  const monthlyRevenue = invoices
    .filter(inv => {
      if (!inv.payment_date || inv.status !== "received") return false;
      const payDate = parseISO(inv.payment_date);
      return isAfter(payDate, periodRange.start) && isBefore(payDate, periodRange.end);
    })
    .reduce((sum, inv) => sum + (inv.value || 0), 0);

  const todayAppointments = appointments.filter(l => l.date === format(now, "yyyy-MM-dd")).length;

  const monthlyTips = appointments
    .filter(l => {
      if (!l.tip_amount || l.tip_amount <= 0) return false;
      const appointmentDate = parseISO(l.date);
      return isAfter(appointmentDate, periodRange.start) && isBefore(appointmentDate, periodRange.end);
    })
    .reduce((sum, l) => sum + (Number(l.tip_amount) || 0), 0);

  const lowCreditCustomers = customers.filter(s =>
    s.status === "active" && (s.current_credits || 0) <= 1
  );

  const pendingInvoices = invoices.filter(inv => inv.status === "pending");

  const companyStats = isSuperAdmin ? companies.filter(c => c.active !== false).map(company => {
    const junctionCustomerIds = companyToCustomerIds[company.id] || new Set();
    const companyCustomers = customers.filter(s => {
      if (junctionCustomerIds.has(s.id)) return true;
      return s.company_id === company.id;
    });
    const companyCustomerIds = new Set(companyCustomers.map(s => s.id));
    const companyInvoices = allInvoices.filter(inv => companyCustomerIds.has(inv.customer_id));
    const companyMonthlyRevenue = companyInvoices
      .filter(inv => {
        if (!inv.payment_date || inv.status !== "received") return false;
        const payDate = parseISO(inv.payment_date);
        return isAfter(payDate, periodRange.start) && isBefore(payDate, periodRange.end);
      })
      .reduce((sum, inv) => sum + (inv.value || 0), 0);
    return {
      ...company,
      customerCount: companyCustomers.length,
      activeCustomers: companyCustomers.filter(s => s.status === "active").length,
      teacherCount: allUsers.filter(u => (u.role === "profissional" || u.role === "teacher") && u.company_id === company.id && u.active !== false).length,
      totalTeachers: allUsers.filter(u => (u.role === "profissional" || u.role === "teacher") && u.company_id === company.id).length,
      monthlyRevenue: companyMonthlyRevenue,
      pendingInvoices: companyInvoices.filter(inv => inv.status === "pending").length,
    };
  }) : [];

  const todaySchedule = appointments
    .filter(l => l.date === format(now, "yyyy-MM-dd"))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: theme.contentBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* Hero Section */}
        <div className="relative mb-8 rounded-3xl overflow-hidden animate-fade-in" style={{
          background: theme.heroOverlay,
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: theme.isDark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: theme.isDark
              ? "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)"
              : "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }} />
          {/* Accent glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 pointer-events-none opacity-60" style={{
            background: `radial-gradient(circle, ${theme.isDark ? "rgba(200,169,126,0.12)" : "rgba(219,39,119,0.08)"}, transparent 70%)`,
          }} />

          <div className="relative p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                    background: theme.isDark ? "rgba(200,169,126,0.15)" : "rgba(219,39,119,0.1)",
                  }}>
                    <Sparkles className="w-4 h-4" style={{ color: theme.isDark ? "#C8A97E" : "#DB2777" }} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.cardTextMuted }}>
                    {role === "super_admin" ? "Super Admin" : role === "admin" ? "Painel Administrativo" : "Meu Painel"}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight" style={{ color: theme.cardText }}>
                  {greeting}, <span style={{ color: theme.isDark ? "#C8A97E" : "#DB2777" }}>{currentUser?.full_name?.split(" ")[0] || "usuário"}</span>
                </h1>
                <p className="flex items-center gap-2 text-sm" style={{ color: theme.cardTextMuted }}>
                  <Calendar className="w-4 h-4" />
                  {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <PeriodFilter
                invoices={allInvoices}
                period={period}
                setPeriod={setPeriod}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                customRange={customRange}
                setCustomRange={setCustomRange}
              />
            </div>

            {/* Quick Stats Row */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Faturamento", value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: "#10B981", bgColor: "rgba(16,185,129,0.1)" },
                { label: "Clientes", value: activeCustomers, icon: Users, color: theme.isDark ? "#C8A97E" : "#DB2777", bgColor: theme.isDark ? "rgba(200,169,126,0.1)" : "rgba(219,39,119,0.1)" },
                { label: "Serviços Hoje", value: todayAppointments, icon: Scissors, color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)" },
                { label: "Gorjetas", value: `R$ ${monthlyTips.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: Sparkles, color: "#F59E0B", bgColor: "rgba(245,158,11,0.1)" },
                { label: "Pendentes", value: pendingInvoices.length, icon: Clock, color: "#EF4444", bgColor: "rgba(239,68,68,0.1)" },
              ].map((stat, i) => (
                <button
                  key={i}
                  className="p-4 rounded-2xl text-left card-hover animate-fade-in"
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    boxShadow: theme.isDark ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.04)",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: stat.bgColor }}>
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: theme.cardTextMuted }}>{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: theme.cardText }}>{stat.value}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Faturamento"
            value={`R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle={period === "custom" && customRange?.from ? `${format(customRange.from, "dd/MM")}${customRange.to ? ` – ${format(customRange.to, "dd/MM")}` : ""}` : period === "year" ? String(selectedYear) : period === "today" ? "Hoje" : period === "7d" ? "7 dias" : period === "14d" ? "14 dias" : "Mês atual"}
            icon={DollarSign}
            onClick={() => navigate(createPageUrl("Invoices?status=received"))}
            theme={theme}
          />
          <StatsCard
            title="Clientes Ativos"
            value={activeCustomers}
            subtitle={`de ${customers.length} total`}
            icon={Users}
            onClick={() => navigate(createPageUrl("Clientes"))}
            theme={theme}
          />
          <StatsCard
            title="Serviços Hoje"
            value={todayAppointments}
            subtitle="agendadas para hoje"
            icon={Calendar}
            onClick={() => navigate(createPageUrl("Schedule?view=day"))}
            theme={theme}
          />
          <StatsCard
            title="Gorjetas no Mês"
            value={`R$ ${monthlyTips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle={`${appointments.filter(l => l.tip_amount > 0).length} serviços com gorjeta`}
            icon={Sparkles}
            theme={theme}
          />
          <StatsCard
            title="Cobranças Pendentes"
            value={pendingInvoices.length}
            subtitle={`R$ ${pendingInvoices.reduce((s, i) => s + (i.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            onClick={() => navigate(createPageUrl("Invoices?status=pending"))}
            theme={theme}
          />
        </div>

        {/* Companies Summary - Super Admin only */}
        {isSuperAdmin && companyStats.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.cardText }}>
                <Building2 className="w-5 h-5" style={{ color: theme.isDark ? "#D4A574" : "#EC4899" }} />
                Resumo por Salão
              </h2>
              <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ border: `1px solid ${theme.cardBorder}` }}>
                <button onClick={() => setCompanyView("grid")} className="px-3 py-2 transition-colors" style={{
                  background: companyView === "grid" ? (theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") : "transparent",
                  color: theme.cardText,
                }}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setCompanyView("list")} className="px-3 py-2 transition-colors" style={{
                  background: companyView === "list" ? (theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") : "transparent",
                  color: theme.cardText,
                }}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {companyView === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyStats.map(company => (
                  <div key={company.id} className="rounded-2xl p-5 transition-all hover:shadow-lg" style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    boxShadow: theme.isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl" style={{ background: `${theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}` }}>
                        <Building2 className="w-5 h-5" style={{ color: theme.isDark ? "#D4A574" : "#EC4899" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: theme.cardText }}>{company.name}</p>
                        <p className="text-xs" style={{ color: theme.cardTextMuted }}>{company.active ? "Ativa" : "Inativa"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => navigate(createPageUrl(`Customers?company_id=${company.id}`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      }}>
                        <Users className="w-4 h-4 mx-auto mb-1" style={{ color: theme.isDark ? "#D4A574" : "#EC4899" }} />
                        <p className="text-xl font-bold" style={{ color: theme.cardText }}>{company.activeCustomers}</p>
                        <p className="text-xs" style={{ color: theme.cardTextMuted }}>Clientes ativos</p>
                      </button>
                      <button onClick={() => navigate(createPageUrl(`Settings?company_id=${company.id}`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      }}>
                        <Scissors className="w-4 h-4 mx-auto mb-1" style={{ color: "#8B5CF6" }} />
                        <p className="text-xl font-bold" style={{ color: theme.cardText }}>{company.teacherCount}</p>
                        <p className="text-xs" style={{ color: theme.cardTextMuted }}>Profissionais</p>
                      </button>
                      <button onClick={() => navigate(createPageUrl(`Invoices?company_id=${company.id}`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: theme.isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)",
                      }}>
                        <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                        <p className="text-sm font-bold" style={{ color: theme.cardText }}>R$ {company.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs" style={{ color: theme.cardTextMuted }}>Faturamento/mês</p>
                      </button>
                      <button onClick={() => navigate(createPageUrl(`Invoices?company_id=${company.id}&status=pending`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: theme.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.06)",
                      }}>
                        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                        <p className="text-xl font-bold" style={{ color: theme.cardText }}>{company.pendingInvoices}</p>
                        <p className="text-xs" style={{ color: theme.cardTextMuted }}>Cobr. pendentes</p>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: theme.isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
              }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderBottom: `1px solid ${theme.cardBorder}` }}>
                        <th className="text-left px-5 py-3 font-semibold" style={{ color: theme.cardTextMuted }}>Salão</th>
                        <th className="text-center px-4 py-3 font-semibold" style={{ color: theme.cardTextMuted }}>Clientes Ativos</th>
                        <th className="text-center px-4 py-3 font-semibold" style={{ color: theme.cardTextMuted }}>Profissionais</th>
                        <th className="text-center px-4 py-3 font-semibold" style={{ color: theme.cardTextMuted }}>Faturamento/mês</th>
                        <th className="text-center px-4 py-3 font-semibold" style={{ color: theme.cardTextMuted }}>Cobr. Pendentes</th>
                        <th className="text-center px-4 py-3 font-semibold" style={{ color: theme.cardTextMuted }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyStats.map(company => (
                        <tr key={company.id} className="transition-colors" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-lg" style={{ background: `${theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}` }}>
                                <Building2 className="w-4 h-4" style={{ color: theme.isDark ? "#D4A574" : "#EC4899" }} />
                              </div>
                              <span className="font-medium" style={{ color: theme.cardText }}>{company.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold" style={{ color: theme.cardText }}>{company.activeCustomers}</span>
                            <span className="text-xs ml-1" style={{ color: theme.cardTextMuted }}>/ {company.customerCount}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold" style={{ color: theme.cardText }}>{company.teacherCount}</span>
                            <span className="text-xs ml-1" style={{ color: theme.cardTextMuted }}>/ {company.totalTeachers}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-emerald-500">R$ {company.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              company.pendingInvoices > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                            )}>
                              {company.pendingInvoices}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              company.active ? "bg-emerald-500/20 text-emerald-400" : (theme.isDark ? "bg-white/10 text-gray-500" : "bg-gray-100 text-gray-500")
                            )}>
                              {company.active ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Column */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.cardText }}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertas
            </h2>

            {lowCreditCustomers.length === 0 && pendingInvoices.length === 0 ? (
              <div className="rounded-xl p-4 text-center" style={{
                background: theme.isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)",
                border: `1px solid ${theme.isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)"}`,
              }}>
                <p className="font-medium text-emerald-500">Tudo em ordem!</p>
                <p className="text-sm mt-1" style={{ color: theme.cardTextMuted }}>Nenhum alerta no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowCreditCustomers.slice(0, 5).map(customer => (
                  <AlertCard
                    key={customer.id}
                    type="warning"
                    alertType="credits"
                    title={customer.name}
                    message={`Apenas ${customer.current_credits || 0} crédito(s) restante(s)`}
                    action="Renovar plano"
                    onAction={() => navigate(createPageUrl(`Customers?id=${customer.id}`))}
                  />
                ))}
                {pendingInvoices.slice(0, 3).map(invoice => (
                  <AlertCard
                    key={invoice.id}
                    type="info"
                    alertType="payment"
                    title={invoice.customer_name || "Cobrança Pendente"}
                    message={`R$ ${invoice.value?.toFixed(2)} - Vencimento: ${invoice.due_date ? format(parseISO(invoice.due_date), "dd/MM") : "N/A"}`}
                    action="Ver detalhes"
                    onAction={() => navigate(createPageUrl("Invoices"))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.cardText }}>
                <Calendar className="w-5 h-5" style={{ color: theme.isDark ? "#D4A574" : "#EC4899" }} />
                Agenda de Hoje
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl("Schedule"))}
                className="text-sm font-medium"
                style={{ color: theme.isDark ? "#D4A574" : "#EC4899" }}
              >
                Ver completa
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: theme.isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              {todaySchedule.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: theme.cardTextMuted, opacity: 0.4 }} />
                  <p className="font-medium" style={{ color: theme.cardTextMuted }}>Nenhum serviço agendado para hoje</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => navigate(createPageUrl("Schedule"))}
                      className="flex-1 rounded-xl text-white"
                      style={{ background: theme.sidebarActive }}
                    >
                      Agendar serviço
                    </Button>
                    <Button
                      onClick={() => setShowExport(true)}
                      variant="outline"
                      className="rounded-xl"
                      style={{ borderColor: theme.cardBorder, color: theme.cardText }}
                    >
                      <FileDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: theme.cardBorder }}>
                  {todaySchedule.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-4 transition-colors flex items-center gap-4 cursor-pointer"
                      style={{ borderColor: theme.cardBorder }}
                      onClick={() => navigate(createPageUrl("Schedule?view=day"))}
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold" style={{ color: theme.cardText }}>{appointment.start_time}</p>
                        <p className="text-xs" style={{ color: theme.cardTextMuted }}>{appointment.duration_mins}min</p>
                      </div>

                      <div className="w-1 h-12 rounded-full" style={{ background: theme.sidebarActive }} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: theme.cardText }}>{appointment.customer_name}</p>
                        <p className="text-sm capitalize" style={{ color: theme.cardTextMuted }}>
                          {appointment.service_category === "corte" ? "Corte" : "Barba"}
                        </p>
                      </div>

                      <div className="px-3 py-1 rounded-full text-xs font-medium" style={{
                        background: appointment.status === "present" ? "rgba(16,185,129,0.15)" :
                          appointment.status === "absent" ? "rgba(239,68,68,0.15)" :
                          appointment.status === "confirmed" ? `${theme.isDark ? "rgba(212,165,116,0.15)" : "rgba(236,72,153,0.15)"}` :
                          appointment.status === "cancelled" ? (theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") :
                          `${theme.isDark ? "rgba(212,165,116,0.15)" : "rgba(236,72,153,0.15)"}`,
                        color: appointment.status === "present" ? "#10B981" :
                          appointment.status === "absent" ? "#EF4444" :
                          appointment.status === "confirmed" ? (theme.isDark ? "#D4A574" : "#EC4899") :
                          appointment.status === "cancelled" ? theme.cardTextMuted :
                          (theme.isDark ? "#D4A574" : "#EC4899"),
                      }}>
                        {appointment.status === "present" ? "Presente" :
                         appointment.status === "absent" ? "Falta" :
                         appointment.status === "confirmed" ? "Confirmada" :
                         appointment.status === "cancelled" ? "Cancelada" :
                         "Agendada"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      </div>
    </div>
  );
}
