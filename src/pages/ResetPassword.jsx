import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const recoveryDetected = useRef(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event (may fire before or after mount)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected.current = true;
        setRecoveryReady(true);
        setChecking(false);
      }
      // Also handle SIGNED_IN — Supabase v2 sometimes fires SIGNED_IN
      // instead of PASSWORD_RECOVERY when the recovery token is exchanged
      if (event === "SIGNED_IN" && session) {
        // Check if this came from a recovery flow via URL hash
        const hash = window.location.hash;
        if (hash.includes("type=recovery")) {
          recoveryDetected.current = true;
          setRecoveryReady(true);
          setChecking(false);
        }
      }
    });

    // The PASSWORD_RECOVERY event may have already fired during Supabase
    // client initialization (before this component mounted).
    // Check if there's already a valid session — that means the recovery
    // token was already exchanged successfully.
    const checkExistingSession = async () => {
      // Give Supabase a moment to process the URL hash tokens
      await new Promise((resolve) => setTimeout(resolve, 500));

      // If the event listener already caught it, we're done
      if (recoveryDetected.current) return;

      // Check the URL hash for recovery indicators
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace("#", ""));
      const type = params.get("type");
      const accessToken = params.get("access_token");

      if (type === "recovery" && accessToken) {
        // Token is still in the URL — Supabase hasn't processed it yet.
        // Try to set the session manually.
        const refreshToken = params.get("refresh_token");
        if (refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            recoveryDetected.current = true;
            setRecoveryReady(true);
            setChecking(false);
            return;
          }
        }
      }

      // Fallback: check if there's already an active session
      // (token was already exchanged by Supabase client init)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && (type === "recovery" || hash.includes("type=recovery"))) {
        recoveryDetected.current = true;
        setRecoveryReady(true);
        setChecking(false);
        return;
      }

      // No recovery detected
      setChecking(false);
    };

    checkExistingSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear temp_password and must_change_password in the public users table
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await supabase
            .from("users")
            .update({
              temp_password: null,
              must_change_password: false,
            })
            .eq("id", session.user.id);
        }
      } catch (clearErr) {
        console.warn("Failed to clear temp_password flag:", clearErr);
      }

      // Sign out so the user logs in with the new password
      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    } catch (err) {
      setError(err.message || "Falha ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking for recovery token
  if (checking) {
    return (
      <AuthLayout
        icon={Lock}
        title="Verificando..."
        subtitle="Validando o link de recuperação"
      >
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!recoveryReady) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Link inválido ou expirado"
        subtitle="Solicite um novo link de recuperação"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Solicitar novo link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          O link de recuperação está inválido ou expirou. Por favor, solicite um novo.
        </p>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        icon={Lock}
        title="Senha redefinida com sucesso!"
        subtitle="Redirecionando para o login..."
      />
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Nova senha"
      subtitle="Digite sua nova senha abaixo"
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
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redefinindo...
            </>
          ) : (
            "Redefinir senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

