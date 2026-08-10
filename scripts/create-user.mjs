import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gestaodesaloes-supabasegestaodesaloes.fpczjb.easypanel.host',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
);

const email = 'rodrigo.rocha@morumbisolutions.com.br';
const password = 'Analyse01@!';

async function main() {
  // Step 1: Try sign up
  console.log('1. Tentando signUp...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Rodrigo Rocha', role: 'super_admin' },
    },
  });

  if (signUpError) {
    console.log('signUp error:', JSON.stringify(signUpError, null, 2));
  } else {
    console.log('signUp success:', JSON.stringify(signUpData, null, 2));
  }

  // Step 2: Try sign in (maybe user was created despite email error)
  console.log('\n2. Tentando signIn...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    console.log('signIn error:', JSON.stringify(loginError, null, 2));
  } else {
    console.log('signIn success!');
    console.log('User ID:', loginData.user.id);
    console.log('Session:', !!loginData.session);

    // Step 3: Update role to super_admin
    console.log('\n3. Atualizando role para super_admin...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'super_admin', full_name: 'Rodrigo Rocha' })
      .eq('id', loginData.user.id);

    if (updateError) {
      console.log('Update error:', JSON.stringify(updateError, null, 2));
    } else {
      console.log('Role updated to super_admin!');
    }
  }

  // Step 4: If sign in failed, try admin alternative
  if (!loginData?.session) {
    console.log('\n4. Tentando alternativa - verify OTP...');
  }
}

main().catch(console.error);
