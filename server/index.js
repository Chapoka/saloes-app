import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServerSupabase } from "./lib/supabase.js";
import asaasRouter from "./routes/asaas.js";
import whatsappRouter from "./routes/whatsapp.js";
import emailRouter from "./routes/email.js";
import authRouter from "./routes/auth.js";
import cepRouter from "./routes/cep.js";

const PORT = process.env.PORT || 3001;
const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "..", "dist");

app.use(cors({ origin: true }));
app.use(express.json());

// Serve frontend static files BEFORE auth middleware
app.use(express.static(distPath));

// CEP lookup is public (no auth needed)
app.use("/api/cep", cepRouter);

// Health endpoint is public
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Auth middleware - only for API routes
app.use("/api", async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token de acesso não fornecido" });
  }

  const sb = createServerSupabase();

  // Allow service_role key for server-to-server calls
  if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    req.user = { role: "service_role", email: "server@api" };
    req.supabase = sb;
    return next();
  }

  try {
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
    req.user = user;
    req.supabase = sb;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao validar token" });
  }
});

// RBAC Middleware - fetch user profile with role
async function attachUserRole(req, res, next) {
  if (req.user?.role === "service_role") {
    req.userRole = "service_role";
    return next();
  }

  try {
    const { data: profile, error } = await req.supabase
      .from("users")
      .select("role, company_id, company_ids")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: "Perfil de usuário não encontrado" });
    }

    req.userRole = profile.role === "teacher" ? "professor" : profile.role;
    req.userCompanyId = profile.company_id;
    req.userCompanyIds = profile.company_ids || (profile.company_id ? [profile.company_id] : []);
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao buscar perfil do usuário" });
  }
}

// Role-based access middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.user?.role === "service_role") return next();
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: "Acesso negado: permissão insuficiente" });
    }
    next();
  };
}

// Company access middleware - ensures user belongs to the company
function requireCompanyAccess(req, res, next) {
  if (req.user?.role === "service_role") return next();
  
  const companyId = req.body?.company_id || req.query?.company_id || req.params?.companyId;
  
  if (!companyId) {
    // If no company_id specified, allow if user has any company
    if (req.userCompanyIds?.length > 0) return next();
    return res.status(403).json({ error: "Empresa não especificada" });
  }

  if (req.userCompanyIds?.includes(companyId)) return next();
  
  return res.status(403).json({ error: "Acesso negado: usuário não pertence a esta empresa" });
}

// Super admin only middleware
const requireSuperAdmin = requireRole("super_admin");

// Admin or super admin
const requireAdmin = requireRole("super_admin", "admin");

// Professional (professor) or above
const requireProfessional = requireRole("super_admin", "admin", "professor");

// Apply role middleware to routes
app.use("/api/asaas", attachUserRole, requireProfessional, asaasRouter);
app.use("/api/whatsapp", attachUserRole, requireProfessional, whatsappRouter);
app.use("/api/send-email", attachUserRole, requireProfessional, emailRouter);
app.use("/api/auth", attachUserRole, authRouter);

// SPA fallback - serve index.html for non-API routes
app.use((req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "API route not found" });
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Static files: ${distPath}`);
});