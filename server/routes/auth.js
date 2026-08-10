import { Router } from "express";

const router = Router();

// POST /api/auth/confirm-email — confirma o e-mail de um usuário via GoTrue Admin API
router.post("/confirm-email", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id é obrigatório" });

    const gotrueUrl = `${process.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${user_id}`;
    const response = await fetch(gotrueUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email_confirm: true }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.msg || `HTTP ${response.status}`);
    }

    res.json({ ok: true, user: data });
  } catch (err) {
    console.error("confirm-email error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-create-user — criar um usuário (auth + public)
router.post("/admin-create-user", async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email e password são obrigatórios" });
    }

    const callerId = req.user.id;
    if (!callerId) return res.status(401).json({ error: "Não autorizado" });

    const { data: profile } = await req.supabase
      .from("users")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profile?.role !== "super_admin" && profile?.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { data: userData, error: createError } = await req.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "", role: role || "cliente" },
    });

    if (createError) throw createError;
    if (!userData?.user?.id) throw new Error("Falha ao criar usuário");

    // O trigger handle_new_user já deve ter criado o registro em public.users,
    // mas confirmamos e atualizamos o role se necessário
    await req.supabase.from("users").update({
      full_name: full_name || "",
      role: role || "cliente",
    }).eq("id", userData.user.id);

    res.json({ user_id: userData.user.id, email });
  } catch (err) {
    console.error("admin-create-user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-delete-user — deletar um usuário (auth + public)
router.post("/admin-delete-user", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id é obrigatório" });

    const callerId = req.user.id;
    if (!callerId) return res.status(401).json({ error: "Não autorizado" });

    const { data: profile } = await req.supabase
      .from("users")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profile?.role !== "super_admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Deleta das tabelas públicas primeiro
    await req.supabase.from("user_companies").delete().eq("user_id", user_id);
    await req.supabase.from("users").delete().eq("id", user_id);

    // Deleta do auth.users via RPC ou fallback admin API
    try {
      await req.supabase.rpc("delete_user_direct", { p_user_id: user_id });
    } catch {
      await req.supabase.auth.admin.deleteUser(user_id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("admin-delete-user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-reset-password — redefinir a senha de um usuário
router.post("/admin-reset-password", async (req, res) => {
  try {
    const { user_id, new_password, must_change_password } = req.body;
    if (!user_id || !new_password) {
      return res.status(400).json({ error: "user_id e new_password são obrigatórios" });
    }

    // 1. Verificar se o chamador é super_admin no banco
    const callerId = req.user.id;
    if (!callerId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { data: profile, error: profileError } = await req.supabase
      .from("users")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profileError || profile?.role !== "super_admin") {
      return res.status(403).json({ error: "Acesso negado: apenas super_admin pode redefinir senhas" });
    }

    // 2. Atualizar a senha diretamente no auth.users via função security definer
    // Usa admin_set_user_password (sem checagem de role, pois o servidor já autenticou)
    const { error: rpcError } = await req.supabase.rpc("admin_set_user_password", {
      user_id,
      new_password,
    });

    if (rpcError) throw rpcError;

    // 3. Confirmar o email e atualizar flags no perfil público
    const { error: updateError } = await req.supabase
      .from("users")
      .update({
        temp_password: new_password,
        must_change_password: must_change_password || false,
      })
      .eq("id", user_id);

    if (updateError) throw updateError;

    res.json({ ok: true });
  } catch (err) {
    console.error("admin-reset-password error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
