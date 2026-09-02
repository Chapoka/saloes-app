import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function MiniCalendar({ 
  currentDate, 
  onDateChange, 
  onDateSelect, 
  selectedDate, 
  appointments = [] 
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  
  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= monthEnd) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  const hasAppointments = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.some(a => a.date === dateStr);
  };

  const handlePrevMonth = () => onDateChange(addMonths(currentDate, -1));
  const handleNextMonth = () => onDateChange(addMonths(currentDate, 1));

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-md">
        <h3 className="font-button-text text-on-surface capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map((d, i) => (
          <div key={i} className="text-xs font-bold text-on-surface-variant uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {rows.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((day, di) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              const hasAppts = hasAppointments(day);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "p-1.5 rounded-full cursor-pointer transition-colors relative text-on-surface",
                    isSelected ? "bg-primary text-on-primary font-bold shadow-sm" : "hover:bg-surface-container-high",
                    !isCurrentMonth && "text-outline-variant",
                    isToday && !isSelected && "ring-1 ring-primary/50"
                  )}
                  disabled={!isCurrentMonth}
                >
                  {format(day, "d")}
                  {hasAppts && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}