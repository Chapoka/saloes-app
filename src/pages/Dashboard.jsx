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
  const brandingPalette = userCompany?.branding_palette || "barbearia_amber";
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

  const revenueGrowth = "+12%";
  const appointmentsGrowth = "+5%";
  const clientsGrowth = "+18%";

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Faturamento Card */}
          <div
            className="rounded-xl p-6 shadow-lg border relative overflow-hidden group animate-fade-in"
            style={{
              background: "#1E293B",
              borderColor: "rgba(70, 69, 84, 0.3)",
              animationDelay: "100ms"
            }}
          >
            <div
              className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl transition-colors group-hover:scale-110"
              style={{ background: "rgba(255, 185, 95, 0.1)" }}
            />
            <div className="flex justify-between items-center z-10 relative">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#c7c4d7]">Faturamento</span>
              <span
                className="text-2xl text-[#ffb95f]"
                style={{ fontFamily: "Material Symbols Outlined", fontVariationSettings: "'FILL' 1" }}
              >
                payments
              </span>
            </div>
            <div className="z-10 relative mt-2">
              <h3 className="text-3xl font-extrabold text-[#dae2fd]" style={{ letterSpacing: "-0.025em" }}>
                R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </h3>
              <p className="text-sm text-[#ffb95f] flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">trending_up</span> {revenueGrowth} esta semana
              </p>
            </div>
          </div>

          {/* Agendamentos Card */}
          <div
            className="rounded-xl p-6 shadow-lg border relative overflow-hidden group animate-fade-in"
            style={{
              background: "#1E293B",
              borderColor: "rgba(70, 69, 84, 0.3)",
              animationDelay: "200ms"
            }}
          >
            <div
              className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl transition-colors group-hover:scale-110"
              style={{ background: "rgba(192, 193, 255, 0.1)" }}
            />
            <div className="flex justify-between items-center z-10 relative">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#c7c4d7]">Agendamentos</span>
              <span
                className="text-2xl text-[#c0c1ff]"
                style={{ fontFamily: "Material Symbols Outlined", fontVariationSettings: "'FILL' 1" }}
              >
                event_available
              </span>
            </div>
            <div className="z-10 relative mt-2">
              <h3 className="text-3xl font-extrabold text-[#dae2fd]" style={{ letterSpacing: "-0.025em" }}>
                {todayAppointments + monthlyTips > 0 ? Math.floor(monthlyTips) + todayAppointments : todayAppointments}
              </h3>
              <p className="text-sm text-[#ffb95f] flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">trending_up</span> {appointmentsGrowth} esta semana
              </p>
            </div>
          </div>

          {/* Clientes Card */}
          <div
            className="rounded-xl p-6 shadow-lg border relative overflow-hidden group animate-fade-in"
            style={{
              background: "#1E293B",
              borderColor: "rgba(70, 69, 84, 0.3)",
              animationDelay: "300ms"
            }}
          >
            <div
              className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl transition-colors group-hover:scale-110"
              style={{ background: "rgba(87, 27, 193, 0.1)" }}
            />
            <div className="flex justify-between items-center z-10 relative">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#c7c4d7]">Novos Clientes</span>
              <span
                className="text-2xl text-[#d0bcff]"
                style={{ fontFamily: "Material Symbols Outlined", fontVariationSettings: "'FILL' 1" }}
              >
                person_add
              </span>
            </div>
            <div className="z-10 relative mt-2">
              <h3 className="text-3xl font-extrabold text-[#dae2fd]" style={{ letterSpacing: "-0.025em" }}>
                {activeCustomers}
              </h3>
              <p className="text-sm text-[#ffb95f] flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">trending_up</span> {clientsGrowth} esta semana
              </p>
            </div>
          </div>
        </div>

        {/* Chart + Upcoming Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div
            className="lg:col-span-2 rounded-xl p-6 shadow-lg border animate-fade-in"
            style={{
              background: "#1E293B",
              borderColor: "rgba(70, 69, 84, 0.3)",
              animationDelay: "200ms"
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#dae2fd]">Receita Semanal</h3>
              <button className="text-[#c7c4d7] hover:text-[#c0c1ff] transition-colors flex items-center gap-1 text-sm font-semibold">
                Filtrar <span className="material-symbols-outlined text-sm">filter_list</span>
              </button>
            </div>
            {/* Chart Placeholder */}
            <div
              className="h-64 w-full rounded-lg border flex items-center justify-center relative overflow-hidden"
              style={{
                background: "#131b2e",
                borderColor: "rgba(70, 69, 84, 0.2)"
              }}
            >
              <div
                className="absolute bottom-0 w-full h-32"
                style={{ background: "linear-gradient(to top, rgba(192, 193, 255, 0.2), transparent)" }}
              />
              <span className="text-sm text-[#c7c4d7] z-10">Gráfico de Área (Placeholder)</span>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div
            className="rounded-xl p-6 shadow-lg border animate-fade-in flex flex-col"
            style={{
              background: "#1E293B",
              borderColor: "rgba(70, 69, 84, 0.3)",
              animationDelay: "300ms"
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#dae2fd]">Próximos</h3>
              <button
                className="text-[#c0c1ff] hover:text-[#8083ff] transition-colors text-sm font-semibold"
                onClick={() => navigate(createPageUrl("Schedule"))}
              >
                Ver todos
              </button>
            </div>
            <div className="flex flex-col gap-4 flex-grow">
              {todaySchedule.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <span
                      className="text-5xl text-[#908fa0] mx-auto block mb-3"
                      style={{ fontFamily: "Material Symbols Outlined" }}
                    >
                      event_busy
                    </span>
                    <p className="text-sm text-[#c7c4d7]">Nenhum serviço agendado para hoje</p>
                  </div>
                </div>
              ) : (
                todaySchedule.slice(0, 5).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-3 rounded-lg transition-colors border border-transparent hover:border-[rgba(70,69,84,0.3)]"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(45, 52, 73, 0.5)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{
                        background: "linear-gradient(135deg, #571bc1, #c0c1ff)",
                        color: "#FFFFFF"
                      }}
                    >
                      {appointment.customer_name?.charAt(0) || "C"}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-semibold text-[#dae2fd] truncate">{appointment.customer_name}</h4>
                      <p className="text-xs text-[#c7c4d7]">{appointment.service_category === "corte" ? "Corte" : "Barba"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#c0c1ff]">{appointment.start_time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Companies Summary - Super Admin only */}
        {isSuperAdmin && companyStats.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-[#dae2fd]">
                <span className="material-symbols-outlined text-[#ffb95f]">business</span>
                Resumo por Salão
              </h2>
              <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(70, 69, 84, 0.3)" }}>
                <button onClick={() => setCompanyView("grid")} className="px-3 py-2 transition-colors" style={{
                  background: companyView === "grid" ? "rgba(192, 193, 255, 0.1)" : "transparent",
                  color: "#dae2fd",
                }}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setCompanyView("list")} className="px-3 py-2 transition-colors" style={{
                  background: companyView === "list" ? "rgba(192, 193, 255, 0.1)" : "transparent",
                  color: "#dae2fd",
                }}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {companyView === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyStats.map(company => (
                  <div key={company.id} className="rounded-xl p-5 transition-all hover:scale-[1.02]" style={{
                    background: "#1E293B",
                    border: "1px solid rgba(70, 69, 84, 0.3)",
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl" style={{ background: "rgba(87, 27, 193, 0.15)" }}>
                        <span className="material-symbols-outlined text-[#c0c1ff]">business</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-[#dae2fd]">{company.name}</p>
                        <p className="text-xs text-[#c7c4d7]">{company.active ? "Ativa" : "Inativa"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => navigate(createPageUrl(`Customers?company_id=${company.id}`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: "rgba(45, 52, 73, 0.5)",
                      }}>
                        <span className="material-symbols-outlined text-[#c0c1ff] text-sm block mb-1">group</span>
                        <p className="text-xl font-bold text-[#dae2fd]">{company.activeCustomers}</p>
                        <p className="text-xs text-[#c7c4d7]">Clientes ativos</p>
                      </button>
                      <button onClick={() => navigate(createPageUrl(`Settings?company_id=${company.id}`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: "rgba(45, 52, 73, 0.5)",
                      }}>
                        <span className="material-symbols-outlined text-[#d0bcff] text-sm block mb-1">content_cut</span>
                        <p className="text-xl font-bold text-[#dae2fd]">{company.teacherCount}</p>
                        <p className="text-xs text-[#c7c4d7]">Profissionais</p>
                      </button>
                      <button onClick={() => navigate(createPageUrl(`Invoices?company_id=${company.id}`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: "rgba(45, 52, 73, 0.5)",
                      }}>
                        <span className="material-symbols-outlined text-[#ffb95f] text-sm block mb-1">payments</span>
                        <p className="text-sm font-bold text-[#dae2fd]">R$ {company.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-[#c7c4d7]">Faturamento/mês</p>
                      </button>
                      <button onClick={() => navigate(createPageUrl(`Invoices?company_id=${company.id}&status=pending`))} className="rounded-xl p-3 text-center transition-colors cursor-pointer" style={{
                        background: "rgba(45, 52, 73, 0.5)",
                      }}>
                        <span className="material-symbols-outlined text-[#ffb4ab] text-sm block mb-1">receipt_long</span>
                        <p className="text-xl font-bold text-[#dae2fd]">{company.pendingInvoices}</p>
                        <p className="text-xs text-[#c7c4d7]">Cobr. pendentes</p>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{
                background: "#1E293B",
                border: "1px solid rgba(70, 69, 84, 0.3)",
              }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(45, 52, 73, 0.3)", borderBottom: "1px solid rgba(70, 69, 84, 0.3)" }}>
                        <th className="text-left px-5 py-3 font-semibold text-[#c7c4d7]">Salão</th>
                        <th className="text-center px-4 py-3 font-semibold text-[#c7c4d7]">Clientes Ativos</th>
                        <th className="text-center px-4 py-3 font-semibold text-[#c7c4d7]">Profissionais</th>
                        <th className="text-center px-4 py-3 font-semibold text-[#c7c4d7]">Faturamento/mês</th>
                        <th className="text-center px-4 py-3 font-semibold text-[#c7c4d7]">Cobr. Pendentes</th>
                        <th className="text-center px-4 py-3 font-semibold text-[#c7c4d7]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyStats.map(company => (
                        <tr key={company.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(70, 69, 84, 0.3)" }}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-lg" style={{ background: "rgba(87, 27, 193, 0.15)" }}>
                                <span className="material-symbols-outlined text-[#c0c1ff] text-sm">business</span>
                              </div>
                              <span className="font-medium text-[#dae2fd]">{company.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-[#dae2fd]">{company.activeCustomers}</span>
                            <span className="text-xs ml-1 text-[#c7c4d7]">/ {company.customerCount}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-[#dae2fd]">{company.teacherCount}</span>
                            <span className="text-xs ml-1 text-[#c7c4d7]">/ {company.totalTeachers}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-[#ffb95f]">R$ {company.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              company.pendingInvoices > 0 ? "bg-[#93000a]/20 text-[#ffb4ab]" : "bg-[#10B981]/20 text-[#10B981]"
                            )}>
                              {company.pendingInvoices}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              company.active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[rgba(255,255,255,0.1)] text-[#908fa0]"
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

        {/* Alerts + Today Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Alerts Column */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-[#dae2fd]">
              <span className="material-symbols-outlined text-[#ffb95f]">warning</span>
              Alertas
            </h2>

            {lowCreditCustomers.length === 0 && pendingInvoices.length === 0 ? (
              <div className="rounded-xl p-4 text-center" style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}>
                <p className="font-medium text-[#10B981]">Tudo em ordem!</p>
                <p className="text-sm mt-1 text-[#c7c4d7]">Nenhum alerta no momento</p>
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
              <h2 className="text-lg font-bold flex items-center gap-2 text-[#dae2fd]">
                <span className="material-symbols-outlined text-[#c0c1ff]">calendar_month</span>
                Agenda de Hoje
              </h2>
              <button
                className="text-[#c0c1ff] hover:text-[#8083ff] transition-colors text-sm font-semibold flex items-center gap-1"
                onClick={() => navigate(createPageUrl("Schedule"))}
              >
                Ver completa
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <div className="rounded-xl overflow-hidden" style={{
              background: "#1E293B",
              border: "1px solid rgba(70, 69, 84, 0.3)",
            }}>
              {todaySchedule.length === 0 ? (
                <div className="p-8 text-center">
                  <span
                    className="text-5xl text-[#908fa0] mx-auto block mb-3"
                    style={{ fontFamily: "Material Symbols Outlined", opacity: 0.4 }}
                  >
                    event_busy
                  </span>
                  <p className="font-medium text-[#c7c4d7]">Nenhum serviço agendado para hoje</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => navigate(createPageUrl("Schedule"))}
                      className="flex-1 rounded-xl text-white py-2 px-4 font-semibold text-sm"
                      style={{ background: "linear-gradient(135deg, #494bd6 0%, #571bc1 100%)" }}
                    >
                      Agendar serviço
                    </button>
                    <button
                      onClick={() => setShowExport(true)}
                      className="rounded-xl py-2 px-4 font-semibold text-sm"
                      style={{
                        border: "1px solid rgba(70, 69, 84, 0.3)",
                        color: "#dae2fd"
                      }}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {todaySchedule.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-4 transition-colors flex items-center gap-4 cursor-pointer"
                      style={{ borderBottom: "1px solid rgba(70, 69, 84, 0.3)" }}
                      onClick={() => navigate(createPageUrl("Schedule?view=day"))}
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold text-[#dae2fd]">{appointment.start_time}</p>
                        <p className="text-xs text-[#c7c4d7]">{appointment.duration_mins}min</p>
                      </div>

                      <div className="w-1 h-12 rounded-full" style={{ background: "linear-gradient(135deg, #494bd6, #571bc1)" }} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-[#dae2fd]">{appointment.customer_name}</p>
                        <p className="text-sm capitalize text-[#c7c4d7]">
                          {appointment.service_category === "corte" ? "Corte" : "Barba"}
                        </p>
                      </div>

                      <div className="px-3 py-1 rounded-full text-xs font-medium" style={{
                        background: appointment.status === "present" ? "rgba(16,185,129,0.15)" :
                          appointment.status === "absent" ? "rgba(255,180,171,0.15)" :
                          "rgba(192,193,255,0.15)",
                        color: appointment.status === "present" ? "#10B981" :
                          appointment.status === "absent" ? "#ffb4ab" :
                          "#c0c1ff",
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
