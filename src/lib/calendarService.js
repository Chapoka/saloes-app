/**
 * Calendar Integration Service
 * Generates .ics files and syncs with Google Calendar / Microsoft Outlook
 */

export function generateICS(appointment, customer, company) {
  const dtStart = formatICSDate(appointment.date, appointment.start_time);
  const dtEnd = formatICSDate(appointment.date, appointment.end_time || addMinutes(appointment.start_time, appointment.duration_mins || 30));
  const now = formatICSDate(new Date().toISOString().split("T")[0], new Date().toTimeString().slice(0, 5));

  const modalityLabel = appointment.service_category === "corte" ? "Corte" : appointment.service_category === "barba" ? "Barba" : appointment.service_category || "Serviço";
  const companyName = company?.name || "Salão";
  const customerName = customer?.name || appointment.customer_name || "Cliente";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//" + companyName + "//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `DTSTAMP:${now}`,
    `UID:${appointment.id}@${companyName.toLowerCase().replace(/\s/g, "")}`,
    `SUMMARY:${modalityLabel} - ${customerName}`,
    `DESCRIPTION:${modalityLabel} agendado para ${customerName}\\nDuração: ${appointment.duration_mins || 30} min\\nLocal: ${companyName}`,
    `LOCATION:${company?.address_street || ""}${company?.address_number ? ", " + company.address_number : ""}${company?.address_neighborhood ? " - " + company.address_neighborhood : ""}${company?.address_city ? ", " + company.address_city : ""}`.trim(),
    `ORGANIZER;CN=${companyName}:mailto:${company?.email || "noreply@salon.com"}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Lembrete: ${modalityLabel} em 1 hora`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:Amanhã é seu ${modalityLabel}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return ics;
}

export function downloadICS(appointment, customer, company) {
  const ics = generateICS(appointment, customer, company);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `agendamento-${appointment.date}-${appointment.start_time || ""}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateGoogleCalendarUrl(appointment, customer, company) {
  const modalityLabel = appointment.service_category === "corte" ? "Corte" : appointment.service_category === "barba" ? "Barba" : appointment.service_category || "Serviço";
  const customerName = customer?.name || appointment.customer_name || "Cliente";
  const companyName = company?.name || "Salão";

  const dtStart = formatGoogleDate(appointment.date, appointment.start_time);
  const dtEnd = formatGoogleDate(appointment.date, appointment.end_time || addMinutes(appointment.start_time, appointment.duration_mins || 30));

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${modalityLabel} - ${customerName}`,
    dates: `${dtStart}/${dtEnd}`,
    details: `${modalityLabel} agendado\\nDuração: ${appointment.duration_mins || 30} min`,
    location: `${company?.address_street || ""}${company?.address_city ? ", " + company.address_city : ""}`.trim(),
    sf: "true",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookCalendarUrl(appointment, customer, company) {
  const modalityLabel = appointment.service_category === "corte" ? "Corte" : appointment.service_category === "barba" ? "Barba" : appointment.service_category || "Serviço";
  const customerName = customer?.name || appointment.customer_name || "Cliente";

  const dtStart = formatOutlookDate(appointment.date, appointment.start_time);
  const dtEnd = formatOutlookDate(appointment.date, appointment.end_time || addMinutes(appointment.start_time, appointment.duration_mins || 30));

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `${modalityLabel} - ${customerName}`,
    startdt: dtStart,
    enddt: dtEnd,
    body: `${modalityLabel} agendado\\nDuração: ${appointment.duration_mins || 30} min`,
    location: `${company?.address_street || ""}${company?.address_city ? ", " + company.address_city : ""}`.trim(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export async function syncToGoogleCalendar(appointment, customer, company, googleToken) {
  if (!googleToken?.access_token) return { success: false, error: "Token Google não conectado" };

  const modalityLabel = appointment.service_category === "corte" ? "Corte" : appointment.service_category === "barba" ? "Barba" : appointment.service_category || "Serviço";
  const customerName = customer?.name || appointment.customer_name || "Cliente";
  const companyName = company?.name || "Salão";

  const event = {
    summary: `${modalityLabel} - ${customerName}`,
    description: `${modalityLabel} agendado para ${customerName}\nDuração: ${appointment.duration_mins || 30} min\nLocal: ${companyName}`,
    start: {
      dateTime: `${appointment.date}T${appointment.start_time || "09:00"}:00`,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: `${appointment.date}T${appointment.end_time || addMinutes(appointment.start_time || "09:00", appointment.duration_mins || 30)}:00`,
      timeZone: "America/Sao_Paulo",
    },
    location: `${company?.address_street || ""}${company?.address_city ? ", " + company.address_city : ""}`.trim(),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 1440 },
      ],
    },
  };

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleToken.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Erro ao sincronizar com Google Calendar");

    return { success: true, eventId: data.id, htmlLink: data.htmlLink };
  } catch (err) {
    console.error("Google Calendar sync error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteFromGoogleCalendar(eventId, googleToken) {
  if (!googleToken?.access_token || !eventId) return;

  try {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${googleToken.access_token}` },
    });
  } catch (err) {
    console.error("Google Calendar delete error:", err);
  }
}

export async function syncToOutlookCalendar(appointment, customer, company, outlookToken) {
  if (!outlookToken?.access_token) return { success: false, error: "Token Outlook não conectado" };

  const modalityLabel = appointment.service_category === "corte" ? "Corte" : appointment.service_category === "barba" ? "Barba" : appointment.service_category || "Serviço";
  const customerName = customer?.name || appointment.customer_name || "Cliente";

  const event = {
    subject: `${modalityLabel} - ${customerName}`,
    body: {
      contentType: "HTML",
      content: `<p>${modalityLabel} agendado para ${customerName}</p><p>Duração: ${appointment.duration_mins || 30} min</p>`,
    },
    start: {
      dateTime: `${appointment.date}T${appointment.start_time || "09:00"}:00`,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: `${appointment.date}T${appointment.end_time || addMinutes(appointment.start_time || "09:00", appointment.duration_mins || 30)}:00`,
      timeZone: "America/Sao_Paulo",
    },
    location: {
      displayName: `${company?.address_street || ""}${company?.address_city ? ", " + company.address_city : ""}`.trim(),
    },
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
  };

  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${outlookToken.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Erro ao sincronizar com Outlook");

    return { success: true, eventId: data.id };
  } catch (err) {
    console.error("Outlook sync error:", err);
    return { success: false, error: err.message };
  }
}

function formatICSDate(date, time) {
  const d = date.replace(/-/g, "");
  const t = (time || "09:00").replace(":", "") + "00";
  return `${d}T${t}`;
}

function formatGoogleDate(date, time) {
  return `${date.replace(/-/g, "")}T${time || "09:00"}00`;
}

function formatOutlookDate(date, time) {
  return `${date}T${time || "09:00"}:00`;
}

function addMinutes(time, minutes) {
  if (!time) return "09:00";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
