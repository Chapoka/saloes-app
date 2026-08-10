import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gestaodesaloes-supabasegestaodesaloes.fpczjb.easypanel.host';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = 'rodrigo.rocha@morumbisolutions.com.br';
const password = 'Analyse01@!';

async function main() {
  console.log('Criando usuário super admin...');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Rodrigo Rocha',
        role: 'super_admin',
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('Usuário já existe. Tentando fazer login para atualizar role...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) {
        console.error('Erro ao fazer login:', loginError.message);
        return;
      }
      console.log('Login OK. Atualizando role para super_admin...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'super_admin', full_name: 'Rodrigo Rocha' })
        .eq('id', loginData.user.id);
      if (updateError) {
        console.error('Erro ao atualizar role:', updateError.message);
      } else {
        console.log('Role atualizada para super_admin com sucesso!');
      }
      return;
    }
    console.error('Erro ao criar usuário:', error.message);
    return;
  }

  console.log('Usuário criado com sucesso!');
  console.log('ID:', data.user.id);
  console.log('Email:', data.user.email);

  console.log('Aguardando confirmação (se necessário)...');
}

main().catch(console.error);
