import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, studentName, serviceName, date, startTime, endTime, duration, companyName, companyAddress } = await req.json();

    if (!to || !studentName || !date || !startTime) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: to, studentName, date, startTime" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate ICS content
    const dtStart = date.replace(/-/g, "") + "T" + startTime.replace(":", "") + "00";
    const endT = endTime || (() => {
      const [h, m] = startTime.split(":").map(Number);
      const total = h * 60 + m + (duration || 30);
      return String(Math.floor(total / 60) % 24).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
    })();
    const dtEnd = date.replace(/-/g, "") + "T" + endT.replace(":", "") + "00";
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//" + (companyName || "Salon") + "//Agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `DTSTAMP:${now}`,
      `UID:${date}-${startTime}@salon`,
      `SUMMARY:${serviceName || "Serviço"} - ${studentName}`,
      `DESCRIPTION:${serviceName || "Serviço"} agendado para ${studentName}\\nDuração: ${duration || 30} min`,
      `LOCATION:${companyAddress || ""}`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      `DESCRIPTION:Lembrete: ${serviceName || "Serviço"} em 1 hora`,
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:Amanhã é seu ${serviceName || "Serviço"}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));
    const icsBoundary = "----=_Part_" + Math.random().toString(36).substr(2, 9);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0077b6, #2a9d8f); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📅 Agendamento Confirmado!</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 18px;">Olá, ${studentName}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Seu agendamento foi confirmado. Seguem os detalhes:
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #0077b6;">
            <p style="margin: 4px 0; color: #334155;"><strong>Serviço:</strong> ${serviceName || "Serviço"}</p>
            <p style="margin: 4px 0; color: #334155;"><strong>Data:</strong> ${date}</p>
            <p style="margin: 4px 0; color: #334155;"><strong>Horário:</strong> ${startTime} - ${endT}</p>
            <p style="margin: 4px 0; color: #334155;"><strong>Duração:</strong> ${duration || 30} minutos</p>
            ${companyAddress ? `<p style="margin: 4px 0; color: #334155;"><strong>Local:</strong> ${companyAddress}</p>` : ""}
          </div>
          <p style="color: #475569; line-height: 1.6; font-size: 14px;">
            📎 <strong>Adicione ao seu calendário:</strong> O arquivo .ics está anexado a este e-mail. 
            Clique nele para adicionar automaticamente ao Google Calendar, Outlook ou Apple Calendar do seu celular.
          </p>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>${companyName || "Salão"} • ${companyAddress || ""}</p>
          <p>Este é um e-mail automático. Em caso de dúvidas, entre em contato conosco.</p>
        </div>
      </div>
    `;

    // Build multipart email with ICS attachment
    const emailBody = [
      `--${icsBoundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      html,
      `--${icsBoundary}`,
      `Content-Type: text/calendar; charset=utf-8; method=REQUEST`,
      `Content-Disposition: attachment; filename="agendamento.ics"`,
      ``,
      icsContent,
      `--${icsBoundary}--`,
    ].join("\r\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName || "Salão"} <noreply@resend.dev>`,
        to: [to],
        subject: `📅 Agendamento Confirmado - ${serviceName || "Serviço"} em ${date}`,
        html,
        attachments: [
          {
            filename: "agendamento.ics",
            content: icsBase64,
            content_type: "text/calendar",
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao enviar e-mail" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-confirmation error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
