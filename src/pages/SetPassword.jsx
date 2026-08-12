import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function SetPassword() {
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get("preview") === "1";

  const [ready, setReady] = useState(isPreview);
  const [timeoutExpired, setTimeoutExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const recoveryDetected = useRef(false);

  useEffect(() => {
    if (isPreview) return;

    const timer = setTimeout(() => {
      if (!recoveryDetected.current && !ready) {
        setTimeoutExpired(true);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected.current = true;
        setReady(true);
        clearTimeout(timer);
      }
      if (event === "SIGNED_IN" && session) {
        // Check if this is a recovery flow or an active session (must_change_password redirect)
        const hash = window.location.hash;
        if (hash.includes("type=recovery")) {
          recoveryDetected.current = true;
          setReady(true);
          clearTimeout(timer);
        }
      }
    });

    // Check if user already has an active session (redirected from login with must_change_password)
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        recoveryDetected.current = true;
        setReady(true);
        clearTimeout(timer);
      }
    };

    checkActiveSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [isPreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem");
      return;
    }
    if (isPreview) {
      setSuccess(true);
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Clear temp_password and must_change_password in the public users table
      try {
        await supabase
          .from("users")
          .update({
            temp_password: null,
            must_change_password: false,
          })
          .eq("id", session.user.id);
      } catch (clearErr) {
        // Non-critical: password was updated, just log the error
        console.warn("Failed to clear temp_password flag:", clearErr);
      }

      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch (err) {
      setError(err.message || "Falha ao definir senha");
    } finally {
      setLoading(false);
    }
  };

  if (timeoutExpired) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Link inválido ou expirado"
        subtitle="Solicite um novo link de recuperação"
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            Voltar para o login
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          O link de acesso está inválido ou expirou. Solicite um novo convite ao administrador.
        </p>
      </AuthLayout>
    );
  }

  if (!ready && !success) {
    return (
      <AuthLayout
        icon={Loader2}
        title="Carregando..."
        subtitle="Aguardando autenticação"
        footer={null}
      >
        <div className="flex justify-center py-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Senha criada com sucesso!"
        subtitle="Redirecionando..."
        footer={null}
      >
        <div />
      </AuthLayout>
    );
  }

  return (
      <AuthLayout
        icon={Lock}
        title="Defina sua nova senha"
        subtitle="Crie uma senha segura para sua conta"
        footer={null}
      >
        {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando senha...</>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
