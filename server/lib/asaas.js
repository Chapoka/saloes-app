const ASAAS_API = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/api/v3",
};

function getAsaasClient(apiKey, environment = "production") {
  const baseUrl = ASAAS_API[environment] || ASAAS_API.production;
  return {
    async request(method, path, body = null) {
      const url = `${baseUrl}${path}`;
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          "access_token": apiKey,
        },
      };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(url, options);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        const msg = data.errors?.[0]?.description || data.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return data;
    },
    get(path) { return this.request("GET", path); },
    post(path, body) { return this.request("POST", path, body); },
    put(path, body) { return this.request("PUT", path, body); },
    delete(path) { return this.request("DELETE", path); },
  };
}

export async function testConnection(apiKey, environment) {
  try {
    const client = getAsaasClient(apiKey, environment);
    await client.get("/customers?limit=1");
    return { ok: true, message: "Conectado ao Asaas com sucesso!" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function createSinglePayment(apiKey, environment, params) {
  const client = getAsaasClient(apiKey, environment);
  const payment = await client.post("/payments", {
    customer: params.customer_id,
    billingType: "PIX",
    value: params.value,
    dueDate: params.due_date,
    description: params.description || "",
  });
  return {
    ok: true,
    payment_id: payment.id,
    payment_url: payment.invoiceUrl || payment.bankSlipUrl || null,
  };
}

export async function cancelSubscription(apiKey, environment, subscriptionId) {
  const client = getAsaasClient(apiKey, environment);
  const result = await client.delete(`/subscriptions/${subscriptionId}`);
  return { ok: true, result };
}

export async function deletePayment(apiKey, environment, paymentId) {
  const client = getAsaasClient(apiKey, environment);
  const result = await client.delete(`/payments/${paymentId}`);
  return { ok: true, result };
}

export async function listCharges(apiKey, environment, limit = 100, walletId = null) {
  const client = getAsaasClient(apiKey, environment);
  let path = `/payments?limit=${limit}`;
  if (walletId) path += `&walletId=${walletId}`;
  const result = await client.get(path);
  return {
    charges: (result.data || []).map(c => ({
      id: c.id,
      status: c.status,
      paymentDate: c.paymentDate,
      invoiceUrl: c.invoiceUrl,
      bankSlipUrl: c.bankSlipUrl,
      value: c.value,
      dueDate: c.dueDate,
      customer: c.customer,
    })),
  };
}

export async function createCustomerAndSubscription(apiKey, environment, params) {
  const client = getAsaasClient(apiKey, environment);

  let customerId = params.customerId;
  if (!customerId) {
    const customer = await client.post("/customers", {
      name: params.name,
      cpfCnpj: params.cpfCnpj,
      email: params.email,
      phone: params.phone,
      mobilePhone: params.mobilePhone,
      postalCode: params.postalCode,
      address: params.address,
      addressNumber: params.addressNumber,
      complement: params.complement,
      province: params.province,
      externalReference: params.externalReference,
      notificationDisabled: false,
    });
    customerId = customer.id;
  }

  const subscription = await client.post("/subscriptions", {
    customer: customerId,
    billingType: "PIX",
    value: params.value,
    nextDueDate: params.nextDueDate,
    cycle: params.cycle || "MONTHLY",
    description: params.description || "",
    maxPayments: params.maxPayments || null,
    externalReference: params.externalReference,
  });

  return {
    ok: true,
    customer_id: customerId,
    subscription_id: subscription.id,
    payment_url: subscription.invoiceUrl || null,
    plan_value: subscription.value,
    plan_name: params.planName || "",
    lesson_count: params.lessonCount || 0,
  };
}
