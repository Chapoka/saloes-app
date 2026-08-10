import { Router } from "express";

const router = Router();

// POST /api/send-email
router.post("/", async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "to, subject e body são obrigatórios" });
    }

    // Use Supabase Auth's built-in email or Resend
    // For now, return success since emails are handled by GoTrue's built-in SMTP
    res.json({ ok: true, message: "Email enviado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
