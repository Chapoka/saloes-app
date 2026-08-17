import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle, Trash2, RefreshCw, Users, Banknote, CreditCard, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadICS } from "@/lib/calendarService";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const statusConfig = {
  scheduled: { label: "Agendada", color: "text-branding-primary", bg: "bg-branding-primary/10" },
  confirmed: { label: "Confirmada", color: "text-branding-secondary", bg: "bg-branding-secondary/10" },
  present: { label: "Presente", color: "text-emerald-600", bg: "bg-emerald-50" },
  absent: { label: "Falta", color: "text-red-600", bg: "bg-red-50" },
  cancelled: { label: "Cancelada", color: "text-gray-500", bg: "bg-gray-100" },
  trial: { label: "Experimental", color: "text-amber-600", bg: "bg-amber-50" },
  makeup: { label: "Reposição", color: "text-purple-600", bg: "bg-purple-50" },
};

export default function AppointmentModal({ appointment, open, onClose, onUpdateStatus, onDelete, onReschedule, customers = [] }) {
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [tipAmount, setTipAmount] = useState(appointment?.tip_amount || 0);
  const [tipPaymentMethod, setTipPaymentMethod] = useState(appointment?.tip_payment_method || "cash");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  if (!appointment) return null;

  const groupAppointments = appointment.isGroup ? (appointment.groupAppointments || []) : [appointment];
  const isGrouped = appointment.isGroup && groupAppointments.length > 1;

  // Check if the appointment's customer is a guardian and find their dependents
  const customer = customers.find(s => s.id === appointment.customer_id);
  const dependentsOfGuardian = !isGrouped && customer && !customer.guardian_id
    ? customers.filter(s => s.guardian_id === customer.id && s.status === "active")
    : [];
  const showDependents = dependentsOfGuardian.length > 0;

  const handleStatusUpdate = async (newStatus, specificAppointment) => {
    setIsUpdating(true);
    const targetAppointment = specificAppointment || appointment;
    const extraData = newStatus === "present" && tipAmount > 0
      ? { tip_amount: tipAmount, tip_payment_method: tipPaymentMethod }
      : {};
    await onUpdateStatus(targetAppointment.id, newStatus, notes, extraData);
    setIsUpdating(false);
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) return;
    setIsUpdating(true);
    if (onReschedule) {
      await onReschedule(appointment, rescheduleDate, rescheduleTime);
    }
    setShowRescheduleForm(false);
    setIsUpdating(false);
    onClose();
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(appointment.id);
      setShowDeleteDialog(false);
      onClose();
    }
  };

  const status = statusConfig[appointment.status] || statusConfig.scheduled;

  return (
    <React.Fragment>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Detalhes do Serviço</span>
              {!isGrouped && (
                <span className={cn("text-xs px-2 py-1 rounded-full", status.bg, status.color)}>
                  {status.label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Info */}
            {isGrouped ? (
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Users className="w-4 h-4 text-branding-primary" />
                  <span>Atendimento em grupo ({groupAppointments.length} clientes)</span>
                </div>
                {groupAppointments.map((gl, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {gl.customer_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{gl.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {(gl.service_category || gl.modality) === "corte" ? "Corte" : "Barba"} • {gl.duration_mins} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-branding-primary to-branding-secondary flex items-center justify-center text-white font-semibold">
                  {appointment.customer_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{appointment.customer_name}</p>
                  <p className="text-sm text-gray-500 capitalize">
                    {(appointment.service_category || appointment.modality) === "corte" ? "Corte" : "Barba"}
                  </p>
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-branding-primary" />
                <div>
                  <p className="text-xs text-gray-500">Data</p>
                  <p className="font-medium text-gray-900">
                    {format(parseISO(appointment.date), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Clock className="w-5 h-5 text-branding-secondary" />
                <div>
                  <p className="text-xs text-gray-500">Horário</p>
                  <p className="font-medium text-gray-900">
                    {appointment.start_time} - {appointment.end_time}
                  </p>
                </div>
              </div>
            </div>

            {/* Duration - only show for single appointment */}
            {!isGrouped && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Duração</span>
                <span className="font-semibold text-gray-900">{appointment.duration_mins} minutos</span>
              </div>
            )}

            {/* Dependents of a Guardian */}
            {showDependents && (
              <div className="p-4 bg-purple-50 rounded-xl space-y-2 border border-purple-100">
                <p className="text-sm font-medium text-purple-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Dependentes vinculados: {dependentsOfGuardian.map(d => d.name).join(", ")}
                </p>
                <p className="text-xs text-purple-500">Os serviços destes dependentes aparecerão separadamente na agenda.</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Observações
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar observações..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            {/* Tip Section - only show when not yet present and not cancelled */}
            {appointment.status !== "cancelled" && appointment.status !== "present" && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Gorjeta (opcional)</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="pl-8 rounded-lg text-sm h-9"
                    />
                  </div>
                  <div className="flex gap-1">
                    {[5, 10, 20].map(val => (
                      <Button
                        key={val}
                        size="sm"
                        variant="outline"
                        className="h-9 px-2 text-xs border-amber-200 text-amber-700 hover:bg-amber-100"
                        onClick={() => setTipAmount(val)}
                      >
                        R${val}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipPaymentMethod("cash")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      tipPaymentMethod === "cash"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Dinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipPaymentMethod("pix")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      tipPaymentMethod === "pix"
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipPaymentMethod("card")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      tipPaymentMethod === "card"
                        ? "border-purple-400 bg-purple-50 text-purple-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Cartão
                  </button>
                </div>
              </div>
            )}

            {/* Show existing tip if already present */}
            {appointment.status === "present" && appointment.tip_amount > 0 && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">Gorjeta registrada</span>
                </div>
                <span className="font-semibold text-emerald-800">
                  R$ {Number(appointment.tip_amount).toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}

            {/* Calendar Links */}
            {appointment.status !== "cancelled" && appointment.date && (
              <div className="p-3 bg-branding-primary/5 border border-branding-primary/10 rounded-xl space-y-2">
                <p className="text-xs font-medium text-branding-primary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Adicionar ao calendário
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-gray-200"
                    onClick={() => downloadICS(appointment, null, null)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar .ics
                  </Button>
                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent((appointment.service_category || appointment.modality) === "corte" ? "Corte" : "Barba")}&dates=${appointment.date?.replace(/-/g, "")}T${(appointment.start_time || "09:00").replace(":", "")}00/${appointment.date?.replace(/-/g, "")}T${(appointment.end_time || "09:30").replace(":", "")}00`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs border-gray-200" type="button">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Google
                    </Button>
                  </a>
                  <a
                    href={`https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent((appointment.service_category || appointment.modality) === "corte" ? "Corte" : "Barba")}&startdt=${appointment.date}T${appointment.start_time || "09:00"}:00&enddt=${appointment.date}T${appointment.end_time || "09:30"}:00`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs border-gray-200" type="button">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Outlook
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {appointment.status !== "cancelled" && (
              isGrouped ? (
                <div className="space-y-2 pt-2">
                  {groupAppointments.map((gl, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{gl.customer_name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          statusConfig[gl.status]?.bg || "bg-gray-100",
                          statusConfig[gl.status]?.color || "text-gray-500"
                        )}>
                          {statusConfig[gl.status]?.label || "Agendada"}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {gl.status !== "present" && gl.status !== "cancelled" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate("present", gl)}
                            disabled={isUpdating}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs h-8"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Presença
                          </Button>
                        )}
                        {gl.status !== "absent" && gl.status !== "cancelled" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate("absent", gl)}
                            disabled={isUpdating}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs h-8"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Falta
                          </Button>
                        )}
                        {gl.status !== "cancelled" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate("cancelled", gl)}
                            disabled={isUpdating}
                            variant="ghost"
                            className="w-full border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs h-7 mt-1"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Cancelar serviço de {gl.customer_name?.split(" ")[0]}
                          </Button>
                        )}
                        {gl.status === "cancelled" && (
                          <p className="text-xs text-gray-500 italic w-full text-center">Serviço cancelado</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  {appointment.status !== "present" && (
                    <Button
                      onClick={() => handleStatusUpdate("present")}
                      disabled={isUpdating}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar Presença
                    </Button>
                  )}
                  {appointment.status !== "absent" && (
                    <Button
                      onClick={() => handleStatusUpdate("absent")}
                      disabled={isUpdating}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Marcar Falta
                    </Button>
                  )}
                </div>
              )
            )}

            {/* Reschedule for absent appointments */}
            {appointment.status === "absent" && !appointment.rescheduled && (
              <div>
                {!showRescheduleForm ? (
                  <Button
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl"
                    onClick={() => setShowRescheduleForm(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reagendar este serviço
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-medium text-amber-800">Reagendar serviço para:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Data</label>
                        <Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Horário</label>
                        <Input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} className="rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowRescheduleForm(false)} className="flex-1 rounded-xl text-sm">Cancelar</Button>
                      <Button
                        onClick={handleReschedule}
                        disabled={isUpdating || !rescheduleDate || !rescheduleTime}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 rounded-xl text-sm"
                      >
                        {isUpdating ? "Salvando..." : "Confirmar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {appointment.status === "absent" && appointment.rescheduled && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                <RefreshCw className="w-4 h-4" />
                Esta falta foi reagendada
              </div>
            )}

            {appointment.cancellation_reason && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Motivo do cancelamento</p>
                  <p className="text-sm text-amber-700 mt-1">{appointment.cancellation_reason}</p>
                </div>
              </div>
            )}

            {/* Delete Button */}
            <div className="pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 rounded-xl"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Serviço
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {isGrouped ? "estes serviços" : <>este serviço de <strong>{appointment?.customer_name}</strong></>}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </React.Fragment>
  );
}
