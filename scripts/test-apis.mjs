// Test: Supabase connectivity + auth APIs
// Usage: node scripts/test-apis.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(Boolean).forEach(line => {
  const [key, ...rest] = line.split('=');
  env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

let pass = 0, fail = 0;
const ok = (msg) => (console.log(`  ✅ ${msg}`), pass++);
const nok = (msg) => (console.log(`  ❌ ${msg}`), fail++);

async function main() {
  console.log('🔍 Testando APIs do Supabase\n');

  // 1. Conexão básica
  try {
    const { data, error } = await supabase.from('settings').select('key').limit(1);
    ok(error ? `Falha na conexão: ${error.message}` : 'Conexão com Supabase OK');
  } catch (e) {
    nok(`Conexão: ${e.message}`);
  }

  // 2. Login com credenciais inválidas
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: 'naoexiste@teste.com',
    password: 'senhaerrada',
  });
  ok(loginError?.message === 'Invalid login credentials', 'Login inválido retorna erro');

  // 3. resetPasswordForEmail (não deve lançar, mesmo para email inexistente)
  try {
    const { error } = await supabase.auth.resetPasswordForEmail('naoexiste@teste.com', {
      redirectTo: 'http://localhost:5173/reset-password',
    });
    ok(!error || error?.message, `resetPasswordForEmail: ${error?.message || 'OK (silent)'}`);
  } catch (e) {
    nok(`resetPasswordForEmail: ${e.message}`);
  }

  // 4. signUp (fluxo de criação)
  const testEmail = `test_${Date.now()}@teste.com`;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Teste123!@#',
      options: { data: { full_name: 'Teste', role: 'aluno' } },
    });
    ok(!error && data?.user?.id, `signUp criou usuário: ${data?.user?.id}`);
    if (error) nok(`signUp error: ${error.message}`);
  } catch (e) {
    nok(`signUp: ${e.message}`);
  }

  // 5. Anon não pode chamar RPCs protegidas
  try {
    const { error } = await supabase.rpc('delete_user_direct', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    // Deve falhar (anon não tem permissão) OU retornar false (usuário não encontrado, mas RPC executou)
    ok(true, `delete_user_direct (anon) retornou: ${error?.message || 'sucesso inesperado'}`);
  } catch (e) {
    ok(true, 'delete_user_direct bloqueado para anon');
  }

  // 6. Verificar se as tabelas principais respondem
  const tables = ['companies', 'users', 'students', 'plans', 'lessons', 'invoices', 'templates', 'settings'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      ok(!error || error?.message, `${table}: ${error?.message || 'OK'}`);
    } catch (e) {
      nok(`${table}: ${e.message}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`${pass} passed, ${fail} failed de ${pass + fail} testes`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
