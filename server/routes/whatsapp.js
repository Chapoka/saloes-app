import { Router } from "express";
import { getCompanyIntegration } from "../lib/supabase.js";
import { sendViaMeta, sendViaWaha, sendViaEvolution } from "../lib/whatsapp.js";

const router = Router();

// POST /api/whatsapp/test
router.post("/test", async (req, res) => {
  try {
    const integration = await getCompanyIntegration(req.supabase, req.body.company_id);
    if (!integration?.whatsapp_provider) {
      return res.json({ ok: false, error: "WhatsApp não configurado para esta empresa" });
    }
    res.json({ ok: true, message: "WhatsApp configurado" });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// POST /api/whatsapp/send
router.post("/send", async (req, res) => {
  try {
    const { company_id, phone, message } = req.body;
    if (!company_id || !phone || !message) {
      return res.status(400).json({ error: "company_id, phone e message são obrigatórios" });
    }

    const integration = await getCompanyIntegration(req.supabase, company_id);
    if (!integration) {
      return res.status(400).json({ error: "Integração não encontrada para esta empresa" });
    }

    const provider = integration.whatsapp_provider || "meta";
    let result;

    switch (provider) {
      case "meta": {
        if (!integration.whatsapp_api_token || !integration.whatsapp_phone) {
          return res.status(400).json({ error: "WhatsApp Business API não configurado (token ou phone number ID)" });
        }
        result = await sendViaMeta(integration.whatsapp_api_token, integration.whatsapp_phone, phone, message);
        break;
      }
      case "waha": {
        if (!integration.whatsapp_api_url) {
          return res.status(400).json({ error: "WAHA API URL não configurada" });
        }
        result = await sendViaWaha(integration.whatsapp_api_url, integration.whatsapp_api_token, phone, message);
        break;
      }
      case "evolution": {
        if (!integration.whatsapp_api_url || !integration.whatsapp_instance) {
          return res.status(400).json({ error: "Evolution API não configurada (URL ou instância)" });
        }
        result = await sendViaEvolution(integration.whatsapp_api_url, integration.whatsapp_api_token, integration.whatsapp_instance, phone, message);
        break;
      }
      default:
        return res.status(400).json({ error: `Provedor WhatsApp desconhecido: ${provider}` });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
