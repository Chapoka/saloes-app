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
    const { email, password, full_name, role, phone, commission_pct, specialty, photo_url, work_days, company_id, company_ids } = req.body;
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
    const updateData = {
      full_name: full_name || "",
      role: role || "cliente",
    };
    if (phone) updateData.phone = phone;
    if (commission_pct != null) updateData.commission_pct = commission_pct;
    if (specialty != null) updateData.specialty = specialty;
    if (photo_url) updateData.photo_url = photo_url;
    if (work_days) updateData.work_days = work_days;
    if (company_id) updateData.company_id = company_id;
    if (company_ids) updateData.company_ids = company_ids;

    await req.supabase.from("users").update(updateData).eq("id", userData.user.id);

    res.json({ user_id: userData.user.id, email });
  } catch (err) {
    console.error("admin-create-user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-update-user — atualizar dados de um usuário (service_role bypasses RLS)
router.post("/admin-update-user", async (req, res) => {
  try {
    const { user_id, full_name, phone, email, active, commission_pct, specialty, photo_url, work_days } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id é obrigatório" });

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

    const updateData = {};
    if (full_name != null) updateData.full_name = full_name;
    if (phone != null) updateData.phone = phone;
    if (active != null) updateData.active = active;
    if (commission_pct != null) updateData.commission_pct = commission_pct;
    if (specialty != null) updateData.specialty = specialty;
    if (photo_url != null) updateData.photo_url = photo_url;
    if (work_days != null) updateData.work_days = work_days;

    const { error } = await req.supabase.from("users").update(updateData).eq("id", user_id);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    console.error("admin-update-user error:", err);
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

    if (profile?.role !== "super_admin" && profile?.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Admin só pode excluir profissionais vinculados à sua empresa
    if (profile?.role === "admin") {
      const { data: callerCompanies } = await req.supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", callerId);

      const { data: targetUser } = await req.supabase
        .from("users")
        .select("company_id, company_ids")
        .eq("id", user_id)
        .single();

      const callerCompanyIds = (callerCompanies || []).map(c => c.company_id);
      const targetCompanyIds = [targetUser?.company_id, ...(targetUser?.company_ids || [])].filter(Boolean);
      const hasAccess = targetCompanyIds.some(id => callerCompanyIds.includes(id));
      if (targetCompanyIds.length > 0 && !hasAccess) {
        return res.status(403).json({ error: "Acesso negado: usuário não pertence à sua empresa" });
      }
    }

    // Limpa referências FK em tabelas dependentes (ordem importa)
    // 1. Zera FKs em customers (teacher_id, guardian_id) — não deleta o customer
    const { error: custErr } = await req.supabase
      .from("customers")
      .update({ teacher_id: null, guardian_id: null })
      .or(`teacher_id.eq.${user_id},guardian_id.eq.${user_id}`);
    if (custErr) console.warn("update customers FKs:", custErr.message);

    // 2. Deleta registros nas tabelas de dependência direta
    const deleteSteps = [
      { table: "professional_services", col: "professional_id" },
      { table: "appointments", col: "professional_id" },
      { table: "user_companies", col: "user_id" },
    ];

    for (const { table, col } of deleteSteps) {
      const { error: delErr } = await req.supabase.from(table).delete().eq(col, user_id);
      if (delErr) {
        console.error(`delete ${table} error:`, delErr.message);
        return res.status(500).json({ error: `Erro ao limpar tabela ${table}: ${delErr.message}` });
      }
    }

    // 3. Deleta o usuário da tabela pública
    const { error: userDelErr } = await req.supabase.from("users").delete().eq("id", user_id);
    if (userDelErr) {
      console.error("delete users error:", userDelErr);
      return res.status(500).json({ error: "Erro ao remover do banco: " + userDelErr.message });
    }

    // Deleta do auth.users via admin API (service_role bypasses)
    const { error: authDelErr } = await req.supabase.auth.admin.deleteUser(user_id);
    if (authDelErr) {
      console.error("auth.users delete error:", authDelErr.message);
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

    // 1. Verificar se o chamador é super_admin ou admin no banco
    const callerId = req.user.id;
    if (!callerId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { data: profile, error: profileError } = await req.supabase
      .from("users")
      .select("role")
      .eq("id", callerId)
      .single();

    const callerRole = profile?.role;
    const isSuperAdmin = callerRole === "super_admin";
    const isAdmin = callerRole === "admin";

    if (profileError || (!isSuperAdmin && !isAdmin)) {
      return res.status(403).json({ error: "Acesso negado: apenas super_admin ou admin pode redefinir senhas" });
    }

    // 2. If admin (not super_admin), verify they share at least one company with the target user
    if (isAdmin && !isSuperAdmin) {
      const { data: callerCompanies } = await req.supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", callerId);

      const { data: targetCompanies } = await req.supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user_id);

      const callerCompanyIds = (callerCompanies || []).map(c => c.company_id);
      const targetCompanyIds = (targetCompanies || []).map(c => c.company_id);
      const sharedCompany = callerCompanyIds.some(id => targetCompanyIds.includes(id));

      if (!sharedCompany) {
        return res.status(403).json({ error: "Acesso negado: você só pode redefinir senhas de usuários da mesma empresa" });
      }
    }

    // 3. Atualizar a senha via Supabase Admin API (service_role)
    const { error: updateAuthError } = await req.supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateAuthError) throw updateAuthError;

    // 4. Atualizar flags no perfil público
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
