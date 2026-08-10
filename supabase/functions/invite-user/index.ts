import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, role, full_name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "SERVICE_ROLE_KEY não configurada. Execute: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin or super_admin
    const { data: callerProfile } = await supabaseUser
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || (callerProfile.role !== "super_admin" && callerProfile.role !== "admin")) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite user by email — this creates the user AND sends the invitation email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get("SITE_URL") || "http://localhost:5173"}/login`,
      data: {
        full_name: full_name || "",
        role: role || "aluno",
      },
    });

    if (inviteError) {
      // If email already exists, try to create anyway
      if (inviteError.message?.includes("already exists") || inviteError.message?.includes("already registered")) {
        return new Response(
          JSON.stringify({ error: `Usuário com email ${email} já existe.` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("inviteUserByEmail error:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!inviteData?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: resposta vazia" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user metadata with role and name
    await supabaseAdmin.auth.admin.updateUserById(inviteData.user.id, {
      user_metadata: {
        full_name: full_name || "",
        role: role || "aluno",
      },
    });

    return new Response(
      JSON.stringify({
        user_id: inviteData.user.id,
        email: inviteData.user.email,
        message: "Convite enviado com sucesso! O usuário receberá um email para definir a senha.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-user error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao convidar usuário" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
