import { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User, Clock, X, Droplets, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const groupMonthAppointments = (appointments, customers) => {
  const grouped = [];
  const used = new Set();
  const guardianIds = new Set(customers.filter(s => customers.some(other => other.guardian_id === s.id)).map(s => s.id));
  for (let i = 0; i < appointments.length; i++) {
    if (used.has(i)) continue;
    const appointment = appointments[i];
    const customer = customers.find(s => s.id === appointment.customer_id);
    const guardianId = customer?.guardian_id || appointment.customer_id;
    const sameSlot = [appointment];
    for (let j = i + 1; j < appointments.length; j++) {
      if (used.has(j)) continue;
      const other = appointments[j];
      if (other.date === appointment.date && other.start_time === appointment.start_time) {
        const otherCustomer = customers.find(s => s.id === other.customer_id);
        const otherGuardianId = otherCustomer?.guardian_id || other.customer_id;
        if (otherGuardianId === guardianId) { sameSlot.push(other); used.add(j); }
      }
    }
    used.add(i);

    if (sameSlot.length > 1) {
      const dependents = sameSlot.filter(l => {
        const s = customers.find(st => st.id === l.customer_id);
        return s?.guardian_id;
      });
      if (dependents.length > 0) {
        const updatedDependents = dependents.map(l => {
          const s = customers.find(st => st.id === l.customer_id);
          return { ...l, customer_name: s?.name || l.customer_name };
        });
        const names = updatedDependents.map(l => l.customer_name).filter(Boolean);
        const displayName = names.length <= 2 ? names.join(" / ") : `${names[0]} +${names.length - 1}`;
        grouped.push({ ...updatedDependents[0], isGroup: true, groupAppointments: updatedDependents, customer_name: displayName, groupCount: updatedDependents.length });
        continue;
      }
    }

    if (sameSlot.length === 1 && guardianIds.has(appointment.customer_id)) {
      continue;
    }

    if (sameSlot.length === 1) {
      const s = customers.find(st => st.id === appointment.customer_id);
      grouped.push({ ...appointment, customer_name: s?.name || appointment.customer_name });
    } else {
      const updatedSlot = sameSlot.map(l => {
        const s = customers.find(st => st.id === l.customer_id);
        return { ...l, customer_name: s?.name || l.customer_name };
      });
      const names = updatedSlot.map(l => l.customer_name).filter(Boolean);
      const displayName = names.length <= 2 ? names.join(" / ") : `${names[0]} +${names.length - 1}`;
      grouped.push({ ...appointment, isGroup: true, groupAppointments: updatedSlot, customer_name: displayName, groupCount: updatedSlot.length });
    }
  }
  return grouped;
};

export default function MonthCalendar({ appointments, customers = [], onAppointmentClick, onSlotClick, onDeleteAppointments }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  const getAppointmentsForDay = (date) => {
    return appointments.filter(appointment => 
      isSameDay(parseISO(appointment.date), date)
    );
  };

  const getStatusCount = (dayAppointments) => {
    return {
      total: dayAppointments.length,
      present: dayAppointments.filter(l => l.status === "present").length,
      absent: dayAppointments.filter(l => l.status === "absent").length,
      scheduled: dayAppointments.filter(l => l.status === "scheduled" || l.status === "confirmed").length,
      trial: dayAppointments.filter(l => l.status === "trial").length,
      makeup: dayAppointments.filter(l => l.status === "makeup").length,
    };
  };

  const handleDayClick = (day, dayAppointments) => {
    if (dayAppointments.length > 0) {
      setSelectedDay({ date: day, appointments: dayAppointments });
      setShowDayModal(true);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      onSlotClick?.(day);
    }
  };

  const statusLabels = {
    scheduled: "Agendada",
    confirmed: "Confirmada",
    present: "Presente",
    absent: "Falta",
    cancelled: "Cancelada",
    trial: "Experimental",
    makeup: "Reposição",
  };

  const statusColors = {
    scheduled: "bg-branding-primary/10 text-branding-primary border-branding-primary/20",
    confirmed: "bg-branding-secondary/10 text-branding-secondary border-branding-secondary/20",
    present: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    absent: "bg-red-500/20 text-red-300 border-red-500/30",
    cancelled: "bg-surface-container text-on-surface-variant border-outline-variant/30",
    trial: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    makeup: "bg-pink-100 text-pink-700 border-pink-200",
  };

  return (
    <>
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-on-surface-variant py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="space-y-1">
          {rows.map((week, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {week.map((day, j) => {
                const dayAppointments = getAppointmentsForDay(day);
                const stats = getStatusCount(dayAppointments);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={j}
                    onClick={() => handleDayClick(day, dayAppointments)}
                    className={cn(
                      "min-h-[70px] sm:min-h-[100px] p-1.5 sm:p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                      isCurrentMonth ? "bg-surface-container-lowest border-outline-variant/30" : "bg-surface-container-low border-outline-variant/10",
                      isToday && "ring-2 ring-branding-primary border-branding-primary"
                    )}
                  >
                    <div className={cn(
                      "text-xs sm:text-sm font-medium mb-0.5 sm:mb-1",
                      isToday ? "text-branding-primary" : isCurrentMonth ? "text-on-surface" : "text-on-surface-variant"
                    )}>
                      {format(day, "d")}
                    </div>
                    
                    {stats.total > 0 && (
                      <div className="space-y-0.5 sm:space-y-1">
                        {/* Mobile: compact dot indicators */}
                        <div className="flex flex-wrap gap-0.5 sm:hidden">
                          {stats.present > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/100 text-[9px] text-white font-bold">{stats.present}</span>
                          )}
                          {stats.absent > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/100 text-[9px] text-white font-bold">{stats.absent}</span>
                          )}
                          {stats.trial > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/100 text-[9px] text-white font-bold">{stats.trial}</span>
                          )}
                          {stats.makeup > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500 text-[9px] text-white font-bold">{stats.makeup}</span>
                          )}
                          {stats.scheduled > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-branding-primary text-[9px] text-white font-bold">{stats.scheduled}</span>
                          )}
                        </div>
                        {/* Desktop: full badges */}
                        <div className="hidden sm:block space-y-1">
                          {stats.present > 0 && (
                            <Badge className="w-full bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs justify-center">
                              ✓ {stats.present}
                            </Badge>
                          )}
                          {stats.absent > 0 && (
                            <Badge className="w-full bg-red-500/20 text-red-300 border-red-500/30 text-xs justify-center">
                              ✗ {stats.absent}
                            </Badge>
                          )}
                          {stats.trial > 0 && (
                            <Badge className="w-full bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs justify-center">
                              ⭐ {stats.trial}
                            </Badge>
                          )}
                          {stats.makeup > 0 && (
                            <Badge className="w-full bg-pink-100 text-pink-700 border-pink-200 text-xs justify-center">
                              ↻ {stats.makeup}
                            </Badge>
                          )}
                          {stats.scheduled > 0 && (
                            <Badge className="w-full bg-branding-primary/10 text-branding-primary border-branding-primary/20 text-xs justify-center">
                              {stats.scheduled}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Day Details Modal */}
    <Dialog open={showDayModal} onOpenChange={(open) => { setShowDayModal(open); if (!open) { setSelectionMode(false); setSelectedIds(new Set()); } }}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="capitalize">
              {selectedDay && format(selectedDay.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
                className={cn("rounded-lg text-xs", selectionMode && "bg-red-500/100 hover:bg-error")}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {selectionMode ? "Cancelar" : "Excluir"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDayModal(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {groupMonthAppointments(selectedDay?.appointments || [], customers).map((appointment) => {
            const appointmentKey = appointment.isGroup
              ? appointment.groupAppointments.map(l => l.id).sort().join(",")
              : appointment.id;
            const isSelected = selectedIds.has(appointmentKey);

            const toggleSelect = () => {
              const next = new Set(selectedIds);
              if (isSelected) {
                next.delete(appointmentKey);
              } else {
                next.add(appointmentKey);
              }
              setSelectedIds(next);
            };

            return (
            <div key={appointmentKey} className="relative">
              {selectionMode && (
                <button
                  onClick={toggleSelect}
                  className="absolute top-3 left-3 z-10"
                >
                  {isSelected
                    ? <CheckSquare className="w-5 h-5 text-red-400" />
                    : <Square className="w-5 h-5 text-on-surface-variant" />
                  }
                </button>
              )}
              <HoverCard openDelay={selectionMode ? 99999 : 200}>
                <HoverCardTrigger asChild>
                  <div
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelect();
                      } else {
                        setShowDayModal(false);
                        onAppointmentClick?.(appointment);
                      }
                    }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all cursor-pointer",
                      selectionMode && isSelected
                        ? "border-red-500/50 bg-red-500/10"
                        : selectionMode
                          ? "border-outline-variant/30 hover:border-outline-variant/50"
                          : "border-outline-variant/10 hover:border-branding-primary hover:shadow-md",
                      selectionMode && "pl-12"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-branding-primary/10">
                          <User className="w-5 h-5 text-branding-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-on-surface">
                            {appointment.customer_name}
                            {appointment.isGroup && (
                              <span className="ml-2 text-xs bg-branding-primary/10 text-branding-primary px-1.5 py-0.5 rounded-full font-medium">
                                {appointment.groupCount} clientes
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-on-surface-variant capitalize">
                            {appointment.service_category === "corte" ? "Corte" : "Barba"}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[appointment.status]}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-branding-secondary" />
                        <span>{appointment.start_time} - {appointment.end_time}</span>
                      </div>
                      <span className="text-on-surface-variant">•</span>
                      <span>{appointment.duration_mins} minutos</span>
                    </div>

                    {appointment.notes && (
                      <p className="mt-3 text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-lg">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                </HoverCardTrigger>
                {!selectionMode && (
                <HoverCardContent className="w-72 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30">
                  <div className="space-y-3">
                    {appointment.isGroup ? (
                      <>
                        <div>
                          <p className="font-semibold text-on-surface text-sm mb-1">Atendimento em grupo ({appointment.groupCount} clientes)</p>
                          <p className="text-xs text-on-surface-variant">{format(parseISO(appointment.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-outline-variant/10">
                          {appointment.groupAppointments.map((gl, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-on-surface">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {gl.customer_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span>{gl.customer_name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center text-white font-semibold">
                            {appointment.customer_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-on-surface">{appointment.customer_name}</p>
                            <p className="text-xs text-on-surface-variant">{format(parseISO(appointment.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2 pt-2 border-t border-outline-variant/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Droplets className="w-4 h-4 text-branding-primary" />
                          <span>Tipo de Agendamento:</span>
                        </div>
                        <span className="font-medium text-on-surface">
                          {appointment.service_category === "corte" ? "Corte" : "Barba"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Clock className="w-4 h-4 text-branding-secondary" />
                          <span>Horário:</span>
                        </div>
                        <span className="font-medium text-on-surface">
                          {appointment.start_time} - {appointment.end_time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">Duração:</span>
                        <span className="font-medium text-on-surface">
                          {appointment.duration_mins} minutos
                        </span>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="pt-2 border-t border-outline-variant/10">
                        <p className="text-xs text-on-surface-variant mb-1">Observações:</p>
                        <p className="text-sm text-on-surface">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
                )}
              </HoverCard>
            </div>
            );
          })}
        </div>

        <div className="pt-4 border-t space-y-3">
          {selectionMode && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir {selectedIds.size} {selectedIds.size === 1 ? "agendamento selecionado" : "agendamentos selecionados"}
            </Button>
          )}
          <Button
            onClick={() => {
              setShowDayModal(false);
              onSlotClick?.(selectedDay.date);
            }}
            className="w-full btn-branding rounded-xl"
          >
            Agendar Novo Agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Bulk Delete Confirmation */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {selectedIds.size} {selectedIds.size === 1 ? "agendamento" : "agendamentos"}?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const grouped = groupMonthAppointments(selectedDay?.appointments || [], customers);
              const idsToDelete = [];
              for (const appointmentKey of selectedIds) {
                const g = grouped.find(gl => {
                  const k = gl.isGroup ? gl.groupAppointments.map(l => l.id).sort().join(",") : gl.id;
                  return k === appointmentKey;
                });
                if (g) {
                  if (g.isGroup) {
                    idsToDelete.push(...g.groupAppointments.map(l => l.id));
                  } else {
                    idsToDelete.push(g.id);
                  }
                }
              }
              onDeleteAppointments?.(idsToDelete);
              setShowDeleteConfirm(false);
              setShowDayModal(false);
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
            className="rounded-xl bg-red-500/100 hover:bg-error"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
