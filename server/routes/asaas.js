import { Router } from "express";
import { getMasterAsaasKey, getCompanyIntegration } from "../lib/supabase.js";
import {
  testConnection,
  createSinglePayment,
  cancelSubscription,
  deletePayment,
  listCharges,
  createCustomerAndSubscription,
} from "../lib/asaas.js";

const router = Router();

async function getAsaasConfig(sb, companyId) {
  const integration = companyId ? await getCompanyIntegration(sb, companyId) : null;
  if (integration?.asaas_api_key) {
    return { apiKey: integration.asaas_api_key, environment: integration.asaas_environment || "production" };
  }
  const masterKey = await getMasterAsaasKey(sb);
  if (masterKey) {
    return { apiKey: masterKey, environment: "production" };
  }
  throw new Error("Chave de API Asaas não configurada");
}

async function getStudent(sb, studentId) {
  let { data } = await sb.from("customers").select("*").eq("id", studentId).single();
  if (!data) {
    const res = await sb.from("students").select("*").eq("id", studentId).single();
    data = res.data;
  }
  if (!data) throw new Error("Cliente não encontrado");
  return data;
}

async function getOrCreateAsaasCustomer(sb, apiKey, environment, student, companyId) {
  if (student.asaas_customer_id) {
    return student.asaas_customer_id;
  }

  const integration = companyId ? await getCompanyIntegration(sb, companyId) : null;
  const subaccount = integration?.asaas_subaccount_id;

  const baseUrl = environment === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";
  const body = {
    name: student.name,
    email: student.email || undefined,
    phone: student.whatsapp?.replace(/\D/g, "") || undefined,
    mobilePhone: student.whatsapp?.replace(/\D/g, "") || undefined,
    cpfCnpj: student.cpf?.replace(/\D/g, "") || undefined,
    externalReference: student.id,
    notificationDisabled: false,
  };
  if (subaccount) body.walletId = subaccount;

  const res = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "access_token": apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.errors?.[0]?.description || data.error || `HTTP ${res.status}`;
    throw new Error(`Erro ao criar cliente Asaas: ${msg}`);
  }

  // Save customer ID to customer/student record
  await sb.from("customers").update({ asaas_customer_id: data.id }).eq("id", student.id);

  return data.id;
}

// POST /api/asaas/test
router.post("/test", async (req, res) => {
  try {
    const config = await getAsaasConfig(req.supabase, req.body.company_id);
    const result = await testConnection(config.apiKey, config.environment);
    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// POST /api/asaas/customer
router.post("/customer", async (req, res) => {
  try {
    const { action, company_id, student_id, ...params } = req.body;
    const config = await getAsaasConfig(req.supabase, company_id);
    const sb = req.supabase;

    let result;
    switch (action) {
      case "create_single_payment": {
        const student = await getStudent(sb, student_id);
        const customerId = await getOrCreateAsaasCustomer(sb, config.apiKey, config.environment, student, company_id);
        result = await createSinglePayment(config.apiKey, config.environment, {
          customer_id: customerId,
          value: params.value,
          due_date: params.due_date,
          description: params.description || "",
        });
        break;
      }

      case "create_customer_and_subscription": {
        const student = await getStudent(sb, student_id);

        // Get plan data
        let planValue = 0, planName = "", lessonCount = 0;
        if (student.plan_id) {
          const { data: plan } = await sb.from("plans").select("*").eq("id", student.plan_id).single();
          if (plan) {
            planValue = plan.price;
            planName = plan.name;
          }
        }
        if (student.custom_plan) {
          planValue = student.custom_plan.price || planValue;
          planName = student.custom_plan.name || planName;
        }
        lessonCount = student.current_credits || 0;

        const customerId = await getOrCreateAsaasCustomer(sb, config.apiKey, config.environment, student, company_id);

        result = await createCustomerAndSubscription(config.apiKey, config.environment, {
          customerId,
          name: student.name,
          cpfCnpj: student.cpf?.replace(/\D/g, ""),
          email: student.email,
          phone: student.whatsapp?.replace(/\D/g, ""),
          mobilePhone: student.whatsapp?.replace(/\D/g, ""),
          value: planValue,
          nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          description: planName || "Assinatura",
          externalReference: student.id,
          planName,
          lessonCount,
        });

        // Save subscription ID to customer
await sb.from("customers").update({
    asaas_customer_id: customerId,
    asaas_subscription_id: result.subscription_id,
  }).eq("id", student_id);

        break;
      }

      case "cancel_subscription":
        result = await cancelSubscription(config.apiKey, config.environment, params.subscription_id);
        break;

      case "delete_payment":
        result = await deletePayment(config.apiKey, config.environment, params.payment_id);
        break;

      case "list_charges": {
        const integration = company_id ? await getCompanyIntegration(sb, company_id) : null;
        const subaccountId = integration?.asaas_subaccount_id;
        result = await listCharges(config.apiKey, config.environment, params.limit || 100, subaccountId);
        break;
      }

      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }

    res.json(result);
  } catch (err) {
    console.error("asaas/customer error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/asaas/subaccounts
router.post("/subaccounts", async (req, res) => {
  try {
    const { action, company_id, data, subaccount_id } = req.body;
    const config = await getAsaasConfig(req.supabase, company_id);

    const baseUrl = config.environment === "sandbox"
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/api/v3";

    async function apiCall(method, path, body = null) {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          "access_token": config.apiKey,
        },
      };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`${baseUrl}${path}`, options);
      const json = await res.json();
      if (!res.ok) {
        const msg = json.errors?.[0]?.description || json.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return json;
    }

    let result;
    switch (action) {
      case "list":
        result = await apiCall("GET", "/accounts");
        break;
      case "create":
        result = await apiCall("POST", "/accounts", {
          name: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          companyType: data.companyType,
          phone: data.phone,
          mobilePhone: data.mobilePhone,
          address: data.address,
          addressNumber: data.addressNumber,
          complement: data.complement,
          province: data.province,
          postalCode: data.postalCode,
          birthDate: data.birthDate,
          incomeValue: data.incomeValue,
        });
        break;
      case "delete":
        result = await apiCall("DELETE", `/accounts/${subaccount_id}`);
        break;
      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }

    res.json(result);
  } catch (err) {
    console.error("asaas/subaccounts error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
