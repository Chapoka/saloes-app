import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const QUICK_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

export default function PeriodFilter({ invoices = [], period, setPeriod, selectedYear, setSelectedYear, customRange, setCustomRange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  // Derive available years from invoices
  const currentYear = new Date().getFullYear();
  const yearsFromInvoices = [...new Set(
    invoices
      .filter(inv => inv.payment_date || inv.created_at)
      .map(inv => new Date(inv.payment_date || inv.created_at).getFullYear())
  )].filter(y => !isNaN(y));

  const availableYears = [...new Set([currentYear, currentYear - 1, currentYear - 2, ...yearsFromInvoices])].sort((a, b) => b - a);

  const handleQuickPeriod = (value) => {
    setPeriod(value);
    setCustomRange(null);
  };

  const handleCalendarSelect = (range) => {
    if (range?.from) {
      setCustomRange({
        from: startOfDay(range.from),
        to: endOfDay(range.to || range.from),
      });
      setPeriod("custom");
      if (range.to) setCalendarOpen(false);
    }
  };

  const customLabel = customRange?.from
    ? customRange.to && customRange.to.getTime() !== customRange.from.getTime()
      ? `${format(customRange.from, "dd/MM")} – ${format(customRange.to, "dd/MM")}`
      : format(customRange.from, "dd/MM/yyyy")
    : "Calendário";

  return (
    <div className="flex items-center gap-2 flex-wrap self-start">
      {/* Quick period buttons */}
      <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {QUICK_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleQuickPeriod(opt.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              period === opt.value
                ? "bg-branding-primary text-white"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Year selector — shown when "Ano" is active */}
      {period === "year" && (
        <Popover open={yearOpen} onOpenChange={setYearOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              {selectedYear}
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-2 w-28" align="end">
            <div className="flex flex-col gap-1">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setYearOpen(false); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium text-left transition-colors",
                    selectedYear === year ? "bg-branding-primary text-white" : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Calendar range picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 border rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition-colors",
              period === "custom"
                ? "bg-branding-primary text-white border-branding-primary"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            {period === "custom" ? customLabel : "Calendário"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="end">
          <Calendar
            mode="range"
            selected={
              customRange
                ? { from: customRange.from, to: customRange.to }
                : undefined
            }
            onSelect={handleCalendarSelect}
            locale={ptBR}
            numberOfMonths={1}
          />
          {period === "custom" && (
            <div className="p-3 border-t">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => { setCustomRange(null); setPeriod("month"); setCalendarOpen(false); }}
              >
                Limpar seleção
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}