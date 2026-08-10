export async function sendViaMeta(apiToken, phoneNumberId, to, message) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: message },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return { ok: true };
}

export async function sendViaWaha(apiUrl, apiToken, to, message) {
  const url = `${apiUrl}/api/sendText`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken ? { "Authorization": `Bearer ${apiToken}` } : {}),
    },
    body: JSON.stringify({
      chatId: `${to}@c.us`,
      text: message,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return { ok: true };
}

export async function sendViaEvolution(apiUrl, apiToken, instance, to, message) {
  const url = `${apiUrl}/message/sendText/${instance}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken ? { "apikey": apiToken } : {}),
    },
    body: JSON.stringify({
      number: to,
      text: message,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return { ok: true };
}
