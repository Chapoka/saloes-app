import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, User, Star, RotateCcw, BookOpen, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const timeOptions = [];
for (let h = 0; h <= 23; h++) {
  timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
  timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
}

const APPOINTMENT_TYPES = [
  { value: "plan", label: "Serviço do Plano", icon: BookOpen, color: "border-branding-primary bg-branding-primary/5 text-branding-primary" },
  { value: "trial", label: "Experimental", icon: Star, color: "border-amber-400 bg-amber-50 text-amber-600" },
  { value: "makeup", label: "Reposição", icon: RotateCcw, color: "border-purple-400 bg-purple-50 text-purple-600" },
];

export default function NewAppointmentModal({ open, onClose, customers, plans = [], appointments = [], selectedDate, selectedTime, onSubmit, isLoading }) {
  const [appointmentType, setAppointmentType] = useState("plan");
  const [extraCustomerIds, setExtraCustomerIds] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
    start_time: "08:00",
    duration_mins: 60,
    service_category: "corte",
    original_appointment_id: "",
  });

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime) {
      setFormData(prev => ({ ...prev, start_time: selectedTime }));
    }
  }, [selectedTime]);

  // Auto-fill service_category/duration from customer's plan
  const handleCustomerChange = (customerId) => {
    const customer = customers.find(s => s.id === customerId);
    if (!customer) return setFormData(prev => ({ ...prev, customer_id: customerId, original_appointment_id: "" }));
    
    let service_category = formData.service_category;
    let duration_mins = formData.duration_mins;
    
    if (customer.custom_plan) {
      service_category = customer.custom_plan.modality || service_category;
      duration_mins = customer.custom_plan.duration_mins || duration_mins;
    } else if (customer.plan_id) {
      const plan = plans.find(p => p.id === customer.plan_id);
      if (plan) {
        service_category = plan.modality || service_category;
        duration_mins = plan.duration_mins || duration_mins;
      }
    }
    
    setFormData(prev => ({ ...prev, customer_id: customerId, service_category, duration_mins, original_appointment_id: "" }));
    // Auto-select same-guardian customers (merge with any manual selections)
    const guardianIds = customer.guardian_id
      ? customers.filter(s => s.id !== customerId && s.guardian_id === customer.guardian_id).map(s => s.id)
      : customers.filter(s => s.id !== customerId && s.guardian_id === customerId).map(s => s.id);
    setExtraCustomerIds(prev => {
      // Keep manually-added non-guardian customers, replace guardian ones
      const nonGuardian = prev.filter(id => !guardianIds.includes(id));
      return [...new Set([...guardianIds, ...nonGuardian])];
    });
  };

  // Find customers who share the same guardian (responsável)
  const selectedCustomer = customers.find(s => s.id === formData.customer_id);
  const sameGuardianCustomers = (() => {
    if (!selectedCustomer) return [];
    if (selectedCustomer.guardian_id) {
      return customers.filter(s =>
        s.id !== selectedCustomer.id &&
        s.guardian_id === selectedCustomer.guardian_id
      );
    }
    return customers.filter(s =>
      s.id !== selectedCustomer.id &&
      s.guardian_id === selectedCustomer.id
    );
  })();

  const allSelectedCustomers = [selectedCustomer, ...customers.filter(s => s.id !== formData.customer_id && extraCustomerIds.includes(s.id))].filter(Boolean);

  const toggleExtraCustomer = (customerId) => {
    setExtraCustomerIds(prev =>
      prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
    );
  };

  // Absent appointments for the selected customer (for makeup linking)
  const absentAppointments = appointmentType === "makeup" && formData.customer_id
    ? appointments.filter(l => l.customer_id === formData.customer_id && l.status === "absent" && !l.rescheduled)
    : [];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + Number(formData.duration_mins);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Credit validation for plan appointments
    if (appointmentType === "plan") {
      for (const s of allSelectedCustomers) {
        if ((s.current_credits || 0) <= 0) {
          toast.error(`${s.name} não tem créditos disponíveis para agendamento do plano!`);
          return;
        }
      }
    }

    // Check for time conflicts for ALL selected customers
    for (const s of allSelectedCustomers) {
      const conflict = appointments.find(l =>
        l.customer_id === s.id &&
        l.date === formData.date &&
        !["cancelled", "absent"].includes(l.status) &&
        formData.start_time < (l.end_time || "23:59") &&
        newEndTime > l.start_time
      );
      if (conflict) {
        toast.error(`${s.name} já tem serviço nesse horário (${conflict.start_time} - ${conflict.end_time})`);
        return;
      }
    }

    // Map appointment type to status
    const statusMap = { plan: "scheduled", trial: "trial", makeup: "makeup" };

    // Build appointment data for all selected customers
    const allData = allSelectedCustomers.map(s => {
      const submitData = {
        ...formData,
        customer_id: s.id,
        duration_mins: Number(formData.duration_mins),
        customer_name: s.name || "",
        end_time: newEndTime,
        status: statusMap[appointmentType],
        service_performed: false,
        appointment_type: appointmentType,
      };
      if (!submitData.original_appointment_id) delete submitData.original_appointment_id;
      return submitData;
    });

    // Always submit as array for consistency
    onSubmit(allData);
  };

  const handleClose = () => {
    setAppointmentType("plan");
    setExtraCustomerIds([]);
    setFormData({ customer_id: "", date: "", start_time: selectedTime || "08:00", duration_mins: 60, service_category: "corte", original_appointment_id: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Appointment Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Tipo de Serviço</Label>
            <div className="grid grid-cols-3 gap-2">
              {APPOINTMENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAppointmentType(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                      appointmentType === type.value ? type.color : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Cliente</Label>
            <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(cust => (
                  <SelectItem key={cust.id} value={cust.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      {cust.name}
                      {appointmentType === "plan" && (
                        <span className="text-gray-500 text-xs">
                          ({cust.current_credits || 0} créd.)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Customers from same guardian */}
          {sameGuardianCustomers.length > 0 && (() => {
            const guardianIds = sameGuardianCustomers.map(s => s.id);
            const allSelected = guardianIds.every(id => extraCustomerIds.includes(id));
            return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-500" />
                  Mesmo responsável
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    if (allSelected) {
                      setExtraCustomerIds(prev => prev.filter(id => !guardianIds.includes(id)));
                    } else {
                      setExtraCustomerIds(prev => [...new Set([...prev, ...guardianIds])]);
                    }
                  }}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border border-purple-200 rounded-xl p-2">
                {sameGuardianCustomers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleExtraCustomer(s.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      extraCustomerIds.includes(s.id)
                        ? "bg-purple-100 text-purple-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        extraCustomerIds.includes(s.id)
                          ? "bg-purple-500 border-purple-500"
                          : "border-gray-300"
                      )}>
                        {extraCustomerIds.includes(s.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{s.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({s.current_credits || 0} créd.)</span>
                  </button>
                ))}
              </div>
            </div>
            );
          })()}

          {/* Add any other customer */}
          {formData.customer_id && (() => {
            const guardianIds = new Set(sameGuardianCustomers.map(s => s.id));
            const otherCustomers = customers.filter(s =>
              s.id !== formData.customer_id &&
              !guardianIds.has(s.id) &&
              s.status === "active"
            );
            if (otherCustomers.length === 0) return null;
            return (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-branding-primary" />
                Outros clientes
                <span className="text-gray-500 font-normal">— opcional</span>
              </Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2">
                {otherCustomers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleExtraCustomer(s.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      extraCustomerIds.includes(s.id)
                        ? "bg-branding-primary/10 text-branding-primary font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        extraCustomerIds.includes(s.id)
                          ? "bg-branding-primary border-branding-primary"
                          : "border-gray-300"
                      )}>
                        {extraCustomerIds.includes(s.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{s.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({s.current_credits || 0} créd.)</span>
                  </button>
                ))}
              </div>
            </div>
            );
          })()}



          {allSelectedCustomers.length > 1 && (
            <div className="flex items-center gap-2 p-2 bg-branding-primary/5 rounded-xl text-sm text-branding-primary">
              <Users className="w-4 h-4" />
              <span>{allSelectedCustomers.length} clientes serão agendados neste horário</span>
            </div>
          )}

          {/* Absent appointment link for makeup */}
          {appointmentType === "makeup" && formData.customer_id && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Serviço de origem (ausência) <span className="text-gray-500 font-normal">— opcional</span>
              </Label>
              {absentAppointments.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma falta registrada para este cliente</p>
              ) : (
                <Select value={formData.original_appointment_id} onValueChange={(v) => setFormData(prev => ({ ...prev, original_appointment_id: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione o serviço com ausência" />
                  </SelectTrigger>
                  <SelectContent>
                    {absentAppointments.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.date} {l.start_time} — {(l.service_category || l.modality) === "corte" ? "Corte" : "Barba"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Data</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="pl-10 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Horário</Label>
              <Select value={formData.start_time} onValueChange={(v) => handleChange("start_time", v)}>
                <SelectTrigger className="rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration & Modality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Duração</Label>
              <Select
                value={formData.duration_mins.toString()}
                onValueChange={(v) => handleChange("duration_mins", parseInt(v))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                  <SelectItem value="90">90 minutos</SelectItem>
                  <SelectItem value="120">120 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Tipo de Serviço</Label>
              <Select value={formData.service_category} onValueChange={(v) => handleChange("service_category", v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corte">Corte</SelectItem>
                  <SelectItem value="barba">Barba</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {appointmentType !== "plan" && (
            <div className={cn("p-3 rounded-xl text-sm flex items-center gap-2",
              appointmentType === "trial" ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-purple-50 border border-purple-200 text-purple-700"
            )}>
              {appointmentType === "trial" ? "⭐" : "🔄"}
              {appointmentType === "trial" ? "Serviços experimentais não consomem créditos" : "Reposições não consomem créditos"}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!formData.customer_id || isLoading}
              className={cn("flex-1 rounded-xl", 
                appointmentType === "trial" ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                appointmentType === "makeup" ? "bg-gradient-to-r from-purple-500 to-purple-600" :
                "btn-branding"
              )}
            >
              {isLoading ? "Agendando..." : allSelectedCustomers.length > 1 ? `Agendar ${allSelectedCustomers.length} Serviços` : "Agendar Serviço"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
