const isDev = import.meta.env.DEV;
const LOG_PREFIX = "[CustomersDebug]";

const style = {
  info: "color: #3b82f6; font-weight: bold",
  warn: "color: #f59e0b; font-weight: bold",
  error: "color: #ef4444; font-weight: bold",
  success: "color: #22c55e; font-weight: bold",
  data: "color: #8b5cf6; font-weight: bold",
  api: "color: #06b6d4; font-weight: bold",
};

function formatObj(obj) {
  try {
    return JSON.parse(JSON.stringify(obj, (_, v) => 
      typeof v === 'bigint' ? v.toString() : v
    ), 2);
  } catch {
    return String(obj);
  }
}

export const logger = {
  info: (msg, data) => isDev && console.log(`%c${LOG_PREFIX} INFO: ${msg}`, style.info, data ? formatObj(data) : ""),
  warn: (msg, data) => isDev && console.warn(`%c${LOG_PREFIX} WARN: ${msg}`, style.warn, data ? formatObj(data) : ""),
  error: (msg, data) => isDev && console.error(`%c${LOG_PREFIX} ERROR: ${msg}`, style.error, data ? formatObj(data) : ""),
  success: (msg, data) => isDev && console.log(`%c${LOG_PREFIX} SUCCESS: ${msg}`, style.success, data ? formatObj(data) : ""),
  data: (msg, data) => isDev && console.log(`%c${LOG_PREFIX} DATA: ${msg}`, style.data, data ? formatObj(data) : ""),
  api: (msg, data) => isDev && console.log(`%c${LOG_PREFIX} API: ${msg}`, style.api, data ? formatObj(data) : ""),
  mutation: (msg, data) => isDev && console.log(`%c${LOG_PREFIX} MUTATION: ${msg}`, "color: #f97316; font-weight: bold", data ? formatObj(data) : ""),
  group: (label) => isDev && console.group(`%c${LOG_PREFIX} ${label}`, "color: #6366f1; font-weight: bold"),
  groupEnd: () => isDev && console.groupEnd(),
  time: (label) => isDev && console.time(`%c${LOG_PREFIX} ${label}`, style.api),
  timeEnd: (label) => isDev && console.timeEnd(`%c${LOG_PREFIX} ${label}`, style.api),
};

export const logCustomer = (customer, label = "Customer") => {
  if (!isDev) return;
  logger.data(label, {
    id: customer?.id,
    name: customer?.name,
    cpf: customer?.cpf,
    email: customer?.email,
    whatsapp: customer?.whatsapp,
    status: customer?.status,
    guardian_id: customer?.guardian_id,
    company_id: customer?.company_id,
    company_ids: customer?.company_ids,
    billing_mode: customer?.billing_mode,
    plan_id: customer?.plan_id,
    custom_plan: customer?.custom_plan,
    current_credits: customer?.current_credits,
    portal_enabled: customer?.portal_enabled,
    created_at: customer?.created_at,
  });
};

export const logCustomersArray = (customers, label = "Customers") => {
  if (!isDev) return;
  logger.data(`${label} (${customers?.length || 0})`, customers?.map(c => ({
    id: c.id,
    name: c.name,
    guardian_id: c.guardian_id,
    status: c.status,
    company_id: c.company_id,
    company_ids: c.company_ids,
  })) || []);
};