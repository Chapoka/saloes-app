import { SupabaseClient } from "@supabase/supabase-js";

export interface EntityHandlers<T> {
  list: (sort?: string | { column: string; ascending?: boolean }, limit?: number) => Promise<T[]>;
  filter: (conditions: Partial<T>) => Promise<T[]>;
  create: (data: Omit<T, "id" | "created_at" | "updated_at">) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<boolean>;
  get: (id: string) => Promise<T | null>;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  tipo?: "MATRIZ" | "FILIAL";
  estabelecimento_tipo?: "barbearia" | "clinica_estetica" | "salao_beleza" | "studio_manicure";
  razao_social?: string;
  situacao_cadastral?: string;
  data_abertura?: string;
  capital_social?: number;
  porte?: string;
  cnae_principal?: string;
  natureza_juridica?: string;
  cep?: string;
  uf?: string;
  cidade?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  owner_email?: string;
  owner_name?: string;
  owner_phone?: string;
  has_branch?: boolean;
  branding_app_name?: string;
  branding_logo_url?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_accent_color?: string;
  branding_background_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf?: string;
  rg?: string;
  email?: string;
  whatsapp?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  birth_date?: string;
  medical_certificate_url?: string;
  plan_id?: string;
  custom_plan?: Record<string, unknown>;
  current_credits?: number;
  access_token?: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  teacher_id?: string;
  guardian_id?: string;
  billing_mode?: "individual" | "consolidated";
  portal_enabled?: boolean;
  company_id?: string;
  company_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  customer_name?: string;
  plan_id?: string;
  date: string;
  start_time: string;
  end_time?: string;
  duration_mins: 30 | 60 | 90;
  service_category?: "corte" | "barba";
  status: "scheduled" | "confirmed" | "present" | "absent" | "cancelled" | "trial" | "makeup";
  appointment_type?: "plan" | "trial" | "makeup";
  cancellation_reason?: string;
  service_performed?: boolean;
  notes?: string;
  rescheduled?: boolean;
  rescheduled_appointment_id?: string;
  original_appointment_id?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  customer_name?: string;
  asaas_id?: string;
  asaas_url?: string;
  plan_id?: string;
  plan_name?: string;
  value: number;
  due_date?: string;
  status: "pending" | "received" | "overdue" | "cancelled";
  payment_date?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Plan {
  id: string;
  name: string;
  modality: string;
  duration_mins: 30 | 60 | 90;
  price: number;
  session_count: number;
  active?: boolean;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Template {
  id: string;
  trigger: "welcome" | "payment_link" | "appointment_confirmation" | "low_credits" | "monthly_billing" | "appointment_cancelled";
  message: string;
  enabled?: boolean;
  send_before_hours?: number;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  action: "create" | "update" | "delete";
  entity_type: string;
  entity_id?: string;
  category?: "financial" | "schedule" | "customers" | "system";
  description: string;
  user_name?: string;
  user_email?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface WaitingList {
  id: string;
  customer_name: string;
  whatsapp?: string;
  email?: string;
  modality: "corte" | "barba";
  duration_mins?: 30 | 60 | 90;
  preferred_days?: Record<string, unknown>;
  priority: "normal" | "urgent" | "flexible";
  notes?: string;
  status: "waiting" | "contacted" | "scheduled" | "cancelled";
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Modality {
  id: string;
  name: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyIntegration {
  id: string;
  company_id: string;
  asaas_api_key?: string;
  asaas_environment?: "sandbox" | "production";
  asaas_subaccount_id?: string;
  asaas_subaccount_wallet_id?: string;
  whatsapp_provider?: "waha" | "evolution" | "meta";
  whatsapp_api_url?: string;
  whatsapp_api_token?: string;
  whatsapp_phone?: string;
  whatsapp_webhook_url?: string;
  whatsapp_instance?: string;
  whatsapp_connected?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  full_name?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  role: "super_admin" | "admin" | "professor" | "aluno" | "teacher" | "user";
  active?: boolean;
  temp_password?: string;
  must_change_password?: boolean;
  company_id?: string;
  company_ids?: string[];
  stylist_level_id?: string;
  is_professional?: boolean;
  phone?: string;
  photo_url?: string;
  specialty?: string;
  commission_pct?: number;
  work_days?: string[];
  is_master?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StylistLevel {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  multiplier: number;
  color?: string;
  sort_order?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  category: string;
  duration_mins: number;
  price: number;
  description?: string;
  active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCombo {
  id: string;
  company_id: string;
  name: string;
  combo_price: number;
  description?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceComboItem {
  id: string;
  combo_id: string;
  service_id: string;
  quantity: number;
  created_at?: string;
}

export interface PunchCard {
  id: string;
  customer_id: string;
  company_id: string;
  service_id?: string;
  service_category?: string;
  total_services: number;
  used_services: number;
  remaining_services: number;
  price_paid: number;
  price_per_service: number;
  name: string;
  notes?: string;
  expires_at?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerCompany {
  customer_id: string;
  company_id: string;
  created_at?: string;
}

export interface UserCompany {
  user_id: string;
  company_id: string;
  created_at?: string;
}

export interface EntitiesProxy {
  Company: EntityHandlers<Company>;
  Customer: EntityHandlers<Customer>;
  Appointment: EntityHandlers<Appointment>;
  Invoice: EntityHandlers<Invoice>;
  Plan: EntityHandlers<Plan>;
  Template: EntityHandlers<Template>;
  AuditLog: EntityHandlers<AuditLog>;
  WaitingList: EntityHandlers<WaitingList>;
  Settings: EntityHandlers<Settings>;
  Modality: EntityHandlers<Modality>;
  CompanyIntegration: EntityHandlers<CompanyIntegration>;
  User: EntityHandlers<User>;
  StylistLevel: EntityHandlers<StylistLevel>;
  Service: EntityHandlers<Service>;
  ServiceCombo: EntityHandlers<ServiceCombo>;
  ServiceComboItem: EntityHandlers<ServiceComboItem>;
  PunchCard: EntityHandlers<PunchCard>;
  CustomerCompany: EntityHandlers<CustomerCompany>;
  UserCompany: EntityHandlers<UserCompany>;
}

export interface DbClient {
  entities: EntitiesProxy;
  auth: {
    me: () => Promise<User | null>;
    logout: () => Promise<void>;
    redirectToLogin: () => void;
  };
  users: {
    inviteUser: (email: string, role: string, full_name: string) => Promise<{
      user_id: string;
      email: string;
      temp_password?: string;
      message: string;
    }>;
  };
  functions: {
    invoke: (functionName: string, payload: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  integrations: {
    Core: {
      UploadFile: ({ file }: { file: File }) => Promise<{ file_url: string }>;
      SendEmail: ({ to, subject, body }: { to: string; subject: string; body: string }) => Promise<unknown>;
    };
  };
  appLogs: {
    logUserInApp: (pageName: string) => Promise<void>;
  };
  customers: {
    getCompanies: (customerId: string) => Promise<string[]>;
    setCompanies: (customerId: string, companyIds: string[]) => Promise<void>;
  };
}

export const db: DbClient;
export default db;
