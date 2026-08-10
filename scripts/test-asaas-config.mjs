// Test Asaas API via local server
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gestaodesaloes-supabasegestaodesaloes.fpczjb.easypanel.host";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

const pass = 0, fail = 0;
const ok = (msg) => (console.log(`  ✅ ${msg}`), pass);
const nok = (msg) => (console.log(`  ❌ ${msg}`), fail);

async function main() {
  console.log("🔍 Testando API Asaas\n");

  // 1. Check if service_role key works with Supabase
  console.log("1. Supabase connection with service_role:");
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    const { data, error } = await sb.from("settings").select("key, value").limit(5);
    if (error) {
      console.log(`   ❌ service_role: ${error.message}`);
    } else {
      console.log(`   ✅ service_role OK. Settings found: ${data.length}`);
      data.forEach(s => console.log(`      - ${s.key}: ${s.value?.substring(0, 20)}...`));
    }
  } catch (e) {
    console.log(`   ❌ service_role error: ${e.message}`);
  }

  // 2. Check Asaas master key configuration
  console.log("\n2. Asaas master key:");
  try {
    const { data } = await sb.from("settings").select("value").eq("key", "asaas_master_api_key").single();
    if (data?.value) {
      console.log(`   ✅ Asaas master key found: ${data.value.substring(0, 10)}...`);
    } else {
      console.log(`   ❌ No Asaas master key configured in settings`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 3. Check company integrations
  console.log("\n3. Company integrations:");
  try {
    const { data } = await sb.from("company_integrations").select("company_id, asaas_api_key, asaas_environment");
    if (data?.length) {
      console.log(`   ✅ ${data.length} integrations found`);
      data.forEach(i => console.log(`      - company ${i.company_id?.substring(0,8)}: ${i.asaas_api_key ? "has key" : "no key"} (${i.asaas_environment || "production"})`));
    } else {
      console.log(`   ℹ️  No company integrations found`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  console.log("\n" + "=".repeat(40));
}

main().catch(console.error);
